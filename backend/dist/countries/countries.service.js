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
exports.CountriesService = void 0;
const common_1 = require("@nestjs/common");
const node_postgres_1 = require("drizzle-orm/node-postgres");
const drizzle_orm_1 = require("drizzle-orm");
const schema = require("../db/schema");
const schema_1 = require("../db/schema");
let CountriesService = class CountriesService {
    constructor(db) {
        this.db = db;
    }
    async findAll(paginationDto, filteringDto = {}) {
        const { page = 1, limit = 10 } = paginationDto;
        const { sortBy, sortOrder, search } = filteringDto;
        const offset = (page - 1) * limit;
        const sortableColumns = ['name', 'continent', 'code'];
        const orderBy = sortableColumns.includes(sortBy) ? sortBy : 'name';
        const order = sortOrder === 'desc' ? drizzle_orm_1.desc : drizzle_orm_1.asc;
        const whereConditions = [];
        if (search) {
            whereConditions.push((0, drizzle_orm_1.or)((0, drizzle_orm_1.ilike)(schema_1.countries.name, `%${search}%`), (0, drizzle_orm_1.ilike)(schema_1.countries.code, `%${search}%`), (0, drizzle_orm_1.ilike)(schema_1.countries.continent, `%${search}%`)));
        }
        const finalWhere = (0, drizzle_orm_1.and)(...whereConditions);
        try {
            const query = this.db.select().from(schema_1.countries).where(finalWhere);
            const totalResult = await this.db
                .select({ count: (0, drizzle_orm_1.sql) `count(*)` })
                .from(schema_1.countries)
                .where(finalWhere);
            const total = Number(totalResult[0].count);
            const data = await query
                .orderBy(order(schema_1.countries[orderBy]))
                .limit(limit)
                .offset(offset);
            return { data, total, page, limit };
        }
        catch (error) {
            console.error('Error fetching countries:', error);
            throw new common_1.BadRequestException('Failed to fetch paginated and filtered countries');
        }
    }
    async findOne(id) {
        try {
            const country = await this.db
                .select()
                .from(schema_1.countries)
                .where((0, drizzle_orm_1.eq)(schema_1.countries.id, id))
                .limit(1);
            if (!country || country.length === 0) {
                throw new common_1.NotFoundException(`Country with ID ${id} not found`);
            }
            return country[0];
        }
        catch (error) {
            if (error instanceof common_1.NotFoundException)
                throw error;
            throw new common_1.BadRequestException('Failed to fetch country');
        }
    }
    async findByContinent(continent) {
        try {
            return await this.db
                .select()
                .from(schema_1.countries)
                .where((0, drizzle_orm_1.eq)(schema_1.countries.continent, continent));
        }
        catch (error) {
            throw new common_1.BadRequestException('Failed to fetch countries by continent');
        }
    }
    async create(createCountryDto) {
        try {
            const existing = await this.db
                .select()
                .from(schema_1.countries)
                .where((0, drizzle_orm_1.eq)(schema_1.countries.code, createCountryDto.code))
                .limit(1);
            if (existing && existing.length > 0) {
                throw new common_1.BadRequestException(`Country with code "${createCountryDto.code}" already exists`);
            }
            const result = await this.db
                .insert(schema_1.countries)
                .values(createCountryDto)
                .returning();
            return result[0];
        }
        catch (error) {
            if (error instanceof common_1.BadRequestException)
                throw error;
            throw new common_1.BadRequestException('Failed to create country');
        }
    }
    async update(id, updateCountryDto) {
        try {
            await this.findOne(id);
            if (updateCountryDto.code) {
                const existing = await this.db
                    .select()
                    .from(schema_1.countries)
                    .where((0, drizzle_orm_1.eq)(schema_1.countries.code, updateCountryDto.code))
                    .limit(1);
                if (existing && existing.length > 0 && existing[0].id !== id) {
                    throw new common_1.BadRequestException(`Country with code "${updateCountryDto.code}" already exists`);
                }
            }
            const result = await this.db
                .update(schema_1.countries)
                .set(updateCountryDto)
                .where((0, drizzle_orm_1.eq)(schema_1.countries.id, id))
                .returning();
            return result[0];
        }
        catch (error) {
            if (error instanceof common_1.BadRequestException || error instanceof common_1.NotFoundException)
                throw error;
            throw new common_1.BadRequestException('Failed to update country');
        }
    }
    async remove(id) {
        try {
            await this.findOne(id);
            const cities = await this.db
                .select()
                .from(schema.cities)
                .where((0, drizzle_orm_1.eq)(schema.cities.countryId, id))
                .limit(1);
            if (cities && cities.length > 0) {
                throw new common_1.BadRequestException('Cannot delete country. Cities are associated with this country.');
            }
            const result = await this.db
                .delete(schema_1.countries)
                .where((0, drizzle_orm_1.eq)(schema_1.countries.id, id))
                .returning();
            return result[0];
        }
        catch (error) {
            if (error instanceof common_1.BadRequestException || error instanceof common_1.NotFoundException)
                throw error;
            throw new common_1.BadRequestException('Failed to delete country');
        }
    }
};
exports.CountriesService = CountriesService;
exports.CountriesService = CountriesService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)('DRIZZLE')),
    __metadata("design:paramtypes", [node_postgres_1.NodePgDatabase])
], CountriesService);
//# sourceMappingURL=countries.service.js.map