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
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserPermissionsDto = exports.UserPermissionResponseDto = exports.ProfilePermissionResponseDto = void 0;
const swagger_1 = require("@nestjs/swagger");
class ProfilePermissionResponseDto {
}
exports.ProfilePermissionResponseDto = ProfilePermissionResponseDto;
__decorate([
    (0, swagger_1.ApiProperty)({ example: 1 }),
    __metadata("design:type", Number)
], ProfilePermissionResponseDto.prototype, "id", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'final_user' }),
    __metadata("design:type", String)
], ProfilePermissionResponseDto.prototype, "profile", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 1 }),
    __metadata("design:type", Number)
], ProfilePermissionResponseDto.prototype, "menuItemId", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: true }),
    __metadata("design:type", Boolean)
], ProfilePermissionResponseDto.prototype, "canAccess", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: '2026-01-23T00:00:00.000Z' }),
    __metadata("design:type", Date)
], ProfilePermissionResponseDto.prototype, "createdAt", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: '2026-01-23T00:00:00.000Z' }),
    __metadata("design:type", Date)
], ProfilePermissionResponseDto.prototype, "updatedAt", void 0);
class UserPermissionResponseDto {
}
exports.UserPermissionResponseDto = UserPermissionResponseDto;
__decorate([
    (0, swagger_1.ApiProperty)({ example: 1 }),
    __metadata("design:type", Number)
], UserPermissionResponseDto.prototype, "id", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 1 }),
    __metadata("design:type", Number)
], UserPermissionResponseDto.prototype, "userId", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 1 }),
    __metadata("design:type", Number)
], UserPermissionResponseDto.prototype, "menuItemId", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: true }),
    __metadata("design:type", Boolean)
], UserPermissionResponseDto.prototype, "canAccess", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: '2026-01-23T00:00:00.000Z' }),
    __metadata("design:type", Date)
], UserPermissionResponseDto.prototype, "createdAt", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: '2026-01-23T00:00:00.000Z' }),
    __metadata("design:type", Date)
], UserPermissionResponseDto.prototype, "updatedAt", void 0);
class UserPermissionsDto {
}
exports.UserPermissionsDto = UserPermissionsDto;
__decorate([
    (0, swagger_1.ApiProperty)({ example: 1 }),
    __metadata("design:type", Number)
], UserPermissionsDto.prototype, "userId", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        example: ['main_screen', 'leagues', 'standings'],
        description: 'List of menu item codes the user can access'
    }),
    __metadata("design:type", Array)
], UserPermissionsDto.prototype, "allowedMenuItems", void 0);
//# sourceMappingURL=permission-response.dto.js.map