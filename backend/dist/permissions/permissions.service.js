"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PermissionsService = void 0;
const common_1 = require("@nestjs/common");
const node_postgres_1 = require("drizzle-orm/node-postgres");
const drizzle_orm_1 = require("drizzle-orm");
const schema = require("../db/schema");
let PermissionsService = class PermissionsService {
    constructor(db) {
        this.db = db;
    }
    async createProfilePermission(dto) {
        const [permission] = await this.db
            .insert(schema.profilePermissions)
            .values(dto)
            .returning();
        return permission;
    }
    async findAllProfilePermissions(profile) {
        if (profile) {
            return await this.db
                .select()
                .from(schema.profilePermissions)
                .where((0, drizzle_orm_1.eq)(schema.profilePermissions.profile, profile));
        }
        return await this.db.select().from(schema.profilePermissions);
    }
    async findProfilePermission(id) {
        const [permission] = await this.db
            .select()
            .from(schema.profilePermissions)
            .where((0, drizzle_orm_1.eq)(schema.profilePermissions.id, id));
        if (!permission) {
            throw new common_1.NotFoundException(`Profile permission with ID ${id} not found`);
        }
        return permission;
    }
    async updateProfilePermission(id, dto) {
        const [permission] = await this.db
            .update(schema.profilePermissions)
            .set({ ...dto, updatedAt: new Date() })
            .where((0, drizzle_orm_1.eq)(schema.profilePermissions.id, id))
            .returning();
        if (!permission) {
            throw new common_1.NotFoundException(`Profile permission with ID ${id} not found`);
        }
        return permission;
    }
    async removeProfilePermission(id) {
        const [permission] = await this.db
            .delete(schema.profilePermissions)
            .where((0, drizzle_orm_1.eq)(schema.profilePermissions.id, id))
            .returning();
        if (!permission) {
            throw new common_1.NotFoundException(`Profile permission with ID ${id} not found`);
        }
        return permission;
    }
    async createUserPermission(dto) {
        const [permission] = await this.db
            .insert(schema.userPermissions)
            .values(dto)
            .returning();
        return permission;
    }
    async findAllUserPermissions(userId) {
        if (userId) {
            return await this.db
                .select()
                .from(schema.userPermissions)
                .where((0, drizzle_orm_1.eq)(schema.userPermissions.userId, userId));
        }
        return await this.db.select().from(schema.userPermissions);
    }
    async findUserPermission(id) {
        const [permission] = await this.db
            .select()
            .from(schema.userPermissions)
            .where((0, drizzle_orm_1.eq)(schema.userPermissions.id, id));
        if (!permission) {
            throw new common_1.NotFoundException(`User permission with ID ${id} not found`);
        }
        return permission;
    }
    async updateUserPermission(id, dto) {
        const [permission] = await this.db
            .update(schema.userPermissions)
            .set({ ...dto, updatedAt: new Date() })
            .where((0, drizzle_orm_1.eq)(schema.userPermissions.id, id))
            .returning();
        if (!permission) {
            throw new common_1.NotFoundException(`User permission with ID ${id} not found`);
        }
        return permission;
    }
    async removeUserPermission(id) {
        const [permission] = await this.db
            .delete(schema.userPermissions)
            .where((0, drizzle_orm_1.eq)(schema.userPermissions.id, id))
            .returning();
        if (!permission) {
            throw new common_1.NotFoundException(`User permission with ID ${id} not found`);
        }
        return permission;
    }
    async getUserAllowedMenuItems(userId) {
        const [user] = await this.db
            .select()
            .from(schema.users)
            .where((0, drizzle_orm_1.eq)(schema.users.id, userId));
        if (!user) {
            throw new common_1.NotFoundException(`User with ID ${userId} not found`);
        }
        if (user.profile === 'admin') {
            const allMenuItems = await this.db.select().from(schema.menuItems);
            return allMenuItems.map(item => item.code);
        }
        const userPerms = await this.db
            .select({
            menuItemCode: schema.menuItems.code,
            canAccess: schema.userPermissions.canAccess,
        })
            .from(schema.userPermissions)
            .leftJoin(schema.menuItems, (0, drizzle_orm_1.eq)(schema.userPermissions.menuItemId, schema.menuItems.id))
            .where((0, drizzle_orm_1.eq)(schema.userPermissions.userId, userId));
        const profilePerms = await this.db
            .select({
            menuItemCode: schema.menuItems.code,
            canAccess: schema.profilePermissions.canAccess,
        })
            .from(schema.profilePermissions)
            .leftJoin(schema.menuItems, (0, drizzle_orm_1.eq)(schema.profilePermissions.menuItemId, schema.menuItems.id))
            .where((0, drizzle_orm_1.eq)(schema.profilePermissions.profile, user.profile));
        const permissionMap = new Map();
        profilePerms.forEach(perm => {
            if (perm.menuItemCode) {
                permissionMap.set(perm.menuItemCode, perm.canAccess);
            }
        });
        userPerms.forEach(perm => {
            if (perm.menuItemCode) {
                permissionMap.set(perm.menuItemCode, perm.canAccess);
            }
        });
        return Array.from(permissionMap.entries())
            .filter(([_, canAccess]) => canAccess)
            .map(([code, _]) => code);
    }
};
exports.PermissionsService = PermissionsService;
exports.PermissionsService = PermissionsService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)('DRIZZLE')),
    __metadata("design:paramtypes", [node_postgres_1.NodePgDatabase])
], PermissionsService);
//# sourceMappingURL=permissions.service.js.map