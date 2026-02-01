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
exports.RoundsService = void 0;
const common_1 = require("@nestjs/common");
const node_postgres_1 = require("drizzle-orm/node-postgres");
const drizzle_orm_1 = require("drizzle-orm");
const schema = require("../db/schema");
const schema_1 = require("../db/schema");
let RoundsService = class RoundsService {
    constructor(db) {
        this.db = db;
    }
    async findAll() {
        try {
            return await this.db
                .select({
                id: schema_1.rounds.id,
                seasonId: schema_1.rounds.seasonId,
                leagueId: schema_1.rounds.leagueId,
                roundNumber: schema_1.rounds.roundNumber,
                startDate: schema_1.rounds.startDate,
                endDate: schema_1.rounds.endDate,
                flgCurrent: schema_1.rounds.flgCurrent,
                createdAt: schema_1.rounds.createdAt,
            })
                .from(schema_1.rounds);
        }
        catch (error) {
            throw new common_1.BadRequestException('Failed to fetch rounds');
        }
    }
    async findAllPaginated(page, limit, sortBy, sortOrder) {
        const offset = (page - 1) * limit;
        const sortableColumns = ['roundNumber', 'startDate', 'endDate', 'flgCurrent', 'createdAt', 'leagueName', 'seasonInfo'];
        const orderByField = sortableColumns.includes(sortBy) ? sortBy : 'roundNumber';
        const order = sortOrder === 'desc' ? drizzle_orm_1.desc : drizzle_orm_1.asc;
        try {
            let orderByClause;
            switch (orderByField) {
                case 'leagueName':
                    orderByClause = order(schema.leagues.originalName);
                    break;
                case 'seasonInfo':
                    orderByClause = order(schema.seasons.startYear);
                    break;
                case 'startDate':
                    orderByClause = order(schema_1.rounds.startDate);
                    break;
                case 'endDate':
                    orderByClause = order(schema_1.rounds.endDate);
                    break;
                case 'flgCurrent':
                    orderByClause = order(schema_1.rounds.flgCurrent);
                    break;
                case 'createdAt':
                    orderByClause = order(schema_1.rounds.createdAt);
                    break;
                case 'roundNumber':
                default:
                    orderByClause = order(schema_1.rounds.roundNumber);
                    break;
            }
            const data = await this.db
                .select({
                id: schema_1.rounds.id,
                seasonId: schema_1.rounds.seasonId,
                leagueId: schema_1.rounds.leagueId,
                roundNumber: schema_1.rounds.roundNumber,
                startDate: schema_1.rounds.startDate,
                endDate: schema_1.rounds.endDate,
                flgCurrent: schema_1.rounds.flgCurrent,
                createdAt: schema_1.rounds.createdAt,
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
                .from(schema_1.rounds)
                .leftJoin(schema.leagues, (0, drizzle_orm_1.eq)(schema_1.rounds.leagueId, schema.leagues.id))
                .leftJoin(schema.seasons, (0, drizzle_orm_1.eq)(schema_1.rounds.seasonId, schema.seasons.id))
                .orderBy(orderByClause, (0, drizzle_orm_1.asc)(schema_1.rounds.id))
                .limit(limit)
                .offset(offset);
            const totalResult = await this.db
                .select({ count: (0, drizzle_orm_1.sql) `count(*)` })
                .from(schema_1.rounds)
                .leftJoin(schema.leagues, (0, drizzle_orm_1.eq)(schema_1.rounds.leagueId, schema.leagues.id))
                .leftJoin(schema.seasons, (0, drizzle_orm_1.eq)(schema_1.rounds.seasonId, schema.seasons.id));
            const total = Number(totalResult[0].count);
            return { data, total, page, limit };
        }
        catch (error) {
            throw new common_1.BadRequestException('Failed to fetch paginated rounds');
        }
    }
    async findOne(id) {
        try {
            const round = await this.db
                .select()
                .from(schema_1.rounds)
                .where((0, drizzle_orm_1.eq)(schema_1.rounds.id, id))
                .limit(1);
            if (!round || round.length === 0) {
                throw new common_1.NotFoundException(`Round with ID ${id} not found`);
            }
            return round[0];
        }
        catch (error) {
            if (error instanceof common_1.NotFoundException)
                throw error;
            throw new common_1.BadRequestException('Failed to fetch round');
        }
    }
    async findBySeason(seasonId) {
        try {
            const season = await this.db
                .select()
                .from(schema_1.seasons)
                .where((0, drizzle_orm_1.eq)(schema_1.seasons.id, seasonId))
                .limit(1);
            if (!season || season.length === 0) {
                throw new common_1.NotFoundException(`Season with ID ${seasonId} not found`);
            }
            return await this.db
                .select()
                .from(schema_1.rounds)
                .where((0, drizzle_orm_1.eq)(schema_1.rounds.seasonId, seasonId));
        }
        catch (error) {
            if (error instanceof common_1.NotFoundException)
                throw error;
            throw new common_1.BadRequestException('Failed to fetch rounds by season');
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
                .from(schema_1.rounds)
                .where((0, drizzle_orm_1.eq)(schema_1.rounds.leagueId, leagueId));
        }
        catch (error) {
            if (error instanceof common_1.NotFoundException)
                throw error;
            throw new common_1.BadRequestException('Failed to fetch rounds by league');
        }
    }
    async create(createRoundDto) {
        try {
            const season = await this.db
                .select()
                .from(schema_1.seasons)
                .where((0, drizzle_orm_1.eq)(schema_1.seasons.id, createRoundDto.seasonId))
                .limit(1);
            if (!season || season.length === 0) {
                throw new common_1.BadRequestException(`Season with ID ${createRoundDto.seasonId} not found`);
            }
            const league = await this.db
                .select()
                .from(schema_1.leagues)
                .where((0, drizzle_orm_1.eq)(schema_1.leagues.id, createRoundDto.leagueId))
                .limit(1);
            if (!league || league.length === 0) {
                throw new common_1.BadRequestException(`League with ID ${createRoundDto.leagueId} not found`);
            }
            const existingRound = await this.db
                .select()
                .from(schema_1.rounds)
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.rounds.leagueId, createRoundDto.leagueId), (0, drizzle_orm_1.eq)(schema_1.rounds.seasonId, createRoundDto.seasonId), (0, drizzle_orm_1.eq)(schema_1.rounds.roundNumber, createRoundDto.roundNumber)))
                .limit(1);
            if (existingRound && existingRound.length > 0) {
                throw new common_1.BadRequestException(`Round ${createRoundDto.roundNumber} already exists for this league and season`);
            }
            if (createRoundDto.flgCurrent) {
                await this.db
                    .update(schema_1.rounds)
                    .set({ flgCurrent: false })
                    .where((0, drizzle_orm_1.eq)(schema_1.rounds.seasonId, createRoundDto.seasonId));
            }
            const insertData = { ...createRoundDto };
            if (createRoundDto.startDate && typeof createRoundDto.startDate === 'string') {
                insertData.startDate = new Date(createRoundDto.startDate);
            }
            if (createRoundDto.endDate && typeof createRoundDto.endDate === 'string') {
                insertData.endDate = new Date(createRoundDto.endDate);
            }
            if (insertData.startDate && insertData.endDate) {
                if (insertData.startDate > insertData.endDate) {
                    throw new common_1.BadRequestException('Start date cannot be after end date');
                }
            }
            const result = await this.db
                .insert(schema_1.rounds)
                .values(insertData)
                .returning();
            return result[0];
        }
        catch (error) {
            if (error instanceof common_1.BadRequestException)
                throw error;
            throw new common_1.BadRequestException('Failed to create round');
        }
    }
    async update(id, updateRoundDto) {
        try {
            const existingRound = await this.findOne(id);
            if (updateRoundDto.seasonId) {
                const season = await this.db
                    .select()
                    .from(schema_1.seasons)
                    .where((0, drizzle_orm_1.eq)(schema_1.seasons.id, updateRoundDto.seasonId))
                    .limit(1);
                if (!season || season.length === 0) {
                    throw new common_1.BadRequestException(`Season with ID ${updateRoundDto.seasonId} not found`);
                }
            }
            if (updateRoundDto.leagueId) {
                const league = await this.db
                    .select()
                    .from(schema_1.leagues)
                    .where((0, drizzle_orm_1.eq)(schema_1.leagues.id, updateRoundDto.leagueId))
                    .limit(1);
                if (!league || league.length === 0) {
                    throw new common_1.BadRequestException(`League with ID ${updateRoundDto.leagueId} not found`);
                }
            }
            if (updateRoundDto.roundNumber) {
                const leagueId = updateRoundDto.leagueId || existingRound.leagueId;
                const seasonId = updateRoundDto.seasonId || existingRound.seasonId;
                const duplicateRound = await this.db
                    .select()
                    .from(schema_1.rounds)
                    .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.rounds.leagueId, leagueId), (0, drizzle_orm_1.eq)(schema_1.rounds.seasonId, seasonId), (0, drizzle_orm_1.eq)(schema_1.rounds.roundNumber, updateRoundDto.roundNumber)))
                    .limit(1);
                if (duplicateRound && duplicateRound.length > 0 && duplicateRound[0].id !== id) {
                    throw new common_1.BadRequestException(`Round ${updateRoundDto.roundNumber} already exists for this league and season`);
                }
            }
            if (updateRoundDto.flgCurrent === true) {
                const seasonId = updateRoundDto.seasonId || existingRound.seasonId;
                await this.db
                    .update(schema_1.rounds)
                    .set({ flgCurrent: false })
                    .where((0, drizzle_orm_1.eq)(schema_1.rounds.seasonId, seasonId));
            }
            const updateData = { ...updateRoundDto };
            if (updateRoundDto.startDate && typeof updateRoundDto.startDate === 'string') {
                updateData.startDate = new Date(updateRoundDto.startDate);
            }
            if (updateRoundDto.endDate && typeof updateRoundDto.endDate === 'string') {
                updateData.endDate = new Date(updateRoundDto.endDate);
            }
            const finalStartDate = updateData.startDate || existingRound.startDate;
            const finalEndDate = updateData.endDate || existingRound.endDate;
            if (finalStartDate && finalEndDate) {
                const startDateObj = finalStartDate instanceof Date ? finalStartDate : new Date(finalStartDate);
                const endDateObj = finalEndDate instanceof Date ? finalEndDate : new Date(finalEndDate);
                if (startDateObj > endDateObj) {
                    throw new common_1.BadRequestException('Start date cannot be after end date');
                }
            }
            const result = await this.db
                .update(schema_1.rounds)
                .set(updateData)
                .where((0, drizzle_orm_1.eq)(schema_1.rounds.id, id))
                .returning();
            return result[0];
        }
        catch (error) {
            if (error instanceof common_1.NotFoundException || error instanceof common_1.BadRequestException)
                throw error;
            throw new common_1.BadRequestException(error?.message || 'Failed to update round');
        }
    }
    async remove(id) {
        try {
            await this.findOne(id);
            await this.db
                .delete(schema_1.rounds)
                .where((0, drizzle_orm_1.eq)(schema_1.rounds.id, id));
        }
        catch (error) {
            if (error instanceof common_1.NotFoundException)
                throw error;
            throw new common_1.BadRequestException('Failed to delete round');
        }
    }
};
exports.RoundsService = RoundsService;
exports.RoundsService = RoundsService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)('DRIZZLE')),
    __metadata("design:paramtypes", [node_postgres_1.NodePgDatabase])
], RoundsService);
//# sourceMappingURL=rounds.service.js.map