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
exports.SeasonClubsService = void 0;
const common_1 = require("@nestjs/common");
const node_postgres_1 = require("drizzle-orm/node-postgres");
const drizzle_orm_1 = require("drizzle-orm");
const schema = require("../db/schema");
let SeasonClubsService = class SeasonClubsService {
    constructor(db) {
        this.db = db;
    }
    async findAll() {
        return await this.db.select().from(schema.seasonClubs);
    }
    async findOne(id) {
        const result = await this.db
            .select()
            .from(schema.seasonClubs)
            .where((0, drizzle_orm_1.eq)(schema.seasonClubs.id, id));
        if (result.length === 0) {
            throw new common_1.NotFoundException(`SeasonClub with ID ${id} not found`);
        }
        return result[0];
    }
    async findBySeason(seasonId) {
        return await this.db
            .select()
            .from(schema.seasonClubs)
            .where((0, drizzle_orm_1.eq)(schema.seasonClubs.seasonId, seasonId));
    }
    async findByClub(clubId) {
        return await this.db
            .select()
            .from(schema.seasonClubs)
            .where((0, drizzle_orm_1.eq)(schema.seasonClubs.clubId, clubId));
    }
    async isClubActiveInSeason(clubId, seasonId) {
        const result = await this.db
            .select()
            .from(schema.seasonClubs)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema.seasonClubs.clubId, clubId), (0, drizzle_orm_1.eq)(schema.seasonClubs.seasonId, seasonId)));
        if (result.length === 0) {
            return false;
        }
        return result[0].leaveDate === null;
    }
    async create(dto) {
        const season = await this.db
            .select()
            .from(schema.seasons)
            .where((0, drizzle_orm_1.eq)(schema.seasons.id, dto.seasonId));
        if (season.length === 0) {
            throw new common_1.BadRequestException(`Season with ID ${dto.seasonId} not found`);
        }
        const club = await this.db
            .select()
            .from(schema.clubs)
            .where((0, drizzle_orm_1.eq)(schema.clubs.id, dto.clubId));
        if (club.length === 0) {
            throw new common_1.BadRequestException(`Club with ID ${dto.clubId} not found`);
        }
        const existing = await this.db
            .select()
            .from(schema.seasonClubs)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema.seasonClubs.seasonId, dto.seasonId), (0, drizzle_orm_1.eq)(schema.seasonClubs.clubId, dto.clubId)));
        if (existing.length > 0) {
            throw new common_1.BadRequestException(`Club ${dto.clubId} is already associated with season ${dto.seasonId}`);
        }
        const result = await this.db
            .insert(schema.seasonClubs)
            .values({
            seasonId: dto.seasonId,
            clubId: dto.clubId,
            joinDate: dto.joinDate,
        })
            .returning();
        return result[0];
    }
    async update(id, dto) {
        const existing = await this.findOne(id);
        const result = await this.db
            .update(schema.seasonClubs)
            .set({
            leaveDate: dto.leaveDate || existing.leaveDate,
            updatedAt: new Date(),
        })
            .where((0, drizzle_orm_1.eq)(schema.seasonClubs.id, id))
            .returning();
        return result[0];
    }
    async remove(id) {
        const existing = await this.findOne(id);
        await this.db.delete(schema.seasonClubs).where((0, drizzle_orm_1.eq)(schema.seasonClubs.id, id));
    }
};
exports.SeasonClubsService = SeasonClubsService;
exports.SeasonClubsService = SeasonClubsService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)('DRIZZLE')),
    __metadata("design:paramtypes", [node_postgres_1.NodePgDatabase])
], SeasonClubsService);
//# sourceMappingURL=season-clubs.service.js.map