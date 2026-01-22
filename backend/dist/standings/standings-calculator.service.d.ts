export interface StandingStats {
    points: number;
    played: number;
    wins: number;
    draws: number;
    losses: number;
    goalsFor: number;
    goalsAgainst: number;
    overtimeWins: number;
    overtimeLosses: number;
    penaltyWins: number;
    penaltyLosses: number;
    setsWon: number;
    setsLost: number;
}
export declare class StandingsCalculatorService {
    calculate(sportName: string, match: any): {
        home: StandingStats;
        away: StandingStats;
    };
    private calculateGeneralRule;
    private calculateBasketball;
    private calculateIceHockey;
    private calculateVolleyball;
}
