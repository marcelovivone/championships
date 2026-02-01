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
exports.StadiumsController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const stadiums_service_1 = require("./stadiums.service");
const dtos_1 = require("../common/dtos");
let StadiumsController = class StadiumsController {
    constructor(stadiumsService) {
        this.stadiumsService = stadiumsService;
    }
    async findAll(paginationDto, filteringDto, cityId, type) {
        if (cityId) {
            return this.stadiumsService.findByCity(parseInt(cityId, 10), paginationDto);
        }
        return this.stadiumsService.findAll(paginationDto, filteringDto);
    }
    async findOne(id) {
        return this.stadiumsService.findOne(id);
    }
    async create(createStadiumDto) {
        return this.stadiumsService.create(createStadiumDto);
    }
    async update(id, updateStadiumDto) {
        return this.stadiumsService.update(id, updateStadiumDto);
    }
    async remove(id) {
        await this.stadiumsService.remove(id);
    }
};
exports.StadiumsController = StadiumsController;
__decorate([
    (0, swagger_1.ApiOperation)({ summary: 'Retrieve all stadiums (paginated)' }),
    (0, swagger_1.ApiOkResponse)({
        description: 'A paginated list of stadiums.',
        schema: {
            properties: {
                data: { type: 'array', items: { $ref: '#/components/schemas/StadiumResponseDto' } },
                total: { type: 'number', example: 50 },
                page: { type: 'number', example: 1 },
                limit: { type: 'number', example: 10 },
            },
        },
    }),
    (0, common_1.Get)(),
    __param(0, (0, common_1.Query)()),
    __param(1, (0, common_1.Query)()),
    __param(2, (0, common_1.Query)('cityId')),
    __param(3, (0, common_1.Query)('type')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [dtos_1.PaginationDto,
        dtos_1.FilteringDto, String, String]),
    __metadata("design:returntype", Promise)
], StadiumsController.prototype, "findAll", null);
__decorate([
    (0, swagger_1.ApiOperation)({ summary: 'Retrieve a stadium by ID' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'The stadium details' }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'Stadium not found' }),
    (0, common_1.Get)(':id'),
    __param(0, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number]),
    __metadata("design:returntype", Promise)
], StadiumsController.prototype, "findOne", null);
__decorate([
    (0, swagger_1.ApiOperation)({ summary: 'Create a new stadium' }),
    (0, swagger_1.ApiResponse)({ status: 201, description: 'The stadium has been successfully created.' }),
    (0, common_1.Post)(),
    (0, common_1.HttpCode)(common_1.HttpStatus.CREATED),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [dtos_1.CreateStadiumDto]),
    __metadata("design:returntype", Promise)
], StadiumsController.prototype, "create", null);
__decorate([
    (0, swagger_1.ApiOperation)({ summary: 'Update a stadium' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'The stadium has been successfully updated.' }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'Stadium not found' }),
    (0, common_1.Put)(':id'),
    __param(0, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, dtos_1.UpdateStadiumDto]),
    __metadata("design:returntype", Promise)
], StadiumsController.prototype, "update", null);
__decorate([
    (0, swagger_1.ApiOperation)({ summary: 'Delete a stadium' }),
    (0, swagger_1.ApiResponse)({ status: 204, description: 'The stadium has been successfully deleted.' }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'Stadium not found' }),
    (0, common_1.Delete)(':id'),
    (0, common_1.HttpCode)(common_1.HttpStatus.NO_CONTENT),
    __param(0, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number]),
    __metadata("design:returntype", Promise)
], StadiumsController.prototype, "remove", null);
exports.StadiumsController = StadiumsController = __decorate([
    (0, swagger_1.ApiTags)('stadiums'),
    (0, common_1.Controller)({ path: 'stadiums', version: '1' }),
    __metadata("design:paramtypes", [stadiums_service_1.StadiumsService])
], StadiumsController);
//# sourceMappingURL=stadiums.controller.js.map