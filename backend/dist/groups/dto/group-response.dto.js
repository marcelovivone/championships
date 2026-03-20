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
exports.GroupResponseDto = void 0;
const swagger_1 = require("@nestjs/swagger");
const class_validator_1 = require("class-validator");
class GroupResponseDto {
}
exports.GroupResponseDto = GroupResponseDto;
__decorate([
    (0, swagger_1.ApiProperty)({ example: 1, description: 'The unique identifier of the group' }),
    (0, class_validator_1.IsInt)(),
    __metadata("design:type", Number)
], GroupResponseDto.prototype, "id", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'Group A', description: 'Name of the group' }),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], GroupResponseDto.prototype, "name", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 1, description: 'Season ID' }),
    (0, class_validator_1.IsInt)(),
    __metadata("design:type", Number)
], GroupResponseDto.prototype, "seasonId", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 1, description: 'Sport ID' }),
    (0, class_validator_1.IsInt)(),
    __metadata("design:type", Number)
], GroupResponseDto.prototype, "sportId", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 1, description: 'League ID' }),
    (0, class_validator_1.IsInt)(),
    __metadata("design:type", Number)
], GroupResponseDto.prototype, "leagueId", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: '2025-08-01T00:00:00Z', description: 'Creation timestamp' }),
    (0, class_validator_1.IsDateString)(),
    __metadata("design:type", Date)
], GroupResponseDto.prototype, "createdAt", void 0);
//# sourceMappingURL=group-response.dto.js.map