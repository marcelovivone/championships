"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RequirePermission = void 0;
const common_1 = require("@nestjs/common");
const RequirePermission = (permission) => (0, common_1.SetMetadata)('permission', permission);
exports.RequirePermission = RequirePermission;
//# sourceMappingURL=require-permission.decorator.js.map