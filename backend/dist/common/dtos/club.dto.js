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
exports.ClubResponseDto = exports.UpdateClubDto = exports.CreateClubDto = void 0;
const class_validator_1 = require("class-validator");
const swagger_1 = require("@nestjs/swagger");
const swagger_2 = require("@nestjs/swagger");
class CreateClubDto {
}
exports.CreateClubDto = CreateClubDto;
__decorate([
    (0, swagger_2.ApiProperty)({ example: 'Real Madrid', description: 'Name of the club' }),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateClubDto.prototype, "name", void 0);
__decorate([
    (0, swagger_2.ApiProperty)({ example: 'RMA', description: 'Short name or abbreviation', required: false }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateClubDto.prototype, "shortName", void 0);
__decorate([
    (0, swagger_2.ApiProperty)({ example: 1902, description: 'Year the club was founded' }),
    (0, class_validator_1.IsInt)(),
    __metadata("design:type", Number)
], CreateClubDto.prototype, "foundationYear", void 0);
__decorate([
    (0, swagger_2.ApiProperty)({ example: 1, description: 'ID of the country the club belongs to' }),
    (0, class_validator_1.IsInt)(),
    __metadata("design:type", Number)
], CreateClubDto.prototype, "countryId", void 0);
__decorate([
    (0, swagger_2.ApiProperty)({ example: 'https://example.com/logo.png', description: 'URL to club logo', required: false }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsUrl)(),
    __metadata("design:type", String)
], CreateClubDto.prototype, "imageUrl", void 0);
class UpdateClubDto extends (0, swagger_1.PartialType)(CreateClubDto) {
}
exports.UpdateClubDto = UpdateClubDto;
class ClubResponseDto extends CreateClubDto {
}
exports.ClubResponseDto = ClubResponseDto;
__decorate([
    (0, swagger_2.ApiProperty)({ example: 1 }),
    (0, class_validator_1.IsInt)(),
    __metadata("design:type", Number)
], ClubResponseDto.prototype, "id", void 0);
__decorate([
    (0, swagger_2.ApiProperty)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Date)
], ClubResponseDto.prototype, "createdAt", void 0);
//# sourceMappingURL=club.dto.js.map