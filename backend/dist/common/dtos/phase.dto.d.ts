export declare class CreatePhaseDto {
    seasonId: number;
    name: string;
    type: string;
    order: number;
}
declare const UpdatePhaseDto_base: import("@nestjs/common").Type<Partial<CreatePhaseDto>>;
export declare class UpdatePhaseDto extends UpdatePhaseDto_base {
}
export declare class PhaseResponseDto extends CreatePhaseDto {
    id: number;
    createdAt?: Date;
}
export {};
