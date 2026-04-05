"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.StandingsService = void 0;
const common_1 = require("@nestjs/common");
const node_postgres_1 = require("drizzle-orm/node-postgres");
const drizzle_orm_1 = require("drizzle-orm");
const schema = require("../db/schema");
const schema_1 = require("../db/schema");
const standings_calculator_service_1 = require("./standings-calculator.service");
let StandingsService = class StandingsService {
    async findByLeagueIdAndSeasonIdAndRoundId(leagueId, seasonId, roundId, clubId) {
        try {
            const [currentRound] = await this.db
                .select()
                .from(schema_1.rounds)
                .where((0, drizzle_orm_1.eq)(schema_1.rounds.id, roundId))
                .limit(1);
            if (!currentRound) {
                throw new common_1.BadRequestException(`Round with ID ${roundId} not found`);
            }
            const currentRoundNumber = currentRound.roundNumber;
            const existing = await this.db
                .select()
                .from(schema_1.standings)
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.standings.leagueId, leagueId), (0, drizzle_orm_1.eq)(schema_1.standings.seasonId, seasonId), (0, drizzle_orm_1.eq)(schema_1.standings.roundId, roundId), clubId ? (0, drizzle_orm_1.eq)(schema_1.standings.clubId, clubId) : undefined))
                .orderBy((0, drizzle_orm_1.desc)(schema_1.standings.points), (0, drizzle_orm_1.asc)(schema_1.standings.goalsFor));
            const allSeasonClubs = await this.db
                .select()
                .from(schema_1.seasonClubs)
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.seasonClubs.leagueId, leagueId), (0, drizzle_orm_1.eq)(schema_1.seasonClubs.seasonId, seasonId), clubId ? (0, drizzle_orm_1.eq)(schema_1.seasonClubs.clubId, clubId) : undefined));
            if (allSeasonClubs.length === 0) {
                return existing;
            }
            const presentIds = new Set(existing.map(r => r.clubId));
            const fallbacks = [];
            for (const sc of allSeasonClubs) {
                if (presentIds.has(sc.clubId))
                    continue;
                if (currentRoundNumber <= 1) {
                    fallbacks.push(this.buildZeroRow(leagueId, seasonId, roundId, sc.clubId, sc.sportId, sc.groupId ?? null));
                    continue;
                }
                const prevRows = await this.db
                    .select({ standing: schema_1.standings, roundNumber: schema_1.rounds.roundNumber })
                    .from(schema_1.standings)
                    .innerJoin(schema_1.rounds, (0, drizzle_orm_1.eq)(schema_1.standings.roundId, schema_1.rounds.id))
                    .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.standings.leagueId, leagueId), (0, drizzle_orm_1.eq)(schema_1.standings.seasonId, seasonId), (0, drizzle_orm_1.eq)(schema_1.standings.clubId, sc.clubId), (0, drizzle_orm_1.lt)(schema_1.rounds.roundNumber, currentRoundNumber)))
                    .orderBy((0, drizzle_orm_1.desc)(schema_1.rounds.roundNumber))
                    .limit(1);
                if (prevRows.length > 0) {
                    fallbacks.push(prevRows[0].standing);
                }
                else {
                    fallbacks.push(this.buildZeroRow(leagueId, seasonId, roundId, sc.clubId, sc.sportId, sc.groupId ?? null));
                }
            }
            const merged = [...existing, ...fallbacks];
            merged.sort((a, b) => {
                if ((b.points ?? 0) !== (a.points ?? 0))
                    return (b.points ?? 0) - (a.points ?? 0);
                return (a.goalsFor ?? 0) - (b.goalsFor ?? 0);
            });
            return merged;
        }
        catch (error) {
            if (error instanceof common_1.BadRequestException)
                throw error;
            throw new common_1.BadRequestException('Failed to fetch standings by league, season, and round');
        }
    }
    buildZeroRow(leagueId, seasonId, roundId, clubId, sportId, groupId) {
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
        };
    }
    buildZeroMatchDateRow(leagueId, seasonId, matchDate, clubId, sportId, groupId) {
        const now = new Date();
        return {
            id: 0,
            sportId,
            leagueId,
            seasonId,
            roundId: null,
            matchDate,
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
        };
    }
    compareStandingRows(a, b) {
        const pointsDiff = Number(b.points ?? 0) - Number(a.points ?? 0);
        if (pointsDiff !== 0)
            return pointsDiff;
        const winsDiff = Number(b.wins ?? 0) - Number(a.wins ?? 0);
        if (winsDiff !== 0)
            return winsDiff;
        const goalDifferenceA = Number(a.goalsFor ?? 0) - Number(a.goalsAgainst ?? 0);
        const goalDifferenceB = Number(b.goalsFor ?? 0) - Number(b.goalsAgainst ?? 0);
        const goalDifferenceDiff = goalDifferenceB - goalDifferenceA;
        if (goalDifferenceDiff !== 0)
            return goalDifferenceDiff;
        const goalsForDiff = Number(b.goalsFor ?? 0) - Number(a.goalsFor ?? 0);
        if (goalsForDiff !== 0)
            return goalsForDiff;
        return Number(a.clubId ?? 0) - Number(b.clubId ?? 0);
    }
    async findByLeagueIdAndSeasonIdAndMatchDate(leagueId, seasonId, matchDate, clubId) {
        try {
            const selectedDate = new Date(matchDate);
            if (isNaN(selectedDate.getTime())) {
                throw new common_1.BadRequestException('Invalid matchDate format');
            }
            const selectedDateEnd = new Date(selectedDate);
            selectedDateEnd.setUTCHours(23, 59, 59, 999);
            const seasonClubRows = await this.db
                .select()
                .from(schema_1.seasonClubs)
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.seasonClubs.leagueId, leagueId), (0, drizzle_orm_1.eq)(schema_1.seasonClubs.seasonId, seasonId), clubId ? (0, drizzle_orm_1.eq)(schema_1.seasonClubs.clubId, clubId) : undefined))
                .orderBy((0, drizzle_orm_1.asc)(schema_1.seasonClubs.clubId));
            const candidateRows = await this.db
                .select()
                .from(schema_1.standings)
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.standings.leagueId, leagueId), (0, drizzle_orm_1.eq)(schema_1.standings.seasonId, seasonId), (0, drizzle_orm_1.lte)(schema_1.standings.matchDate, selectedDateEnd), clubId ? (0, drizzle_orm_1.eq)(schema_1.standings.clubId, clubId) : undefined))
                .orderBy((0, drizzle_orm_1.desc)(schema_1.standings.matchDate), (0, drizzle_orm_1.desc)(schema_1.standings.id));
            const latestStandingByClub = new Map();
            for (const row of candidateRows) {
                if (!latestStandingByClub.has(row.clubId)) {
                    latestStandingByClub.set(row.clubId, row);
                }
            }
            if (seasonClubRows.length === 0) {
                return Array.from(latestStandingByClub.values()).sort((a, b) => this.compareStandingRows(a, b));
            }
            const mergedRows = seasonClubRows.map((seasonClubRow) => {
                return latestStandingByClub.get(seasonClubRow.clubId)
                    ?? this.buildZeroMatchDateRow(leagueId, seasonId, selectedDate, seasonClubRow.clubId, seasonClubRow.sportId, seasonClubRow.groupId ?? null);
            });
            mergedRows.sort((a, b) => this.compareStandingRows(a, b));
            return mergedRows;
        }
        catch (error) {
            if (error instanceof common_1.BadRequestException)
                throw error;
            throw new common_1.BadRequestException('Failed to fetch standings by league, season, and matchDate');
        }
    }
    constructor(db, calculator) {
        this.db = db;
        this.calculator = calculator;
    }
    async findAll() {
        try {
            return await this.db
                .select()
                .from(schema_1.standings)
                .orderBy((0, drizzle_orm_1.desc)(schema_1.standings.points), (0, drizzle_orm_1.asc)(schema_1.standings.goalsFor));
        }
        catch (error) {
            throw new common_1.BadRequestException('Failed to fetch standings');
        }
    }
    async findOne(id) {
        try {
            const standing = await this.db
                .select()
                .from(schema_1.standings)
                .where((0, drizzle_orm_1.eq)(schema_1.standings.id, id))
                .limit(1);
            if (!standing || standing.length === 0) {
                throw new common_1.NotFoundException(`Standing with ID ${id} not found`);
            }
            return standing[0];
        }
        catch (error) {
            if (error instanceof common_1.NotFoundException)
                throw error;
            throw new common_1.BadRequestException('Failed to fetch standing');
        }
    }
    async findByMatch(matchId) {
        try {
            const match = await this.db
                .select()
                .from(schema_1.matches)
                .where((0, drizzle_orm_1.eq)(schema_1.matches.id, matchId))
                .limit(1);
            if (!match || match.length === 0) {
                throw new common_1.NotFoundException(`Match with ID ${matchId} not found`);
            }
            const { roundId, groupId, seasonId } = match[0];
            const whereClause = groupId
                ? (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.standings.roundId, roundId), (0, drizzle_orm_1.eq)(schema_1.standings.groupId, groupId), (0, drizzle_orm_1.eq)(schema_1.standings.seasonId, seasonId))
                : (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.standings.roundId, roundId), (0, drizzle_orm_1.eq)(schema_1.standings.seasonId, seasonId));
            return await this.db
                .select()
                .from(schema_1.standings)
                .where(whereClause)
                .orderBy((0, drizzle_orm_1.desc)(schema_1.standings.points), (0, drizzle_orm_1.asc)(schema_1.standings.goalsFor));
        }
        catch (error) {
            if (error instanceof common_1.NotFoundException)
                throw error;
            throw new common_1.BadRequestException('Failed to fetch standings by match');
        }
    }
    async findByRound(roundId) {
        try {
            const round = await this.db
                .select()
                .from(schema_1.rounds)
                .where((0, drizzle_orm_1.eq)(schema_1.rounds.id, roundId))
                .limit(1);
            if (!round || round.length === 0) {
                throw new common_1.NotFoundException(`Round with ID ${roundId} not found`);
            }
            return await this.db
                .select()
                .from(schema_1.standings)
                .innerJoin(schema_1.seasons, (0, drizzle_orm_1.eq)(schema_1.standings.seasonId, schema_1.seasons.id))
                .where((0, drizzle_orm_1.eq)(schema_1.standings.roundId, roundId))
                .orderBy((0, drizzle_orm_1.desc)(schema_1.standings.points), (0, drizzle_orm_1.asc)(schema_1.standings.goalsFor))
                .then(results => results.map(r => r.standings));
        }
        catch (error) {
            if (error instanceof common_1.NotFoundException)
                throw error;
            throw new common_1.BadRequestException('Failed to fetch standings by league');
        }
    }
    async findByMatchDate(matchDate) {
        try {
            const date = new Date(matchDate);
            if (isNaN(date.getTime())) {
                throw new common_1.BadRequestException('Invalid matchDate format');
            }
            return await this.db
                .select()
                .from(schema_1.standings)
                .where((0, drizzle_orm_1.eq)(schema_1.standings.matchDate, date))
                .orderBy((0, drizzle_orm_1.desc)(schema_1.standings.points), (0, drizzle_orm_1.asc)(schema_1.standings.goalsFor));
        }
        catch (error) {
            if (error instanceof common_1.BadRequestException)
                throw error;
            throw new common_1.BadRequestException('Failed to fetch standings by matchDate');
        }
    }
    async create(createStandingDto) {
        try {
            if (createStandingDto.matchId) {
                const existingForMatch = await this.db
                    .select()
                    .from(schema_1.standings)
                    .where((0, drizzle_orm_1.eq)(schema_1.standings.matchId, createStandingDto.matchId));
                if (existingForMatch.length > 0) {
                    return { home: existingForMatch[0], away: existingForMatch[1] ?? existingForMatch[0] };
                }
            }
            const [season, group, homeClub, awayClub] = await Promise.all([
                this.db.select().from(schema_1.seasons).where((0, drizzle_orm_1.eq)(schema_1.seasons.id, createStandingDto.seasonId)).limit(1),
                createStandingDto.groupId ? this.db.select().from(schema_1.groups).where((0, drizzle_orm_1.eq)(schema_1.groups.id, createStandingDto.groupId)).limit(1) : Promise.resolve([null]),
                this.db.select().from(schema.clubs).where((0, drizzle_orm_1.eq)(schema.clubs.id, createStandingDto.homeClubId)).limit(1),
                this.db.select().from(schema.clubs).where((0, drizzle_orm_1.eq)(schema.clubs.id, createStandingDto.awayClubId)).limit(1),
            ]);
            if (!season || season.length === 0)
                throw new common_1.BadRequestException(`Season with ID ${createStandingDto.seasonId} not found`);
            if (createStandingDto.groupId && (!group || group.length === 0))
                throw new common_1.BadRequestException(`Group with ID ${createStandingDto.groupId} not found`);
            if (!homeClub || homeClub.length === 0)
                throw new common_1.BadRequestException(`Home club with ID ${createStandingDto.homeClubId} not found`);
            if (!awayClub || awayClub.length === 0)
                throw new common_1.BadRequestException(`Away club with ID ${createStandingDto.awayClubId} not found`);
            const roundId = typeof createStandingDto.roundId === 'undefined' ? null : createStandingDto.roundId;
            const groupId = typeof createStandingDto.groupId === 'undefined' ? null : createStandingDto.groupId;
            let latestHomeStanding = null;
            let latestAwayStanding = null;
            if (roundId) {
                const [currentRound] = await this.db
                    .select()
                    .from(schema_1.rounds)
                    .where((0, drizzle_orm_1.eq)(schema_1.rounds.id, roundId))
                    .limit(1);
                if (currentRound) {
                    const currentRoundNumber = currentRound.roundNumber;
                    const prevHomeRows = await this.db
                        .select({ standing: schema_1.standings, roundNumber: schema_1.rounds.roundNumber })
                        .from(schema_1.standings)
                        .innerJoin(schema_1.rounds, (0, drizzle_orm_1.eq)(schema_1.standings.roundId, schema_1.rounds.id))
                        .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.standings.clubId, createStandingDto.homeClubId), (0, drizzle_orm_1.eq)(schema_1.standings.leagueId, createStandingDto.leagueId), (0, drizzle_orm_1.eq)(schema_1.standings.seasonId, createStandingDto.seasonId), (0, drizzle_orm_1.lt)(schema_1.rounds.roundNumber, currentRoundNumber)))
                        .orderBy((0, drizzle_orm_1.desc)(schema_1.rounds.roundNumber))
                        .limit(1);
                    latestHomeStanding = prevHomeRows.length > 0 ? prevHomeRows[0].standing : null;
                    const prevAwayRows = await this.db
                        .select({ standing: schema_1.standings, roundNumber: schema_1.rounds.roundNumber })
                        .from(schema_1.standings)
                        .innerJoin(schema_1.rounds, (0, drizzle_orm_1.eq)(schema_1.standings.roundId, schema_1.rounds.id))
                        .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.standings.clubId, createStandingDto.awayClubId), (0, drizzle_orm_1.eq)(schema_1.standings.leagueId, createStandingDto.leagueId), (0, drizzle_orm_1.eq)(schema_1.standings.seasonId, createStandingDto.seasonId), (0, drizzle_orm_1.lt)(schema_1.rounds.roundNumber, currentRoundNumber)))
                        .orderBy((0, drizzle_orm_1.desc)(schema_1.rounds.roundNumber))
                        .limit(1);
                    latestAwayStanding = prevAwayRows.length > 0 ? prevAwayRows[0].standing : null;
                }
            }
            else {
                const [prevHome] = await this.db
                    .select()
                    .from(schema_1.standings)
                    .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.standings.clubId, createStandingDto.homeClubId), (0, drizzle_orm_1.eq)(schema_1.standings.leagueId, createStandingDto.leagueId), (0, drizzle_orm_1.eq)(schema_1.standings.seasonId, createStandingDto.seasonId)))
                    .orderBy((0, drizzle_orm_1.desc)(schema_1.standings.id))
                    .limit(1);
                latestHomeStanding = prevHome ?? null;
                const [prevAway] = await this.db
                    .select()
                    .from(schema_1.standings)
                    .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.standings.clubId, createStandingDto.awayClubId), (0, drizzle_orm_1.eq)(schema_1.standings.leagueId, createStandingDto.leagueId), (0, drizzle_orm_1.eq)(schema_1.standings.seasonId, createStandingDto.seasonId)))
                    .orderBy((0, drizzle_orm_1.desc)(schema_1.standings.id))
                    .limit(1);
                latestAwayStanding = prevAway ?? null;
            }
            const matchData = {
                ...createStandingDto,
                clubId: createStandingDto.homeClubId,
                homeScore: createStandingDto.homeScore,
                awayScore: createStandingDto.awayScore,
                previousHomeStanding: latestHomeStanding || null,
                previousAwayStanding: latestAwayStanding || null,
                matchDivisions: createStandingDto.matchDivisions || [],
            };
            let sportName = 'default';
            if (createStandingDto.sportId) {
                const sport = await this.db.select().from(schema.sports).where((0, drizzle_orm_1.eq)(schema.sports.id, createStandingDto.sportId)).limit(1);
                if (sport && sport.length > 0 && sport[0].name) {
                    sportName = sport[0].name;
                }
            }
            const { home: homeStats, away: awayStats } = this.calculator.calculate(sportName, matchData, latestHomeStanding, latestAwayStanding);
            const matchDateObj = new Date(createStandingDto.matchDate);
            const [homeResult] = await this.db.insert(schema_1.standings).values({
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
            const [awayResult] = await this.db.insert(schema_1.standings).values({
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
            if (roundId) {
                await this.cascadeClubStandings(createStandingDto.homeClubId, createStandingDto.leagueId, createStandingDto.seasonId, createStandingDto.sportId, roundId, sportName);
                await this.cascadeClubStandings(createStandingDto.awayClubId, createStandingDto.leagueId, createStandingDto.seasonId, createStandingDto.sportId, roundId, sportName);
            }
            return { home: homeResult, away: awayResult };
        }
        catch (error) {
            if (error instanceof common_1.BadRequestException)
                throw error;
            console.error(error);
            throw error;
        }
    }
    async cascadeClubStandings(clubId, leagueId, seasonId, sportId, currentRoundId, sportName) {
        const [currentRound] = await this.db
            .select()
            .from(schema_1.rounds)
            .where((0, drizzle_orm_1.eq)(schema_1.rounds.id, currentRoundId))
            .limit(1);
        if (!currentRound)
            return;
        const currentRoundNumber = currentRound.roundNumber;
        const futureRows = await this.db
            .select({
            standingsId: schema_1.standings.id,
            matchId: schema_1.standings.matchId,
            roundId: schema_1.standings.roundId,
            roundNumber: schema_1.rounds.roundNumber,
            clubId: schema_1.standings.clubId,
        })
            .from(schema_1.standings)
            .innerJoin(schema_1.rounds, (0, drizzle_orm_1.eq)(schema_1.standings.roundId, schema_1.rounds.id))
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.standings.clubId, clubId), (0, drizzle_orm_1.eq)(schema_1.standings.leagueId, leagueId), (0, drizzle_orm_1.eq)(schema_1.standings.seasonId, seasonId), (0, drizzle_orm_1.gt)(schema_1.rounds.roundNumber, currentRoundNumber)))
            .orderBy((0, drizzle_orm_1.asc)(schema_1.rounds.roundNumber));
        if (futureRows.length === 0)
            return;
        for (const futureRow of futureRows) {
            if (!futureRow.matchId || !futureRow.roundId)
                continue;
            const [matchRow] = await this.db
                .select()
                .from(schema_1.matches)
                .where((0, drizzle_orm_1.eq)(schema_1.matches.id, futureRow.matchId))
                .limit(1);
            if (!matchRow)
                continue;
            const divisionRows = await this.db
                .select()
                .from(schema_1.matchDivisions)
                .where((0, drizzle_orm_1.eq)(schema_1.matchDivisions.matchId, futureRow.matchId))
                .orderBy((0, drizzle_orm_1.asc)(schema_1.matchDivisions.divisionNumber));
            const prevRows = await this.db
                .select({ standing: schema_1.standings })
                .from(schema_1.standings)
                .innerJoin(schema_1.rounds, (0, drizzle_orm_1.eq)(schema_1.standings.roundId, schema_1.rounds.id))
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.standings.clubId, clubId), (0, drizzle_orm_1.eq)(schema_1.standings.leagueId, leagueId), (0, drizzle_orm_1.eq)(schema_1.standings.seasonId, seasonId), (0, drizzle_orm_1.lt)(schema_1.rounds.roundNumber, futureRow.roundNumber)))
                .orderBy((0, drizzle_orm_1.desc)(schema_1.rounds.roundNumber))
                .limit(1);
            const prevStanding = prevRows.length > 0 ? prevRows[0].standing : null;
            const isHome = matchRow.homeClubId === clubId;
            const opponentId = isHome ? matchRow.awayClubId : matchRow.homeClubId;
            const opPrevRows = await this.db
                .select({ standing: schema_1.standings })
                .from(schema_1.standings)
                .innerJoin(schema_1.rounds, (0, drizzle_orm_1.eq)(schema_1.standings.roundId, schema_1.rounds.id))
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.standings.clubId, opponentId), (0, drizzle_orm_1.eq)(schema_1.standings.leagueId, leagueId), (0, drizzle_orm_1.eq)(schema_1.standings.seasonId, seasonId), (0, drizzle_orm_1.lt)(schema_1.rounds.roundNumber, futureRow.roundNumber)))
                .orderBy((0, drizzle_orm_1.desc)(schema_1.rounds.roundNumber))
                .limit(1);
            const opPrevStanding = opPrevRows.length > 0 ? opPrevRows[0].standing : null;
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
            const { home: fHomeStats, away: fAwayStats } = this.calculator.calculate(sportName, fMatchData, isHome ? prevStanding : opPrevStanding, isHome ? opPrevStanding : prevStanding);
            const clubStats = isHome ? fHomeStats : fAwayStats;
            await this.db
                .update(schema_1.standings)
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
                .where((0, drizzle_orm_1.eq)(schema_1.standings.id, futureRow.standingsId));
        }
    }
    async remove(id) {
        try {
            await this.findOne(id);
            const result = await this.db
                .delete(schema_1.standings)
                .where((0, drizzle_orm_1.eq)(schema_1.standings.id, id))
                .returning();
            return result[0];
        }
        catch (error) {
            if (error instanceof common_1.NotFoundException)
                throw error;
            throw new common_1.BadRequestException('Failed to delete standing');
        }
    }
    async recordRoundStats(roundId, groupId, clubId, newStats) {
        const lastEntry = await this.db
            .select()
            .from(schema_1.standings)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.standings.clubId, clubId), (0, drizzle_orm_1.eq)(schema_1.standings.roundId, roundId)))
            .orderBy((0, drizzle_orm_1.desc)(schema_1.standings.id))
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
        const goalDifference = prev.goalsFor +
            newStats.goalsFor -
            (prev.goalsAgainst + newStats.goalsAgainst);
    }
    async removeByClubLeagueSeason(clubId, leagueId, seasonId, standingId) {
        const standing = await this.db
            .select()
            .from(schema_1.standings)
            .where((0, drizzle_orm_1.eq)(schema_1.standings.id, standingId))
            .limit(1);
        if (!standing[0]) {
            throw new common_1.NotFoundException('Standing not found');
        }
        const matchId = standing[0].matchId;
        if (!matchId) {
            throw new common_1.BadRequestException('Standing row has no matchId');
        }
        const result = await this.db
            .delete(schema_1.standings)
            .where((0, drizzle_orm_1.eq)(schema_1.standings.matchId, matchId))
            .returning();
        if (!result.length) {
            throw new common_1.NotFoundException('No standings found for matchId');
        }
        return result;
    }
    async removeByMatchId(matchId) {
        const result = await this.db
            .delete(schema_1.standings)
            .where((0, drizzle_orm_1.eq)(schema_1.standings.matchId, matchId))
            .returning();
        if (!result.length) {
            throw new common_1.NotFoundException('No standings found for matchId');
        }
        return result;
    }
};
exports.StandingsService = StandingsService;
exports.StandingsService = StandingsService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)('DRIZZLE')),
    __metadata("design:paramtypes", [node_postgres_1.NodePgDatabase,
        standings_calculator_service_1.StandingsCalculatorService])
], StandingsService);
//# sourceMappingURL=standings.service.js.map