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
exports.SeasonsController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const seasons_service_1 = require("./seasons.service");
let SeasonsController = class SeasonsController {
    constructor(seasonsService) {
        this.seasonsService = seasonsService;
    }
    async findAll(page, limit, sortBy, sortOrder, leagueId) {
        if (leagueId) {
            return this.seasonsService.findAllByLeague(Number(leagueId));
        }
        const pageNum = page ? parseInt(page, 10) : 1;
        const limitNum = limit ? parseInt(limit, 10) : 10;
        const sort = sortBy || 'startYear';
        const order = sortOrder === 'desc' ? 'desc' : 'asc';
        return this.seasonsService.findAllPaginated(pageNum, limitNum, sort, order);
    }
    async findOne(id) {
        return this.seasonsService.findOne(id);
    }
    async create(createDto) {
        return this.seasonsService.create(createDto);
    }
    async update(id, updateDto) {
        return this.seasonsService.update(id, updateDto);
    }
    async remove(id) {
        return this.seasonsService.remove(id);
    }
};
exports.SeasonsController = SeasonsController;
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, common_1.Query)('page')),
    __param(1, (0, common_1.Query)('limit')),
    __param(2, (0, common_1.Query)('sortBy')),
    __param(3, (0, common_1.Query)('sortOrder')),
    __param(4, (0, common_1.Query)('leagueId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, String, String]),
    __metadata("design:returntype", Promise)
], SeasonsController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)(':id'),
    (0, swagger_1.ApiOperation)({ summary: 'Retrieve a season by ID' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'The season details' }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'Season not found' }),
    __param(0, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number]),
    __metadata("design:returntype", Promise)
], SeasonsController.prototype, "findOne", null);
__decorate([
    (0, common_1.Post)(),
    (0, swagger_1.ApiOperation)({ summary: 'Create a new season' }),
    (0, swagger_1.ApiResponse)({ status: 201, description: 'Season created successfully' }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], SeasonsController.prototype, "create", null);
__decorate([
    (0, common_1.Put)(':id'),
    (0, swagger_1.ApiOperation)({ summary: 'Update a season' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Season updated successfully' }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'Season not found' }),
    __param(0, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, Object]),
    __metadata("design:returntype", Promise)
], SeasonsController.prototype, "update", null);
__decorate([
    (0, common_1.Delete)(':id'),
    (0, swagger_1.ApiOperation)({ summary: 'Delete a season' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Season deleted successfully' }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'Season not found' }),
    __param(0, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number]),
    __metadata("design:returntype", Promise)
], SeasonsController.prototype, "remove", null);
exports.SeasonsController = SeasonsController = __decorate([
    (0, swagger_1.ApiTags)('seasons'),
    (0, common_1.Controller)({ path: 'seasons', version: '1' }),
    __metadata("design:paramtypes", [seasons_service_1.SeasonsService])
], SeasonsController);
//# sourceMappingURL=seasons.controller.js.map