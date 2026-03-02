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
exports.MatchesController = void 0;
const common_1 = require("@nestjs/common");
const matches_service_1 = require("./matches.service");
const dtos_1 = require("../common/dtos");
const swagger_1 = require("@nestjs/swagger");
let MatchesController = class MatchesController {
    constructor(matchesService) {
        this.matchesService = matchesService;
    }
    async create(createMatchDto) {
        console.log('createMatchDto', createMatchDto);
        return this.matchesService.create(createMatchDto);
    }
    async findAll(groupId, roundId, sportId, leagueId, seasonId, date, page, limit, sortBy, sortOrder) {
        if (date && seasonId) {
            const seasonIdNum = parseInt(seasonId, 10);
            if (isNaN(seasonIdNum) || seasonIdNum <= 0) {
                throw new common_1.BadRequestException('Invalid seasonId format. Must be a positive integer.');
            }
            return this.matchesService.findBySeasonAndDate(seasonIdNum, date);
        }
        if (roundId && seasonId) {
            const seasonIdNum = parseInt(seasonId, 10);
            if (isNaN(seasonIdNum) || seasonIdNum <= 0) {
                throw new common_1.BadRequestException('Invalid seasonId format. Must be a positive integer.');
            }
            const roundIdNum = parseInt(roundId, 10);
            if (isNaN(roundIdNum) || roundIdNum <= 0) {
                throw new common_1.BadRequestException('Invalid roundId format. Must be a positive integer.');
            }
            return this.matchesService.findBySeasonAndRound(seasonIdNum, roundIdNum);
        }
        if (sportId && leagueId && seasonId) {
            try {
                const sportIdNum = parseInt(sportId, 10);
                const leagueIdNum = parseInt(leagueId, 10);
                const seasonIdNum = parseInt(seasonId, 10);
                if (isNaN(sportIdNum) || sportIdNum <= 0 ||
                    isNaN(leagueIdNum) || leagueIdNum <= 0 ||
                    isNaN(seasonIdNum) || seasonIdNum <= 0) {
                    throw new common_1.BadRequestException('sportId, leagueId and seasonId must be positive integers.');
                }
                const groupIdValue = groupId ? parseInt(groupId, 10) : null;
                if (groupId && (isNaN(groupIdValue) || groupIdValue <= 0)) {
                    throw new common_1.BadRequestException('groupId must be a positive integer if provided.');
                }
                return this.matchesService.findBySportLeagueSeasonAndGroup(sportIdNum, leagueIdNum, seasonIdNum, groupIdValue);
            }
            catch (error) {
                throw new common_1.BadRequestException('Invalid filter parameters');
            }
        }
        if (groupId) {
            const groupIdNum = parseInt(groupId, 10);
            if (isNaN(groupIdNum) || groupIdNum <= 0) {
                throw new common_1.BadRequestException('groupId must be a positive integer');
            }
            return this.matchesService.findByGroup(groupIdNum);
        }
        let pageNum = 1;
        let limitNum = 10;
        let sort = 'date';
        let order = 'asc';
        if (page !== undefined) {
            const parsedPage = parseInt(page, 10);
            if (!isNaN(parsedPage) && parsedPage > 0) {
                pageNum = parsedPage;
            }
            else {
                throw new common_1.BadRequestException('page must be a positive integer');
            }
        }
        if (limit !== undefined) {
            const parsedLimit = parseInt(limit, 10);
            if (!isNaN(parsedLimit) && parsedLimit > 0) {
                limitNum = parsedLimit;
            }
            else {
                throw new common_1.BadRequestException('limit must be a positive integer');
            }
        }
        if (sortBy !== undefined && sortBy.trim() !== '') {
            sort = sortBy;
        }
        if (sortOrder !== undefined && (sortOrder === 'desc' || sortOrder === 'asc')) {
            order = sortOrder;
        }
        const result = await this.matchesService.findAllPaginated(pageNum, limitNum, sort, order);
        return result.data;
    }
    async findOne(id) {
        if (!id || id <= 0) {
            throw new common_1.BadRequestException('id must be a positive integer');
        }
        return this.matchesService.findOne(id);
    }
    async update(id, updateMatchDto) {
        return this.matchesService.update(id, updateMatchDto);
    }
    async updateScore(id, updateScoreDto) {
        if (!id || id <= 0) {
            throw new common_1.BadRequestException('id must be a positive integer');
        }
        return this.matchesService.updateScore(id, updateScoreDto);
    }
    async remove(id) {
        if (!id || id <= 0) {
            throw new common_1.BadRequestException('id must be a positive integer');
        }
        return this.matchesService.remove(id);
    }
};
exports.MatchesController = MatchesController;
__decorate([
    (0, swagger_1.ApiOperation)({ summary: 'Create a new match' }),
    (0, swagger_1.ApiBody)({ type: dtos_1.CreateMatchDto }),
    (0, swagger_1.ApiResponse)({ status: 201, description: 'Match created', type: dtos_1.MatchResponseDto }),
    (0, common_1.Post)(),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [dtos_1.CreateMatchDto]),
    __metadata("design:returntype", Promise)
], MatchesController.prototype, "create", null);
__decorate([
    (0, swagger_1.ApiOperation)({ summary: 'Retrieve all matches' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'List of matches', type: dtos_1.MatchResponseDto, isArray: true }),
    (0, common_1.Get)(),
    __param(0, (0, common_1.Query)('groupId')),
    __param(1, (0, common_1.Query)('roundId')),
    __param(2, (0, common_1.Query)('sportId')),
    __param(3, (0, common_1.Query)('leagueId')),
    __param(4, (0, common_1.Query)('seasonId')),
    __param(5, (0, common_1.Query)('date')),
    __param(6, (0, common_1.Query)('page')),
    __param(7, (0, common_1.Query)('limit')),
    __param(8, (0, common_1.Query)('sortBy')),
    __param(9, (0, common_1.Query)('sortOrder')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, String, String, String, String, String, String, String]),
    __metadata("design:returntype", Promise)
], MatchesController.prototype, "findAll", null);
__decorate([
    (0, swagger_1.ApiOperation)({ summary: 'Retrieve a specific match' }),
    (0, swagger_1.ApiParam)({ name: 'id', description: 'Match ID' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Match found', type: dtos_1.MatchResponseDto }),
    (0, swagger_1.ApiResponse)({ status: 400, description: 'Invalid input' }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'Match not found' }),
    (0, common_1.Get)(':id'),
    __param(0, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number]),
    __metadata("design:returntype", Promise)
], MatchesController.prototype, "findOne", null);
__decorate([
    (0, swagger_1.ApiOperation)({ summary: 'Update a match' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'The match has been successfully updated.' }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'Match not found' }),
    (0, common_1.Put)(':id'),
    __param(0, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, dtos_1.UpdateMatchDto]),
    __metadata("design:returntype", Promise)
], MatchesController.prototype, "update", null);
__decorate([
    (0, swagger_1.ApiOperation)({ summary: 'Update match score' }),
    (0, swagger_1.ApiParam)({ name: 'id', description: 'Match ID' }),
    (0, swagger_1.ApiBody)({ type: dtos_1.UpdateMatchScoreDto }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Match score updated', type: dtos_1.MatchResponseDto }),
    (0, swagger_1.ApiResponse)({ status: 400, description: 'Invalid input' }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'Match not found' }),
    (0, common_1.Patch)(':id/score'),
    __param(0, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, dtos_1.UpdateMatchScoreDto]),
    __metadata("design:returntype", Promise)
], MatchesController.prototype, "updateScore", null);
__decorate([
    (0, swagger_1.ApiOperation)({ summary: 'Delete a specific match' }),
    (0, swagger_1.ApiParam)({ name: 'id', description: 'Match ID' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Match deleted', type: dtos_1.MatchResponseDto }),
    (0, swagger_1.ApiResponse)({ status: 400, description: 'Invalid input' }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'Match not found' }),
    (0, common_1.Delete)(':id'),
    __param(0, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number]),
    __metadata("design:returntype", Promise)
], MatchesController.prototype, "remove", null);
exports.MatchesController = MatchesController = __decorate([
    (0, swagger_1.ApiTags)('matches'),
    (0, common_1.Controller)({ path: 'matches', version: '1' }),
    __metadata("design:paramtypes", [matches_service_1.MatchesService])
], MatchesController);
//# sourceMappingURL=matches.controller.js.map