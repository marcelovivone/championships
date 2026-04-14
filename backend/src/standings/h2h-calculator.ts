import { Injectable, Inject } from '@nestjs/common';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from '../db/schema';
import { matches, matchDivisions } from '../db/schema';
import { eq, and, inArray, lte, asc } from 'drizzle-orm';

export interface H2HStats {
  points: number;
  wins: number;
  played: number;
  gf: number;
  ga: number;
  awayGf: number;
  pointDiff: number; // For basketball: total points for minus total points against
  winPct: number;
}

/** Point system allocation constants */
const POINT_SYSTEMS: Record<string, { winHome: number; winAway: number; draw: number; otl: number }> = {
  FOOTBALL_3_1_0:     { winHome: 3, winAway: 3, draw: 1, otl: 0 },
  HOCKEY_2_0_OTL:     { winHome: 2, winAway: 2, draw: 0, otl: 1 },
  HOCKEY_3_2_1_0:     { winHome: 3, winAway: 3, draw: 0, otl: 1 },
  BASKETBALL_W_L:     { winHome: 1, winAway: 1, draw: 0, otl: 0 },
  VOLLEYBALL_3_2_1_0: { winHome: 3, winAway: 3, draw: 0, otl: 0 },
  HANDBALL_2_1_0:     { winHome: 2, winAway: 2, draw: 1, otl: 0 },
};

@Injectable()
export class H2HCalculator {
  constructor(@Inject('DRIZZLE') private db: NodePgDatabase<typeof schema>) {}

  /**
   * Calculate H2H mini-standings for a group of tied clubs.
   */
  async calculate(
    clubIds: number[],
    seasonId: number,
    leagueId: number,
    maxRoundId: number | null,
    maxDate: Date | null,
    pointSystem: string = 'FOOTBALL_3_1_0',
  ): Promise<Record<number, H2HStats>> {
    if (clubIds.length < 2) {
      const stats: Record<number, H2HStats> = {};
      for (const id of clubIds) {
        stats[id] = { points: 0, wins: 0, played: 0, gf: 0, ga: 0, awayGf: 0, pointDiff: 0, winPct: 0 };
      }
      return stats;
    }

    // Fetch mutual matches: both home and away must be in the tied set
    let query = this.db
      .select()
      .from(matches)
      .where(
        and(
          eq(matches.seasonId, seasonId),
          eq(matches.leagueId, leagueId),
          eq(matches.status, 'Finished'),
          inArray(matches.homeClubId, clubIds),
          inArray(matches.awayClubId, clubIds),
          maxDate ? lte(matches.date, maxDate) : undefined,
        ),
      );

    const mutualMatches = await query;

    // Initialize stats
    const stats: Record<number, H2HStats> = {};
    for (const id of clubIds) {
      stats[id] = { points: 0, wins: 0, played: 0, gf: 0, ga: 0, awayGf: 0, pointDiff: 0, winPct: 0 };
    }

    const ps = POINT_SYSTEMS[pointSystem] || POINT_SYSTEMS['FOOTBALL_3_1_0'];

    for (const m of mutualMatches) {
      const hId = m.homeClubId;
      const aId = m.awayClubId;
      const hs = m.homeScore ?? 0;
      const as_ = m.awayScore ?? 0;

      // Only count if both teams are in the tied group (inArray should handle this, but be safe)
      if (!stats[hId] || !stats[aId]) continue;

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
        // Check if loser gets OTL point (ice hockey)
        if (ps.otl > 0) {
          // Need to check if this was an OT/SO game
          const divisions = await this.db
            .select()
            .from(matchDivisions)
            .where(eq(matchDivisions.matchId, m.id))
            .orderBy(asc(matchDivisions.divisionNumber));

          const hasOTOrSO = divisions.some(
            d => d.divisionType === 'OVERTIME' || d.divisionType === 'PENALTIES' || d.id === -10 || d.id === -11,
          );
          if (hasOTOrSO) {
            stats[aId].points += ps.otl;
          }
        }
      } else if (as_ > hs) {
        stats[aId].wins++;
        stats[aId].points += ps.winAway;
        if (ps.otl > 0) {
          const divisions = await this.db
            .select()
            .from(matchDivisions)
            .where(eq(matchDivisions.matchId, m.id))
            .orderBy(asc(matchDivisions.divisionNumber));

          const hasOTOrSO = divisions.some(
            d => d.divisionType === 'OVERTIME' || d.divisionType === 'PENALTIES' || d.id === -10 || d.id === -11,
          );
          if (hasOTOrSO) {
            stats[hId].points += ps.otl;
          }
        }
      } else {
        // Draw
        stats[hId].points += ps.draw;
        stats[aId].points += ps.draw;
      }
    }

    // Compute win percentages
    for (const id of clubIds) {
      stats[id].winPct = stats[id].played > 0 ? stats[id].wins / stats[id].played : 0;
    }

    return stats;
  }
}
