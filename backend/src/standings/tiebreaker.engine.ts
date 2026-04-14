import { Injectable } from '@nestjs/common';
import { H2HCalculator, H2HStats } from './h2h-calculator';

/** A single tiebreaker criterion from standing_order_rules */
export interface TiebreakerCriterion {
  sortOrder: number;
  criterion: string;
  direction: string; // 'DESC' | 'ASC'
}

/**
 * TiebreakerEngine — recursive group-and-split sort using an ordered criteria list.
 *
 * This replaces the hard-coded compareStandingRows() with a configurable
 * criteria-driven approach that supports all sports.
 */
@Injectable()
export class TiebreakerEngine {
  constructor(private readonly h2hCalculator: H2HCalculator) {}

  /**
   * Sort standing rows using the provided ordered criteria.
   * Returns a new array sorted by the criteria sequence.
   *
   * @param rows         Standing rows to sort (all from the same league/season/round)
   * @param criteria     Ordered list of tiebreaker criteria
   * @param seasonId     Season ID (for H2H match queries)
   * @param leagueId     League ID (for H2H match queries)
   * @param maxDate      Maximum match date to consider (for mid-season standings)
   * @param pointSystem  Point system ID for H2H mini-standings
   */
  async sort(
    rows: any[],
    criteria: TiebreakerCriterion[],
    seasonId: number,
    leagueId: number,
    maxDate: Date | null,
    pointSystem: string = 'FOOTBALL_3_1_0',
  ): Promise<any[]> {
    if (rows.length <= 1 || criteria.length === 0) return rows;

    const [first, ...rest] = criteria;

    // Check if this is an H2H criterion
    const isH2H = first.criterion.startsWith('H2H_');

    let groups: any[][];

    if (isH2H) {
      groups = await this.groupByH2H(rows, first, seasonId, leagueId, maxDate, pointSystem);
    } else {
      groups = this.groupByOverallStat(rows, first);
    }

    const sorted: any[] = [];

    for (const group of groups) {
      if (group.length === 1) {
        sorted.push(group[0]);
      } else {
        // Still tied — recurse with remaining criteria
        if (isH2H && rest.length > 0) {
          // After partial H2H resolution, the remaining sub-groups restart from the full criteria
          // This implements the "restart on partial H2H" behavior from the design doc
          // For now, continue with remaining criteria (simpler, works for most cases)
          sorted.push(...(await this.sort(group, rest, seasonId, leagueId, maxDate, pointSystem)));
        } else {
          sorted.push(...(await this.sort(group, rest, seasonId, leagueId, maxDate, pointSystem)));
        }
      }
    }

    return sorted;
  }

  /**
   * Group rows by an overall standing stat value.
   * Returns groups ordered by the criterion's direction.
   */
  private groupByOverallStat(rows: any[], criterion: TiebreakerCriterion): any[][] {
    const getValue = (row: any): number => this.getStatValue(row, criterion.criterion);

    const sorted = [...rows].sort((a, b) => {
      const diff = getValue(a) - getValue(b);
      return criterion.direction === 'DESC' ? -diff : diff;
    });

    return this.splitIntoGroups(sorted, getValue);
  }

  /**
   * Group rows by H2H criterion value.
   * Computes H2H mini-standings between the tied clubs, then groups by the relevant H2H stat.
   */
  private async groupByH2H(
    rows: any[],
    criterion: TiebreakerCriterion,
    seasonId: number,
    leagueId: number,
    maxDate: Date | null,
    pointSystem: string,
  ): Promise<any[][]> {
    const clubIds = rows.map(r => r.clubId);
    const h2hStats = await this.h2hCalculator.calculate(
      clubIds,
      seasonId,
      leagueId,
      null,
      maxDate,
      pointSystem,
    );

    const getH2HValue = (row: any): number => {
      const s = h2hStats[row.clubId];
      if (!s) return 0;

      switch (criterion.criterion) {
        case 'H2H_POINTS':            return s.points;
        case 'H2H_WINS':              return s.wins;
        case 'H2H_WIN_PCT':           return s.winPct;
        case 'H2H_GOAL_DIFFERENCE':   return s.gf - s.ga;
        case 'H2H_GOALS_FOR':         return s.gf;
        case 'H2H_AWAY_GOALS':        return s.awayGf;
        case 'H2H_POINT_DIFFERENCE':  return s.pointDiff;
        default:                       return 0;
      }
    };

    const sorted = [...rows].sort((a, b) => {
      const diff = getH2HValue(a) - getH2HValue(b);
      return criterion.direction === 'DESC' ? -diff : diff;
    });

    return this.splitIntoGroups(sorted, getH2HValue);
  }

  /**
   * Split a sorted array into groups of equal values.
   */
  private splitIntoGroups(sorted: any[], getValue: (row: any) => number): any[][] {
    if (sorted.length === 0) return [];

    const groups: any[][] = [];
    let current = [sorted[0]];

    for (let i = 1; i < sorted.length; i++) {
      if (getValue(sorted[i]) === getValue(current[0])) {
        current.push(sorted[i]);
      } else {
        groups.push(current);
        current = [sorted[i]];
      }
    }
    groups.push(current);
    return groups;
  }

  /**
   * Resolve a criterion ID to the corresponding numeric value from a standing row.
   */
  private getStatValue(row: any, criterion: string): number {
    switch (criterion) {
      case 'POINTS':              return Number(row.points ?? 0);
      case 'WINS':                return Number(row.wins ?? 0);
      case 'WIN_PCT':             return row.played > 0 ? Number(row.wins ?? 0) / Number(row.played) : 0;
      case 'GOAL_DIFFERENCE':     return Number(row.goalsFor ?? 0) - Number(row.goalsAgainst ?? 0);
      case 'GOALS_FOR':           return Number(row.goalsFor ?? 0);
      case 'GOALS_AGAINST':       return Number(row.goalsAgainst ?? 0);
      case 'AWAY_GOALS_FOR':      return Number(row.awayGoalsFor ?? 0);
      case 'GAMES_PLAYED':        return Number(row.played ?? 0);
      case 'REGULATION_WINS':     return Number(row.regulationWins ?? 0);
      case 'REGULATION_OT_WINS':  return Number(row.regulationOtWins ?? 0);
      case 'OT_WINS':             return Number(row.overtimeWins ?? 0);
      case 'PENALTY_WINS':        return Number(row.penaltyWins ?? 0);
      case 'SET_RATIO':           return Number(row.setsLost ?? 0) > 0 ? Number(row.setsWon ?? 0) / Number(row.setsLost) : Number(row.setsWon ?? 0);
      case 'POINT_RATIO':         return Number(row.goalsAgainst ?? 0) > 0 ? Number(row.goalsFor ?? 0) / Number(row.goalsAgainst) : Number(row.goalsFor ?? 0);
      case 'NET_POINTS':          return Number(row.goalsFor ?? 0) - Number(row.goalsAgainst ?? 0);
      case 'CLUB_ID':             return Number(row.clubId ?? 0);
      default:                    return 0;
    }
  }
}
