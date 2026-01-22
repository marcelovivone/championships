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
exports.CountriesController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const countries_service_1 = require("./countries.service");
const dtos_1 = require("../common/dtos");
let CountriesController = class CountriesController {
    constructor(countriesService) {
        this.countriesService = countriesService;
    }
    async findAll(paginationDto, filteringDto) {
        return this.countriesService.findAll(paginationDto, filteringDto);
    }
    async findOne(id) {
        return this.countriesService.findOne(id);
    }
    async findByContinent(continent) {
        return this.countriesService.findByContinent(continent);
    }
    async create(createCountryDto) {
        return this.countriesService.create(createCountryDto);
    }
    async update(id, updateCountryDto) {
        return this.countriesService.update(id, updateCountryDto);
    }
    async remove(id) {
        await this.countriesService.remove(id);
    }
};
exports.CountriesController = CountriesController;
__decorate([
    (0, swagger_1.ApiOperation)({ summary: 'Retrieve all countries (paginated, sorted, and filtered)' }),
    (0, swagger_1.ApiOkResponse)({
        description: 'A paginated list of countries.',
        schema: {
            properties: {
                data: { type: 'array', items: { $ref: '#/components/schemas/CountryResponseDto' } },
                total: { type: 'number', example: 50 },
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
], CountriesController.prototype, "findAll", null);
__decorate([
    (0, swagger_1.ApiOperation)({ summary: 'Retrieve a country by ID' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'The country details', type: dtos_1.CountryResponseDto }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'Country not found' }),
    (0, common_1.Get)(':id'),
    __param(0, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number]),
    __metadata("design:returntype", Promise)
], CountriesController.prototype, "findOne", null);
__decorate([
    (0, swagger_1.ApiOperation)({ summary: 'Retrieve countries by continent' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'List of countries in the continent', type: [dtos_1.CountryResponseDto] }),
    (0, common_1.Get)('continent/:continent'),
    __param(0, (0, common_1.Param)('continent')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], CountriesController.prototype, "findByContinent", null);
__decorate([
    (0, swagger_1.ApiOperation)({ summary: 'Create a new country' }),
    (0, swagger_1.ApiResponse)({ status: 201, description: 'The country has been successfully created.', type: dtos_1.CountryResponseDto }),
    (0, swagger_1.ApiResponse)({ status: 400, description: 'Bad Request.' }),
    (0, common_1.Post)(),
    (0, common_1.HttpCode)(common_1.HttpStatus.CREATED),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [dtos_1.CreateCountryDto]),
    __metadata("design:returntype", Promise)
], CountriesController.prototype, "create", null);
__decorate([
    (0, swagger_1.ApiOperation)({ summary: 'Update a country' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'The country has been successfully updated.', type: dtos_1.CountryResponseDto }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'Country not found' }),
    (0, common_1.Put)(':id'),
    __param(0, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, dtos_1.UpdateCountryDto]),
    __metadata("design:returntype", Promise)
], CountriesController.prototype, "update", null);
__decorate([
    (0, swagger_1.ApiOperation)({ summary: 'Delete a country' }),
    (0, swagger_1.ApiResponse)({ status: 204, description: 'The country has been successfully deleted.' }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'Country not found' }),
    (0, common_1.Delete)(':id'),
    (0, common_1.HttpCode)(common_1.HttpStatus.NO_CONTENT),
    __param(0, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number]),
    __metadata("design:returntype", Promise)
], CountriesController.prototype, "remove", null);
exports.CountriesController = CountriesController = __decorate([
    (0, swagger_1.ApiTags)('countries'),
    (0, common_1.Controller)('countries'),
    __metadata("design:paramtypes", [countries_service_1.CountriesService])
], CountriesController);
//# sourceMappingURL=countries.controller.js.map