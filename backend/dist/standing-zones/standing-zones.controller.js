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
exports.StandingZonesController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const standing_zones_service_1 = require("./standing-zones.service");
const dtos_1 = require("../common/dtos");
let StandingZonesController = class StandingZonesController {
    constructor(service) {
        this.service = service;
    }
    async findAll(sportId, leagueId, seasonId, page = '1', limit = '50', sortBy = 'startPosition', sortOrder = 'asc') {
        const params = {
            sportId: sportId ? parseInt(sportId, 10) : undefined,
            leagueId: leagueId ? parseInt(leagueId, 10) : undefined,
            seasonId: seasonId ? parseInt(seasonId, 10) : undefined,
            page: parseInt(page, 10) || 1,
            limit: parseInt(limit, 10) || 50,
            sortBy: sortBy || 'startPosition',
            sortOrder: sortOrder === 'desc' ? 'desc' : 'asc',
        };
        return this.service.findAll(params);
    }
    async findOne(id) {
        return this.service.findOne(id);
    }
    async create(dto) {
        return this.service.create(dto);
    }
    async update(id, dto) {
        return this.service.update(id, dto);
    }
    async remove(id) {
        await this.service.remove(id);
        return { success: true };
    }
};
exports.StandingZonesController = StandingZonesController;
__decorate([
    (0, common_1.Get)(),
    (0, swagger_1.ApiOperation)({ summary: 'List standing zones (filtered)' }),
    __param(0, (0, common_1.Query)('sportId')),
    __param(1, (0, common_1.Query)('leagueId')),
    __param(2, (0, common_1.Query)('seasonId')),
    __param(3, (0, common_1.Query)('page')),
    __param(4, (0, common_1.Query)('limit')),
    __param(5, (0, common_1.Query)('sortBy')),
    __param(6, (0, common_1.Query)('sortOrder')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, Object, Object, Object, Object]),
    __metadata("design:returntype", Promise)
], StandingZonesController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)(':id'),
    __param(0, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number]),
    __metadata("design:returntype", Promise)
], StandingZonesController.prototype, "findOne", null);
__decorate([
    (0, common_1.Post)(),
    (0, common_1.HttpCode)(common_1.HttpStatus.CREATED),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [dtos_1.CreateStandingZoneDto]),
    __metadata("design:returntype", Promise)
], StandingZonesController.prototype, "create", null);
__decorate([
    (0, common_1.Put)(':id'),
    __param(0, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, dtos_1.UpdateStandingZoneDto]),
    __metadata("design:returntype", Promise)
], StandingZonesController.prototype, "update", null);
__decorate([
    (0, common_1.Delete)(':id'),
    (0, common_1.HttpCode)(common_1.HttpStatus.NO_CONTENT),
    __param(0, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number]),
    __metadata("design:returntype", Promise)
], StandingZonesController.prototype, "remove", null);
exports.StandingZonesController = StandingZonesController = __decorate([
    (0, swagger_1.ApiTags)('Standing Zones'),
    (0, common_1.Controller)({ path: 'standing-zones', version: '1' }),
    __metadata("design:paramtypes", [standing_zones_service_1.StandingZonesService])
], StandingZonesController);
//# sourceMappingURL=standing-zones.controller.js.map