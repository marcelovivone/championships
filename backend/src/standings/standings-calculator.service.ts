import { Injectable } from '@nestjs/common';

export type OperationType = 'push' | 'delete';

export interface StandingStats {
    points: number;
    played: number;
    wins: number;
    draws: number;
    losses: number;
    goalsFor: number;
    goalsAgainst: number;
    homeGamesPlayed: number;
    awayGamesPlayed: number;
    homeWins: number;
    homeLosses: number;
    homeDraws: number;
    awayWins: number;
    awayLosses: number;
    awayDraws: number;
    overtimeWins: number;
    overtimeLosses: number;
    penaltyWins: number;
    penaltyLosses: number;
    setsWon: number;
    setsLost: number;
}

@Injectable()
export class StandingsCalculatorService {
            // NOTE: Currently, the delete logic is not used in the standings service. Only row deletion is performed.
        /**
         * Update standings stats for a club based on previous stats and a new match.
         * @param prevStats Previous standings row for the club
         * @param matchData Data for the new match (scores, etc.)
         * @param operation 'push' to add, 'delete' to remove
         */
//     calculateUpdate(
//         prevStats: StandingStats,
//         matchData: { homeScore: number; awayScore: number; /* add more fields as needed */ },
//         operation: OperationType
//     ): StandingStats {
//         // Clone previous stats
//         const newStats: StandingStats = { ...prevStats };
// console.log("CalculateUpdate");
//         // Helper: +1 for push, -1 for delete
//         const delta = operation === 'push' ? 1 : -1;

//         // Simple update of matches played
//         newStats.played += delta;

//         // Points and Wins/losses/draws logic
//         if (matchData.homeScore > matchData.awayScore) {
//             newStats.points += delta * 3;
//             newStats.wins += delta;
//         } else if (matchData.homeScore < matchData.awayScore) {
//             newStats.losses += delta;
//         } else {
//             newStats.points += delta * 1;
//             newStats.draws += delta;
//         }

//         // Goals logic
//         newStats.goalsFor += delta * matchData.homeScore;
//         newStats.goalsAgainst += delta * matchData.awayScore;

//         // Add similar logic for other fields...

//         return newStats;
//     }
    /**
     * Calculate standings statistics based on sport rules
     */
    calculate(sportName: string, match: any): { home: StandingStats; away: StandingStats } {
        const baseStats: StandingStats = {
            points: 0,
            played: 0,
            wins: 0,
            draws: 0,
            losses: 0,
            goalsFor: 0,
            goalsAgainst: 0,
            homeGamesPlayed: 0,
            awayGamesPlayed: 0,
            homeWins: 0,
            homeLosses: 0,
            homeDraws: 0,
            awayWins: 0,
            awayLosses: 0,
            awayDraws: 0,
            overtimeWins: 0,
            overtimeLosses: 0,
            penaltyWins: 0,
            penaltyLosses: 0,
            setsWon: 0,
            setsLost: 0,
        };

        const homeStats: StandingStats = { ...baseStats };
        const awayStats: StandingStats = { ...baseStats };
        // matchDivisions is now available for use in calculation logic

        // Set games played based on the presence of scores (assuming a match with scores means both teams played)
        homeStats.played += 1;
        homeStats.homeGamesPlayed += 1;
        awayStats.played += 1;
        awayStats.awayGamesPlayed += 1;

        // Basic score assignment (Goals/Points/Sets depending on sport)
        homeStats.goalsFor = match.homeScore;
        homeStats.goalsAgainst = match.awayScore;
        awayStats.goalsFor = match.awayScore;
        awayStats.goalsAgainst = match.homeScore;

        const sport = sportName.toLowerCase();

        if (
            sport.includes('football') ||
            sport.includes('handball') ||
            sport.includes('futsal')
        ) {
            this.calculateGeneralRule(match, homeStats, awayStats);
        } else if (sport.includes('ice hockey')) {
            this.calculateIceHockey(match, homeStats, awayStats);
        } else if (sport.includes('basketball')) {
            this.calculateBasketball(match, homeStats, awayStats);
        } else if (sport.includes('volleyball')) {
            this.calculateVolleyball(match, homeStats, awayStats);
        } else {
            // Default to general rule
            this.calculateGeneralRule(match, homeStats, awayStats);
        }

        // Division-level stats calculation (if matchDivisions are provided)
        const matchDivisions = match.matchDivisions || [];
        if (matchDivisions.length > 0) {
            matchDivisions.forEach((division: any) => {
                // Count overtime results: sentinel id -10 or explicit divisionType 'OVERTIME'
                if ((division.id === -10 || division.divisionType === 'OVERTIME') && division.homeScore != null) {
                    if (division.homeScore > division.awayScore) {
                        homeStats.overtimeWins += 1;
                        awayStats.overtimeLosses += 1;
                    } else if (division.homeScore < division.awayScore) {
                        homeStats.overtimeLosses += 1;
                        awayStats.overtimeWins += 1;
                    }
                }

                // Count penalties results: sentinel id -11 or explicit divisionType 'PENALTIES'
                if ((division.id === -11 || division.divisionType === 'PENALTIES') && division.homeScore != null) {
                    if (division.homeScore > division.awayScore) {
                        homeStats.penaltyWins += 1;
                        awayStats.penaltyLosses += 1;
                    } else if (division.homeScore < division.awayScore) {
                        homeStats.penaltyLosses += 1;
                        awayStats.penaltyWins += 1;
                    }
                }

                // Example: For volleyball, we might want to sum up sets won/lost across divisions
                // if (sport.includes('volleyball')) {
                //     homeStats.setsWon += division.homeSetsWon || 0;
                //     homeStats.setsLost += division.homeSetsLost || 0;
                //     awayStats.setsWon += division.awaySetsWon || 0;
                //     awayStats.setsLost += division.awaySetsLost || 0;
                // }
                // Add similar logic for other sports and relevant stats
            });
        }

        return { home: homeStats, away: awayStats };
    }
    
    private calculateGeneralRule(match: any, home: StandingStats, away: StandingStats) {
        if (match.homeScore > match.awayScore) {
            home.points = 3;
            home.wins = 1;
            home.homeWins = 1;
            away.losses = 1;
            away.awayLosses = 1;
        } else if (match.homeScore < match.awayScore) {
            home.losses = 1;
            home.homeLosses = 1;
            away.points = 3;
            away.wins = 1;
            away.awayWins = 1;
        } else {
            home.points = 1;
            away.points = 1;
            home.draws = 1;
            home.homeDraws = 1;
            away.draws = 1;
            away.awayDraws = 1;
        }
    }
    private calculateIceHockey(match: any, home: StandingStats, away: StandingStats) {
        if (match.homeScore > match.awayScore) {
            home.points = 2;
            home.wins = 1;
            home.homeWins = 1;
            away.losses = 1;
            away.awayLosses = 1;
        } else if (match.homeScore < match.awayScore) {
            home.losses = 1;
            home.homeLosses = 1;
            away.points = 2;
            away.wins = 1;
            away.awayWins = 1;
        }
    }   
    private calculateBasketball(match: any, home: StandingStats, away: StandingStats) {
        if (match.homeScore > match.awayScore) {
            home.points = 2;
            home.wins = 1;
            home.homeWins = 1;
            away.losses = 1;
            away.awayLosses = 1;
        } else {
            home.losses = 1;
            home.homeLosses = 1;
            away.points = 2;
            away.wins = 1;
            away.awayWins = 1;
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
            home.homeWins = 1;
            away.losses = 1;
            away.awayLosses = 1;
            if (match.homeScore === 3 && (match.awayScore === 0 || match.awayScore === 1)) {
                home.points = 3;
            } else if (match.homeScore === 3 && match.awayScore === 2) {
                home.points = 2;
                away.points = 1;
            }
        } else {
            away.wins = 1;
            away.awayWins = 1;
            home.losses = 1;
            home.homeLosses = 1;
            if (match.awayScore === 3 && (match.homeScore === 0 || match.homeScore === 1)) {
                away.points = 3;
            } else if (match.awayScore === 3 && match.homeScore === 2) {
                away.points = 2;
                home.points = 1;
            }
        }
    }
}