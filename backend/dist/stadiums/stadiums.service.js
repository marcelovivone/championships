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
exports.StadiumsService = void 0;
const common_1 = require("@nestjs/common");
const node_postgres_1 = require("drizzle-orm/node-postgres");
const drizzle_orm_1 = require("drizzle-orm");
const schema = require("../db/schema");
const schema_1 = require("../db/schema");
let StadiumsService = class StadiumsService {
    constructor(db) {
        this.db = db;
    }
    async findAll(paginationDto, filteringDto = {}) {
        const { page = 1, limit = 10 } = paginationDto;
        const { sortBy = 'name', sortOrder = 'asc' } = filteringDto;
        const offset = (page - 1) * limit;
        const sortableColumns = ['name', 'type', 'capacity', 'cityId', 'sportId'];
        const orderByField = sortableColumns.includes(sortBy) ? sortBy : 'name';
        const order = sortOrder === 'desc' ? drizzle_orm_1.desc : drizzle_orm_1.asc;
        let orderByClause;
        switch (orderByField) {
            case 'type':
                orderByClause = order(schema_1.stadiums.type);
                break;
            case 'capacity':
                orderByClause = order(schema_1.stadiums.capacity);
                break;
            case 'cityId':
                orderByClause = order(schema_1.stadiums.cityId);
                break;
            case 'sportId':
                orderByClause = order(schema_1.stadiums.sportId);
                break;
            case 'name':
            default:
                orderByClause = order(schema_1.stadiums.name);
                break;
        }
        try {
            const data = await this.db
                .select({
                id: schema_1.stadiums.id,
                name: schema_1.stadiums.name,
                type: schema_1.stadiums.type,
                capacity: schema_1.stadiums.capacity,
                imageUrl: schema_1.stadiums.imageUrl,
                cityId: schema_1.stadiums.cityId,
                city: {
                    id: schema_1.cities.id,
                    name: schema_1.cities.name,
                },
                sportId: schema_1.stadiums.sportId,
                sport: {
                    id: schema_1.sports.id,
                    name: schema_1.sports.name,
                },
            })
                .from(schema_1.stadiums)
                .leftJoin(schema_1.cities, (0, drizzle_orm_1.eq)(schema_1.stadiums.cityId, schema_1.cities.id))
                .leftJoin(schema_1.sports, (0, drizzle_orm_1.eq)(schema_1.stadiums.sportId, schema_1.sports.id))
                .orderBy(orderByClause)
                .limit(limit)
                .offset(offset);
            const totalResult = await this.db
                .select({ count: (0, drizzle_orm_1.sql) `count(*)` })
                .from(schema_1.stadiums);
            const total = Number(totalResult[0].count);
            return { data, total };
        }
        catch (error) {
            throw new common_1.BadRequestException('Failed to fetch paginated stadiums');
        }
    }
    async findOne(id) {
        try {
            const stadium = await this.db
                .select({
                id: schema_1.stadiums.id,
                name: schema_1.stadiums.name,
                type: schema_1.stadiums.type,
                capacity: schema_1.stadiums.capacity,
                imageUrl: schema_1.stadiums.imageUrl,
                cityId: schema_1.stadiums.cityId,
                city: {
                    id: schema_1.cities.id,
                    name: schema_1.cities.name,
                },
                sportId: schema_1.stadiums.sportId,
                sport: {
                    id: schema_1.sports.id,
                    name: schema_1.sports.name,
                },
            })
                .from(schema_1.stadiums)
                .leftJoin(schema_1.cities, (0, drizzle_orm_1.eq)(schema_1.stadiums.cityId, schema_1.cities.id))
                .leftJoin(schema_1.sports, (0, drizzle_orm_1.eq)(schema_1.stadiums.sportId, schema_1.sports.id))
                .where((0, drizzle_orm_1.eq)(schema_1.stadiums.id, id))
                .limit(1);
            if (!stadium || stadium.length === 0) {
                throw new common_1.NotFoundException(`Stadium with ID ${id} not found`);
            }
            return stadium[0];
        }
        catch (error) {
            if (error instanceof common_1.NotFoundException)
                throw error;
            throw new common_1.BadRequestException('Failed to fetch stadium');
        }
    }
    async findByCity(cityId, paginationDto, filteringDto = {}) {
        const { page = 1, limit = 10 } = paginationDto;
        const offset = (page - 1) * limit;
        const { sortBy = 'name', sortOrder = 'asc' } = filteringDto;
        const order = sortOrder === 'desc' ? drizzle_orm_1.desc : drizzle_orm_1.asc;
        const sortableColumns = ['name', 'type', 'capacity', 'cityId', 'sportId'];
        const orderByField = sortableColumns.includes(sortBy) ? sortBy : 'name';
        let orderByClause;
        switch (orderByField) {
            case 'type':
                orderByClause = order(schema_1.stadiums.type);
                break;
            case 'capacity':
                orderByClause = order(schema_1.stadiums.capacity);
                break;
            case 'cityId':
                orderByClause = order(schema_1.stadiums.cityId);
                break;
            case 'sportId':
                orderByClause = order(schema_1.stadiums.sportId);
                break;
            case 'name':
            default:
                orderByClause = order(schema_1.stadiums.name);
                break;
        }
        try {
            const city = await this.db
                .select()
                .from(schema_1.cities)
                .where((0, drizzle_orm_1.eq)(schema_1.cities.id, cityId))
                .limit(1);
            if (!city || city.length === 0) {
                throw new common_1.NotFoundException(`City with ID ${cityId} not found`);
            }
            const data = await this.db
                .select({
                id: schema_1.stadiums.id,
                name: schema_1.stadiums.name,
                type: schema_1.stadiums.type,
                capacity: schema_1.stadiums.capacity,
                imageUrl: schema_1.stadiums.imageUrl,
                cityId: schema_1.stadiums.cityId,
                city: {
                    id: schema_1.cities.id,
                    name: schema_1.cities.name,
                },
                sportId: schema_1.stadiums.sportId,
                sport: {
                    id: schema_1.sports.id,
                    name: schema_1.sports.name,
                },
            })
                .from(schema_1.stadiums)
                .leftJoin(schema_1.cities, (0, drizzle_orm_1.eq)(schema_1.stadiums.cityId, schema_1.cities.id))
                .leftJoin(schema_1.sports, (0, drizzle_orm_1.eq)(schema_1.stadiums.sportId, schema_1.sports.id))
                .where((0, drizzle_orm_1.eq)(schema_1.stadiums.cityId, cityId))
                .orderBy(orderByClause)
                .limit(limit)
                .offset(offset);
            const totalResult = await this.db
                .select({ count: (0, drizzle_orm_1.sql) `count(*)` })
                .from(schema_1.stadiums)
                .where((0, drizzle_orm_1.eq)(schema_1.stadiums.cityId, cityId));
            const total = Number(totalResult[0].count);
            return { data, total };
        }
        catch (error) {
            if (error instanceof common_1.NotFoundException)
                throw error;
            throw new common_1.BadRequestException('Failed to fetch paginated stadiums by city');
        }
    }
    async findBySport(sportId, paginationDto, filteringDto = {}) {
        const { page = 1, limit = 10 } = paginationDto;
        const offset = (page - 1) * limit;
        const { sortBy = 'name', sortOrder = 'asc' } = filteringDto;
        const order = sortOrder === 'desc' ? drizzle_orm_1.desc : drizzle_orm_1.asc;
        const sortableColumns = ['name', 'type', 'capacity', 'cityId', 'sportId'];
        const orderByField = sortableColumns.includes(sortBy) ? sortBy : 'name';
        let orderByClause;
        switch (orderByField) {
            case 'type':
                orderByClause = order(schema_1.stadiums.type);
                break;
            case 'capacity':
                orderByClause = order(schema_1.stadiums.capacity);
                break;
            case 'cityId':
                orderByClause = order(schema_1.stadiums.cityId);
                break;
            case 'sportId':
                orderByClause = order(schema_1.stadiums.sportId);
                break;
            case 'name':
            default:
                orderByClause = order(schema_1.stadiums.name);
                break;
        }
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
                .select({
                id: schema_1.stadiums.id,
                name: schema_1.stadiums.name,
                type: schema_1.stadiums.type,
                capacity: schema_1.stadiums.capacity,
                imageUrl: schema_1.stadiums.imageUrl,
                cityId: schema_1.stadiums.cityId,
                city: {
                    id: schema_1.cities.id,
                    name: schema_1.cities.name,
                },
                sportId: schema_1.stadiums.sportId,
                sport: {
                    id: schema_1.sports.id,
                    name: schema_1.sports.name,
                },
            })
                .from(schema_1.stadiums)
                .leftJoin(schema_1.cities, (0, drizzle_orm_1.eq)(schema_1.stadiums.cityId, schema_1.cities.id))
                .leftJoin(schema_1.sports, (0, drizzle_orm_1.eq)(schema_1.stadiums.sportId, schema_1.sports.id))
                .where((0, drizzle_orm_1.eq)(schema_1.stadiums.sportId, sportId))
                .orderBy(orderByClause)
                .limit(limit)
                .offset(offset);
            const totalResult = await this.db
                .select({ count: (0, drizzle_orm_1.sql) `count(*)` })
                .from(schema_1.stadiums)
                .where((0, drizzle_orm_1.eq)(schema_1.stadiums.sportId, sportId));
            const total = Number(totalResult[0].count);
            return { data, total };
        }
        catch (error) {
            if (error instanceof common_1.NotFoundException)
                throw error;
            throw new common_1.BadRequestException('Failed to fetch paginated stadiums by sport');
        }
    }
    async findByType(type) {
        try {
            return await this.db
                .select({
                id: schema_1.stadiums.id,
                name: schema_1.stadiums.name,
                type: schema_1.stadiums.type,
                capacity: schema_1.stadiums.capacity,
                imageUrl: schema_1.stadiums.imageUrl,
                cityId: schema_1.stadiums.cityId,
                city: {
                    id: schema_1.cities.id,
                    name: schema_1.cities.name,
                },
                sportId: schema_1.stadiums.sportId,
                sport: {
                    id: schema_1.sports.id,
                    name: schema_1.sports.name,
                },
            })
                .from(schema_1.stadiums)
                .leftJoin(schema_1.cities, (0, drizzle_orm_1.eq)(schema_1.stadiums.cityId, schema_1.cities.id))
                .leftJoin(schema_1.sports, (0, drizzle_orm_1.eq)(schema_1.stadiums.sportId, schema_1.sports.id))
                .where((0, drizzle_orm_1.eq)(schema_1.stadiums.type, type))
                .orderBy(schema_1.stadiums.name);
        }
        catch (error) {
            throw new common_1.BadRequestException('Failed to fetch stadiums by type');
        }
    }
    async create(createStadiumDto) {
        try {
            const city = await this.db
                .select()
                .from(schema_1.cities)
                .where((0, drizzle_orm_1.eq)(schema_1.cities.id, createStadiumDto.cityId))
                .limit(1);
            if (!city || city.length === 0) {
                throw new common_1.BadRequestException(`City with ID ${createStadiumDto.cityId} not found`);
            }
            const sport = await this.db
                .select()
                .from(schema_1.sports)
                .where((0, drizzle_orm_1.eq)(schema_1.sports.id, createStadiumDto.sportId))
                .limit(1);
            if (!sport || sport.length === 0) {
                throw new common_1.BadRequestException(`Sport with ID ${createStadiumDto.sportId} not found`);
            }
            const existing = await this.db
                .select()
                .from(schema_1.stadiums)
                .where((0, drizzle_orm_1.eq)(schema_1.stadiums.name, createStadiumDto.name))
                .limit(1);
            if (existing && existing.length > 0) {
                throw new common_1.BadRequestException(`Stadium "${createStadiumDto.name}" already exists`);
            }
            const result = await this.db
                .insert(schema_1.stadiums)
                .values(createStadiumDto)
                .returning();
            return this.findOne(result[0].id);
        }
        catch (error) {
            if (error instanceof common_1.BadRequestException ||
                error instanceof common_1.NotFoundException)
                throw error;
            throw new common_1.BadRequestException('Failed to create stadium');
        }
    }
    async update(id, updateStadiumDto) {
        try {
            await this.findOne(id);
            if (updateStadiumDto.cityId) {
                const city = await this.db
                    .select()
                    .from(schema_1.cities)
                    .where((0, drizzle_orm_1.eq)(schema_1.cities.id, updateStadiumDto.cityId))
                    .limit(1);
                if (!city || city.length === 0) {
                    throw new common_1.BadRequestException(`City with ID ${updateStadiumDto.cityId} not found`);
                }
            }
            if (updateStadiumDto.sportId) {
                const sport = await this.db
                    .select()
                    .from(schema_1.sports)
                    .where((0, drizzle_orm_1.eq)(schema_1.sports.id, updateStadiumDto.sportId))
                    .limit(1);
                if (!sport || sport.length === 0) {
                    throw new common_1.BadRequestException(`Sport with ID ${updateStadiumDto.sportId} not found`);
                }
            }
            await this.db
                .update(schema_1.stadiums)
                .set(updateStadiumDto)
                .where((0, drizzle_orm_1.eq)(schema_1.stadiums.id, id));
            return this.findOne(id);
        }
        catch (error) {
            if (error instanceof common_1.BadRequestException ||
                error instanceof common_1.NotFoundException)
                throw error;
            throw new common_1.BadRequestException('Failed to update stadium');
        }
    }
    async remove(id) {
        try {
            await this.findOne(id);
            const clubStadiums = await this.db
                .select()
                .from(schema.clubStadiums)
                .where((0, drizzle_orm_1.eq)(schema.clubStadiums.stadiumId, id))
                .limit(1);
            if (clubStadiums && clubStadiums.length > 0) {
                throw new common_1.BadRequestException('Cannot delete stadium. Clubs are using this stadium.');
            }
            await this.db.delete(schema_1.stadiums).where((0, drizzle_orm_1.eq)(schema_1.stadiums.id, id));
        }
        catch (error) {
            if (error instanceof common_1.BadRequestException ||
                error instanceof common_1.NotFoundException)
                throw error;
            throw new common_1.BadRequestException('Failed to delete stadium');
        }
    }
};
exports.StadiumsService = StadiumsService;
exports.StadiumsService = StadiumsService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)('DRIZZLE')),
    __metadata("design:paramtypes", [node_postgres_1.NodePgDatabase])
], StadiumsService);
//# sourceMappingURL=stadiums.service.js.map