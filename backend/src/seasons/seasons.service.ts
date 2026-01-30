import { Injectable, Inject, NotFoundException, BadRequestException } from '@nestjs/common';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { eq, and, sql, asc, desc } from 'drizzle-orm';
import * as schema from '../db/schema';
import { seasons, leagues, sports } from '../db/schema';
import { CreateSeasonDto, UpdateSeasonDto } from '../common/dtos';

@Injectable()
export class SeasonsService {
  constructor(
    @Inject('DRIZZLE')
    private db: NodePgDatabase<typeof schema>,
  ) {}

  /**
   * Get all seasons with pagination
   */
  async findAllPaginated(page: number, limit: number, sortBy: string, sortOrder: 'asc' | 'desc') {
    const offset = (page - 1) * limit;

    // Define sortable columns for seasons - including related fields
    const sortableColumns = ['startYear', 'endYear', 'status', 'flgDefault', 'createdAt', 'sportName', 'leagueName'];
    const orderByField = sortableColumns.includes(sortBy) ? sortBy : 'startYear';
    const order = sortOrder === 'desc' ? desc : asc;

    try {
      // Determine the sort column - handle related fields properly
      let orderByClause: any;
      switch (orderByField) {
        case 'sportName':
          orderByClause = order(sports.name);
          break;
        case 'leagueName':
          orderByClause = order(leagues.secondaryName);
          break;
        case 'endYear':
          orderByClause = order(seasons.endYear);
          break;
        case 'status':
          orderByClause = order(seasons.status);
          break;
        case 'flgDefault':
          orderByClause = order(seasons.flgDefault);
          break;
        case 'createdAt':
          orderByClause = order(seasons.createdAt);
          break;
        case 'startYear':
        default:
          orderByClause = order(seasons.startYear);
          break;
      }

      const data = await this.db
        .select({
          id: seasons.id,
          sportId: seasons.sportId,
          leagueId: seasons.leagueId,
          startYear: seasons.startYear,
          endYear: seasons.endYear,
          status: seasons.status,
          flgDefault: seasons.flgDefault,
          numberOfGroups: seasons.numberOfGroups,
          createdAt: seasons.createdAt,
          sport: {
            id: sports.id,
            name: sports.name,
          },
          league: {
            id: leagues.id,
            secondaryName: leagues.secondaryName,
          },
        })
        .from(seasons)
        .leftJoin(sports, eq(seasons.sportId, sports.id))
        .leftJoin(leagues, eq(seasons.leagueId, leagues.id))
        .orderBy(orderByClause)
        .limit(limit)
        .offset(offset);

      const totalResult = await this.db
        .select({ count: sql<number>`count(*)` })
        .from(seasons)
        .leftJoin(sports, eq(seasons.sportId, sports.id))
        .leftJoin(leagues, eq(seasons.leagueId, leagues.id));
      const total = Number(totalResult[0].count);
      return { data, total, page, limit };
    } catch (error) {
      throw new BadRequestException('Failed to fetch paginated seasons');
    }
  }

  async findAll() {
    return this.db
      .select({
        id: seasons.id,
        sportId: seasons.sportId,
        leagueId: seasons.leagueId,
        startYear: seasons.startYear,
        endYear: seasons.endYear,
        status: seasons.status,
        flgDefault: seasons.flgDefault,
        numberOfGroups: seasons.numberOfGroups,
        createdAt: seasons.createdAt,
        sport: {
          id: sports.id,
          name: sports.name,
        },
        league: {
          id: leagues.id,
          secondaryName: leagues.secondaryName,
        },
      })
      .from(seasons)
      .leftJoin(sports, eq(seasons.sportId, sports.id))
      .leftJoin(leagues, eq(seasons.leagueId, leagues.id));
  }

  async findOne(id: number) {
    const result = await this.db.select().from(seasons).where(eq(seasons.id, id)).limit(1);
    if (!result.length) throw new NotFoundException('Season not found');
    return result[0];
  }

  /**
   * Find all seasons by league
   */
  async findAllByLeague(leagueId: number) {
    try {
      return await this.db
        .select({
          id: schema.seasons.id,
          sportId: schema.seasons.sportId,
          leagueId: schema.seasons.leagueId,
          startYear: schema.seasons.startYear,
          endYear: schema.seasons.endYear,
          status: schema.seasons.status,
          flgDefault: schema.seasons.flgDefault,
          numberOfGroups: schema.seasons.numberOfGroups,
          sport: schema.sports,
          league: schema.leagues,
          createdAt: schema.seasons.createdAt,
        })
        .from(schema.seasons)
        .leftJoin(schema.sports, eq(schema.seasons.sportId, schema.sports.id))
        .leftJoin(schema.leagues, eq(schema.seasons.leagueId, schema.leagues.id))
        .where(eq(schema.seasons.leagueId, leagueId));
    } catch (error) {
      throw new BadRequestException('Failed to fetch seasons by league');
    }
  }

  async findByLeague(leagueId: number) {
    return this.db.select().from(seasons).where(eq(seasons.leagueId, leagueId));
  }

  /**
   * Check if another season in the same league has flgDefault = true
   * Returns the existing default season if found
   */
  async findDefaultSeasonByLeague(leagueId: number, excludeSeasonId?: number) {
    const conditions = excludeSeasonId 
      ? and(eq(seasons.leagueId, leagueId), eq(seasons.flgDefault, true), eq(seasons.id, excludeSeasonId))
      : and(eq(seasons.leagueId, leagueId), eq(seasons.flgDefault, true));

    const result = await this.db
      .select()
      .from(seasons)
      .where(conditions)
      .limit(1);

    return result.length > 0 ? result[0] : null;
  }

  async create(createSeasonDto: CreateSeasonDto) {
    try {
      // Verify sport exists
      const sport = await this.db
        .select()
        .from(sports)
        .where(eq(sports.id, createSeasonDto.sportId))
        .limit(1);

      if (!sport || sport.length === 0) {
        throw new BadRequestException(`Sport with ID ${createSeasonDto.sportId} not found`);
      }

      // Verify league exists
      const league = await this.db
        .select()
        .from(leagues)
        .where(eq(leagues.id, createSeasonDto.leagueId))
        .limit(1);

      if (!league || league.length === 0) {
        throw new BadRequestException(`League with ID ${createSeasonDto.leagueId} not found`);
      }

      // If setting this season as default, unset all other defaults for this league
      if (createSeasonDto.flgDefault) {
        await this.db
          .update(seasons)
          .set({ flgDefault: false })
          .where(and(
            eq(seasons.leagueId, createSeasonDto.leagueId),
            eq(seasons.flgDefault, true)
          ));
      }

      const result = await this.db
        .insert(seasons)
        .values({
          sportId: createSeasonDto.sportId,
          leagueId: createSeasonDto.leagueId,
          startYear: createSeasonDto.startYear,
          endYear: createSeasonDto.endYear,
          status: createSeasonDto.status || 'planned',
          flgDefault: createSeasonDto.flgDefault || false,
          numberOfGroups: createSeasonDto.numberOfGroups || 0,
        })
        .returning();

      return result[0];
    } catch (error) {
      if (error instanceof BadRequestException) throw error;
      throw new BadRequestException('Failed to create season');
    }
  }

  async update(id: number, updateSeasonDto: UpdateSeasonDto) {
    try {
      // Verify season exists
      const existingSeason = await this.findOne(id);

      // Verify sport exists if being updated
      if (updateSeasonDto.sportId) {
        const sport = await this.db
          .select()
          .from(sports)
          .where(eq(sports.id, updateSeasonDto.sportId))
          .limit(1);

        if (!sport || sport.length === 0) {
          throw new BadRequestException(`Sport with ID ${updateSeasonDto.sportId} not found`);
        }
      }

      // If setting this season as default, unset all other defaults for this league
      if (updateSeasonDto.flgDefault === true) {
        const leagueId = updateSeasonDto.leagueId || existingSeason.leagueId;
        await this.db
          .update(seasons)
          .set({ flgDefault: false })
          .where(and(
            eq(seasons.leagueId, leagueId),
            eq(seasons.flgDefault, true)
          ));
      }

      const result = await this.db
        .update(seasons)
        .set(updateSeasonDto)
        .where(eq(seasons.id, id))
        .returning();

      if (!result.length) throw new NotFoundException('Season not found');
      return result[0];
    } catch (error) {
      if (error instanceof BadRequestException || error instanceof NotFoundException)
        throw error;
      throw new BadRequestException('Failed to update season');
    }
  }

  /**
   * Clear default flag from a season and set it on another
   * Used when user confirms changing the default season
   */
  async changeDefaultSeason(currentDefaultId: number, newDefaultId: number) {
    try {
      // Remove default flag from current default
      await this.db
        .update(seasons)
        .set({ flgDefault: false })
        .where(eq(seasons.id, currentDefaultId));

      // Set default flag on new season
      const result = await this.db
        .update(seasons)
        .set({ flgDefault: true })
        .where(eq(seasons.id, newDefaultId))
        .returning();

      return result[0];
    } catch (error) {
      throw new BadRequestException('Failed to change default season');
    }
  }

  async remove(id: number) {
    const result = await this.db.delete(seasons).where(eq(seasons.id, id)).returning();
    if (!result.length) throw new NotFoundException('Season not found');
    return result[0];
  }
}
