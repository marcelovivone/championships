import { LeaguesService } from './leagues.service';
import { CreateLeagueDto, PaginationDto, UpdateLeagueDto, LeagueResponseDto } from '../common/dtos';
export declare class LeaguesController {
    private readonly leaguesService;
    constructor(leaguesService: LeaguesService);
    findAll(paginationDto: PaginationDto, sportId?: string): Promise<{
        data: {
            id: number;
            originalName: string;
            secondaryName: string;
            sportId: number;
            countryId: number;
            cityId: number;
            startYear: number;
            endYear: number;
            numberOfTurns: number;
            numberOfRounds: number;
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
            imageUrl: string;
            createdAt: Date;
        }[];
        total: number;
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
