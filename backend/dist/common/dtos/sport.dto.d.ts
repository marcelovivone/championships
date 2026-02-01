export declare class CreateSportDto {
    name: string;
    reducedName: string;
    type: string;
    divisionType: string;
    minMatchDivisionNumber: number;
    maxMatchDivisionNumber: number;
    divisionTime: number;
    scoreType: string;
    hasOvertime: boolean;
    hasPenalties: boolean;
    flgDefault: boolean;
    imageUrl: string;
}
declare const UpdateSportDto_base: import("@nestjs/common").Type<Partial<CreateSportDto>>;
export declare class UpdateSportDto extends UpdateSportDto_base {
}
export declare class SportResponseDto extends CreateSportDto {
    id: number;
    createdAt?: Date;
}
export {};
