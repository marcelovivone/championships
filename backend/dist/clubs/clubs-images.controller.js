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
exports.ClubsImagesController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const fs_1 = require("fs");
const path_1 = require("path");
let ClubsImagesController = class ClubsImagesController {
    async serveImage(filename, res) {
        const safeFilename = filename.replace(/\.\./g, '');
        const possiblePaths = [
            (0, path_1.join)(process.cwd(), 'uploads', 'clubs', safeFilename),
            (0, path_1.join)(process.cwd(), 'public', 'images', 'clubs', safeFilename),
            (0, path_1.join)(process.cwd(), 'images', 'clubs', safeFilename),
        ];
        for (const filePath of possiblePaths) {
            if ((0, fs_1.existsSync)(filePath)) {
                const fileStream = (0, fs_1.createReadStream)(filePath);
                const ext = filePath.split('.').pop()?.toLowerCase();
                const contentTypes = {
                    jpg: 'image/jpeg',
                    jpeg: 'image/jpeg',
                    png: 'image/png',
                    gif: 'image/gif',
                    svg: 'image/svg+xml',
                    webp: 'image/webp',
                };
                res.setHeader('Content-Type', contentTypes[ext || 'jpg'] || 'image/jpeg');
                fileStream.pipe(res);
                return;
            }
        }
        throw new common_1.NotFoundException(`Image ${filename} not found`);
    }
};
exports.ClubsImagesController = ClubsImagesController;
__decorate([
    (0, swagger_1.ApiOperation)({ summary: 'Serve a club image' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Image file' }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'Image not found' }),
    (0, common_1.Get)(':filename'),
    __param(0, (0, common_1.Param)('filename')),
    __param(1, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], ClubsImagesController.prototype, "serveImage", null);
exports.ClubsImagesController = ClubsImagesController = __decorate([
    (0, swagger_1.ApiTags)('clubs'),
    (0, common_1.Controller)({ path: 'clubs/images', version: '1' })
], ClubsImagesController);
//# sourceMappingURL=clubs-images.controller.js.map