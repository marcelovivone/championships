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
exports.SeasonClubResponseDto = void 0;
const swagger_1 = require("@nestjs/swagger");
class SeasonClubResponseDto {
}
exports.SeasonClubResponseDto = SeasonClubResponseDto;
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'The ID of the season-club association', example: 1 }),
    __metadata("design:type", Number)
], SeasonClubResponseDto.prototype, "id", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'The ID of the sport', example: 1 }),
    __metadata("design:type", Number)
], SeasonClubResponseDto.prototype, "sportId", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'The ID of the league', example: 1 }),
    __metadata("design:type", Number)
], SeasonClubResponseDto.prototype, "leagueId", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'The ID of the season', example: 1 }),
    __metadata("design:type", Number)
], SeasonClubResponseDto.prototype, "seasonId", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'The ID of the club', example: 5 }),
    __metadata("design:type", Number)
], SeasonClubResponseDto.prototype, "clubId", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'The ID of the group (optional)',
        example: 1,
        required: false,
    }),
    __metadata("design:type", Number)
], SeasonClubResponseDto.prototype, "groupId", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'When the association was created', example: '2025-08-01T00:00:00Z' }),
    __metadata("design:type", Date)
], SeasonClubResponseDto.prototype, "createdAt", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Sport information', required: false }),
    __metadata("design:type", Object)
], SeasonClubResponseDto.prototype, "sport", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'League information', required: false }),
    __metadata("design:type", Object)
], SeasonClubResponseDto.prototype, "league", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Season information', required: false }),
    __metadata("design:type", Object)
], SeasonClubResponseDto.prototype, "season", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Club information', required: false }),
    __metadata("design:type", Object)
], SeasonClubResponseDto.prototype, "club", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Group information', required: false }),
    __metadata("design:type", Object)
], SeasonClubResponseDto.prototype, "group", void 0);
//# sourceMappingURL=season-club-response.dto.js.map