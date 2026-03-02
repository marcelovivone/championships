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
exports.MatchesService = void 0;
const common_1 = require("@nestjs/common");
const node_postgres_1 = require("drizzle-orm/node-postgres");
const drizzle_orm_1 = require("drizzle-orm");
const schema = require("../db/schema");
const schema_1 = require("../db/schema");
const standings_service_1 = require("../standings/standings.service");
const standings_calculator_service_1 = require("../standings/standings-calculator.service");
let MatchesService = class MatchesService {
    constructor(db, standingsService, standingsCalculator) {
        this.db = db;
        this.standingsService = standingsService;
        this.standingsCalculator = standingsCalculator;
    }
    async findAll() {
        try {
            const matchesData = await this.db
                .select({
                id: schema_1.matches.id,
                sportId: schema_1.matches.sportId,
                leagueId: schema_1.matches.leagueId,
                seasonId: schema_1.matches.seasonId,
                roundId: schema_1.matches.roundId,
                groupId: schema_1.matches.groupId,
                homeClubId: schema_1.matches.homeClubId,
                awayClubId: schema_1.matches.awayClubId,
                date: schema_1.matches.date,
                status: schema_1.matches.status,
                homeScore: schema_1.matches.homeScore,
                awayScore: schema_1.matches.awayScore,
                stadiumId: schema_1.matches.stadiumId,
                createdAt: schema_1.matches.createdAt,
                updatedAt: schema_1.matches.updatedAt,
            })
                .from(schema_1.matches);
            const matchesWithStadiums = await Promise.all(matchesData.map(async (match) => {
                const clubStadiums = await this.db
                    .select({
                    stadiumId: schema.clubStadiums.stadiumId,
                })
                    .from(schema.clubStadiums)
                    .where((0, drizzle_orm_1.eq)(schema.clubStadiums.clubId, match.homeClubId));
                const stadiumIds = clubStadiums.map(cs => cs.stadiumId);
                let associatedStadiums = [];
                if (stadiumIds.length > 0) {
                    associatedStadiums = await this.db
                        .select()
                        .from(schema_1.stadiums)
                        .where((0, drizzle_orm_1.inArray)(schema_1.stadiums.id, stadiumIds));
                }
                return {
                    ...match,
                    status: match.status,
                    availableStadiums: associatedStadiums
                };
            }));
            const matchesWithDivisions = await this.attachMatchDivisions(matchesWithStadiums);
            return matchesWithDivisions;
        }
        catch (error) {
            throw new common_1.BadRequestException('Failed to fetch matches');
        }
    }
    async findAllPaginated(page, limit, sortBy, sortOrder) {
        if (typeof page !== 'number' || page <= 0 || !Number.isInteger(page)) {
            throw new common_1.BadRequestException(`Invalid page value: ${page}. Must be a positive integer.`);
        }
        if (typeof limit !== 'number' || limit <= 0 || !Number.isInteger(limit)) {
            throw new common_1.BadRequestException(`Invalid limit value: ${limit}. Must be a positive integer.`);
        }
        if (typeof sortBy !== 'string' || sortBy.trim() === '') {
            throw new common_1.BadRequestException(`Invalid sortBy value: ${sortBy}. Must be a non-empty string.`);
        }
        if (sortOrder !== 'asc' && sortOrder !== 'desc') {
            throw new common_1.BadRequestException(`Invalid sortOrder value: ${sortOrder}. Must be either 'asc' or 'desc'.`);
        }
        const offset = (page - 1) * limit;
        const sortableColumns = [
            'date', 'homeScore', 'awayScore', 'status', 'createdAt',
            'homeClubName', 'awayClubName', 'leagueName', 'seasonInfo', 'roundNumber', 'stadiumName'
        ];
        const orderByField = sortableColumns.includes(sortBy) ? sortBy : 'date';
        const order = sortOrder === 'desc' ? drizzle_orm_1.desc : drizzle_orm_1.asc;
        const homeClubAlias = (0, drizzle_orm_1.aliasedTable)(schema_1.clubs, 'home_club');
        const awayClubAlias = (0, drizzle_orm_1.aliasedTable)(schema_1.clubs, 'away_club');
        try {
            let orderByClause;
            switch (orderByField) {
                case 'homeClubName':
                    orderByClause = order(homeClubAlias.name);
                    break;
                case 'awayClubName':
                    orderByClause = order(awayClubAlias.name);
                    break;
                case 'leagueName':
                    orderByClause = order(schema.leagues.originalName);
                    break;
                case 'seasonInfo':
                    orderByClause = order(schema.seasons.startYear);
                    break;
                case 'roundNumber':
                    orderByClause = order(schema.rounds.roundNumber);
                    break;
                case 'stadiumName':
                    orderByClause = order(schema_1.stadiums.name);
                    break;
                case 'homeScore':
                    orderByClause = order(schema_1.matches.homeScore);
                    break;
                case 'awayScore':
                    orderByClause = order(schema_1.matches.awayScore);
                    break;
                case 'status':
                    orderByClause = order(schema_1.matches.status);
                    break;
                case 'createdAt':
                    orderByClause = order(schema_1.matches.createdAt);
                    break;
                case 'date':
                default:
                    orderByClause = order(schema_1.matches.date);
                    break;
            }
            const data = await this.db
                .select({
                id: schema_1.matches.id,
                sportId: schema_1.matches.sportId,
                leagueId: schema_1.matches.leagueId,
                seasonId: schema_1.matches.seasonId,
                roundId: schema_1.matches.roundId,
                groupId: schema_1.matches.groupId,
                homeClubId: schema_1.matches.homeClubId,
                awayClubId: schema_1.matches.awayClubId,
                stadiumId: schema_1.matches.stadiumId,
                date: schema_1.matches.date,
                status: schema_1.matches.status,
                homeScore: schema_1.matches.homeScore,
                awayScore: schema_1.matches.awayScore,
                createdAt: schema_1.matches.createdAt,
                updatedAt: schema_1.matches.updatedAt,
                sport: {
                    id: schema.sports.id,
                    name: schema.sports.name,
                },
                league: {
                    id: schema.leagues.id,
                    originalName: schema.leagues.originalName,
                },
                season: {
                    id: schema.seasons.id,
                    startYear: schema.seasons.startYear,
                    endYear: schema.seasons.endYear,
                },
                round: {
                    id: schema.rounds.id,
                    roundNumber: schema.rounds.roundNumber,
                },
                homeClub: {
                    id: homeClubAlias.id,
                    name: homeClubAlias.name,
                    shortName: homeClubAlias.shortName,
                    imageUrl: homeClubAlias.imageUrl,
                },
                awayClub: {
                    id: awayClubAlias.id,
                    name: awayClubAlias.name,
                    shortName: awayClubAlias.shortName,
                    imageUrl: awayClubAlias.imageUrl,
                },
                stadium: {
                    id: schema_1.stadiums.id,
                    name: schema_1.stadiums.name,
                },
                group: {
                    id: schema_1.groups.id,
                    name: schema_1.groups.name,
                },
            })
                .from(schema_1.matches)
                .leftJoin(schema.sports, (0, drizzle_orm_1.eq)(schema_1.matches.sportId, schema.sports.id))
                .leftJoin(schema.leagues, (0, drizzle_orm_1.eq)(schema_1.matches.leagueId, schema.leagues.id))
                .leftJoin(schema.seasons, (0, drizzle_orm_1.eq)(schema_1.matches.seasonId, schema.seasons.id))
                .leftJoin(schema.rounds, (0, drizzle_orm_1.eq)(schema_1.matches.roundId, schema.rounds.id))
                .leftJoin(homeClubAlias, (0, drizzle_orm_1.eq)(schema_1.matches.homeClubId, homeClubAlias.id))
                .leftJoin(awayClubAlias, (0, drizzle_orm_1.eq)(schema_1.matches.awayClubId, awayClubAlias.id))
                .leftJoin(schema_1.stadiums, (0, drizzle_orm_1.eq)(schema_1.matches.stadiumId, schema_1.stadiums.id))
                .leftJoin(schema_1.groups, (0, drizzle_orm_1.eq)(schema_1.matches.groupId, schema_1.groups.id))
                .orderBy(orderByClause)
                .limit(limit)
                .offset(offset);
            const matchesWithStadiums = await Promise.all(data.map(async (match) => {
                const clubStadiums = await this.db
                    .select({
                    stadiumId: schema.clubStadiums.stadiumId,
                })
                    .from(schema.clubStadiums)
                    .where((0, drizzle_orm_1.eq)(schema.clubStadiums.clubId, match.homeClubId));
                const stadiumIds = clubStadiums.map(cs => cs.stadiumId);
                let associatedStadiums = [];
                if (stadiumIds.length > 0) {
                    associatedStadiums = await this.db
                        .select()
                        .from(schema_1.stadiums)
                        .where((0, drizzle_orm_1.inArray)(schema_1.stadiums.id, stadiumIds));
                }
                return {
                    ...match,
                    status: match.status,
                    availableStadiums: associatedStadiums
                };
            }));
            const matchesWithDivisions = await this.attachMatchDivisions(matchesWithStadiums);
            const totalResult = await this.db
                .select({ count: (0, drizzle_orm_1.sql) `count(*)` })
                .from(schema_1.matches)
                .leftJoin(schema.sports, (0, drizzle_orm_1.eq)(schema_1.matches.sportId, schema.sports.id))
                .leftJoin(schema.leagues, (0, drizzle_orm_1.eq)(schema_1.matches.leagueId, schema.leagues.id))
                .leftJoin(schema.seasons, (0, drizzle_orm_1.eq)(schema_1.matches.seasonId, schema.seasons.id))
                .leftJoin(schema.rounds, (0, drizzle_orm_1.eq)(schema_1.matches.roundId, schema.rounds.id))
                .leftJoin(homeClubAlias, (0, drizzle_orm_1.eq)(schema_1.matches.homeClubId, homeClubAlias.id))
                .leftJoin(awayClubAlias, (0, drizzle_orm_1.eq)(schema_1.matches.awayClubId, awayClubAlias.id))
                .leftJoin(schema_1.stadiums, (0, drizzle_orm_1.eq)(schema_1.matches.stadiumId, schema_1.stadiums.id))
                .leftJoin(schema_1.groups, (0, drizzle_orm_1.eq)(schema_1.matches.groupId, schema_1.groups.id));
            const total = Number(totalResult[0].count);
            return { data: matchesWithDivisions, total, page, limit };
        }
        catch (error) {
            console.error("Error in findAllPaginated:", error);
            if (error.message && error.message.includes('alias')) {
                throw new common_1.BadRequestException('Failed to fetch paginated matches due to a table alias issue');
            }
            throw new common_1.BadRequestException(`Failed to fetch paginated matches: ${error.message}`);
        }
    }
    async findOne(id) {
        try {
            const homeClubAlias = (0, drizzle_orm_1.aliasedTable)(schema_1.clubs, 'home_club');
            const awayClubAlias = (0, drizzle_orm_1.aliasedTable)(schema_1.clubs, 'away_club');
            const matchResults = await this.db
                .select({
                id: schema_1.matches.id,
                sportId: schema_1.matches.sportId,
                leagueId: schema_1.matches.leagueId,
                seasonId: schema_1.matches.seasonId,
                roundId: schema_1.matches.roundId,
                groupId: schema_1.matches.groupId,
                homeClubId: schema_1.matches.homeClubId,
                awayClubId: schema_1.matches.awayClubId,
                stadiumId: schema_1.matches.stadiumId,
                date: schema_1.matches.date,
                status: schema_1.matches.status,
                homeScore: schema_1.matches.homeScore,
                awayScore: schema_1.matches.awayScore,
                createdAt: schema_1.matches.createdAt,
                updatedAt: schema_1.matches.updatedAt,
                sport: {
                    id: schema.sports.id,
                    name: schema.sports.name,
                },
                league: {
                    id: schema.leagues.id,
                    originalName: schema.leagues.originalName,
                },
                season: {
                    id: schema.seasons.id,
                    startYear: schema.seasons.startYear,
                    endYear: schema.seasons.endYear,
                },
                round: {
                    id: schema.rounds.id,
                    roundNumber: schema.rounds.roundNumber,
                },
                homeClub: {
                    id: homeClubAlias.id,
                    name: homeClubAlias.name,
                    shortName: homeClubAlias.shortName,
                    imageUrl: homeClubAlias.imageUrl,
                },
                awayClub: {
                    id: awayClubAlias.id,
                    name: awayClubAlias.name,
                    shortName: awayClubAlias.shortName,
                    imageUrl: awayClubAlias.imageUrl,
                },
                stadium: {
                    id: schema_1.stadiums.id,
                    name: schema_1.stadiums.name,
                },
                group: {
                    id: schema_1.groups.id,
                    name: schema_1.groups.name,
                },
            })
                .from(schema_1.matches)
                .leftJoin(schema.sports, (0, drizzle_orm_1.eq)(schema_1.matches.sportId, schema.sports.id))
                .leftJoin(schema.leagues, (0, drizzle_orm_1.eq)(schema_1.matches.leagueId, schema.leagues.id))
                .leftJoin(schema.seasons, (0, drizzle_orm_1.eq)(schema_1.matches.seasonId, schema.seasons.id))
                .leftJoin(schema.rounds, (0, drizzle_orm_1.eq)(schema_1.matches.roundId, schema.rounds.id))
                .leftJoin(homeClubAlias, (0, drizzle_orm_1.eq)(schema_1.matches.homeClubId, homeClubAlias.id))
                .leftJoin(awayClubAlias, (0, drizzle_orm_1.eq)(schema_1.matches.awayClubId, awayClubAlias.id))
                .leftJoin(schema_1.stadiums, (0, drizzle_orm_1.eq)(schema_1.matches.stadiumId, schema_1.stadiums.id))
                .leftJoin(schema_1.groups, (0, drizzle_orm_1.eq)(schema_1.matches.groupId, schema_1.groups.id))
                .where((0, drizzle_orm_1.eq)(schema_1.matches.id, id))
                .limit(1);
            if (!matchResults || matchResults.length === 0) {
                throw new common_1.NotFoundException(`Match with ID ${id} not found`);
            }
            const match = matchResults[0];
            const clubStadiums = await this.db
                .select({
                stadiumId: schema.clubStadiums.stadiumId,
            })
                .from(schema.clubStadiums)
                .where((0, drizzle_orm_1.eq)(schema.clubStadiums.clubId, match.homeClubId));
            const stadiumIds = clubStadiums.map(cs => cs.stadiumId);
            let associatedStadiums = [];
            if (stadiumIds.length > 0) {
                associatedStadiums = await this.db
                    .select()
                    .from(schema_1.stadiums)
                    .where((0, drizzle_orm_1.inArray)(schema_1.stadiums.id, stadiumIds));
            }
            const matchWithDivisions = await this.attachMatchDivisions([match]);
            return {
                ...matchWithDivisions[0],
                availableStadiums: associatedStadiums
            };
        }
        catch (error) {
            if (error instanceof common_1.NotFoundException)
                throw error;
            throw new common_1.BadRequestException('Failed to fetch match');
        }
    }
    async ensureExists(id) {
        const result = await this.db
            .select({ id: schema_1.matches.id })
            .from(schema_1.matches)
            .where((0, drizzle_orm_1.eq)(schema_1.matches.id, id))
            .limit(1);
        if (!result.length) {
            throw new common_1.NotFoundException(`Match with ID ${id} not found`);
        }
    }
    async create(createMatchDto) {
        try {
            if (createMatchDto.groupId) {
                const group = await this.db
                    .select()
                    .from(schema_1.groups)
                    .where((0, drizzle_orm_1.eq)(schema_1.groups.id, createMatchDto.groupId))
                    .limit(1);
                if (!group || group.length === 0) {
                    throw new common_1.BadRequestException(`Group with ID ${createMatchDto.groupId} not found`);
                }
            }
            const homeClub = await this.db
                .select()
                .from(schema_1.clubs)
                .where((0, drizzle_orm_1.eq)(schema_1.clubs.id, createMatchDto.homeClubId))
                .limit(1);
            if (!homeClub || homeClub.length === 0) {
                throw new common_1.BadRequestException(`Home club with ID ${createMatchDto.homeClubId} not found`);
            }
            const awayClub = await this.db
                .select()
                .from(schema_1.clubs)
                .where((0, drizzle_orm_1.eq)(schema_1.clubs.id, createMatchDto.awayClubId))
                .limit(1);
            if (!awayClub || awayClub.length === 0) {
                throw new common_1.BadRequestException(`Away club with ID ${createMatchDto.awayClubId} not found`);
            }
            const result = await this.db
                .insert(schema_1.matches)
                .values({
                sportId: createMatchDto.sportId,
                leagueId: createMatchDto.leagueId,
                seasonId: createMatchDto.seasonId,
                roundId: createMatchDto.roundId,
                groupId: createMatchDto.groupId || null,
                homeClubId: createMatchDto.homeClubId,
                awayClubId: createMatchDto.awayClubId,
                stadiumId: createMatchDto.stadiumId || null,
                date: new Date(createMatchDto.date),
                status: createMatchDto.status || 'Scheduled',
                homeScore: createMatchDto.homeScore || null,
                awayScore: createMatchDto.awayScore || null,
            })
                .returning();
            return result[0];
        }
        catch (error) {
            if (error instanceof common_1.BadRequestException)
                throw error;
            throw new common_1.BadRequestException('Failed to create match');
        }
    }
    async update(id, updateMatchDto) {
        try {
            await this.ensureExists(id);
            if (updateMatchDto.groupId) {
                const group = await this.db
                    .select()
                    .from(schema_1.groups)
                    .where((0, drizzle_orm_1.eq)(schema_1.groups.id, updateMatchDto.groupId))
                    .limit(1);
                if (!group || group.length === 0) {
                    throw new common_1.BadRequestException(`Group with ID ${updateMatchDto.groupId} not found`);
                }
            }
            if (updateMatchDto.homeClubId) {
                const homeClub = await this.db
                    .select()
                    .from(schema_1.clubs)
                    .where((0, drizzle_orm_1.eq)(schema_1.clubs.id, updateMatchDto.homeClubId))
                    .limit(1);
                if (!homeClub || homeClub.length === 0) {
                    throw new common_1.BadRequestException(`Home club with ID ${updateMatchDto.homeClubId} not found`);
                }
            }
            if (updateMatchDto.awayClubId) {
                const awayClub = await this.db
                    .select()
                    .from(schema_1.clubs)
                    .where((0, drizzle_orm_1.eq)(schema_1.clubs.id, updateMatchDto.awayClubId))
                    .limit(1);
                if (!awayClub || awayClub.length === 0) {
                    throw new common_1.BadRequestException(`Away club with ID ${updateMatchDto.awayClubId} not found`);
                }
            }
            const updateData = { ...updateMatchDto, updatedAt: new Date() };
            if (updateData.date) {
                updateData.date = new Date(updateData.date);
            }
            if ('homeScore' in updateData) {
                updateData.homeScore = updateData.homeScore === null || updateData.homeScore === undefined ? null : updateData.homeScore;
            }
            if ('awayScore' in updateData) {
                updateData.awayScore = updateData.awayScore === null || updateData.awayScore === undefined ? null : updateData.awayScore;
            }
            const result = await this.db
                .update(schema_1.matches)
                .set(updateData)
                .where((0, drizzle_orm_1.eq)(schema_1.matches.id, id))
                .returning();
            const updatedMatch = result[0];
            return {
                ...updatedMatch,
                status: updatedMatch.status,
            };
        }
        catch (error) {
            console.error('findOne error:', error);
            throw error;
        }
    }
    async findByGroup(groupId) {
        try {
            const group = await this.db
                .select()
                .from(schema_1.groups)
                .where((0, drizzle_orm_1.eq)(schema_1.groups.id, groupId))
                .limit(1);
            if (!group || group.length === 0) {
                throw new common_1.NotFoundException(`Group with ID ${groupId} not found`);
            }
            const homeClubAlias = (0, drizzle_orm_1.aliasedTable)(schema_1.clubs, 'home_club');
            const awayClubAlias = (0, drizzle_orm_1.aliasedTable)(schema_1.clubs, 'away_club');
            const results = await this.db
                .select({
                id: schema_1.matches.id,
                sportId: schema_1.matches.sportId,
                leagueId: schema_1.matches.leagueId,
                seasonId: schema_1.matches.seasonId,
                roundId: schema_1.matches.roundId,
                groupId: schema_1.matches.groupId,
                homeClubId: schema_1.matches.homeClubId,
                awayClubId: schema_1.matches.awayClubId,
                stadiumId: schema_1.matches.stadiumId,
                date: schema_1.matches.date,
                status: schema_1.matches.status,
                homeScore: schema_1.matches.homeScore,
                awayScore: schema_1.matches.awayScore,
                createdAt: schema_1.matches.createdAt,
                updatedAt: schema_1.matches.updatedAt,
                sport: {
                    id: schema.sports.id,
                    name: schema.sports.name,
                },
                league: {
                    id: schema.leagues.id,
                    originalName: schema.leagues.originalName,
                },
                season: {
                    id: schema.seasons.id,
                    startYear: schema.seasons.startYear,
                    endYear: schema.seasons.endYear,
                },
                round: {
                    id: schema.rounds.id,
                    roundNumber: schema.rounds.roundNumber,
                },
                homeClub: {
                    id: homeClubAlias.id,
                    name: homeClubAlias.name,
                    shortName: homeClubAlias.shortName,
                    imageUrl: homeClubAlias.imageUrl,
                },
                awayClub: {
                    id: awayClubAlias.id,
                    name: awayClubAlias.name,
                    shortName: awayClubAlias.shortName,
                    imageUrl: awayClubAlias.imageUrl,
                },
                stadium: {
                    id: schema_1.stadiums.id,
                    name: schema_1.stadiums.name,
                },
                group: {
                    id: schema_1.groups.id,
                    name: schema_1.groups.name,
                },
            })
                .from(schema_1.matches)
                .leftJoin(schema.sports, (0, drizzle_orm_1.eq)(schema_1.matches.sportId, schema.sports.id))
                .leftJoin(schema.leagues, (0, drizzle_orm_1.eq)(schema_1.matches.leagueId, schema.leagues.id))
                .leftJoin(schema.seasons, (0, drizzle_orm_1.eq)(schema_1.matches.seasonId, schema.seasons.id))
                .leftJoin(schema.rounds, (0, drizzle_orm_1.eq)(schema_1.matches.roundId, schema.rounds.id))
                .leftJoin(homeClubAlias, (0, drizzle_orm_1.eq)(schema_1.matches.homeClubId, homeClubAlias.id))
                .leftJoin(awayClubAlias, (0, drizzle_orm_1.eq)(schema_1.matches.awayClubId, awayClubAlias.id))
                .leftJoin(schema_1.stadiums, (0, drizzle_orm_1.eq)(schema_1.matches.stadiumId, schema_1.stadiums.id))
                .leftJoin(schema_1.groups, (0, drizzle_orm_1.eq)(schema_1.matches.groupId, schema_1.groups.id))
                .where((0, drizzle_orm_1.eq)(schema_1.matches.groupId, groupId));
            return results.map(match => ({ ...match, status: match.status }));
        }
        catch (error) {
            if (error instanceof common_1.NotFoundException)
                throw error;
            throw new common_1.BadRequestException('Failed to fetch matches by group');
        }
    }
    async findBySportLeagueSeasonAndGroup(sportId, leagueId, seasonId, groupId) {
        try {
            const homeClubAlias = (0, drizzle_orm_1.aliasedTable)(schema_1.clubs, 'home_club');
            const awayClubAlias = (0, drizzle_orm_1.aliasedTable)(schema_1.clubs, 'away_club');
            let whereCondition;
            if (groupId) {
                whereCondition = (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.matches.sportId, sportId), (0, drizzle_orm_1.eq)(schema_1.matches.leagueId, leagueId), (0, drizzle_orm_1.eq)(schema_1.matches.seasonId, seasonId), (0, drizzle_orm_1.eq)(schema_1.matches.groupId, groupId));
            }
            else {
                whereCondition = (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.matches.sportId, sportId), (0, drizzle_orm_1.eq)(schema_1.matches.leagueId, leagueId), (0, drizzle_orm_1.eq)(schema_1.matches.seasonId, seasonId));
            }
            const results = await this.db
                .select({
                id: schema_1.matches.id,
                sportId: schema_1.matches.sportId,
                leagueId: schema_1.matches.leagueId,
                seasonId: schema_1.matches.seasonId,
                roundId: schema_1.matches.roundId,
                groupId: schema_1.matches.groupId,
                homeClubId: schema_1.matches.homeClubId,
                awayClubId: schema_1.matches.awayClubId,
                stadiumId: schema_1.matches.stadiumId,
                date: schema_1.matches.date,
                status: schema_1.matches.status,
                homeScore: schema_1.matches.homeScore,
                awayScore: schema_1.matches.awayScore,
                createdAt: schema_1.matches.createdAt,
                updatedAt: schema_1.matches.updatedAt,
                sport: {
                    id: schema.sports.id,
                    name: schema.sports.name,
                },
                league: {
                    id: schema.leagues.id,
                    originalName: schema.leagues.originalName,
                },
                season: {
                    id: schema.seasons.id,
                    startYear: schema.seasons.startYear,
                    endYear: schema.seasons.endYear,
                },
                round: {
                    id: schema.rounds.id,
                    roundNumber: schema.rounds.roundNumber,
                },
                homeClub: {
                    id: homeClubAlias.id,
                    name: homeClubAlias.name,
                    shortName: homeClubAlias.shortName,
                    imageUrl: homeClubAlias.imageUrl,
                },
                awayClub: {
                    id: awayClubAlias.id,
                    name: awayClubAlias.name,
                    shortName: awayClubAlias.shortName,
                    imageUrl: awayClubAlias.imageUrl,
                },
                stadium: {
                    id: schema_1.stadiums.id,
                    name: schema_1.stadiums.name,
                },
                group: {
                    id: schema_1.groups.id,
                    name: schema_1.groups.name,
                },
            })
                .from(schema_1.matches)
                .leftJoin(schema.sports, (0, drizzle_orm_1.eq)(schema_1.matches.sportId, schema.sports.id))
                .leftJoin(schema.leagues, (0, drizzle_orm_1.eq)(schema_1.matches.leagueId, schema.leagues.id))
                .leftJoin(schema.seasons, (0, drizzle_orm_1.eq)(schema_1.matches.seasonId, schema.seasons.id))
                .leftJoin(schema.rounds, (0, drizzle_orm_1.eq)(schema_1.matches.roundId, schema.rounds.id))
                .leftJoin(homeClubAlias, (0, drizzle_orm_1.eq)(schema_1.matches.homeClubId, homeClubAlias.id))
                .leftJoin(awayClubAlias, (0, drizzle_orm_1.eq)(schema_1.matches.awayClubId, awayClubAlias.id))
                .leftJoin(schema_1.stadiums, (0, drizzle_orm_1.eq)(schema_1.matches.stadiumId, schema_1.stadiums.id))
                .leftJoin(schema_1.groups, (0, drizzle_orm_1.eq)(schema_1.matches.groupId, schema_1.groups.id))
                .where(whereCondition);
            return results.map(match => ({ ...match, status: match.status }));
        }
        catch (error) {
            throw new common_1.BadRequestException('Failed to fetch matches by sport, league, season and group');
        }
    }
    async findBySeasonAndRound(seasonId, roundId) {
        try {
            const homeClubAlias = (0, drizzle_orm_1.aliasedTable)(schema_1.clubs, 'home_club');
            const awayClubAlias = (0, drizzle_orm_1.aliasedTable)(schema_1.clubs, 'away_club');
            const matchesData = await this.db
                .select({
                id: schema_1.matches.id,
                sportId: schema_1.matches.sportId,
                leagueId: schema_1.matches.leagueId,
                seasonId: schema_1.matches.seasonId,
                roundId: schema_1.matches.roundId,
                groupId: schema_1.matches.groupId,
                homeClubId: schema_1.matches.homeClubId,
                awayClubId: schema_1.matches.awayClubId,
                stadiumId: schema_1.matches.stadiumId,
                date: schema_1.matches.date,
                status: schema_1.matches.status,
                homeScore: schema_1.matches.homeScore,
                awayScore: schema_1.matches.awayScore,
                createdAt: schema_1.matches.createdAt,
                updatedAt: schema_1.matches.updatedAt,
                sport: {
                    id: schema.sports.id,
                    name: schema.sports.name,
                },
                league: {
                    id: schema.leagues.id,
                    originalName: schema.leagues.originalName,
                },
                season: {
                    id: schema.seasons.id,
                    startYear: schema.seasons.startYear,
                    endYear: schema.seasons.endYear,
                },
                round: {
                    id: schema.rounds.id,
                    roundNumber: schema.rounds.roundNumber,
                },
                homeClub: {
                    id: homeClubAlias.id,
                    name: homeClubAlias.name,
                    shortName: homeClubAlias.shortName,
                    imageUrl: homeClubAlias.imageUrl,
                },
                awayClub: {
                    id: awayClubAlias.id,
                    name: awayClubAlias.name,
                    shortName: awayClubAlias.shortName,
                    imageUrl: awayClubAlias.imageUrl,
                },
                stadium: {
                    id: schema_1.stadiums.id,
                    name: schema_1.stadiums.name,
                },
                group: {
                    id: schema_1.groups.id,
                    name: schema_1.groups.name,
                },
            })
                .from(schema_1.matches)
                .leftJoin(schema.sports, (0, drizzle_orm_1.eq)(schema_1.matches.sportId, schema.sports.id))
                .leftJoin(schema.leagues, (0, drizzle_orm_1.eq)(schema_1.matches.leagueId, schema.leagues.id))
                .leftJoin(schema.seasons, (0, drizzle_orm_1.eq)(schema_1.matches.seasonId, schema.seasons.id))
                .leftJoin(schema.rounds, (0, drizzle_orm_1.eq)(schema_1.matches.roundId, schema.rounds.id))
                .leftJoin(homeClubAlias, (0, drizzle_orm_1.eq)(schema_1.matches.homeClubId, homeClubAlias.id))
                .leftJoin(awayClubAlias, (0, drizzle_orm_1.eq)(schema_1.matches.awayClubId, awayClubAlias.id))
                .leftJoin(schema_1.stadiums, (0, drizzle_orm_1.eq)(schema_1.matches.stadiumId, schema_1.stadiums.id))
                .leftJoin(schema_1.groups, (0, drizzle_orm_1.eq)(schema_1.matches.groupId, schema_1.groups.id))
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.matches.seasonId, seasonId), (0, drizzle_orm_1.eq)(schema_1.matches.roundId, roundId)));
            const matchesWithStadiums = await this.attachAvailableStadiums(matchesData);
            return matchesWithStadiums;
        }
        catch (error) {
            throw new common_1.BadRequestException('Failed to fetch matches by season and round');
        }
    }
    async findBySeasonAndDate(seasonId, date) {
        try {
            const homeClubAlias = (0, drizzle_orm_1.aliasedTable)(schema_1.clubs, 'home_club');
            const awayClubAlias = (0, drizzle_orm_1.aliasedTable)(schema_1.clubs, 'away_club');
            const startDate = new Date(date);
            startDate.setHours(0, 0, 0, 0);
            const endDate = new Date(date);
            endDate.setHours(23, 59, 59, 999);
            const matchesData = await this.db
                .select({
                id: schema_1.matches.id,
                sportId: schema_1.matches.sportId,
                leagueId: schema_1.matches.leagueId,
                seasonId: schema_1.matches.seasonId,
                roundId: schema_1.matches.roundId,
                groupId: schema_1.matches.groupId,
                homeClubId: schema_1.matches.homeClubId,
                awayClubId: schema_1.matches.awayClubId,
                stadiumId: schema_1.matches.stadiumId,
                date: schema_1.matches.date,
                status: schema_1.matches.status,
                homeScore: schema_1.matches.homeScore,
                awayScore: schema_1.matches.awayScore,
                createdAt: schema_1.matches.createdAt,
                updatedAt: schema_1.matches.updatedAt,
                sport: {
                    id: schema.sports.id,
                    name: schema.sports.name,
                },
                league: {
                    id: schema.leagues.id,
                    originalName: schema.leagues.originalName,
                },
                season: {
                    id: schema.seasons.id,
                    startYear: schema.seasons.startYear,
                    endYear: schema.seasons.endYear,
                },
                round: {
                    id: schema.rounds.id,
                    roundNumber: schema.rounds.roundNumber,
                },
                homeClub: {
                    id: homeClubAlias.id,
                    name: homeClubAlias.name,
                    shortName: homeClubAlias.shortName,
                    imageUrl: homeClubAlias.imageUrl,
                },
                awayClub: {
                    id: awayClubAlias.id,
                    name: awayClubAlias.name,
                    shortName: awayClubAlias.shortName,
                    imageUrl: awayClubAlias.imageUrl,
                },
                stadium: {
                    id: schema_1.stadiums.id,
                    name: schema_1.stadiums.name,
                },
                group: {
                    id: schema_1.groups.id,
                    name: schema_1.groups.name,
                },
            })
                .from(schema_1.matches)
                .leftJoin(schema.sports, (0, drizzle_orm_1.eq)(schema_1.matches.sportId, schema.sports.id))
                .leftJoin(schema.leagues, (0, drizzle_orm_1.eq)(schema_1.matches.leagueId, schema.leagues.id))
                .leftJoin(schema.seasons, (0, drizzle_orm_1.eq)(schema_1.matches.seasonId, schema.seasons.id))
                .leftJoin(schema.rounds, (0, drizzle_orm_1.eq)(schema_1.matches.roundId, schema.rounds.id))
                .leftJoin(homeClubAlias, (0, drizzle_orm_1.eq)(schema_1.matches.homeClubId, homeClubAlias.id))
                .leftJoin(awayClubAlias, (0, drizzle_orm_1.eq)(schema_1.matches.awayClubId, awayClubAlias.id))
                .leftJoin(schema_1.stadiums, (0, drizzle_orm_1.eq)(schema_1.matches.stadiumId, schema_1.stadiums.id))
                .leftJoin(schema_1.groups, (0, drizzle_orm_1.eq)(schema_1.matches.groupId, schema_1.groups.id))
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.matches.seasonId, seasonId), (0, drizzle_orm_1.gte)(schema_1.matches.date, startDate), (0, drizzle_orm_1.lte)(schema_1.matches.date, endDate)));
            const matchesWithStadiums = await this.attachAvailableStadiums(matchesData);
            const matchesWithDivisions = await this.attachMatchDivisions(matchesWithStadiums);
            return matchesWithDivisions;
        }
        catch (error) {
            throw new common_1.BadRequestException('Failed to fetch matches by season and date');
        }
    }
    async updateScore(id, updateScoreDto) {
        try {
            const match = await this.findOne(id);
            const result = await this.db
                .update(schema_1.matches)
                .set({
                homeScore: updateScoreDto.homeScore,
                awayScore: updateScoreDto.awayScore,
                status: 'Finished',
                updatedAt: new Date(),
            })
                .where((0, drizzle_orm_1.eq)(schema_1.matches.id, id))
                .returning();
            const updatedMatch = result[0];
            const leagueInfo = await this.db
                .select({
                sportName: schema_1.sports.name,
            })
                .from(schema_1.leagues)
                .innerJoin(schema_1.sports, (0, drizzle_orm_1.eq)(schema_1.leagues.sportId, schema_1.sports.id))
                .where((0, drizzle_orm_1.eq)(schema_1.leagues.id, updatedMatch.leagueId))
                .limit(1);
            if (leagueInfo && leagueInfo.length > 0) {
                const sportName = leagueInfo[0].sportName;
                const stats = this.standingsCalculator.calculate(sportName, updatedMatch);
                await this.standingsService.recordRoundStats(updatedMatch.roundId, updatedMatch.groupId, updatedMatch.homeClubId, stats.home);
                await this.standingsService.recordRoundStats(updatedMatch.roundId, updatedMatch.groupId, updatedMatch.awayClubId, stats.away);
            }
            return result[0];
        }
        catch (error) {
            if (error instanceof common_1.NotFoundException)
                throw error;
            throw new common_1.BadRequestException('Failed to update match score');
        }
    }
    async remove(id) {
        try {
            await this.findOne(id);
            const divisions = await this.db
                .select()
                .from(schema.matchDivisions)
                .where((0, drizzle_orm_1.eq)(schema.matchDivisions.matchId, id))
                .limit(1);
            if (divisions && divisions.length > 0) {
                throw new common_1.BadRequestException('Cannot delete match. Match divisions are recorded.');
            }
            const events = await this.db
                .select()
                .from(schema.matchEvents)
                .where((0, drizzle_orm_1.eq)(schema.matchEvents.matchId, id))
                .limit(1);
            if (events && events.length > 0) {
                throw new common_1.BadRequestException('Cannot delete match. Match events are recorded.');
            }
            const result = await this.db
                .delete(schema_1.matches)
                .where((0, drizzle_orm_1.eq)(schema_1.matches.id, id))
                .returning();
            return result[0];
        }
        catch (error) {
            if (error instanceof common_1.BadRequestException || error instanceof common_1.NotFoundException)
                throw error;
            throw new common_1.BadRequestException('Failed to delete match');
        }
    }
    async attachAvailableStadiums(matches) {
        if (!matches.length)
            return matches;
        const clubIds = [
            ...new Set(matches.map(m => m.homeClubId).filter(Boolean))
        ];
        const rows = await this.db
            .select({
            clubId: schema.clubStadiums.clubId,
            stadiumId: schema_1.stadiums.id,
            stadiumName: schema_1.stadiums.name,
        })
            .from(schema.clubStadiums)
            .innerJoin(schema_1.stadiums, (0, drizzle_orm_1.eq)(schema.clubStadiums.stadiumId, schema_1.stadiums.id))
            .where((0, drizzle_orm_1.inArray)(schema.clubStadiums.clubId, clubIds));
        const stadiumsByClub = rows.reduce((acc, row) => {
            acc[row.clubId] ??= [];
            acc[row.clubId].push({
                id: row.stadiumId,
                name: row.stadiumName,
            });
            return acc;
        }, {});
        return matches.map(match => ({
            ...match,
            availableStadiums: stadiumsByClub[match.homeClubId] ?? [],
        }));
    }
    async attachMatchDivisions(matches) {
        if (!matches.length)
            return matches;
        const matchIds = matches.map(m => m.id);
        const divisions = await this.db
            .select()
            .from(schema.matchDivisions)
            .where((0, drizzle_orm_1.inArray)(schema.matchDivisions.matchId, matchIds));
        const divisionsByMatch = divisions.reduce((acc, division) => {
            acc[division.matchId] ??= [];
            acc[division.matchId].push(division);
            return acc;
        }, {});
        return matches.map(match => ({
            ...match,
            matchDivisions: divisionsByMatch[match.id] ?? [],
        }));
    }
};
exports.MatchesService = MatchesService;
exports.MatchesService = MatchesService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)('DRIZZLE')),
    __metadata("design:paramtypes", [node_postgres_1.NodePgDatabase,
        standings_service_1.StandingsService,
        standings_calculator_service_1.StandingsCalculatorService])
], MatchesService);
//# sourceMappingURL=matches.service.js.map