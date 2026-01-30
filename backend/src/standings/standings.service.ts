import { Injectable, Inject, NotFoundException, BadRequestException } from '@nestjs/common';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { eq, and, desc, asc } from 'drizzle-orm';
import * as schema from '../db/schema';
import { standings, seasons, leagues, groups, rounds } from '../db/schema';
import { CreateStandingDto, UpdateStandingDto } from '../common/dtos';

@Injectable()
export class StandingsService {
  constructor(
    @Inject('DRIZZLE')
    private db: NodePgDatabase<typeof schema>,
  ) {}

  /**
   * Get all standings
   */
  async findAll() {
    try {
      return await this.db
        .select()
        .from(standings)
        .orderBy(desc(standings.points), asc(standings.goalDifference));
    } catch (error) {
      throw new BadRequestException('Failed to fetch standings');
    }
  }

  /**
   * Get standing by ID
   */
  async findOne(id: number) {
    try {
      const standing = await this.db
        .select()
        .from(standings)
        .where(eq(standings.id, id))
        .limit(1);

      if (!standing || standing.length === 0) {
        throw new NotFoundException(`Standing with ID ${id} not found`);
      }

      return standing[0];
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      throw new BadRequestException('Failed to fetch standing');
    }
  }

  /**
   * Get standings by league and round
   */
  async findByLeagueAndRound(leagueId: number, roundId: number) {
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

      // Verify round exists
      const round = await this.db
        .select()
        .from(rounds)
        .where(eq(rounds.id, roundId))
        .limit(1);

      if (!round || round.length === 0) {
        throw new NotFoundException(`Round with ID ${roundId} not found`);
      }

      return await this.db
        .select()
        .from(standings)
        .innerJoin(rounds, eq(standings.roundId, rounds.id))
        .innerJoin(seasons, eq(rounds.seasonId, seasons.id))
        .where(
          and(
            eq(seasons.leagueId, leagueId),
            eq(standings.roundId, roundId),
          ),
        )
        .orderBy(desc(standings.points), asc(standings.goalDifference))
        .then(results => results.map(r => r.standings));
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      throw new BadRequestException('Failed to fetch standings by league and round');
    }
  }

  /**
   * Get standings by league (all rounds)
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
        .from(standings)
        .innerJoin(seasons, eq(standings.seasonId, seasons.id))
        .where(eq(seasons.leagueId, leagueId))
        .orderBy(desc(standings.points), asc(standings.goalDifference))
        .then(results => results.map(r => r.standings));
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      throw new BadRequestException('Failed to fetch standings by league');
    }
  }

  /**
   * Create new standing record
   */
  async create(createStandingDto: CreateStandingDto) {
    try {
      // Verify season exists
      const season = await this.db
        .select()
        .from(seasons)
        .where(eq(seasons.id, createStandingDto.seasonId))
        .limit(1);

      if (!season || season.length === 0) {
        throw new BadRequestException(`Season with ID ${createStandingDto.seasonId} not found`);
      }

      // Verify group exists if provided
      if (createStandingDto.groupId) {
        const group = await this.db
          .select()
          .from(groups)
          .where(eq(groups.id, createStandingDto.groupId))
          .limit(1);

        if (!group || group.length === 0) {
          throw new BadRequestException(`Group with ID ${createStandingDto.groupId} not found`);
        }
      }

      // Verify club exists
      const clubs = await this.db
        .select()
        .from(schema.clubs)
        .where(eq(schema.clubs.id, createStandingDto.clubId))
        .limit(1);

      if (!clubs || clubs.length === 0) {
        throw new BadRequestException(`Club with ID ${createStandingDto.clubId} not found`);
      }

      // Verify round exists if provided
      if (createStandingDto.roundId) {
        const round = await this.db
          .select()
          .from(rounds)
          .where(eq(rounds.id, createStandingDto.roundId))
          .limit(1);

        if (!round || round.length === 0) {
          throw new BadRequestException(`Round with ID ${createStandingDto.roundId} not found`);
        }
      }

      // Create standing with required fields from standings table
      const result = await this.db
        .insert(standings)
        .values({
          leagueId: createStandingDto.leagueId,
          seasonId: createStandingDto.seasonId,
          roundId: createStandingDto.roundId || 1,
          groupId: createStandingDto.groupId || null,
          clubId: createStandingDto.clubId,
          points: createStandingDto.points || 0,
          played: createStandingDto.played || 0,
          wins: createStandingDto.wins || 0,
          draws: createStandingDto.draws || 0,
          losses: createStandingDto.losses || 0,
          goalsFor: createStandingDto.goalsFor || 0,
          goalsAgainst: createStandingDto.goalsAgainst || 0,
          goalDifference: createStandingDto.goalDifference || 0,
        })
        .returning();

      return result[0];
    } catch (error) {
      if (error instanceof BadRequestException) throw error;
      throw new BadRequestException('Failed to create standing');
    }
  }

  /**
   * Update standing
   */
  async update(id: number, updateStandingDto: UpdateStandingDto) {
    try {
      // Verify standing exists
      await this.findOne(id);

      const result = await this.db
        .update(standings)
        .set(updateStandingDto)
        .where(eq(standings.id, id))
        .returning();

      return result[0];
    } catch (error) {
      if (error instanceof BadRequestException || error instanceof NotFoundException)
        throw error;
      throw new BadRequestException('Failed to update standing');
    }
  }

  /**
   * Delete standing
   */
  async remove(id: number) {
    try {
      // Verify standing exists
      await this.findOne(id);

      const result = await this.db
        .delete(standings)
        .where(eq(standings.id, id))
        .returning();

      return result[0];
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      throw new BadRequestException('Failed to delete standing');
    }
  }

  /**
   * Record round stats (internal use by MatchesService)
   * Updates standings when a match is finalized
   */
  async recordRoundStats(roundId: number, groupId: number, clubId: number, newStats: any) {
    const lastEntry = await this.db
      .select()
      .from(standings)
      .where(
        and(
          eq(standings.clubId, clubId),
          eq(standings.roundId, roundId),
        ),
      )
      .orderBy(desc(standings.id))
      .limit(1);

    const prev = lastEntry[0] || {
      points: 0,
      played: 0,
      wins: 0,
      draws: 0,
      losses: 0,
      goalsFor: 0,
      goalsAgainst: 0,
    };

    const goalDifference =
      prev.goalsFor +
      newStats.goalsFor -
      (prev.goalsAgainst + newStats.goalsAgainst);

    // Note: Standings update logic will be refined in Phase 2
    // The standings calculation needs proper leagueId, seasonId, and roundId from context
    // await this.db.insert(standings).values({ ... });
  }
}