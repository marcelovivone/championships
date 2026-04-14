import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from '../db/schema';
import { CreateStandingOrderRuleDto, UpdateStandingOrderRuleDto } from '../common/dtos';
export declare class StandingOrderRulesService {
    private db;
    constructor(db: NodePgDatabase<typeof schema>);
    findAll(params: any): Promise<{
        data: any;
        total: any;
    }>;
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
    resolveForLeagueAndSeason(leagueId: number, sportId: number, seasonStartYear: number): Promise<{
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
    remove(id: number): Promise<void>;
    resequence(sportId: number, leagueId: number | null, startYear: number | null): Promise<{
        resequenced: number;
    }>;
}
