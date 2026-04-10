import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from '../db/schema';
import { CreateStandingZoneDto, UpdateStandingZoneDto } from '../common/dtos';
export declare class StandingZonesService {
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
        seasonId: number;
        startPosition: number;
        endPosition: number;
        name: string;
        typeOfStanding: "All" | "Combined" | "Group";
        start_year: number;
        end_year: number;
        flg_priority: boolean;
        colorHex: string;
        createdAt: Date;
        updatedAt: Date;
    }>;
    create(dto: CreateStandingZoneDto): Promise<{
        id: number;
        sportId: number;
        leagueId: number;
        seasonId: number;
        startPosition: number;
        endPosition: number;
        name: string;
        typeOfStanding: "All" | "Combined" | "Group";
        start_year: number;
        end_year: number;
        flg_priority: boolean;
        colorHex: string;
        createdAt: Date;
        updatedAt: Date;
    }>;
    update(id: number, dto: UpdateStandingZoneDto): Promise<{
        id: number;
        sportId: number;
        leagueId: number;
        seasonId: number;
        startPosition: number;
        endPosition: number;
        name: string;
        typeOfStanding: "All" | "Combined" | "Group";
        start_year: number;
        end_year: number;
        flg_priority: boolean;
        colorHex: string;
        createdAt: Date;
        updatedAt: Date;
    }>;
    remove(id: number): Promise<void>;
}
