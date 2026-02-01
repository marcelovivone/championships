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
            return await this.db
                .select({
                id: schema_1.groups.id,
                name: schema_1.groups.name,
                seasonId: schema_1.groups.seasonId,
                sportId: schema_1.groups.sportId,
                leagueId: schema_1.groups.leagueId,
                createdAt: schema_1.groups.createdAt,
                season: schema_1.seasons,
                sport: schema_1.sports,
                league: schema_1.leagues,
            })
                .from(schema_1.groups)
                .leftJoin(schema_1.seasons, (0, drizzle_orm_1.eq)(schema_1.groups.seasonId, schema_1.seasons.id))
                .leftJoin(schema_1.sports, (0, drizzle_orm_1.eq)(schema_1.groups.sportId, schema_1.sports.id))
                .leftJoin(schema_1.leagues, (0, drizzle_orm_1.eq)(schema_1.groups.leagueId, schema_1.leagues.id));
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
                .from(schema_1.groups)
                .where((0, drizzle_orm_1.eq)(schema_1.groups.seasonId, seasonId));
        }
        catch (error) {
            if (error instanceof common_1.NotFoundException)
                throw error;
            throw new common_1.BadRequestException('Failed to fetch groups by season');
        }
    }
    async create(createGroupDto) {
        try {
            const sport = await this.db
                .select()
                .from(schema_1.sports)
                .where((0, drizzle_orm_1.eq)(schema_1.sports.id, createGroupDto.sportId))
                .limit(1);
            if (!sport || sport.length === 0) {
                throw new common_1.BadRequestException(`Sport with ID ${createGroupDto.sportId} not found`);
            }
            const league = await this.db
                .select()
                .from(schema_1.leagues)
                .where((0, drizzle_orm_1.eq)(schema_1.leagues.id, createGroupDto.leagueId))
                .limit(1);
            if (!league || league.length === 0) {
                throw new common_1.BadRequestException(`League with ID ${createGroupDto.leagueId} not found`);
            }
            const season = await this.db
                .select()
                .from(schema_1.seasons)
                .where((0, drizzle_orm_1.eq)(schema_1.seasons.id, createGroupDto.seasonId))
                .limit(1);
            if (!season || season.length === 0) {
                throw new common_1.BadRequestException(`Season with ID ${createGroupDto.seasonId} not found`);
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
            if (updateGroupDto.sportId) {
                const sport = await this.db
                    .select()
                    .from(schema_1.sports)
                    .where((0, drizzle_orm_1.eq)(schema_1.sports.id, updateGroupDto.sportId))
                    .limit(1);
                if (!sport || sport.length === 0) {
                    throw new common_1.BadRequestException(`Sport with ID ${updateGroupDto.sportId} not found`);
                }
            }
            if (updateGroupDto.leagueId) {
                const league = await this.db
                    .select()
                    .from(schema_1.leagues)
                    .where((0, drizzle_orm_1.eq)(schema_1.leagues.id, updateGroupDto.leagueId))
                    .limit(1);
                if (!league || league.length === 0) {
                    throw new common_1.BadRequestException(`League with ID ${updateGroupDto.leagueId} not found`);
                }
            }
            if (updateGroupDto.seasonId) {
                const season = await this.db
                    .select()
                    .from(schema_1.seasons)
                    .where((0, drizzle_orm_1.eq)(schema_1.seasons.id, updateGroupDto.seasonId))
                    .limit(1);
                if (!season || season.length === 0) {
                    throw new common_1.BadRequestException(`Season with ID ${updateGroupDto.seasonId} not found`);
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