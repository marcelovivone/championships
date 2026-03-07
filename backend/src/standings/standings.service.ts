import { Injectable, Inject, NotFoundException, BadRequestException } from '@nestjs/common';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { eq, and, desc, asc } from 'drizzle-orm';
import * as schema from '../db/schema';
import { standings, seasons, leagues, groups, rounds, matches } from '../db/schema';
import { CreateStandingDto } from '../common/dtos';
import { StandingsCalculatorService } from './standings-calculator.service';

@Injectable()
export class StandingsService {
        /**
         * Get standings by leagueId, seasonId, and roundId
         */
        async findByLeagueIdAndSeasonIdAndRoundId(leagueId: number, seasonId: number, roundId: number, clubId?: number) {
            try {
                return await this.db
                    .select()
                    .from(standings)
                    .where(
                        and(
                            eq(standings.leagueId, leagueId),
                            eq(standings.seasonId, seasonId),
                            eq(standings.roundId, roundId),
                            clubId ? eq(standings.clubId, clubId) : undefined
                        )
                    )
                    .orderBy(desc(standings.points), asc(standings.goalsFor));
            } catch (error) {
                throw new BadRequestException('Failed to fetch standings by league, season, and round');
            }
        }

        /**
         * Get standings by leagueId, seasonId, and matchDate
         */
        async findByLeagueIdAndSeasonIdAndMatchDate(leagueId: number, seasonId: number, matchDate: string, clubId?: number) {
            try {
                const date = new Date(matchDate);
                if (isNaN(date.getTime())) {
                    throw new BadRequestException('Invalid matchDate format');
                }
                console.warn("Service: Fetching standings for leagueId:", leagueId, "seasonId:", seasonId, "matchDate:", date, "clubId:", clubId);
                return await this.db
                    .select()
                    .from(standings)
                    .where(
                        and(
                            eq(standings.leagueId, leagueId),
                            eq(standings.seasonId, seasonId),
                            eq(standings.matchDate, date),
                            clubId ? eq(standings.clubId, clubId) : undefined
                        )
                    )
                    .orderBy(desc(standings.points));
            } catch (error) {
                throw new BadRequestException('Failed to fetch standings by league, season, and matchDate');
            }
        }
    constructor(
        @Inject('DRIZZLE')
        private db: NodePgDatabase<typeof schema>,
        private readonly calculator: StandingsCalculatorService,
    ) { }

    /**
     * Get all standings
     */
    async findAll() {
        try {
            return await this.db
                .select()
                .from(standings)
                .orderBy(desc(standings.points), asc(standings.goalsFor));
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
     * Get standings by match
     */
    async findByMatch(matchId: number) {
        try {
            // Verify match exists
            const match = await this.db
                .select()
                .from(matches)
                .where(eq(matches.id, matchId))
                .limit(1);

            if (!match || match.length === 0) {
                throw new NotFoundException(`Match with ID ${matchId} not found`);
            }

            // Get roundId, groupId, seasonId from the match
            const { roundId, groupId, seasonId } = match[0];

            // Find standings for the same round, group, and season
            const whereClause = groupId
                ? and(eq(standings.roundId, roundId), eq(standings.groupId, groupId), eq(standings.seasonId, seasonId))
                : and(eq(standings.roundId, roundId), eq(standings.seasonId, seasonId));

            return await this.db
                .select()
                .from(standings)
                .where(whereClause)
                .orderBy(desc(standings.points), asc(standings.goalsFor));
        } catch (error) {
            if (error instanceof NotFoundException) throw error;
            throw new BadRequestException('Failed to fetch standings by match');
        }
    }

    /**
     * Get standings by league (all rounds)
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
                .from(standings)
                .innerJoin(seasons, eq(standings.seasonId, seasons.id))
                .where(eq(standings.roundId, roundId))
                .orderBy(desc(standings.points), asc(standings.goalsFor))
                .then(results => results.map(r => r.standings));
        } catch (error) {
            if (error instanceof NotFoundException) throw error;
            throw new BadRequestException('Failed to fetch standings by league');
        }
    }

    /**
     * Get standings by matchDate
     */
    async findByMatchDate(matchDate: string) {
        try {
            // Parse date string to Date object
            const date = new Date(matchDate);
            if (isNaN(date.getTime())) {
                throw new BadRequestException('Invalid matchDate format');
            }

            // Find all standings with this matchDate
            return await this.db
                .select()
                .from(standings)
                .where(eq(standings.matchDate, date))
                .orderBy(desc(standings.points), asc(standings.goalsFor));
        } catch (error) {
            if (error instanceof BadRequestException) throw error;
            throw new BadRequestException('Failed to fetch standings by matchDate');
        }
    }

    /**
     * Create new standing record
     */
    async create(createStandingDto: CreateStandingDto) {
        try {
            // Validate season, group, and both clubs
            const [season, group, homeClub, awayClub] = await Promise.all([
                this.db.select().from(seasons).where(eq(seasons.id, createStandingDto.seasonId)).limit(1),
                createStandingDto.groupId ? this.db.select().from(groups).where(eq(groups.id, createStandingDto.groupId)).limit(1) : Promise.resolve([null]),
                this.db.select().from(schema.clubs).where(eq(schema.clubs.id, createStandingDto.homeClubId)).limit(1),
                this.db.select().from(schema.clubs).where(eq(schema.clubs.id, createStandingDto.awayClubId)).limit(1),
            ]);
            if (!season || season.length === 0) throw new BadRequestException(`Season with ID ${createStandingDto.seasonId} not found`);
            if (createStandingDto.groupId && (!group || group.length === 0)) throw new BadRequestException(`Group with ID ${createStandingDto.groupId} not found`);
            if (!homeClub || homeClub.length === 0) throw new BadRequestException(`Home club with ID ${createStandingDto.homeClubId} not found`);
            if (!awayClub || awayClub.length === 0) throw new BadRequestException(`Away club with ID ${createStandingDto.awayClubId} not found`);

            // Retrieve latest standing for home club
            const [latestHomeStanding] = await this.db
                .select()
                .from(standings)
                .where(
                    and(
                        eq(standings.clubId, createStandingDto.homeClubId),
                        eq(standings.leagueId, createStandingDto.leagueId),
                        eq(standings.seasonId, createStandingDto.seasonId)
                    )
                )
                .orderBy(desc(standings.id))
                .limit(1);

            // Retrieve latest standing for away club
            const [latestAwayStanding] = await this.db
                .select()
                .from(standings)
                .where(
                    and(
                        eq(standings.clubId, createStandingDto.awayClubId),
                        eq(standings.leagueId, createStandingDto.leagueId),
                        eq(standings.seasonId, createStandingDto.seasonId)
                    )
                )
                .orderBy(desc(standings.id))
                .limit(1);

            // Prepare match data for calculation, including previous standing as base
            const matchData = {
                ...createStandingDto,
                clubId: createStandingDto.homeClubId,
                homeScore: createStandingDto.homeScore,
                awayScore: createStandingDto.awayScore,
                previousHomeStanding: latestHomeStanding || null,
                previousAwayStanding: latestAwayStanding || null,
                matchDivisions: createStandingDto.matchDivisions || [],
            };

            // Load real sport name
            let sportName = 'default';
            if (createStandingDto.sportId) {
                const sport = await this.db.select().from(schema.sports).where(eq(schema.sports.id, createStandingDto.sportId)).limit(1);
                if (sport && sport.length > 0 && sport[0].name) {
                    sportName = sport[0].name;
                }
            }
            // Calculate stats for both clubs
            const { home: homeStats, away: awayStats } = this.calculator.calculate(sportName, matchData, latestHomeStanding, latestAwayStanding);

            // Convert matchDate to Date object
            const matchDateObj = new Date(createStandingDto.matchDate);

            // Ensure null for optional fields if undefined
            const roundId = typeof createStandingDto.roundId === 'undefined' ? null : createStandingDto.roundId;
            const groupId = typeof createStandingDto.groupId === 'undefined' ? null : createStandingDto.groupId;

            // Insert both standings atomically
            const [homeResult] = await this.db.insert(standings).values({
                sportId: createStandingDto.sportId,
                leagueId: createStandingDto.leagueId,
                seasonId: createStandingDto.seasonId,
                roundId,
                matchDate: matchDateObj,
                groupId,
                clubId: createStandingDto.homeClubId,
                matchId: createStandingDto.matchId,
                points: homeStats.points,
                played: homeStats.played,
                wins: homeStats.wins,
                draws: homeStats.draws,
                losses: homeStats.losses,
                goalsFor: homeStats.goalsFor,
                goalsAgainst: homeStats.goalsAgainst,
                setsWon: homeStats.setsWon,
                setsLost: homeStats.setsLost,
                homeGamesPlayed: homeStats.homeGamesPlayed || 0,
                awayGamesPlayed: homeStats.awayGamesPlayed || 0,
                homePoints: homeStats.homePoints || 0,
                awayPoints: homeStats.awayPoints || 0,
                homeWins: homeStats.homeWins || 0,
                homeDraws: homeStats.homeDraws || 0,
                homeLosses: homeStats.homeLosses || 0,
                homeGoalsFor: homeStats.homeGoalsFor,
                homeGoalsAgainst: homeStats.homeGoalsAgainst,
                awayWins: homeStats.awayWins || 0,
                awayDraws: homeStats.awayDraws || 0,
                awayLosses: homeStats.awayLosses || 0,
                awayGoalsFor: homeStats.awayGoalsFor,
                awayGoalsAgainst: homeStats.awayGoalsAgainst,
                overtimeWins: homeStats.overtimeWins,
                overtimeLosses: homeStats.overtimeLosses,
                penaltyWins: homeStats.penaltyWins,
                penaltyLosses: homeStats.penaltyLosses,
            }).returning();
            const [awayResult] = await this.db.insert(standings).values({
                sportId: createStandingDto.sportId,
                leagueId: createStandingDto.leagueId,
                seasonId: createStandingDto.seasonId,
                roundId,
                matchDate: matchDateObj,
                groupId,
                clubId: createStandingDto.awayClubId,
                matchId: createStandingDto.matchId,
                points: awayStats.points,
                played: awayStats.played,
                wins: awayStats.wins,
                draws: awayStats.draws,
                losses: awayStats.losses,
                goalsFor: awayStats.goalsFor,
                goalsAgainst: awayStats.goalsAgainst,
                setsWon: awayStats.setsWon,
                setsLost: awayStats.setsLost,
                homeGamesPlayed: awayStats.homeGamesPlayed || 0,
                awayGamesPlayed: awayStats.awayGamesPlayed || 0,
                homePoints: awayStats.homePoints || 0,
                awayPoints: awayStats.awayPoints || 0,
                homeWins: awayStats.homeWins || 0,
                homeDraws: awayStats.homeDraws || 0,
                homeLosses: awayStats.homeLosses || 0,
                homeGoalsFor: awayStats.homeGoalsFor,
                homeGoalsAgainst: awayStats.homeGoalsAgainst,
                awayWins: awayStats.awayWins || 0,
                awayDraws: awayStats.awayDraws || 0,
                awayLosses: awayStats.awayLosses || 0,
                awayGoalsFor: awayStats.awayGoalsFor,
                awayGoalsAgainst: awayStats.awayGoalsAgainst,
                overtimeWins: awayStats.overtimeWins,
                overtimeLosses: awayStats.overtimeLosses,
                penaltyWins: awayStats.penaltyWins,
                penaltyLosses: awayStats.penaltyLosses,
            }).returning();
            return { home: homeResult, away: awayResult };
        } catch (error) {
            if (error instanceof BadRequestException) throw error;
            console.error(error);
            throw error;
        }
    }

    /**
     * Update standing
     */
    // async update(id: number, updateStandingDto: UpdateStandingDto) {
    //     try {
    //         // Verify standing exists
    //         await this.findOne(id);

    //         const updateData = {
    //             ...updateStandingDto,
    //             ...(updateStandingDto.matchDate && { matchDate: new Date(updateStandingDto.matchDate) }),
    //         };

    //         const result = await this.db
    //             .update(standings)
    //             .set(updateData)
    //             .where(eq(standings.id, id))
    //             .returning();

    //         return result[0];
    //     } catch (error) {
    //         if (error instanceof BadRequestException || error instanceof NotFoundException)
    //             throw error;
    //         throw new BadRequestException('Failed to update standing');
    //     }
    // }

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

    /**
     * Delete standing for club/league/season only if no later standing exists
     * Used for both home and away club deletes
     */
    async removeByClubLeagueSeason(clubId: number, leagueId: number, seasonId: number, standingId: number) {
        // Delete all standings for this matchId
        // Find the matchId for the given standingId
        const standing = await this.db
            .select()
            .from(standings)
            .where(eq(standings.id, standingId))
            .limit(1);
        if (!standing[0]) {
            throw new NotFoundException('Standing not found');
        }
        const matchId = standing[0].matchId;
        if (!matchId) {
            throw new BadRequestException('Standing row has no matchId');
        }
        // Delete all standings for this matchId
        const result = await this.db
            .delete(standings)
            .where(eq(standings.matchId, matchId))
            .returning();
        if (!result.length) {
            throw new NotFoundException('No standings found for matchId');
        }
        return result;
    }

    /**
     * Delete all standings for a given matchId
     */
    async removeByMatchId(matchId: number) {
        const result = await this.db
            .delete(standings)
            .where(eq(standings.matchId, matchId))
            .returning();
        if (!result.length) {
            throw new NotFoundException('No standings found for matchId');
        }
        return result;
    }
}