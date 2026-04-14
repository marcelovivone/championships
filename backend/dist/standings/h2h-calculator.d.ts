import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from '../db/schema';
export interface H2HStats {
    points: number;
    wins: number;
    played: number;
    gf: number;
    ga: number;
    awayGf: number;
    pointDiff: number;
    winPct: number;
}
export declare class H2HCalculator {
    private db;
    constructor(db: NodePgDatabase<typeof schema>);
    calculate(clubIds: number[], seasonId: number, leagueId: number, maxRoundId: number | null, maxDate: Date | null, pointSystem?: string): Promise<Record<number, H2HStats>>;
}
