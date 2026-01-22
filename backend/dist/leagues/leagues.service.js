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
exports.LeaguesService = void 0;
const common_1 = require("@nestjs/common");
const node_postgres_1 = require("drizzle-orm/node-postgres");
const drizzle_orm_1 = require("drizzle-orm");
const schema = require("../db/schema");
const schema_1 = require("../db/schema");
let LeaguesService = class LeaguesService {
    constructor(db) {
        this.db = db;
    }
    async findAll(paginationDto) {
        const { page = 1, limit = 10 } = paginationDto;
        const offset = (page - 1) * limit;
        try {
            const data = await this.db
                .select()
                .from(schema_1.leagues)
                .orderBy(schema_1.leagues.originalName)
                .limit(limit)
                .offset(offset);
            const totalResult = await this.db
                .select({ count: (0, drizzle_orm_1.sql) `count(*)` })
                .from(schema_1.leagues);
            const total = Number(totalResult[0].count);
            return { data, total };
        }
        catch (error) {
            throw new common_1.BadRequestException('Failed to fetch paginated leagues');
        }
    }
    async findOne(id) {
        try {
            const league = await this.db
                .select()
                .from(schema_1.leagues)
                .where((0, drizzle_orm_1.eq)(schema_1.leagues.id, id))
                .limit(1);
            if (!league || league.length === 0) {
                throw new common_1.NotFoundException(`League with ID ${id} not found`);
            }
            return league[0];
        }
        catch (error) {
            if (error instanceof common_1.NotFoundException)
                throw error;
            throw new common_1.BadRequestException('Failed to fetch league');
        }
    }
    async findBySport(sportId, paginationDto) {
        const { page = 1, limit = 10 } = paginationDto;
        const offset = (page - 1) * limit;
        try {
            const sport = await this.db
                .select()
                .from(schema_1.sports)
                .where((0, drizzle_orm_1.eq)(schema_1.sports.id, sportId))
                .limit(1);
            if (!sport || sport.length === 0) {
                throw new common_1.NotFoundException(`Sport with ID ${sportId} not found`);
            }
            const data = await this.db
                .select()
                .from(schema_1.leagues)
                .where((0, drizzle_orm_1.eq)(schema_1.leagues.sportId, sportId))
                .orderBy(schema_1.leagues.originalName)
                .limit(limit)
                .offset(offset);
            const totalResult = await this.db
                .select({ count: (0, drizzle_orm_1.sql) `count(*)` })
                .from(schema_1.leagues)
                .where((0, drizzle_orm_1.eq)(schema_1.leagues.sportId, sportId));
            const total = Number(totalResult[0].count);
            return { data, total };
        }
        catch (error) {
            if (error instanceof common_1.NotFoundException)
                throw error;
            throw new common_1.BadRequestException('Failed to fetch paginated leagues by sport');
        }
    }
    async create(createLeagueDto) {
        try {
            const sport = await this.db
                .select()
                .from(schema_1.sports)
                .where((0, drizzle_orm_1.eq)(schema_1.sports.id, createLeagueDto.sportId))
                .limit(1);
            if (!sport || sport.length === 0) {
                throw new common_1.BadRequestException(`Sport with ID ${createLeagueDto.sportId} not found`);
            }
            const result = await this.db
                .insert(schema_1.leagues)
                .values(createLeagueDto)
                .returning();
            return result[0];
        }
        catch (error) {
            if (error instanceof common_1.BadRequestException)
                throw error;
            throw new common_1.BadRequestException('Failed to create league');
        }
    }
    async update(id, updateLeagueDto) {
        try {
            await this.findOne(id);
            if (updateLeagueDto.sportId) {
                const sport = await this.db
                    .select()
                    .from(schema_1.sports)
                    .where((0, drizzle_orm_1.eq)(schema_1.sports.id, updateLeagueDto.sportId))
                    .limit(1);
                if (!sport || sport.length === 0) {
                    throw new common_1.BadRequestException(`Sport with ID ${updateLeagueDto.sportId} not found`);
                }
            }
            const result = await this.db
                .update(schema_1.leagues)
                .set(updateLeagueDto)
                .where((0, drizzle_orm_1.eq)(schema_1.leagues.id, id))
                .returning();
            return result[0];
        }
        catch (error) {
            if (error instanceof common_1.BadRequestException || error instanceof common_1.NotFoundException)
                throw error;
            throw new common_1.BadRequestException('Failed to update league');
        }
    }
    async remove(id) {
        try {
            await this.findOne(id);
            const seasons = await this.db
                .select()
                .from(schema.seasons)
                .where((0, drizzle_orm_1.eq)(schema.seasons.leagueId, id))
                .limit(1);
            if (seasons && seasons.length > 0) {
                throw new common_1.BadRequestException('Cannot delete league. League has associated seasons.');
            }
            const result = await this.db
                .delete(schema_1.leagues)
                .where((0, drizzle_orm_1.eq)(schema_1.leagues.id, id))
                .returning();
            return result[0];
        }
        catch (error) {
            if (error instanceof common_1.BadRequestException || error instanceof common_1.NotFoundException)
                throw error;
            throw new common_1.BadRequestException('Failed to delete league');
        }
    }
    async addLink(leagueId, label, url) {
        try {
            await this.findOne(leagueId);
            const result = await this.db
                .insert(schema.leagueLinks)
                .values({
                leagueId: leagueId,
                label: label,
                url: url,
            })
                .returning();
            return result[0];
        }
        catch (error) {
            if (error instanceof common_1.BadRequestException || error instanceof common_1.NotFoundException)
                throw error;
            throw new common_1.BadRequestException('Failed to add league link');
        }
    }
    async removeLink(leagueId, linkId) {
        try {
            const result = await this.db
                .delete(schema.leagueLinks)
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema.leagueLinks.leagueId, leagueId), (0, drizzle_orm_1.eq)(schema.leagueLinks.id, linkId)))
                .returning();
            if (!result || result.length === 0) {
                throw new common_1.NotFoundException('Link not found');
            }
            return result[0];
        }
        catch (error) {
            if (error instanceof common_1.NotFoundException)
                throw error;
            throw new common_1.BadRequestException('Failed to remove league link');
        }
    }
};
exports.LeaguesService = LeaguesService;
exports.LeaguesService = LeaguesService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)('DRIZZLE')),
    __metadata("design:paramtypes", [node_postgres_1.NodePgDatabase])
], LeaguesService);
//# sourceMappingURL=leagues.service.js.map