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
exports.StandingZonesService = void 0;
const common_1 = require("@nestjs/common");
const node_postgres_1 = require("drizzle-orm/node-postgres");
const schema_1 = require("../db/schema");
const drizzle_orm_1 = require("drizzle-orm");
let StandingZonesService = class StandingZonesService {
    constructor(db) {
        this.db = db;
    }
    async findAll(params) {
        const { sportId, leagueId, seasonId, page = 1, limit = 50, sortBy = 'startPosition', sortOrder = 'asc' } = params;
        const offset = (page - 1) * limit;
        try {
            let baseQuery = this.db.select().from(schema_1.standingZones);
            const conds = [];
            if (sportId)
                conds.push((0, drizzle_orm_1.eq)(schema_1.standingZones.sportId, sportId));
            if (leagueId)
                conds.push((0, drizzle_orm_1.eq)(schema_1.standingZones.leagueId, leagueId));
            let whereCond = undefined;
            if (conds.length) {
                let out = conds[0];
                for (let i = 1; i < conds.length; i++)
                    out = (0, drizzle_orm_1.and)(out, conds[i]);
                whereCond = out;
            }
            if (seasonId) {
                try {
                    const srows = await this.db.select().from(schema_1.seasons).where((0, drizzle_orm_1.eq)(schema_1.seasons.id, seasonId)).limit(1);
                    const srow = srows && srows[0] ? srows[0] : null;
                    const sStart = srow ? (srow.startYear ?? null) : null;
                    const sEnd = srow ? (srow.endYear ?? null) : null;
                    if (sStart !== null && sEnd !== null) {
                        const seasonFilter = (0, drizzle_orm_1.sql) `(
              standing_zones.season_id = ${seasonId}
              OR (
                standing_zones.season_id IS NULL
                AND (standing_zones.start_year IS NULL OR standing_zones.start_year <= ${Number(sStart)})
                AND (standing_zones.end_year IS NULL OR standing_zones.end_year >= ${Number(sEnd)})
              )
            )`;
                        whereCond = whereCond ? (0, drizzle_orm_1.and)(whereCond, seasonFilter) : seasonFilter;
                    }
                    else {
                        const seasonFilter = (0, drizzle_orm_1.sql) `(standing_zones.season_id = ${seasonId} OR standing_zones.season_id IS NULL)`;
                        whereCond = whereCond ? (0, drizzle_orm_1.and)(whereCond, seasonFilter) : seasonFilter;
                    }
                }
                catch (e) {
                    const seasonFilter = (0, drizzle_orm_1.sql) `(standing_zones.season_id = ${seasonId} OR standing_zones.season_id IS NULL)`;
                    whereCond = whereCond ? (0, drizzle_orm_1.and)(whereCond, seasonFilter) : seasonFilter;
                }
            }
            if (whereCond)
                baseQuery = baseQuery.where(whereCond);
            let query;
            const needJoinForSort = ['sportName', 'leagueName', 'seasonStart', 'seasonId'].includes(sortBy);
            if (needJoinForSort) {
                let oq = baseQuery;
                oq = oq.orderBy((0, drizzle_orm_1.asc)(schema_1.standingZones.flg_priority));
                if (sortBy === 'seasonStart' || sortBy === 'seasonId') {
                    oq = oq.orderBy(sortOrder === 'desc'
                        ? (0, drizzle_orm_1.desc)((0, drizzle_orm_1.sql) `(select start_year from seasons where seasons.id = standing_zones.season_id)`)
                        : (0, drizzle_orm_1.asc)((0, drizzle_orm_1.sql) `(select start_year from seasons where seasons.id = standing_zones.season_id)`));
                    oq = oq.orderBy((0, drizzle_orm_1.asc)((0, drizzle_orm_1.sql) `(select name from sports where sports.id = standing_zones.sport_id)`));
                    oq = oq.orderBy((0, drizzle_orm_1.asc)((0, drizzle_orm_1.sql) `(select original_name from leagues where leagues.id = standing_zones.league_id)`));
                }
                else if (sortBy === 'sportName') {
                    oq = oq.orderBy(sortOrder === 'desc'
                        ? (0, drizzle_orm_1.desc)((0, drizzle_orm_1.sql) `(select name from sports where sports.id = standing_zones.sport_id)`)
                        : (0, drizzle_orm_1.asc)((0, drizzle_orm_1.sql) `(select name from sports where sports.id = standing_zones.sport_id)`));
                    oq = oq.orderBy((0, drizzle_orm_1.asc)((0, drizzle_orm_1.sql) `(select original_name from leagues where leagues.id = standing_zones.league_id)`));
                    oq = oq.orderBy((0, drizzle_orm_1.asc)((0, drizzle_orm_1.sql) `(select start_year from seasons where seasons.id = standing_zones.season_id)`));
                }
                else if (sortBy === 'leagueName') {
                    oq = oq.orderBy(sortOrder === 'desc'
                        ? (0, drizzle_orm_1.desc)((0, drizzle_orm_1.sql) `(select original_name from leagues where leagues.id = standing_zones.league_id)`)
                        : (0, drizzle_orm_1.asc)((0, drizzle_orm_1.sql) `(select original_name from leagues where leagues.id = standing_zones.league_id)`));
                    oq = oq.orderBy((0, drizzle_orm_1.asc)((0, drizzle_orm_1.sql) `(select name from sports where sports.id = standing_zones.sport_id)`));
                    oq = oq.orderBy((0, drizzle_orm_1.asc)((0, drizzle_orm_1.sql) `(select start_year from seasons where seasons.id = standing_zones.season_id)`));
                }
                query = oq.limit(limit).offset(offset);
            }
            else if (sortBy === 'startPosition' || sortBy === 'range') {
                let oq = baseQuery;
                oq = oq.orderBy((0, drizzle_orm_1.asc)(schema_1.standingZones.flg_priority));
                oq = oq.orderBy(sortOrder === 'desc' ? (0, drizzle_orm_1.desc)(schema_1.standingZones.startPosition) : (0, drizzle_orm_1.asc)(schema_1.standingZones.startPosition));
                oq = oq.orderBy((0, drizzle_orm_1.asc)(schema_1.standingZones.endPosition));
                query = oq.limit(limit).offset(offset);
            }
            else if (sortBy === 'colorHex') {
                query = baseQuery.orderBy((0, drizzle_orm_1.asc)(schema_1.standingZones.flg_priority)).orderBy(sortOrder === 'desc' ? (0, drizzle_orm_1.desc)(schema_1.standingZones.colorHex) : (0, drizzle_orm_1.asc)(schema_1.standingZones.colorHex)).limit(limit).offset(offset);
            }
            else {
                const col = schema_1.standingZones[sortBy] || schema_1.standingZones.startPosition;
                query = baseQuery.orderBy((0, drizzle_orm_1.asc)(schema_1.standingZones.flg_priority)).orderBy(sortOrder === 'desc' ? (0, drizzle_orm_1.desc)(col) : (0, drizzle_orm_1.asc)(col)).limit(limit).offset(offset);
            }
            let data = await query;
            let totalResult;
            if (whereCond) {
                totalResult = await this.db.select({ count: (0, drizzle_orm_1.sql) `count(*)` }).from(schema_1.standingZones).where(whereCond);
            }
            else {
                totalResult = await this.db.select({ count: (0, drizzle_orm_1.sql) `count(*)` }).from(schema_1.standingZones);
            }
            const total = totalResult && totalResult[0] ? Number(totalResult[0].count || 0) : data.length;
            return { data, total };
        }
        catch (error) {
            console.error('Error in StandingZonesService.findAll:', error);
            const msg = error instanceof Error ? error.message : String(error);
            throw new common_1.BadRequestException(`Failed to fetch standing zones: ${msg || 'unknown'}`);
        }
    }
    async findOne(id) {
        try {
            const rows = await this.db.select().from(schema_1.standingZones).where((0, drizzle_orm_1.eq)(schema_1.standingZones.id, id)).limit(1);
            if (!rows || rows.length === 0)
                throw new common_1.NotFoundException(`Standing zone ${id} not found`);
            return rows[0];
        }
        catch (error) {
            if (error instanceof common_1.NotFoundException)
                throw error;
            throw new common_1.BadRequestException('Failed to fetch standing zone');
        }
    }
    async create(dto) {
        if (dto.startPosition < 1 || dto.endPosition < 1) {
            throw new common_1.BadRequestException('Positions must be >= 1');
        }
        if (dto.endPosition < dto.startPosition) {
            throw new common_1.BadRequestException('End Position must be equal or greater than Start Position');
        }
        const sport = await this.db.select().from(schema_1.sports).where((0, drizzle_orm_1.eq)(schema_1.sports.id, dto.sportId)).limit(1);
        if (!sport || sport.length === 0)
            throw new common_1.BadRequestException(`Sport ${dto.sportId} not found`);
        const league = await this.db.select().from(schema_1.leagues).where((0, drizzle_orm_1.eq)(schema_1.leagues.id, dto.leagueId)).limit(1);
        if (!league || league.length === 0)
            throw new common_1.BadRequestException(`League ${dto.leagueId} not found`);
        if (dto.seasonId) {
            const season = await this.db.select().from(schema_1.seasons).where((0, drizzle_orm_1.eq)(schema_1.seasons.id, dto.seasonId)).limit(1);
            if (!season || season.length === 0)
                throw new common_1.BadRequestException(`Season ${dto.seasonId} not found`);
        }
        const allowedTypes = ['All', 'Combined', 'Group'];
        if (dto.typeOfStanding && !allowedTypes.includes(dto.typeOfStanding)) {
            throw new common_1.BadRequestException(`Invalid typeOfStanding. Allowed: ${allowedTypes.join(', ')}`);
        }
        try {
            const res = await this.db.insert(schema_1.standingZones).values(dto).returning();
            return this.findOne(res[0].id);
        }
        catch (error) {
            throw new common_1.BadRequestException('Failed to create standing zone');
        }
    }
    async update(id, dto) {
        const existing = await this.findOne(id);
        if (dto.startPosition !== undefined && dto.startPosition < 1)
            throw new common_1.BadRequestException('Positions must be >= 1');
        if (dto.endPosition !== undefined && dto.endPosition < 1)
            throw new common_1.BadRequestException('Positions must be >= 1');
        if (dto.startPosition !== undefined && dto.endPosition !== undefined && dto.endPosition < dto.startPosition)
            throw new common_1.BadRequestException('End Position must be equal or greater than Start Position');
        if (dto.sportId) {
            const sport = await this.db.select().from(schema_1.sports).where((0, drizzle_orm_1.eq)(schema_1.sports.id, dto.sportId)).limit(1);
            if (!sport || sport.length === 0)
                throw new common_1.BadRequestException(`Sport ${dto.sportId} not found`);
        }
        if (dto.leagueId) {
            const league = await this.db.select().from(schema_1.leagues).where((0, drizzle_orm_1.eq)(schema_1.leagues.id, dto.leagueId)).limit(1);
            if (!league || league.length === 0)
                throw new common_1.BadRequestException(`League ${dto.leagueId} not found`);
        }
        if (dto.seasonId) {
            const season = await this.db.select().from(schema_1.seasons).where((0, drizzle_orm_1.eq)(schema_1.seasons.id, dto.seasonId)).limit(1);
            if (!season || season.length === 0)
                throw new common_1.BadRequestException(`Season ${dto.seasonId} not found`);
        }
        const allowedTypes = ['All', 'Combined', 'Group'];
        if (dto.typeOfStanding && !allowedTypes.includes(dto.typeOfStanding)) {
            throw new common_1.BadRequestException(`Invalid typeOfStanding. Allowed: ${allowedTypes.join(', ')}`);
        }
        try {
            await this.db.update(schema_1.standingZones).set(dto).where((0, drizzle_orm_1.eq)(schema_1.standingZones.id, id));
            return this.findOne(id);
        }
        catch (error) {
            throw new common_1.BadRequestException('Failed to update standing zone');
        }
    }
    async remove(id) {
        await this.findOne(id);
        try {
            await this.db.delete(schema_1.standingZones).where((0, drizzle_orm_1.eq)(schema_1.standingZones.id, id));
        }
        catch (error) {
            throw new common_1.BadRequestException('Failed to delete standing zone');
        }
    }
};
exports.StandingZonesService = StandingZonesService;
exports.StandingZonesService = StandingZonesService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)('DRIZZLE')),
    __metadata("design:paramtypes", [node_postgres_1.NodePgDatabase])
], StandingZonesService);
//# sourceMappingURL=standing-zones.service.js.map