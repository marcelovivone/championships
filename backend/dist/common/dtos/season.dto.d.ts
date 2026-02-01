export declare class CreateSeasonDto {
    sportId: number;
    leagueId: number;
    startYear: number;
    endYear: number;
    status: 'planned' | 'active' | 'finished';
    flgDefault?: boolean;
    numberOfGroups?: number;
}
declare const UpdateSeasonDto_base: import("@nestjs/mapped-types").MappedType<Partial<CreateSeasonDto>>;
export declare class UpdateSeasonDto extends UpdateSeasonDto_base {
}
export declare class SeasonResponseDto extends CreateSeasonDto {
    id: number;
    createdAt?: Date;
}
export {};
