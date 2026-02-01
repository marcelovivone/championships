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
exports.SeasonResponseDto = exports.UpdateSeasonDto = exports.CreateSeasonDto = void 0;
const class_validator_1 = require("class-validator");
const mapped_types_1 = require("@nestjs/mapped-types");
const swagger_1 = require("@nestjs/swagger");
const class_transformer_1 = require("class-transformer");
class CreateSeasonDto {
    constructor() {
        this.status = 'planned';
    }
}
exports.CreateSeasonDto = CreateSeasonDto;
__decorate([
    (0, swagger_1.ApiProperty)({ example: 1, description: 'Sport ID' }),
    (0, class_validator_1.IsInt)(),
    __metadata("design:type", Number)
], CreateSeasonDto.prototype, "sportId", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 1, description: 'League ID' }),
    (0, class_validator_1.IsInt)(),
    __metadata("design:type", Number)
], CreateSeasonDto.prototype, "leagueId", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 2025, description: 'Start year of the season' }),
    (0, class_transformer_1.Type)(() => Number),
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(1900),
    (0, class_validator_1.Max)(2100),
    __metadata("design:type", Number)
], CreateSeasonDto.prototype, "startYear", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 2026, description: 'End year of the season' }),
    (0, class_transformer_1.Type)(() => Number),
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(1900),
    (0, class_validator_1.Max)(2100),
    __metadata("design:type", Number)
], CreateSeasonDto.prototype, "endYear", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'planned', description: 'Season status', enum: ['planned', 'active', 'finished'] }),
    (0, class_validator_1.IsEnum)(['planned', 'active', 'finished']),
    __metadata("design:type", String)
], CreateSeasonDto.prototype, "status", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: false, description: 'Is this the default season for the league?', required: false }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], CreateSeasonDto.prototype, "flgDefault", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 4, description: 'Number of groups in the season (0 or greater)', required: false }),
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Type)(() => Number),
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(0),
    __metadata("design:type", Number)
], CreateSeasonDto.prototype, "numberOfGroups", void 0);
class UpdateSeasonDto extends (0, mapped_types_1.PartialType)(CreateSeasonDto) {
}
exports.UpdateSeasonDto = UpdateSeasonDto;
class SeasonResponseDto extends CreateSeasonDto {
}
exports.SeasonResponseDto = SeasonResponseDto;
__decorate([
    (0, swagger_1.ApiProperty)({ example: 1 }),
    (0, class_validator_1.IsInt)(),
    __metadata("design:type", Number)
], SeasonResponseDto.prototype, "id", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Date)
], SeasonResponseDto.prototype, "createdAt", void 0);
//# sourceMappingURL=season.dto.js.map