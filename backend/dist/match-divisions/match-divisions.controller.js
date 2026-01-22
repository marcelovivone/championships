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
exports.MatchDivisionsController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const match_divisions_service_1 = require("./match-divisions.service");
const dtos_1 = require("../common/dtos");
let MatchDivisionsController = class MatchDivisionsController {
    constructor(matchDivisionsService) {
        this.matchDivisionsService = matchDivisionsService;
    }
    async findAll(matchId) {
        if (matchId) {
            return this.matchDivisionsService.findByMatch(parseInt(matchId, 10));
        }
        return this.matchDivisionsService.findAll();
    }
    async findOne(id) {
        return this.matchDivisionsService.findOne(id);
    }
    async create(createMatchDivisionDto) {
        return this.matchDivisionsService.create(createMatchDivisionDto);
    }
    async update(id, updateMatchDivisionDto) {
        return this.matchDivisionsService.update(id, updateMatchDivisionDto);
    }
    async remove(id) {
        await this.matchDivisionsService.remove(id);
    }
};
exports.MatchDivisionsController = MatchDivisionsController;
__decorate([
    (0, swagger_1.ApiOperation)({ summary: 'Retrieve all match divisions' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'List of match divisions' }),
    (0, common_1.Get)(),
    __param(0, (0, common_1.Query)('matchId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], MatchDivisionsController.prototype, "findAll", null);
__decorate([
    (0, swagger_1.ApiOperation)({ summary: 'Retrieve a match division by ID' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'The match division details' }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'Match division not found' }),
    (0, common_1.Get)(':id'),
    __param(0, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number]),
    __metadata("design:returntype", Promise)
], MatchDivisionsController.prototype, "findOne", null);
__decorate([
    (0, swagger_1.ApiOperation)({ summary: 'Create a new match division' }),
    (0, swagger_1.ApiResponse)({ status: 201, description: 'The match division has been successfully created.' }),
    (0, common_1.Post)(),
    (0, common_1.HttpCode)(common_1.HttpStatus.CREATED),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [dtos_1.CreateMatchDivisionDto]),
    __metadata("design:returntype", Promise)
], MatchDivisionsController.prototype, "create", null);
__decorate([
    (0, swagger_1.ApiOperation)({ summary: 'Update a match division' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'The match division has been successfully updated.' }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'Match division not found' }),
    (0, common_1.Put)(':id'),
    __param(0, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, dtos_1.UpdateMatchDivisionDto]),
    __metadata("design:returntype", Promise)
], MatchDivisionsController.prototype, "update", null);
__decorate([
    (0, swagger_1.ApiOperation)({ summary: 'Delete a match division' }),
    (0, swagger_1.ApiResponse)({ status: 204, description: 'The match division has been successfully deleted.' }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'Match division not found' }),
    (0, common_1.Delete)(':id'),
    (0, common_1.HttpCode)(common_1.HttpStatus.NO_CONTENT),
    __param(0, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number]),
    __metadata("design:returntype", Promise)
], MatchDivisionsController.prototype, "remove", null);
exports.MatchDivisionsController = MatchDivisionsController = __decorate([
    (0, swagger_1.ApiTags)('match-divisions'),
    (0, common_1.Controller)('match-divisions'),
    __metadata("design:paramtypes", [match_divisions_service_1.MatchDivisionsService])
], MatchDivisionsController);
//# sourceMappingURL=match-divisions.controller.js.map