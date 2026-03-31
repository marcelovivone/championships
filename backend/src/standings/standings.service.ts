import { Injectable, Inject, NotFoundException, BadRequestException } from '@nestjs/common';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { eq, and, desc, asc, lt, gt } from 'drizzle-orm';
import * as schema from '../db/schema';
import { standings, seasons, leagues, groups, rounds, matches, matchDivisions, seasonClubs } from '../db/schema';
import { CreateStandingDto } from '../common/dtos';
import { StandingsCalculatorService } from './standings-calculator.service';

@Injectable()
export class StandingsService {
        /**
         * Get standings by leagueId, seasonId, and roundId.
         * Clubs with postponed matches that have no row for this round are filled with
         * either their most-recent previous-round row, or zeroed-out values when no
         * earlier round row exists.
         */
        async findByLeagueIdAndSeasonIdAndRoundId(leagueId: number, seasonId: number, roundId: number, clubId?: number) {
            try {
                // 1. Fetch the requested round to get its roundNumber
                const [currentRound] = await this.db
                    .select()
                    .from(rounds)
                    .where(eq(rounds.id, roundId))
                    .limit(1);

                if (!currentRound) {
                    throw new BadRequestException(`Round with ID ${roundId} not found`);
                }
                const currentRoundNumber = currentRound.roundNumber;

                // 2. Fetch actual standing rows for this round
                const existing = await this.db
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

                // 3. Determine the full set of clubs for this league+season
                const allSeasonClubs = await this.db
                    .select()
                    .from(seasonClubs)
                    .where(
                        and(
                            eq(seasonClubs.leagueId, leagueId),
                            eq(seasonClubs.seasonId, seasonId),
                            clubId ? eq(seasonClubs.clubId, clubId) : undefined
                        )
                    );

                if (allSeasonClubs.length === 0) {
                    return existing;
                }

                // Build a set of clubIds that already have a row for this round
                const presentIds = new Set(existing.map(r => r.clubId));

                // 4. For each missing club, find most-recent earlier-round standing or zero-fill
                const fallbacks: (typeof existing[number])[] = [];

                for (const sc of allSeasonClubs) {
                    if (presentIds.has(sc.clubId)) continue;

                    if (currentRoundNumber <= 1) {
                        fallbacks.push(this.buildZeroRow(leagueId, seasonId, roundId, sc.clubId, sc.sportId, sc.groupId ?? null));
                        continue;
                    }

                    // Query the standing for the highest round < currentRoundNumber for this club.
                    // Using lt(rounds.roundNumber, currentRoundNumber) directly in the WHERE clause
                    // ensures we never accidentally pick up any rows from the current round.
                    const prevRows = await this.db
                        .select({ standing: standings, roundNumber: rounds.roundNumber })
                        .from(standings)
                        .innerJoin(rounds, eq(standings.roundId, rounds.id))
                        .where(
                            and(
                                eq(standings.leagueId, leagueId),
                                eq(standings.seasonId, seasonId),
                                eq(standings.clubId, sc.clubId),
                                lt(rounds.roundNumber, currentRoundNumber)
                            )
                        )
                        .orderBy(desc(rounds.roundNumber))
                        .limit(1);

                    if (prevRows.length > 0) {
                        fallbacks.push(prevRows[0].standing);
                    } else {
                        fallbacks.push(this.buildZeroRow(leagueId, seasonId, roundId, sc.clubId, sc.sportId, sc.groupId ?? null));
                    }
                }

                // 5. Merge and sort by points desc, then goalsFor asc
                const merged = [...existing, ...fallbacks];
                merged.sort((a, b) => {
                    if ((b.points ?? 0) !== (a.points ?? 0)) return (b.points ?? 0) - (a.points ?? 0);
                    return (a.goalsFor ?? 0) - (b.goalsFor ?? 0);
                });
                return merged;
            } catch (error) {
                if (error instanceof BadRequestException) throw error;
                throw new BadRequestException('Failed to fetch standings by league, season, and round');
            }
        }

        /** Build a zeroed-out in-memory standing row for a club with no data yet */
        private buildZeroRow(leagueId: number, seasonId: number, roundId: number, clubId: number, sportId: number, groupId: number | null) {
            const now = new Date();
            return {
                id: 0,
                sportId,
                leagueId,
                seasonId,
                roundId,
                matchDate: null,
                groupId,
                clubId,
                matchId: null,
                points: 0,
                played: 0,
                wins: 0,
                draws: 0,
                losses: 0,
                goalsFor: 0,
                goalsAgainst: 0,
                overtimeWins: 0,
                overtimeLosses: 0,
                penaltyWins: 0,
                penaltyLosses: 0,
                setsWon: 0,
                setsLost: 0,
                homeGamesPlayed: 0,
                awayGamesPlayed: 0,
                homePoints: 0,
                awayPoints: 0,
                homeWins: 0,
                homeLosses: 0,
                homeDraws: 0,
                homeGoalsFor: 0,
                homeGoalsAgainst: 0,
                awayWins: 0,
                awayLosses: 0,
                awayDraws: 0,
                awayGoalsFor: 0,
                awayGoalsAgainst: 0,
                createdAt: now,
                updatedAt: now,
            } as any;
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
     * Create new standing record.
     * - Idempotent: if standings for this matchId already exist, returns them.
     * - Round-aware: uses round_number ordering (not id) to find previous standing.
     * - Cascade: after inserting, recalculates all future-round standings for both clubs.
     */
    async create(createStandingDto: CreateStandingDto) {
        try {
            // 0. Idempotency: if standings for this matchId already exist, skip creation
            if (createStandingDto.matchId) {
                const existingForMatch = await this.db
                    .select()
                    .from(standings)
                    .where(eq(standings.matchId, createStandingDto.matchId));
                if (existingForMatch.length > 0) {
                    return { home: existingForMatch[0], away: existingForMatch[1] ?? existingForMatch[0] };
                }
            }

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

            // Resolve round-aware previous standings
            const roundId = typeof createStandingDto.roundId === 'undefined' ? null : createStandingDto.roundId;
            const groupId = typeof createStandingDto.groupId === 'undefined' ? null : createStandingDto.groupId;

            let latestHomeStanding: any = null;
            let latestAwayStanding: any = null;

            if (roundId) {
                // Get current round number
                const [currentRound] = await this.db
                    .select()
                    .from(rounds)
                    .where(eq(rounds.id, roundId))
                    .limit(1);

                if (currentRound) {
                    const currentRoundNumber = currentRound.roundNumber;

                    // Find the standing from the highest round BEFORE the current one
                    const prevHomeRows = await this.db
                        .select({ standing: standings, roundNumber: rounds.roundNumber })
                        .from(standings)
                        .innerJoin(rounds, eq(standings.roundId, rounds.id))
                        .where(
                            and(
                                eq(standings.clubId, createStandingDto.homeClubId),
                                eq(standings.leagueId, createStandingDto.leagueId),
                                eq(standings.seasonId, createStandingDto.seasonId),
                                lt(rounds.roundNumber, currentRoundNumber)
                            )
                        )
                        .orderBy(desc(rounds.roundNumber))
                        .limit(1);
                    latestHomeStanding = prevHomeRows.length > 0 ? prevHomeRows[0].standing : null;

                    const prevAwayRows = await this.db
                        .select({ standing: standings, roundNumber: rounds.roundNumber })
                        .from(standings)
                        .innerJoin(rounds, eq(standings.roundId, rounds.id))
                        .where(
                            and(
                                eq(standings.clubId, createStandingDto.awayClubId),
                                eq(standings.leagueId, createStandingDto.leagueId),
                                eq(standings.seasonId, createStandingDto.seasonId),
                                lt(rounds.roundNumber, currentRoundNumber)
                            )
                        )
                        .orderBy(desc(rounds.roundNumber))
                        .limit(1);
                    latestAwayStanding = prevAwayRows.length > 0 ? prevAwayRows[0].standing : null;
                }
            } else {
                // Fallback for non-round leagues: use ORDER BY id DESC (original behavior)
                const [prevHome] = await this.db
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
                latestHomeStanding = prevHome ?? null;

                const [prevAway] = await this.db
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
                latestAwayStanding = prevAway ?? null;
            }

            // Prepare match data for calculation
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

            // Insert both standings
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

            // Cascade: recalculate future-round standings for both clubs
            if (roundId) {
                await this.cascadeClubStandings(
                    createStandingDto.homeClubId,
                    createStandingDto.leagueId,
                    createStandingDto.seasonId,
                    createStandingDto.sportId,
                    roundId,
                    sportName,
                );
                await this.cascadeClubStandings(
                    createStandingDto.awayClubId,
                    createStandingDto.leagueId,
                    createStandingDto.seasonId,
                    createStandingDto.sportId,
                    roundId,
                    sportName,
                );
            }

            return { home: homeResult, away: awayResult };
        } catch (error) {
            if (error instanceof BadRequestException) throw error;
            console.error(error);
            throw error;
        }
    }

    /**
     * Cascade recalculation for all standings of a club in rounds AFTER the given roundId.
     * For each future-round standing, re-fetches the previous-round standing and recalculates
     * cumulative values using the calculator.
     */
    private async cascadeClubStandings(
        clubId: number,
        leagueId: number,
        seasonId: number,
        sportId: number,
        currentRoundId: number,
        sportName: string,
    ) {
        // Get the current round number
        const [currentRound] = await this.db
            .select()
            .from(rounds)
            .where(eq(rounds.id, currentRoundId))
            .limit(1);
        if (!currentRound) return;
        const currentRoundNumber = currentRound.roundNumber;

        // Find all future standings for this club, ordered by round number ascending
        const futureRows = await this.db
            .select({
                standingsId: standings.id,
                matchId: standings.matchId,
                roundId: standings.roundId,
                roundNumber: rounds.roundNumber,
                clubId: standings.clubId,
            })
            .from(standings)
            .innerJoin(rounds, eq(standings.roundId, rounds.id))
            .where(
                and(
                    eq(standings.clubId, clubId),
                    eq(standings.leagueId, leagueId),
                    eq(standings.seasonId, seasonId),
                    gt(rounds.roundNumber, currentRoundNumber)
                )
            )
            .orderBy(asc(rounds.roundNumber));

        if (futureRows.length === 0) return;

        for (const futureRow of futureRows) {
            if (!futureRow.matchId || !futureRow.roundId) continue;

            // Fetch the match for this standing
            const [matchRow] = await this.db
                .select()
                .from(matches)
                .where(eq(matches.id, futureRow.matchId))
                .limit(1);
            if (!matchRow) continue;

            // Fetch match divisions
            const divisionRows = await this.db
                .select()
                .from(matchDivisions)
                .where(eq(matchDivisions.matchId, futureRow.matchId))
                .orderBy(asc(matchDivisions.divisionNumber));

            // Find the previous standing for this club (highest round < this round)
            const prevRows = await this.db
                .select({ standing: standings })
                .from(standings)
                .innerJoin(rounds, eq(standings.roundId, rounds.id))
                .where(
                    and(
                        eq(standings.clubId, clubId),
                        eq(standings.leagueId, leagueId),
                        eq(standings.seasonId, seasonId),
                        lt(rounds.roundNumber, futureRow.roundNumber)
                    )
                )
                .orderBy(desc(rounds.roundNumber))
                .limit(1);
            const prevStanding = prevRows.length > 0 ? prevRows[0].standing : null;

            // Find the opponent's previous standing
            const isHome = matchRow.homeClubId === clubId;
            const opponentId = isHome ? matchRow.awayClubId : matchRow.homeClubId;
            const opPrevRows = await this.db
                .select({ standing: standings })
                .from(standings)
                .innerJoin(rounds, eq(standings.roundId, rounds.id))
                .where(
                    and(
                        eq(standings.clubId, opponentId),
                        eq(standings.leagueId, leagueId),
                        eq(standings.seasonId, seasonId),
                        lt(rounds.roundNumber, futureRow.roundNumber)
                    )
                )
                .orderBy(desc(rounds.roundNumber))
                .limit(1);
            const opPrevStanding = opPrevRows.length > 0 ? opPrevRows[0].standing : null;

            // Build match data for the calculator
            const fMatchData = {
                sportId,
                leagueId,
                seasonId,
                roundId: futureRow.roundId,
                matchDate: matchRow.date,
                groupId: matchRow.groupId,
                homeClubId: matchRow.homeClubId,
                awayClubId: matchRow.awayClubId,
                homeScore: matchRow.homeScore ?? 0,
                awayScore: matchRow.awayScore ?? 0,
                matchId: futureRow.matchId,
                matchDivisions: divisionRows.map(d => ({
                    id: d.id,
                    divisionNumber: d.divisionNumber,
                    divisionType: d.divisionType,
                    homeScore: d.homeScore,
                    awayScore: d.awayScore,
                })),
            };

            // Recalculate
            const { home: fHomeStats, away: fAwayStats } = this.calculator.calculate(
                sportName,
                fMatchData,
                isHome ? prevStanding : opPrevStanding,
                isHome ? opPrevStanding : prevStanding,
            );
            const clubStats = isHome ? fHomeStats : fAwayStats;

            // Update the existing standing row
            await this.db
                .update(standings)
                .set({
                    points: clubStats.points,
                    played: clubStats.played,
                    wins: clubStats.wins,
                    draws: clubStats.draws,
                    losses: clubStats.losses,
                    goalsFor: clubStats.goalsFor,
                    goalsAgainst: clubStats.goalsAgainst,
                    setsWon: clubStats.setsWon,
                    setsLost: clubStats.setsLost,
                    homeGamesPlayed: clubStats.homeGamesPlayed || 0,
                    awayGamesPlayed: clubStats.awayGamesPlayed || 0,
                    homePoints: clubStats.homePoints || 0,
                    awayPoints: clubStats.awayPoints || 0,
                    homeWins: clubStats.homeWins || 0,
                    homeDraws: clubStats.homeDraws || 0,
                    homeLosses: clubStats.homeLosses || 0,
                    homeGoalsFor: clubStats.homeGoalsFor,
                    homeGoalsAgainst: clubStats.homeGoalsAgainst,
                    awayWins: clubStats.awayWins || 0,
                    awayDraws: clubStats.awayDraws || 0,
                    awayLosses: clubStats.awayLosses || 0,
                    awayGoalsFor: clubStats.awayGoalsFor,
                    awayGoalsAgainst: clubStats.awayGoalsAgainst,
                    overtimeWins: clubStats.overtimeWins,
                    overtimeLosses: clubStats.overtimeLosses,
                    penaltyWins: clubStats.penaltyWins,
                    penaltyLosses: clubStats.penaltyLosses,
                    updatedAt: new Date(),
                })
                .where(eq(standings.id, futureRow.standingsId));
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