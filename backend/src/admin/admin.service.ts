import { Injectable, Inject, Logger } from '@nestjs/common';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { matches, standings } from '../db/schema';
import { eq, and, inArray } from 'drizzle-orm';
import * as schema from '../db/schema';
import { StandingsService } from '../standings/standings.service';

// Country timezone mappings (same as used in ETL)
const COUNTRY_TIMEZONES: Record<string, string> = {
  // Europe
  'England': 'Europe/London',
  'United Kingdom': 'Europe/London',
  'UK': 'Europe/London',
  'Spain': 'Europe/Madrid',
  'France': 'Europe/Paris',
  'Germany': 'Europe/Berlin',
  'Italy': 'Europe/Rome',
  'Netherlands': 'Europe/Amsterdam',
  'Portugal': 'Europe/Lisbon',
  'Belgium': 'Europe/Brussels',
  'Switzerland': 'Europe/Zurich',
  'Austria': 'Europe/Vienna',
  'Poland': 'Europe/Warsaw',
  'Czech Republic': 'Europe/Prague',
  'Russia': 'Europe/Moscow',
  'Turkey': 'Europe/Istanbul',
  'Greece': 'Europe/Athens',
  'Sweden': 'Europe/Stockholm',
  'Norway': 'Europe/Oslo',
  'Denmark': 'Europe/Copenhagen',
  'Finland': 'Europe/Helsinki',
  'Ukraine': 'Europe/Kiev',
  'Croatia': 'Europe/Zagreb',
  'Serbia': 'Europe/Belgrade',
  'Romania': 'Europe/Bucharest',
  'Bulgaria': 'Europe/Sofia',
  // Americas
  'Brazil': 'America/Sao_Paulo',
  'Argentina': 'America/Argentina/Buenos_Aires',
  'Chile': 'America/Santiago',
  'Colombia': 'America/Bogota',
  'Mexico': 'America/Mexico_City',
  'United States': 'America/New_York',
  'USA': 'America/New_York',
  'Canada': 'America/Toronto',
  'Peru': 'America/Lima',
  'Ecuador': 'America/Guayaquil',
  'Uruguay': 'America/Montevideo',
  'Paraguay': 'America/Asuncion',
  'Bolivia': 'America/La_Paz',
  'Venezuela': 'America/Caracas',
  // Asia
  'Japan': 'Asia/Tokyo',
  'China': 'Asia/Shanghai',
  'South Korea': 'Asia/Seoul',
  'India': 'Asia/Kolkata',
  'Australia': 'Australia/Sydney',
  'Saudi Arabia': 'Asia/Riyadh',
  'UAE': 'Asia/Dubai',
  'Qatar': 'Asia/Qatar',
  'Iran': 'Asia/Tehran',
  'Israel': 'Asia/Jerusalem',
  // Africa
  'South Africa': 'Africa/Johannesburg',
  'Egypt': 'Africa/Cairo',
  'Morocco': 'Africa/Casablanca',
  'Nigeria': 'Africa/Lagos',
  'Algeria': 'Africa/Algiers',
  'Tunisia': 'Africa/Tunis',
};

@Injectable()
export class AdminService {
  private readonly logger = new Logger(AdminService.name);

  constructor(
    @Inject('DRIZZLE') private db: NodePgDatabase<typeof schema>,
    private readonly standingsService: StandingsService,
  ) {}

  /**
   * Convert date to local timezone using country timezone or manual offset
   */
  private convertToLocalTimezone(utcDate: Date, timezone?: string): Date {
    if (!timezone) {
      return utcDate;
    }

    try {
      // Create a formatter for the target timezone
      const formatter = new Intl.DateTimeFormat('en-US', {
        timeZone: timezone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
      });

      // Get the date parts in the target timezone
      const parts = formatter.formatToParts(utcDate);
      const year = parseInt(parts.find(p => p.type === 'year')?.value || '1970');
      const month = parseInt(parts.find(p => p.type === 'month')?.value || '1') - 1;
      const day = parseInt(parts.find(p => p.type === 'day')?.value || '1');
      const hour = parseInt(parts.find(p => p.type === 'hour')?.value || '0');
      const minute = parseInt(parts.find(p => p.type === 'minute')?.value || '0');
      const second = parseInt(parts.find(p => p.type === 'second')?.value || '0');

      // Create new date with local timezone interpretation
      return new Date(year, month, day, hour, minute, second);
    } catch (error) {
      this.logger.warn(`Failed to convert timezone for ${timezone}, using original date: ${error.message}`);
      return utcDate;
    }
  }

  /**
   * Apply manual hour adjustment to date
   */
  private applyManualAdjustment(date: Date, hours: number): Date {
    const adjustedDate = new Date(date);
    adjustedDate.setHours(adjustedDate.getHours() + hours);
    return adjustedDate;
  }

  /**
   * Build match query with filters
   */
  private buildMatchQuery(filters: {
    leagueId: number;
    seasonId?: number;
    roundId?: number;
    matchId?: number;
  }) {
    let whereCondition = eq(matches.leagueId, filters.leagueId);

    if (filters.seasonId) {
      whereCondition = and(whereCondition, eq(matches.seasonId, filters.seasonId));
    }

    if (filters.roundId) {
      whereCondition = and(whereCondition, eq(matches.roundId, filters.roundId));
    }

    if (filters.matchId) {
      whereCondition = and(whereCondition, eq(matches.id, filters.matchId));
    }

    return whereCondition;
  }

  async performTimezoneAdjustment(dto: {
    leagueId: number;
    seasonId?: number;
    roundId?: number;
    matchId?: number;
    adjustmentType: 'country' | 'manual';
    manualHours?: number;
    countryTimezone?: string;
  }) {
    const startTime = Date.now();
    this.logger.log(`Starting timezone adjustment for league ${dto.leagueId}` + 
      (dto.seasonId ? `, season ${dto.seasonId}` : ' (all seasons)'));

    try {
      // Build query for affected matches
      const whereCondition = this.buildMatchQuery({
        leagueId: dto.leagueId,
        seasonId: dto.seasonId,
        roundId: dto.roundId,
        matchId: dto.matchId
      });

      // Fetch matches that need timezone adjustment
      const matchesToUpdate = await this.db
        .select()
        .from(matches)
        .where(whereCondition);

      if (matchesToUpdate.length === 0) {
        return {
          success: true,
          matchesUpdated: 0,
          standingsRecalculated: 0,
          message: 'No matches found to update'
        };
      }

      this.logger.log(`Found ${matchesToUpdate.length} matches to update`);

      let updatedCount = 0;
      const updateIds: number[] = [];
      const updateDateMap: Record<number, Date> = {};

      // Process each match
      for (const match of matchesToUpdate) {
        let newDate: Date;

        if (dto.adjustmentType === 'country' && dto.countryTimezone) {
          // Convert using country timezone
          newDate = this.convertToLocalTimezone(new Date(match.date), dto.countryTimezone);
        } else if (dto.adjustmentType === 'manual' && dto.manualHours !== undefined) {
          // Apply manual hour adjustment
          newDate = this.applyManualAdjustment(new Date(match.date), dto.manualHours);
        } else {
          this.logger.warn(`Skipping match ${match.id}: invalid adjustment parameters`);
          continue;
        }

        // Update match date
        await this.db
          .update(matches)
          .set({ 
            date: newDate,
            updatedAt: new Date()
          })
          .where(eq(matches.id, match.id));

        updatedCount++;
        updateIds.push(match.id);
        updateDateMap[match.id] = newDate;

        this.logger.debug(`Updated match ${match.id}: ${match.date} -> ${newDate.toISOString()}`);
      }

      // Update standings rows for affected matches (set match_date to new match date)
      let standingsRecalculated = 0;
      if (updatedCount > 0 && updateIds.length > 0) {
        try {
          for (const m of matchesToUpdate) {
            if (!updateDateMap[m.id]) continue;
            const newMatchDate = updateDateMap[m.id];

            // Inspect existing standings rows for this matchId (for debugging)
            const existingStandings = await this.db
              .select()
              .from(standings)
              .where(eq(standings.matchId, m.id));
            this.logger.log(`Match ${m.id}: found ${existingStandings.length} standings rows with matchId` +
              (existingStandings.length ? ` (ids: ${existingStandings.map(s => s.id).join(',')})` : ''));

            // First try to update standings rows that have matchId set
            let result = await this.db
              .update(standings)
              .set({ matchDate: newMatchDate, updatedAt: new Date() })
              .where(eq(standings.matchId, m.id))
              .returning();

            standingsRecalculated += result.length;

            // If no rows were updated via matchId, fall back to updating by round/season and clubId (home/away)
            if (result.length === 0) {
              const clubIds = [m.homeClubId, m.awayClubId].filter(Boolean);
              if (clubIds.length > 0 && m.roundId && m.seasonId) {
                // Debug: inspect potential fallback rows before updating
                const potential = await this.db
                  .select()
                  .from(standings)
                  .where(
                    and(
                      eq(standings.roundId, m.roundId),
                      eq(standings.seasonId, m.seasonId),
                      inArray(standings.clubId, clubIds)
                    )
                  );
                this.logger.log(`Match ${m.id}: fallback select found ${potential.length} rows for round ${m.roundId}, season ${m.seasonId}, clubs ${clubIds.join(',')}` +
                  (potential.length ? ` (ids: ${potential.map(p => p.id).join(',')})` : ''));

                const fallback = await this.db
                  .update(standings)
                  .set({ matchDate: newMatchDate, updatedAt: new Date() })
                  .where(
                    and(
                      eq(standings.roundId, m.roundId),
                      eq(standings.seasonId, m.seasonId),
                      inArray(standings.clubId, clubIds)
                    )
                  )
                  .returning();

                standingsRecalculated += fallback.length;
              }

              // If still no standings rows were found/updated, create them using StandingsService
              if (standingsRecalculated === 0) {
                try {
                  this.logger.log(`Match ${m.id}: no existing standings found, creating standings rows via StandingsService.create()`);
                  const createDto = {
                    sportId: m.sportId,
                    leagueId: m.leagueId,
                    seasonId: m.seasonId,
                    roundId: m.roundId,
                    matchDate: newMatchDate.toISOString(),
                    groupId: m.groupId ?? null,
                    homeClubId: m.homeClubId,
                    awayClubId: m.awayClubId,
                    matchId: m.id,
                    matchDivisions: [],
                    homeScore: m.homeScore ?? null,
                    awayScore: m.awayScore ?? null,
                  } as any;

                  const created = await this.standingsService.create(createDto);
                  // created.home/away contain returned rows
                  const createdCount = (created.home?.length ?? 0) + (created.away?.length ?? 0);
                  standingsRecalculated += createdCount;
                  this.logger.log(`Match ${m.id}: created ${createdCount} standings rows`);
                } catch (err) {
                  this.logger.error(`Match ${m.id}: failed to create standings rows: ${err.message}`);
                }
              }
            }
          }
        } catch (error) {
          this.logger.error(`Failed to update standings for updated matches: ${error.message}`);
        }
      }

      const executionTime = Date.now() - startTime;
      
      this.logger.log(
        `Timezone adjustment completed: ${updatedCount} matches updated, ` +
        `${standingsRecalculated} standings entries affected in ${executionTime}ms` +
        ` (League: ${dto.leagueId}` + (dto.seasonId ? `, Season: ${dto.seasonId}` : ', All seasons') + `)`
      );

      return {
        success: true,
        matchesUpdated: updatedCount,
        standingsRecalculated,
        details: {
          adjustmentType: dto.adjustmentType,
          timezone: dto.countryTimezone,
          manualHours: dto.manualHours,
          executionTimeMs: executionTime,
          updatedMatchIds: updateIds
        }
      };

    } catch (error) {
      const executionTime = Date.now() - startTime;
      this.logger.error(`Timezone adjustment failed after ${executionTime}ms: ${error.message}`, error.stack);
      
      throw new Error(`Database operation failed: ${error.message}`);
    }
  }
}