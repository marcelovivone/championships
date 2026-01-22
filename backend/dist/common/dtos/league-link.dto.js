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
exports.LeagueLinkResponseDto = exports.UpdateLeagueLinkDto = exports.CreateLeagueLinkDto = void 0;
const class_validator_1 = require("class-validator");
const mapped_types_1 = require("@nestjs/mapped-types");
class CreateLeagueLinkDto {
}
exports.CreateLeagueLinkDto = CreateLeagueLinkDto;
__decorate([
    (0, class_validator_1.IsInt)(),
    __metadata("design:type", Number)
], CreateLeagueLinkDto.prototype, "leagueId", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateLeagueLinkDto.prototype, "label", void 0);
__decorate([
    (0, class_validator_1.IsUrl)(),
    __metadata("design:type", String)
], CreateLeagueLinkDto.prototype, "url", void 0);
class UpdateLeagueLinkDto extends (0, mapped_types_1.PartialType)(CreateLeagueLinkDto) {
}
exports.UpdateLeagueLinkDto = UpdateLeagueLinkDto;
class LeagueLinkResponseDto extends CreateLeagueLinkDto {
}
exports.LeagueLinkResponseDto = LeagueLinkResponseDto;
__decorate([
    (0, class_validator_1.IsInt)(),
    __metadata("design:type", Number)
], LeagueLinkResponseDto.prototype, "id", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Date)
], LeagueLinkResponseDto.prototype, "createdAt", void 0);
//# sourceMappingURL=league-link.dto.js.map