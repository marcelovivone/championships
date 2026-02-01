export declare class ProfilePermissionResponseDto {
    id: number;
    profile: string;
    menuItemId: number;
    canAccess: boolean;
    createdAt: Date;
    updatedAt: Date;
}
export declare class UserPermissionResponseDto {
    id: number;
    userId: number;
    menuItemId: number;
    canAccess: boolean;
    createdAt: Date;
    updatedAt: Date;
}
export declare class UserPermissionsDto {
    userId: number;
    allowedMenuItems: string[];
}
