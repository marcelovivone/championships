import { Injectable, NotFoundException, Inject } from '@nestjs/common';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { eq, and } from 'drizzle-orm';
import * as schema from '../db/schema';
import { CreateProfilePermissionDto, CreateUserPermissionDto } from './dto/create-permission.dto';
import { UpdateProfilePermissionDto, UpdateUserPermissionDto } from './dto/update-permission.dto';

@Injectable()
export class PermissionsService {
  constructor(
    @Inject('DRIZZLE') private db: NodePgDatabase<typeof schema>,
  ) {}

  // ==================== Profile Permissions ====================

  async createProfilePermission(dto: CreateProfilePermissionDto) {
    const [permission] = await this.db
      .insert(schema.profilePermissions)
      .values(dto)
      .returning();
    return permission;
  }

  async findAllProfilePermissions(profile?: string) {
    if (profile) {
      return await this.db
        .select()
        .from(schema.profilePermissions)
        .where(eq(schema.profilePermissions.profile, profile));
    }
    return await this.db.select().from(schema.profilePermissions);
  }

  async findProfilePermission(id: number) {
    const [permission] = await this.db
      .select()
      .from(schema.profilePermissions)
      .where(eq(schema.profilePermissions.id, id));

    if (!permission) {
      throw new NotFoundException(`Profile permission with ID ${id} not found`);
    }

    return permission;
  }

  async updateProfilePermission(id: number, dto: UpdateProfilePermissionDto) {
    const [permission] = await this.db
      .update(schema.profilePermissions)
      .set({ ...dto, updatedAt: new Date() })
      .where(eq(schema.profilePermissions.id, id))
      .returning();

    if (!permission) {
      throw new NotFoundException(`Profile permission with ID ${id} not found`);
    }

    return permission;
  }

  async removeProfilePermission(id: number) {
    const [permission] = await this.db
      .delete(schema.profilePermissions)
      .where(eq(schema.profilePermissions.id, id))
      .returning();

    if (!permission) {
      throw new NotFoundException(`Profile permission with ID ${id} not found`);
    }

    return permission;
  }

  // ==================== User Permissions ====================

  async createUserPermission(dto: CreateUserPermissionDto) {
    const [permission] = await this.db
      .insert(schema.userPermissions)
      .values(dto)
      .returning();
    return permission;
  }

  async findAllUserPermissions(userId?: number) {
    if (userId) {
      return await this.db
        .select()
        .from(schema.userPermissions)
        .where(eq(schema.userPermissions.userId, userId));
    }
    return await this.db.select().from(schema.userPermissions);
  }

  async findUserPermission(id: number) {
    const [permission] = await this.db
      .select()
      .from(schema.userPermissions)
      .where(eq(schema.userPermissions.id, id));

    if (!permission) {
      throw new NotFoundException(`User permission with ID ${id} not found`);
    }

    return permission;
  }

  async updateUserPermission(id: number, dto: UpdateUserPermissionDto) {
    const [permission] = await this.db
      .update(schema.userPermissions)
      .set({ ...dto, updatedAt: new Date() })
      .where(eq(schema.userPermissions.id, id))
      .returning();

    if (!permission) {
      throw new NotFoundException(`User permission with ID ${id} not found`);
    }

    return permission;
  }

  async removeUserPermission(id: number) {
    const [permission] = await this.db
      .delete(schema.userPermissions)
      .where(eq(schema.userPermissions.id, id))
      .returning();

    if (!permission) {
      throw new NotFoundException(`User permission with ID ${id} not found`);
    }

    return permission;
  }

  // ==================== Permission Resolution ====================

  /**
   * Get all menu items a user can access based on:
   * 1. User-specific permissions (overrides)
   * 2. Profile-level permissions (defaults)
   * 3. Admin profile always has full access
   */
  async getUserAllowedMenuItems(userId: number): Promise<string[]> {
    // Get user info
    const [user] = await this.db
      .select()
      .from(schema.users)
      .where(eq(schema.users.id, userId));

    if (!user) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }

    // Admin has access to everything
    if (user.profile === 'admin') {
      const allMenuItems = await this.db.select().from(schema.menuItems);
      return allMenuItems.map(item => item.code);
    }

    // Get user-specific permissions
    const userPerms = await this.db
      .select({
        menuItemCode: schema.menuItems.code,
        canAccess: schema.userPermissions.canAccess,
      })
      .from(schema.userPermissions)
      .leftJoin(schema.menuItems, eq(schema.userPermissions.menuItemId, schema.menuItems.id))
      .where(eq(schema.userPermissions.userId, userId));

    // Get profile-level permissions
    const profilePerms = await this.db
      .select({
        menuItemCode: schema.menuItems.code,
        canAccess: schema.profilePermissions.canAccess,
      })
      .from(schema.profilePermissions)
      .leftJoin(schema.menuItems, eq(schema.profilePermissions.menuItemId, schema.menuItems.id))
      .where(eq(schema.profilePermissions.profile, user.profile));

    // Build permission map with user overrides taking precedence
    const permissionMap = new Map<string, boolean>();

    // First, apply profile permissions
    profilePerms.forEach(perm => {
      if (perm.menuItemCode) {
        permissionMap.set(perm.menuItemCode, perm.canAccess);
      }
    });

    // Then, apply user-specific overrides
    userPerms.forEach(perm => {
      if (perm.menuItemCode) {
        permissionMap.set(perm.menuItemCode, perm.canAccess);
      }
    });

    // Return only allowed menu items
    return Array.from(permissionMap.entries())
      .filter(([_, canAccess]) => canAccess)
      .map(([code, _]) => code);
  }
}
