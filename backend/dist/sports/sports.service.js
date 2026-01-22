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
exports.SportsService = void 0;
const common_1 = require("@nestjs/common");
const node_postgres_1 = require("drizzle-orm/node-postgres");
const drizzle_orm_1 = require("drizzle-orm");
const schema = require("../db/schema");
const schema_1 = require("../db/schema");
let SportsService = class SportsService {
    constructor(db) {
        this.db = db;
    }
    async findAll(paginationDto) {
        const { page = 1, limit = 10 } = paginationDto;
        const offset = (page - 1) * limit;
        try {
            const data = await this.db
                .select()
                .from(schema_1.sports)
                .orderBy(schema_1.sports.name)
                .limit(limit)
                .offset(offset);
            const totalResult = await this.db
                .select({ count: (0, drizzle_orm_1.sql) `count(*)` })
                .from(schema_1.sports);
            const total = Number(totalResult[0].count);
            return { data, total };
        }
        catch (error) {
            throw new common_1.BadRequestException('Failed to fetch paginated sports');
        }
    }
    async findOne(id) {
        try {
            const sport = await this.db
                .select()
                .from(schema_1.sports)
                .where((0, drizzle_orm_1.eq)(schema_1.sports.id, id))
                .limit(1);
            if (!sport || sport.length === 0) {
                throw new common_1.NotFoundException(`Sport with ID ${id} not found`);
            }
            return sport[0];
        }
        catch (error) {
            if (error instanceof common_1.NotFoundException)
                throw error;
            throw new common_1.BadRequestException('Failed to fetch sport');
        }
    }
    async findByType(type) {
        try {
            return await this.db
                .select()
                .from(schema_1.sports)
                .where((0, drizzle_orm_1.eq)(schema_1.sports.type, type));
        }
        catch (error) {
            throw new common_1.BadRequestException('Failed to fetch sports by type');
        }
    }
    async create(createSportDto) {
        try {
            const existing = await this.db
                .select()
                .from(schema_1.sports)
                .where((0, drizzle_orm_1.eq)(schema_1.sports.name, createSportDto.name))
                .limit(1);
            if (existing && existing.length > 0) {
                throw new common_1.BadRequestException(`Sport "${createSportDto.name}" already exists`);
            }
            const result = await this.db
                .insert(schema_1.sports)
                .values(createSportDto)
                .returning();
            return result[0];
        }
        catch (error) {
            if (error instanceof common_1.BadRequestException)
                throw error;
            throw new common_1.BadRequestException('Failed to create sport');
        }
    }
    async update(id, updateSportDto) {
        try {
            await this.findOne(id);
            if (updateSportDto.name) {
                const existing = await this.db
                    .select()
                    .from(schema_1.sports)
                    .where((0, drizzle_orm_1.eq)(schema_1.sports.name, updateSportDto.name))
                    .limit(1);
                if (existing && existing.length > 0 && existing[0].id !== id) {
                    throw new common_1.BadRequestException(`Sport "${updateSportDto.name}" already exists`);
                }
            }
            const result = await this.db
                .update(schema_1.sports)
                .set(updateSportDto)
                .where((0, drizzle_orm_1.eq)(schema_1.sports.id, id))
                .returning();
            return result[0];
        }
        catch (error) {
            if (error instanceof common_1.BadRequestException || error instanceof common_1.NotFoundException)
                throw error;
            throw new common_1.BadRequestException('Failed to update sport');
        }
    }
    async remove(id) {
        try {
            await this.findOne(id);
            const leagues = await this.db
                .select()
                .from(schema.leagues)
                .where((0, drizzle_orm_1.eq)(schema.leagues.sportId, id))
                .limit(1);
            if (leagues && leagues.length > 0) {
                throw new common_1.BadRequestException('Cannot delete sport. Leagues are using this sport.');
            }
            const result = await this.db
                .delete(schema_1.sports)
                .where((0, drizzle_orm_1.eq)(schema_1.sports.id, id))
                .returning();
            return result[0];
        }
        catch (error) {
            if (error instanceof common_1.BadRequestException || error instanceof common_1.NotFoundException)
                throw error;
            throw new common_1.BadRequestException('Failed to delete sport');
        }
    }
};
exports.SportsService = SportsService;
exports.SportsService = SportsService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)('DRIZZLE')),
    __metadata("design:paramtypes", [node_postgres_1.NodePgDatabase])
], SportsService);
//# sourceMappingURL=sports.service.js.map