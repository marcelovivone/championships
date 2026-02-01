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
var RoundAutoUpdateService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.RoundAutoUpdateService = void 0;
const common_1 = require("@nestjs/common");
const node_postgres_1 = require("drizzle-orm/node-postgres");
const drizzle_orm_1 = require("drizzle-orm");
const schema_1 = require("../db/schema");
let RoundAutoUpdateService = RoundAutoUpdateService_1 = class RoundAutoUpdateService {
    constructor(db) {
        this.db = db;
        this.logger = new common_1.Logger(RoundAutoUpdateService_1.name);
    }
    async autoUpdateCurrentRounds() {
        try {
            this.logger.log('Starting automatic round update check');
            const currentDate = new Date();
            const autoLeagues = await this.db
                .select()
                .from(schema_1.leagues)
                .where((0, drizzle_orm_1.eq)(schema_1.leagues.flgRoundAutomatic, true));
            this.logger.log(`Found ${autoLeagues.length} leagues with auto-update enabled`);
            for (const league of autoLeagues) {
                try {
                    const defaultSeasons = await this.db
                        .select()
                        .from(schema_1.seasons)
                        .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.seasons.leagueId, league.id), (0, drizzle_orm_1.eq)(schema_1.seasons.flgDefault, true)));
                    if (defaultSeasons.length === 0) {
                        this.logger.debug(`No default season found for league ${league.originalName}`);
                        continue;
                    }
                    const defaultSeason = defaultSeasons[0];
                    const currentRounds = await this.db
                        .select()
                        .from(schema_1.rounds)
                        .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.rounds.seasonId, defaultSeason.id), (0, drizzle_orm_1.eq)(schema_1.rounds.flgCurrent, true)));
                    const currentRound = currentRounds.length > 0 ? currentRounds[0] : null;
                    const needsUpdate = this.shouldUpdateCurrentRound(currentRound, currentDate);
                    if (!needsUpdate) {
                        this.logger.debug(`Current round for league ${league.originalName} is up to date`);
                        continue;
                    }
                    const allRounds = await this.db
                        .select()
                        .from(schema_1.rounds)
                        .where((0, drizzle_orm_1.eq)(schema_1.rounds.seasonId, defaultSeason.id))
                        .orderBy(schema_1.rounds.roundNumber);
                    const nextRound = this.findNextAppropriateRound(allRounds, currentDate);
                    if (nextRound && (!currentRound || nextRound.id !== currentRound.id)) {
                        this.logger.log(`Updating current round for league ${league.originalName} from round ${currentRound?.roundNumber || 'none'} to round ${nextRound.roundNumber}`);
                        await this.db
                            .update(schema_1.rounds)
                            .set({ flgCurrent: false })
                            .where((0, drizzle_orm_1.eq)(schema_1.rounds.seasonId, defaultSeason.id));
                        await this.db
                            .update(schema_1.rounds)
                            .set({ flgCurrent: true })
                            .where((0, drizzle_orm_1.eq)(schema_1.rounds.id, nextRound.id));
                        this.logger.log(`Successfully updated current round for league ${league.originalName}`);
                    }
                }
                catch (error) {
                    this.logger.error(`Error updating rounds for league ${league.originalName}:`, error);
                }
            }
            this.logger.log('Completed automatic round update check');
        }
        catch (error) {
            this.logger.error('Error in automatic round update:', error);
        }
    }
    shouldUpdateCurrentRound(currentRound, currentDate) {
        if (!currentRound) {
            return true;
        }
        if (!currentRound.startDate || !currentRound.endDate) {
            return false;
        }
        const startDate = new Date(currentRound.startDate);
        const endDate = new Date(currentRound.endDate);
        return currentDate < startDate || currentDate > endDate;
    }
    findNextAppropriateRound(allRounds, currentDate) {
        const tomorrow = new Date(currentDate);
        tomorrow.setDate(tomorrow.getDate() + 1);
        tomorrow.setHours(0, 0, 0, 0);
        for (const round of allRounds) {
            if (round.startDate && round.endDate) {
                const startDate = new Date(round.startDate);
                const endDate = new Date(round.endDate);
                if (currentDate >= startDate && currentDate <= endDate) {
                    return round;
                }
            }
        }
        for (const round of allRounds) {
            if (round.startDate) {
                const startDate = new Date(round.startDate);
                startDate.setHours(0, 0, 0, 0);
                if (startDate.getTime() === tomorrow.getTime()) {
                    return round;
                }
            }
        }
        const roundsWithoutDates = allRounds.filter(r => !r.startDate && !r.endDate);
        if (roundsWithoutDates.length > 0) {
            return roundsWithoutDates[0];
        }
        return allRounds.length > 0 ? allRounds[0] : null;
    }
};
exports.RoundAutoUpdateService = RoundAutoUpdateService;
exports.RoundAutoUpdateService = RoundAutoUpdateService = RoundAutoUpdateService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)('DRIZZLE')),
    __metadata("design:paramtypes", [node_postgres_1.NodePgDatabase])
], RoundAutoUpdateService);
//# sourceMappingURL=round-auto-update.service.js.map