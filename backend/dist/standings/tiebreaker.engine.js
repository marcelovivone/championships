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
exports.TiebreakerEngine = void 0;
const common_1 = require("@nestjs/common");
const h2h_calculator_1 = require("./h2h-calculator");
let TiebreakerEngine = class TiebreakerEngine {
    constructor(h2hCalculator) {
        this.h2hCalculator = h2hCalculator;
    }
    async sort(rows, criteria, seasonId, leagueId, maxDate, pointSystem = 'FOOTBALL_3_1_0') {
        if (rows.length <= 1 || criteria.length === 0)
            return rows;
        const [first, ...rest] = criteria;
        const isH2H = first.criterion.startsWith('H2H_');
        let groups;
        if (isH2H) {
            groups = await this.groupByH2H(rows, first, seasonId, leagueId, maxDate, pointSystem);
        }
        else {
            groups = this.groupByOverallStat(rows, first);
        }
        const sorted = [];
        for (const group of groups) {
            if (group.length === 1) {
                sorted.push(group[0]);
            }
            else {
                if (isH2H && rest.length > 0) {
                    sorted.push(...(await this.sort(group, rest, seasonId, leagueId, maxDate, pointSystem)));
                }
                else {
                    sorted.push(...(await this.sort(group, rest, seasonId, leagueId, maxDate, pointSystem)));
                }
            }
        }
        return sorted;
    }
    groupByOverallStat(rows, criterion) {
        const getValue = (row) => this.getStatValue(row, criterion.criterion);
        const sorted = [...rows].sort((a, b) => {
            const diff = getValue(a) - getValue(b);
            return criterion.direction === 'DESC' ? -diff : diff;
        });
        return this.splitIntoGroups(sorted, getValue);
    }
    async groupByH2H(rows, criterion, seasonId, leagueId, maxDate, pointSystem) {
        const clubIds = rows.map(r => r.clubId);
        const h2hStats = await this.h2hCalculator.calculate(clubIds, seasonId, leagueId, null, maxDate, pointSystem);
        const getH2HValue = (row) => {
            const s = h2hStats[row.clubId];
            if (!s)
                return 0;
            switch (criterion.criterion) {
                case 'H2H_POINTS': return s.points;
                case 'H2H_WINS': return s.wins;
                case 'H2H_WIN_PCT': return s.winPct;
                case 'H2H_GOAL_DIFFERENCE': return s.gf - s.ga;
                case 'H2H_GOALS_FOR': return s.gf;
                case 'H2H_AWAY_GOALS': return s.awayGf;
                case 'H2H_POINT_DIFFERENCE': return s.pointDiff;
                default: return 0;
            }
        };
        const sorted = [...rows].sort((a, b) => {
            const diff = getH2HValue(a) - getH2HValue(b);
            return criterion.direction === 'DESC' ? -diff : diff;
        });
        return this.splitIntoGroups(sorted, getH2HValue);
    }
    splitIntoGroups(sorted, getValue) {
        if (sorted.length === 0)
            return [];
        const groups = [];
        let current = [sorted[0]];
        for (let i = 1; i < sorted.length; i++) {
            if (getValue(sorted[i]) === getValue(current[0])) {
                current.push(sorted[i]);
            }
            else {
                groups.push(current);
                current = [sorted[i]];
            }
        }
        groups.push(current);
        return groups;
    }
    getStatValue(row, criterion) {
        switch (criterion) {
            case 'POINTS': return Number(row.points ?? 0);
            case 'WINS': return Number(row.wins ?? 0);
            case 'WIN_PCT': return row.played > 0 ? Number(row.wins ?? 0) / Number(row.played) : 0;
            case 'GOAL_DIFFERENCE': return Number(row.goalsFor ?? 0) - Number(row.goalsAgainst ?? 0);
            case 'GOALS_FOR': return Number(row.goalsFor ?? 0);
            case 'GOALS_AGAINST': return Number(row.goalsAgainst ?? 0);
            case 'AWAY_GOALS_FOR': return Number(row.awayGoalsFor ?? 0);
            case 'GAMES_PLAYED': return Number(row.played ?? 0);
            case 'REGULATION_WINS': return Number(row.regulationWins ?? 0);
            case 'REGULATION_OT_WINS': return Number(row.regulationOtWins ?? 0);
            case 'OT_WINS': return Number(row.overtimeWins ?? 0);
            case 'PENALTY_WINS': return Number(row.penaltyWins ?? 0);
            case 'SET_RATIO': return Number(row.setsLost ?? 0) > 0 ? Number(row.setsWon ?? 0) / Number(row.setsLost) : Number(row.setsWon ?? 0);
            case 'POINT_RATIO': return Number(row.goalsAgainst ?? 0) > 0 ? Number(row.goalsFor ?? 0) / Number(row.goalsAgainst) : Number(row.goalsFor ?? 0);
            case 'NET_POINTS': return Number(row.goalsFor ?? 0) - Number(row.goalsAgainst ?? 0);
            case 'CLUB_ID': return Number(row.clubId ?? 0);
            default: return 0;
        }
    }
};
exports.TiebreakerEngine = TiebreakerEngine;
exports.TiebreakerEngine = TiebreakerEngine = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [h2h_calculator_1.H2HCalculator])
], TiebreakerEngine);
//# sourceMappingURL=tiebreaker.engine.js.map