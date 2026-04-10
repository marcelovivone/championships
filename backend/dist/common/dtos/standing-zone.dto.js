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
exports.StandingZoneResponseDto = exports.UpdateStandingZoneDto = exports.CreateStandingZoneDto = void 0;
const class_validator_1 = require("class-validator");
const class_transformer_1 = require("class-transformer");
const swagger_1 = require("@nestjs/swagger");
class CreateStandingZoneDto {
    constructor() {
        this.typeOfStanding = 'Combined';
        this.colorHex = '#FFFFFF';
    }
}
exports.CreateStandingZoneDto = CreateStandingZoneDto;
__decorate([
    (0, swagger_1.ApiProperty)({ example: 1 }),
    (0, class_validator_1.IsInt)(),
    (0, class_transformer_1.Type)(() => Number),
    __metadata("design:type", Number)
], CreateStandingZoneDto.prototype, "sportId", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 1 }),
    (0, class_validator_1.IsInt)(),
    (0, class_transformer_1.Type)(() => Number),
    __metadata("design:type", Number)
], CreateStandingZoneDto.prototype, "leagueId", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 1, required: false }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsInt)(),
    (0, class_transformer_1.Type)(() => Number),
    __metadata("design:type", Number)
], CreateStandingZoneDto.prototype, "seasonId", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 1 }),
    (0, class_validator_1.IsInt)(),
    (0, class_transformer_1.Type)(() => Number),
    (0, class_validator_1.Min)(1),
    __metadata("design:type", Number)
], CreateStandingZoneDto.prototype, "startPosition", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 4 }),
    (0, class_validator_1.IsInt)(),
    (0, class_transformer_1.Type)(() => Number),
    (0, class_validator_1.Min)(1),
    __metadata("design:type", Number)
], CreateStandingZoneDto.prototype, "endPosition", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'Champions' }),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateStandingZoneDto.prototype, "name", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'Combined', enum: ['All', 'Combined', 'Group'], required: false }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateStandingZoneDto.prototype, "typeOfStanding", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: '#FFFFFF', required: false }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.Matches)(/^#([0-9A-Fa-f]{6})$/, { message: 'colorHex must be a valid hex color like #RRGGBB' }),
    __metadata("design:type", String)
], CreateStandingZoneDto.prototype, "colorHex", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 2024, required: false }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsInt)(),
    (0, class_transformer_1.Type)(() => Number),
    __metadata("design:type", Number)
], CreateStandingZoneDto.prototype, "start_year", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 2025, required: false }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsInt)(),
    (0, class_transformer_1.Type)(() => Number),
    __metadata("design:type", Number)
], CreateStandingZoneDto.prototype, "end_year", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: false, required: false }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsBoolean)(),
    (0, class_transformer_1.Type)(() => Boolean),
    __metadata("design:type", Boolean)
], CreateStandingZoneDto.prototype, "flg_priority", void 0);
class UpdateStandingZoneDto extends CreateStandingZoneDto {
}
exports.UpdateStandingZoneDto = UpdateStandingZoneDto;
class StandingZoneResponseDto extends CreateStandingZoneDto {
}
exports.StandingZoneResponseDto = StandingZoneResponseDto;
__decorate([
    (0, swagger_1.ApiProperty)({ example: 1 }),
    __metadata("design:type", Number)
], StandingZoneResponseDto.prototype, "id", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ required: false }),
    __metadata("design:type", Date)
], StandingZoneResponseDto.prototype, "createdAt", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ required: false }),
    __metadata("design:type", Date)
], StandingZoneResponseDto.prototype, "updatedAt", void 0);
//# sourceMappingURL=standing-zone.dto.js.map