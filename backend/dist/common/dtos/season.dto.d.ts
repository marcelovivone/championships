export declare class CreateSeasonDto {
    sportId: number;
    leagueId: number;
    startYear: number;
    endYear: number;
    status: 'planned' | 'active' | 'finished';
    flgDefault?: boolean;
    numberOfGroups?: number;
    flgHasPostseason?: boolean;
    currentPhase?: 'Regular' | 'Play-ins' | 'Playoffs';
    currentPhaseDetail?: 'Regular' | 'Play-ins' | 'Round of 64' | 'Round of 32' | 'Round of 16' | 'Quarterfinals' | 'Semifinals' | 'Finals';
}
declare const UpdateSeasonDto_base: import("@nestjs/mapped-types").MappedType<Partial<CreateSeasonDto>>;
export declare class UpdateSeasonDto extends UpdateSeasonDto_base {
}
export declare class SeasonResponseDto extends CreateSeasonDto {
    id: number;
    createdAt?: Date;
}
export {};
