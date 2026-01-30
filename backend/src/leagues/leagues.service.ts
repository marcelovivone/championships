import { Injectable, Inject, NotFoundException, BadRequestException } from '@nestjs/common';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { eq, and, sql, asc, desc } from 'drizzle-orm';
import * as schema from '../db/schema';
import { leagues, sports, countries } from '../db/schema';
import { CreateLeagueDto, PaginationDto, UpdateLeagueDto, FilteringDto } from '../common/dtos';

@Injectable()
export class LeaguesService {
  constructor(
    @Inject('DRIZZLE')
    private db: NodePgDatabase<typeof schema>,
  ) {}

  /**
   * Get all leagues with pagination
   */
  async findAllPaginated(page: number, limit: number, sortBy: string, sortOrder: 'asc' | 'desc') {
    const offset = (page - 1) * limit;

    const sortableColumns = ['originalName', 'sportId', 'countryId', 'flgDefault', 'typeOfSchedule', 'numberOfRoundsMatches', 'flgRoundAutomatic', 'hasSubLeagues', 'hasAscends', 'hasDescends', 'sportName', 'countryName'];
    const orderByField = sortableColumns.includes(sortBy) ? sortBy : 'originalName';
    const order = sortOrder === 'desc' ? desc : asc;

    try {
      // Determine the sort column - handle related fields properly
      let orderByClause: any;
      switch (orderByField) {
        case 'sportName':
          orderByClause = order(sports.name);
          break;
        case 'countryName':
          orderByClause = order(schema.countries.name);
          break;
        case 'sportId':
          orderByClause = order(leagues.sportId);
          break;
        case 'countryId':
          orderByClause = order(leagues.countryId);
          break;
        case 'flgDefault':
          orderByClause = order(leagues.flgDefault);
          break;
        case 'typeOfSchedule':
          orderByClause = order(leagues.typeOfSchedule);
          break;
        case 'numberOfRoundsMatches':
          orderByClause = order(leagues.numberOfRoundsMatches);
          break;
        case 'flgRoundAutomatic':
          orderByClause = order(leagues.flgRoundAutomatic);
          break;
        case 'hasSubLeagues':
          orderByClause = order(leagues.hasSubLeagues);
          break;
        case 'hasAscends':
          orderByClause = order(leagues.hasAscends);
          break;
        case 'hasDescends':
          orderByClause = order(leagues.hasDescends);
          break;
        case 'originalName':
        default:
          orderByClause = order(leagues.originalName);
          break;
      }

      const data = await this.db
        .select({
          id: leagues.id,
          originalName: leagues.originalName,
          secondaryName: leagues.secondaryName,
          sportId: leagues.sportId,
          countryId: leagues.countryId,
          cityId: leagues.cityId,
          flgDefault: leagues.flgDefault,
          typeOfSchedule: leagues.typeOfSchedule,
          numberOfRoundsMatches: leagues.numberOfRoundsMatches,
          minDivisionsNumber: leagues.minDivisionsNumber,
          maxDivisionsNumber: leagues.maxDivisionsNumber,
          divisionsTime: leagues.divisionsTime,
          hasOvertimeOverride: leagues.hasOvertimeOverride,
          hasPenaltiesOverride: leagues.hasPenaltiesOverride,
          hasAscends: leagues.hasAscends,
          ascendsQuantity: leagues.ascendsQuantity,
          hasDescends: leagues.hasDescends,
          descendsQuantity: leagues.descendsQuantity,
          hasSubLeagues: leagues.hasSubLeagues,
          numberOfSubLeagues: leagues.numberOfSubLeagues,
          flgRoundAutomatic: leagues.flgRoundAutomatic,
          imageUrl: leagues.imageUrl,
          createdAt: leagues.createdAt,
          sport: {
            id: sports.id,
            name: sports.name,
          },
          country: {
            id: schema.countries.id,
            name: schema.countries.name,
          },
        })
        .from(leagues)
        .leftJoin(sports, eq(leagues.sportId, sports.id))
        .leftJoin(schema.countries, eq(leagues.countryId, schema.countries.id))
        .orderBy(orderByClause)
        .limit(limit)
        .offset(offset);

      const totalResult = await this.db
        .select({ count: sql<number>`count(*)` })
        .from(leagues)
        .leftJoin(sports, eq(leagues.sportId, sports.id))
        .leftJoin(schema.countries, eq(leagues.countryId, schema.countries.id));
      const total = Number(totalResult[0].count);
      return { data, total, page, limit };
    } catch (error) {
      throw new BadRequestException('Failed to fetch paginated leagues');
    }
  }

  /**
   * Get league by ID
   */
  async findOne(id: number) {
    try {
      const league = await this.db
        .select()
        .from(leagues)
        .where(eq(leagues.id, id))
        .limit(1);

      if (!league || league.length === 0) {
        throw new NotFoundException(`League with ID ${id} not found`);
      }

      return league[0];
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      throw new BadRequestException('Failed to fetch league');
    }
  }

  /**
   * Get leagues by sport
   */
  async findBySport(sportId: number, paginationDto: PaginationDto) {
    const { page = 1, limit = 10 } = paginationDto;
    const offset = (page - 1) * limit;

    try {
      // Verify sport exists
      const sport = await this.db
        .select()
        .from(sports)
        .where(eq(sports.id, sportId))
        .limit(1);

      if (!sport || sport.length === 0) {
        throw new NotFoundException(`Sport with ID ${sportId} not found`);
      }

      const data = await this.db
        .select()
        .from(leagues)
        .where(eq(leagues.sportId, sportId))
        .orderBy(leagues.originalName)
        .limit(limit)
        .offset(offset);

      const totalResult = await this.db
        .select({ count: sql<number>`count(*)` })
        .from(leagues)
        .where(eq(leagues.sportId, sportId));
      const total = Number(totalResult[0].count);
      return { data, total };
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      throw new BadRequestException('Failed to fetch paginated leagues by sport');
    }
  }

  /**
   * Find all leagues by sport
   */
  async findAllBySport(sportId: number) {
    try {
      return await this.db
        .select({
          id: schema.leagues.id,
          originalName: schema.leagues.originalName,
          secondaryName: schema.leagues.secondaryName,
          sportId: schema.leagues.sportId,
          countryId: schema.leagues.countryId,
          cityId: schema.leagues.cityId,
          flgDefault: schema.leagues.flgDefault,
          typeOfSchedule: schema.leagues.typeOfSchedule,
          numberOfRoundsMatches: schema.leagues.numberOfRoundsMatches,
          minDivisionsNumber: schema.leagues.minDivisionsNumber,
          maxDivisionsNumber: schema.leagues.maxDivisionsNumber,
          divisionsTime: schema.leagues.divisionsTime,
          hasOvertimeOverride: schema.leagues.hasOvertimeOverride,
          hasPenaltiesOverride: schema.leagues.hasPenaltiesOverride,
          hasAscends: schema.leagues.hasAscends,
          ascendsQuantity: schema.leagues.ascendsQuantity,
          hasDescends: schema.leagues.hasDescends,
          descendsQuantity: schema.leagues.descendsQuantity,
          hasSubLeagues: schema.leagues.hasSubLeagues,
          numberOfSubLeagues: schema.leagues.numberOfSubLeagues,
          flgRoundAutomatic: schema.leagues.flgRoundAutomatic,
          imageUrl: schema.leagues.imageUrl,
          sport: schema.sports,
          country: schema.countries,
          city: schema.cities,
          createdAt: schema.leagues.createdAt,
        })
        .from(schema.leagues)
        .leftJoin(schema.sports, eq(schema.leagues.sportId, schema.sports.id))
        .leftJoin(schema.countries, eq(schema.leagues.countryId, schema.countries.id))
        .leftJoin(schema.cities, eq(schema.leagues.cityId, schema.cities.id))
        .where(eq(schema.leagues.sportId, sportId));
    } catch (error) {
      throw new BadRequestException('Failed to fetch leagues by sport');
    }
  }

  /**
   * Create new league
   */
  async create(createLeagueDto: CreateLeagueDto) {
    try {
      // Verify sport exists
      const sport = await this.db
        .select()
        .from(sports)
        .where(eq(sports.id, createLeagueDto.sportId))
        .limit(1);

      if (!sport || sport.length === 0) {
        throw new BadRequestException(`Sport with ID ${createLeagueDto.sportId} not found`);
      }

      // If setting this league as default, unset all other defaults for this sport
      if (createLeagueDto.flgDefault) {
        await this.db
          .update(leagues)
          .set({ flgDefault: false })
          .where(and(
            eq(leagues.sportId, createLeagueDto.sportId),
            eq(leagues.flgDefault, true)
          ));
      }

      const result = await this.db
        .insert(leagues)
        .values(createLeagueDto)
        .returning();

      return result[0];
    } catch (error) {
      if (error instanceof BadRequestException) throw error;
      throw new BadRequestException('Failed to create league');
    }
  }

  /**
   * Update league
   */
  async update(id: number, updateLeagueDto: UpdateLeagueDto) {
    try {
      // Verify league exists
      const existingLeague = await this.findOne(id);

      // If updating sport, verify it exists
      if (updateLeagueDto.sportId) {
        const sport = await this.db
          .select()
          .from(sports)
          .where(eq(sports.id, updateLeagueDto.sportId))
          .limit(1);

        if (!sport || sport.length === 0) {
          throw new BadRequestException(`Sport with ID ${updateLeagueDto.sportId} not found`);
        }
      }

      // If setting this league as default, unset all other defaults for this sport
      if (updateLeagueDto.flgDefault === true) {
        const sportId = updateLeagueDto.sportId || existingLeague.sportId;
        await this.db
          .update(leagues)
          .set({ flgDefault: false })
          .where(and(
            eq(leagues.sportId, sportId),
            eq(leagues.flgDefault, true)
          ));
      }

      const result = await this.db
        .update(leagues)
        .set(updateLeagueDto)
        .where(eq(leagues.id, id))
        .returning();

      return result[0];
    } catch (error) {
      if (error instanceof BadRequestException || error instanceof NotFoundException)
        throw error;
      throw new BadRequestException('Failed to update league');
    }
  }

  /**
   * Delete league
   */
  async remove(id: number) {
    try {
      // Verify league exists
      await this.findOne(id);

      // Check if league has any seasons
      const seasons = await this.db
        .select()
        .from(schema.seasons)
        .where(eq(schema.seasons.leagueId, id))
        .limit(1);

      if (seasons && seasons.length > 0) {
        throw new BadRequestException('Cannot delete league. League has associated seasons.');
      }

      const result = await this.db
        .delete(leagues)
        .where(eq(leagues.id, id))
        .returning();

      return result[0];
    } catch (error) {
      if (error instanceof BadRequestException || error instanceof NotFoundException)
        throw error;
      throw new BadRequestException('Failed to delete league');
    }
  }

  /**
   * Add external link to league (e.g., official website, social media)
   * Note: The current schema supports simple league links with label and URL
   * For league-to-league relationships, a future enhancement is needed
   */
  async addLink(leagueId: number, label: string, url: string) {
    try {
      // Verify league exists
      await this.findOne(leagueId);

      const result = await this.db
        .insert(schema.leagueLinks)
        .values({
          leagueId: leagueId,
          label: label,
          url: url,
        })
        .returning();

      return result[0];
    } catch (error) {
      if (error instanceof BadRequestException || error instanceof NotFoundException)
        throw error;
      throw new BadRequestException('Failed to add league link');
    }
  }

  /**
   * Remove link from league
   */
  async removeLink(leagueId: number, linkId: number) {
    try {
      const result = await this.db
        .delete(schema.leagueLinks)
        .where(
          and(
            eq(schema.leagueLinks.leagueId, leagueId),
            eq(schema.leagueLinks.id, linkId),
          ),
        )
        .returning();

      if (!result || result.length === 0) {
        throw new NotFoundException('Link not found');
      }

      return result[0];
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      throw new BadRequestException('Failed to remove league link');
    }
  }
}