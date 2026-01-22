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
exports.GroupsService = void 0;
const common_1 = require("@nestjs/common");
const node_postgres_1 = require("drizzle-orm/node-postgres");
const drizzle_orm_1 = require("drizzle-orm");
const schema = require("../db/schema");
const schema_1 = require("../db/schema");
let GroupsService = class GroupsService {
    constructor(db) {
        this.db = db;
    }
    async findAll() {
        try {
            return await this.db.select().from(schema_1.groups);
        }
        catch (error) {
            throw new common_1.BadRequestException('Failed to fetch groups');
        }
    }
    async findOne(id) {
        try {
            const group = await this.db
                .select()
                .from(schema_1.groups)
                .where((0, drizzle_orm_1.eq)(schema_1.groups.id, id))
                .limit(1);
            if (!group || group.length === 0) {
                throw new common_1.NotFoundException(`Group with ID ${id} not found`);
            }
            return group[0];
        }
        catch (error) {
            if (error instanceof common_1.NotFoundException)
                throw error;
            throw new common_1.BadRequestException('Failed to fetch group');
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
                .from(schema_1.groups)
                .where((0, drizzle_orm_1.eq)(schema_1.groups.phaseId, phaseId));
        }
        catch (error) {
            if (error instanceof common_1.NotFoundException)
                throw error;
            throw new common_1.BadRequestException('Failed to fetch groups by phase');
        }
    }
    async create(createGroupDto) {
        try {
            const phase = await this.db
                .select()
                .from(schema_1.phases)
                .where((0, drizzle_orm_1.eq)(schema_1.phases.id, createGroupDto.phaseId))
                .limit(1);
            if (!phase || phase.length === 0) {
                throw new common_1.BadRequestException(`Phase with ID ${createGroupDto.phaseId} not found`);
            }
            const result = await this.db
                .insert(schema_1.groups)
                .values(createGroupDto)
                .returning();
            return result[0];
        }
        catch (error) {
            if (error instanceof common_1.BadRequestException)
                throw error;
            throw new common_1.BadRequestException('Failed to create group');
        }
    }
    async update(id, updateGroupDto) {
        try {
            await this.findOne(id);
            if (updateGroupDto.phaseId) {
                const phase = await this.db
                    .select()
                    .from(schema_1.phases)
                    .where((0, drizzle_orm_1.eq)(schema_1.phases.id, updateGroupDto.phaseId))
                    .limit(1);
                if (!phase || phase.length === 0) {
                    throw new common_1.BadRequestException(`Phase with ID ${updateGroupDto.phaseId} not found`);
                }
            }
            const result = await this.db
                .update(schema_1.groups)
                .set(updateGroupDto)
                .where((0, drizzle_orm_1.eq)(schema_1.groups.id, id))
                .returning();
            return result[0];
        }
        catch (error) {
            if (error instanceof common_1.BadRequestException || error instanceof common_1.NotFoundException)
                throw error;
            throw new common_1.BadRequestException('Failed to update group');
        }
    }
    async remove(id) {
        try {
            await this.findOne(id);
            const matches = await this.db
                .select()
                .from(schema.matches)
                .where((0, drizzle_orm_1.eq)(schema.matches.groupId, id))
                .limit(1);
            if (matches && matches.length > 0) {
                throw new common_1.BadRequestException('Cannot delete group. Matches are associated with this group.');
            }
            const groupClubs = await this.db
                .select()
                .from(schema.groupClubs)
                .where((0, drizzle_orm_1.eq)(schema.groupClubs.groupId, id))
                .limit(1);
            if (groupClubs && groupClubs.length > 0) {
                throw new common_1.BadRequestException('Cannot delete group. Clubs are assigned to this group.');
            }
            const result = await this.db
                .delete(schema_1.groups)
                .where((0, drizzle_orm_1.eq)(schema_1.groups.id, id))
                .returning();
            return result[0];
        }
        catch (error) {
            if (error instanceof common_1.BadRequestException || error instanceof common_1.NotFoundException)
                throw error;
            throw new common_1.BadRequestException('Failed to delete group');
        }
    }
};
exports.GroupsService = GroupsService;
exports.GroupsService = GroupsService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)('DRIZZLE')),
    __metadata("design:paramtypes", [node_postgres_1.NodePgDatabase])
], GroupsService);
//# sourceMappingURL=groups.service.js.map