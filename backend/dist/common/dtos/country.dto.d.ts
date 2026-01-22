export declare class CreateCountryDto {
    name: string;
    continent: string;
    code: string;
    flagUrl?: string;
}
declare const UpdateCountryDto_base: import("@nestjs/common").Type<Partial<CreateCountryDto>>;
export declare class UpdateCountryDto extends UpdateCountryDto_base {
}
export declare class CountryResponseDto extends CreateCountryDto {
    id: number;
    createdAt?: Date;
}
export {};
