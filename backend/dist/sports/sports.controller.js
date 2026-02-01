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
exports.SportsController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const sports_service_1 = require("./sports.service");
const dtos_1 = require("../common/dtos");
let SportsController = class SportsController {
    constructor(sportsService) {
        this.sportsService = sportsService;
    }
    async findAll(paginationDto, filteringDto) {
        return this.sportsService.findAll(paginationDto, filteringDto);
    }
    async findOne(id) {
        return this.sportsService.findOne(+id);
    }
    async findByType(type) {
        return this.sportsService.findByType(type);
    }
    async create(createSportDto) {
        return this.sportsService.create(createSportDto);
    }
    async update(id, updateSportDto) {
        return this.sportsService.update(+id, updateSportDto);
    }
    async remove(id) {
        await this.sportsService.remove(+id);
    }
};
exports.SportsController = SportsController;
__decorate([
    (0, swagger_1.ApiOperation)({ summary: 'Retrieve all sports (paginated)' }),
    (0, swagger_1.ApiOkResponse)({
        description: 'A paginated list of sports.',
        schema: {
            properties: {
                data: { type: 'array', items: { $ref: '#/components/schemas/SportResponseDto' } },
                total: { type: 'number', example: 6 },
                page: { type: 'number', example: 1 },
                limit: { type: 'number', example: 10 },
            },
        },
    }),
    (0, common_1.Get)(),
    __param(0, (0, common_1.Query)()),
    __param(1, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [dtos_1.PaginationDto, dtos_1.FilteringDto]),
    __metadata("design:returntype", Promise)
], SportsController.prototype, "findAll", null);
__decorate([
    (0, swagger_1.ApiOperation)({ summary: 'Retrieve a sport by ID' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'The sport details', type: dtos_1.SportResponseDto }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'Sport not found' }),
    (0, common_1.Get)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], SportsController.prototype, "findOne", null);
__decorate([
    (0, swagger_1.ApiOperation)({ summary: 'Retrieve sports by type' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'List of sports of the given type', type: [dtos_1.SportResponseDto] }),
    (0, common_1.Get)('type/:type'),
    __param(0, (0, common_1.Param)('type')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], SportsController.prototype, "findByType", null);
__decorate([
    (0, swagger_1.ApiOperation)({ summary: 'Create a new sport' }),
    (0, swagger_1.ApiResponse)({ status: 201, description: 'The sport has been successfully created.', type: dtos_1.SportResponseDto }),
    (0, swagger_1.ApiResponse)({ status: 400, description: 'Bad Request.' }),
    (0, common_1.Post)(),
    (0, common_1.HttpCode)(common_1.HttpStatus.CREATED),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [dtos_1.CreateSportDto]),
    __metadata("design:returntype", Promise)
], SportsController.prototype, "create", null);
__decorate([
    (0, swagger_1.ApiOperation)({ summary: 'Update a sport' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'The sport has been successfully updated.', type: dtos_1.SportResponseDto }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'Sport not found' }),
    (0, common_1.Put)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, dtos_1.UpdateSportDto]),
    __metadata("design:returntype", Promise)
], SportsController.prototype, "update", null);
__decorate([
    (0, swagger_1.ApiOperation)({ summary: 'Delete a sport' }),
    (0, swagger_1.ApiResponse)({ status: 204, description: 'The sport has been successfully deleted.' }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'Sport not found' }),
    (0, common_1.Delete)(':id'),
    (0, common_1.HttpCode)(common_1.HttpStatus.NO_CONTENT),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], SportsController.prototype, "remove", null);
exports.SportsController = SportsController = __decorate([
    (0, swagger_1.ApiTags)('sports'),
    (0, common_1.Controller)({ path: 'sports', version: '1' }),
    __metadata("design:paramtypes", [sports_service_1.SportsService])
], SportsController);
//# sourceMappingURL=sports.controller.js.map