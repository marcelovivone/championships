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
exports.PhasesController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const phases_service_1 = require("./phases.service");
const dtos_1 = require("../common/dtos");
let PhasesController = class PhasesController {
    constructor(phasesService) {
        this.phasesService = phasesService;
    }
    async findAll(seasonId) {
        if (seasonId) {
            return this.phasesService.findBySeason(parseInt(seasonId, 10));
        }
        return this.phasesService.findAll();
    }
    async findOne(id) {
        return this.phasesService.findOne(id);
    }
    async create(createPhaseDto) {
        return this.phasesService.create(createPhaseDto);
    }
    async update(id, updatePhaseDto) {
        return this.phasesService.update(id, updatePhaseDto);
    }
    async remove(id) {
        await this.phasesService.remove(id);
    }
};
exports.PhasesController = PhasesController;
__decorate([
    (0, swagger_1.ApiOperation)({ summary: 'Retrieve all phases' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'List of phases' }),
    (0, common_1.Get)(),
    __param(0, (0, common_1.Query)('seasonId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], PhasesController.prototype, "findAll", null);
__decorate([
    (0, swagger_1.ApiOperation)({ summary: 'Retrieve a phase by ID' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'The phase details' }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'Phase not found' }),
    (0, common_1.Get)(':id'),
    __param(0, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number]),
    __metadata("design:returntype", Promise)
], PhasesController.prototype, "findOne", null);
__decorate([
    (0, swagger_1.ApiOperation)({ summary: 'Create a new phase' }),
    (0, swagger_1.ApiResponse)({ status: 201, description: 'The phase has been successfully created.' }),
    (0, common_1.Post)(),
    (0, common_1.HttpCode)(common_1.HttpStatus.CREATED),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [dtos_1.CreatePhaseDto]),
    __metadata("design:returntype", Promise)
], PhasesController.prototype, "create", null);
__decorate([
    (0, swagger_1.ApiOperation)({ summary: 'Update a phase' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'The phase has been successfully updated.' }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'Phase not found' }),
    (0, common_1.Put)(':id'),
    __param(0, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, dtos_1.UpdatePhaseDto]),
    __metadata("design:returntype", Promise)
], PhasesController.prototype, "update", null);
__decorate([
    (0, swagger_1.ApiOperation)({ summary: 'Delete a phase' }),
    (0, swagger_1.ApiResponse)({ status: 204, description: 'The phase has been successfully deleted.' }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'Phase not found' }),
    (0, common_1.Delete)(':id'),
    (0, common_1.HttpCode)(common_1.HttpStatus.NO_CONTENT),
    __param(0, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number]),
    __metadata("design:returntype", Promise)
], PhasesController.prototype, "remove", null);
exports.PhasesController = PhasesController = __decorate([
    (0, swagger_1.ApiTags)('phases'),
    (0, common_1.Controller)('phases'),
    __metadata("design:paramtypes", [phases_service_1.PhasesService])
], PhasesController);
//# sourceMappingURL=phases.controller.js.map