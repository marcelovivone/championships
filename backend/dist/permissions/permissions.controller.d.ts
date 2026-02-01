import { PermissionsService } from './permissions.service';
import { CreateProfilePermissionDto, CreateUserPermissionDto } from './dto/create-permission.dto';
import { UpdateProfilePermissionDto, UpdateUserPermissionDto } from './dto/update-permission.dto';
export declare class PermissionsController {
    private readonly permissionsService;
    constructor(permissionsService: PermissionsService);
    createProfilePermission(dto: CreateProfilePermissionDto): Promise<{
        id: number;
        createdAt: Date;
        updatedAt: Date;
        profile: string;
        menuItemId: number;
        canAccess: boolean;
    }>;
    findAllProfilePermissions(profile?: string): Promise<{
        id: number;
        profile: string;
        menuItemId: number;
        canAccess: boolean;
        createdAt: Date;
        updatedAt: Date;
    }[]>;
    findProfilePermission(id: string): Promise<{
        id: number;
        profile: string;
        menuItemId: number;
        canAccess: boolean;
        createdAt: Date;
        updatedAt: Date;
    }>;
    updateProfilePermission(id: string, dto: UpdateProfilePermissionDto): Promise<{
        id: number;
        profile: string;
        menuItemId: number;
        canAccess: boolean;
        createdAt: Date;
        updatedAt: Date;
    }>;
    removeProfilePermission(id: string): Promise<{
        id: number;
        createdAt: Date;
        updatedAt: Date;
        profile: string;
        menuItemId: number;
        canAccess: boolean;
    }>;
    createUserPermission(dto: CreateUserPermissionDto): Promise<{
        id: number;
        createdAt: Date;
        updatedAt: Date;
        menuItemId: number;
        canAccess: boolean;
        userId: number;
    }>;
    findAllUserPermissions(userId?: string): Promise<{
        id: number;
        userId: number;
        menuItemId: number;
        canAccess: boolean;
        createdAt: Date;
        updatedAt: Date;
    }[]>;
    findUserPermission(id: string): Promise<{
        id: number;
        userId: number;
        menuItemId: number;
        canAccess: boolean;
        createdAt: Date;
        updatedAt: Date;
    }>;
    updateUserPermission(id: string, dto: UpdateUserPermissionDto): Promise<{
        id: number;
        userId: number;
        menuItemId: number;
        canAccess: boolean;
        createdAt: Date;
        updatedAt: Date;
    }>;
    removeUserPermission(id: string): Promise<{
        id: number;
        createdAt: Date;
        updatedAt: Date;
        menuItemId: number;
        canAccess: boolean;
        userId: number;
    }>;
    getUserAllowedMenuItems(userId: string): Promise<{
        userId: number;
        allowedMenuItems: string[];
    }>;
}
