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
        return await this.db
            .select({
            id: schema.seasonClubs.id,
            sportId: schema.seasonClubs.sportId,
            leagueId: schema.seasonClubs.leagueId,
            seasonId: schema.seasonClubs.seasonId,
            clubId: schema.seasonClubs.clubId,
            groupId: schema.seasonClubs.groupId,
            createdAt: schema.seasonClubs.createdAt,
            sport: {
                id: schema.sports.id,
                name: schema.sports.name,
            },
            league: {
                id: schema.leagues.id,
                originalName: schema.leagues.originalName,
                secondaryName: schema.leagues.secondaryName,
            },
            season: {
                id: schema.seasons.id,
                startYear: schema.seasons.startYear,
                endYear: schema.seasons.endYear,
            },
            club: {
                id: schema.clubs.id,
                name: schema.clubs.name,
                imageUrl: schema.clubs.imageUrl,
            },
            group: {
                id: schema.groups.id,
                name: schema.groups.name,
            },
        })
            .from(schema.seasonClubs)
            .leftJoin(schema.sports, (0, drizzle_orm_1.eq)(schema.seasonClubs.sportId, schema.sports.id))
            .leftJoin(schema.leagues, (0, drizzle_orm_1.eq)(schema.seasonClubs.leagueId, schema.leagues.id))
            .leftJoin(schema.seasons, (0, drizzle_orm_1.eq)(schema.seasonClubs.seasonId, schema.seasons.id))
            .leftJoin(schema.clubs, (0, drizzle_orm_1.eq)(schema.seasonClubs.clubId, schema.clubs.id))
            .leftJoin(schema.groups, (0, drizzle_orm_1.eq)(schema.seasonClubs.groupId, schema.groups.id));
    }
    async findAllPaginated(page, limit, sortBy, sortOrder) {
        const offset = (page - 1) * limit;
        const sortableColumns = ['createdAt', 'sportId', 'leagueId', 'seasonId', 'clubId', 'groupId', 'sportName', 'leagueName', 'seasonInfo', 'clubName', 'groupName'];
        const orderByField = sortableColumns.includes(sortBy) ? sortBy : 'createdAt';
        const order = sortOrder === 'desc' ? drizzle_orm_1.desc : drizzle_orm_1.asc;
        let orderByClause;
        switch (orderByField) {
            case 'sportName':
                orderByClause = order(schema.sports.name);
                break;
            case 'leagueName':
                orderByClause = order(schema.leagues.originalName);
                break;
            case 'seasonInfo':
                orderByClause = order(schema.seasons.startYear);
                break;
            case 'clubName':
                orderByClause = order(schema.clubs.name);
                break;
            case 'groupName':
                orderByClause = order(schema.groups.name);
                break;
            case 'sportId':
                orderByClause = order(schema.seasonClubs.sportId);
                break;
            case 'leagueId':
                orderByClause = order(schema.seasonClubs.leagueId);
                break;
            case 'seasonId':
                orderByClause = order(schema.seasonClubs.seasonId);
                break;
            case 'clubId':
                orderByClause = order(schema.seasonClubs.clubId);
                break;
            case 'groupId':
                orderByClause = order(schema.seasonClubs.groupId);
                break;
            case 'createdAt':
            default:
                orderByClause = order(schema.seasonClubs.createdAt);
                break;
        }
        try {
            const data = await this.db
                .select({
                id: schema.seasonClubs.id,
                sportId: schema.seasonClubs.sportId,
                leagueId: schema.seasonClubs.leagueId,
                seasonId: schema.seasonClubs.seasonId,
                clubId: schema.seasonClubs.clubId,
                groupId: schema.seasonClubs.groupId,
                createdAt: schema.seasonClubs.createdAt,
                sport: {
                    id: schema.sports.id,
                    name: schema.sports.name,
                },
                league: {
                    id: schema.leagues.id,
                    originalName: schema.leagues.originalName,
                    secondaryName: schema.leagues.secondaryName,
                },
                season: {
                    id: schema.seasons.id,
                    startYear: schema.seasons.startYear,
                    endYear: schema.seasons.endYear,
                },
                club: {
                    id: schema.clubs.id,
                    name: schema.clubs.name,
                    imageUrl: schema.clubs.imageUrl,
                },
                group: {
                    id: schema.groups.id,
                    name: schema.groups.name,
                },
            })
                .from(schema.seasonClubs)
                .leftJoin(schema.sports, (0, drizzle_orm_1.eq)(schema.seasonClubs.sportId, schema.sports.id))
                .leftJoin(schema.leagues, (0, drizzle_orm_1.eq)(schema.seasonClubs.leagueId, schema.leagues.id))
                .leftJoin(schema.seasons, (0, drizzle_orm_1.eq)(schema.seasonClubs.seasonId, schema.seasons.id))
                .leftJoin(schema.clubs, (0, drizzle_orm_1.eq)(schema.seasonClubs.clubId, schema.clubs.id))
                .leftJoin(schema.groups, (0, drizzle_orm_1.eq)(schema.seasonClubs.groupId, schema.groups.id))
                .orderBy(orderByClause)
                .limit(limit)
                .offset(offset);
            const totalResult = await this.db
                .select({ count: (0, drizzle_orm_1.sql) `count(*)` })
                .from(schema.seasonClubs)
                .leftJoin(schema.sports, (0, drizzle_orm_1.eq)(schema.seasonClubs.sportId, schema.sports.id))
                .leftJoin(schema.leagues, (0, drizzle_orm_1.eq)(schema.seasonClubs.leagueId, schema.leagues.id))
                .leftJoin(schema.seasons, (0, drizzle_orm_1.eq)(schema.seasonClubs.seasonId, schema.seasons.id))
                .leftJoin(schema.clubs, (0, drizzle_orm_1.eq)(schema.seasonClubs.clubId, schema.clubs.id))
                .leftJoin(schema.groups, (0, drizzle_orm_1.eq)(schema.seasonClubs.groupId, schema.groups.id));
            const total = Number(totalResult[0].count);
            return { data, total, page, limit };
        }
        catch (error) {
            throw new common_1.BadRequestException('Failed to fetch paginated season-clubs');
        }
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
            .select({
            id: schema.seasonClubs.id,
            sportId: schema.seasonClubs.sportId,
            leagueId: schema.seasonClubs.leagueId,
            seasonId: schema.seasonClubs.seasonId,
            clubId: schema.seasonClubs.clubId,
            groupId: schema.seasonClubs.groupId,
            createdAt: schema.seasonClubs.createdAt,
            sport: {
                id: schema.sports.id,
                name: schema.sports.name,
            },
            league: {
                id: schema.leagues.id,
                originalName: schema.leagues.originalName,
                secondaryName: schema.leagues.secondaryName,
            },
            season: {
                id: schema.seasons.id,
                startYear: schema.seasons.startYear,
                endYear: schema.seasons.endYear,
            },
            club: {
                id: schema.clubs.id,
                name: schema.clubs.name,
                imageUrl: schema.clubs.imageUrl,
            },
            group: {
                id: schema.groups.id,
                name: schema.groups.name,
            },
        })
            .from(schema.seasonClubs)
            .leftJoin(schema.sports, (0, drizzle_orm_1.eq)(schema.seasonClubs.sportId, schema.sports.id))
            .leftJoin(schema.leagues, (0, drizzle_orm_1.eq)(schema.seasonClubs.leagueId, schema.leagues.id))
            .leftJoin(schema.seasons, (0, drizzle_orm_1.eq)(schema.seasonClubs.seasonId, schema.seasons.id))
            .leftJoin(schema.clubs, (0, drizzle_orm_1.eq)(schema.seasonClubs.clubId, schema.clubs.id))
            .leftJoin(schema.groups, (0, drizzle_orm_1.eq)(schema.seasonClubs.groupId, schema.groups.id))
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
        return true;
    }
    async create(dto) {
        const sport = await this.db
            .select()
            .from(schema.sports)
            .where((0, drizzle_orm_1.eq)(schema.sports.id, dto.sportId));
        if (sport.length === 0) {
            throw new common_1.BadRequestException(`Sport with ID ${dto.sportId} not found`);
        }
        const league = await this.db
            .select()
            .from(schema.leagues)
            .where((0, drizzle_orm_1.eq)(schema.leagues.id, dto.leagueId));
        if (league.length === 0) {
            throw new common_1.BadRequestException(`League with ID ${dto.leagueId} not found`);
        }
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
        if (dto.groupId) {
            const group = await this.db
                .select()
                .from(schema.groups)
                .where((0, drizzle_orm_1.eq)(schema.groups.id, dto.groupId));
            if (group.length === 0) {
                throw new common_1.BadRequestException(`Group with ID ${dto.groupId} not found`);
            }
        }
        const existing = await this.db
            .select()
            .from(schema.seasonClubs)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema.seasonClubs.sportId, dto.sportId), (0, drizzle_orm_1.eq)(schema.seasonClubs.leagueId, dto.leagueId), (0, drizzle_orm_1.eq)(schema.seasonClubs.seasonId, dto.seasonId), (0, drizzle_orm_1.eq)(schema.seasonClubs.clubId, dto.clubId)));
        if (existing.length > 0) {
            throw new common_1.BadRequestException(`Club ${dto.clubId} is already associated with sport ${dto.sportId}, league ${dto.leagueId} and season ${dto.seasonId}`);
        }
        const result = await this.db
            .insert(schema.seasonClubs)
            .values({
            sportId: dto.sportId,
            leagueId: dto.leagueId,
            seasonId: dto.seasonId,
            clubId: dto.clubId,
            groupId: dto.groupId || null,
        })
            .returning();
        return result[0];
    }
    async update(id, dto) {
        const existing = await this.findOne(id);
        if (dto.sportId) {
            const sport = await this.db
                .select()
                .from(schema.sports)
                .where((0, drizzle_orm_1.eq)(schema.sports.id, dto.sportId));
            if (sport.length === 0) {
                throw new common_1.BadRequestException(`Sport with ID ${dto.sportId} not found`);
            }
        }
        if (dto.leagueId) {
            const league = await this.db
                .select()
                .from(schema.leagues)
                .where((0, drizzle_orm_1.eq)(schema.leagues.id, dto.leagueId));
            if (league.length === 0) {
                throw new common_1.BadRequestException(`League with ID ${dto.leagueId} not found`);
            }
        }
        if (dto.seasonId) {
            const season = await this.db
                .select()
                .from(schema.seasons)
                .where((0, drizzle_orm_1.eq)(schema.seasons.id, dto.seasonId));
            if (season.length === 0) {
                throw new common_1.BadRequestException(`Season with ID ${dto.seasonId} not found`);
            }
        }
        if (dto.clubId) {
            const club = await this.db
                .select()
                .from(schema.clubs)
                .where((0, drizzle_orm_1.eq)(schema.clubs.id, dto.clubId));
            if (club.length === 0) {
                throw new common_1.BadRequestException(`Club with ID ${dto.clubId} not found`);
            }
        }
        if (dto.groupId) {
            const group = await this.db
                .select()
                .from(schema.groups)
                .where((0, drizzle_orm_1.eq)(schema.groups.id, dto.groupId));
            if (group.length === 0) {
                throw new common_1.BadRequestException(`Group with ID ${dto.groupId} not found`);
            }
        }
        const result = await this.db
            .update(schema.seasonClubs)
            .set({
            sportId: dto.sportId !== undefined ? dto.sportId : existing.sportId,
            leagueId: dto.leagueId !== undefined ? dto.leagueId : existing.leagueId,
            seasonId: dto.seasonId !== undefined ? dto.seasonId : existing.seasonId,
            clubId: dto.clubId !== undefined ? dto.clubId : existing.clubId,
            groupId: dto.groupId !== undefined ? dto.groupId : existing.groupId,
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