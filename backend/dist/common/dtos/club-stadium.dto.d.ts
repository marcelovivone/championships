export declare class CreateClubStadiumDto {
    clubId: number;
    stadiumId: number;
    startDate: string;
    endDate?: string;
}
declare const UpdateClubStadiumDto_base: import("@nestjs/mapped-types").MappedType<Partial<CreateClubStadiumDto>>;
export declare class UpdateClubStadiumDto extends UpdateClubStadiumDto_base {
}
export declare class ClubStadiumResponseDto extends CreateClubStadiumDto {
    id: number;
    createdAt?: Date;
}
export {};
