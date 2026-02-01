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
exports.ClubStadiumsController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const club_stadiums_service_1 = require("./club-stadiums.service");
const create_club_stadium_dto_1 = require("./dto/create-club-stadium.dto");
const update_club_stadium_dto_1 = require("./dto/update-club-stadium.dto");
let ClubStadiumsController = class ClubStadiumsController {
    constructor(clubStadiumsService) {
        this.clubStadiumsService = clubStadiumsService;
    }
    create(createClubStadiumDto) {
        return this.clubStadiumsService.create(createClubStadiumDto);
    }
    findAll() {
        return this.clubStadiumsService.findAll();
    }
    findByClub(clubId) {
        return this.clubStadiumsService.findByClub(clubId);
    }
    findActiveByClub(clubId) {
        return this.clubStadiumsService.findActiveByClub(clubId);
    }
    findOne(id) {
        return this.clubStadiumsService.findOne(id);
    }
    update(id, updateClubStadiumDto) {
        return this.clubStadiumsService.update(id, updateClubStadiumDto);
    }
    remove(id) {
        return this.clubStadiumsService.remove(id);
    }
};
exports.ClubStadiumsController = ClubStadiumsController;
__decorate([
    (0, common_1.Post)(),
    (0, common_1.Version)('1'),
    (0, swagger_1.ApiOperation)({ summary: 'Create a new club-stadium relationship' }),
    (0, swagger_1.ApiResponse)({ status: 201, description: 'Club stadium created successfully' }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [create_club_stadium_dto_1.CreateClubStadiumDto]),
    __metadata("design:returntype", void 0)
], ClubStadiumsController.prototype, "create", null);
__decorate([
    (0, common_1.Get)(),
    (0, common_1.Version)('1'),
    (0, swagger_1.ApiOperation)({ summary: 'Get all club-stadium relationships' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'List of all club stadiums' }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], ClubStadiumsController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)('club/:clubId'),
    (0, common_1.Version)('1'),
    (0, swagger_1.ApiOperation)({ summary: 'Get all stadium relationships for a specific club' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'List of stadiums for the club' }),
    __param(0, (0, common_1.Param)('clubId', common_1.ParseIntPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number]),
    __metadata("design:returntype", void 0)
], ClubStadiumsController.prototype, "findByClub", null);
__decorate([
    (0, common_1.Get)('club/:clubId/active'),
    (0, common_1.Version)('1'),
    (0, swagger_1.ApiOperation)({ summary: 'Get the active stadium for a specific club' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Active stadium for the club' }),
    __param(0, (0, common_1.Param)('clubId', common_1.ParseIntPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number]),
    __metadata("design:returntype", void 0)
], ClubStadiumsController.prototype, "findActiveByClub", null);
__decorate([
    (0, common_1.Get)(':id'),
    (0, common_1.Version)('1'),
    (0, swagger_1.ApiOperation)({ summary: 'Get a specific club-stadium relationship' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Club stadium details' }),
    __param(0, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number]),
    __metadata("design:returntype", void 0)
], ClubStadiumsController.prototype, "findOne", null);
__decorate([
    (0, common_1.Put)(':id'),
    (0, common_1.Version)('1'),
    (0, swagger_1.ApiOperation)({ summary: 'Update a club-stadium relationship' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Club stadium updated successfully' }),
    __param(0, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, update_club_stadium_dto_1.UpdateClubStadiumDto]),
    __metadata("design:returntype", void 0)
], ClubStadiumsController.prototype, "update", null);
__decorate([
    (0, common_1.Delete)(':id'),
    (0, common_1.Version)('1'),
    (0, swagger_1.ApiOperation)({ summary: 'Delete a club-stadium relationship' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Club stadium deleted successfully' }),
    __param(0, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number]),
    __metadata("design:returntype", void 0)
], ClubStadiumsController.prototype, "remove", null);
exports.ClubStadiumsController = ClubStadiumsController = __decorate([
    (0, swagger_1.ApiTags)('Club Stadiums'),
    (0, common_1.Controller)('club-stadiums'),
    __metadata("design:paramtypes", [club_stadiums_service_1.ClubStadiumsService])
], ClubStadiumsController);
//# sourceMappingURL=club-stadiums.controller.js.map