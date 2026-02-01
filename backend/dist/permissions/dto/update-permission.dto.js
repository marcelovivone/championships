"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UpdateUserPermissionDto = exports.UpdateProfilePermissionDto = void 0;
const swagger_1 = require("@nestjs/swagger");
const create_permission_dto_1 = require("./create-permission.dto");
class UpdateProfilePermissionDto extends (0, swagger_1.PartialType)(create_permission_dto_1.CreateProfilePermissionDto) {
}
exports.UpdateProfilePermissionDto = UpdateProfilePermissionDto;
class UpdateUserPermissionDto extends (0, swagger_1.PartialType)(create_permission_dto_1.CreateUserPermissionDto) {
}
exports.UpdateUserPermissionDto = UpdateUserPermissionDto;
//# sourceMappingURL=update-permission.dto.js.map