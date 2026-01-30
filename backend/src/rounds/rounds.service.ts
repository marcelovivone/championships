import { Injectable, Inject, NotFoundException, BadRequestException } from '@nestjs/common';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { eq, and, sql, asc, desc } from 'drizzle-orm';
import * as schema from '../db/schema';
import { rounds, seasons, leagues } from '../db/schema';
import { CreateRoundDto, UpdateRoundDto } from '../common/dtos';

@Injectable()
export class RoundsService {
  constructor(
    @Inject('DRIZZLE')
    private db: NodePgDatabase<typeof schema>,
  ) {}

  /**
   * Get all rounds
   */
  async findAll() {
    try {
      return await this.db
        .select({
          id: rounds.id,
          seasonId: rounds.seasonId,
          leagueId: rounds.leagueId,
          roundNumber: rounds.roundNumber,
          startDate: rounds.startDate,
          endDate: rounds.endDate,
          flgCurrent: rounds.flgCurrent,
          createdAt: rounds.createdAt,
        })
        .from(rounds);
    } catch (error) {
      throw new BadRequestException('Failed to fetch rounds');
    }
  }

  /**
   * Get all rounds with pagination
   */
  async findAllPaginated(page: number, limit: number, sortBy: string, sortOrder: 'asc' | 'desc') {
    const offset = (page - 1) * limit;

    // Define sortable columns for rounds including related fields
    const sortableColumns = ['roundNumber', 'startDate', 'endDate', 'flgCurrent', 'createdAt', 'leagueName', 'seasonInfo'];
    const orderByField = sortableColumns.includes(sortBy) ? sortBy : 'roundNumber';
    const order = sortOrder === 'desc' ? desc : asc;

    try {
      // Determine the sort column - handle related fields properly
      let orderByClause: any;
      switch (orderByField) {
        case 'leagueName':
          orderByClause = order(schema.leagues.originalName);
          break;
        case 'seasonInfo':
          orderByClause = order(schema.seasons.startYear); // Sort by season start year
          break;
        case 'startDate':
          orderByClause = order(rounds.startDate);
          break;
        case 'endDate':
          orderByClause = order(rounds.endDate);
          break;
        case 'flgCurrent':
          orderByClause = order(rounds.flgCurrent);
          break;
        case 'createdAt':
          orderByClause = order(rounds.createdAt);
          break;
        case 'roundNumber':
        default:
          orderByClause = order(rounds.roundNumber);
          break;
      }

      const data = await this.db
        .select({
          id: rounds.id,
          seasonId: rounds.seasonId,
          leagueId: rounds.leagueId,
          roundNumber: rounds.roundNumber,
          startDate: rounds.startDate,
          endDate: rounds.endDate,
          flgCurrent: rounds.flgCurrent,
          createdAt: rounds.createdAt,
          league: {
            id: schema.leagues.id,
            originalName: schema.leagues.originalName,
          },
          season: {
            id: schema.seasons.id,
            startYear: schema.seasons.startYear,
            endYear: schema.seasons.endYear,
          },
        })
        .from(rounds)
        .leftJoin(schema.leagues, eq(rounds.leagueId, schema.leagues.id))
        .leftJoin(schema.seasons, eq(rounds.seasonId, schema.seasons.id))
        .orderBy(orderByClause, asc(rounds.id))  // Added secondary sort by ID for consistency
        .limit(limit)
        .offset(offset);

      const totalResult = await this.db
        .select({ count: sql<number>`count(*)` })
        .from(rounds)
        .leftJoin(schema.leagues, eq(rounds.leagueId, schema.leagues.id))
        .leftJoin(schema.seasons, eq(rounds.seasonId, schema.seasons.id));
      const total = Number(totalResult[0].count);
      return { data, total, page, limit };
    } catch (error) {
      throw new BadRequestException('Failed to fetch paginated rounds');
    }
  }

  /**
   * Get round by ID
   */
  async findOne(id: number) {
    try {
      const round = await this.db
        .select()
        .from(rounds)
        .where(eq(rounds.id, id))
        .limit(1);

      if (!round || round.length === 0) {
        throw new NotFoundException(`Round with ID ${id} not found`);
      }

      return round[0];
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      throw new BadRequestException('Failed to fetch round');
    }
  }

  /**
   * Get rounds by season
   */
  async findBySeason(seasonId: number) {
    try {
      // Verify season exists
      const season = await this.db
        .select()
        .from(seasons)
        .where(eq(seasons.id, seasonId))
        .limit(1);

      if (!season || season.length === 0) {
        throw new NotFoundException(`Season with ID ${seasonId} not found`);
      }

      return await this.db
        .select()
        .from(rounds)
        .where(eq(rounds.seasonId, seasonId));
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      throw new BadRequestException('Failed to fetch rounds by season');
    }
  }

  /**
   * Get rounds by league
   */
  async findByLeague(leagueId: number) {
    try {
      // Verify league exists
      const league = await this.db
        .select()
        .from(leagues)
        .where(eq(leagues.id, leagueId))
        .limit(1);

      if (!league || league.length === 0) {
        throw new NotFoundException(`League with ID ${leagueId} not found`);
      }

      return await this.db
        .select()
        .from(rounds)
        .where(eq(rounds.leagueId, leagueId));
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      throw new BadRequestException('Failed to fetch rounds by league');
    }
  }

  /**
   * Create new round
   */
  async create(createRoundDto: CreateRoundDto) {
    try {
      // Verify season exists
      const season = await this.db
        .select()
        .from(seasons)
        .where(eq(seasons.id, createRoundDto.seasonId))
        .limit(1);

      if (!season || season.length === 0) {
        throw new BadRequestException(`Season with ID ${createRoundDto.seasonId} not found`);
      }

      // Verify league exists
      const league = await this.db
        .select()
        .from(leagues)
        .where(eq(leagues.id, createRoundDto.leagueId))
        .limit(1);

      if (!league || league.length === 0) {
        throw new BadRequestException(`League with ID ${createRoundDto.leagueId} not found`);
      }

      // Check if round number already exists for this league/season
      const existingRound = await this.db
        .select()
        .from(rounds)
        .where(
          and(
            eq(rounds.leagueId, createRoundDto.leagueId),
            eq(rounds.seasonId, createRoundDto.seasonId),
            eq(rounds.roundNumber, createRoundDto.roundNumber)
          )
        )
        .limit(1);

      if (existingRound && existingRound.length > 0) {
        throw new BadRequestException(
          `Round ${createRoundDto.roundNumber} already exists for this league and season`
        );
      }

      // If setting this round as current, unset all other current rounds for this season
      if (createRoundDto.flgCurrent) {
        await this.db
          .update(rounds)
          .set({ flgCurrent: false })
          .where(eq(rounds.seasonId, createRoundDto.seasonId));
      }

      // Convert date strings to Date objects for Drizzle
      const insertData: any = { ...createRoundDto };
      if (createRoundDto.startDate && typeof createRoundDto.startDate === 'string') {
        insertData.startDate = new Date(createRoundDto.startDate);
      }
      if (createRoundDto.endDate && typeof createRoundDto.endDate === 'string') {
        insertData.endDate = new Date(createRoundDto.endDate);
      }

      // Validate that start date is not after end date
      if (insertData.startDate && insertData.endDate) {
        if (insertData.startDate > insertData.endDate) {
          throw new BadRequestException('Start date cannot be after end date');
        }
      }

      const result = await this.db
        .insert(rounds)
        .values(insertData)
        .returning();

      return result[0];
    } catch (error) {
      if (error instanceof BadRequestException) throw error;
      throw new BadRequestException('Failed to create round');
    }
  }

  /**
   * Update round
   */
  async update(id: number, updateRoundDto: UpdateRoundDto) {
    try {
      // Verify round exists
      const existingRound = await this.findOne(id);

      // If seasonId is being updated, verify it exists
      if (updateRoundDto.seasonId) {
        const season = await this.db
          .select()
          .from(seasons)
          .where(eq(seasons.id, updateRoundDto.seasonId))
          .limit(1);

        if (!season || season.length === 0) {
          throw new BadRequestException(`Season with ID ${updateRoundDto.seasonId} not found`);
        }
      }

      // If leagueId is being updated, verify it exists
      if (updateRoundDto.leagueId) {
        const league = await this.db
          .select()
          .from(leagues)
          .where(eq(leagues.id, updateRoundDto.leagueId))
          .limit(1);

        if (!league || league.length === 0) {
          throw new BadRequestException(`League with ID ${updateRoundDto.leagueId} not found`);
        }
      }

      // Check if round number already exists for this league/season (excluding current round)
      if (updateRoundDto.roundNumber) {
        const leagueId = updateRoundDto.leagueId || existingRound.leagueId;
        const seasonId = updateRoundDto.seasonId || existingRound.seasonId;
        
        const duplicateRound = await this.db
          .select()
          .from(rounds)
          .where(
            and(
              eq(rounds.leagueId, leagueId),
              eq(rounds.seasonId, seasonId),
              eq(rounds.roundNumber, updateRoundDto.roundNumber)
            )
          )
          .limit(1);

        if (duplicateRound && duplicateRound.length > 0 && duplicateRound[0].id !== id) {
          throw new BadRequestException(
            `Round ${updateRoundDto.roundNumber} already exists for this league and season`
          );
        }
      }

      // If setting this round as current, unset all other current rounds for this season
      if (updateRoundDto.flgCurrent === true) {
        const seasonId = updateRoundDto.seasonId || existingRound.seasonId;
        await this.db
          .update(rounds)
          .set({ flgCurrent: false })
          .where(eq(rounds.seasonId, seasonId));
      }

      // Convert date strings to Date objects for Drizzle
      const updateData: any = { ...updateRoundDto };
      if (updateRoundDto.startDate && typeof updateRoundDto.startDate === 'string') {
        updateData.startDate = new Date(updateRoundDto.startDate);
      }
      if (updateRoundDto.endDate && typeof updateRoundDto.endDate === 'string') {
        updateData.endDate = new Date(updateRoundDto.endDate);
      }

      // Validate dates - get existing values if needed
      const finalStartDate = updateData.startDate || existingRound.startDate;
      const finalEndDate = updateData.endDate || existingRound.endDate;
      
      if (finalStartDate && finalEndDate) {
        const startDateObj = finalStartDate instanceof Date ? finalStartDate : new Date(finalStartDate);
        const endDateObj = finalEndDate instanceof Date ? finalEndDate : new Date(finalEndDate);
        
        if (startDateObj > endDateObj) {
          throw new BadRequestException('Start date cannot be after end date');
        }
      }

      const result = await this.db
        .update(rounds)
        .set(updateData)
        .where(eq(rounds.id, id))
        .returning();

      return result[0];
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof BadRequestException) throw error;
      throw new BadRequestException(error?.message || 'Failed to update round');
    }
  }

  /**
   * Delete round
   */
  async remove(id: number): Promise<void> {
    try {
      // Verify round exists
      await this.findOne(id);

      await this.db
        .delete(rounds)
        .where(eq(rounds.id, id));
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      throw new BadRequestException('Failed to delete round');
    }
  }
}
