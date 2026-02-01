export declare class CreateGroupDto {
    seasonId: number;
    name: string;
}
declare const UpdateGroupDto_base: import("@nestjs/common").Type<Partial<CreateGroupDto>>;
export declare class UpdateGroupDto extends UpdateGroupDto_base {
}
export declare class GroupResponseDto extends CreateGroupDto {
    id: number;
    createdAt?: Date;
}
export {};
