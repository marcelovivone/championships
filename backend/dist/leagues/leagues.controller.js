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
exports.LeaguesController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const leagues_service_1 = require("./leagues.service");
const dtos_1 = require("../common/dtos");
const jwt_auth_guard_1 = require("../auth/jwt-auth.guard");
const roles_guard_1 = require("../auth/roles.guard");
const roles_decorator_1 = require("../auth/roles.decorator");
const user_dto_1 = require("../common/dtos/user.dto");
let LeaguesController = class LeaguesController {
    constructor(leaguesService) {
        this.leaguesService = leaguesService;
    }
    async findAll(page, limit, sortBy, sortOrder, sportId) {
        if (sportId) {
            return this.leaguesService.findAllBySport(Number(sportId));
        }
        const pageNum = page ? parseInt(page, 10) : 1;
        const limitNum = limit ? parseInt(limit, 10) : 10;
        const sort = sortBy || 'originalName';
        const order = sortOrder === 'desc' ? 'desc' : 'asc';
        return this.leaguesService.findAllPaginated(pageNum, limitNum, sort, order);
    }
    async findOne(id) {
        return this.leaguesService.findOne(id);
    }
    async create(createLeagueDto) {
        return this.leaguesService.create(createLeagueDto);
    }
    async update(id, updateLeagueDto) {
        return this.leaguesService.update(id, updateLeagueDto);
    }
    async remove(id) {
        await this.leaguesService.remove(id);
    }
    async addLink(leagueId, createLeagueLinkDto) {
        return this.leaguesService.addLink(leagueId, createLeagueLinkDto.label, createLeagueLinkDto.url);
    }
    async removeLink(leagueId, linkId) {
        await this.leaguesService.removeLink(leagueId, linkId);
    }
};
exports.LeaguesController = LeaguesController;
__decorate([
    (0, swagger_1.ApiOperation)({ summary: 'Retrieve all leagues (paginated)' }),
    (0, swagger_1.ApiOkResponse)({
        description: 'A paginated list of leagues.',
        schema: {
            properties: {
                data: { type: 'array', items: { $ref: '#/components/schemas/LeagueResponseDto' } },
                total: { type: 'number', example: 50 },
                page: { type: 'number', example: 1 },
                limit: { type: 'number', example: 10 },
            },
        },
    }),
    (0, common_1.Get)(),
    __param(0, (0, common_1.Query)('page')),
    __param(1, (0, common_1.Query)('limit')),
    __param(2, (0, common_1.Query)('sortBy')),
    __param(3, (0, common_1.Query)('sortOrder')),
    __param(4, (0, common_1.Query)('sportId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, String, String]),
    __metadata("design:returntype", Promise)
], LeaguesController.prototype, "findAll", null);
__decorate([
    (0, swagger_1.ApiOperation)({ summary: 'Retrieve a league by ID' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'The league details' }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'League not found' }),
    (0, common_1.Get)(':id'),
    __param(0, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number]),
    __metadata("design:returntype", Promise)
], LeaguesController.prototype, "findOne", null);
__decorate([
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)(user_dto_1.UserProfile.ADMIN),
    (0, swagger_1.ApiOperation)({ summary: 'Create a new league' }),
    (0, swagger_1.ApiResponse)({ status: 201, description: 'The league has been successfully created.' }),
    (0, common_1.Post)(),
    (0, common_1.HttpCode)(common_1.HttpStatus.CREATED),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [dtos_1.CreateLeagueDto]),
    __metadata("design:returntype", Promise)
], LeaguesController.prototype, "create", null);
__decorate([
    (0, swagger_1.ApiOperation)({ summary: 'Update a league' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'The league has been successfully updated.' }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'League not found' }),
    (0, common_1.Put)(':id'),
    __param(0, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, dtos_1.UpdateLeagueDto]),
    __metadata("design:returntype", Promise)
], LeaguesController.prototype, "update", null);
__decorate([
    (0, swagger_1.ApiOperation)({ summary: 'Delete a league' }),
    (0, swagger_1.ApiResponse)({ status: 204, description: 'The league has been successfully deleted.' }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'League not found' }),
    (0, common_1.Delete)(':id'),
    (0, common_1.HttpCode)(common_1.HttpStatus.NO_CONTENT),
    __param(0, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number]),
    __metadata("design:returntype", Promise)
], LeaguesController.prototype, "remove", null);
__decorate([
    (0, swagger_1.ApiOperation)({ summary: 'Add external link to league' }),
    (0, swagger_1.ApiResponse)({ status: 201, description: 'Link created' }),
    (0, common_1.Post)(':id/links'),
    (0, common_1.HttpCode)(common_1.HttpStatus.CREATED),
    __param(0, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, Object]),
    __metadata("design:returntype", Promise)
], LeaguesController.prototype, "addLink", null);
__decorate([
    (0, swagger_1.ApiOperation)({ summary: 'Remove external link from league' }),
    (0, swagger_1.ApiResponse)({ status: 204, description: 'Link removed' }),
    (0, common_1.Delete)(':id/links/:linkId'),
    (0, common_1.HttpCode)(common_1.HttpStatus.NO_CONTENT),
    __param(0, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __param(1, (0, common_1.Param)('linkId', common_1.ParseIntPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, Number]),
    __metadata("design:returntype", Promise)
], LeaguesController.prototype, "removeLink", null);
exports.LeaguesController = LeaguesController = __decorate([
    (0, swagger_1.ApiTags)('leagues'),
    (0, common_1.Controller)({ path: 'leagues', version: '1' }),
    __metadata("design:paramtypes", [leagues_service_1.LeaguesService])
], LeaguesController);
//# sourceMappingURL=leagues.controller.js.map