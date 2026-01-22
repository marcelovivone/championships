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
exports.StandingResponseDto = exports.UpdateStandingDto = exports.CreateStandingDto = void 0;
const class_validator_1 = require("class-validator");
const swagger_1 = require("@nestjs/swagger");
const swagger_2 = require("@nestjs/swagger");
const class_transformer_1 = require("class-transformer");
class CreateStandingDto {
    constructor() {
        this.points = 0;
        this.played = 0;
        this.wins = 0;
        this.draws = 0;
        this.losses = 0;
        this.goalsFor = 0;
        this.goalsAgainst = 0;
        this.goalDifference = 0;
        this.homeGamesPlayed = 0;
        this.awayGamesPlayed = 0;
        this.homeWins = 0;
        this.homeLosses = 0;
        this.homeDraws = 0;
        this.awayWins = 0;
        this.awayLosses = 0;
        this.awayDraws = 0;
    }
}
exports.CreateStandingDto = CreateStandingDto;
__decorate([
    (0, swagger_2.ApiProperty)({ example: 1 }),
    (0, class_validator_1.IsInt)(),
    __metadata("design:type", Number)
], CreateStandingDto.prototype, "leagueId", void 0);
__decorate([
    (0, swagger_2.ApiProperty)({ example: 1 }),
    (0, class_validator_1.IsInt)(),
    __metadata("design:type", Number)
], CreateStandingDto.prototype, "seasonId", void 0);
__decorate([
    (0, swagger_2.ApiProperty)({ example: 1 }),
    (0, class_validator_1.IsInt)(),
    __metadata("design:type", Number)
], CreateStandingDto.prototype, "phaseId", void 0);
__decorate([
    (0, swagger_2.ApiProperty)({ example: 1 }),
    (0, class_validator_1.IsInt)(),
    __metadata("design:type", Number)
], CreateStandingDto.prototype, "roundId", void 0);
__decorate([
    (0, swagger_2.ApiProperty)({ example: 1, required: false }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsInt)(),
    __metadata("design:type", Number)
], CreateStandingDto.prototype, "groupId", void 0);
__decorate([
    (0, swagger_2.ApiProperty)({ example: 1, required: false }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsInt)(),
    __metadata("design:type", Number)
], CreateStandingDto.prototype, "leagueDivisionId", void 0);
__decorate([
    (0, swagger_2.ApiProperty)({ example: 1 }),
    (0, class_validator_1.IsInt)(),
    __metadata("design:type", Number)
], CreateStandingDto.prototype, "clubId", void 0);
__decorate([
    (0, swagger_2.ApiProperty)({ example: 3 }),
    (0, class_transformer_1.Type)(() => Number),
    (0, class_validator_1.IsInt)(),
    __metadata("design:type", Number)
], CreateStandingDto.prototype, "points", void 0);
__decorate([
    (0, swagger_2.ApiProperty)({ example: 1 }),
    (0, class_transformer_1.Type)(() => Number),
    (0, class_validator_1.IsInt)(),
    __metadata("design:type", Number)
], CreateStandingDto.prototype, "played", void 0);
__decorate([
    (0, swagger_2.ApiProperty)({ example: 1 }),
    (0, class_transformer_1.Type)(() => Number),
    (0, class_validator_1.IsInt)(),
    __metadata("design:type", Number)
], CreateStandingDto.prototype, "wins", void 0);
__decorate([
    (0, swagger_2.ApiProperty)({ example: 0 }),
    (0, class_transformer_1.Type)(() => Number),
    (0, class_validator_1.IsInt)(),
    __metadata("design:type", Number)
], CreateStandingDto.prototype, "draws", void 0);
__decorate([
    (0, swagger_2.ApiProperty)({ example: 0 }),
    (0, class_transformer_1.Type)(() => Number),
    (0, class_validator_1.IsInt)(),
    __metadata("design:type", Number)
], CreateStandingDto.prototype, "losses", void 0);
__decorate([
    (0, swagger_2.ApiProperty)({ example: 2 }),
    (0, class_transformer_1.Type)(() => Number),
    (0, class_validator_1.IsInt)(),
    __metadata("design:type", Number)
], CreateStandingDto.prototype, "goalsFor", void 0);
__decorate([
    (0, swagger_2.ApiProperty)({ example: 1 }),
    (0, class_transformer_1.Type)(() => Number),
    (0, class_validator_1.IsInt)(),
    __metadata("design:type", Number)
], CreateStandingDto.prototype, "goalsAgainst", void 0);
__decorate([
    (0, swagger_2.ApiProperty)({ example: 1 }),
    (0, class_transformer_1.Type)(() => Number),
    (0, class_validator_1.IsInt)(),
    __metadata("design:type", Number)
], CreateStandingDto.prototype, "goalDifference", void 0);
__decorate([
    (0, swagger_2.ApiProperty)({ example: 0, required: false }),
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Type)(() => Number),
    (0, class_validator_1.IsInt)(),
    __metadata("design:type", Number)
], CreateStandingDto.prototype, "overtimeWins", void 0);
__decorate([
    (0, swagger_2.ApiProperty)({ example: 0, required: false }),
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Type)(() => Number),
    (0, class_validator_1.IsInt)(),
    __metadata("design:type", Number)
], CreateStandingDto.prototype, "overtimeLosses", void 0);
__decorate([
    (0, swagger_2.ApiProperty)({ example: 0, required: false }),
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Type)(() => Number),
    (0, class_validator_1.IsInt)(),
    __metadata("design:type", Number)
], CreateStandingDto.prototype, "penaltyWins", void 0);
__decorate([
    (0, swagger_2.ApiProperty)({ example: 0, required: false }),
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Type)(() => Number),
    (0, class_validator_1.IsInt)(),
    __metadata("design:type", Number)
], CreateStandingDto.prototype, "penaltyLosses", void 0);
__decorate([
    (0, swagger_2.ApiProperty)({ example: 0, required: false }),
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Type)(() => Number),
    (0, class_validator_1.IsInt)(),
    __metadata("design:type", Number)
], CreateStandingDto.prototype, "setsWon", void 0);
__decorate([
    (0, swagger_2.ApiProperty)({ example: 0, required: false }),
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Type)(() => Number),
    (0, class_validator_1.IsInt)(),
    __metadata("design:type", Number)
], CreateStandingDto.prototype, "setsLost", void 0);
__decorate([
    (0, swagger_2.ApiProperty)({ example: 0, required: false }),
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Type)(() => Number),
    (0, class_validator_1.IsInt)(),
    __metadata("design:type", Number)
], CreateStandingDto.prototype, "divisionsWon", void 0);
__decorate([
    (0, swagger_2.ApiProperty)({ example: 0, required: false }),
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Type)(() => Number),
    (0, class_validator_1.IsInt)(),
    __metadata("design:type", Number)
], CreateStandingDto.prototype, "divisionsLost", void 0);
__decorate([
    (0, swagger_2.ApiProperty)({ example: 1 }),
    (0, class_transformer_1.Type)(() => Number),
    (0, class_validator_1.IsInt)(),
    __metadata("design:type", Number)
], CreateStandingDto.prototype, "homeGamesPlayed", void 0);
__decorate([
    (0, swagger_2.ApiProperty)({ example: 0 }),
    (0, class_transformer_1.Type)(() => Number),
    (0, class_validator_1.IsInt)(),
    __metadata("design:type", Number)
], CreateStandingDto.prototype, "awayGamesPlayed", void 0);
__decorate([
    (0, swagger_2.ApiProperty)({ example: 1 }),
    (0, class_transformer_1.Type)(() => Number),
    (0, class_validator_1.IsInt)(),
    __metadata("design:type", Number)
], CreateStandingDto.prototype, "homeWins", void 0);
__decorate([
    (0, swagger_2.ApiProperty)({ example: 0 }),
    (0, class_transformer_1.Type)(() => Number),
    (0, class_validator_1.IsInt)(),
    __metadata("design:type", Number)
], CreateStandingDto.prototype, "homeLosses", void 0);
__decorate([
    (0, swagger_2.ApiProperty)({ example: 0 }),
    (0, class_transformer_1.Type)(() => Number),
    (0, class_validator_1.IsInt)(),
    __metadata("design:type", Number)
], CreateStandingDto.prototype, "homeDraws", void 0);
__decorate([
    (0, swagger_2.ApiProperty)({ example: 0 }),
    (0, class_transformer_1.Type)(() => Number),
    (0, class_validator_1.IsInt)(),
    __metadata("design:type", Number)
], CreateStandingDto.prototype, "awayWins", void 0);
__decorate([
    (0, swagger_2.ApiProperty)({ example: 0 }),
    (0, class_transformer_1.Type)(() => Number),
    (0, class_validator_1.IsInt)(),
    __metadata("design:type", Number)
], CreateStandingDto.prototype, "awayLosses", void 0);
__decorate([
    (0, swagger_2.ApiProperty)({ example: 0 }),
    (0, class_transformer_1.Type)(() => Number),
    (0, class_validator_1.IsInt)(),
    __metadata("design:type", Number)
], CreateStandingDto.prototype, "awayDraws", void 0);
class UpdateStandingDto extends (0, swagger_1.PartialType)(CreateStandingDto) {
}
exports.UpdateStandingDto = UpdateStandingDto;
class StandingResponseDto extends CreateStandingDto {
}
exports.StandingResponseDto = StandingResponseDto;
__decorate([
    (0, swagger_2.ApiProperty)({ example: 1 }),
    (0, class_validator_1.IsInt)(),
    __metadata("design:type", Number)
], StandingResponseDto.prototype, "id", void 0);
__decorate([
    (0, swagger_2.ApiProperty)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Date)
], StandingResponseDto.prototype, "createdAt", void 0);
__decorate([
    (0, swagger_2.ApiProperty)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Date)
], StandingResponseDto.prototype, "updatedAt", void 0);
//# sourceMappingURL=standing.dto.js.map