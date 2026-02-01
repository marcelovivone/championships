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
exports.SportResponseDto = exports.UpdateSportDto = exports.CreateSportDto = void 0;
const class_validator_1 = require("class-validator");
const swagger_1 = require("@nestjs/swagger");
const swagger_2 = require("@nestjs/swagger");
class CreateSportDto {
}
exports.CreateSportDto = CreateSportDto;
__decorate([
    (0, swagger_2.ApiProperty)({ example: 'Football', description: 'The name of the sport' }),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateSportDto.prototype, "name", void 0);
__decorate([
    (0, swagger_2.ApiProperty)({ example: 'FB', description: 'Short abbreviation for the sport' }),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateSportDto.prototype, "reducedName", void 0);
__decorate([
    (0, swagger_2.ApiProperty)({ example: 'collective', description: 'Type: collective or individual' }),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateSportDto.prototype, "type", void 0);
__decorate([
    (0, swagger_2.ApiProperty)({ example: 'period', description: 'Division type: period, quarter, set, or time' }),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateSportDto.prototype, "divisionType", void 0);
__decorate([
    (0, swagger_2.ApiProperty)({ example: 2, description: 'Minimum number of match divisions (e.g. 2 halves minimum)' }),
    (0, class_validator_1.IsInt)(),
    __metadata("design:type", Number)
], CreateSportDto.prototype, "minMatchDivisionNumber", void 0);
__decorate([
    (0, swagger_2.ApiProperty)({ example: 2, description: 'Maximum number of match divisions (e.g. 2 halves, 4 quarters max)' }),
    (0, class_validator_1.IsInt)(),
    __metadata("design:type", Number)
], CreateSportDto.prototype, "maxMatchDivisionNumber", void 0);
__decorate([
    (0, swagger_2.ApiProperty)({ example: 45, description: 'Time per division in minutes' }),
    (0, class_validator_1.IsInt)(),
    __metadata("design:type", Number)
], CreateSportDto.prototype, "divisionTime", void 0);
__decorate([
    (0, swagger_2.ApiProperty)({ example: 'goals', description: 'Scoring system: goals or points' }),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateSportDto.prototype, "scoreType", void 0);
__decorate([
    (0, swagger_2.ApiProperty)({ example: true, description: 'Does the sport allow overtime?' }),
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], CreateSportDto.prototype, "hasOvertime", void 0);
__decorate([
    (0, swagger_2.ApiProperty)({ example: true, description: 'Does the sport have penalties/shootouts?' }),
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], CreateSportDto.prototype, "hasPenalties", void 0);
__decorate([
    (0, swagger_2.ApiProperty)({ example: false, description: 'Is this the default sport?' }),
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], CreateSportDto.prototype, "flgDefault", void 0);
__decorate([
    (0, swagger_2.ApiProperty)({ example: 'https://example.com/football.png', description: 'URL to sport icon' }),
    (0, class_validator_1.IsUrl)(),
    __metadata("design:type", String)
], CreateSportDto.prototype, "imageUrl", void 0);
class UpdateSportDto extends (0, swagger_1.PartialType)(CreateSportDto) {
}
exports.UpdateSportDto = UpdateSportDto;
class SportResponseDto extends CreateSportDto {
}
exports.SportResponseDto = SportResponseDto;
__decorate([
    (0, swagger_2.ApiProperty)({ example: 1 }),
    (0, class_validator_1.IsInt)(),
    __metadata("design:type", Number)
], SportResponseDto.prototype, "id", void 0);
__decorate([
    (0, swagger_2.ApiProperty)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Date)
], SportResponseDto.prototype, "createdAt", void 0);
//# sourceMappingURL=sport.dto.js.map