import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from '../db/schema';
import { CreateSeasonDto, UpdateSeasonDto } from '../common/dtos';
export declare class SeasonsService {
    private db;
    constructor(db: NodePgDatabase<typeof schema>);
    findAllPaginated(page: number, limit: number, sortBy: string, sortOrder: 'asc' | 'desc'): Promise<{
        data: {
            id: number;
            sportId: number;
            leagueId: number;
            startYear: number;
            endYear: number;
            status: string;
            flgDefault: boolean;
            numberOfGroups: number;
            createdAt: Date;
            sport: {
                id: number;
                name: string;
            };
            league: {
                id: number;
                secondaryName: string;
            };
        }[];
        total: number;
        page: number;
        limit: number;
    }>;
    findAll(): Promise<{
        id: number;
        sportId: number;
        leagueId: number;
        startYear: number;
        endYear: number;
        status: string;
        flgDefault: boolean;
        numberOfGroups: number;
        createdAt: Date;
        sport: {
            id: number;
            name: string;
        };
        league: {
            id: number;
            secondaryName: string;
        };
    }[]>;
    findOne(id: number): Promise<{
        id: number;
        sportId: number;
        leagueId: number;
        startYear: number;
        endYear: number;
        status: string;
        flgDefault: boolean;
        numberOfGroups: number;
        createdAt: Date;
    }>;
    findAllByLeague(leagueId: number): Promise<{
        id: number;
        sportId: number;
        leagueId: number;
        startYear: number;
        endYear: number;
        status: string;
        flgDefault: boolean;
        numberOfGroups: number;
        sport: {
            id: number;
            name: string;
            reducedName: string;
            type: string;
            divisionType: string;
            minMatchDivisionNumber: number;
            maxMatchDivisionNumber: number;
            divisionTime: number;
            scoreType: string;
            hasOvertime: boolean;
            hasPenalties: boolean;
            flgDefault: boolean;
            imageUrl: string;
            createdAt: Date;
        };
        league: {
            id: number;
            originalName: string;
            secondaryName: string;
            sportId: number;
            countryId: number;
            cityId: number;
            numberOfRoundsMatches: number;
            minDivisionsNumber: number;
            maxDivisionsNumber: number;
            divisionsTime: number;
            hasOvertimeOverride: boolean;
            hasPenaltiesOverride: boolean;
            hasAscends: boolean;
            ascendsQuantity: number;
            hasDescends: boolean;
            descendsQuantity: number;
            hasSubLeagues: boolean;
            numberOfSubLeagues: number;
            flgRoundAutomatic: boolean;
            typeOfSchedule: string;
            imageUrl: string;
            flgDefault: boolean;
            createdAt: Date;
        };
        createdAt: Date;
    }[]>;
    findByLeague(leagueId: number): Promise<{
        id: number;
        sportId: number;
        leagueId: number;
        startYear: number;
        endYear: number;
        status: string;
        flgDefault: boolean;
        numberOfGroups: number;
        createdAt: Date;
    }[]>;
    findDefaultSeasonByLeague(leagueId: number, excludeSeasonId?: number): Promise<{
        id: number;
        sportId: number;
        leagueId: number;
        startYear: number;
        endYear: number;
        status: string;
        flgDefault: boolean;
        numberOfGroups: number;
        createdAt: Date;
    }>;
    create(createSeasonDto: CreateSeasonDto): Promise<{
        id: number;
        flgDefault: boolean;
        createdAt: Date;
        sportId: number;
        leagueId: number;
        startYear: number;
        endYear: number;
        status: string;
        numberOfGroups: number;
    }>;
    update(id: number, updateSeasonDto: UpdateSeasonDto): Promise<{
        id: number;
        sportId: number;
        leagueId: number;
        startYear: number;
        endYear: number;
        status: string;
        flgDefault: boolean;
        numberOfGroups: number;
        createdAt: Date;
    }>;
    changeDefaultSeason(currentDefaultId: number, newDefaultId: number): Promise<{
        id: number;
        sportId: number;
        leagueId: number;
        startYear: number;
        endYear: number;
        status: string;
        flgDefault: boolean;
        numberOfGroups: number;
        createdAt: Date;
    }>;
    remove(id: number): Promise<{
        id: number;
        flgDefault: boolean;
        createdAt: Date;
        sportId: number;
        leagueId: number;
        startYear: number;
        endYear: number;
        status: string;
        numberOfGroups: number;
    }>;
}
