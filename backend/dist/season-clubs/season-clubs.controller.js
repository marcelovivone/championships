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
exports.SeasonClubsController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const season_clubs_service_1 = require("./season-clubs.service");
const dto_1 = require("./dto");
let SeasonClubsController = class SeasonClubsController {
    constructor(seasonClubsService) {
        this.seasonClubsService = seasonClubsService;
    }
    async findAll() {
        return await this.seasonClubsService.findAll();
    }
    async findOne(id) {
        return await this.seasonClubsService.findOne(parseInt(id));
    }
    async findBySeason(seasonId) {
        return await this.seasonClubsService.findBySeason(parseInt(seasonId));
    }
    async findByClub(clubId) {
        return await this.seasonClubsService.findByClub(parseInt(clubId));
    }
    async create(dto) {
        return await this.seasonClubsService.create(dto);
    }
    async update(id, dto) {
        return await this.seasonClubsService.update(parseInt(id), dto);
    }
    async remove(id) {
        return await this.seasonClubsService.remove(parseInt(id));
    }
};
exports.SeasonClubsController = SeasonClubsController;
__decorate([
    (0, common_1.Get)(),
    (0, swagger_1.ApiOperation)({ summary: 'Retrieve all season-club associations' }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'List of all season-club associations',
        type: [dto_1.SeasonClubResponseDto],
    }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], SeasonClubsController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)(':id'),
    (0, swagger_1.ApiOperation)({ summary: 'Retrieve a season-club association by ID' }),
    (0, swagger_1.ApiParam)({ name: 'id', description: 'The ID of the season-club association' }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'The season-club association details',
        type: dto_1.SeasonClubResponseDto,
    }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'Season-club association not found' }),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], SeasonClubsController.prototype, "findOne", null);
__decorate([
    (0, common_1.Get)('season/:seasonId'),
    (0, swagger_1.ApiOperation)({ summary: 'Retrieve all clubs in a specific season' }),
    (0, swagger_1.ApiParam)({ name: 'seasonId', description: 'The ID of the season' }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'List of clubs in the season',
        type: [dto_1.SeasonClubResponseDto],
    }),
    __param(0, (0, common_1.Param)('seasonId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], SeasonClubsController.prototype, "findBySeason", null);
__decorate([
    (0, common_1.Get)('club/:clubId'),
    (0, swagger_1.ApiOperation)({ summary: 'Retrieve all seasons a club participates in' }),
    (0, swagger_1.ApiParam)({ name: 'clubId', description: 'The ID of the club' }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'List of seasons the club participates in',
        type: [dto_1.SeasonClubResponseDto],
    }),
    __param(0, (0, common_1.Param)('clubId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], SeasonClubsController.prototype, "findByClub", null);
__decorate([
    (0, common_1.Post)(),
    (0, swagger_1.ApiOperation)({ summary: 'Create a new season-club association' }),
    (0, swagger_1.ApiBody)({ type: dto_1.CreateSeasonClubDto, description: 'Season-club association details' }),
    (0, swagger_1.ApiResponse)({
        status: 201,
        description: 'Season-club association created successfully',
        type: dto_1.SeasonClubResponseDto,
    }),
    (0, swagger_1.ApiResponse)({ status: 400, description: 'Invalid input or association already exists' }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [dto_1.CreateSeasonClubDto]),
    __metadata("design:returntype", Promise)
], SeasonClubsController.prototype, "create", null);
__decorate([
    (0, common_1.Put)(':id'),
    (0, swagger_1.ApiOperation)({ summary: 'Update a season-club association' }),
    (0, swagger_1.ApiParam)({ name: 'id', description: 'The ID of the season-club association' }),
    (0, swagger_1.ApiBody)({ type: dto_1.UpdateSeasonClubDto, description: 'Updated association details' }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'Season-club association updated successfully',
        type: dto_1.SeasonClubResponseDto,
    }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'Season-club association not found' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, dto_1.UpdateSeasonClubDto]),
    __metadata("design:returntype", Promise)
], SeasonClubsController.prototype, "update", null);
__decorate([
    (0, common_1.Delete)(':id'),
    (0, swagger_1.ApiOperation)({ summary: 'Remove a season-club association' }),
    (0, swagger_1.ApiParam)({ name: 'id', description: 'The ID of the season-club association' }),
    (0, swagger_1.ApiResponse)({ status: 204, description: 'Season-club association deleted successfully' }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'Season-club association not found' }),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], SeasonClubsController.prototype, "remove", null);
exports.SeasonClubsController = SeasonClubsController = __decorate([
    (0, swagger_1.ApiTags)('season-clubs'),
    (0, common_1.Controller)('season-clubs'),
    __metadata("design:paramtypes", [season_clubs_service_1.SeasonClubsService])
], SeasonClubsController);
//# sourceMappingURL=season-clubs.controller.js.map