import { StandingOrderRulesService } from './standing-order-rules.service';
import { CreateStandingOrderRuleDto, UpdateStandingOrderRuleDto } from '../common/dtos';
export declare class StandingOrderRulesController {
    private readonly service;
    constructor(service: StandingOrderRulesService);
    findAll(sportId?: string, leagueId?: string, page?: string, limit?: string, sortBy?: string, sortOrder?: string): Promise<{
        data: any;
        total: any;
    }>;
    resolve(leagueId: number, sportId: number, year: number): Promise<{
        id: number;
        sportId: number;
        leagueId: number;
        startYear: number;
        endYear: number;
        sortOrder: number;
        criterion: string;
        direction: string;
        createdAt: Date;
    }[]>;
    findOne(id: number): Promise<{
        id: number;
        sportId: number;
        leagueId: number;
        startYear: number;
        endYear: number;
        sortOrder: number;
        criterion: string;
        direction: string;
        createdAt: Date;
    }>;
    create(dto: CreateStandingOrderRuleDto): Promise<{
        id: number;
        createdAt: Date;
        sportId: number;
        leagueId: number;
        startYear: number;
        endYear: number;
        sortOrder: number;
        criterion: string;
        direction: string;
    }>;
    resequence(body: {
        sportId: number;
        leagueId?: number | null;
        startYear?: number | null;
    }): Promise<{
        resequenced: number;
    }>;
    update(id: number, dto: UpdateStandingOrderRuleDto): Promise<{
        id: number;
        sportId: number;
        leagueId: number;
        startYear: number;
        endYear: number;
        sortOrder: number;
        criterion: string;
        direction: string;
        createdAt: Date;
    }>;
    remove(id: number): Promise<{
        success: boolean;
    }>;
}
