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
exports.MatchEventResponseDto = exports.UpdateMatchEventDto = exports.CreateMatchEventDto = exports.MatchEventType = void 0;
const class_validator_1 = require("class-validator");
const swagger_1 = require("@nestjs/swagger");
var MatchEventType;
(function (MatchEventType) {
    MatchEventType["GOAL"] = "goal";
    MatchEventType["OWN_GOAL"] = "own_goal";
    MatchEventType["ASSIST"] = "assist";
    MatchEventType["YELLOW_CARD"] = "yellow_card";
    MatchEventType["RED_CARD"] = "red_card";
    MatchEventType["SUBSTITUTION"] = "substitution";
    MatchEventType["INJURY"] = "injury";
    MatchEventType["TIMEOUT"] = "timeout";
    MatchEventType["POINT"] = "point";
    MatchEventType["SET_WIN"] = "set_win";
    MatchEventType["FOUL"] = "foul";
    MatchEventType["PENALTY"] = "penalty";
})(MatchEventType || (exports.MatchEventType = MatchEventType = {}));
class CreateMatchEventDto {
}
exports.CreateMatchEventDto = CreateMatchEventDto;
__decorate([
    (0, swagger_1.ApiProperty)({ example: 1 }),
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", Number)
], CreateMatchEventDto.prototype, "matchId", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 1 }),
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", Number)
], CreateMatchEventDto.prototype, "clubId", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'goal', description: 'Type of event' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], CreateMatchEventDto.prototype, "eventType", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 1, required: false }),
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Number)
], CreateMatchEventDto.prototype, "playerId", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 45, required: false }),
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Number)
], CreateMatchEventDto.prototype, "minute", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'Goal scored', required: false }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.MaxLength)(500),
    __metadata("design:type", String)
], CreateMatchEventDto.prototype, "description", void 0);
class UpdateMatchEventDto {
}
exports.UpdateMatchEventDto = UpdateMatchEventDto;
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'goal', required: false }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], UpdateMatchEventDto.prototype, "eventType", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 1, required: false }),
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Number)
], UpdateMatchEventDto.prototype, "clubId", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 1, required: false }),
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Number)
], UpdateMatchEventDto.prototype, "playerId", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 45, required: false }),
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Number)
], UpdateMatchEventDto.prototype, "minute", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'Goal scored', required: false }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.MaxLength)(500),
    __metadata("design:type", String)
], UpdateMatchEventDto.prototype, "description", void 0);
class MatchEventResponseDto {
}
exports.MatchEventResponseDto = MatchEventResponseDto;
__decorate([
    (0, swagger_1.ApiProperty)({ example: 1 }),
    __metadata("design:type", Number)
], MatchEventResponseDto.prototype, "id", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 1 }),
    __metadata("design:type", Number)
], MatchEventResponseDto.prototype, "matchId", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 1 }),
    __metadata("design:type", Number)
], MatchEventResponseDto.prototype, "clubId", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'goal' }),
    __metadata("design:type", String)
], MatchEventResponseDto.prototype, "eventType", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 1, required: false }),
    __metadata("design:type", Number)
], MatchEventResponseDto.prototype, "playerId", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 45, required: false }),
    __metadata("design:type", Number)
], MatchEventResponseDto.prototype, "minute", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'Goal scored', required: false }),
    __metadata("design:type", String)
], MatchEventResponseDto.prototype, "description", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", Date)
], MatchEventResponseDto.prototype, "createdAt", void 0);
//# sourceMappingURL=match-event.dto.js.map