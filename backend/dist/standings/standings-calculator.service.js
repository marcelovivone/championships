"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.StandingsCalculatorService = void 0;
const common_1 = require("@nestjs/common");
let StandingsCalculatorService = class StandingsCalculatorService {
    calculate(sportName, match, previousHomeStanding, previousAwayStanding) {
        const homeStats = {
            points: Number(previousHomeStanding?.points ?? 0),
            played: Number(previousHomeStanding?.played ?? 0),
            wins: Number(previousHomeStanding?.wins ?? 0),
            draws: Number(previousHomeStanding?.draws ?? 0),
            losses: Number(previousHomeStanding?.losses ?? 0),
            goalsFor: Number(previousHomeStanding?.goalsFor ?? 0),
            goalsAgainst: Number(previousHomeStanding?.goalsAgainst ?? 0),
            homeGamesPlayed: Number(previousHomeStanding?.homeGamesPlayed ?? 0),
            awayGamesPlayed: Number(previousHomeStanding?.awayGamesPlayed ?? 0),
            homePoints: Number(previousHomeStanding?.homePoints ?? 0),
            awayPoints: Number(previousHomeStanding?.awayPoints ?? 0),
            homeWins: Number(previousHomeStanding?.homeWins ?? 0),
            homeLosses: Number(previousHomeStanding?.homeLosses ?? 0),
            homeDraws: Number(previousHomeStanding?.homeDraws ?? 0),
            homeGoalsFor: Number(previousHomeStanding?.homeGoalsFor ?? 0),
            homeGoalsAgainst: Number(previousHomeStanding?.homeGoalsAgainst ?? 0),
            awayWins: Number(previousHomeStanding?.awayWins ?? 0),
            awayLosses: Number(previousHomeStanding?.awayLosses ?? 0),
            awayDraws: Number(previousHomeStanding?.awayDraws ?? 0),
            awayGoalsFor: Number(previousHomeStanding?.awayGoalsFor ?? 0),
            awayGoalsAgainst: Number(previousHomeStanding?.awayGoalsAgainst ?? 0),
            overtimeWins: Number(previousHomeStanding?.overtimeWins ?? 0),
            overtimeLosses: Number(previousHomeStanding?.overtimeLosses ?? 0),
            penaltyWins: Number(previousHomeStanding?.penaltyWins ?? 0),
            penaltyLosses: Number(previousHomeStanding?.penaltyLosses ?? 0),
            setsWon: Number(previousHomeStanding?.setsWon ?? 0),
            setsLost: Number(previousHomeStanding?.setsLost ?? 0),
            regulationWins: Number(previousHomeStanding?.regulationWins ?? 0),
            regulationOtWins: Number(previousHomeStanding?.regulationOtWins ?? 0),
        };
        const awayStats = {
            points: Number(previousAwayStanding?.points ?? 0),
            played: Number(previousAwayStanding?.played ?? 0),
            wins: Number(previousAwayStanding?.wins ?? 0),
            draws: Number(previousAwayStanding?.draws ?? 0),
            losses: Number(previousAwayStanding?.losses ?? 0),
            goalsFor: Number(previousAwayStanding?.goalsFor ?? 0),
            goalsAgainst: Number(previousAwayStanding?.goalsAgainst ?? 0),
            homeGamesPlayed: Number(previousAwayStanding?.homeGamesPlayed ?? 0),
            awayGamesPlayed: Number(previousAwayStanding?.awayGamesPlayed ?? 0),
            homePoints: Number(previousAwayStanding?.homePoints ?? 0),
            awayPoints: Number(previousAwayStanding?.awayPoints ?? 0),
            homeWins: Number(previousAwayStanding?.homeWins ?? 0),
            homeLosses: Number(previousAwayStanding?.homeLosses ?? 0),
            homeDraws: Number(previousAwayStanding?.homeDraws ?? 0),
            homeGoalsFor: Number(previousAwayStanding?.homeGoalsFor ?? 0),
            homeGoalsAgainst: Number(previousAwayStanding?.homeGoalsAgainst ?? 0),
            awayWins: Number(previousAwayStanding?.awayWins ?? 0),
            awayLosses: Number(previousAwayStanding?.awayLosses ?? 0),
            awayDraws: Number(previousAwayStanding?.awayDraws ?? 0),
            awayGoalsFor: Number(previousAwayStanding?.awayGoalsFor ?? 0),
            awayGoalsAgainst: Number(previousAwayStanding?.awayGoalsAgainst ?? 0),
            overtimeWins: Number(previousAwayStanding?.overtimeWins ?? 0),
            overtimeLosses: Number(previousAwayStanding?.overtimeLosses ?? 0),
            penaltyWins: Number(previousAwayStanding?.penaltyWins ?? 0),
            penaltyLosses: Number(previousAwayStanding?.penaltyLosses ?? 0),
            setsWon: Number(previousAwayStanding?.setsWon ?? 0),
            setsLost: Number(previousAwayStanding?.setsLost ?? 0),
            regulationWins: Number(previousAwayStanding?.regulationWins ?? 0),
            regulationOtWins: Number(previousAwayStanding?.regulationOtWins ?? 0),
        };
        homeStats.played = Number(homeStats.played) + 1;
        homeStats.homeGamesPlayed = Number(homeStats.homeGamesPlayed) + 1;
        awayStats.played = Number(awayStats.played) + 1;
        awayStats.awayGamesPlayed = Number(awayStats.awayGamesPlayed) + 1;
        homeStats.goalsFor = Number(homeStats.goalsFor) + Number(match.homeScore ?? 0);
        homeStats.goalsAgainst = Number(homeStats.goalsAgainst) + Number(match.awayScore ?? 0);
        awayStats.goalsFor = Number(awayStats.goalsFor) + Number(match.awayScore ?? 0);
        awayStats.goalsAgainst = Number(awayStats.goalsAgainst) + Number(match.homeScore ?? 0);
        homeStats.homeGoalsFor = Number(homeStats.homeGoalsFor) + Number(match.homeScore ?? 0);
        homeStats.homeGoalsAgainst = Number(homeStats.homeGoalsAgainst) + Number(match.awayScore ?? 0);
        awayStats.awayGoalsFor = Number(awayStats.awayGoalsFor) + Number(match.awayScore ?? 0);
        awayStats.awayGoalsAgainst = Number(awayStats.awayGoalsAgainst) + Number(match.homeScore ?? 0);
        const sport = sportName.toLowerCase();
        if (sport.includes('football') ||
            sport.includes('handball') ||
            sport.includes('futsal')) {
            this.calculateGeneralRule(match, homeStats, awayStats);
        }
        else if (sport.includes('ice hockey')) {
            this.calculateIceHockey(match, homeStats, awayStats);
        }
        else if (sport.includes('basketball')) {
            this.calculateBasketball(match, homeStats, awayStats);
        }
        else if (sport.includes('volleyball')) {
            this.calculateVolleyball(match, homeStats, awayStats);
        }
        else {
            this.calculateGeneralRule(match, homeStats, awayStats);
        }
        const matchDivisions = match.matchDivisions || [];
        if (matchDivisions.length > 0) {
            matchDivisions.forEach((division) => {
                const normalizedDivisionType = String(division.divisionType ?? '').trim().toUpperCase();
                const divisionNumber = Number(division.divisionNumber ?? 0);
                const isBasketballOvertime = sport.includes('basketball') && divisionNumber > 4;
                const isIceHockeyOvertime = sport.includes('ice hockey') && divisionNumber > 3 && normalizedDivisionType !== 'PENALTIES';
                const isOvertimeDivision = division.id === -10
                    || normalizedDivisionType === 'OVERTIME'
                    || isBasketballOvertime
                    || isIceHockeyOvertime;
                const isPenaltyDivision = division.id === -11 || normalizedDivisionType === 'PENALTIES';
                if (isOvertimeDivision && division.homeScore != null) {
                    if (division.homeScore > division.awayScore) {
                        homeStats.overtimeWins += 1;
                        awayStats.overtimeLosses += 1;
                    }
                    else if (division.homeScore < division.awayScore) {
                        homeStats.overtimeLosses += 1;
                        awayStats.overtimeWins += 1;
                    }
                }
                if (isPenaltyDivision && division.homeScore != null) {
                    if (division.homeScore > division.awayScore) {
                        homeStats.penaltyWins += 1;
                        awayStats.penaltyLosses += 1;
                    }
                    else if (division.homeScore < division.awayScore) {
                        homeStats.penaltyLosses += 1;
                        awayStats.penaltyWins += 1;
                    }
                }
            });
        }
        if (sport.includes('ice hockey')) {
            const matchDivisionsList = match.matchDivisions || [];
            const hasOvertime = matchDivisionsList.some((d) => {
                const dt = String(d.divisionType ?? '').trim().toUpperCase();
                const dn = Number(d.divisionNumber ?? 0);
                return d.id === -10 || dt === 'OVERTIME' || (dn > 3 && dt !== 'PENALTIES');
            });
            const hasShootout = matchDivisionsList.some((d) => {
                const dt = String(d.divisionType ?? '').trim().toUpperCase();
                return d.id === -11 || dt === 'PENALTIES';
            });
            if (match.homeScore > match.awayScore) {
                if (!hasOvertime && !hasShootout) {
                    homeStats.regulationWins++;
                    homeStats.regulationOtWins++;
                }
                else if (hasOvertime && !hasShootout) {
                    homeStats.regulationOtWins++;
                }
            }
            else if (match.awayScore > match.homeScore) {
                if (!hasOvertime && !hasShootout) {
                    awayStats.regulationWins++;
                    awayStats.regulationOtWins++;
                }
                else if (hasOvertime && !hasShootout) {
                    awayStats.regulationOtWins++;
                }
            }
        }
        return { home: homeStats, away: awayStats };
    }
    calculateGeneralRule(match, home, away) {
        if (match.homeScore > match.awayScore) {
            home.points = Number(home.points) + 3;
            home.homePoints = Number(home.homePoints) + 3;
            home.wins = Number(home.wins) + 1;
            home.homeWins = Number(home.homeWins) + 1;
            away.losses = Number(away.losses) + 1;
            away.awayLosses = Number(away.awayLosses) + 1;
        }
        else if (match.homeScore < match.awayScore) {
            home.losses = Number(home.losses) + 1;
            home.homeLosses = Number(home.homeLosses) + 1;
            away.points = Number(away.points) + 3;
            away.awayPoints = Number(away.awayPoints) + 3;
            away.wins = Number(away.wins) + 1;
            away.awayWins = Number(away.awayWins) + 1;
        }
        else {
            home.points = Number(home.points) + 1;
            home.homePoints = Number(home.homePoints) + 1;
            away.points = Number(away.points) + 1;
            away.awayPoints = Number(away.awayPoints) + 1;
            home.draws = Number(home.draws) + 1;
            home.homeDraws = Number(home.homeDraws) + 1;
            away.draws = Number(away.draws) + 1;
            away.awayDraws = Number(away.awayDraws) + 1;
        }
    }
    calculateIceHockey(match, home, away) {
        if (match.homeScore > match.awayScore) {
            home.points = Number(home.points) + 2;
            home.homePoints = Number(home.homePoints) + 2;
            home.wins = Number(home.wins) + 1;
            home.homeWins = Number(home.homeWins) + 1;
            away.losses = Number(away.losses) + 1;
            away.awayLosses = Number(away.awayLosses) + 1;
        }
        else if (match.homeScore < match.awayScore) {
            home.losses = Number(home.losses) + 1;
            home.homeLosses = Number(home.homeLosses) + 1;
            away.points = Number(away.points) + 2;
            away.awayPoints = Number(away.awayPoints) + 2;
            away.wins = Number(away.wins) + 1;
            away.awayWins = Number(away.awayWins) + 1;
        }
    }
    calculateBasketball(match, home, away) {
        if (match.homeScore > match.awayScore) {
            home.points = Number(home.points) + 2;
            home.homePoints = Number(home.homePoints) + 2;
            home.wins = Number(home.wins) + 1;
            home.homeWins = Number(home.homeWins) + 1;
            away.losses = Number(away.losses) + 1;
            away.awayLosses = Number(away.awayLosses) + 1;
        }
        else {
            home.losses = Number(home.losses) + 1;
            home.homeLosses = Number(home.homeLosses) + 1;
            away.points = Number(away.points) + 2;
            away.awayPoints = Number(away.awayPoints) + 2;
            away.wins = Number(away.wins) + 1;
            away.awayWins = Number(away.awayWins) + 1;
        }
    }
    calculateVolleyball(match, home, away) {
        home.setsWon = Number(home.setsWon) + Number(match.homeScore ?? 0);
        home.setsLost = Number(home.setsLost) + Number(match.awayScore ?? 0);
        away.setsWon = Number(away.setsWon) + Number(match.awayScore ?? 0);
        away.setsLost = Number(away.setsLost) + Number(match.homeScore ?? 0);
        home.goalsFor = 0;
        home.goalsAgainst = 0;
        away.goalsFor = 0;
        away.goalsAgainst = 0;
        if (match.homeScore > match.awayScore) {
            home.wins = Number(home.wins) + 1;
            home.homeWins = Number(home.homeWins) + 1;
            away.losses = Number(away.losses) + 1;
            away.awayLosses = Number(away.awayLosses) + 1;
            if (match.homeScore === 3 && (match.awayScore === 0 || match.awayScore === 1)) {
                home.points = Number(home.points) + 3;
            }
            else if (match.homeScore === 3 && match.awayScore === 2) {
                home.points = Number(home.points) + 2;
                away.points = Number(away.points) + 1;
            }
        }
        else {
            away.wins = Number(away.wins) + 1;
            away.awayWins = Number(away.awayWins) + 1;
            home.losses = Number(home.losses) + 1;
            home.homeLosses = Number(home.homeLosses) + 1;
            if (match.awayScore === 3 && (match.homeScore === 0 || match.homeScore === 1)) {
                away.points = Number(away.points) + 3;
            }
            else if (match.awayScore === 3 && match.homeScore === 2) {
                away.points = Number(away.points) + 2;
                home.points = Number(home.points) + 1;
            }
        }
    }
};
exports.StandingsCalculatorService = StandingsCalculatorService;
exports.StandingsCalculatorService = StandingsCalculatorService = __decorate([
    (0, common_1.Injectable)()
], StandingsCalculatorService);
//# sourceMappingURL=standings-calculator.service.js.map