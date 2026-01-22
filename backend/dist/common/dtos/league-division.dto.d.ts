export declare class CreateLeagueDivisionDto {
    leagueId: number;
    name: string;
}
declare const UpdateLeagueDivisionDto_base: import("@nestjs/mapped-types").MappedType<Partial<CreateLeagueDivisionDto>>;
export declare class UpdateLeagueDivisionDto extends UpdateLeagueDivisionDto_base {
}
export declare class LeagueDivisionResponseDto extends CreateLeagueDivisionDto {
    id: number;
    createdAt?: Date;
}
export {};
