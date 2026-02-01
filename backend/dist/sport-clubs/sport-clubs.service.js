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
exports.SportClubsService = void 0;
const common_1 = require("@nestjs/common");
const node_postgres_1 = require("drizzle-orm/node-postgres");
const drizzle_orm_1 = require("drizzle-orm");
const schema = require("../db/schema");
let SportClubsService = class SportClubsService {
    constructor(db) {
        this.db = db;
    }
    async findAll() {
        return await this.db
            .select({
            id: schema.sportClubs.id,
            sportId: schema.sportClubs.sportId,
            clubId: schema.sportClubs.clubId,
            flgActive: schema.sportClubs.flgActive,
            createdAt: schema.sportClubs.createdAt,
            sport: {
                id: schema.sports.id,
                name: schema.sports.name,
            },
            club: {
                id: schema.clubs.id,
                name: schema.clubs.name,
            },
        })
            .from(schema.sportClubs)
            .leftJoin(schema.sports, (0, drizzle_orm_1.eq)(schema.sportClubs.sportId, schema.sports.id))
            .leftJoin(schema.clubs, (0, drizzle_orm_1.eq)(schema.sportClubs.clubId, schema.clubs.id));
    }
    async findOne(id) {
        const result = await this.db
            .select()
            .from(schema.sportClubs)
            .where((0, drizzle_orm_1.eq)(schema.sportClubs.id, id));
        if (result.length === 0) {
            throw new common_1.NotFoundException(`SportClub with ID ${id} not found`);
        }
        return result[0];
    }
    async findBySport(sportId) {
        return await this.db
            .select()
            .from(schema.sportClubs)
            .where((0, drizzle_orm_1.eq)(schema.sportClubs.sportId, sportId));
    }
    async findByClub(clubId) {
        return await this.db
            .select()
            .from(schema.sportClubs)
            .where((0, drizzle_orm_1.eq)(schema.sportClubs.clubId, clubId));
    }
    async create(dto) {
        const sport = await this.db
            .select()
            .from(schema.sports)
            .where((0, drizzle_orm_1.eq)(schema.sports.id, dto.sportId));
        if (sport.length === 0) {
            throw new common_1.BadRequestException(`Sport with ID ${dto.sportId} not found`);
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
            .from(schema.sportClubs)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema.sportClubs.sportId, dto.sportId), (0, drizzle_orm_1.eq)(schema.sportClubs.clubId, dto.clubId)));
        if (existing.length > 0) {
            throw new common_1.BadRequestException(`Club ${dto.clubId} is already associated with sport ${dto.sportId}`);
        }
        const result = await this.db
            .insert(schema.sportClubs)
            .values({
            sportId: dto.sportId,
            clubId: dto.clubId,
            flgActive: dto.flgActive !== undefined ? dto.flgActive : true,
        })
            .returning();
        return result[0];
    }
    async update(id, dto) {
        const existing = await this.findOne(id);
        const result = await this.db
            .update(schema.sportClubs)
            .set({
            flgActive: dto.flgActive !== undefined ? dto.flgActive : existing.flgActive,
        })
            .where((0, drizzle_orm_1.eq)(schema.sportClubs.id, id))
            .returning();
        return result[0];
    }
    async remove(id) {
        const existing = await this.findOne(id);
        await this.db.delete(schema.sportClubs).where((0, drizzle_orm_1.eq)(schema.sportClubs.id, id));
    }
    async bulkUpdateForSport(sportId, clubIds) {
        const sport = await this.db
            .select()
            .from(schema.sports)
            .where((0, drizzle_orm_1.eq)(schema.sports.id, sportId));
        if (sport.length === 0) {
            throw new common_1.BadRequestException(`Sport with ID ${sportId} not found`);
        }
        const existing = await this.db
            .select()
            .from(schema.sportClubs)
            .where((0, drizzle_orm_1.eq)(schema.sportClubs.sportId, sportId));
        const existingClubIds = existing.map(sc => sc.clubId);
        const clubsToAdd = clubIds.filter(id => !existingClubIds.includes(id));
        const clubsToRemove = existingClubIds.filter(id => !clubIds.includes(id));
        for (const clubId of clubsToAdd) {
            await this.db.insert(schema.sportClubs).values({
                sportId,
                clubId,
                flgActive: true,
            });
        }
        for (const clubId of clubsToRemove) {
            await this.db
                .delete(schema.sportClubs)
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema.sportClubs.sportId, sportId), (0, drizzle_orm_1.eq)(schema.sportClubs.clubId, clubId)));
        }
    }
};
exports.SportClubsService = SportClubsService;
exports.SportClubsService = SportClubsService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)('DRIZZLE')),
    __metadata("design:paramtypes", [node_postgres_1.NodePgDatabase])
], SportClubsService);
//# sourceMappingURL=sport-clubs.service.js.map