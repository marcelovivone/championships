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
exports.StadiumResponseDto = exports.UpdateStadiumDto = exports.CreateStadiumDto = void 0;
const class_validator_1 = require("class-validator");
const swagger_1 = require("@nestjs/swagger");
const swagger_2 = require("@nestjs/swagger");
class CreateStadiumDto {
}
exports.CreateStadiumDto = CreateStadiumDto;
__decorate([
    (0, swagger_2.ApiProperty)({ example: 'Camp Nou', description: 'Name of the stadium' }),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateStadiumDto.prototype, "name", void 0);
__decorate([
    (0, swagger_2.ApiProperty)({ example: 1, description: 'ID of the city' }),
    (0, class_validator_1.IsInt)(),
    __metadata("design:type", Number)
], CreateStadiumDto.prototype, "cityId", void 0);
__decorate([
    (0, swagger_2.ApiProperty)({ example: 99354, description: 'Capacity of the stadium', required: false }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsInt)(),
    __metadata("design:type", Number)
], CreateStadiumDto.prototype, "capacity", void 0);
__decorate([
    (0, swagger_2.ApiProperty)({ example: 1957, description: 'Year constructed', required: false }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsInt)(),
    __metadata("design:type", Number)
], CreateStadiumDto.prototype, "yearConstructed", void 0);
__decorate([
    (0, swagger_2.ApiProperty)({ example: 'stadium', description: 'Type: stadium or gymnasium' }),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateStadiumDto.prototype, "type", void 0);
__decorate([
    (0, swagger_2.ApiProperty)({ example: 'https://example.com/stadium.png', required: false }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsUrl)(),
    __metadata("design:type", String)
], CreateStadiumDto.prototype, "imageUrl", void 0);
class UpdateStadiumDto extends (0, swagger_1.PartialType)(CreateStadiumDto) {
}
exports.UpdateStadiumDto = UpdateStadiumDto;
class StadiumResponseDto extends CreateStadiumDto {
}
exports.StadiumResponseDto = StadiumResponseDto;
__decorate([
    (0, swagger_2.ApiProperty)({ example: 1 }),
    (0, class_validator_1.IsInt)(),
    __metadata("design:type", Number)
], StadiumResponseDto.prototype, "id", void 0);
__decorate([
    (0, swagger_2.ApiProperty)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Date)
], StadiumResponseDto.prototype, "createdAt", void 0);
//# sourceMappingURL=stadium.dto.js.map