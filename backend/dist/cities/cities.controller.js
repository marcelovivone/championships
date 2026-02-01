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
exports.CitiesController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const cities_service_1 = require("./cities.service");
const dtos_1 = require("../common/dtos");
let CitiesController = class CitiesController {
    constructor(citiesService) {
        this.citiesService = citiesService;
    }
    async findAll(paginationDto, filteringDto, countryId) {
        const { page, limit } = paginationDto;
        if (countryId) {
            return this.citiesService.findByCountry(parseInt(countryId, 10), { page, limit });
        }
        return this.citiesService.findAll({ page, limit }, filteringDto);
    }
    async findOne(id) {
        return this.citiesService.findOne(id);
    }
    async create(createCityDto) {
        return this.citiesService.create(createCityDto);
    }
    async update(id, updateCityDto) {
        return this.citiesService.update(id, updateCityDto);
    }
    async remove(id) {
        await this.citiesService.remove(id);
    }
};
exports.CitiesController = CitiesController;
__decorate([
    (0, swagger_1.ApiOperation)({ summary: 'Retrieve all cities (paginated)' }),
    (0, swagger_1.ApiOkResponse)({
        description: 'A paginated list of cities.',
        schema: {
            properties: {
                data: { type: 'array', items: { $ref: '#/components/schemas/CityResponseDto' } },
                total: { type: 'number', example: 50 },
                page: { type: 'number', example: 1 },
                limit: { type: 'number', example: 10 },
            },
        },
    }),
    (0, common_1.Get)(),
    __param(0, (0, common_1.Query)()),
    __param(1, (0, common_1.Query)()),
    __param(2, (0, common_1.Query)('countryId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [dtos_1.PaginationDto, dtos_1.FilteringDto, String]),
    __metadata("design:returntype", Promise)
], CitiesController.prototype, "findAll", null);
__decorate([
    (0, swagger_1.ApiOperation)({ summary: 'Retrieve a city by ID' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'The city details' }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'City not found' }),
    (0, common_1.Get)(':id'),
    __param(0, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number]),
    __metadata("design:returntype", Promise)
], CitiesController.prototype, "findOne", null);
__decorate([
    (0, swagger_1.ApiOperation)({ summary: 'Create a new city' }),
    (0, swagger_1.ApiResponse)({ status: 201, description: 'The city has been successfully created.' }),
    (0, common_1.Post)(),
    (0, common_1.HttpCode)(common_1.HttpStatus.CREATED),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [dtos_1.CreateCityDto]),
    __metadata("design:returntype", Promise)
], CitiesController.prototype, "create", null);
__decorate([
    (0, swagger_1.ApiOperation)({ summary: 'Update a city' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'The city has been successfully updated.' }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'City not found' }),
    (0, common_1.Put)(':id'),
    __param(0, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, dtos_1.UpdateCityDto]),
    __metadata("design:returntype", Promise)
], CitiesController.prototype, "update", null);
__decorate([
    (0, swagger_1.ApiOperation)({ summary: 'Delete a city' }),
    (0, swagger_1.ApiResponse)({ status: 204, description: 'The city has been successfully deleted.' }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'City not found' }),
    (0, common_1.Delete)(':id'),
    (0, common_1.HttpCode)(common_1.HttpStatus.NO_CONTENT),
    __param(0, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number]),
    __metadata("design:returntype", Promise)
], CitiesController.prototype, "remove", null);
exports.CitiesController = CitiesController = __decorate([
    (0, swagger_1.ApiTags)('cities'),
    (0, common_1.Controller)({ path: 'cities', version: '1' }),
    __metadata("design:paramtypes", [cities_service_1.CitiesService])
], CitiesController);
//# sourceMappingURL=cities.controller.js.map