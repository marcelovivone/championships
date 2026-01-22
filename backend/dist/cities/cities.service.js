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
exports.CitiesService = void 0;
const common_1 = require("@nestjs/common");
const node_postgres_1 = require("drizzle-orm/node-postgres");
const drizzle_orm_1 = require("drizzle-orm");
const schema = require("../db/schema");
const schema_1 = require("../db/schema");
let CitiesService = class CitiesService {
    constructor(db) {
        this.db = db;
    }
    async findAll(paginationDto) {
        const { page = 1, limit = 10 } = paginationDto;
        const offset = (page - 1) * limit;
        try {
            const data = await this.db
                .select({
                id: schema_1.cities.id,
                name: schema_1.cities.name,
                countryId: schema_1.cities.countryId,
                country: {
                    id: schema_1.countries.id,
                    name: schema_1.countries.name,
                    continent: schema_1.countries.continent,
                    flagUrl: schema_1.countries.flagUrl,
                },
            })
                .from(schema_1.cities)
                .leftJoin(schema_1.countries, (0, drizzle_orm_1.eq)(schema_1.cities.countryId, schema_1.countries.id))
                .orderBy(schema_1.cities.name)
                .limit(limit)
                .offset(offset);
            const totalResult = await this.db
                .select({ count: (0, drizzle_orm_1.sql) `count(*)` })
                .from(schema_1.cities);
            const total = Number(totalResult[0].count);
            return { data, total };
        }
        catch (error) {
            throw new common_1.BadRequestException('Failed to fetch paginated cities');
        }
    }
    async findOne(id) {
        try {
            const city = await this.db
                .select({
                id: schema_1.cities.id,
                name: schema_1.cities.name,
                countryId: schema_1.cities.countryId,
                country: {
                    id: schema_1.countries.id,
                    name: schema_1.countries.name,
                    continent: schema_1.countries.continent,
                    flagUrl: schema_1.countries.flagUrl,
                },
            })
                .from(schema_1.cities)
                .leftJoin(schema_1.countries, (0, drizzle_orm_1.eq)(schema_1.cities.countryId, schema_1.countries.id))
                .where((0, drizzle_orm_1.eq)(schema_1.cities.id, id))
                .limit(1);
            if (!city || city.length === 0) {
                throw new common_1.NotFoundException(`City with ID ${id} not found`);
            }
            return city[0];
        }
        catch (error) {
            if (error instanceof common_1.NotFoundException)
                throw error;
            throw new common_1.BadRequestException('Failed to fetch city');
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
                id: schema_1.cities.id,
                name: schema_1.cities.name,
                countryId: schema_1.cities.countryId,
                country: {
                    id: schema_1.countries.id,
                    name: schema_1.countries.name,
                    continent: schema_1.countries.continent,
                    flagUrl: schema_1.countries.flagUrl,
                },
            })
                .from(schema_1.cities)
                .leftJoin(schema_1.countries, (0, drizzle_orm_1.eq)(schema_1.cities.countryId, schema_1.countries.id))
                .where((0, drizzle_orm_1.eq)(schema_1.cities.countryId, countryId))
                .orderBy(schema_1.cities.name)
                .limit(limit)
                .offset(offset);
            const totalResult = await this.db
                .select({ count: (0, drizzle_orm_1.sql) `count(*)` })
                .from(schema_1.cities)
                .where((0, drizzle_orm_1.eq)(schema_1.cities.countryId, countryId));
            const total = Number(totalResult[0].count);
            return { data, total };
        }
        catch (error) {
            if (error instanceof common_1.NotFoundException)
                throw error;
            throw new common_1.BadRequestException('Failed to fetch paginated cities by country');
        }
    }
    async create(createCityDto) {
        try {
            const country = await this.db
                .select()
                .from(schema_1.countries)
                .where((0, drizzle_orm_1.eq)(schema_1.countries.id, createCityDto.countryId))
                .limit(1);
            if (!country || country.length === 0) {
                throw new common_1.BadRequestException(`Country with ID ${createCityDto.countryId} not found`);
            }
            const existing = await this.db
                .select()
                .from(schema_1.cities)
                .where((0, drizzle_orm_1.eq)(schema_1.cities.name, createCityDto.name))
                .limit(1);
            if (existing && existing.length > 0) {
                throw new common_1.BadRequestException(`City "${createCityDto.name}" already exists`);
            }
            const result = await this.db
                .insert(schema_1.cities)
                .values(createCityDto)
                .returning();
            return this.findOne(result[0].id);
        }
        catch (error) {
            if (error instanceof common_1.BadRequestException ||
                error instanceof common_1.NotFoundException)
                throw error;
            throw new common_1.BadRequestException('Failed to create city');
        }
    }
    async update(id, updateCityDto) {
        try {
            await this.findOne(id);
            if (updateCityDto.countryId) {
                const country = await this.db
                    .select()
                    .from(schema_1.countries)
                    .where((0, drizzle_orm_1.eq)(schema_1.countries.id, updateCityDto.countryId))
                    .limit(1);
                if (!country || country.length === 0) {
                    throw new common_1.BadRequestException(`Country with ID ${updateCityDto.countryId} not found`);
                }
            }
            await this.db
                .update(schema_1.cities)
                .set(updateCityDto)
                .where((0, drizzle_orm_1.eq)(schema_1.cities.id, id));
            return this.findOne(id);
        }
        catch (error) {
            if (error instanceof common_1.BadRequestException ||
                error instanceof common_1.NotFoundException)
                throw error;
            throw new common_1.BadRequestException('Failed to update city');
        }
    }
    async remove(id) {
        try {
            await this.findOne(id);
            const stadiums = await this.db
                .select()
                .from(schema.stadiums)
                .where((0, drizzle_orm_1.eq)(schema.stadiums.cityId, id))
                .limit(1);
            if (stadiums && stadiums.length > 0) {
                throw new common_1.BadRequestException('Cannot delete city. Stadiums are located in this city.');
            }
            await this.db.delete(schema_1.cities).where((0, drizzle_orm_1.eq)(schema_1.cities.id, id));
        }
        catch (error) {
            if (error instanceof common_1.BadRequestException ||
                error instanceof common_1.NotFoundException)
                throw error;
            throw new common_1.BadRequestException('Failed to delete city');
        }
    }
};
exports.CitiesService = CitiesService;
exports.CitiesService = CitiesService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)('DRIZZLE')),
    __metadata("design:paramtypes", [node_postgres_1.NodePgDatabase])
], CitiesService);
//# sourceMappingURL=cities.service.js.map