import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from '../db/schema';
import { CreateRoundDto, UpdateRoundDto } from '../common/dtos';
export declare class RoundsService {
    private db;
    constructor(db: NodePgDatabase<typeof schema>);
    findAll(): Promise<{
        id: number;
        seasonId: number;
        leagueId: number;
        roundNumber: number;
        startDate: Date;
        endDate: Date;
        flgCurrent: boolean;
        createdAt: Date;
    }[]>;
    findAllPaginated(page: number, limit: number, sortBy: string, sortOrder: 'asc' | 'desc'): Promise<{
        data: {
            id: number;
            seasonId: number;
            leagueId: number;
            roundNumber: number;
            startDate: Date;
            endDate: Date;
            flgCurrent: boolean;
            createdAt: Date;
            league: {
                id: number;
                originalName: string;
            };
            season: {
                id: number;
                startYear: number;
                endYear: number;
            };
        }[];
        total: number;
        page: number;
        limit: number;
    }>;
    findOne(id: number): Promise<{
        id: number;
        leagueId: number;
        seasonId: number;
        roundNumber: number;
        startDate: Date;
        endDate: Date;
        flgCurrent: boolean;
        createdAt: Date;
    }>;
    findBySeason(seasonId: number): Promise<{
        id: number;
        leagueId: number;
        seasonId: number;
        roundNumber: number;
        startDate: Date;
        endDate: Date;
        flgCurrent: boolean;
        createdAt: Date;
    }[]>;
    findByLeague(leagueId: number): Promise<{
        id: number;
        leagueId: number;
        seasonId: number;
        roundNumber: number;
        startDate: Date;
        endDate: Date;
        flgCurrent: boolean;
        createdAt: Date;
    }[]>;
    create(createRoundDto: CreateRoundDto): Promise<{
        id: number;
        createdAt: Date;
        startDate: Date;
        endDate: Date;
        leagueId: number;
        seasonId: number;
        roundNumber: number;
        flgCurrent: boolean;
    }>;
    update(id: number, updateRoundDto: UpdateRoundDto): Promise<{
        id: number;
        leagueId: number;
        seasonId: number;
        roundNumber: number;
        startDate: Date;
        endDate: Date;
        flgCurrent: boolean;
        createdAt: Date;
    }>;
    remove(id: number): Promise<void>;
}
