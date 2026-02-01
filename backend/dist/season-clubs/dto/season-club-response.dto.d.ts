export declare class SeasonClubResponseDto {
    id: number;
    sportId: number;
    leagueId: number;
    seasonId: number;
    clubId: number;
    groupId?: number;
    createdAt: Date;
    sport?: {
        id: number;
        name: string;
    };
    league?: {
        id: number;
        originalName: string;
        secondaryName: string;
    };
    season?: {
        id: number;
        startYear: number;
        endYear: number;
    };
    club?: {
        id: number;
        name: string;
        imageUrl: string;
    };
    group?: {
        id: number;
        name: string;
    };
}
