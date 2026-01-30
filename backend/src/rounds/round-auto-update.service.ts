import { Injectable, Inject, Logger } from '@nestjs/common';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { eq, and, lte, gte, or, sql } from 'drizzle-orm';
import * as schema from '../db/schema';
import { leagues, seasons, rounds } from '../db/schema';

@Injectable()
export class RoundAutoUpdateService {
  private readonly logger = new Logger(RoundAutoUpdateService.name);

  constructor(
    @Inject('DRIZZLE')
    private db: NodePgDatabase<typeof schema>,
  ) {}

  /**
   * Auto-update current rounds for leagues with flg_round_automatic = true
   * This runs asynchronously without blocking the login process
   */
  async autoUpdateCurrentRounds(): Promise<void> {
    try {
      this.logger.log('Starting automatic round update check');
      const currentDate = new Date();

      // Get all leagues with flg_round_automatic = true
      const autoLeagues = await this.db
        .select()
        .from(leagues)
        .where(eq(leagues.flgRoundAutomatic, true));

      this.logger.log(`Found ${autoLeagues.length} leagues with auto-update enabled`);

      for (const league of autoLeagues) {
        try {
          // Find the default season for this league
          const defaultSeasons = await this.db
            .select()
            .from(seasons)
            .where(
              and(
                eq(seasons.leagueId, league.id),
                eq(seasons.flgDefault, true)
              )
            );

          if (defaultSeasons.length === 0) {
            this.logger.debug(`No default season found for league ${league.originalName}`);
            continue;
          }

          const defaultSeason = defaultSeasons[0];

          // Find the current round for this season
          const currentRounds = await this.db
            .select()
            .from(rounds)
            .where(
              and(
                eq(rounds.seasonId, defaultSeason.id),
                eq(rounds.flgCurrent, true)
              )
            );

          const currentRound = currentRounds.length > 0 ? currentRounds[0] : null;

          // Check if we need to update the current round
          const needsUpdate = this.shouldUpdateCurrentRound(currentRound, currentDate);

          if (!needsUpdate) {
            this.logger.debug(`Current round for league ${league.originalName} is up to date`);
            continue;
          }

          // Find the next appropriate round
          const allRounds = await this.db
            .select()
            .from(rounds)
            .where(eq(rounds.seasonId, defaultSeason.id))
            .orderBy(rounds.roundNumber);

          const nextRound = this.findNextAppropriateRound(allRounds, currentDate);

          if (nextRound && (!currentRound || nextRound.id !== currentRound.id)) {
            this.logger.log(
              `Updating current round for league ${league.originalName} from round ${currentRound?.roundNumber || 'none'} to round ${nextRound.roundNumber}`
            );

            // Unset all current flags for this season
            await this.db
              .update(rounds)
              .set({ flgCurrent: false })
              .where(eq(rounds.seasonId, defaultSeason.id));

            // Set the new current round
            await this.db
              .update(rounds)
              .set({ flgCurrent: true })
              .where(eq(rounds.id, nextRound.id));

            this.logger.log(`Successfully updated current round for league ${league.originalName}`);
          }
        } catch (error) {
          this.logger.error(`Error updating rounds for league ${league.originalName}:`, error);
          // Continue with other leagues even if one fails
        }
      }

      this.logger.log('Completed automatic round update check');
    } catch (error) {
      this.logger.error('Error in automatic round update:', error);
    }
  }

  /**
   * Check if current round needs to be updated
   */
  private shouldUpdateCurrentRound(currentRound: any, currentDate: Date): boolean {
    if (!currentRound) {
      return true; // No current round set, needs update
    }

    // If dates are not set, don't auto-update
    if (!currentRound.startDate || !currentRound.endDate) {
      return false;
    }

    const startDate = new Date(currentRound.startDate);
    const endDate = new Date(currentRound.endDate);

    // Check if current date is within the round's date range
    return currentDate < startDate || currentDate > endDate;
  }

  /**
   * Find the next appropriate round based on current date
   */
  private findNextAppropriateRound(allRounds: any[], currentDate: Date): any | null {
    const tomorrow = new Date(currentDate);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);

    // First, try to find a round that covers the current date
    for (const round of allRounds) {
      if (round.startDate && round.endDate) {
        const startDate = new Date(round.startDate);
        const endDate = new Date(round.endDate);

        if (currentDate >= startDate && currentDate <= endDate) {
          return round;
        }
      }
    }

    // If no round covers current date, find a round that starts tomorrow
    for (const round of allRounds) {
      if (round.startDate) {
        const startDate = new Date(round.startDate);
        startDate.setHours(0, 0, 0, 0);

        if (startDate.getTime() === tomorrow.getTime()) {
          return round;
        }
      }
    }

    // If no match found, return the first round without dates or the first round overall
    const roundsWithoutDates = allRounds.filter(r => !r.startDate && !r.endDate);
    if (roundsWithoutDates.length > 0) {
      return roundsWithoutDates[0];
    }

    return allRounds.length > 0 ? allRounds[0] : null;
  }
}
