import { H2HCalculator } from './h2h-calculator';
export interface TiebreakerCriterion {
    sortOrder: number;
    criterion: string;
    direction: string;
}
export declare class TiebreakerEngine {
    private readonly h2hCalculator;
    constructor(h2hCalculator: H2HCalculator);
    sort(rows: any[], criteria: TiebreakerCriterion[], seasonId: number, leagueId: number, maxDate: Date | null, pointSystem?: string): Promise<any[]>;
    private groupByOverallStat;
    private groupByH2H;
    private splitIntoGroups;
    private getStatValue;
}
