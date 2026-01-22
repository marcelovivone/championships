export declare class CreateMatchDto {
    leagueId: number;
    seasonId: number;
    phaseId: number;
    roundId: number;
    groupId?: number;
    leagueDivisionId?: number;
    turn: number;
    homeClubId: number;
    awayClubId: number;
    stadiumId?: number;
    date: string;
    homeScore?: number;
    awayScore?: number;
    hasOvertime?: boolean;
    hasPenalties?: boolean;
}
declare const UpdateMatchDto_base: import("@nestjs/common").Type<Partial<CreateMatchDto>>;
export declare class UpdateMatchDto extends UpdateMatchDto_base {
}
export declare class MatchResponseDto {
    id: number;
    leagueId: number;
    seasonId: number;
    phaseId: number;
    roundId: number;
    groupId?: number;
    leagueDivisionId?: number;
    turn: number;
    homeClubId: number;
    awayClubId: number;
    stadiumId?: number;
    date: Date;
    homeScore?: number;
    awayScore?: number;
    hasOvertime?: boolean;
    hasPenalties?: boolean;
    status: string;
    createdAt?: Date;
    updatedAt?: Date;
}
export declare class UpdateMatchScoreDto {
    homeScore: number;
    awayScore: number;
    hasOvertime?: boolean;
    hasPenalties?: boolean;
}
export {};
