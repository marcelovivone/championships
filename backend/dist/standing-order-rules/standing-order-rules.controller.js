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
exports.StandingOrderRulesController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const standing_order_rules_service_1 = require("./standing-order-rules.service");
const dtos_1 = require("../common/dtos");
let StandingOrderRulesController = class StandingOrderRulesController {
    constructor(service) {
        this.service = service;
    }
    async findAll(sportId, leagueId, page = '1', limit = '50', sortBy = 'sortOrder', sortOrder = 'asc') {
        const params = {
            sportId: sportId ? parseInt(sportId, 10) : undefined,
            leagueId: leagueId || undefined,
            page: parseInt(page, 10) || 1,
            limit: parseInt(limit, 10) || 50,
            sortBy: sortBy || 'sortOrder',
            sortOrder: sortOrder === 'desc' ? 'desc' : 'asc',
        };
        return this.service.findAll(params);
    }
    async resolve(leagueId, sportId, year) {
        return this.service.resolveForLeagueAndSeason(leagueId, sportId, year);
    }
    async findOne(id) {
        return this.service.findOne(id);
    }
    async create(dto) {
        return this.service.create(dto);
    }
    async resequence(body) {
        return this.service.resequence(body.sportId, body.leagueId ?? null, body.startYear ?? null);
    }
    async update(id, dto) {
        return this.service.update(id, dto);
    }
    async remove(id) {
        await this.service.remove(id);
        return { success: true };
    }
};
exports.StandingOrderRulesController = StandingOrderRulesController;
__decorate([
    (0, common_1.Get)(),
    (0, swagger_1.ApiOperation)({ summary: 'List standing order rules (filtered by sportId, leagueId)' }),
    __param(0, (0, common_1.Query)('sportId')),
    __param(1, (0, common_1.Query)('leagueId')),
    __param(2, (0, common_1.Query)('page')),
    __param(3, (0, common_1.Query)('limit')),
    __param(4, (0, common_1.Query)('sortBy')),
    __param(5, (0, common_1.Query)('sortOrder')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object, Object, Object, Object]),
    __metadata("design:returntype", Promise)
], StandingOrderRulesController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)('resolve/:leagueId/:sportId/:year'),
    (0, swagger_1.ApiOperation)({ summary: 'Resolve effective rules for a league and season year' }),
    __param(0, (0, common_1.Param)('leagueId', common_1.ParseIntPipe)),
    __param(1, (0, common_1.Param)('sportId', common_1.ParseIntPipe)),
    __param(2, (0, common_1.Param)('year', common_1.ParseIntPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, Number, Number]),
    __metadata("design:returntype", Promise)
], StandingOrderRulesController.prototype, "resolve", null);
__decorate([
    (0, common_1.Get)(':id'),
    __param(0, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number]),
    __metadata("design:returntype", Promise)
], StandingOrderRulesController.prototype, "findOne", null);
__decorate([
    (0, common_1.Post)(),
    (0, common_1.HttpCode)(common_1.HttpStatus.CREATED),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [dtos_1.CreateStandingOrderRuleDto]),
    __metadata("design:returntype", Promise)
], StandingOrderRulesController.prototype, "create", null);
__decorate([
    (0, common_1.Post)('resequence'),
    (0, swagger_1.ApiOperation)({ summary: 'Re-sequence sort_order values back to 100, 200, 300...' }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], StandingOrderRulesController.prototype, "resequence", null);
__decorate([
    (0, common_1.Put)(':id'),
    __param(0, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, dtos_1.UpdateStandingOrderRuleDto]),
    __metadata("design:returntype", Promise)
], StandingOrderRulesController.prototype, "update", null);
__decorate([
    (0, common_1.Delete)(':id'),
    (0, common_1.HttpCode)(common_1.HttpStatus.NO_CONTENT),
    __param(0, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number]),
    __metadata("design:returntype", Promise)
], StandingOrderRulesController.prototype, "remove", null);
exports.StandingOrderRulesController = StandingOrderRulesController = __decorate([
    (0, swagger_1.ApiTags)('Standing Order Rules'),
    (0, common_1.Controller)({ path: 'standing-order-rules', version: '1' }),
    __metadata("design:paramtypes", [standing_order_rules_service_1.StandingOrderRulesService])
], StandingOrderRulesController);
//# sourceMappingURL=standing-order-rules.controller.js.map