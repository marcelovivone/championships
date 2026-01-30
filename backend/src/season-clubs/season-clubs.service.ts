import { Injectable, Inject, BadRequestException, NotFoundException } from '@nestjs/common';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { eq, and, sql, asc, desc } from 'drizzle-orm';
import * as schema from '../db/schema';
import { CreateSeasonClubDto, UpdateSeasonClubDto, SeasonClubResponseDto } from './dto';

@Injectable()
export class SeasonClubsService {
  constructor(
    @Inject('DRIZZLE')
    private db: NodePgDatabase<typeof schema>,
  ) {}

  /**
   * Get all season-club associations
   */
  async findAll(): Promise<SeasonClubResponseDto[]> {
    return await this.db
      .select({
        id: schema.seasonClubs.id,
        sportId: schema.seasonClubs.sportId,
        leagueId: schema.seasonClubs.leagueId,
        seasonId: schema.seasonClubs.seasonId,
        clubId: schema.seasonClubs.clubId,
        groupId: schema.seasonClubs.groupId,
        createdAt: schema.seasonClubs.createdAt,
        sport: {
          id: schema.sports.id,
          name: schema.sports.name,
        },
        league: {
          id: schema.leagues.id,
          originalName: schema.leagues.originalName,
          secondaryName: schema.leagues.secondaryName,
        },
        season: {
          id: schema.seasons.id,
          startYear: schema.seasons.startYear,
          endYear: schema.seasons.endYear,
        },
        club: {
          id: schema.clubs.id,
          name: schema.clubs.name,
          imageUrl: schema.clubs.imageUrl,
        },
        group: {
          id: schema.groups.id,
          name: schema.groups.name,
        },
      })
      .from(schema.seasonClubs)
      .leftJoin(schema.sports, eq(schema.seasonClubs.sportId, schema.sports.id))
      .leftJoin(schema.leagues, eq(schema.seasonClubs.leagueId, schema.leagues.id))
      .leftJoin(schema.seasons, eq(schema.seasonClubs.seasonId, schema.seasons.id))
      .leftJoin(schema.clubs, eq(schema.seasonClubs.clubId, schema.clubs.id))
      .leftJoin(schema.groups, eq(schema.seasonClubs.groupId, schema.groups.id));
  }

  /**
   * Get all season-club associations with pagination
   */
  async findAllPaginated(page: number, limit: number, sortBy: string, sortOrder: 'asc' | 'desc') {
    const offset = (page - 1) * limit;

    // Define sortable columns for season-clubs including related fields
    const sortableColumns = ['createdAt', 'sportId', 'leagueId', 'seasonId', 'clubId', 'groupId', 'sportName', 'leagueName', 'seasonInfo', 'clubName', 'groupName'];
    const orderByField = sortableColumns.includes(sortBy) ? sortBy : 'createdAt';
    const order = sortOrder === 'desc' ? desc : asc;

    // Determine the sort column - handle related fields properly
    let orderByClause: any;
    switch (orderByField) {
      case 'sportName':
        orderByClause = order(schema.sports.name);
        break;
      case 'leagueName':
        orderByClause = order(schema.leagues.originalName);
        break;
      case 'seasonInfo':
        orderByClause = order(schema.seasons.startYear);
        break;
      case 'clubName':
        orderByClause = order(schema.clubs.name);
        break;
      case 'groupName':
        orderByClause = order(schema.groups.name);
        break;
      case 'sportId':
        orderByClause = order(schema.seasonClubs.sportId);
        break;
      case 'leagueId':
        orderByClause = order(schema.seasonClubs.leagueId);
        break;
      case 'seasonId':
        orderByClause = order(schema.seasonClubs.seasonId);
        break;
      case 'clubId':
        orderByClause = order(schema.seasonClubs.clubId);
        break;
      case 'groupId':
        orderByClause = order(schema.seasonClubs.groupId);
        break;
      case 'createdAt':
      default:
        orderByClause = order(schema.seasonClubs.createdAt);
        break;
    }

    try {
      const data = await this.db
        .select({
          id: schema.seasonClubs.id,
          sportId: schema.seasonClubs.sportId,
          leagueId: schema.seasonClubs.leagueId,
          seasonId: schema.seasonClubs.seasonId,
          clubId: schema.seasonClubs.clubId,
          groupId: schema.seasonClubs.groupId,
          createdAt: schema.seasonClubs.createdAt,
          sport: {
            id: schema.sports.id,
            name: schema.sports.name,
          },
          league: {
            id: schema.leagues.id,
            originalName: schema.leagues.originalName,
            secondaryName: schema.leagues.secondaryName,
          },
          season: {
            id: schema.seasons.id,
            startYear: schema.seasons.startYear,
            endYear: schema.seasons.endYear,
          },
          club: {
            id: schema.clubs.id,
            name: schema.clubs.name,
            imageUrl: schema.clubs.imageUrl,
          },
          group: {
            id: schema.groups.id,
            name: schema.groups.name,
          },
        })
        .from(schema.seasonClubs)
        .leftJoin(schema.sports, eq(schema.seasonClubs.sportId, schema.sports.id))
        .leftJoin(schema.leagues, eq(schema.seasonClubs.leagueId, schema.leagues.id))
        .leftJoin(schema.seasons, eq(schema.seasonClubs.seasonId, schema.seasons.id))
        .leftJoin(schema.clubs, eq(schema.seasonClubs.clubId, schema.clubs.id))
        .leftJoin(schema.groups, eq(schema.seasonClubs.groupId, schema.groups.id))
        .orderBy(orderByClause)
        .limit(limit)
        .offset(offset);

      const totalResult = await this.db
        .select({ count: sql<number>`count(*)` })
        .from(schema.seasonClubs)
        .leftJoin(schema.sports, eq(schema.seasonClubs.sportId, schema.sports.id))
        .leftJoin(schema.leagues, eq(schema.seasonClubs.leagueId, schema.leagues.id))
        .leftJoin(schema.seasons, eq(schema.seasonClubs.seasonId, schema.seasons.id))
        .leftJoin(schema.clubs, eq(schema.seasonClubs.clubId, schema.clubs.id))
        .leftJoin(schema.groups, eq(schema.seasonClubs.groupId, schema.groups.id));
      const total = Number(totalResult[0].count);
      return { data, total, page, limit };
    } catch (error) {
      throw new BadRequestException('Failed to fetch paginated season-clubs');
    }
  }

  /**
   * Get a specific season-club association by ID
   */
  async findOne(id: number): Promise<SeasonClubResponseDto> {
    const result = await this.db
      .select()
      .from(schema.seasonClubs)
      .where(eq(schema.seasonClubs.id, id));

    if (result.length === 0) {
      throw new NotFoundException(`SeasonClub with ID ${id} not found`);
    }

    return result[0];
  }

  /**
   * Get all clubs in a specific season
   */
  async findBySeason(seasonId: number): Promise<SeasonClubResponseDto[]> {
    return await this.db
      .select({
        id: schema.seasonClubs.id,
        sportId: schema.seasonClubs.sportId,
        leagueId: schema.seasonClubs.leagueId,
        seasonId: schema.seasonClubs.seasonId,
        clubId: schema.seasonClubs.clubId,
        groupId: schema.seasonClubs.groupId,
        createdAt: schema.seasonClubs.createdAt,
        sport: {
          id: schema.sports.id,
          name: schema.sports.name,
        },
        league: {
          id: schema.leagues.id,
          originalName: schema.leagues.originalName,
          secondaryName: schema.leagues.secondaryName,
        },
        season: {
          id: schema.seasons.id,
          startYear: schema.seasons.startYear,
          endYear: schema.seasons.endYear,
        },
        club: {
          id: schema.clubs.id,
          name: schema.clubs.name,
          imageUrl: schema.clubs.imageUrl,
        },
        group: {
          id: schema.groups.id,
          name: schema.groups.name,
        },
      })
      .from(schema.seasonClubs)
      .leftJoin(schema.sports, eq(schema.seasonClubs.sportId, schema.sports.id))
      .leftJoin(schema.leagues, eq(schema.seasonClubs.leagueId, schema.leagues.id))
      .leftJoin(schema.seasons, eq(schema.seasonClubs.seasonId, schema.seasons.id))
      .leftJoin(schema.clubs, eq(schema.seasonClubs.clubId, schema.clubs.id))
      .leftJoin(schema.groups, eq(schema.seasonClubs.groupId, schema.groups.id))
      .where(eq(schema.seasonClubs.seasonId, seasonId));
  }

  /**
   * Get all seasons a club is/was associated with
   */
  async findByClub(clubId: number): Promise<SeasonClubResponseDto[]> {
    return await this.db
      .select()
      .from(schema.seasonClubs)
      .where(eq(schema.seasonClubs.clubId, clubId));
  }

  /**
   * Check if a club is active in a specific season
   */
  async isClubActiveInSeason(clubId: number, seasonId: number): Promise<boolean> {
    const result = await this.db
      .select()
      .from(schema.seasonClubs)
      .where(
        and(
          eq(schema.seasonClubs.clubId, clubId),
          eq(schema.seasonClubs.seasonId, seasonId),
        ),
      );

    if (result.length === 0) {
      return false;
    }

    // Club is active if association exists
    return true;
  }

  /**
   * Create a new season-club association
   */
  async create(dto: CreateSeasonClubDto): Promise<SeasonClubResponseDto> {
    // Verify sport exists
    const sport = await this.db
      .select()
      .from(schema.sports)
      .where(eq(schema.sports.id, dto.sportId));
    if (sport.length === 0) {
      throw new BadRequestException(`Sport with ID ${dto.sportId} not found`);
    }

    // Verify league exists
    const league = await this.db
      .select()
      .from(schema.leagues)
      .where(eq(schema.leagues.id, dto.leagueId));
    if (league.length === 0) {
      throw new BadRequestException(`League with ID ${dto.leagueId} not found`);
    }

    // Verify season exists
    const season = await this.db
      .select()
      .from(schema.seasons)
      .where(eq(schema.seasons.id, dto.seasonId));
    if (season.length === 0) {
      throw new BadRequestException(`Season with ID ${dto.seasonId} not found`);
    }

    // Verify club exists
    const club = await this.db
      .select()
      .from(schema.clubs)
      .where(eq(schema.clubs.id, dto.clubId));
    if (club.length === 0) {
      throw new BadRequestException(`Club with ID ${dto.clubId} not found`);
    }

    // Verify group exists if provided
    if (dto.groupId) {
      const group = await this.db
        .select()
        .from(schema.groups)
        .where(eq(schema.groups.id, dto.groupId));
      if (group.length === 0) {
        throw new BadRequestException(`Group with ID ${dto.groupId} not found`);
      }
    }

    // Check if association already exists
    const existing = await this.db
      .select()
      .from(schema.seasonClubs)
      .where(
        and(
          eq(schema.seasonClubs.sportId, dto.sportId),
          eq(schema.seasonClubs.leagueId, dto.leagueId),
          eq(schema.seasonClubs.seasonId, dto.seasonId),
          eq(schema.seasonClubs.clubId, dto.clubId),
        ),
      );
    if (existing.length > 0) {
      throw new BadRequestException(
        `Club ${dto.clubId} is already associated with sport ${dto.sportId}, league ${dto.leagueId} and season ${dto.seasonId}`,
      );
    }

    const result = await this.db
      .insert(schema.seasonClubs)
      .values({
        sportId: dto.sportId,
        leagueId: dto.leagueId,
        seasonId: dto.seasonId,
        clubId: dto.clubId,
        groupId: dto.groupId || null,
      })
      .returning();

    return result[0];
  }

  /**
   * Update a season-club association (mainly for setting groupId)
   */
  async update(id: number, dto: UpdateSeasonClubDto): Promise<SeasonClubResponseDto> {
    const existing = await this.findOne(id); // Verifies existence

    // Verify sport exists if provided
    if (dto.sportId) {
      const sport = await this.db
        .select()
        .from(schema.sports)
        .where(eq(schema.sports.id, dto.sportId));
      if (sport.length === 0) {
        throw new BadRequestException(`Sport with ID ${dto.sportId} not found`);
      }
    }

    // Verify league exists if provided
    if (dto.leagueId) {
      const league = await this.db
        .select()
        .from(schema.leagues)
        .where(eq(schema.leagues.id, dto.leagueId));
      if (league.length === 0) {
        throw new BadRequestException(`League with ID ${dto.leagueId} not found`);
      }
    }

    // Verify season exists if provided
    if (dto.seasonId) {
      const season = await this.db
        .select()
        .from(schema.seasons)
        .where(eq(schema.seasons.id, dto.seasonId));
      if (season.length === 0) {
        throw new BadRequestException(`Season with ID ${dto.seasonId} not found`);
      }
    }

    // Verify club exists if provided
    if (dto.clubId) {
      const club = await this.db
        .select()
        .from(schema.clubs)
        .where(eq(schema.clubs.id, dto.clubId));
      if (club.length === 0) {
        throw new BadRequestException(`Club with ID ${dto.clubId} not found`);
      }
    }

    // Verify group exists if provided
    if (dto.groupId) {
      const group = await this.db
        .select()
        .from(schema.groups)
        .where(eq(schema.groups.id, dto.groupId));
      if (group.length === 0) {
        throw new BadRequestException(`Group with ID ${dto.groupId} not found`);
      }
    }

    const result = await this.db
      .update(schema.seasonClubs)
      .set({
        sportId: dto.sportId !== undefined ? dto.sportId : existing.sportId,
        leagueId: dto.leagueId !== undefined ? dto.leagueId : existing.leagueId,
        seasonId: dto.seasonId !== undefined ? dto.seasonId : existing.seasonId,
        clubId: dto.clubId !== undefined ? dto.clubId : existing.clubId,
        groupId: dto.groupId !== undefined ? dto.groupId : existing.groupId,
      })
      .where(eq(schema.seasonClubs.id, id))
      .returning();

    return result[0];
  }

  /**
   * Remove a season-club association
   */
  async remove(id: number): Promise<void> {
    const existing = await this.findOne(id); // Verifies existence

    await this.db.delete(schema.seasonClubs).where(eq(schema.seasonClubs.id, id));
  }
}