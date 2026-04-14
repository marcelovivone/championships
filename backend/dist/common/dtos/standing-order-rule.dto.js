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
Object.defineProperty(exports, "__esModule", { value: true });
exports.StandingOrderRuleResponseDto = exports.UpdateStandingOrderRuleDto = exports.CreateStandingOrderRuleDto = void 0;
const class_validator_1 = require("class-validator");
const class_transformer_1 = require("class-transformer");
const swagger_1 = require("@nestjs/swagger");
class CreateStandingOrderRuleDto {
    constructor() {
        this.direction = 'DESC';
    }
}
exports.CreateStandingOrderRuleDto = CreateStandingOrderRuleDto;
__decorate([
    (0, swagger_1.ApiProperty)({ example: 3, description: 'Sport ID' }),
    (0, class_validator_1.IsInt)(),
    (0, class_transformer_1.Type)(() => Number),
    __metadata("design:type", Number)
], CreateStandingOrderRuleDto.prototype, "sportId", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 1, description: 'League ID (null = sport-level default)', required: false }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsInt)(),
    (0, class_transformer_1.Type)(() => Number),
    __metadata("design:type", Number)
], CreateStandingOrderRuleDto.prototype, "leagueId", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 2000, description: 'Start year (null = all years)', required: false }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsInt)(),
    (0, class_transformer_1.Type)(() => Number),
    __metadata("design:type", Number)
], CreateStandingOrderRuleDto.prototype, "startYear", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: null, description: 'End year (null = still in effect)', required: false }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsInt)(),
    (0, class_transformer_1.Type)(() => Number),
    __metadata("design:type", Number)
], CreateStandingOrderRuleDto.prototype, "endYear", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 100, description: 'Sort order (gapped: 100, 200, 300...)' }),
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(1),
    (0, class_transformer_1.Type)(() => Number),
    __metadata("design:type", Number)
], CreateStandingOrderRuleDto.prototype, "sortOrder", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'POINTS', description: 'Criterion identifier' }),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateStandingOrderRuleDto.prototype, "criterion", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'DESC', description: 'Sort direction', enum: ['ASC', 'DESC'] }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsIn)(['ASC', 'DESC']),
    __metadata("design:type", String)
], CreateStandingOrderRuleDto.prototype, "direction", void 0);
class UpdateStandingOrderRuleDto extends (0, swagger_1.PartialType)(CreateStandingOrderRuleDto) {
}
exports.UpdateStandingOrderRuleDto = UpdateStandingOrderRuleDto;
class StandingOrderRuleResponseDto extends CreateStandingOrderRuleDto {
}
exports.StandingOrderRuleResponseDto = StandingOrderRuleResponseDto;
__decorate([
    (0, swagger_1.ApiProperty)({ example: 1 }),
    __metadata("design:type", Number)
], StandingOrderRuleResponseDto.prototype, "id", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ required: false }),
    __metadata("design:type", Date)
], StandingOrderRuleResponseDto.prototype, "createdAt", void 0);
//# sourceMappingURL=standing-order-rule.dto.js.map