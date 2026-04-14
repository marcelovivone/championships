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
exports.StandingOrderRulesService = void 0;
const common_1 = require("@nestjs/common");
const node_postgres_1 = require("drizzle-orm/node-postgres");
const schema_1 = require("../db/schema");
const drizzle_orm_1 = require("drizzle-orm");
let StandingOrderRulesService = class StandingOrderRulesService {
    constructor(db) {
        this.db = db;
    }
    async findAll(params) {
        const { sportId, leagueId, page = 1, limit = 50, sortBy = 'sortOrder', sortOrder = 'asc' } = params;
        const offset = (page - 1) * limit;
        const conds = [];
        if (sportId)
            conds.push((0, drizzle_orm_1.eq)(schema_1.standingOrderRules.sportId, sportId));
        if (leagueId === 'null' || leagueId === 'sport-default') {
            conds.push((0, drizzle_orm_1.isNull)(schema_1.standingOrderRules.leagueId));
        }
        else if (leagueId) {
            conds.push((0, drizzle_orm_1.eq)(schema_1.standingOrderRules.leagueId, Number(leagueId)));
        }
        let whereCond = undefined;
        if (conds.length) {
            whereCond = conds[0];
            for (let i = 1; i < conds.length; i++)
                whereCond = (0, drizzle_orm_1.and)(whereCond, conds[i]);
        }
        let query = this.db.select().from(schema_1.standingOrderRules);
        if (whereCond)
            query = query.where(whereCond);
        const sortCol = schema_1.standingOrderRules[sortBy] || schema_1.standingOrderRules.sortOrder;
        query = query.orderBy(sortOrder === 'desc' ? (0, drizzle_orm_1.desc)(sortCol) : (0, drizzle_orm_1.asc)(sortCol));
        query = query.limit(limit).offset(offset);
        const data = await query;
        let totalResult;
        if (whereCond) {
            totalResult = await this.db.select({ count: (0, drizzle_orm_1.sql) `count(*)` }).from(schema_1.standingOrderRules).where(whereCond);
        }
        else {
            totalResult = await this.db.select({ count: (0, drizzle_orm_1.sql) `count(*)` }).from(schema_1.standingOrderRules);
        }
        const total = totalResult?.[0] ? Number(totalResult[0].count || 0) : data.length;
        return { data, total };
    }
    async findOne(id) {
        const rows = await this.db.select().from(schema_1.standingOrderRules).where((0, drizzle_orm_1.eq)(schema_1.standingOrderRules.id, id)).limit(1);
        if (!rows?.length)
            throw new common_1.NotFoundException(`Standing order rule ${id} not found`);
        return rows[0];
    }
    async resolveForLeagueAndSeason(leagueId, sportId, seasonStartYear) {
        const leagueRules = await this.db
            .select()
            .from(schema_1.standingOrderRules)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.standingOrderRules.sportId, sportId), (0, drizzle_orm_1.eq)(schema_1.standingOrderRules.leagueId, leagueId), (0, drizzle_orm_1.sql) `(${schema_1.standingOrderRules.startYear} IS NULL OR ${schema_1.standingOrderRules.startYear} <= ${seasonStartYear})`, (0, drizzle_orm_1.sql) `(${schema_1.standingOrderRules.endYear} IS NULL OR ${schema_1.standingOrderRules.endYear} >= ${seasonStartYear})`))
            .orderBy((0, drizzle_orm_1.asc)(schema_1.standingOrderRules.sortOrder));
        if (leagueRules.length > 0)
            return leagueRules;
        const sportRules = await this.db
            .select()
            .from(schema_1.standingOrderRules)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.standingOrderRules.sportId, sportId), (0, drizzle_orm_1.isNull)(schema_1.standingOrderRules.leagueId), (0, drizzle_orm_1.sql) `(${schema_1.standingOrderRules.startYear} IS NULL OR ${schema_1.standingOrderRules.startYear} <= ${seasonStartYear})`, (0, drizzle_orm_1.sql) `(${schema_1.standingOrderRules.endYear} IS NULL OR ${schema_1.standingOrderRules.endYear} >= ${seasonStartYear})`))
            .orderBy((0, drizzle_orm_1.asc)(schema_1.standingOrderRules.sortOrder));
        return sportRules;
    }
    async create(dto) {
        const sport = await this.db.select().from(schema_1.sports).where((0, drizzle_orm_1.eq)(schema_1.sports.id, dto.sportId)).limit(1);
        if (!sport?.length)
            throw new common_1.BadRequestException(`Sport ${dto.sportId} not found`);
        if (dto.leagueId) {
            const league = await this.db.select().from(schema_1.leagues).where((0, drizzle_orm_1.eq)(schema_1.leagues.id, dto.leagueId)).limit(1);
            if (!league?.length)
                throw new common_1.BadRequestException(`League ${dto.leagueId} not found`);
        }
        const values = {
            sportId: dto.sportId,
            leagueId: dto.leagueId || null,
            startYear: dto.startYear ?? null,
            endYear: dto.endYear ?? null,
            sortOrder: dto.sortOrder,
            criterion: dto.criterion,
            direction: dto.direction || 'DESC',
        };
        const res = await this.db.insert(schema_1.standingOrderRules).values(values).returning();
        return res[0];
    }
    async update(id, dto) {
        await this.findOne(id);
        if (dto.sportId) {
            const sport = await this.db.select().from(schema_1.sports).where((0, drizzle_orm_1.eq)(schema_1.sports.id, dto.sportId)).limit(1);
            if (!sport?.length)
                throw new common_1.BadRequestException(`Sport ${dto.sportId} not found`);
        }
        if (dto.leagueId) {
            const league = await this.db.select().from(schema_1.leagues).where((0, drizzle_orm_1.eq)(schema_1.leagues.id, dto.leagueId)).limit(1);
            if (!league?.length)
                throw new common_1.BadRequestException(`League ${dto.leagueId} not found`);
        }
        const values = {};
        if (dto.sportId !== undefined)
            values.sportId = dto.sportId;
        if (dto.leagueId !== undefined)
            values.leagueId = dto.leagueId || null;
        if (dto.startYear !== undefined)
            values.startYear = dto.startYear ?? null;
        if (dto.endYear !== undefined)
            values.endYear = dto.endYear ?? null;
        if (dto.sortOrder !== undefined)
            values.sortOrder = dto.sortOrder;
        if (dto.criterion !== undefined)
            values.criterion = dto.criterion;
        if (dto.direction !== undefined)
            values.direction = dto.direction;
        await this.db.update(schema_1.standingOrderRules).set(values).where((0, drizzle_orm_1.eq)(schema_1.standingOrderRules.id, id));
        return this.findOne(id);
    }
    async remove(id) {
        await this.findOne(id);
        await this.db.delete(schema_1.standingOrderRules).where((0, drizzle_orm_1.eq)(schema_1.standingOrderRules.id, id));
    }
    async resequence(sportId, leagueId, startYear) {
        const conds = [(0, drizzle_orm_1.eq)(schema_1.standingOrderRules.sportId, sportId)];
        if (leagueId) {
            conds.push((0, drizzle_orm_1.eq)(schema_1.standingOrderRules.leagueId, leagueId));
        }
        else {
            conds.push((0, drizzle_orm_1.isNull)(schema_1.standingOrderRules.leagueId));
        }
        if (startYear !== null && startYear !== undefined) {
            conds.push((0, drizzle_orm_1.eq)(schema_1.standingOrderRules.startYear, startYear));
        }
        else {
            conds.push((0, drizzle_orm_1.isNull)(schema_1.standingOrderRules.startYear));
        }
        let whereCond = conds[0];
        for (let i = 1; i < conds.length; i++)
            whereCond = (0, drizzle_orm_1.and)(whereCond, conds[i]);
        const rules = await this.db
            .select()
            .from(schema_1.standingOrderRules)
            .where(whereCond)
            .orderBy((0, drizzle_orm_1.asc)(schema_1.standingOrderRules.sortOrder));
        for (let i = 0; i < rules.length; i++) {
            const newOrder = (i + 1) * 100;
            if (rules[i].sortOrder !== newOrder) {
                await this.db
                    .update(schema_1.standingOrderRules)
                    .set({ sortOrder: newOrder })
                    .where((0, drizzle_orm_1.eq)(schema_1.standingOrderRules.id, rules[i].id));
            }
        }
        return { resequenced: rules.length };
    }
};
exports.StandingOrderRulesService = StandingOrderRulesService;
exports.StandingOrderRulesService = StandingOrderRulesService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)('DRIZZLE')),
    __metadata("design:paramtypes", [node_postgres_1.NodePgDatabase])
], StandingOrderRulesService);
//# sourceMappingURL=standing-order-rules.service.js.map