import { SeasonsService } from './seasons.service';
export declare class SeasonsController {
    private readonly seasonsService;
    constructor(seasonsService: SeasonsService);
    findAll(page?: string, limit?: string, sortBy?: string, sortOrder?: string, leagueId?: string): Promise<{
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
    }[] | {
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
    create(createDto: any): Promise<{
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
    update(id: number, updateDto: any): Promise<{
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
