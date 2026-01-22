export declare class CreateMatchDivisionDto {
    matchId: number;
    divisionNumber: number;
    divisionType: string;
    homeScore: number;
    awayScore: number;
}
declare const UpdateMatchDivisionDto_base: import("@nestjs/common").Type<Partial<CreateMatchDivisionDto>>;
export declare class UpdateMatchDivisionDto extends UpdateMatchDivisionDto_base {
}
export declare class MatchDivisionResponseDto extends CreateMatchDivisionDto {
    id: number;
    createdAt?: Date;
}
export {};
