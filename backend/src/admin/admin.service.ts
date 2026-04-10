import { Injectable, Inject, Logger } from '@nestjs/common';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { matches } from '../db/schema';
import { eq, and, or, gte, lte } from 'drizzle-orm';
import * as schema from '../db/schema';

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
  'Brazil': 'America/Brasilia',
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

  constructor(@Inject('DRIZZLE') private db: NodePgDatabase<typeof schema>) {}

  /**
   * Convert date to local timezone using country timezone or manual offset
   */
  private convertToLocalTimezone(utcDate: Date, timezone?: string): Date {
    if (!timezone) {
      return utcDate;
    }
    this.logger.warn(`Converting date ${utcDate.toISOString()} using timezone: ${timezone}`);
console.log(`Converting date ${utcDate.toISOString()} using timezone: ${timezone}`);
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
      this.logger.warn(`Formatter created for timezone: ${timezone}`);
console.log(`Formatter created for timezone: ${timezone}`);
      // Get the date parts in the target timezone
      const parts = formatter.formatToParts(utcDate);
      const year = parseInt(parts.find(p => p.type === 'year')?.value || '1970');
      const month = parseInt(parts.find(p => p.type === 'month')?.value || '1') - 1;
      const day = parseInt(parts.find(p => p.type === 'day')?.value || '1');
      const hour = parseInt(parts.find(p => p.type === 'hour')?.value || '0');
      const minute = parseInt(parts.find(p => p.type === 'minute')?.value || '0');
      const second = parseInt(parts.find(p => p.type === 'second')?.value || '0');
      this.logger.warn(`Parsed date parts - Year: ${year}, Month: ${month + 1}, Day: ${day}, Hour: ${hour}, Minute: ${minute}, Second: ${second}`);
console.log(`Parsed date parts - Year: ${year}, Month: ${month + 1}, Day: ${day}, Hour: ${hour}, Minute: ${minute}, Second: ${second}`);
      // Create new date with local timezone interpretation
      return new Date(year, month, day, hour, minute, second);
    } catch (error) {
      this.logger.warn(`Failed to convert timezone for ${timezone}, using original date: ${error.message}`);
      console.log(`Failed to convert timezone for ${timezone}, using original date: ${error.message}`);
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
    roundIds?: number[];
    startDate?: string;
    endDate?: string;
    matchId?: number;
  }) {
    let whereCondition = eq(matches.leagueId, filters.leagueId);

    if (filters.seasonId) {
      whereCondition = and(whereCondition, eq(matches.seasonId, filters.seasonId));
    }

    if (filters.roundIds && filters.roundIds.length > 0) {
      // build OR condition for multiple rounds
      let roundCond = eq(matches.roundId, filters.roundIds[0]);
      for (let i = 1; i < filters.roundIds.length; i++) {
        roundCond = or(roundCond, eq(matches.roundId, filters.roundIds[i]));
      }
      whereCondition = and(whereCondition, roundCond);
    } else if (filters.roundId) {
      whereCondition = and(whereCondition, eq(matches.roundId, filters.roundId));
    }

    if (filters.startDate) {
      const startBoundary = new Date(`${filters.startDate}T00:00:00.000Z`);
      const endSource = filters.endDate ?? filters.startDate;
      const endBoundary = new Date(`${endSource}T23:59:59.999Z`);
      whereCondition = and(whereCondition, gte(matches.date, startBoundary), lte(matches.date, endBoundary));
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
    roundIds?: number[];
    startDate?: string;
    endDate?: string;
    matchId?: number;
    adjustmentType: 'country' | 'manual' | 'set';
    manualHours?: number;
    /** HH:MM string when using 'set' */
    setTime?: string;
    setDate?: string;
    countryTimezone?: string;
  }) {
    const startTime = Date.now();
    // this.logger.log(`Starting timezone adjustment for league ${dto.leagueId}` + 
    //   (dto.seasonId ? `, season ${dto.seasonId}` : ' (all seasons)'));

    try {
      // Build query for affected matches
      const whereCondition = this.buildMatchQuery({
        leagueId: dto.leagueId,
        seasonId: dto.seasonId,
        roundId: dto.roundId,
        roundIds: dto.roundIds,
        startDate: dto.startDate,
        endDate: dto.endDate,
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

    //   this.logger.log(`Found ${matchesToUpdate.length} matches to update`);

      let updatedCount = 0;
      const updateIds: number[] = [];
      // track updated match ids

      // Process each match
      for (const match of matchesToUpdate) {
        let newDate: Date;

        if (dto.adjustmentType === 'country' && dto.countryTimezone) {
          // Convert using country timezone
          newDate = this.convertToLocalTimezone(new Date(match.date), dto.countryTimezone);
        } else if (dto.adjustmentType === 'manual' && dto.manualHours !== undefined) {
          // Apply manual hour adjustment (offset)
          newDate = this.applyManualAdjustment(new Date(match.date), dto.manualHours);
        } else if (dto.adjustmentType === 'set' && dto.setTime) {
          // Set explicit hour:minute provided by user (format HH:MM). Optionally, replace the date too.
          const timeStr = String(dto.setTime).trim();
          const m = timeStr.match(/^(\d{1,2}):(\d{2})$/);
          if (!m) {
            continue;
          }
          const hours = parseInt(m[1], 10);
          const minutes = parseInt(m[2], 10);
          if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
            continue;
          }
          if (dto.setDate) {
            // setDate expected format YYYY-MM-DD
            const dateStr = String(dto.setDate).trim();
            const dm = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})$/);
            if (!dm) {
              continue;
            }
            const y = parseInt(dm[1], 10);
            const mo = parseInt(dm[2], 10) - 1;
            const dday = parseInt(dm[3], 10);
            // Construct exact UTC instant for provided date + time
            newDate = new Date(Date.UTC(y, mo, dday, hours, minutes, 0, 0));
          } else {
            // Preserve original date (in UTC) but replace the time
            newDate = new Date(match.date);
            newDate.setUTCHours(hours, minutes, 0, 0);
          }
        } else {
          // this.logger.warn(`Skipping match ${match.id}: invalid adjustment parameters`);
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

        // this.logger.debug(`Updated match ${match.id}: ${match.date} -> ${newDate.toISOString()}`);
      }
      // Do NOT touch the standings table in this operation.
      const standingsRecalculated = 0;

      const executionTime = Date.now() - startTime;
      
    //   this.logger.log(
    //     `Timezone adjustment completed: ${updatedCount} matches updated, ` +
    //     `${standingsRecalculated} standings entries affected in ${executionTime}ms` +
    //     ` (League: ${dto.leagueId}` + (dto.seasonId ? `, Season: ${dto.seasonId}` : ', All seasons') + `)`
    //   );

      return {
        success: true,
        matchesUpdated: updatedCount,
        standingsRecalculated,
        details: {
          adjustmentType: dto.adjustmentType,
          timezone: dto.countryTimezone,
          manualHours: dto.manualHours,
            setTime: dto.setTime,
            setDate: dto.setDate || null,
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