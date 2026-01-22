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
exports.CountryResponseDto = exports.UpdateCountryDto = exports.CreateCountryDto = void 0;
const class_validator_1 = require("class-validator");
const swagger_1 = require("@nestjs/swagger");
const swagger_2 = require("@nestjs/swagger");
const CONTINENTS = [
    'Africa',
    'Asia',
    'Europe',
    'North America',
    'South America',
    'Oceania',
];
class CreateCountryDto {
}
exports.CreateCountryDto = CreateCountryDto;
__decorate([
    (0, swagger_2.ApiProperty)({ example: 'Brazil', description: 'The name of the country' }),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateCountryDto.prototype, "name", void 0);
__decorate([
    (0, swagger_2.ApiProperty)({ enum: CONTINENTS, example: 'South America', description: 'The continent of the country' }),
    (0, class_validator_1.IsEnum)(CONTINENTS),
    __metadata("design:type", String)
], CreateCountryDto.prototype, "continent", void 0);
__decorate([
    (0, swagger_2.ApiProperty)({ example: 'BRA', description: 'ISO 3166-1 alpha-3 code', minLength: 3, maxLength: 3 }),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateCountryDto.prototype, "code", void 0);
__decorate([
    (0, swagger_2.ApiProperty)({ example: 'https://flagcdn.com/br.svg', description: 'URL to the country flag image', required: false }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsUrl)(),
    __metadata("design:type", String)
], CreateCountryDto.prototype, "flagUrl", void 0);
class UpdateCountryDto extends (0, swagger_1.PartialType)(CreateCountryDto) {
}
exports.UpdateCountryDto = UpdateCountryDto;
class CountryResponseDto extends CreateCountryDto {
}
exports.CountryResponseDto = CountryResponseDto;
__decorate([
    (0, swagger_2.ApiProperty)({ example: 1, description: 'The unique identifier of the country' }),
    (0, class_validator_1.IsInt)(),
    __metadata("design:type", Number)
], CountryResponseDto.prototype, "id", void 0);
__decorate([
    (0, swagger_2.ApiProperty)({ example: '2024-01-20T12:00:00Z', description: 'Creation timestamp', required: false }),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Date)
], CountryResponseDto.prototype, "createdAt", void 0);
//# sourceMappingURL=country.dto.js.map