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
exports.PermissionsController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const permissions_service_1 = require("./permissions.service");
const create_permission_dto_1 = require("./dto/create-permission.dto");
const update_permission_dto_1 = require("./dto/update-permission.dto");
const permission_response_dto_1 = require("./dto/permission-response.dto");
let PermissionsController = class PermissionsController {
    constructor(permissionsService) {
        this.permissionsService = permissionsService;
    }
    createProfilePermission(dto) {
        return this.permissionsService.createProfilePermission(dto);
    }
    findAllProfilePermissions(profile) {
        return this.permissionsService.findAllProfilePermissions(profile);
    }
    findProfilePermission(id) {
        return this.permissionsService.findProfilePermission(+id);
    }
    updateProfilePermission(id, dto) {
        return this.permissionsService.updateProfilePermission(+id, dto);
    }
    removeProfilePermission(id) {
        return this.permissionsService.removeProfilePermission(+id);
    }
    createUserPermission(dto) {
        return this.permissionsService.createUserPermission(dto);
    }
    findAllUserPermissions(userId) {
        return this.permissionsService.findAllUserPermissions(userId ? +userId : undefined);
    }
    findUserPermission(id) {
        return this.permissionsService.findUserPermission(+id);
    }
    updateUserPermission(id, dto) {
        return this.permissionsService.updateUserPermission(+id, dto);
    }
    removeUserPermission(id) {
        return this.permissionsService.removeUserPermission(+id);
    }
    async getUserAllowedMenuItems(userId) {
        const allowedMenuItems = await this.permissionsService.getUserAllowedMenuItems(+userId);
        return {
            userId: +userId,
            allowedMenuItems,
        };
    }
};
exports.PermissionsController = PermissionsController;
__decorate([
    (0, common_1.Post)('profile'),
    (0, swagger_1.ApiOperation)({ summary: 'Create a profile permission' }),
    (0, swagger_1.ApiResponse)({ status: 201, description: 'Profile permission created', type: permission_response_dto_1.ProfilePermissionResponseDto }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [create_permission_dto_1.CreateProfilePermissionDto]),
    __metadata("design:returntype", void 0)
], PermissionsController.prototype, "createProfilePermission", null);
__decorate([
    (0, common_1.Get)('profile'),
    (0, swagger_1.ApiOperation)({ summary: 'Get all profile permissions' }),
    (0, swagger_1.ApiQuery)({ name: 'profile', required: false, description: 'Filter by profile (e.g., final_user)' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'List of profile permissions', type: [permission_response_dto_1.ProfilePermissionResponseDto] }),
    __param(0, (0, common_1.Query)('profile')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], PermissionsController.prototype, "findAllProfilePermissions", null);
__decorate([
    (0, common_1.Get)('profile/:id'),
    (0, swagger_1.ApiOperation)({ summary: 'Get a profile permission by ID' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Profile permission found', type: permission_response_dto_1.ProfilePermissionResponseDto }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'Profile permission not found' }),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], PermissionsController.prototype, "findProfilePermission", null);
__decorate([
    (0, common_1.Patch)('profile/:id'),
    (0, swagger_1.ApiOperation)({ summary: 'Update a profile permission' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Profile permission updated', type: permission_response_dto_1.ProfilePermissionResponseDto }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'Profile permission not found' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, update_permission_dto_1.UpdateProfilePermissionDto]),
    __metadata("design:returntype", void 0)
], PermissionsController.prototype, "updateProfilePermission", null);
__decorate([
    (0, common_1.Delete)('profile/:id'),
    (0, swagger_1.ApiOperation)({ summary: 'Delete a profile permission' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Profile permission deleted', type: permission_response_dto_1.ProfilePermissionResponseDto }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'Profile permission not found' }),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], PermissionsController.prototype, "removeProfilePermission", null);
__decorate([
    (0, common_1.Post)('user'),
    (0, swagger_1.ApiOperation)({ summary: 'Create a user permission' }),
    (0, swagger_1.ApiResponse)({ status: 201, description: 'User permission created', type: permission_response_dto_1.UserPermissionResponseDto }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [create_permission_dto_1.CreateUserPermissionDto]),
    __metadata("design:returntype", void 0)
], PermissionsController.prototype, "createUserPermission", null);
__decorate([
    (0, common_1.Get)('user'),
    (0, swagger_1.ApiOperation)({ summary: 'Get all user permissions' }),
    (0, swagger_1.ApiQuery)({ name: 'userId', required: false, description: 'Filter by user ID' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'List of user permissions', type: [permission_response_dto_1.UserPermissionResponseDto] }),
    __param(0, (0, common_1.Query)('userId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], PermissionsController.prototype, "findAllUserPermissions", null);
__decorate([
    (0, common_1.Get)('user/:id'),
    (0, swagger_1.ApiOperation)({ summary: 'Get a user permission by ID' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'User permission found', type: permission_response_dto_1.UserPermissionResponseDto }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'User permission not found' }),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], PermissionsController.prototype, "findUserPermission", null);
__decorate([
    (0, common_1.Patch)('user/:id'),
    (0, swagger_1.ApiOperation)({ summary: 'Update a user permission' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'User permission updated', type: permission_response_dto_1.UserPermissionResponseDto }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'User permission not found' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, update_permission_dto_1.UpdateUserPermissionDto]),
    __metadata("design:returntype", void 0)
], PermissionsController.prototype, "updateUserPermission", null);
__decorate([
    (0, common_1.Delete)('user/:id'),
    (0, swagger_1.ApiOperation)({ summary: 'Delete a user permission' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'User permission deleted', type: permission_response_dto_1.UserPermissionResponseDto }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'User permission not found' }),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], PermissionsController.prototype, "removeUserPermission", null);
__decorate([
    (0, common_1.Get)('user/:userId/allowed-menu-items'),
    (0, swagger_1.ApiOperation)({ summary: 'Get all menu items a user can access' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'List of allowed menu items', type: permission_response_dto_1.UserPermissionsDto }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'User not found' }),
    __param(0, (0, common_1.Param)('userId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], PermissionsController.prototype, "getUserAllowedMenuItems", null);
exports.PermissionsController = PermissionsController = __decorate([
    (0, swagger_1.ApiTags)('Permissions'),
    (0, common_1.Controller)({ path: 'permissions', version: '1' }),
    __metadata("design:paramtypes", [permissions_service_1.PermissionsService])
], PermissionsController);
//# sourceMappingURL=permissions.controller.js.map