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
exports.MatchesController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const matches_service_1 = require("./matches.service");
const match_dto_1 = require("../common/dtos/match.dto");
let MatchesController = class MatchesController {
    constructor(matchesService) {
        this.matchesService = matchesService;
    }
    async findAll(page = 1, limit = 10, sortBy, sortOrder) {
        return await this.matchesService.findAllPaginated(Number(page), Number(limit), sortBy, sortOrder);
    }
    async findOne(id) {
        return await this.matchesService.findOne(id);
    }
    async create(createMatchDto) {
        return await this.matchesService.create(createMatchDto);
    }
    async update(id, updateMatchDto) {
        return await this.matchesService.update(id, updateMatchDto);
    }
    async remove(id) {
        return await this.matchesService.remove(id);
    }
};
exports.MatchesController = MatchesController;
__decorate([
    (0, common_1.Get)(),
    (0, swagger_1.ApiOperation)({ summary: 'Get all matches with pagination' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Successfully retrieved matches.' }),
    __param(0, (0, common_1.Query)('page', common_1.ValidationPipe)),
    __param(1, (0, common_1.Query)('limit', common_1.ValidationPipe)),
    __param(2, (0, common_1.Query)('sortBy')),
    __param(3, (0, common_1.Query)('sortOrder')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, Number, String, String]),
    __metadata("design:returntype", Promise)
], MatchesController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)(':id'),
    (0, swagger_1.ApiOperation)({ summary: 'Get a match by ID' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Successfully retrieved match.' }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'Match not found.' }),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number]),
    __metadata("design:returntype", Promise)
], MatchesController.prototype, "findOne", null);
__decorate([
    (0, common_1.Post)(),
    (0, swagger_1.ApiOperation)({ summary: 'Create a new match' }),
    (0, swagger_1.ApiResponse)({ status: 201, description: 'Successfully created match.' }),
    (0, swagger_1.ApiResponse)({ status: 400, description: 'Invalid input data.' }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [match_dto_1.CreateMatchDto]),
    __metadata("design:returntype", Promise)
], MatchesController.prototype, "create", null);
__decorate([
    (0, common_1.Put)(':id'),
    (0, swagger_1.ApiOperation)({ summary: 'Update a match by ID' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Successfully updated match.' }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'Match not found.' }),
    (0, swagger_1.ApiResponse)({ status: 400, description: 'Invalid input data.' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, match_dto_1.UpdateMatchDto]),
    __metadata("design:returntype", Promise)
], MatchesController.prototype, "update", null);
__decorate([
    (0, common_1.Delete)(':id'),
    (0, common_1.HttpCode)(common_1.HttpStatus.NO_CONTENT),
    (0, swagger_1.ApiOperation)({ summary: 'Delete a match by ID' }),
    (0, swagger_1.ApiResponse)({ status: 204, description: 'Successfully deleted match.' }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'Match not found.' }),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number]),
    __metadata("design:returntype", Promise)
], MatchesController.prototype, "remove", null);
exports.MatchesController = MatchesController = __decorate([
    (0, swagger_1.ApiTags)('Matches'),
    (0, common_1.Controller)('matches'),
    __metadata("design:paramtypes", [matches_service_1.MatchesService])
], MatchesController);
//# sourceMappingURL=matches.controller.js.map