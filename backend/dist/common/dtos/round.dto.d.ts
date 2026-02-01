export declare class CreateRoundDto {
    seasonId: number;
    leagueId: number;
    roundNumber: number;
    startDate?: string;
    endDate?: string;
    flgCurrent?: boolean;
}
declare const UpdateRoundDto_base: import("@nestjs/mapped-types").MappedType<Partial<CreateRoundDto>>;
export declare class UpdateRoundDto extends UpdateRoundDto_base {
}
export declare class RoundResponseDto extends CreateRoundDto {
    id: number;
    createdAt?: Date;
}
export {};
