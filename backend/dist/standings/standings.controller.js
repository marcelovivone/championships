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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.StandingsController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const standings_service_1 = require("./standings.service");
const dtos_1 = require("../common/dtos");
let StandingsController = class StandingsController {
    constructor(standingsService) {
        this.standingsService = standingsService;
    }
    toStandingResponseDto(standing) {
        let matchDateValue = standing.matchDate;
        if (standing.matchDate instanceof Date) {
            matchDateValue = !isNaN(standing.matchDate.getTime())
                ? standing.matchDate.toISOString()
                : null;
        }
        else if (typeof standing.matchDate === 'string') {
            const parsed = new Date(standing.matchDate);
            matchDateValue = !isNaN(parsed.getTime()) ? parsed.toISOString() : null;
        }
        else if (!standing.matchDate) {
            matchDateValue = null;
        }
        return {
            ...standing,
            matchDate: matchDateValue,
        };
    }
    async getByLeagueSeasonRoundOrMatchDate(leagueId, seasonId, roundId, matchDate, clubId) {
        if (leagueId && seasonId && roundId) {
            const standings = await this.standingsService.findByLeagueIdAndSeasonIdAndRoundId(parseInt(leagueId, 10), parseInt(seasonId, 10), parseInt(roundId, 10), clubId ? parseInt(clubId, 10) : undefined);
            return standings.map(this.toStandingResponseDto);
        }
        if (leagueId && seasonId && matchDate) {
            const standings = await this.standingsService.findByLeagueIdAndSeasonIdAndMatchDate(parseInt(leagueId, 10), parseInt(seasonId, 10), matchDate, clubId ? parseInt(clubId, 10) : undefined);
            return standings.map(this.toStandingResponseDto);
        }
        return this.findAll(undefined, undefined);
    }
    async findAll(roundId, matchDate) {
        if (roundId && matchDate) {
            throw new Error('Provide only one filter: either roundId or matchDate, not both.');
        }
        if (roundId) {
            const standings = await this.standingsService.findByRound(parseInt(roundId, 10));
            return standings.map(this.toStandingResponseDto);
        }
        if (matchDate) {
            const standings = await this.standingsService.findByMatchDate(matchDate);
            return standings.map(this.toStandingResponseDto);
        }
        const standings = await this.standingsService.findAll();
        return standings.map(this.toStandingResponseDto);
    }
    async findOne(id) {
        const standing = await this.standingsService.findOne(id);
        return this.toStandingResponseDto(standing);
    }
    async create(createStandingDto) {
        const standing = await this.standingsService.create(createStandingDto);
        return this.toStandingResponseDto(standing);
    }
    async strictRemove(matchId, standingId) {
        if (matchId) {
            await this.standingsService.removeByMatchId(matchId);
        }
        else if (standingId) {
            await this.standingsService.removeByClubLeagueSeason(0, 0, 0, standingId);
        }
        else {
            throw new common_1.BadRequestException('matchId or standingId required');
        }
    }
    async remove(id) {
        await this.standingsService.remove(id);
    }
};
exports.StandingsController = StandingsController;
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, common_1.Query)('leagueId')),
    __param(1, (0, common_1.Query)('seasonId')),
    __param(2, (0, common_1.Query)('roundId')),
    __param(3, (0, common_1.Query)('matchDate')),
    __param(4, (0, common_1.Query)('clubId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, String, String]),
    __metadata("design:returntype", Promise)
], StandingsController.prototype, "getByLeagueSeasonRoundOrMatchDate", null);
__decorate([
    (0, swagger_1.ApiOperation)({ summary: 'Retrieve standings' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'List of standings' }),
    (0, common_1.Get)(),
    __param(0, (0, common_1.Query)('roundId')),
    __param(1, (0, common_1.Query)('matchDate')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], StandingsController.prototype, "findAll", null);
__decorate([
    (0, swagger_1.ApiOperation)({ summary: 'Retrieve a standing by ID' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'The standing details' }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'Standing not found' }),
    (0, common_1.Get)(':id'),
    __param(0, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number]),
    __metadata("design:returntype", Promise)
], StandingsController.prototype, "findOne", null);
__decorate([
    (0, swagger_1.ApiOperation)({ summary: 'Create a new standing entry' }),
    (0, swagger_1.ApiResponse)({ status: 201, description: 'The standing has been successfully created.' }),
    (0, common_1.Post)(),
    (0, common_1.HttpCode)(common_1.HttpStatus.CREATED),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [dtos_1.CreateStandingDto]),
    __metadata("design:returntype", Promise)
], StandingsController.prototype, "create", null);
__decorate([
    (0, swagger_1.ApiOperation)({ summary: 'Strict delete: only if no later standing exists for club/league/season' }),
    (0, swagger_1.ApiResponse)({ status: 204, description: 'Standing deleted' }),
    (0, swagger_1.ApiResponse)({ status: 400, description: 'Cannot delete: later standing exists' }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'Standing not found' }),
    (0, common_1.Delete)('strict'),
    (0, common_1.HttpCode)(common_1.HttpStatus.NO_CONTENT),
    __param(0, (0, common_1.Query)('matchId')),
    __param(1, (0, common_1.Query)('standingId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, Number]),
    __metadata("design:returntype", Promise)
], StandingsController.prototype, "strictRemove", null);
__decorate([
    (0, swagger_1.ApiOperation)({ summary: 'Delete a standing entry' }),
    (0, swagger_1.ApiResponse)({ status: 204, description: 'The standing has been successfully deleted.' }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'Standing not found' }),
    (0, common_1.Delete)(':id'),
    (0, common_1.HttpCode)(common_1.HttpStatus.NO_CONTENT),
    __param(0, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number]),
    __metadata("design:returntype", Promise)
], StandingsController.prototype, "remove", null);
exports.StandingsController = StandingsController = __decorate([
    (0, swagger_1.ApiTags)('standings'),
    (0, common_1.Controller)({ path: 'standings', version: '1' }),
    __metadata("design:paramtypes", [standings_service_1.StandingsService])
], StandingsController);
//# sourceMappingURL=standings.controller.js.map