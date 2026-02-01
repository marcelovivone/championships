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
exports.ClubStadiumsService = void 0;
const common_1 = require("@nestjs/common");
const drizzle_orm_1 = require("drizzle-orm");
const schema = require("../db/schema");
const node_postgres_1 = require("drizzle-orm/node-postgres");
let ClubStadiumsService = class ClubStadiumsService {
    constructor(db) {
        this.db = db;
    }
    async create(createClubStadiumDto) {
        const [clubStadium] = await this.db
            .insert(schema.clubStadiums)
            .values({
            clubId: createClubStadiumDto.clubId,
            stadiumId: createClubStadiumDto.stadiumId,
            startDate: new Date(createClubStadiumDto.startDate),
            endDate: createClubStadiumDto.endDate ? new Date(createClubStadiumDto.endDate) : null,
        })
            .returning();
        return clubStadium;
    }
    async findAll() {
        return this.db
            .select({
            id: schema.clubStadiums.id,
            clubId: schema.clubStadiums.clubId,
            stadiumId: schema.clubStadiums.stadiumId,
            startDate: schema.clubStadiums.startDate,
            endDate: schema.clubStadiums.endDate,
            club: {
                id: schema.clubs.id,
                name: schema.clubs.name,
            },
            stadium: {
                id: schema.stadiums.id,
                name: schema.stadiums.name,
            },
        })
            .from(schema.clubStadiums)
            .leftJoin(schema.clubs, (0, drizzle_orm_1.eq)(schema.clubStadiums.clubId, schema.clubs.id))
            .leftJoin(schema.stadiums, (0, drizzle_orm_1.eq)(schema.clubStadiums.stadiumId, schema.stadiums.id));
    }
    async findByClub(clubId) {
        return this.db
            .select()
            .from(schema.clubStadiums)
            .where((0, drizzle_orm_1.eq)(schema.clubStadiums.clubId, clubId));
    }
    async findActiveByClub(clubId) {
        const [active] = await this.db
            .select()
            .from(schema.clubStadiums)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema.clubStadiums.clubId, clubId), (0, drizzle_orm_1.isNull)(schema.clubStadiums.endDate)))
            .limit(1);
        return active || null;
    }
    async findOne(id) {
        const [clubStadium] = await this.db
            .select()
            .from(schema.clubStadiums)
            .where((0, drizzle_orm_1.eq)(schema.clubStadiums.id, id))
            .limit(1);
        if (!clubStadium) {
            throw new common_1.NotFoundException(`Club stadium with ID ${id} not found`);
        }
        return clubStadium;
    }
    async update(id, updateClubStadiumDto) {
        const existing = await this.findOne(id);
        const updateData = {};
        if (updateClubStadiumDto.clubId !== undefined)
            updateData.clubId = updateClubStadiumDto.clubId;
        if (updateClubStadiumDto.stadiumId !== undefined)
            updateData.stadiumId = updateClubStadiumDto.stadiumId;
        if (updateClubStadiumDto.startDate !== undefined)
            updateData.startDate = new Date(updateClubStadiumDto.startDate);
        if (updateClubStadiumDto.endDate !== undefined) {
            updateData.endDate = updateClubStadiumDto.endDate ? new Date(updateClubStadiumDto.endDate) : null;
        }
        const [updated] = await this.db
            .update(schema.clubStadiums)
            .set(updateData)
            .where((0, drizzle_orm_1.eq)(schema.clubStadiums.id, id))
            .returning();
        return updated;
    }
    async remove(id) {
        await this.findOne(id);
        await this.db.delete(schema.clubStadiums).where((0, drizzle_orm_1.eq)(schema.clubStadiums.id, id));
        return { message: 'Club stadium deleted successfully' };
    }
};
exports.ClubStadiumsService = ClubStadiumsService;
exports.ClubStadiumsService = ClubStadiumsService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)('DRIZZLE')),
    __metadata("design:paramtypes", [node_postgres_1.NodePgDatabase])
], ClubStadiumsService);
//# sourceMappingURL=club-stadiums.service.js.map