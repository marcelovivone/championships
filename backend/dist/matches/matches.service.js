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
exports.MatchesService = void 0;
const common_1 = require("@nestjs/common");
const node_postgres_1 = require("drizzle-orm/node-postgres");
const drizzle_orm_1 = require("drizzle-orm");
const schema = require("../db/schema");
const schema_1 = require("../db/schema");
const standings_service_1 = require("../standings/standings.service");
const standings_calculator_service_1 = require("../standings/standings-calculator.service");
let MatchesService = class MatchesService {
    constructor(db, standingsService, standingsCalculator) {
        this.db = db;
        this.standingsService = standingsService;
        this.standingsCalculator = standingsCalculator;
    }
    async findAll() {
        try {
            return await this.db.select().from(schema_1.matches);
        }
        catch (error) {
            throw new common_1.BadRequestException('Failed to fetch matches');
        }
    }
    async findOne(id) {
        try {
            const match = await this.db
                .select()
                .from(schema_1.matches)
                .where((0, drizzle_orm_1.eq)(schema_1.matches.id, id))
                .limit(1);
            if (!match || match.length === 0) {
                throw new common_1.NotFoundException(`Match with ID ${id} not found`);
            }
            return match[0];
        }
        catch (error) {
            if (error instanceof common_1.NotFoundException)
                throw error;
            throw new common_1.BadRequestException('Failed to fetch match');
        }
    }
    async findByPhase(phaseId) {
        try {
            const phase = await this.db
                .select()
                .from(schema_1.phases)
                .where((0, drizzle_orm_1.eq)(schema_1.phases.id, phaseId))
                .limit(1);
            if (!phase || phase.length === 0) {
                throw new common_1.NotFoundException(`Phase with ID ${phaseId} not found`);
            }
            return await this.db
                .select()
                .from(schema_1.matches)
                .innerJoin(schema_1.groups, (0, drizzle_orm_1.eq)(schema_1.matches.groupId, schema_1.groups.id))
                .where((0, drizzle_orm_1.eq)(schema_1.groups.phaseId, phaseId))
                .then(results => results.map(r => r.matches));
        }
        catch (error) {
            if (error instanceof common_1.NotFoundException)
                throw error;
            throw new common_1.BadRequestException('Failed to fetch matches by phase');
        }
    }
    async findByGroup(groupId) {
        try {
            const group = await this.db
                .select()
                .from(schema_1.groups)
                .where((0, drizzle_orm_1.eq)(schema_1.groups.id, groupId))
                .limit(1);
            if (!group || group.length === 0) {
                throw new common_1.NotFoundException(`Group with ID ${groupId} not found`);
            }
            return await this.db
                .select()
                .from(schema_1.matches)
                .where((0, drizzle_orm_1.eq)(schema_1.matches.groupId, groupId));
        }
        catch (error) {
            if (error instanceof common_1.NotFoundException)
                throw error;
            throw new common_1.BadRequestException('Failed to fetch matches by group');
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
                .from(schema_1.matches)
                .where((0, drizzle_orm_1.eq)(schema_1.matches.roundId, roundId));
        }
        catch (error) {
            if (error instanceof common_1.NotFoundException)
                throw error;
            throw new common_1.BadRequestException('Failed to fetch matches by round');
        }
    }
    async create(createMatchDto) {
        try {
            const group = await this.db
                .select()
                .from(schema_1.groups)
                .where((0, drizzle_orm_1.eq)(schema_1.groups.id, createMatchDto.groupId))
                .limit(1);
            if (!group || group.length === 0) {
                throw new common_1.BadRequestException(`Group with ID ${createMatchDto.groupId} not found`);
            }
            const homeClub = await this.db
                .select()
                .from(schema.clubs)
                .where((0, drizzle_orm_1.eq)(schema.clubs.id, createMatchDto.homeClubId))
                .limit(1);
            if (!homeClub || homeClub.length === 0) {
                throw new common_1.BadRequestException(`Home club with ID ${createMatchDto.homeClubId} not found`);
            }
            const awayClub = await this.db
                .select()
                .from(schema.clubs)
                .where((0, drizzle_orm_1.eq)(schema.clubs.id, createMatchDto.awayClubId))
                .limit(1);
            if (!awayClub || awayClub.length === 0) {
                throw new common_1.BadRequestException(`Away club with ID ${createMatchDto.awayClubId} not found`);
            }
            if (createMatchDto.roundId) {
                const round = await this.db
                    .select()
                    .from(schema_1.rounds)
                    .where((0, drizzle_orm_1.eq)(schema_1.rounds.id, createMatchDto.roundId))
                    .limit(1);
                if (!round || round.length === 0) {
                    throw new common_1.BadRequestException(`Round with ID ${createMatchDto.roundId} not found`);
                }
            }
            const result = await this.db
                .insert(schema_1.matches)
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
        }
        catch (error) {
            if (error instanceof common_1.BadRequestException)
                throw error;
            throw new common_1.BadRequestException('Failed to create match');
        }
    }
    async update(id, updateMatchDto) {
        try {
            await this.findOne(id);
            if (updateMatchDto.groupId) {
                const group = await this.db
                    .select()
                    .from(schema_1.groups)
                    .where((0, drizzle_orm_1.eq)(schema_1.groups.id, updateMatchDto.groupId))
                    .limit(1);
                if (!group || group.length === 0) {
                    throw new common_1.BadRequestException(`Group with ID ${updateMatchDto.groupId} not found`);
                }
            }
            if (updateMatchDto.homeClubId) {
                const homeClub = await this.db
                    .select()
                    .from(schema.clubs)
                    .where((0, drizzle_orm_1.eq)(schema.clubs.id, updateMatchDto.homeClubId))
                    .limit(1);
                if (!homeClub || homeClub.length === 0) {
                    throw new common_1.BadRequestException(`Home club with ID ${updateMatchDto.homeClubId} not found`);
                }
            }
            if (updateMatchDto.awayClubId) {
                const awayClub = await this.db
                    .select()
                    .from(schema.clubs)
                    .where((0, drizzle_orm_1.eq)(schema.clubs.id, updateMatchDto.awayClubId))
                    .limit(1);
                if (!awayClub || awayClub.length === 0) {
                    throw new common_1.BadRequestException(`Away club with ID ${updateMatchDto.awayClubId} not found`);
                }
            }
            const result = await this.db
                .update(schema_1.matches)
                .set({
                homeScore: updateMatchDto.homeScore,
                awayScore: updateMatchDto.awayScore,
                hasOvertime: updateMatchDto.hasOvertime,
                hasPenalties: updateMatchDto.hasPenalties,
                date: updateMatchDto.date ? new Date(updateMatchDto.date) : undefined,
                updatedAt: new Date(),
            })
                .where((0, drizzle_orm_1.eq)(schema_1.matches.id, id))
                .returning();
            return result[0];
        }
        catch (error) {
            if (error instanceof common_1.BadRequestException || error instanceof common_1.NotFoundException)
                throw error;
            throw new common_1.BadRequestException('Failed to update match');
        }
    }
    async updateScore(id, updateScoreDto) {
        try {
            const match = await this.findOne(id);
            const result = await this.db
                .update(schema_1.matches)
                .set({
                homeScore: updateScoreDto.homeScore,
                awayScore: updateScoreDto.awayScore,
                status: 'finished',
                hasOvertime: updateScoreDto.hasOvertime || false,
                hasPenalties: updateScoreDto.hasPenalties || false,
                updatedAt: new Date(),
            })
                .where((0, drizzle_orm_1.eq)(schema_1.matches.id, id))
                .returning();
            const updatedMatch = result[0];
            const leagueInfo = await this.db
                .select({
                sportName: schema_1.sports.name,
            })
                .from(schema_1.leagues)
                .innerJoin(schema_1.sports, (0, drizzle_orm_1.eq)(schema_1.leagues.sportId, schema_1.sports.id))
                .where((0, drizzle_orm_1.eq)(schema_1.leagues.id, updatedMatch.leagueId))
                .limit(1);
            if (leagueInfo && leagueInfo.length > 0) {
                const sportName = leagueInfo[0].sportName;
                const stats = this.standingsCalculator.calculate(sportName, updatedMatch);
                await this.standingsService.recordRoundStats(updatedMatch.phaseId, updatedMatch.groupId, updatedMatch.homeClubId, stats.home);
                await this.standingsService.recordRoundStats(updatedMatch.phaseId, updatedMatch.groupId, updatedMatch.awayClubId, stats.away);
            }
            return result[0];
        }
        catch (error) {
            if (error instanceof common_1.NotFoundException)
                throw error;
            throw new common_1.BadRequestException('Failed to update match score');
        }
    }
    async remove(id) {
        try {
            await this.findOne(id);
            const divisions = await this.db
                .select()
                .from(schema.matchDivisions)
                .where((0, drizzle_orm_1.eq)(schema.matchDivisions.matchId, id))
                .limit(1);
            if (divisions && divisions.length > 0) {
                throw new common_1.BadRequestException('Cannot delete match. Match divisions are recorded.');
            }
            const events = await this.db
                .select()
                .from(schema.matchEvents)
                .where((0, drizzle_orm_1.eq)(schema.matchEvents.matchId, id))
                .limit(1);
            if (events && events.length > 0) {
                throw new common_1.BadRequestException('Cannot delete match. Match events are recorded.');
            }
            const result = await this.db
                .delete(schema_1.matches)
                .where((0, drizzle_orm_1.eq)(schema_1.matches.id, id))
                .returning();
            return result[0];
        }
        catch (error) {
            if (error instanceof common_1.BadRequestException || error instanceof common_1.NotFoundException)
                throw error;
            throw new common_1.BadRequestException('Failed to delete match');
        }
    }
};
exports.MatchesService = MatchesService;
exports.MatchesService = MatchesService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)('DRIZZLE')),
    __metadata("design:paramtypes", [node_postgres_1.NodePgDatabase,
        standings_service_1.StandingsService,
        standings_calculator_service_1.StandingsCalculatorService])
], MatchesService);
//# sourceMappingURL=matches.service.js.map