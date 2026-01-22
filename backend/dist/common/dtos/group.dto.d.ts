export declare class CreateGroupDto {
    phaseId: number;
    name: string;
}
declare const UpdateGroupDto_base: import("@nestjs/common").Type<Partial<CreateGroupDto>>;
export declare class UpdateGroupDto extends UpdateGroupDto_base {
}
export declare class GroupResponseDto extends CreateGroupDto {
    id: number;
    createdAt?: Date;
}
export declare class CreateGroupClubDto {
    groupId: number;
    clubId: number;
}
export declare class GroupClubResponseDto extends CreateGroupClubDto {
    id: number;
    createdAt?: Date;
}
export {};
