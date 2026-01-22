export declare class CreateLeagueLinkDto {
    leagueId: number;
    label: string;
    url: string;
}
declare const UpdateLeagueLinkDto_base: import("@nestjs/mapped-types").MappedType<Partial<CreateLeagueLinkDto>>;
export declare class UpdateLeagueLinkDto extends UpdateLeagueLinkDto_base {
}
export declare class LeagueLinkResponseDto extends CreateLeagueLinkDto {
    id: number;
    createdAt?: Date;
}
export {};
