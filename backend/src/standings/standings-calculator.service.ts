import { Injectable } from '@nestjs/common';

export interface StandingStats {
  points: number;
  played: number;
  wins: number;
  draws: number;
  losses: number;
  goalsFor: number;
  goalsAgainst: number;
  overtimeWins: number;
  overtimeLosses: number;
  penaltyWins: number;
  penaltyLosses: number;
  setsWon: number;
  setsLost: number;
}

@Injectable()
export class StandingsCalculatorService {
  /**
   * Calculate standings statistics based on sport rules
   */
  calculate(sportName: string, match: any): { home: StandingStats; away: StandingStats } {
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

    // Basic score assignment (Goals/Points/Sets depending on sport)
    homeStats.goalsFor = match.homeScore;
    homeStats.goalsAgainst = match.awayScore;
    awayStats.goalsFor = match.awayScore;
    awayStats.goalsAgainst = match.homeScore;

    const sport = sportName.toLowerCase();

    if (
      sport.includes('football') ||
      sport.includes('soccer') ||
      sport.includes('handball') ||
      sport.includes('futsal')
    ) {
      this.calculateGeneralRule(match, homeStats, awayStats);
    } else if (sport.includes('hockey')) {
      this.calculateIceHockey(match, homeStats, awayStats);
    } else if (sport.includes('basketball')) {
      this.calculateBasketball(match, homeStats, awayStats);
    } else if (sport.includes('volleyball')) {
      this.calculateVolleyball(match, homeStats, awayStats);
    } else {
      // Default to general rule
      this.calculateGeneralRule(match, homeStats, awayStats);
    }

    return { home: homeStats, away: awayStats };
  }

  private calculateGeneralRule(match: any, home: StandingStats, away: StandingStats) {
    if (match.homeScore > match.awayScore) {
      home.wins = 1;
      home.points = 3;
      away.losses = 1;
    } else if (match.awayScore > match.homeScore) {
      away.wins = 1;
      away.points = 3;
      home.losses = 1;
    } else {
      home.draws = 1;
      home.points = 1;
      away.draws = 1;
      away.points = 1;
    }
  }

  private calculateBasketball(match: any, home: StandingStats, away: StandingStats) {
    if (match.homeScore > match.awayScore) {
      home.wins = 1;
      home.points = 2;
      away.losses = 1;
      away.points = 1;
    } else {
      away.wins = 1;
      away.points = 2;
      home.losses = 1;
      home.points = 1;
    }
  }

  private calculateIceHockey(match: any, home: StandingStats, away: StandingStats) {
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
    } else {
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

  private calculateVolleyball(match: any, home: StandingStats, away: StandingStats) {
    // In volleyball, match.homeScore represents Sets Won
    home.setsWon = match.homeScore;
    home.setsLost = match.awayScore;
    away.setsWon = match.awayScore;
    away.setsLost = match.homeScore;

    // Reset goals (points) for standings table as we don't have total points here
    // Real points would come from summing up match_divisions
    home.goalsFor = 0;
    home.goalsAgainst = 0;
    away.goalsFor = 0;
    away.goalsAgainst = 0;

    if (match.homeScore > match.awayScore) {
      home.wins = 1;
      away.losses = 1;
      if (match.homeScore === 3 && (match.awayScore === 0 || match.awayScore === 1)) {
        home.points = 3;
      } else if (match.homeScore === 3 && match.awayScore === 2) {
        home.points = 2;
        away.points = 1;
      }
    } else {
      away.wins = 1;
      home.losses = 1;
      if (match.awayScore === 3 && (match.homeScore === 0 || match.homeScore === 1)) {
        away.points = 3;
      } else if (match.awayScore === 3 && match.homeScore === 2) {
        away.points = 2;
        home.points = 1;
      }
    }
  }
}