export declare class CreateMatchDto {
    sportId: number;
    leagueId: number;
    seasonId: number;
    roundId?: number;
    groupId?: number;
    homeClubId: number;
    awayClubId: number;
    stadiumId?: number;
    date: string;
    homeScore?: number;
    awayScore?: number;
}
declare const UpdateMatchDto_base: import("@nestjs/common").Type<Partial<CreateMatchDto>>;
export declare class UpdateMatchDto extends UpdateMatchDto_base {
}
export declare class MatchResponseDto {
    id: number;
    leagueId: number;
    seasonId: number;
    roundId: number;
    groupId?: number;
    homeClubId: number;
    awayClubId: number;
    stadiumId?: number;
    date: Date;
    homeScore?: number;
    awayScore?: number;
    status: string;
    createdAt?: Date;
    updatedAt?: Date;
}
export declare class UpdateMatchScoreDto {
    homeScore: number;
    awayScore: number;
}
export {};
