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
exports.StandingsController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const standings_service_1 = require("./standings.service");
const dtos_1 = require("../common/dtos");
let StandingsController = class StandingsController {
    constructor(standingsService) {
        this.standingsService = standingsService;
    }
    async findAll(leagueId, roundId) {
        if (roundId && leagueId) {
            return this.standingsService.findByLeagueAndRound(parseInt(leagueId, 10), parseInt(roundId, 10));
        }
        if (leagueId) {
            return this.standingsService.findByLeague(parseInt(leagueId, 10));
        }
        return this.standingsService.findAll();
    }
    async findOne(id) {
        return this.standingsService.findOne(id);
    }
    async create(createStandingDto) {
        return this.standingsService.create(createStandingDto);
    }
    async update(id, updateStandingDto) {
        return this.standingsService.update(id, updateStandingDto);
    }
    async remove(id) {
        await this.standingsService.remove(id);
    }
};
exports.StandingsController = StandingsController;
__decorate([
    (0, swagger_1.ApiOperation)({ summary: 'Retrieve standings' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'List of standings' }),
    (0, common_1.Get)(),
    __param(0, (0, common_1.Query)('leagueId')),
    __param(1, (0, common_1.Query)('roundId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], StandingsController.prototype, "findAll", null);
__decorate([
    (0, swagger_1.ApiOperation)({ summary: 'Retrieve a standing by ID' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'The standing details' }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'Standing not found' }),
    (0, common_1.Get)(':id'),
    __param(0, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number]),
    __metadata("design:returntype", Promise)
], StandingsController.prototype, "findOne", null);
__decorate([
    (0, swagger_1.ApiOperation)({ summary: 'Create a new standing entry' }),
    (0, swagger_1.ApiResponse)({ status: 201, description: 'The standing has been successfully created.' }),
    (0, common_1.Post)(),
    (0, common_1.HttpCode)(common_1.HttpStatus.CREATED),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [dtos_1.CreateStandingDto]),
    __metadata("design:returntype", Promise)
], StandingsController.prototype, "create", null);
__decorate([
    (0, swagger_1.ApiOperation)({ summary: 'Update a standing entry' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'The standing has been successfully updated.' }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'Standing not found' }),
    (0, common_1.Put)(':id'),
    __param(0, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, dtos_1.UpdateStandingDto]),
    __metadata("design:returntype", Promise)
], StandingsController.prototype, "update", null);
__decorate([
    (0, swagger_1.ApiOperation)({ summary: 'Delete a standing entry' }),
    (0, swagger_1.ApiResponse)({ status: 204, description: 'The standing has been successfully deleted.' }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'Standing not found' }),
    (0, common_1.Delete)(':id'),
    (0, common_1.HttpCode)(common_1.HttpStatus.NO_CONTENT),
    __param(0, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number]),
    __metadata("design:returntype", Promise)
], StandingsController.prototype, "remove", null);
exports.StandingsController = StandingsController = __decorate([
    (0, swagger_1.ApiTags)('standings'),
    (0, common_1.Controller)('standings'),
    __metadata("design:paramtypes", [standings_service_1.StandingsService])
], StandingsController);
//# sourceMappingURL=standings.controller.js.map