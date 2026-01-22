export declare class CreateCityDto {
    name: string;
    countryId: number;
}
declare const UpdateCityDto_base: import("@nestjs/common").Type<Partial<CreateCityDto>>;
export declare class UpdateCityDto extends UpdateCityDto_base {
}
export declare class CityResponseDto extends CreateCityDto {
    id: number;
    createdAt?: Date;
}
export {};
