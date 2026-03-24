import { LeaguesService } from './leagues.service';
import { CreateLeagueDto, UpdateLeagueDto, LeagueResponseDto } from '../common/dtos';
export declare class LeaguesController {
    private readonly leaguesService;
    constructor(leaguesService: LeaguesService);
    findAll(page?: string, limit?: string, sortBy?: string, sortOrder?: string, sportId?: string): Promise<any[] | {
        data: any[];
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
