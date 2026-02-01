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
exports.SeasonsService = void 0;
const common_1 = require("@nestjs/common");
const node_postgres_1 = require("drizzle-orm/node-postgres");
const drizzle_orm_1 = require("drizzle-orm");
const schema = require("../db/schema");
const schema_1 = require("../db/schema");
let SeasonsService = class SeasonsService {
    constructor(db) {
        this.db = db;
    }
    async findAllPaginated(page, limit, sortBy, sortOrder) {
        const offset = (page - 1) * limit;
        const sortableColumns = ['startYear', 'endYear', 'status', 'flgDefault', 'createdAt', 'sportName', 'leagueName'];
        const orderByField = sortableColumns.includes(sortBy) ? sortBy : 'startYear';
        const order = sortOrder === 'desc' ? drizzle_orm_1.desc : drizzle_orm_1.asc;
        try {
            let orderByClause;
            switch (orderByField) {
                case 'sportName':
                    orderByClause = order(schema_1.sports.name);
                    break;
                case 'leagueName':
                    orderByClause = order(schema_1.leagues.secondaryName);
                    break;
                case 'endYear':
                    orderByClause = order(schema_1.seasons.endYear);
                    break;
                case 'status':
                    orderByClause = order(schema_1.seasons.status);
                    break;
                case 'flgDefault':
                    orderByClause = order(schema_1.seasons.flgDefault);
                    break;
                case 'createdAt':
                    orderByClause = order(schema_1.seasons.createdAt);
                    break;
                case 'startYear':
                default:
                    orderByClause = order(schema_1.seasons.startYear);
                    break;
            }
            const data = await this.db
                .select({
                id: schema_1.seasons.id,
                sportId: schema_1.seasons.sportId,
                leagueId: schema_1.seasons.leagueId,
                startYear: schema_1.seasons.startYear,
                endYear: schema_1.seasons.endYear,
                status: schema_1.seasons.status,
                flgDefault: schema_1.seasons.flgDefault,
                numberOfGroups: schema_1.seasons.numberOfGroups,
                createdAt: schema_1.seasons.createdAt,
                sport: {
                    id: schema_1.sports.id,
                    name: schema_1.sports.name,
                },
                league: {
                    id: schema_1.leagues.id,
                    secondaryName: schema_1.leagues.secondaryName,
                },
            })
                .from(schema_1.seasons)
                .leftJoin(schema_1.sports, (0, drizzle_orm_1.eq)(schema_1.seasons.sportId, schema_1.sports.id))
                .leftJoin(schema_1.leagues, (0, drizzle_orm_1.eq)(schema_1.seasons.leagueId, schema_1.leagues.id))
                .orderBy(orderByClause)
                .limit(limit)
                .offset(offset);
            const totalResult = await this.db
                .select({ count: (0, drizzle_orm_1.sql) `count(*)` })
                .from(schema_1.seasons)
                .leftJoin(schema_1.sports, (0, drizzle_orm_1.eq)(schema_1.seasons.sportId, schema_1.sports.id))
                .leftJoin(schema_1.leagues, (0, drizzle_orm_1.eq)(schema_1.seasons.leagueId, schema_1.leagues.id));
            const total = Number(totalResult[0].count);
            return { data, total, page, limit };
        }
        catch (error) {
            throw new common_1.BadRequestException('Failed to fetch paginated seasons');
        }
    }
    async findAll() {
        return this.db
            .select({
            id: schema_1.seasons.id,
            sportId: schema_1.seasons.sportId,
            leagueId: schema_1.seasons.leagueId,
            startYear: schema_1.seasons.startYear,
            endYear: schema_1.seasons.endYear,
            status: schema_1.seasons.status,
            flgDefault: schema_1.seasons.flgDefault,
            numberOfGroups: schema_1.seasons.numberOfGroups,
            createdAt: schema_1.seasons.createdAt,
            sport: {
                id: schema_1.sports.id,
                name: schema_1.sports.name,
            },
            league: {
                id: schema_1.leagues.id,
                secondaryName: schema_1.leagues.secondaryName,
            },
        })
            .from(schema_1.seasons)
            .leftJoin(schema_1.sports, (0, drizzle_orm_1.eq)(schema_1.seasons.sportId, schema_1.sports.id))
            .leftJoin(schema_1.leagues, (0, drizzle_orm_1.eq)(schema_1.seasons.leagueId, schema_1.leagues.id));
    }
    async findOne(id) {
        const result = await this.db.select().from(schema_1.seasons).where((0, drizzle_orm_1.eq)(schema_1.seasons.id, id)).limit(1);
        if (!result.length)
            throw new common_1.NotFoundException('Season not found');
        return result[0];
    }
    async findAllByLeague(leagueId) {
        try {
            return await this.db
                .select({
                id: schema.seasons.id,
                sportId: schema.seasons.sportId,
                leagueId: schema.seasons.leagueId,
                startYear: schema.seasons.startYear,
                endYear: schema.seasons.endYear,
                status: schema.seasons.status,
                flgDefault: schema.seasons.flgDefault,
                numberOfGroups: schema.seasons.numberOfGroups,
                sport: schema.sports,
                league: schema.leagues,
                createdAt: schema.seasons.createdAt,
            })
                .from(schema.seasons)
                .leftJoin(schema.sports, (0, drizzle_orm_1.eq)(schema.seasons.sportId, schema.sports.id))
                .leftJoin(schema.leagues, (0, drizzle_orm_1.eq)(schema.seasons.leagueId, schema.leagues.id))
                .where((0, drizzle_orm_1.eq)(schema.seasons.leagueId, leagueId));
        }
        catch (error) {
            throw new common_1.BadRequestException('Failed to fetch seasons by league');
        }
    }
    async findByLeague(leagueId) {
        return this.db.select().from(schema_1.seasons).where((0, drizzle_orm_1.eq)(schema_1.seasons.leagueId, leagueId));
    }
    async findDefaultSeasonByLeague(leagueId, excludeSeasonId) {
        const conditions = excludeSeasonId
            ? (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.seasons.leagueId, leagueId), (0, drizzle_orm_1.eq)(schema_1.seasons.flgDefault, true), (0, drizzle_orm_1.eq)(schema_1.seasons.id, excludeSeasonId))
            : (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.seasons.leagueId, leagueId), (0, drizzle_orm_1.eq)(schema_1.seasons.flgDefault, true));
        const result = await this.db
            .select()
            .from(schema_1.seasons)
            .where(conditions)
            .limit(1);
        return result.length > 0 ? result[0] : null;
    }
    async create(createSeasonDto) {
        try {
            const sport = await this.db
                .select()
                .from(schema_1.sports)
                .where((0, drizzle_orm_1.eq)(schema_1.sports.id, createSeasonDto.sportId))
                .limit(1);
            if (!sport || sport.length === 0) {
                throw new common_1.BadRequestException(`Sport with ID ${createSeasonDto.sportId} not found`);
            }
            const league = await this.db
                .select()
                .from(schema_1.leagues)
                .where((0, drizzle_orm_1.eq)(schema_1.leagues.id, createSeasonDto.leagueId))
                .limit(1);
            if (!league || league.length === 0) {
                throw new common_1.BadRequestException(`League with ID ${createSeasonDto.leagueId} not found`);
            }
            if (createSeasonDto.flgDefault) {
                await this.db
                    .update(schema_1.seasons)
                    .set({ flgDefault: false })
                    .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.seasons.leagueId, createSeasonDto.leagueId), (0, drizzle_orm_1.eq)(schema_1.seasons.flgDefault, true)));
            }
            const result = await this.db
                .insert(schema_1.seasons)
                .values({
                sportId: createSeasonDto.sportId,
                leagueId: createSeasonDto.leagueId,
                startYear: createSeasonDto.startYear,
                endYear: createSeasonDto.endYear,
                status: createSeasonDto.status || 'planned',
                flgDefault: createSeasonDto.flgDefault || false,
                numberOfGroups: createSeasonDto.numberOfGroups || 0,
            })
                .returning();
            return result[0];
        }
        catch (error) {
            if (error instanceof common_1.BadRequestException)
                throw error;
            throw new common_1.BadRequestException('Failed to create season');
        }
    }
    async update(id, updateSeasonDto) {
        try {
            const existingSeason = await this.findOne(id);
            if (updateSeasonDto.sportId) {
                const sport = await this.db
                    .select()
                    .from(schema_1.sports)
                    .where((0, drizzle_orm_1.eq)(schema_1.sports.id, updateSeasonDto.sportId))
                    .limit(1);
                if (!sport || sport.length === 0) {
                    throw new common_1.BadRequestException(`Sport with ID ${updateSeasonDto.sportId} not found`);
                }
            }
            if (updateSeasonDto.flgDefault === true) {
                const leagueId = updateSeasonDto.leagueId || existingSeason.leagueId;
                await this.db
                    .update(schema_1.seasons)
                    .set({ flgDefault: false })
                    .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.seasons.leagueId, leagueId), (0, drizzle_orm_1.eq)(schema_1.seasons.flgDefault, true)));
            }
            const result = await this.db
                .update(schema_1.seasons)
                .set(updateSeasonDto)
                .where((0, drizzle_orm_1.eq)(schema_1.seasons.id, id))
                .returning();
            if (!result.length)
                throw new common_1.NotFoundException('Season not found');
            return result[0];
        }
        catch (error) {
            if (error instanceof common_1.BadRequestException || error instanceof common_1.NotFoundException)
                throw error;
            throw new common_1.BadRequestException('Failed to update season');
        }
    }
    async changeDefaultSeason(currentDefaultId, newDefaultId) {
        try {
            await this.db
                .update(schema_1.seasons)
                .set({ flgDefault: false })
                .where((0, drizzle_orm_1.eq)(schema_1.seasons.id, currentDefaultId));
            const result = await this.db
                .update(schema_1.seasons)
                .set({ flgDefault: true })
                .where((0, drizzle_orm_1.eq)(schema_1.seasons.id, newDefaultId))
                .returning();
            return result[0];
        }
        catch (error) {
            throw new common_1.BadRequestException('Failed to change default season');
        }
    }
    async remove(id) {
        const result = await this.db.delete(schema_1.seasons).where((0, drizzle_orm_1.eq)(schema_1.seasons.id, id)).returning();
        if (!result.length)
            throw new common_1.NotFoundException('Season not found');
        return result[0];
    }
};
exports.SeasonsService = SeasonsService;
exports.SeasonsService = SeasonsService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)('DRIZZLE')),
    __metadata("design:paramtypes", [node_postgres_1.NodePgDatabase])
], SeasonsService);
//# sourceMappingURL=seasons.service.js.map