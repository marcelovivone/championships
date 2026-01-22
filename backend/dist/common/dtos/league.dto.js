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
exports.LeagueResponseDto = exports.UpdateLeagueDto = exports.CreateLeagueDto = void 0;
const class_validator_1 = require("class-validator");
const swagger_1 = require("@nestjs/swagger");
const swagger_2 = require("@nestjs/swagger");
const class_transformer_1 = require("class-transformer");
class CreateLeagueDto {
    constructor() {
        this.hasAscends = false;
        this.hasDescends = false;
        this.hasSubLeagues = false;
    }
}
exports.CreateLeagueDto = CreateLeagueDto;
__decorate([
    (0, swagger_2.ApiProperty)({ example: 'Premier League', description: 'Original name of the league' }),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateLeagueDto.prototype, "originalName", void 0);
__decorate([
    (0, swagger_2.ApiProperty)({ example: 'EPL', description: 'Secondary name or abbreviation', required: false }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateLeagueDto.prototype, "secondaryName", void 0);
__decorate([
    (0, swagger_2.ApiProperty)({ example: 1, description: 'ID of the sport' }),
    (0, class_validator_1.IsInt)(),
    __metadata("design:type", Number)
], CreateLeagueDto.prototype, "sportId", void 0);
__decorate([
    (0, swagger_2.ApiProperty)({ example: 1, description: 'ID of the country (optional for international leagues)', required: false }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsInt)(),
    __metadata("design:type", Number)
], CreateLeagueDto.prototype, "countryId", void 0);
__decorate([
    (0, swagger_2.ApiProperty)({ example: 1, description: 'ID of the city (optional)', required: false }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsInt)(),
    __metadata("design:type", Number)
], CreateLeagueDto.prototype, "cityId", void 0);
__decorate([
    (0, swagger_2.ApiProperty)({ example: 2024, description: 'Start year of the season' }),
    (0, class_validator_1.IsInt)(),
    __metadata("design:type", Number)
], CreateLeagueDto.prototype, "startYear", void 0);
__decorate([
    (0, swagger_2.ApiProperty)({ example: 2025, description: 'End year of the season' }),
    (0, class_validator_1.IsInt)(),
    __metadata("design:type", Number)
], CreateLeagueDto.prototype, "endYear", void 0);
__decorate([
    (0, swagger_2.ApiProperty)({ example: 2, description: 'Number of turns (e.g. home and away)' }),
    (0, class_validator_1.IsInt)(),
    __metadata("design:type", Number)
], CreateLeagueDto.prototype, "numberOfTurns", void 0);
__decorate([
    (0, swagger_2.ApiProperty)({ example: 38, description: 'Total number of rounds' }),
    (0, class_validator_1.IsInt)(),
    __metadata("design:type", Number)
], CreateLeagueDto.prototype, "numberOfRounds", void 0);
__decorate([
    (0, swagger_2.ApiProperty)({ example: 2, description: 'Minimum number of match divisions (e.g. halves)' }),
    (0, class_validator_1.IsInt)(),
    __metadata("design:type", Number)
], CreateLeagueDto.prototype, "minDivisionsNumber", void 0);
__decorate([
    (0, swagger_2.ApiProperty)({ example: 2, description: 'Maximum number of match divisions' }),
    (0, class_validator_1.IsInt)(),
    __metadata("design:type", Number)
], CreateLeagueDto.prototype, "maxDivisionsNumber", void 0);
__decorate([
    (0, swagger_2.ApiProperty)({ example: 45, description: 'Time per division in minutes (optional override)', required: false }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsInt)(),
    __metadata("design:type", Number)
], CreateLeagueDto.prototype, "divisionsTime", void 0);
__decorate([
    (0, swagger_2.ApiProperty)({ example: false, description: 'Override sport overtime rule', required: false }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], CreateLeagueDto.prototype, "hasOvertimeOverride", void 0);
__decorate([
    (0, swagger_2.ApiProperty)({ example: false, description: 'Override sport penalties rule', required: false }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], CreateLeagueDto.prototype, "hasPenaltiesOverride", void 0);
__decorate([
    (0, swagger_2.ApiProperty)({ example: true, description: 'Does the league have promotion?' }),
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], CreateLeagueDto.prototype, "hasAscends", void 0);
__decorate([
    (0, swagger_2.ApiProperty)({ example: 3, description: 'Number of teams promoted', required: false }),
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Type)(() => Number),
    (0, class_validator_1.IsInt)(),
    __metadata("design:type", Number)
], CreateLeagueDto.prototype, "ascendsQuantity", void 0);
__decorate([
    (0, swagger_2.ApiProperty)({ example: true, description: 'Does the league have relegation?' }),
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], CreateLeagueDto.prototype, "hasDescends", void 0);
__decorate([
    (0, swagger_2.ApiProperty)({ example: 3, description: 'Number of teams relegated', required: false }),
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Type)(() => Number),
    (0, class_validator_1.IsInt)(),
    __metadata("design:type", Number)
], CreateLeagueDto.prototype, "descendsQuantity", void 0);
__decorate([
    (0, swagger_2.ApiProperty)({ example: false, description: 'Does the league have sub-leagues/conferences?' }),
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], CreateLeagueDto.prototype, "hasSubLeagues", void 0);
__decorate([
    (0, swagger_2.ApiProperty)({ example: 2, description: 'Number of sub-leagues', required: false }),
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Type)(() => Number),
    (0, class_validator_1.IsInt)(),
    __metadata("design:type", Number)
], CreateLeagueDto.prototype, "numberOfSubLeagues", void 0);
__decorate([
    (0, swagger_2.ApiProperty)({ example: 'https://example.com/league-logo.png', required: false }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsUrl)(),
    __metadata("design:type", String)
], CreateLeagueDto.prototype, "imageUrl", void 0);
class UpdateLeagueDto extends (0, swagger_1.PartialType)(CreateLeagueDto) {
}
exports.UpdateLeagueDto = UpdateLeagueDto;
class LeagueResponseDto extends CreateLeagueDto {
}
exports.LeagueResponseDto = LeagueResponseDto;
__decorate([
    (0, swagger_2.ApiProperty)({ example: 1 }),
    (0, class_validator_1.IsInt)(),
    __metadata("design:type", Number)
], LeagueResponseDto.prototype, "id", void 0);
__decorate([
    (0, swagger_2.ApiProperty)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Date)
], LeagueResponseDto.prototype, "createdAt", void 0);
//# sourceMappingURL=league.dto.js.map