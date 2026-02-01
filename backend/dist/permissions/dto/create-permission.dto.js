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
exports.CreateUserPermissionDto = exports.CreateProfilePermissionDto = void 0;
const swagger_1 = require("@nestjs/swagger");
const class_validator_1 = require("class-validator");
class CreateProfilePermissionDto {
}
exports.CreateProfilePermissionDto = CreateProfilePermissionDto;
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'final_user', description: 'User profile' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], CreateProfilePermissionDto.prototype, "profile", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 1, description: 'Menu item ID' }),
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", Number)
], CreateProfilePermissionDto.prototype, "menuItemId", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: true, description: 'Whether the profile can access this menu item' }),
    (0, class_validator_1.IsBoolean)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Boolean)
], CreateProfilePermissionDto.prototype, "canAccess", void 0);
class CreateUserPermissionDto {
}
exports.CreateUserPermissionDto = CreateUserPermissionDto;
__decorate([
    (0, swagger_1.ApiProperty)({ example: 1, description: 'User ID' }),
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", Number)
], CreateUserPermissionDto.prototype, "userId", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 1, description: 'Menu item ID' }),
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", Number)
], CreateUserPermissionDto.prototype, "menuItemId", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: true, description: 'Whether the user can access this menu item' }),
    (0, class_validator_1.IsBoolean)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Boolean)
], CreateUserPermissionDto.prototype, "canAccess", void 0);
//# sourceMappingURL=create-permission.dto.js.map