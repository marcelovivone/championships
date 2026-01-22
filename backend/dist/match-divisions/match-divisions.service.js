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
exports.MatchDivisionsService = void 0;
const common_1 = require("@nestjs/common");
const node_postgres_1 = require("drizzle-orm/node-postgres");
const drizzle_orm_1 = require("drizzle-orm");
const schema_1 = require("../db/schema");
let MatchDivisionsService = class MatchDivisionsService {
    constructor(db) {
        this.db = db;
    }
    async findAll() {
        try {
            return await this.db.select().from(schema_1.matchDivisions);
        }
        catch (error) {
            throw new common_1.BadRequestException('Failed to fetch match divisions');
        }
    }
    async findOne(id) {
        try {
            const division = await this.db
                .select()
                .from(schema_1.matchDivisions)
                .where((0, drizzle_orm_1.eq)(schema_1.matchDivisions.id, id))
                .limit(1);
            if (!division || division.length === 0) {
                throw new common_1.NotFoundException(`Match division with ID ${id} not found`);
            }
            return division[0];
        }
        catch (error) {
            if (error instanceof common_1.NotFoundException)
                throw error;
            throw new common_1.BadRequestException('Failed to fetch match division');
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
            return await this.db
                .select()
                .from(schema_1.matchDivisions)
                .where((0, drizzle_orm_1.eq)(schema_1.matchDivisions.matchId, matchId));
        }
        catch (error) {
            if (error instanceof common_1.NotFoundException)
                throw error;
            throw new common_1.BadRequestException('Failed to fetch divisions by match');
        }
    }
    async create(createDivisionDto) {
        try {
            const match = await this.db
                .select()
                .from(schema_1.matches)
                .where((0, drizzle_orm_1.eq)(schema_1.matches.id, createDivisionDto.matchId))
                .limit(1);
            if (!match || match.length === 0) {
                throw new common_1.BadRequestException(`Match with ID ${createDivisionDto.matchId} not found`);
            }
            const result = await this.db
                .insert(schema_1.matchDivisions)
                .values(createDivisionDto)
                .returning();
            return result[0];
        }
        catch (error) {
            if (error instanceof common_1.BadRequestException)
                throw error;
            throw new common_1.BadRequestException('Failed to create match division');
        }
    }
    async update(id, updateDivisionDto) {
        try {
            await this.findOne(id);
            if (updateDivisionDto.matchId) {
                const match = await this.db
                    .select()
                    .from(schema_1.matches)
                    .where((0, drizzle_orm_1.eq)(schema_1.matches.id, updateDivisionDto.matchId))
                    .limit(1);
                if (!match || match.length === 0) {
                    throw new common_1.BadRequestException(`Match with ID ${updateDivisionDto.matchId} not found`);
                }
            }
            const result = await this.db
                .update(schema_1.matchDivisions)
                .set(updateDivisionDto)
                .where((0, drizzle_orm_1.eq)(schema_1.matchDivisions.id, id))
                .returning();
            return result[0];
        }
        catch (error) {
            if (error instanceof common_1.BadRequestException || error instanceof common_1.NotFoundException)
                throw error;
            throw new common_1.BadRequestException('Failed to update match division');
        }
    }
    async remove(id) {
        try {
            await this.findOne(id);
            const result = await this.db
                .delete(schema_1.matchDivisions)
                .where((0, drizzle_orm_1.eq)(schema_1.matchDivisions.id, id))
                .returning();
            return result[0];
        }
        catch (error) {
            if (error instanceof common_1.BadRequestException || error instanceof common_1.NotFoundException)
                throw error;
            throw new common_1.BadRequestException('Failed to delete match division');
        }
    }
};
exports.MatchDivisionsService = MatchDivisionsService;
exports.MatchDivisionsService = MatchDivisionsService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)('DRIZZLE')),
    __metadata("design:paramtypes", [node_postgres_1.NodePgDatabase])
], MatchDivisionsService);
//# sourceMappingURL=match-divisions.service.js.map