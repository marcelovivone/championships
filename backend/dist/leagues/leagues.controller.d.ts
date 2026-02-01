import { LeaguesService } from './leagues.service';
import { CreateLeagueDto, UpdateLeagueDto, LeagueResponseDto } from '../common/dtos';
export declare class LeaguesController {
    private readonly leaguesService;
    constructor(leaguesService: LeaguesService);
    findAll(page?: string, limit?: string, sortBy?: string, sortOrder?: string, sportId?: string): Promise<{
        id: number;
        originalName: string;
        secondaryName: string;
        sportId: number;
        countryId: number;
        cityId: number;
        flgDefault: boolean;
        typeOfSchedule: string;
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
        imageUrl: string;
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
        country: {
            id: number;
            name: string;
            continent: string;
            code: string;
            flagUrl: string;
            createdAt: Date;
        };
        city: {
            id: number;
            name: string;
            countryId: number;
            createdAt: Date;
        };
        createdAt: Date;
    }[] | {
        data: {
            id: number;
            originalName: string;
            secondaryName: string;
            sportId: number;
            countryId: number;
            cityId: number;
            flgDefault: boolean;
            typeOfSchedule: string;
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
            imageUrl: string;
            createdAt: Date;
            sport: {
                id: number;
                name: string;
            };
            country: {
                id: number;
                name: string;
            };
        }[];
        total: number;
        page: number;
        limit: number;
    }>;
    findOne(id: number): Promise<LeagueResponseDto>;
    create(createLeagueDto: CreateLeagueDto): Promise<LeagueResponseDto>;
    update(id: number, updateLeagueDto: UpdateLeagueDto): Promise<LeagueResponseDto>;
    remove(id: number): Promise<void>;
    addLink(leagueId: number, createLeagueLinkDto: any): Promise<{
        id: number;
        createdAt: Date;
        leagueId: number;
        label: string;
        url: string;
    }>;
    removeLink(leagueId: number, linkId: number): Promise<void>;
}
