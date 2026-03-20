export type OperationType = 'push' | 'delete';
export interface StandingStats {
    points: number;
    played: number;
    wins: number;
    draws: number;
    losses: number;
    goalsFor: number;
    goalsAgainst: number;
    homeGamesPlayed: number;
    awayGamesPlayed: number;
    homePoints: number;
    awayPoints: number;
    homeWins: number;
    homeLosses: number;
    homeDraws: number;
    homeGoalsFor: number;
    homeGoalsAgainst: number;
    awayWins: number;
    awayLosses: number;
    awayDraws: number;
    awayGoalsFor: number;
    awayGoalsAgainst: number;
    overtimeWins: number;
    overtimeLosses: number;
    penaltyWins: number;
    penaltyLosses: number;
    setsWon: number;
    setsLost: number;
}
export declare class StandingsCalculatorService {
    calculate(sportName: string, match: any, previousHomeStanding?: any, previousAwayStanding?: any): {
        home: StandingStats;
        away: StandingStats;
    };
    private calculateGeneralRule;
    private calculateIceHockey;
    private calculateBasketball;
    private calculateVolleyball;
}
