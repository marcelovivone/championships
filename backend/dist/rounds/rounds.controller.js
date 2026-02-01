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
exports.RoundsController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const rounds_service_1 = require("./rounds.service");
const dtos_1 = require("../common/dtos");
let RoundsController = class RoundsController {
    constructor(roundsService) {
        this.roundsService = roundsService;
    }
    async findAll(seasonId, leagueId, page, limit, sortBy, sortOrder) {
        if (seasonId) {
            return this.roundsService.findBySeason(parseInt(seasonId, 10));
        }
        if (leagueId) {
            return this.roundsService.findByLeague(parseInt(leagueId, 10));
        }
        const pageNum = page ? parseInt(page, 10) : 1;
        const limitNum = limit ? parseInt(limit, 10) : 10;
        const sort = sortBy || 'roundNumber';
        const order = sortOrder === 'desc' ? 'desc' : 'asc';
        return this.roundsService.findAllPaginated(pageNum, limitNum, sort, order);
    }
    async findOne(id) {
        return this.roundsService.findOne(id);
    }
    async create(createRoundDto) {
        try {
            const result = await this.roundsService.create(createRoundDto);
            return { success: true, data: result };
        }
        catch (error) {
            let message = 'Failed to create round';
            if (error?.response?.message) {
                message = Array.isArray(error.response.message)
                    ? error.response.message.join(', ')
                    : error.response.message;
            }
            else if (error?.message) {
                message = error.message;
            }
            return { success: false, message };
        }
    }
    async update(id, updateRoundDto) {
        try {
            const result = await this.roundsService.update(id, updateRoundDto);
            return { success: true, data: result };
        }
        catch (error) {
            let message = 'Failed to update round';
            if (error?.response?.message) {
                message = Array.isArray(error.response.message)
                    ? error.response.message.join(', ')
                    : error.response.message;
            }
            else if (error?.message) {
                message = error.message;
            }
            return { success: false, message };
        }
    }
    async remove(id) {
        await this.roundsService.remove(id);
    }
};
exports.RoundsController = RoundsController;
__decorate([
    (0, swagger_1.ApiOperation)({ summary: 'Retrieve all rounds' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'List of rounds' }),
    (0, common_1.Get)(),
    __param(0, (0, common_1.Query)('seasonId')),
    __param(1, (0, common_1.Query)('leagueId')),
    __param(2, (0, common_1.Query)('page')),
    __param(3, (0, common_1.Query)('limit')),
    __param(4, (0, common_1.Query)('sortBy')),
    __param(5, (0, common_1.Query)('sortOrder')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, String, String, String]),
    __metadata("design:returntype", Promise)
], RoundsController.prototype, "findAll", null);
__decorate([
    (0, swagger_1.ApiOperation)({ summary: 'Retrieve a round by ID' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'The round details' }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'Round not found' }),
    (0, common_1.Get)(':id'),
    __param(0, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number]),
    __metadata("design:returntype", Promise)
], RoundsController.prototype, "findOne", null);
__decorate([
    (0, swagger_1.ApiOperation)({ summary: 'Create a new round' }),
    (0, swagger_1.ApiResponse)({ status: 201, description: 'Round created successfully' }),
    (0, swagger_1.ApiResponse)({ status: 400, description: 'Invalid request data' }),
    (0, common_1.Post)(),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [dtos_1.CreateRoundDto]),
    __metadata("design:returntype", Promise)
], RoundsController.prototype, "create", null);
__decorate([
    (0, swagger_1.ApiOperation)({ summary: 'Update a round' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Round updated successfully' }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'Round not found' }),
    (0, common_1.Put)(':id'),
    __param(0, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, dtos_1.UpdateRoundDto]),
    __metadata("design:returntype", Promise)
], RoundsController.prototype, "update", null);
__decorate([
    (0, swagger_1.ApiOperation)({ summary: 'Delete a round' }),
    (0, swagger_1.ApiResponse)({ status: 204, description: 'Round deleted successfully' }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'Round not found' }),
    (0, common_1.Delete)(':id'),
    (0, common_1.HttpCode)(common_1.HttpStatus.NO_CONTENT),
    __param(0, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number]),
    __metadata("design:returntype", Promise)
], RoundsController.prototype, "remove", null);
exports.RoundsController = RoundsController = __decorate([
    (0, swagger_1.ApiTags)('rounds'),
    (0, common_1.Controller)({ path: 'rounds', version: '1' }),
    __metadata("design:paramtypes", [rounds_service_1.RoundsService])
], RoundsController);
//# sourceMappingURL=rounds.controller.js.map