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
    calculate(sportName, match) {
        const baseStats = {
            points: 0,
            played: 1,
            wins: 0,
            draws: 0,
            losses: 0,
            goalsFor: 0,
            goalsAgainst: 0,
            overtimeWins: 0,
            overtimeLosses: 0,
            penaltyWins: 0,
            penaltyLosses: 0,
            setsWon: 0,
            setsLost: 0,
        };
        const homeStats = { ...baseStats };
        const awayStats = { ...baseStats };
        homeStats.goalsFor = match.homeScore;
        homeStats.goalsAgainst = match.awayScore;
        awayStats.goalsFor = match.awayScore;
        awayStats.goalsAgainst = match.homeScore;
        const sport = sportName.toLowerCase();
        if (sport.includes('football') ||
            sport.includes('soccer') ||
            sport.includes('handball') ||
            sport.includes('futsal')) {
            this.calculateGeneralRule(match, homeStats, awayStats);
        }
        else if (sport.includes('hockey')) {
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
        return { home: homeStats, away: awayStats };
    }
    calculateGeneralRule(match, home, away) {
        if (match.homeScore > match.awayScore) {
            home.wins = 1;
            home.points = 3;
            away.losses = 1;
        }
        else if (match.awayScore > match.homeScore) {
            away.wins = 1;
            away.points = 3;
            home.losses = 1;
        }
        else {
            home.draws = 1;
            home.points = 1;
            away.draws = 1;
            away.points = 1;
        }
    }
    calculateBasketball(match, home, away) {
        if (match.homeScore > match.awayScore) {
            home.wins = 1;
            home.points = 2;
            away.losses = 1;
            away.points = 1;
        }
        else {
            away.wins = 1;
            away.points = 2;
            home.losses = 1;
            home.points = 1;
        }
    }
    calculateIceHockey(match, home, away) {
        const isOvertime = match.hasOvertime || match.hasPenalties;
        if (match.homeScore > match.awayScore) {
            home.wins = 1;
            home.points = 2;
            away.losses = 1;
            if (isOvertime) {
                home.overtimeWins = 1;
                away.overtimeLosses = 1;
                away.points = 1;
            }
        }
        else {
            away.wins = 1;
            away.points = 2;
            home.losses = 1;
            if (isOvertime) {
                away.overtimeWins = 1;
                home.overtimeLosses = 1;
                home.points = 1;
            }
        }
    }
    calculateVolleyball(match, home, away) {
        home.setsWon = match.homeScore;
        home.setsLost = match.awayScore;
        away.setsWon = match.awayScore;
        away.setsLost = match.homeScore;
        home.goalsFor = 0;
        home.goalsAgainst = 0;
        away.goalsFor = 0;
        away.goalsAgainst = 0;
        if (match.homeScore > match.awayScore) {
            home.wins = 1;
            away.losses = 1;
            if (match.homeScore === 3 && (match.awayScore === 0 || match.awayScore === 1)) {
                home.points = 3;
            }
            else if (match.homeScore === 3 && match.awayScore === 2) {
                home.points = 2;
                away.points = 1;
            }
        }
        else {
            away.wins = 1;
            home.losses = 1;
            if (match.awayScore === 3 && (match.homeScore === 0 || match.homeScore === 1)) {
                away.points = 3;
            }
            else if (match.awayScore === 3 && match.homeScore === 2) {
                away.points = 2;
                home.points = 1;
            }
        }
    }
};
exports.StandingsCalculatorService = StandingsCalculatorService;
exports.StandingsCalculatorService = StandingsCalculatorService = __decorate([
    (0, common_1.Injectable)()
], StandingsCalculatorService);
//# sourceMappingURL=standings-calculator.service.js.map