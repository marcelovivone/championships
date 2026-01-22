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
exports.PhaseResponseDto = exports.UpdatePhaseDto = exports.CreatePhaseDto = void 0;
const class_validator_1 = require("class-validator");
const swagger_1 = require("@nestjs/swagger");
const swagger_2 = require("@nestjs/swagger");
const class_transformer_1 = require("class-transformer");
class CreatePhaseDto {
}
exports.CreatePhaseDto = CreatePhaseDto;
__decorate([
    (0, swagger_2.ApiProperty)({ example: 1, description: 'Season ID' }),
    (0, class_validator_1.IsInt)(),
    __metadata("design:type", Number)
], CreatePhaseDto.prototype, "seasonId", void 0);
__decorate([
    (0, swagger_2.ApiProperty)({ example: 'Regular Season', description: 'Name of the phase' }),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreatePhaseDto.prototype, "name", void 0);
__decorate([
    (0, swagger_2.ApiProperty)({ example: 'league', description: 'Type: league, knockout, or groups' }),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreatePhaseDto.prototype, "type", void 0);
__decorate([
    (0, swagger_2.ApiProperty)({ example: 1, description: 'Order of the phase' }),
    (0, class_transformer_1.Type)(() => Number),
    (0, class_validator_1.IsInt)(),
    __metadata("design:type", Number)
], CreatePhaseDto.prototype, "order", void 0);
class UpdatePhaseDto extends (0, swagger_1.PartialType)(CreatePhaseDto) {
}
exports.UpdatePhaseDto = UpdatePhaseDto;
class PhaseResponseDto extends CreatePhaseDto {
}
exports.PhaseResponseDto = PhaseResponseDto;
__decorate([
    (0, swagger_2.ApiProperty)({ example: 1 }),
    (0, class_validator_1.IsInt)(),
    __metadata("design:type", Number)
], PhaseResponseDto.prototype, "id", void 0);
__decorate([
    (0, swagger_2.ApiProperty)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Date)
], PhaseResponseDto.prototype, "createdAt", void 0);
//# sourceMappingURL=phase.dto.js.map