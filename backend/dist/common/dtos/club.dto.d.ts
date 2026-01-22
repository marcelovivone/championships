export declare class CreateClubDto {
    name: string;
    shortName?: string;
    foundationYear: number;
    countryId: number;
    imageUrl?: string;
}
declare const UpdateClubDto_base: import("@nestjs/common").Type<Partial<CreateClubDto>>;
export declare class UpdateClubDto extends UpdateClubDto_base {
}
export declare class ClubResponseDto extends CreateClubDto {
    id: number;
    createdAt?: Date;
}
export {};
