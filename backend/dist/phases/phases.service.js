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
exports.PhasesService = void 0;
const common_1 = require("@nestjs/common");
const node_postgres_1 = require("drizzle-orm/node-postgres");
const drizzle_orm_1 = require("drizzle-orm");
const schema = require("../db/schema");
const schema_1 = require("../db/schema");
let PhasesService = class PhasesService {
    constructor(db) {
        this.db = db;
    }
    async findAll() {
        try {
            return await this.db.select().from(schema_1.phases);
        }
        catch (error) {
            throw new common_1.BadRequestException('Failed to fetch phases');
        }
    }
    async findOne(id) {
        try {
            const phase = await this.db
                .select()
                .from(schema_1.phases)
                .where((0, drizzle_orm_1.eq)(schema_1.phases.id, id))
                .limit(1);
            if (!phase || phase.length === 0) {
                throw new common_1.NotFoundException(`Phase with ID ${id} not found`);
            }
            return phase[0];
        }
        catch (error) {
            if (error instanceof common_1.NotFoundException)
                throw error;
            throw new common_1.BadRequestException('Failed to fetch phase');
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
                .from(schema_1.phases)
                .where((0, drizzle_orm_1.eq)(schema_1.phases.seasonId, seasonId));
        }
        catch (error) {
            if (error instanceof common_1.NotFoundException)
                throw error;
            throw new common_1.BadRequestException('Failed to fetch phases by season');
        }
    }
    async create(createPhaseDto) {
        try {
            const season = await this.db
                .select()
                .from(schema_1.seasons)
                .where((0, drizzle_orm_1.eq)(schema_1.seasons.id, createPhaseDto.seasonId))
                .limit(1);
            if (!season || season.length === 0) {
                throw new common_1.BadRequestException(`Season with ID ${createPhaseDto.seasonId} not found`);
            }
            const result = await this.db
                .insert(schema_1.phases)
                .values(createPhaseDto)
                .returning();
            return result[0];
        }
        catch (error) {
            if (error instanceof common_1.BadRequestException)
                throw error;
            throw new common_1.BadRequestException('Failed to create phase');
        }
    }
    async update(id, updatePhaseDto) {
        try {
            await this.findOne(id);
            if (updatePhaseDto.seasonId) {
                const season = await this.db
                    .select()
                    .from(schema_1.seasons)
                    .where((0, drizzle_orm_1.eq)(schema_1.seasons.id, updatePhaseDto.seasonId))
                    .limit(1);
                if (!season || season.length === 0) {
                    throw new common_1.BadRequestException(`Season with ID ${updatePhaseDto.seasonId} not found`);
                }
            }
            const result = await this.db
                .update(schema_1.phases)
                .set(updatePhaseDto)
                .where((0, drizzle_orm_1.eq)(schema_1.phases.id, id))
                .returning();
            return result[0];
        }
        catch (error) {
            if (error instanceof common_1.BadRequestException || error instanceof common_1.NotFoundException)
                throw error;
            throw new common_1.BadRequestException('Failed to update phase');
        }
    }
    async remove(id) {
        try {
            await this.findOne(id);
            const groups = await this.db
                .select()
                .from(schema.groups)
                .where((0, drizzle_orm_1.eq)(schema.groups.phaseId, id))
                .limit(1);
            if (groups && groups.length > 0) {
                throw new common_1.BadRequestException('Cannot delete phase. Groups are associated with this phase.');
            }
            const result = await this.db
                .delete(schema_1.phases)
                .where((0, drizzle_orm_1.eq)(schema_1.phases.id, id))
                .returning();
            return result[0];
        }
        catch (error) {
            if (error instanceof common_1.BadRequestException || error instanceof common_1.NotFoundException)
                throw error;
            throw new common_1.BadRequestException('Failed to delete phase');
        }
    }
};
exports.PhasesService = PhasesService;
exports.PhasesService = PhasesService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)('DRIZZLE')),
    __metadata("design:paramtypes", [node_postgres_1.NodePgDatabase])
], PhasesService);
//# sourceMappingURL=phases.service.js.map