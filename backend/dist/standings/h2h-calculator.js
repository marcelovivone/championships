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
exports.H2HCalculator = void 0;
const common_1 = require("@nestjs/common");
const node_postgres_1 = require("drizzle-orm/node-postgres");
const schema_1 = require("../db/schema");
const drizzle_orm_1 = require("drizzle-orm");
const POINT_SYSTEMS = {
    FOOTBALL_3_1_0: { winHome: 3, winAway: 3, draw: 1, otl: 0 },
    HOCKEY_2_0_OTL: { winHome: 2, winAway: 2, draw: 0, otl: 1 },
    HOCKEY_3_2_1_0: { winHome: 3, winAway: 3, draw: 0, otl: 1 },
    BASKETBALL_W_L: { winHome: 1, winAway: 1, draw: 0, otl: 0 },
    VOLLEYBALL_3_2_1_0: { winHome: 3, winAway: 3, draw: 0, otl: 0 },
    HANDBALL_2_1_0: { winHome: 2, winAway: 2, draw: 1, otl: 0 },
};
let H2HCalculator = class H2HCalculator {
    constructor(db) {
        this.db = db;
    }
    async calculate(clubIds, seasonId, leagueId, maxRoundId, maxDate, pointSystem = 'FOOTBALL_3_1_0') {
        if (clubIds.length < 2) {
            const stats = {};
            for (const id of clubIds) {
                stats[id] = { points: 0, wins: 0, played: 0, gf: 0, ga: 0, awayGf: 0, pointDiff: 0, winPct: 0 };
            }
            return stats;
        }
        let query = this.db
            .select()
            .from(schema_1.matches)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.matches.seasonId, seasonId), (0, drizzle_orm_1.eq)(schema_1.matches.leagueId, leagueId), (0, drizzle_orm_1.eq)(schema_1.matches.status, 'Finished'), (0, drizzle_orm_1.inArray)(schema_1.matches.homeClubId, clubIds), (0, drizzle_orm_1.inArray)(schema_1.matches.awayClubId, clubIds), maxDate ? (0, drizzle_orm_1.lte)(schema_1.matches.date, maxDate) : undefined));
        const mutualMatches = await query;
        const stats = {};
        for (const id of clubIds) {
            stats[id] = { points: 0, wins: 0, played: 0, gf: 0, ga: 0, awayGf: 0, pointDiff: 0, winPct: 0 };
        }
        const ps = POINT_SYSTEMS[pointSystem] || POINT_SYSTEMS['FOOTBALL_3_1_0'];
        for (const m of mutualMatches) {
            const hId = m.homeClubId;
            const aId = m.awayClubId;
            const hs = m.homeScore ?? 0;
            const as_ = m.awayScore ?? 0;
            if (!stats[hId] || !stats[aId])
                continue;
            stats[hId].played++;
            stats[aId].played++;
            stats[hId].gf += hs;
            stats[hId].ga += as_;
            stats[aId].gf += as_;
            stats[aId].ga += hs;
            stats[aId].awayGf += as_;
            stats[hId].pointDiff += hs - as_;
            stats[aId].pointDiff += as_ - hs;
            if (hs > as_) {
                stats[hId].wins++;
                stats[hId].points += ps.winHome;
                if (ps.otl > 0) {
                    const divisions = await this.db
                        .select()
                        .from(schema_1.matchDivisions)
                        .where((0, drizzle_orm_1.eq)(schema_1.matchDivisions.matchId, m.id))
                        .orderBy((0, drizzle_orm_1.asc)(schema_1.matchDivisions.divisionNumber));
                    const hasOTOrSO = divisions.some(d => d.divisionType === 'OVERTIME' || d.divisionType === 'PENALTIES' || d.id === -10 || d.id === -11);
                    if (hasOTOrSO) {
                        stats[aId].points += ps.otl;
                    }
                }
            }
            else if (as_ > hs) {
                stats[aId].wins++;
                stats[aId].points += ps.winAway;
                if (ps.otl > 0) {
                    const divisions = await this.db
                        .select()
                        .from(schema_1.matchDivisions)
                        .where((0, drizzle_orm_1.eq)(schema_1.matchDivisions.matchId, m.id))
                        .orderBy((0, drizzle_orm_1.asc)(schema_1.matchDivisions.divisionNumber));
                    const hasOTOrSO = divisions.some(d => d.divisionType === 'OVERTIME' || d.divisionType === 'PENALTIES' || d.id === -10 || d.id === -11);
                    if (hasOTOrSO) {
                        stats[hId].points += ps.otl;
                    }
                }
            }
            else {
                stats[hId].points += ps.draw;
                stats[aId].points += ps.draw;
            }
        }
        for (const id of clubIds) {
            stats[id].winPct = stats[id].played > 0 ? stats[id].wins / stats[id].played : 0;
        }
        return stats;
    }
};
exports.H2HCalculator = H2HCalculator;
exports.H2HCalculator = H2HCalculator = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)('DRIZZLE')),
    __metadata("design:paramtypes", [node_postgres_1.NodePgDatabase])
], H2HCalculator);
//# sourceMappingURL=h2h-calculator.js.map