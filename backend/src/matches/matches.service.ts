import { Injectable, Inject, NotFoundException, BadRequestException } from '@nestjs/common';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { eq } from 'drizzle-orm';
import * as schema from '../db/schema';
import { matches, groups, phases, rounds, leagues, sports } from '../db/schema';
import { CreateMatchDto, UpdateMatchDto, UpdateMatchScoreDto } from '../common/dtos';
import { StandingsService } from '../standings/standings.service';
import { StandingsCalculatorService } from '../standings/standings-calculator.service';

@Injectable()
export class MatchesService {
  constructor(
    @Inject('DRIZZLE')
    private db: NodePgDatabase<typeof schema>,
    private standingsService: StandingsService,
    private standingsCalculator: StandingsCalculatorService,
  ) {}

  /**
   * Get all matches
   */
  async findAll() {
    try {
      return await this.db.select().from(matches);
    } catch (error) {
      throw new BadRequestException('Failed to fetch matches');
    }
  }

  /**
   * Get match by ID
   */
  async findOne(id: number) {
    try {
      const match = await this.db
        .select()
        .from(matches)
        .where(eq(matches.id, id))
        .limit(1);

      if (!match || match.length === 0) {
        throw new NotFoundException(`Match with ID ${id} not found`);
      }

      return match[0];
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      throw new BadRequestException('Failed to fetch match');
    }
  }

  /**
   * Get matches by phase
   */
  async findByPhase(phaseId: number) {
    try {
      // Verify phase exists
      const phase = await this.db
        .select()
        .from(phases)
        .where(eq(phases.id, phaseId))
        .limit(1);

      if (!phase || phase.length === 0) {
        throw new NotFoundException(`Phase with ID ${phaseId} not found`);
      }

      return await this.db
        .select()
        .from(matches)
        .innerJoin(groups, eq(matches.groupId, groups.id))
        .where(eq(groups.phaseId, phaseId))
        .then(results => results.map(r => r.matches));
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      throw new BadRequestException('Failed to fetch matches by phase');
    }
  }

  /**
   * Get matches by group
   */
  async findByGroup(groupId: number) {
    try {
      // Verify group exists
      const group = await this.db
        .select()
        .from(groups)
        .where(eq(groups.id, groupId))
        .limit(1);

      if (!group || group.length === 0) {
        throw new NotFoundException(`Group with ID ${groupId} not found`);
      }

      return await this.db
        .select()
        .from(matches)
        .where(eq(matches.groupId, groupId));
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      throw new BadRequestException('Failed to fetch matches by group');
    }
  }

  /**
   * Get matches by round
   */
  async findByRound(roundId: number) {
    try {
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
        .from(matches)
        .where(eq(matches.roundId, roundId));
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      throw new BadRequestException('Failed to fetch matches by round');
    }
  }

  /**
   * Create new match
   */
  async create(createMatchDto: CreateMatchDto) {
    try {
      // Verify group exists
      const group = await this.db
        .select()
        .from(groups)
        .where(eq(groups.id, createMatchDto.groupId))
        .limit(1);

      if (!group || group.length === 0) {
        throw new BadRequestException(`Group with ID ${createMatchDto.groupId} not found`);
      }

      // Verify clubs exist (home and away)
      const homeClub = await this.db
        .select()
        .from(schema.clubs)
        .where(eq(schema.clubs.id, createMatchDto.homeClubId))
        .limit(1);

      if (!homeClub || homeClub.length === 0) {
        throw new BadRequestException(`Home club with ID ${createMatchDto.homeClubId} not found`);
      }

      const awayClub = await this.db
        .select()
        .from(schema.clubs)
        .where(eq(schema.clubs.id, createMatchDto.awayClubId))
        .limit(1);

      if (!awayClub || awayClub.length === 0) {
        throw new BadRequestException(`Away club with ID ${createMatchDto.awayClubId} not found`);
      }

      // Verify round exists if provided
      if (createMatchDto.roundId) {
        const round = await this.db
          .select()
          .from(rounds)
          .where(eq(rounds.id, createMatchDto.roundId))
          .limit(1);

        if (!round || round.length === 0) {
          throw new BadRequestException(`Round with ID ${createMatchDto.roundId} not found`);
        }
      }

      const result = await this.db
        .insert(matches)
        .values({
          leagueId: createMatchDto.leagueId,
          seasonId: createMatchDto.seasonId,
          phaseId: createMatchDto.phaseId,
          roundId: createMatchDto.roundId,
          groupId: createMatchDto.groupId || null,
          leagueDivisionId: createMatchDto.leagueDivisionId || null,
          turn: createMatchDto.turn || 1,
          homeClubId: createMatchDto.homeClubId,
          awayClubId: createMatchDto.awayClubId,
          stadiumId: createMatchDto.stadiumId || null,
          date: new Date(createMatchDto.date),
          homeScore: createMatchDto.homeScore || null,
          awayScore: createMatchDto.awayScore || null,
          hasOvertime: createMatchDto.hasOvertime || false,
          hasPenalties: createMatchDto.hasPenalties || false,
          status: 'scheduled',
        })
        .returning();

      return result[0];
    } catch (error) {
      if (error instanceof BadRequestException) throw error;
      throw new BadRequestException('Failed to create match');
    }
  }

  /**
   * Update match
   */
  async update(id: number, updateMatchDto: UpdateMatchDto) {
    try {
      // Verify match exists
      await this.findOne(id);

      // If updating group, verify it exists
      if (updateMatchDto.groupId) {
        const group = await this.db
          .select()
          .from(groups)
          .where(eq(groups.id, updateMatchDto.groupId))
          .limit(1);

        if (!group || group.length === 0) {
          throw new BadRequestException(`Group with ID ${updateMatchDto.groupId} not found`);
        }
      }

      // If updating clubs, verify they exist
      if (updateMatchDto.homeClubId) {
        const homeClub = await this.db
          .select()
          .from(schema.clubs)
          .where(eq(schema.clubs.id, updateMatchDto.homeClubId))
          .limit(1);

        if (!homeClub || homeClub.length === 0) {
          throw new BadRequestException(`Home club with ID ${updateMatchDto.homeClubId} not found`);
        }
      }

      if (updateMatchDto.awayClubId) {
        const awayClub = await this.db
          .select()
          .from(schema.clubs)
          .where(eq(schema.clubs.id, updateMatchDto.awayClubId))
          .limit(1);

        if (!awayClub || awayClub.length === 0) {
          throw new BadRequestException(`Away club with ID ${updateMatchDto.awayClubId} not found`);
        }
      }

      const result = await this.db
        .update(matches)
        .set({
          homeScore: updateMatchDto.homeScore,
          awayScore: updateMatchDto.awayScore,
          hasOvertime: updateMatchDto.hasOvertime,
          hasPenalties: updateMatchDto.hasPenalties,
          date: updateMatchDto.date ? new Date(updateMatchDto.date as any) : undefined,
          updatedAt: new Date(),
        })
        .where(eq(matches.id, id))
        .returning();

      return result[0];
    } catch (error) {
      if (error instanceof BadRequestException || error instanceof NotFoundException)
        throw error;
      throw new BadRequestException('Failed to update match');
    }
  }

  /**
   * Update match score (sport-specific scoring rules applied)
   */
  async updateScore(id: number, updateScoreDto: UpdateMatchScoreDto) {
    try {
      // Verify match exists
      const match = await this.findOne(id);

      // Update match with score
      const result = await this.db
        .update(matches)
        .set({
          homeScore: updateScoreDto.homeScore,
          awayScore: updateScoreDto.awayScore,
          status: 'finished',
          hasOvertime: updateScoreDto.hasOvertime || false,
          hasPenalties: updateScoreDto.hasPenalties || false,
          updatedAt: new Date(),
        })
        .where(eq(matches.id, id))
        .returning();

      // Trigger standings calculation
      const updatedMatch = result[0];
      
      // Fetch league and sport info
      const leagueInfo = await this.db
        .select({
          sportName: sports.name,
        })
        .from(leagues)
        .innerJoin(sports, eq(leagues.sportId, sports.id))
        .where(eq(leagues.id, updatedMatch.leagueId))
        .limit(1);

      if (leagueInfo && leagueInfo.length > 0) {
        const sportName = leagueInfo[0].sportName;
        const stats = this.standingsCalculator.calculate(sportName, updatedMatch);

        // Update Home Team Standings
        await this.standingsService.recordRoundStats(updatedMatch.phaseId, updatedMatch.groupId, updatedMatch.homeClubId, stats.home);

        // Update Away Team Standings
        await this.standingsService.recordRoundStats(updatedMatch.phaseId, updatedMatch.groupId, updatedMatch.awayClubId, stats.away);
      }

      return result[0];
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      throw new BadRequestException('Failed to update match score');
    }
  }

  /**
   * Delete match
   */
  async remove(id: number) {
    try {
      // Verify match exists
      await this.findOne(id);

      // Check if match has any divisions or events
      const divisions = await this.db
        .select()
        .from(schema.matchDivisions)
        .where(eq(schema.matchDivisions.matchId, id))
        .limit(1);

      if (divisions && divisions.length > 0) {
        throw new BadRequestException(
          'Cannot delete match. Match divisions are recorded.',
        );
      }

      const events = await this.db
        .select()
        .from(schema.matchEvents)
        .where(eq(schema.matchEvents.matchId, id))
        .limit(1);

      if (events && events.length > 0) {
        throw new BadRequestException(
          'Cannot delete match. Match events are recorded.',
        );
      }

      const result = await this.db
        .delete(matches)
        .where(eq(matches.id, id))
        .returning();

      return result[0];
    } catch (error) {
      if (error instanceof BadRequestException || error instanceof NotFoundException)
        throw error;
      throw new BadRequestException('Failed to delete match');
    }
  }
}