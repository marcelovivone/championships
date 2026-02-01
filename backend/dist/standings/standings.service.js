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
let StandingsService = class StandingsService {
    constructor(db) {
        this.db = db;
    }
    async findAll() {
        try {
            return await this.db
                .select()
                .from(schema_1.standings)
                .orderBy((0, drizzle_orm_1.desc)(schema_1.standings.points), (0, drizzle_orm_1.asc)(schema_1.standings.goalDifference));
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
    async findByLeagueAndRound(leagueId, roundId) {
        try {
            const league = await this.db
                .select()
                .from(schema_1.leagues)
                .where((0, drizzle_orm_1.eq)(schema_1.leagues.id, leagueId))
                .limit(1);
            if (!league || league.length === 0) {
                throw new common_1.NotFoundException(`League with ID ${leagueId} not found`);
            }
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
                .innerJoin(schema_1.rounds, (0, drizzle_orm_1.eq)(schema_1.standings.roundId, schema_1.rounds.id))
                .innerJoin(schema_1.seasons, (0, drizzle_orm_1.eq)(schema_1.rounds.seasonId, schema_1.seasons.id))
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.seasons.leagueId, leagueId), (0, drizzle_orm_1.eq)(schema_1.standings.roundId, roundId)))
                .orderBy((0, drizzle_orm_1.desc)(schema_1.standings.points), (0, drizzle_orm_1.asc)(schema_1.standings.goalDifference))
                .then(results => results.map(r => r.standings));
        }
        catch (error) {
            if (error instanceof common_1.NotFoundException)
                throw error;
            throw new common_1.BadRequestException('Failed to fetch standings by league and round');
        }
    }
    async findByLeague(leagueId) {
        try {
            const league = await this.db
                .select()
                .from(schema_1.leagues)
                .where((0, drizzle_orm_1.eq)(schema_1.leagues.id, leagueId))
                .limit(1);
            if (!league || league.length === 0) {
                throw new common_1.NotFoundException(`League with ID ${leagueId} not found`);
            }
            return await this.db
                .select()
                .from(schema_1.standings)
                .innerJoin(schema_1.seasons, (0, drizzle_orm_1.eq)(schema_1.standings.seasonId, schema_1.seasons.id))
                .where((0, drizzle_orm_1.eq)(schema_1.seasons.leagueId, leagueId))
                .orderBy((0, drizzle_orm_1.desc)(schema_1.standings.points), (0, drizzle_orm_1.asc)(schema_1.standings.goalDifference))
                .then(results => results.map(r => r.standings));
        }
        catch (error) {
            if (error instanceof common_1.NotFoundException)
                throw error;
            throw new common_1.BadRequestException('Failed to fetch standings by league');
        }
    }
    async create(createStandingDto) {
        try {
            const season = await this.db
                .select()
                .from(schema_1.seasons)
                .where((0, drizzle_orm_1.eq)(schema_1.seasons.id, createStandingDto.seasonId))
                .limit(1);
            if (!season || season.length === 0) {
                throw new common_1.BadRequestException(`Season with ID ${createStandingDto.seasonId} not found`);
            }
            if (createStandingDto.groupId) {
                const group = await this.db
                    .select()
                    .from(schema_1.groups)
                    .where((0, drizzle_orm_1.eq)(schema_1.groups.id, createStandingDto.groupId))
                    .limit(1);
                if (!group || group.length === 0) {
                    throw new common_1.BadRequestException(`Group with ID ${createStandingDto.groupId} not found`);
                }
            }
            const clubs = await this.db
                .select()
                .from(schema.clubs)
                .where((0, drizzle_orm_1.eq)(schema.clubs.id, createStandingDto.clubId))
                .limit(1);
            if (!clubs || clubs.length === 0) {
                throw new common_1.BadRequestException(`Club with ID ${createStandingDto.clubId} not found`);
            }
            if (createStandingDto.roundId) {
                const round = await this.db
                    .select()
                    .from(schema_1.rounds)
                    .where((0, drizzle_orm_1.eq)(schema_1.rounds.id, createStandingDto.roundId))
                    .limit(1);
                if (!round || round.length === 0) {
                    throw new common_1.BadRequestException(`Round with ID ${createStandingDto.roundId} not found`);
                }
            }
            const result = await this.db
                .insert(schema_1.standings)
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
        }
        catch (error) {
            if (error instanceof common_1.BadRequestException)
                throw error;
            throw new common_1.BadRequestException('Failed to create standing');
        }
    }
    async update(id, updateStandingDto) {
        try {
            await this.findOne(id);
            const result = await this.db
                .update(schema_1.standings)
                .set(updateStandingDto)
                .where((0, drizzle_orm_1.eq)(schema_1.standings.id, id))
                .returning();
            return result[0];
        }
        catch (error) {
            if (error instanceof common_1.BadRequestException || error instanceof common_1.NotFoundException)
                throw error;
            throw new common_1.BadRequestException('Failed to update standing');
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
};
exports.StandingsService = StandingsService;
exports.StandingsService = StandingsService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)('DRIZZLE')),
    __metadata("design:paramtypes", [node_postgres_1.NodePgDatabase])
], StandingsService);
//# sourceMappingURL=standings.service.js.map