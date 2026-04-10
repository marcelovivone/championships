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
var AdminController_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AdminController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const common_2 = require("@nestjs/common");
const admin_service_1 = require("./admin.service");
class TimezoneAdjustmentDto {
}
class TimezoneAdjustmentResponseDto {
}
let AdminController = AdminController_1 = class AdminController {
    constructor(adminService) {
        this.adminService = adminService;
        this.logger = new common_1.Logger(AdminController_1.name);
    }
    async timezoneAdjustment(req, dto) {
        const bodyObj = dto && Object.keys(dto).length ? dto : req.body;
        const payload = bodyObj;
        if (!payload || !payload.leagueId) {
            throw new common_1.BadRequestException('League ID is required');
        }
        if (!payload.adjustmentType || !['country', 'manual', 'set'].includes(payload.adjustmentType)) {
            throw new common_1.BadRequestException('Adjustment type must be one of "country", "manual", or "set"');
        }
        if (payload.adjustmentType === 'manual' && payload.manualHours === undefined) {
            throw new common_1.BadRequestException('Manual hours must be provided for manual adjustment type');
        }
        if (payload.adjustmentType === 'country' && !payload.countryTimezone) {
            throw new common_1.BadRequestException('Country timezone must be provided for country adjustment type');
        }
        if (payload.adjustmentType === 'set' && !payload.setTime) {
            throw new common_1.BadRequestException('setTime (HH:MM) must be provided when adjustment type is "set"');
        }
        if (payload.roundIds && !Array.isArray(payload.roundIds)) {
            throw new common_1.BadRequestException('roundIds must be an array of numbers');
        }
        if (payload.startDate && !/^\d{4}-\d{2}-\d{2}$/.test(payload.startDate)) {
            throw new common_1.BadRequestException('startDate must be in YYYY-MM-DD format');
        }
        if (payload.endDate && !/^\d{4}-\d{2}-\d{2}$/.test(payload.endDate)) {
            throw new common_1.BadRequestException('endDate must be in YYYY-MM-DD format');
        }
        if (payload.startDate && payload.endDate && payload.endDate < payload.startDate) {
            throw new common_1.BadRequestException('endDate cannot be earlier than startDate');
        }
        if (payload.matchId) {
            const roundsSelected = payload.roundIds ? payload.roundIds.length : (payload.roundId ? 1 : 0);
            const hasSingleDay = !!payload.startDate && (!payload.endDate || payload.endDate === payload.startDate);
            if (roundsSelected !== 1 && !hasSingleDay) {
                throw new common_1.BadRequestException('Selecting a specific match requires exactly one round or exactly one day to be selected');
            }
        }
        try {
            const result = await this.adminService.performTimezoneAdjustment(payload);
            return result;
        }
        catch (error) {
            throw new common_1.BadRequestException(`Timezone adjustment failed: ${error.message}`);
        }
    }
};
exports.AdminController = AdminController;
__decorate([
    (0, swagger_1.ApiOperation)({
        summary: 'Update timezone information for matches and standings',
        description: 'Corrects timezone data for existing matches and recalculates standings based on updated match dates'
    }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'Timezone adjustment completed successfully',
        type: TimezoneAdjustmentResponseDto
    }),
    (0, swagger_1.ApiResponse)({ status: 400, description: 'Invalid request parameters' }),
    (0, common_1.Post)('timezone-adjustment'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, common_2.Req)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, TimezoneAdjustmentDto]),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "timezoneAdjustment", null);
exports.AdminController = AdminController = AdminController_1 = __decorate([
    (0, swagger_1.ApiTags)('Admin'),
    (0, common_1.Controller)({ path: 'admin', version: '1' }),
    __metadata("design:paramtypes", [admin_service_1.AdminService])
], AdminController);
//# sourceMappingURL=admin.controller.js.map