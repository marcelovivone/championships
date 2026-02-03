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
exports.UpdateMatchScoreDto = exports.MatchResponseDto = exports.UpdateMatchDto = exports.CreateMatchDto = void 0;
const class_validator_1 = require("class-validator");
const swagger_1 = require("@nestjs/swagger");
const swagger_2 = require("@nestjs/swagger");
const class_transformer_1 = require("class-transformer");
class CreateMatchDto {
    constructor() {
        this.turn = 1;
    }
}
exports.CreateMatchDto = CreateMatchDto;
__decorate([
    (0, swagger_2.ApiProperty)({ example: 1, description: 'Sport ID' }),
    (0, class_validator_1.IsInt)(),
    __metadata("design:type", Number)
], CreateMatchDto.prototype, "sportId", void 0);
__decorate([
    (0, swagger_2.ApiProperty)({ example: 1, description: 'League ID' }),
    (0, class_validator_1.IsInt)(),
    __metadata("design:type", Number)
], CreateMatchDto.prototype, "leagueId", void 0);
__decorate([
    (0, swagger_2.ApiProperty)({ example: 1, description: 'Season ID' }),
    (0, class_validator_1.IsInt)(),
    __metadata("design:type", Number)
], CreateMatchDto.prototype, "seasonId", void 0);
__decorate([
    (0, swagger_2.ApiProperty)({ example: 1, description: 'Round ID (optional - only for Round-based leagues)', required: false }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsInt)(),
    __metadata("design:type", Number)
], CreateMatchDto.prototype, "roundId", void 0);
__decorate([
    (0, swagger_2.ApiProperty)({ example: 1, description: 'Group ID (optional)', required: false }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsInt)(),
    __metadata("design:type", Number)
], CreateMatchDto.prototype, "groupId", void 0);
__decorate([
    (0, swagger_2.ApiProperty)({ example: 1, description: 'League Division ID (optional)', required: false }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsInt)(),
    __metadata("design:type", Number)
], CreateMatchDto.prototype, "homeClubId", void 0);
__decorate([
    (0, swagger_2.ApiProperty)({ example: 12, description: 'Away Club ID' }),
    (0, class_validator_1.IsInt)(),
    __metadata("design:type", Number)
], CreateMatchDto.prototype, "awayClubId", void 0);
__decorate([
    (0, swagger_2.ApiProperty)({ example: 5, description: 'Stadium ID (optional)', required: false }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsInt)(),
    __metadata("design:type", Number)
], CreateMatchDto.prototype, "stadiumId", void 0);
__decorate([
    (0, swagger_2.ApiProperty)({ example: '2024-05-20T15:00:00Z', description: 'Match date and time' }),
    (0, class_validator_1.IsDateString)(),
    __metadata("design:type", String)
], CreateMatchDto.prototype, "date", void 0);
__decorate([
    (0, swagger_2.ApiProperty)({ example: 2, description: 'Home score (optional)', required: false }),
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Type)(() => Number),
    (0, class_validator_1.IsInt)(),
    __metadata("design:type", Number)
], CreateMatchDto.prototype, "homeScore", void 0);
__decorate([
    (0, swagger_2.ApiProperty)({ example: 1, description: 'Away score (optional)', required: false }),
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Type)(() => Number),
    (0, class_validator_1.IsInt)(),
    __metadata("design:type", Number)
], CreateMatchDto.prototype, "awayScore", void 0);
class UpdateMatchDto extends (0, swagger_1.PartialType)(CreateMatchDto) {
}
exports.UpdateMatchDto = UpdateMatchDto;
class MatchResponseDto {
}
exports.MatchResponseDto = MatchResponseDto;
__decorate([
    (0, swagger_2.ApiProperty)({ example: 1 }),
    (0, class_validator_1.IsInt)(),
    __metadata("design:type", Number)
], MatchResponseDto.prototype, "id", void 0);
__decorate([
    (0, swagger_2.ApiProperty)({ example: 1 }),
    __metadata("design:type", Number)
], MatchResponseDto.prototype, "leagueId", void 0);
__decorate([
    (0, swagger_2.ApiProperty)({ example: 1 }),
    __metadata("design:type", Number)
], MatchResponseDto.prototype, "seasonId", void 0);
__decorate([
    (0, swagger_2.ApiProperty)({ example: 1 }),
    __metadata("design:type", Number)
], MatchResponseDto.prototype, "roundId", void 0);
__decorate([
    (0, swagger_2.ApiProperty)({ example: 1, required: false }),
    __metadata("design:type", Number)
], MatchResponseDto.prototype, "groupId", void 0);
__decorate([
    (0, swagger_2.ApiProperty)({ example: 1, required: false }),
    __metadata("design:type", Number)
], MatchResponseDto.prototype, "homeClubId", void 0);
__decorate([
    (0, swagger_2.ApiProperty)({ example: 12 }),
    __metadata("design:type", Number)
], MatchResponseDto.prototype, "awayClubId", void 0);
__decorate([
    (0, swagger_2.ApiProperty)({ example: 5, required: false }),
    __metadata("design:type", Number)
], MatchResponseDto.prototype, "stadiumId", void 0);
__decorate([
    (0, swagger_2.ApiProperty)({ example: '2024-05-20T15:00:00Z' }),
    __metadata("design:type", Date)
], MatchResponseDto.prototype, "date", void 0);
__decorate([
    (0, swagger_2.ApiProperty)({ example: 2, required: false }),
    __metadata("design:type", Number)
], MatchResponseDto.prototype, "homeScore", void 0);
__decorate([
    (0, swagger_2.ApiProperty)({ example: 1, required: false }),
    __metadata("design:type", Number)
], MatchResponseDto.prototype, "awayScore", void 0);
__decorate([
    (0, swagger_2.ApiProperty)({ example: false, required: false }),
    __metadata("design:type", Boolean)
], MatchResponseDto.prototype, "status", void 0);
__decorate([
    (0, swagger_2.ApiProperty)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Date)
], MatchResponseDto.prototype, "createdAt", void 0);
__decorate([
    (0, swagger_2.ApiProperty)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Date)
], MatchResponseDto.prototype, "updatedAt", void 0);
class UpdateMatchScoreDto {
}
exports.UpdateMatchScoreDto = UpdateMatchScoreDto;
__decorate([
    (0, swagger_2.ApiProperty)({ example: 2, description: 'Final home score' }),
    (0, class_transformer_1.Type)(() => Number),
    (0, class_validator_1.IsInt)(),
    __metadata("design:type", Number)
], UpdateMatchScoreDto.prototype, "homeScore", void 0);
__decorate([
    (0, swagger_2.ApiProperty)({ example: 1, description: 'Final away score' }),
    (0, class_transformer_1.Type)(() => Number),
    (0, class_validator_1.IsInt)(),
    __metadata("design:type", Number)
], UpdateMatchScoreDto.prototype, "awayScore", void 0);
//# sourceMappingURL=match.dto.js.map