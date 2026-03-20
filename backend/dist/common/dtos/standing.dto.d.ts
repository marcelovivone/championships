export declare class CreateStandingDto {
    sportId: number;
    leagueId: number;
    seasonId: number;
    roundId: number;
    matchDate: string;
    groupId?: number;
    matchId: number;
    homeClubId: number;
    awayClubId: number;
    homeScore?: number;
    awayScore?: number;
    played: number;
    wins: number;
    draws: number;
    losses: number;
    goalsFor: number;
    goalsAgainst: number;
    overtimeWins?: number;
    overtimeLosses?: number;
    penaltyWins?: number;
    penaltyLosses?: number;
    setsWon?: number;
    setsLost?: number;
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
    matchDivisions?: any[];
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
