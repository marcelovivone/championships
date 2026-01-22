export declare class CreateSeasonDto {
    leagueId: number;
    year: number;
    status: 'planned' | 'ongoing' | 'finished';
}
declare const UpdateSeasonDto_base: import("@nestjs/mapped-types").MappedType<Partial<CreateSeasonDto>>;
export declare class UpdateSeasonDto extends UpdateSeasonDto_base {
}
export declare class SeasonResponseDto extends CreateSeasonDto {
    id: number;
    createdAt?: Date;
}
export {};
