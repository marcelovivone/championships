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
exports.SportClubsController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const sport_clubs_service_1 = require("./sport-clubs.service");
const dto_1 = require("./dto");
let SportClubsController = class SportClubsController {
    constructor(sportClubsService) {
        this.sportClubsService = sportClubsService;
    }
    async findAll() {
        return this.sportClubsService.findAll();
    }
    async findOne(id) {
        return this.sportClubsService.findOne(+id);
    }
    async findBySport(sportId) {
        return this.sportClubsService.findBySport(+sportId);
    }
    async findByClub(clubId) {
        return this.sportClubsService.findByClub(+clubId);
    }
    async create(createDto) {
        return this.sportClubsService.create(createDto);
    }
    async bulkUpdateForSport(sportId, body) {
        await this.sportClubsService.bulkUpdateForSport(+sportId, body.clubIds);
        return { message: 'Sport-club associations updated successfully' };
    }
    async update(id, updateDto) {
        return this.sportClubsService.update(+id, updateDto);
    }
    async remove(id) {
        await this.sportClubsService.remove(+id);
    }
};
exports.SportClubsController = SportClubsController;
__decorate([
    (0, swagger_1.ApiOperation)({ summary: 'Retrieve all sport-club associations' }),
    (0, swagger_1.ApiOkResponse)({
        description: 'A list of all sport-club associations',
        type: [dto_1.SportClubResponseDto],
    }),
    (0, common_1.Get)(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], SportClubsController.prototype, "findAll", null);
__decorate([
    (0, swagger_1.ApiOperation)({ summary: 'Retrieve a sport-club association by ID' }),
    (0, swagger_1.ApiParam)({ name: 'id', description: 'Sport-Club association ID' }),
    (0, swagger_1.ApiOkResponse)({
        description: 'The sport-club association',
        type: dto_1.SportClubResponseDto,
    }),
    (0, common_1.Get)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], SportClubsController.prototype, "findOne", null);
__decorate([
    (0, swagger_1.ApiOperation)({ summary: 'Get all clubs for a specific sport' }),
    (0, swagger_1.ApiParam)({ name: 'sportId', description: 'Sport ID' }),
    (0, common_1.Get)('sport/:sportId'),
    __param(0, (0, common_1.Param)('sportId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], SportClubsController.prototype, "findBySport", null);
__decorate([
    (0, swagger_1.ApiOperation)({ summary: 'Get all sports for a specific club' }),
    (0, swagger_1.ApiParam)({ name: 'clubId', description: 'Club ID' }),
    (0, common_1.Get)('club/:clubId'),
    __param(0, (0, common_1.Param)('clubId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], SportClubsController.prototype, "findByClub", null);
__decorate([
    (0, swagger_1.ApiOperation)({ summary: 'Create a new sport-club association' }),
    (0, swagger_1.ApiResponse)({
        status: 201,
        description: 'The sport-club association has been created',
        type: dto_1.SportClubResponseDto,
    }),
    (0, common_1.Post)(),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [dto_1.CreateSportClubDto]),
    __metadata("design:returntype", Promise)
], SportClubsController.prototype, "create", null);
__decorate([
    (0, swagger_1.ApiOperation)({ summary: 'Bulk update clubs for a sport' }),
    (0, swagger_1.ApiParam)({ name: 'sportId', description: 'Sport ID' }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'Clubs have been updated for the sport',
    }),
    (0, common_1.Put)('sport/:sportId/clubs'),
    __param(0, (0, common_1.Param)('sportId')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], SportClubsController.prototype, "bulkUpdateForSport", null);
__decorate([
    (0, swagger_1.ApiOperation)({ summary: 'Update a sport-club association' }),
    (0, swagger_1.ApiParam)({ name: 'id', description: 'Sport-Club association ID' }),
    (0, swagger_1.ApiOkResponse)({
        description: 'The sport-club association has been updated',
        type: dto_1.SportClubResponseDto,
    }),
    (0, common_1.Put)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, dto_1.UpdateSportClubDto]),
    __metadata("design:returntype", Promise)
], SportClubsController.prototype, "update", null);
__decorate([
    (0, swagger_1.ApiOperation)({ summary: 'Delete a sport-club association' }),
    (0, swagger_1.ApiParam)({ name: 'id', description: 'Sport-Club association ID' }),
    (0, common_1.HttpCode)(common_1.HttpStatus.NO_CONTENT),
    (0, common_1.Delete)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], SportClubsController.prototype, "remove", null);
exports.SportClubsController = SportClubsController = __decorate([
    (0, swagger_1.ApiTags)('sport-clubs'),
    (0, common_1.Controller)({ path: 'sport-clubs', version: '1' }),
    __metadata("design:paramtypes", [sport_clubs_service_1.SportClubsService])
], SportClubsController);
//# sourceMappingURL=sport-clubs.controller.js.map