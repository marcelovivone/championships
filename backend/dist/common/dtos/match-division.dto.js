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
exports.MatchDivisionResponseDto = exports.UpdateMatchDivisionDto = exports.CreateMatchDivisionDto = void 0;
const class_validator_1 = require("class-validator");
const class_transformer_1 = require("class-transformer");
const swagger_1 = require("@nestjs/swagger");
const swagger_2 = require("@nestjs/swagger");
class CreateMatchDivisionDto {
}
exports.CreateMatchDivisionDto = CreateMatchDivisionDto;
__decorate([
    (0, swagger_2.ApiProperty)({ example: 1 }),
    (0, class_validator_1.IsInt)(),
    __metadata("design:type", Number)
], CreateMatchDivisionDto.prototype, "matchId", void 0);
__decorate([
    (0, swagger_2.ApiProperty)({ example: 1, description: 'Division number (1, 2, 3...)' }),
    (0, class_transformer_1.Type)(() => Number),
    (0, class_validator_1.IsInt)(),
    __metadata("design:type", Number)
], CreateMatchDivisionDto.prototype, "divisionNumber", void 0);
__decorate([
    (0, swagger_2.ApiProperty)({ example: 'regular', description: 'Type: regular, overtime, or penalties' }),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateMatchDivisionDto.prototype, "divisionType", void 0);
__decorate([
    (0, swagger_2.ApiProperty)({ example: 1, description: 'Home score in this division' }),
    (0, class_transformer_1.Type)(() => Number),
    (0, class_validator_1.IsInt)(),
    __metadata("design:type", Number)
], CreateMatchDivisionDto.prototype, "homeScore", void 0);
__decorate([
    (0, swagger_2.ApiProperty)({ example: 0, description: 'Away score in this division' }),
    (0, class_transformer_1.Type)(() => Number),
    (0, class_validator_1.IsInt)(),
    __metadata("design:type", Number)
], CreateMatchDivisionDto.prototype, "awayScore", void 0);
class UpdateMatchDivisionDto extends (0, swagger_1.PartialType)(CreateMatchDivisionDto) {
}
exports.UpdateMatchDivisionDto = UpdateMatchDivisionDto;
class MatchDivisionResponseDto extends CreateMatchDivisionDto {
}
exports.MatchDivisionResponseDto = MatchDivisionResponseDto;
__decorate([
    (0, swagger_2.ApiProperty)({ example: 1 }),
    (0, class_validator_1.IsInt)(),
    __metadata("design:type", Number)
], MatchDivisionResponseDto.prototype, "id", void 0);
__decorate([
    (0, swagger_2.ApiProperty)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Date)
], MatchDivisionResponseDto.prototype, "createdAt", void 0);
//# sourceMappingURL=match-division.dto.js.map