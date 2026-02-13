import { Injectable, Inject, NotFoundException, BadRequestException } from '@nestjs/common';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { eq, and, gte, lte, sql, asc, desc, aliasedTable, inArray } from 'drizzle-orm';
import * as schema from '../db/schema';
import { matches, groups, rounds, leagues, sports, seasons, clubs as schemaClubs, stadiums as schemaStadiums, groups as schemaGroups } from '../db/schema';
import { CreateMatchDto, UpdateMatchDto, UpdateMatchScoreDto } from '../common/dtos';
import { StandingsService } from '../standings/standings.service';
import { StandingsCalculatorService } from '../standings/standings-calculator.service';
import { MatchStatus } from '../common/enums/match-status.enum';

@Injectable()
export class MatchesService {
    constructor(
        @Inject('DRIZZLE')
        private db: NodePgDatabase<typeof schema>,
        private standingsService: StandingsService,
        private standingsCalculator: StandingsCalculatorService,
    ) { }

    /**
     * Get all matches
     */
    async findAll() {
        try {
            const matchesData = await this.db
                .select({
                    id: matches.id,
                    sportId: matches.sportId,
                    leagueId: matches.leagueId,
                    seasonId: matches.seasonId,
                    roundId: matches.roundId,
                    groupId: matches.groupId,
                    homeClubId: matches.homeClubId,
                    awayClubId: matches.awayClubId,
                    date: matches.date,
                    status: matches.status,
                    homeScore: matches.homeScore,
                    awayScore: matches.awayScore,
                    stadiumId: matches.stadiumId,
                    createdAt: matches.createdAt,
                    updatedAt: matches.updatedAt,
                })
                .from(matches);

            // For each match, get the stadiums associated with the home club
            const matchesWithStadiums = await Promise.all(matchesData.map(async (match) => {
                // Get stadiums associated with the home club
                const clubStadiums = await this.db
                    .select({
                        stadiumId: schema.clubStadiums.stadiumId,
                    })
                    .from(schema.clubStadiums)
                    .where(eq(schema.clubStadiums.clubId, match.homeClubId));

                // Extract stadium IDs from the relationship data
                const stadiumIds = clubStadiums.map(cs => cs.stadiumId);

                // Get the actual stadium objects
                let associatedStadiums = [];
                if (stadiumIds.length > 0) {
                    associatedStadiums = await this.db
                        .select()
                        .from(schemaStadiums)
                        .where(inArray(schemaStadiums.id, stadiumIds));
                }

                return {
                    ...match,
                    status: match.status as MatchStatus,
                    availableStadiums: associatedStadiums
                };
            }));

            const matchesWithDivisions =
                await this.attachMatchDivisions(matchesWithStadiums);

            return matchesWithDivisions;

        } catch (error) {
            throw new BadRequestException('Failed to fetch matches');
        }
    }

    /**
     * Get all matches with pagination
     */
    async findAllPaginated(page: number, limit: number, sortBy: string, sortOrder: 'asc' | 'desc') {
        // Validate inputs
        if (typeof page !== 'number' || page <= 0 || !Number.isInteger(page)) {
            throw new BadRequestException(`Invalid page value: ${page}. Must be a positive integer.`);
        }
        if (typeof limit !== 'number' || limit <= 0 || !Number.isInteger(limit)) {
            throw new BadRequestException(`Invalid limit value: ${limit}. Must be a positive integer.`);
        }
        if (typeof sortBy !== 'string' || sortBy.trim() === '') {
            throw new BadRequestException(`Invalid sortBy value: ${sortBy}. Must be a non-empty string.`);
        }
        if (sortOrder !== 'asc' && sortOrder !== 'desc') {
            throw new BadRequestException(`Invalid sortOrder value: ${sortOrder}. Must be either 'asc' or 'desc'.`);
        }

        const offset = (page - 1) * limit;

        // Define sortable columns for matches including related fields
        const sortableColumns = [
            'date', 'homeScore', 'awayScore', 'status', 'createdAt',
            'homeClubName', 'awayClubName', 'leagueName', 'seasonInfo', 'roundNumber', 'stadiumName'
        ];
        const orderByField = sortableColumns.includes(sortBy) ? sortBy : 'date';
        const order = sortOrder === 'desc' ? desc : asc;

        // Use aliases for the clubs table to distinguish between home and away clubs
        const homeClubAlias = aliasedTable(schemaClubs, 'home_club');
        const awayClubAlias = aliasedTable(schemaClubs, 'away_club');

        try {
            // Determine the sort column - handle related fields properly
            let orderByClause: any;
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
                    orderByClause = order(schemaStadiums.name);
                    break;
                case 'homeScore':
                    orderByClause = order(matches.homeScore);
                    break;
                case 'awayScore':
                    orderByClause = order(matches.awayScore);
                    break;
                case 'status':
                    orderByClause = order(matches.status);
                    break;
                case 'createdAt':
                    orderByClause = order(matches.createdAt);
                    break;
                case 'date':
                default:
                    orderByClause = order(matches.date);
                    break;
            }

            // Query matches with related entity data
            const data = await this.db
                .select({
                    id: matches.id,
                    sportId: matches.sportId,
                    leagueId: matches.leagueId,
                    seasonId: matches.seasonId,
                    roundId: matches.roundId,
                    groupId: matches.groupId,
                    homeClubId: matches.homeClubId,
                    awayClubId: matches.awayClubId,
                    stadiumId: matches.stadiumId,
                    date: matches.date,
                    status: matches.status,
                    homeScore: matches.homeScore,
                    awayScore: matches.awayScore,
                    createdAt: matches.createdAt,
                    updatedAt: matches.updatedAt,
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
                        id: schemaStadiums.id,
                        name: schemaStadiums.name,
                    },
                    group: {
                        id: schemaGroups.id,
                        name: schemaGroups.name,
                    },
                })
                .from(matches)
                .leftJoin(schema.sports, eq(matches.sportId, schema.sports.id))
                .leftJoin(schema.leagues, eq(matches.leagueId, schema.leagues.id))
                .leftJoin(schema.seasons, eq(matches.seasonId, schema.seasons.id))
                .leftJoin(schema.rounds, eq(matches.roundId, schema.rounds.id))
                .leftJoin(homeClubAlias, eq(matches.homeClubId, homeClubAlias.id)) // Join for home club
                .leftJoin(awayClubAlias, eq(matches.awayClubId, awayClubAlias.id)) // Join for away club
                .leftJoin(schemaStadiums, eq(matches.stadiumId, schemaStadiums.id))
                .leftJoin(schemaGroups, eq(matches.groupId, schemaGroups.id))
                .orderBy(orderByClause)
                .limit(limit)
                .offset(offset);

            // For each match, get the stadiums associated with the home club
            const matchesWithStadiums = await Promise.all(data.map(async (match) => {
                // Get stadiums associated with the home club
                const clubStadiums = await this.db
                    .select({
                        stadiumId: schema.clubStadiums.stadiumId,
                    })
                    .from(schema.clubStadiums)
                    .where(eq(schema.clubStadiums.clubId, match.homeClubId));

                // Extract stadium IDs from the relationship data
                const stadiumIds = clubStadiums.map(cs => cs.stadiumId);

                // Get the actual stadium objects
                let associatedStadiums = [];
                if (stadiumIds.length > 0) {
                    associatedStadiums = await this.db
                        .select()
                        .from(schemaStadiums)
                        .where(inArray(schemaStadiums.id, stadiumIds));
                }

                return {
                    ...match,
                    status: match.status as MatchStatus,
                    availableStadiums: associatedStadiums
                };
            }));

            const matchesWithDivisions =
                await this.attachMatchDivisions(matchesWithStadiums);

            const totalResult = await this.db
                .select({ count: sql<number>`count(*)` })
                .from(matches)
                .leftJoin(schema.sports, eq(matches.sportId, schema.sports.id))
                .leftJoin(schema.leagues, eq(matches.leagueId, schema.leagues.id))
                .leftJoin(schema.seasons, eq(matches.seasonId, schema.seasons.id))
                .leftJoin(schema.rounds, eq(matches.roundId, schema.rounds.id))
                .leftJoin(homeClubAlias, eq(matches.homeClubId, homeClubAlias.id))
                .leftJoin(awayClubAlias, eq(matches.awayClubId, awayClubAlias.id))
                .leftJoin(schemaStadiums, eq(matches.stadiumId, schemaStadiums.id))
                .leftJoin(schemaGroups, eq(matches.groupId, schemaGroups.id));

            const total = Number(totalResult[0].count);
            
            return { data: matchesWithDivisions, total, page, limit };
        } catch (error) {
            console.error("Error in findAllPaginated:", error);
            // Check if the error is specifically the alias error
            if (error.message && error.message.includes('alias')) {
                throw new BadRequestException('Failed to fetch paginated matches due to a table alias issue');
            }
            throw new BadRequestException(`Failed to fetch paginated matches: ${error.message}`);
        }
    }

    /**
     * Get match by ID
     */
async findOne(id: number) {
    try {
        const homeClubAlias = aliasedTable(schemaClubs, 'home_club');
        const awayClubAlias = aliasedTable(schemaClubs, 'away_club');

        const matchResults = await this.db
            .select({
                id: matches.id,
                sportId: matches.sportId,
                leagueId: matches.leagueId,
                seasonId: matches.seasonId,
                roundId: matches.roundId,
                groupId: matches.groupId,
                homeClubId: matches.homeClubId,
                awayClubId: matches.awayClubId,
                stadiumId: matches.stadiumId,
                date: matches.date,
                status: matches.status,
                homeScore: matches.homeScore,
                awayScore: matches.awayScore,
                createdAt: matches.createdAt,
                updatedAt: matches.updatedAt,
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
                    id: schemaStadiums.id,
                    name: schemaStadiums.name,
                },
                group: {
                    id: schemaGroups.id,
                    name: schemaGroups.name,
                },
            })
            .from(matches)
            .leftJoin(schema.sports, eq(matches.sportId, schema.sports.id))
            .leftJoin(schema.leagues, eq(matches.leagueId, schema.leagues.id))
            .leftJoin(schema.seasons, eq(matches.seasonId, schema.seasons.id))
            .leftJoin(schema.rounds, eq(matches.roundId, schema.rounds.id))
            .leftJoin(homeClubAlias, eq(matches.homeClubId, homeClubAlias.id))
            .leftJoin(awayClubAlias, eq(matches.awayClubId, awayClubAlias.id))
            .leftJoin(schemaStadiums, eq(matches.stadiumId, schemaStadiums.id))
            .leftJoin(schemaGroups, eq(matches.groupId, schemaGroups.id))
            .where(eq(matches.id, id))
            .limit(1);

        if (!matchResults || matchResults.length === 0) {
            throw new NotFoundException(`Match with ID ${id} not found`);
        }

        const match = matchResults[0];

        // ----------------------------
        // AVAILABLE STADIUMS
        // ----------------------------
        const clubStadiums = await this.db
            .select({
                stadiumId: schema.clubStadiums.stadiumId,
            })
            .from(schema.clubStadiums)
            .where(eq(schema.clubStadiums.clubId, match.homeClubId));

        const stadiumIds = clubStadiums.map(cs => cs.stadiumId);

        let associatedStadiums = [];
        if (stadiumIds.length > 0) {
            associatedStadiums = await this.db
                .select()
                .from(schemaStadiums)
                .where(inArray(schemaStadiums.id, stadiumIds));
        }

        // ----------------------------
        // MATCH DIVISIONS
        // ----------------------------
        const matchWithDivisions = await this.attachMatchDivisions([match]);

        return {
            ...matchWithDivisions[0],
            availableStadiums: associatedStadiums
        };

    } catch (error) {
        if (error instanceof NotFoundException) throw error;
        throw new BadRequestException('Failed to fetch match');
    }
}

    async ensureExists(id: number) {
        const result = await this.db
            .select({ id: matches.id })
            .from(matches)
            .where(eq(matches.id, id))
            .limit(1);

        if (!result.length) {
            throw new NotFoundException(`Match with ID ${id} not found`);
        }
    }


    /**
     * Create new match
     */
    async create(createMatchDto: CreateMatchDto) {
        try {
            // Verify group exists
            if (createMatchDto.groupId) {
                const group = await this.db
                    .select()
                    .from(groups)
                    .where(eq(groups.id, createMatchDto.groupId))
                    .limit(1);

                if (!group || group.length === 0) {
                    throw new BadRequestException(`Group with ID ${createMatchDto.groupId} not found`);
                }
            }

            // Verify clubs exist (home and away)
            const homeClub = await this.db
                .select()
                .from(schemaClubs)
                .where(eq(schemaClubs.id, createMatchDto.homeClubId))
                .limit(1);

            if (!homeClub || homeClub.length === 0) {
                throw new BadRequestException(`Home club with ID ${createMatchDto.homeClubId} not found`);
            }

            const awayClub = await this.db
                .select()
                .from(schemaClubs)
                .where(eq(schemaClubs.id, createMatchDto.awayClubId))
                .limit(1);

            if (!awayClub || awayClub.length === 0) {
                throw new BadRequestException(`Away club with ID ${createMatchDto.awayClubId} not found`);
            }

            // Insert the new match, ensuring all required fields are provided
            const result = await this.db
                .insert(matches)
                .values({
                    sportId: createMatchDto.sportId,
                    leagueId: createMatchDto.leagueId,
                    seasonId: createMatchDto.seasonId,
                    roundId: createMatchDto.roundId, // This is required according to the schema
                    groupId: createMatchDto.groupId || null,
                    homeClubId: createMatchDto.homeClubId,
                    awayClubId: createMatchDto.awayClubId,
                    stadiumId: createMatchDto.stadiumId || null,
                    date: new Date(createMatchDto.date),
                    status: createMatchDto.status || 'Scheduled', // Use provided status or default
                    homeScore: createMatchDto.homeScore || null,
                    awayScore: createMatchDto.awayScore || null,
                })
                .returning();

            return result[0];
        } catch (error) {
            if (error instanceof BadRequestException) throw error;
            throw new BadRequestException('Failed to create match');
        }
    }

    /**
     * Update match
     */
    async update(id: number, updateMatchDto: UpdateMatchDto) {
        try {
            // Verify match exists
            await this.ensureExists(id);

            // If updating group, verify it exists
            if (updateMatchDto.groupId) {
                const group = await this.db
                    .select()
                    .from(groups)
                    .where(eq(groups.id, updateMatchDto.groupId))
                    .limit(1);

                if (!group || group.length === 0) {
                    throw new BadRequestException(`Group with ID ${updateMatchDto.groupId} not found`);
                }
            }

            // If updating clubs, verify they exist
            if (updateMatchDto.homeClubId) {
                const homeClub = await this.db
                    .select()
                    .from(schemaClubs)
                    .where(eq(schemaClubs.id, updateMatchDto.homeClubId))
                    .limit(1);

                if (!homeClub || homeClub.length === 0) {
                    throw new BadRequestException(`Home club with ID ${updateMatchDto.homeClubId} not found`);
                }
            }

            if (updateMatchDto.awayClubId) {
                const awayClub = await this.db
                    .select()
                    .from(schemaClubs)
                    .where(eq(schemaClubs.id, updateMatchDto.awayClubId))
                    .limit(1);

                if (!awayClub || awayClub.length === 0) {
                    throw new BadRequestException(`Away club with ID ${updateMatchDto.awayClubId} not found`);
                }
            }

            // Update the match, handling date conversion
            const updateData: any = { ...updateMatchDto, updatedAt: new Date() };
            if (updateData.date) {
                updateData.date = new Date(updateData.date);
            }
            // Properly handle score updates - ensure scores are set to null when explicitly sent as null
            if ('homeScore' in updateData) {
                updateData.homeScore = updateData.homeScore === null || updateData.homeScore === undefined ? null : updateData.homeScore;
            }
            if ('awayScore' in updateData) {
                updateData.awayScore = updateData.awayScore === null || updateData.awayScore === undefined ? null : updateData.awayScore;
            }

            const result = await this.db
                .update(matches)
                .set(updateData)
                .where(eq(matches.id, id))
                .returning();

            const updatedMatch = result[0];

            return {
                ...updatedMatch,
                status: updatedMatch.status as MatchStatus,
            };

        } catch (error) {
            //   if (error instanceof BadRequestException || error instanceof NotFoundException)
            //     throw error;
            //   throw new BadRequestException('Failed to update match');
            console.error('findOne error:', error);
            throw error;
        }
    }

    /**
     * Get matches by group
     */
    async findByGroup(groupId: number) {
        try {
            // Verify group exists
            const group = await this.db
                .select()
                .from(groups)
                .where(eq(groups.id, groupId))
                .limit(1);

            if (!group || group.length === 0) {
                throw new NotFoundException(`Group with ID ${groupId} not found`);
            }

            const homeClubAlias = aliasedTable(schemaClubs, 'home_club');
            const awayClubAlias = aliasedTable(schemaClubs, 'away_club');

            const results = await this.db
                .select({
                    id: matches.id,
                    sportId: matches.sportId,
                    leagueId: matches.leagueId,
                    seasonId: matches.seasonId,
                    roundId: matches.roundId,
                    groupId: matches.groupId,
                    homeClubId: matches.homeClubId,
                    awayClubId: matches.awayClubId,
                    stadiumId: matches.stadiumId,
                    date: matches.date,
                    status: matches.status,
                    homeScore: matches.homeScore,
                    awayScore: matches.awayScore,
                    createdAt: matches.createdAt,
                    updatedAt: matches.updatedAt,
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
                        id: schemaStadiums.id,
                        name: schemaStadiums.name,
                    },
                    group: {
                        id: schemaGroups.id,
                        name: schemaGroups.name,
                    },
                })
                .from(matches)
                .leftJoin(schema.sports, eq(matches.sportId, schema.sports.id))
                .leftJoin(schema.leagues, eq(matches.leagueId, schema.leagues.id))
                .leftJoin(schema.seasons, eq(matches.seasonId, schema.seasons.id))
                .leftJoin(schema.rounds, eq(matches.roundId, schema.rounds.id))
                .leftJoin(homeClubAlias, eq(matches.homeClubId, homeClubAlias.id)) // Join for home club
                .leftJoin(awayClubAlias, eq(matches.awayClubId, awayClubAlias.id)) // Join for away club
                .leftJoin(schemaStadiums, eq(matches.stadiumId, schemaStadiums.id))
                .leftJoin(schemaGroups, eq(matches.groupId, schemaGroups.id))
                .where(eq(matches.groupId, groupId));
            return results.map(match => ({ ...match, status: match.status as MatchStatus }));
        } catch (error) {
            if (error instanceof NotFoundException) throw error;
            throw new BadRequestException('Failed to fetch matches by group');
        }
    }

    /**
     * Get matches by sport, league, season, and optional group
     */
    async findBySportLeagueSeasonAndGroup(sportId: number, leagueId: number, seasonId: number, groupId: number | null) {
        try {
            const homeClubAlias = aliasedTable(schemaClubs, 'home_club');
            const awayClubAlias = aliasedTable(schemaClubs, 'away_club');

            let whereCondition;
            if (groupId) {
                whereCondition = and(
                    eq(matches.sportId, sportId),
                    eq(matches.leagueId, leagueId),
                    eq(matches.seasonId, seasonId),
                    eq(matches.groupId, groupId)
                );
            } else {
                whereCondition = and(
                    eq(matches.sportId, sportId),
                    eq(matches.leagueId, leagueId),
                    eq(matches.seasonId, seasonId)
                );
            }

            const results = await this.db
                .select({
                    id: matches.id,
                    sportId: matches.sportId,
                    leagueId: matches.leagueId,
                    seasonId: matches.seasonId,
                    roundId: matches.roundId,
                    groupId: matches.groupId,
                    homeClubId: matches.homeClubId,
                    awayClubId: matches.awayClubId,
                    stadiumId: matches.stadiumId,
                    date: matches.date,
                    status: matches.status,
                    homeScore: matches.homeScore,
                    awayScore: matches.awayScore,
                    createdAt: matches.createdAt,
                    updatedAt: matches.updatedAt,
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
                        id: schemaStadiums.id,
                        name: schemaStadiums.name,
                    },
                    group: {
                        id: schemaGroups.id,
                        name: schemaGroups.name,
                    },
                })
                .from(matches)
                .leftJoin(schema.sports, eq(matches.sportId, schema.sports.id))
                .leftJoin(schema.leagues, eq(matches.leagueId, schema.leagues.id))
                .leftJoin(schema.seasons, eq(matches.seasonId, schema.seasons.id))
                .leftJoin(schema.rounds, eq(matches.roundId, schema.rounds.id))
                .leftJoin(homeClubAlias, eq(matches.homeClubId, homeClubAlias.id)) // Join for home club
                .leftJoin(awayClubAlias, eq(matches.awayClubId, awayClubAlias.id)) // Join for away club
                .leftJoin(schemaStadiums, eq(matches.stadiumId, schemaStadiums.id))
                .leftJoin(schemaGroups, eq(matches.groupId, schemaGroups.id))
                .where(whereCondition);
            return results.map(match => ({ ...match, status: match.status as MatchStatus }));
        } catch (error) {
            throw new BadRequestException('Failed to fetch matches by sport, league, season and group');
        }
    }

    /**
     * Get matches by season and round
     */
    async findBySeasonAndRound(seasonId: number, roundId: number) {
        try {
            const homeClubAlias = aliasedTable(schemaClubs, 'home_club');
            const awayClubAlias = aliasedTable(schemaClubs, 'away_club');

            // 1️⃣ Fetch matches (UNCHANGED QUERY, just stored in a variable)
            const matchesData = await this.db
                .select({
                    id: matches.id,
                    sportId: matches.sportId,
                    leagueId: matches.leagueId,
                    seasonId: matches.seasonId,
                    roundId: matches.roundId,
                    groupId: matches.groupId,
                    homeClubId: matches.homeClubId,
                    awayClubId: matches.awayClubId,
                    stadiumId: matches.stadiumId,
                    date: matches.date,
                    status: matches.status,
                    homeScore: matches.homeScore,
                    awayScore: matches.awayScore,
                    createdAt: matches.createdAt,
                    updatedAt: matches.updatedAt,
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
                        id: schemaStadiums.id,
                        name: schemaStadiums.name,
                    },
                    group: {
                        id: schemaGroups.id,
                        name: schemaGroups.name,
                    },
                })
                .from(matches)
                .leftJoin(schema.sports, eq(matches.sportId, schema.sports.id))
                .leftJoin(schema.leagues, eq(matches.leagueId, schema.leagues.id))
                .leftJoin(schema.seasons, eq(matches.seasonId, schema.seasons.id))
                .leftJoin(schema.rounds, eq(matches.roundId, schema.rounds.id))
                .leftJoin(homeClubAlias, eq(matches.homeClubId, homeClubAlias.id))
                .leftJoin(awayClubAlias, eq(matches.awayClubId, awayClubAlias.id))
                .leftJoin(schemaStadiums, eq(matches.stadiumId, schemaStadiums.id))
                .leftJoin(schemaGroups, eq(matches.groupId, schemaGroups.id))
                .where(
                    and(
                        eq(matches.seasonId, seasonId),
                        eq(matches.roundId, roundId),
                    ),
                );

            // 2️⃣ Attach available stadiums (NEW)
            const matchesWithStadiums =
                await this.attachAvailableStadiums(matchesData);

            // 3️⃣ Return enriched matches
            return matchesWithStadiums;

        } catch (error) {
            throw new BadRequestException('Failed to fetch matches by season and round');
        }
    }

    /**
     * Get matches by season and date
     */
    async findBySeasonAndDate(seasonId: number, date: string) {
        try {
            const homeClubAlias = aliasedTable(schemaClubs, 'home_club');
            const awayClubAlias = aliasedTable(schemaClubs, 'away_club');

            // Convert the date string to a date object and create a range for the whole day
            const startDate = new Date(date);
            startDate.setHours(0, 0, 0, 0);

            const endDate = new Date(date);
            endDate.setHours(23, 59, 59, 999);

            // 1️⃣ Fetch matches (UNCHANGED QUERY, just stored in a variable)
            const matchesData = await this.db
                .select({
                    id: matches.id,
                    sportId: matches.sportId,
                    leagueId: matches.leagueId,
                    seasonId: matches.seasonId,
                    roundId: matches.roundId,
                    groupId: matches.groupId,
                    homeClubId: matches.homeClubId,
                    awayClubId: matches.awayClubId,
                    stadiumId: matches.stadiumId,
                    date: matches.date,
                    status: matches.status,
                    homeScore: matches.homeScore,
                    awayScore: matches.awayScore,
                    createdAt: matches.createdAt,
                    updatedAt: matches.updatedAt,
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
                        id: schemaStadiums.id,
                        name: schemaStadiums.name,
                    },
                    group: {
                        id: schemaGroups.id,
                        name: schemaGroups.name,
                    },
                })
                .from(matches)
                .leftJoin(schema.sports, eq(matches.sportId, schema.sports.id))
                .leftJoin(schema.leagues, eq(matches.leagueId, schema.leagues.id))
                .leftJoin(schema.seasons, eq(matches.seasonId, schema.seasons.id))
                .leftJoin(schema.rounds, eq(matches.roundId, schema.rounds.id))
                .leftJoin(homeClubAlias, eq(matches.homeClubId, homeClubAlias.id))
                .leftJoin(awayClubAlias, eq(matches.awayClubId, awayClubAlias.id))
                .leftJoin(schemaStadiums, eq(matches.stadiumId, schemaStadiums.id))
                .leftJoin(schemaGroups, eq(matches.groupId, schemaGroups.id))
                .where(
                    and(
                        eq(matches.seasonId, seasonId),
                        gte(matches.date, startDate),
                        lte(matches.date, endDate),
                    ),
                );

            // 2️⃣ Attach available stadiums (NEW)
            const matchesWithStadiums =
                await this.attachAvailableStadiums(matchesData);

            // 3️⃣ Return enriched matches
            return matchesWithStadiums;

        } catch (error) {
            throw new BadRequestException('Failed to fetch matches by season and date');
        }
    }

    /**
     * Update match score (sport-specific scoring rules applied)
     */
    async updateScore(id: number, updateScoreDto: UpdateMatchScoreDto) {
        try {
            // Verify match exists
            const match = await this.findOne(id);
            // Update match with score
            const result = await this.db
                .update(matches)
                .set({
                    homeScore: updateScoreDto.homeScore,
                    awayScore: updateScoreDto.awayScore,
                    status: 'Finished',
                    updatedAt: new Date(),
                })
                .where(eq(matches.id, id))
                .returning();

            // Trigger standings calculation
            const updatedMatch = result[0];

            // Fetch league and sport info
            const leagueInfo = await this.db
                .select({
                    sportName: sports.name,
                })
                .from(leagues)
                .innerJoin(sports, eq(leagues.sportId, sports.id))
                .where(eq(leagues.id, updatedMatch.leagueId))
                .limit(1);

            if (leagueInfo && leagueInfo.length > 0) {
                const sportName = leagueInfo[0].sportName;
                // Calculate stats using the standings calculator service
                const stats = this.standingsCalculator.calculate(sportName, updatedMatch);

                // Update Home Team Standings
                await this.standingsService.recordRoundStats(updatedMatch.roundId, updatedMatch.groupId, updatedMatch.homeClubId, stats.home);

                // Update Away Team Standings
                await this.standingsService.recordRoundStats(updatedMatch.roundId, updatedMatch.groupId, updatedMatch.awayClubId, stats.away);
            }

            return result[0];
        } catch (error) {
            if (error instanceof NotFoundException) throw error;
            throw new BadRequestException('Failed to update match score');
        }
    }

    /**
     * Delete match
     */
    async remove(id: number) {
        try {
            // Verify match exists
            await this.findOne(id);

            // Check if match has any divisions or events
            const divisions = await this.db
                .select()
                .from(schema.matchDivisions)
                .where(eq(schema.matchDivisions.matchId, id))
                .limit(1);

            if (divisions && divisions.length > 0) {
                throw new BadRequestException(
                    'Cannot delete match. Match divisions are recorded.',
                );
            }

            const events = await this.db
                .select()
                .from(schema.matchEvents)
                .where(eq(schema.matchEvents.matchId, id))
                .limit(1);

            if (events && events.length > 0) {
                throw new BadRequestException(
                    'Cannot delete match. Match events are recorded.',
                );
            }

            const result = await this.db
                .delete(matches)
                .where(eq(matches.id, id))
                .returning();

            return result[0];
        } catch (error) {
            if (error instanceof BadRequestException || error instanceof NotFoundException)
                throw error;
            throw new BadRequestException('Failed to delete match');
        }
    }

    // Reusable helper to load all available stadiums for home clubs in matches
    private async attachAvailableStadiums(matches: any[]) {
        if (!matches.length) return matches;

        const clubIds = [
            ...new Set(matches.map(m => m.homeClubId).filter(Boolean))
        ];

        const rows = await this.db
            .select({
                clubId: schema.clubStadiums.clubId,
                stadiumId: schemaStadiums.id,
                stadiumName: schemaStadiums.name,
            })
            .from(schema.clubStadiums)
            .innerJoin(
                schemaStadiums,
                eq(schema.clubStadiums.stadiumId, schemaStadiums.id),
            )
            .where(inArray(schema.clubStadiums.clubId, clubIds));

        const stadiumsByClub = rows.reduce((acc, row) => {
            acc[row.clubId] ??= [];
            acc[row.clubId].push({
                id: row.stadiumId,
                name: row.stadiumName,
            });
            return acc;
        }, {} as Record<number, any[]>);

        return matches.map(match => ({
            ...match,
            availableStadiums: stadiumsByClub[match.homeClubId] ?? [],
        }));
    }

    private async attachMatchDivisions(matches: any[]) {
        if (!matches.length) return matches;
        const matchIds = matches.map(m => m.id);
        const divisions = await this.db
            .select()
            .from(schema.matchDivisions)
            .where(inArray(schema.matchDivisions.matchId, matchIds));
        // Agrupar por matchId
        const divisionsByMatch = divisions.reduce((acc, division) => {
            acc[division.matchId] ??= [];
            acc[division.matchId].push(division);
            return acc;
        }, {} as Record<number, any[]>);
        return matches.map(match => ({
            ...match,
            matchDivisions: divisionsByMatch[match.id] ?? [],
        }));
    }
}