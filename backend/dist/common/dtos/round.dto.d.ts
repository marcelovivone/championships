export declare class CreateRoundDto {
    leagueId: number;
    phaseId: number;
    roundNumber: number;
    startDate?: string;
    endDate?: string;
}
declare const UpdateRoundDto_base: import("@nestjs/mapped-types").MappedType<Partial<CreateRoundDto>>;
export declare class UpdateRoundDto extends UpdateRoundDto_base {
}
export declare class RoundResponseDto extends CreateRoundDto {
    id: number;
    createdAt?: Date;
}
export {};
