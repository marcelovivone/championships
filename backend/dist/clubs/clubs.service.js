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
exports.ClubsService = void 0;
const common_1 = require("@nestjs/common");
const node_postgres_1 = require("drizzle-orm/node-postgres");
const drizzle_orm_1 = require("drizzle-orm");
const schema_1 = require("../db/schema");
let ClubsService = class ClubsService {
    constructor(db) {
        this.db = db;
    }
    async findAll(paginationDto) {
        const { page = 1, limit = 10 } = paginationDto;
        const offset = (page - 1) * limit;
        try {
            const data = await this.db
                .select({
                id: schema_1.clubs.id,
                name: schema_1.clubs.name,
                shortName: schema_1.clubs.shortName,
                foundationYear: schema_1.clubs.foundationYear,
                imageUrl: schema_1.clubs.imageUrl,
                countryId: schema_1.clubs.countryId,
                country: {
                    id: schema_1.countries.id,
                    name: schema_1.countries.name,
                },
            })
                .from(schema_1.clubs)
                .leftJoin(schema_1.countries, (0, drizzle_orm_1.eq)(schema_1.clubs.countryId, schema_1.countries.id))
                .orderBy(schema_1.clubs.name)
                .limit(limit)
                .offset(offset);
            const totalResult = await this.db
                .select({ count: (0, drizzle_orm_1.sql) `count(*)` })
                .from(schema_1.clubs);
            const total = Number(totalResult[0].count);
            return { data, total };
        }
        catch (error) {
            throw new common_1.BadRequestException('Failed to fetch paginated clubs');
        }
    }
    async findOne(id) {
        try {
            const club = await this.db
                .select({
                id: schema_1.clubs.id,
                name: schema_1.clubs.name,
                shortName: schema_1.clubs.shortName,
                foundationYear: schema_1.clubs.foundationYear,
                imageUrl: schema_1.clubs.imageUrl,
                countryId: schema_1.clubs.countryId,
                country: {
                    id: schema_1.countries.id,
                    name: schema_1.countries.name,
                },
            })
                .from(schema_1.clubs)
                .leftJoin(schema_1.countries, (0, drizzle_orm_1.eq)(schema_1.clubs.countryId, schema_1.countries.id))
                .where((0, drizzle_orm_1.eq)(schema_1.clubs.id, id))
                .limit(1);
            if (!club || club.length === 0) {
                throw new common_1.NotFoundException(`Club with ID ${id} not found`);
            }
            return club[0];
        }
        catch (error) {
            if (error instanceof common_1.NotFoundException)
                throw error;
            throw new common_1.BadRequestException('Failed to fetch club');
        }
    }
    async findByCountry(countryId, paginationDto) {
        const { page = 1, limit = 10 } = paginationDto;
        const offset = (page - 1) * limit;
        try {
            const country = await this.db
                .select()
                .from(schema_1.countries)
                .where((0, drizzle_orm_1.eq)(schema_1.countries.id, countryId))
                .limit(1);
            if (!country || country.length === 0) {
                throw new common_1.NotFoundException(`Country with ID ${countryId} not found`);
            }
            const data = await this.db
                .select({
                id: schema_1.clubs.id,
                name: schema_1.clubs.name,
                shortName: schema_1.clubs.shortName,
                foundationYear: schema_1.clubs.foundationYear,
                imageUrl: schema_1.clubs.imageUrl,
                countryId: schema_1.clubs.countryId,
                country: {
                    id: schema_1.countries.id,
                    name: schema_1.countries.name,
                },
            })
                .from(schema_1.clubs)
                .leftJoin(schema_1.countries, (0, drizzle_orm_1.eq)(schema_1.clubs.countryId, schema_1.countries.id))
                .where((0, drizzle_orm_1.eq)(schema_1.clubs.countryId, countryId))
                .orderBy(schema_1.clubs.name)
                .limit(limit)
                .offset(offset);
            const totalResult = await this.db
                .select({ count: (0, drizzle_orm_1.sql) `count(*)` })
                .from(schema_1.clubs)
                .where((0, drizzle_orm_1.eq)(schema_1.clubs.countryId, countryId));
            const total = Number(totalResult[0].count);
            return { data, total };
        }
        catch (error) {
            if (error instanceof common_1.NotFoundException)
                throw error;
            throw new common_1.BadRequestException('Failed to fetch paginated clubs by country');
        }
    }
    async create(createClubDto) {
        try {
            const country = await this.db
                .select()
                .from(schema_1.countries)
                .where((0, drizzle_orm_1.eq)(schema_1.countries.id, createClubDto.countryId))
                .limit(1);
            if (!country || country.length === 0) {
                throw new common_1.BadRequestException(`Country with ID ${createClubDto.countryId} not found`);
            }
            const existing = await this.db
                .select()
                .from(schema_1.clubs)
                .where((0, drizzle_orm_1.eq)(schema_1.clubs.name, createClubDto.name))
                .limit(1);
            if (existing && existing.length > 0) {
                throw new common_1.BadRequestException(`Club "${createClubDto.name}" already exists`);
            }
            const result = await this.db
                .insert(schema_1.clubs)
                .values(createClubDto)
                .returning();
            return this.findOne(result[0].id);
        }
        catch (error) {
            if (error instanceof common_1.BadRequestException ||
                error instanceof common_1.NotFoundException)
                throw error;
            throw new common_1.BadRequestException('Failed to create club');
        }
    }
    async update(id, updateClubDto) {
        try {
            await this.findOne(id);
            if (updateClubDto.countryId) {
                const country = await this.db
                    .select()
                    .from(schema_1.countries)
                    .where((0, drizzle_orm_1.eq)(schema_1.countries.id, updateClubDto.countryId))
                    .limit(1);
                if (!country || country.length === 0) {
                    throw new common_1.BadRequestException(`Country with ID ${updateClubDto.countryId} not found`);
                }
            }
            await this.db.update(schema_1.clubs).set(updateClubDto).where((0, drizzle_orm_1.eq)(schema_1.clubs.id, id));
            return this.findOne(id);
        }
        catch (error) {
            if (error instanceof common_1.BadRequestException ||
                error instanceof common_1.NotFoundException)
                throw error;
            throw new common_1.BadRequestException('Failed to update club');
        }
    }
    async remove(id) {
        try {
            await this.findOne(id);
            await this.db.delete(schema_1.clubs).where((0, drizzle_orm_1.eq)(schema_1.clubs.id, id));
        }
        catch (error) {
            if (error instanceof common_1.BadRequestException ||
                error instanceof common_1.NotFoundException)
                throw error;
            throw new common_1.BadRequestException('Failed to delete club');
        }
    }
};
exports.ClubsService = ClubsService;
exports.ClubsService = ClubsService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)('DRIZZLE')),
    __metadata("design:paramtypes", [node_postgres_1.NodePgDatabase])
], ClubsService);
//# sourceMappingURL=clubs.service.js.map