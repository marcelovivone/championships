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
exports.MatchEventsController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const match_events_service_1 = require("./match-events.service");
const dtos_1 = require("../common/dtos");
let MatchEventsController = class MatchEventsController {
    constructor(matchEventsService) {
        this.matchEventsService = matchEventsService;
    }
    async findAll(matchId) {
        if (matchId) {
            return this.matchEventsService.findByMatch(parseInt(matchId, 10));
        }
        return this.matchEventsService.findAll();
    }
    async findOne(id) {
        return this.matchEventsService.findOne(id);
    }
    async create(createMatchEventDto) {
        return this.matchEventsService.create(createMatchEventDto);
    }
    async update(id, updateMatchEventDto) {
        return this.matchEventsService.update(id, updateMatchEventDto);
    }
    async remove(id) {
        await this.matchEventsService.remove(id);
    }
};
exports.MatchEventsController = MatchEventsController;
__decorate([
    (0, swagger_1.ApiOperation)({ summary: 'Retrieve all match events' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'List of match events' }),
    (0, common_1.Get)(),
    __param(0, (0, common_1.Query)('matchId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], MatchEventsController.prototype, "findAll", null);
__decorate([
    (0, swagger_1.ApiOperation)({ summary: 'Retrieve a match event by ID' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'The match event details' }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'Match event not found' }),
    (0, common_1.Get)(':id'),
    __param(0, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number]),
    __metadata("design:returntype", Promise)
], MatchEventsController.prototype, "findOne", null);
__decorate([
    (0, swagger_1.ApiOperation)({ summary: 'Create a new match event' }),
    (0, swagger_1.ApiResponse)({ status: 201, description: 'The match event has been successfully created.' }),
    (0, common_1.Post)(),
    (0, common_1.HttpCode)(common_1.HttpStatus.CREATED),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [dtos_1.CreateMatchEventDto]),
    __metadata("design:returntype", Promise)
], MatchEventsController.prototype, "create", null);
__decorate([
    (0, swagger_1.ApiOperation)({ summary: 'Update a match event' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'The match event has been successfully updated.' }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'Match event not found' }),
    (0, common_1.Put)(':id'),
    __param(0, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, dtos_1.UpdateMatchEventDto]),
    __metadata("design:returntype", Promise)
], MatchEventsController.prototype, "update", null);
__decorate([
    (0, swagger_1.ApiOperation)({ summary: 'Delete a match event' }),
    (0, swagger_1.ApiResponse)({ status: 204, description: 'The match event has been successfully deleted.' }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'Match event not found' }),
    (0, common_1.Delete)(':id'),
    (0, common_1.HttpCode)(common_1.HttpStatus.NO_CONTENT),
    __param(0, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number]),
    __metadata("design:returntype", Promise)
], MatchEventsController.prototype, "remove", null);
exports.MatchEventsController = MatchEventsController = __decorate([
    (0, swagger_1.ApiTags)('match-events'),
    (0, common_1.Controller)('match-events'),
    __metadata("design:paramtypes", [match_events_service_1.MatchEventsService])
], MatchEventsController);
//# sourceMappingURL=match-events.controller.js.map