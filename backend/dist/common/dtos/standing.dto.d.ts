export declare class CreateStandingDto {
    leagueId: number;
    seasonId: number;
    phaseId: number;
    roundId: number;
    groupId?: number;
    leagueDivisionId?: number;
    clubId: number;
    points: number;
    played: number;
    wins: number;
    draws: number;
    losses: number;
    goalsFor: number;
    goalsAgainst: number;
    goalDifference: number;
    overtimeWins?: number;
    overtimeLosses?: number;
    penaltyWins?: number;
    penaltyLosses?: number;
    setsWon?: number;
    setsLost?: number;
    divisionsWon?: number;
    divisionsLost?: number;
    homeGamesPlayed: number;
    awayGamesPlayed: number;
    homeWins: number;
    homeLosses: number;
    homeDraws: number;
    awayWins: number;
    awayLosses: number;
    awayDraws: number;
}
declare const UpdateStandingDto_base: import("@nestjs/common").Type<Partial<CreateStandingDto>>;
export declare class UpdateStandingDto extends UpdateStandingDto_base {
}
export declare class StandingResponseDto extends CreateStandingDto {
    id: number;
    createdAt?: Date;
    updatedAt?: Date;
}
export {};
