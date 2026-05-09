import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from '../db/schema';
export declare class AdminService {
    private db;
    private readonly logger;
    constructor(db: NodePgDatabase<typeof schema>);
    private convertToLocalTimezone;
    private applyManualAdjustment;
    private buildMatchQuery;
    performTimezoneAdjustment(dto: {
        leagueId: number;
        seasonId?: number;
        roundId?: number;
        roundIds?: number[];
        startDate?: string;
        endDate?: string;
        matchId?: number;
        adjustmentType: 'country' | 'manual' | 'set';
        manualHours?: number;
        setTime?: string;
        setDate?: string;
        countryTimezone?: string;
    }): Promise<{
        success: boolean;
        matchesUpdated: number;
        standingsRecalculated: number;
        message: string;
        details?: undefined;
    } | {
        success: boolean;
        matchesUpdated: number;
        standingsRecalculated: number;
        details: {
            adjustmentType: "manual" | "country" | "set";
            timezone: string;
            manualHours: number;
            setTime: string;
            setDate: string;
            executionTimeMs: number;
            updatedMatchIds: number[];
        };
        message?: undefined;
    }>;
}
