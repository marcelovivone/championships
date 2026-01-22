export declare class CreateStadiumDto {
    name: string;
    cityId: number;
    capacity?: number;
    yearConstructed?: number;
    type: string;
    imageUrl?: string;
}
declare const UpdateStadiumDto_base: import("@nestjs/common").Type<Partial<CreateStadiumDto>>;
export declare class UpdateStadiumDto extends UpdateStadiumDto_base {
}
export declare class StadiumResponseDto extends CreateStadiumDto {
    id: number;
    createdAt?: Date;
}
export {};
