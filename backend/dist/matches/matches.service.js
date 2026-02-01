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
const schema_1 = require("../db/schema");
const drizzle_orm_1 = require("drizzle-orm");
let MatchesService = class MatchesService {
    constructor(db) {
        this.db = db;
    }
    async findAllPaginated(page, limit, sortBy = 'date', sortOrder = 'desc') {
        let orderByColumn;
        switch (sortBy) {
            case 'sportName':
                orderByColumn = (0, drizzle_orm_1.sql) `sports.name`;
                break;
            case 'leagueName':
                orderByColumn = (0, drizzle_orm_1.sql) `leagues.original_name`;
                break;
            case 'seasonInfo':
                orderByColumn = (0, drizzle_orm_1.sql) `seasons.start_year`;
                break;
            case 'roundNumber':
                orderByColumn = (0, drizzle_orm_1.sql) `rounds.round_number`;
                break;
            case 'groupName':
                orderByColumn = (0, drizzle_orm_1.sql) `groups.name`;
                break;
            case 'homeClubName':
                orderByColumn = (0, drizzle_orm_1.sql) `home_clubs.name`;
                break;
            case 'awayClubName':
                orderByColumn = (0, drizzle_orm_1.sql) `away_clubs.name`;
                break;
            case 'date':
                orderByColumn = schema_1.matches.date;
                break;
            case 'status':
                orderByColumn = schema_1.matches.status;
                break;
            default:
                orderByColumn = schema_1.matches[sortBy];
        }
        const orderDirection = sortOrder === 'asc' ? (0, drizzle_orm_1.asc)(orderByColumn) : (0, drizzle_orm_1.desc)(orderByColumn);
        const offset = (page - 1) * limit;
        const result = await this.db
            .select({
            id: schema_1.matches.id,
            sportId: schema_1.matches.sportId,
            leagueId: schema_1.matches.leagueId,
            seasonId: schema_1.matches.seasonId,
            roundId: schema_1.matches.roundId,
            groupId: schema_1.matches.groupId,
            turn: schema_1.matches.turn,
            homeClubId: schema_1.matches.homeClubId,
            awayClubId: schema_1.matches.awayClubId,
            stadiumId: schema_1.matches.stadiumId,
            date: schema_1.matches.date,
            status: schema_1.matches.status,
            homeScore: schema_1.matches.homeScore,
            awayScore: schema_1.matches.awayScore,
            hasOvertime: schema_1.matches.hasOvertime,
            hasPenalties: schema_1.matches.hasPenalties,
            createdAt: schema_1.matches.createdAt,
            updatedAt: schema_1.matches.updatedAt,
            sportName: (0, drizzle_orm_1.sql) `sports.name`,
            leagueName: (0, drizzle_orm_1.sql) `leagues.original_name`,
            seasonStartYear: (0, drizzle_orm_1.sql) `seasons.start_year`,
            seasonEndYear: (0, drizzle_orm_1.sql) `seasons.end_year`,
            roundNumber: (0, drizzle_orm_1.sql) `rounds.round_number`,
            groupName: (0, drizzle_orm_1.sql) `groups.name`,
            homeClubName: (0, drizzle_orm_1.sql) `home_clubs.name`,
            awayClubName: (0, drizzle_orm_1.sql) `away_clubs.name`,
        })
            .from(schema_1.matches)
            .leftJoin((0, drizzle_orm_1.sql) `sports`, (0, drizzle_orm_1.eq)((0, drizzle_orm_1.sql) `sports.id`, schema_1.matches.sportId))
            .leftJoin((0, drizzle_orm_1.sql) `leagues`, (0, drizzle_orm_1.eq)((0, drizzle_orm_1.sql) `leagues.id`, schema_1.matches.leagueId))
            .leftJoin((0, drizzle_orm_1.sql) `seasons`, (0, drizzle_orm_1.eq)((0, drizzle_orm_1.sql) `seasons.id`, schema_1.matches.seasonId))
            .leftJoin((0, drizzle_orm_1.sql) `rounds`, (0, drizzle_orm_1.eq)((0, drizzle_orm_1.sql) `rounds.id`, schema_1.matches.roundId))
            .leftJoin((0, drizzle_orm_1.sql) `groups`, (0, drizzle_orm_1.eq)((0, drizzle_orm_1.sql) `groups.id`, schema_1.matches.groupId))
            .leftJoin((0, drizzle_orm_1.sql) `clubs as home_clubs`, (0, drizzle_orm_1.eq)((0, drizzle_orm_1.sql) `home_clubs.id`, schema_1.matches.homeClubId))
            .leftJoin((0, drizzle_orm_1.sql) `clubs as away_clubs`, (0, drizzle_orm_1.eq)((0, drizzle_orm_1.sql) `away_clubs.id`, schema_1.matches.awayClubId))
            .orderBy(orderDirection)
            .offset(offset)
            .limit(limit);
        const countResult = await this.db.select({ count: (0, drizzle_orm_1.sql) `count(*)` }).from(schema_1.matches);
        const total = countResult[0].count;
        return {
            data: result,
            total,
            page,
            limit,
        };
    }
    async findOne(id) {
        const result = await this.db
            .select()
            .from(schema_1.matches)
            .where((0, drizzle_orm_1.eq)(schema_1.matches.id, id))
            .limit(1);
        if (result.length === 0) {
            throw new common_1.NotFoundException(`Match with id ${id} not found`);
        }
        return result[0];
    }
    async create(createMatchDto) {
        const validatedData = schema_1.MatchInsertSchema.parse({
            ...createMatchDto,
            turn: createMatchDto.turn || 1,
        });
        const result = await this.db.insert(schema_1.matches).values(validatedData).returning();
        return result[0];
    }
    async update(id, updateMatchDto) {
        const validatedData = schema_1.MatchInsertSchema.partial().parse(updateMatchDto);
        const result = await this.db
            .update(schema_1.matches)
            .set(validatedData)
            .where((0, drizzle_orm_1.eq)(schema_1.matches.id, id))
            .returning();
        if (result.length === 0) {
            throw new common_1.NotFoundException(`Match with id ${id} not found`);
        }
        return result[0];
    }
    async remove(id) {
        const result = await this.db.delete(schema_1.matches).where((0, drizzle_orm_1.eq)(schema_1.matches.id, id)).returning();
        if (result.length === 0) {
            throw new common_1.NotFoundException(`Match with id ${id} not found`);
        }
        return result[0];
    }
};
exports.MatchesService = MatchesService;
exports.MatchesService = MatchesService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)('DRIZZLE')),
    __metadata("design:paramtypes", [node_postgres_1.NodePgDatabase])
], MatchesService);
//# sourceMappingURL=matches.service.js.map