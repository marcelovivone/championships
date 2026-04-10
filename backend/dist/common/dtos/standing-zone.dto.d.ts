export declare class CreateStandingZoneDto {
    sportId: number;
    leagueId: number;
    seasonId?: number;
    startPosition: number;
    endPosition: number;
    name: string;
    typeOfStanding?: 'All' | 'Combined' | 'Group';
    colorHex?: string;
    start_year?: number | null;
    end_year?: number | null;
    flg_priority?: boolean;
}
export declare class UpdateStandingZoneDto extends CreateStandingZoneDto {
}
export declare class StandingZoneResponseDto extends CreateStandingZoneDto {
    id: number;
    createdAt?: Date;
    updatedAt?: Date;
}
