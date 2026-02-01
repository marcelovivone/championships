import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from '../db/schema';
import { CreateProfilePermissionDto, CreateUserPermissionDto } from './dto/create-permission.dto';
import { UpdateProfilePermissionDto, UpdateUserPermissionDto } from './dto/update-permission.dto';
export declare class PermissionsService {
    private db;
    constructor(db: NodePgDatabase<typeof schema>);
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
    findProfilePermission(id: number): Promise<{
        id: number;
        profile: string;
        menuItemId: number;
        canAccess: boolean;
        createdAt: Date;
        updatedAt: Date;
    }>;
    updateProfilePermission(id: number, dto: UpdateProfilePermissionDto): Promise<{
        id: number;
        profile: string;
        menuItemId: number;
        canAccess: boolean;
        createdAt: Date;
        updatedAt: Date;
    }>;
    removeProfilePermission(id: number): Promise<{
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
    findAllUserPermissions(userId?: number): Promise<{
        id: number;
        userId: number;
        menuItemId: number;
        canAccess: boolean;
        createdAt: Date;
        updatedAt: Date;
    }[]>;
    findUserPermission(id: number): Promise<{
        id: number;
        userId: number;
        menuItemId: number;
        canAccess: boolean;
        createdAt: Date;
        updatedAt: Date;
    }>;
    updateUserPermission(id: number, dto: UpdateUserPermissionDto): Promise<{
        id: number;
        userId: number;
        menuItemId: number;
        canAccess: boolean;
        createdAt: Date;
        updatedAt: Date;
    }>;
    removeUserPermission(id: number): Promise<{
        id: number;
        createdAt: Date;
        updatedAt: Date;
        menuItemId: number;
        canAccess: boolean;
        userId: number;
    }>;
    getUserAllowedMenuItems(userId: number): Promise<string[]>;
}
