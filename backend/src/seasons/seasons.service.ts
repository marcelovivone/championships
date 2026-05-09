import { Injectable, Inject, NotFoundException, BadRequestException } from '@nestjs/common';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { eq, and, sql, asc, desc, inArray } from 'drizzle-orm';
import * as schema from '../db/schema';
import { seasons, leagues, sports, seasonEspnExtractionConfigs } from '../db/schema';
import { CreateSeasonDto, UpdateSeasonDto } from '../common/dtos';

export type CurrentSeasonEspnExtractionSettingsRow = {
  seasonId: number;
  sportId: number;
  leagueId: number;
  sportName: string | null;
  leagueName: string;
  seasonLabel: string;
  seasonStatus: string;
  isSeasonDefault: boolean;
  isLeagueDefault: boolean;
  externalLeagueCode: string;
  startDate: string;
  endDate: string;
  sameYears: boolean;
  hasPostseason: boolean;
  scheduleType: 'Round' | 'Date';
  hasGroups: boolean;
  numberOfGroups: number;
  hasDivisions: boolean;
  runInBackground: boolean;
  inferClubs: boolean;
  isConfigured: boolean;
};

export type CurrentSeasonEspnExtractionSettingsResponse = {
  header: {
    startDate: string | null;
    endDate: string | null;
  };
  rows: CurrentSeasonEspnExtractionSettingsRow[];
};

type InferredEspnLeagueCodeCandidate = {
  season: number;
  leagueCode: string;
  leagueName: string | null;
};

@Injectable()
export class SeasonsService {
  constructor(
    @Inject('DRIZZLE')
    private db: NodePgDatabase<typeof schema>,
  ) {}

  /**
   * Get all seasons with pagination
   */
  async findAllPaginated(page: number, limit: number, sortBy: string, sortOrder: 'asc' | 'desc') {
    const offset = (page - 1) * limit;

    // Define sortable columns for seasons - including related fields
    const sortableColumns = ['startYear', 'endYear', 'status', 'flgDefault', 'createdAt', 'sportName', 'leagueName'];
    const orderByField = sortableColumns.includes(sortBy) ? sortBy : 'startYear';
    const order = sortOrder === 'desc' ? desc : asc;

    try {
      // Determine the sort column - handle related fields properly
      let orderByClause: any;
      switch (orderByField) {
        case 'sportName':
          orderByClause = order(sports.name);
          break;
        case 'leagueName':
          orderByClause = order(leagues.secondaryName);
          break;
        case 'endYear':
          orderByClause = order(seasons.endYear);
          break;
        case 'status':
          orderByClause = order(seasons.status);
          break;
        case 'flgDefault':
          orderByClause = order(seasons.flgDefault);
          break;
        case 'createdAt':
          orderByClause = order(seasons.createdAt);
          break;
        case 'startYear':
        default:
          orderByClause = order(seasons.startYear);
          break;
      }

      const data = await this.db
        .select({
          id: seasons.id,
          sportId: seasons.sportId,
          leagueId: seasons.leagueId,
          startYear: seasons.startYear,
          endYear: seasons.endYear,
          status: seasons.status,
          flgDefault: seasons.flgDefault,
          numberOfGroups: seasons.numberOfGroups,
          flgHasPostseason: seasons.flgHasPostseason,
          currentPhase: seasons.currentPhase,
          currentPhaseDetail: seasons.currentPhaseDetail,
          createdAt: seasons.createdAt,
          sport: {
            id: sports.id,
            name: sports.name,
          },
          league: {
            id: leagues.id,
            secondaryName: leagues.secondaryName,
          },
        })
        .from(seasons)
        .leftJoin(sports, eq(seasons.sportId, sports.id))
        .leftJoin(leagues, eq(seasons.leagueId, leagues.id))
        .orderBy(orderByClause)
        .limit(limit)
        .offset(offset);

      const totalResult = await this.db
        .select({ count: sql<number>`count(*)` })
        .from(seasons)
        .leftJoin(sports, eq(seasons.sportId, sports.id))
        .leftJoin(leagues, eq(seasons.leagueId, leagues.id));
      const total = Number(totalResult[0].count);
      return { data, total, page, limit };
    } catch (error) {
      throw new BadRequestException('Failed to fetch paginated seasons');
    }
  }

  async findAll() {
    return this.db
      .select({
        id: seasons.id,
        sportId: seasons.sportId,
        leagueId: seasons.leagueId,
        startYear: seasons.startYear,
        endYear: seasons.endYear,
        status: seasons.status,
        flgDefault: seasons.flgDefault,
        numberOfGroups: seasons.numberOfGroups,
        flgHasPostseason: seasons.flgHasPostseason,
        currentPhase: seasons.currentPhase,
        currentPhaseDetail: seasons.currentPhaseDetail,
        createdAt: seasons.createdAt,
        sport: {
          id: sports.id,
          name: sports.name,
        },
        league: {
          id: leagues.id,
          originalName: leagues.originalName,
          secondaryName: leagues.secondaryName,
        },
      })
      .from(seasons)
      .leftJoin(sports, eq(seasons.sportId, sports.id))
      .leftJoin(leagues, eq(seasons.leagueId, leagues.id));
  }

  async findOne(id: number) {
    const result = await this.db.select().from(seasons).where(eq(seasons.id, id)).limit(1);
    if (!result.length) throw new NotFoundException('Season not found');
    return result[0];
  }

  /**
   * Find all seasons by league
   */
  async findAllByLeague(leagueId: number) {
    try {
      return await this.db
        .select({
          id: schema.seasons.id,
          sportId: schema.seasons.sportId,
          leagueId: schema.seasons.leagueId,
          startYear: schema.seasons.startYear,
          endYear: schema.seasons.endYear,
          status: schema.seasons.status,
          flgDefault: schema.seasons.flgDefault,
          numberOfGroups: schema.seasons.numberOfGroups,
          flgHasPostseason: schema.seasons.flgHasPostseason,
          currentPhase: schema.seasons.currentPhase,
          currentPhaseDetail: schema.seasons.currentPhaseDetail,
          sport: schema.sports,
          league: schema.leagues,
          createdAt: schema.seasons.createdAt,
        })
        .from(schema.seasons)
        .leftJoin(schema.sports, eq(schema.seasons.sportId, schema.sports.id))
        .leftJoin(schema.leagues, eq(schema.seasons.leagueId, schema.leagues.id))
        .where(eq(schema.seasons.leagueId, leagueId));
    } catch (error) {
      throw new BadRequestException('Failed to fetch seasons by league');
    }
  }

  async findByLeague(leagueId: number) {
    return this.db.select().from(seasons).where(eq(seasons.leagueId, leagueId));
  }

  async findCurrentEspnExtractionSettings(): Promise<CurrentSeasonEspnExtractionSettingsResponse> {
    const seasonRows = await this.querySeasonsWithEspnExtractionSettings();
    const rows = seasonRows.map((row) => this.mapEspnExtractionSettingsRow(row));

    return {
      header: this.deriveHeaderDefaults(rows),
      rows,
    };
  }

  async getEspnExtractionSettingsBySeasonIds(
    seasonIds: number[],
  ): Promise<Record<number, CurrentSeasonEspnExtractionSettingsRow>> {
    if (seasonIds.length === 0) {
      return {};
    }

    const seasonRows = await this.querySeasonsWithEspnExtractionSettings(seasonIds);
    return seasonRows
      .map((row) => this.mapEspnExtractionSettingsRow(row))
      .reduce<Record<number, CurrentSeasonEspnExtractionSettingsRow>>((result, row) => {
        result[row.seasonId] = row;
        return result;
      }, {});
  }

  async saveCurrentEspnExtractionSettings(payload: {
    header?: {
      startDate?: string | null;
      endDate?: string | null;
    };
    rows?: Array<
      Partial<CurrentSeasonEspnExtractionSettingsRow> & {
        seasonId: number;
      }
    >;
  }): Promise<CurrentSeasonEspnExtractionSettingsResponse> {
    const requestedRows = Array.isArray(payload?.rows) ? payload.rows : [];
    if (requestedRows.length === 0) {
      throw new BadRequestException('No ESPN extraction settings were provided.');
    }

    const seasonIds = [...new Set(requestedRows.map((row) => Number(row.seasonId)).filter((seasonId) => Number.isInteger(seasonId) && seasonId > 0))];
    if (seasonIds.length === 0) {
      throw new BadRequestException('At least one valid season id is required.');
    }

    const existingSettings = await this.getEspnExtractionSettingsBySeasonIds(seasonIds);
    const missingSeasonIds = seasonIds.filter((seasonId) => !existingSettings[seasonId]);
    if (missingSeasonIds.length > 0) {
      throw new BadRequestException(`Some season ids were not found: ${missingSeasonIds.join(', ')}`);
    }

    const headerStartDate = this.normalizeDateValue(payload?.header?.startDate ?? null);
    const headerEndDate = this.normalizeDateValue(payload?.header?.endDate ?? null);

    try {
      await this.db.transaction(async (tx) => {
        for (const row of requestedRows) {
          const seasonId = Number(row.seasonId);
          const baseline = existingSettings[seasonId];
          if (!baseline) {
            throw new BadRequestException(`Season ${seasonId} is not available for ESPN extraction settings.`);
          }

          const normalized = this.normalizeEspnExtractionSettingsInput(row, baseline, headerStartDate, headerEndDate);
          await tx
            .insert(seasonEspnExtractionConfigs)
            .values({
              seasonId,
              externalLeagueCode: normalized.externalLeagueCode,
              startDate: normalized.startDate,
              endDate: normalized.endDate,
              sameYears: normalized.sameYears,
              hasPostseason: normalized.hasPostseason,
              scheduleType: normalized.scheduleType,
              hasGroups: normalized.hasGroups,
              numberOfGroups: normalized.numberOfGroups,
              hasDivisions: normalized.hasDivisions,
              runInBackground: normalized.runInBackground,
              updatedAt: new Date(),
            })
            .onConflictDoUpdate({
              target: seasonEspnExtractionConfigs.seasonId,
              set: {
                externalLeagueCode: normalized.externalLeagueCode,
                startDate: normalized.startDate,
                endDate: normalized.endDate,
                sameYears: normalized.sameYears,
                hasPostseason: normalized.hasPostseason,
                scheduleType: normalized.scheduleType,
                hasGroups: normalized.hasGroups,
                numberOfGroups: normalized.numberOfGroups,
                hasDivisions: normalized.hasDivisions,
                runInBackground: normalized.runInBackground,
                updatedAt: new Date(),
              },
            });
        }
      });
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }

      if (this.isMissingSeasonEspnExtractionConfigsTableError(error)) {
        throw new BadRequestException(
          'The ESPN extraction settings table is not available yet. Run migration 0025_create_season_espn_extraction_configs.sql before saving settings.',
        );
      }

      throw error;
    }

    return this.findCurrentEspnExtractionSettings();
  }

  /**
   * Check if another season in the same league has flgDefault = true
   * Returns the existing default season if found
   */
  async findDefaultSeasonByLeague(leagueId: number, excludeSeasonId?: number) {
    const conditions = excludeSeasonId 
      ? and(eq(seasons.leagueId, leagueId), eq(seasons.flgDefault, true), eq(seasons.id, excludeSeasonId))
      : and(eq(seasons.leagueId, leagueId), eq(seasons.flgDefault, true));

    const result = await this.db
      .select()
      .from(seasons)
      .where(conditions)
      .limit(1);

    return result.length > 0 ? result[0] : null;
  }

  async create(createSeasonDto: CreateSeasonDto) {
    try {
      // Verify sport exists
      const sport = await this.db
        .select()
        .from(sports)
        .where(eq(sports.id, createSeasonDto.sportId))
        .limit(1);

      if (!sport || sport.length === 0) {
        throw new BadRequestException(`Sport with ID ${createSeasonDto.sportId} not found`);
      }

      // Verify league exists
      const league = await this.db
        .select()
        .from(leagues)
        .where(eq(leagues.id, createSeasonDto.leagueId))
        .limit(1);

      if (!league || league.length === 0) {
        throw new BadRequestException(`League with ID ${createSeasonDto.leagueId} not found`);
      }

      // If setting this season as default, unset all other defaults for this league
      if (createSeasonDto.flgDefault) {
        await this.db
          .update(seasons)
          .set({ flgDefault: false })
          .where(and(
            eq(seasons.leagueId, createSeasonDto.leagueId),
            eq(seasons.flgDefault, true)
          ));
      }

      const result = await this.db
        .insert(seasons)
        .values({
          sportId: createSeasonDto.sportId,
          leagueId: createSeasonDto.leagueId,
          startYear: createSeasonDto.startYear,
          endYear: createSeasonDto.endYear,
          status: createSeasonDto.status || 'planned',
          flgDefault: createSeasonDto.flgDefault || false,
          numberOfGroups: createSeasonDto.numberOfGroups || 0,
          flgHasPostseason: createSeasonDto.flgHasPostseason || false,
          currentPhase: createSeasonDto.currentPhase || 'Regular',
          currentPhaseDetail: createSeasonDto.currentPhaseDetail || 'Regular',
        })
        .returning();

      return result[0];
    } catch (error) {
      if (error instanceof BadRequestException) throw error;
      throw new BadRequestException('Failed to create season');
    }
  }

  async update(id: number, updateSeasonDto: UpdateSeasonDto) {
    try {
      // Verify season exists
      const existingSeason = await this.findOne(id);

      // Verify sport exists if being updated
      if (updateSeasonDto.sportId) {
        const sport = await this.db
          .select()
          .from(sports)
          .where(eq(sports.id, updateSeasonDto.sportId))
          .limit(1);

        if (!sport || sport.length === 0) {
          throw new BadRequestException(`Sport with ID ${updateSeasonDto.sportId} not found`);
        }
      }

      // If setting this season as default, unset all other defaults for this league
      if (updateSeasonDto.flgDefault === true) {
        const leagueId = updateSeasonDto.leagueId || existingSeason.leagueId;
        await this.db
          .update(seasons)
          .set({ flgDefault: false })
          .where(and(
            eq(seasons.leagueId, leagueId),
            eq(seasons.flgDefault, true)
          ));
      }

      const result = await this.db
        .update(seasons)
        .set(updateSeasonDto)
        .where(eq(seasons.id, id))
        .returning();

      if (!result.length) throw new NotFoundException('Season not found');
      return result[0];
    } catch (error) {
      if (error instanceof BadRequestException || error instanceof NotFoundException)
        throw error;
      throw new BadRequestException('Failed to update season');
    }
  }

  /**
   * Clear default flag from a season and set it on another
   * Used when user confirms changing the default season
   */
  async changeDefaultSeason(currentDefaultId: number, newDefaultId: number) {
    try {
      // Remove default flag from current default
      await this.db
        .update(seasons)
        .set({ flgDefault: false })
        .where(eq(seasons.id, currentDefaultId));

      // Set default flag on new season
      const result = await this.db
        .update(seasons)
        .set({ flgDefault: true })
        .where(eq(seasons.id, newDefaultId))
        .returning();

      return result[0];
    } catch (error) {
      throw new BadRequestException('Failed to change default season');
    }
  }

  async remove(id: number) {
    const result = await this.db.delete(seasons).where(eq(seasons.id, id)).returning();
    if (!result.length) throw new NotFoundException('Season not found');
    return result[0];
  }

  private async querySeasonsWithEspnExtractionSettings(seasonIds?: number[]) {
    const baseFields = {
      id: seasons.id,
      sportId: seasons.sportId,
      leagueId: seasons.leagueId,
      startYear: seasons.startYear,
      endYear: seasons.endYear,
      status: seasons.status,
      flgDefault: seasons.flgDefault,
      numberOfGroups: seasons.numberOfGroups,
      flgHasPostseason: seasons.flgHasPostseason,
      sport: {
        id: sports.id,
        name: sports.name,
      },
      league: {
        id: leagues.id,
        originalName: leagues.originalName,
        secondaryName: leagues.secondaryName,
        flgDefault: leagues.flgDefault,
      },
    };

    try {
      const selectQuery = this.db
        .select({
          ...baseFields,
          extraction: {
            seasonId: seasonEspnExtractionConfigs.seasonId,
            externalLeagueCode: seasonEspnExtractionConfigs.externalLeagueCode,
            startDate: seasonEspnExtractionConfigs.startDate,
            endDate: seasonEspnExtractionConfigs.endDate,
            sameYears: seasonEspnExtractionConfigs.sameYears,
            hasPostseason: seasonEspnExtractionConfigs.hasPostseason,
            scheduleType: seasonEspnExtractionConfigs.scheduleType,
            hasGroups: seasonEspnExtractionConfigs.hasGroups,
            numberOfGroups: seasonEspnExtractionConfigs.numberOfGroups,
            hasDivisions: seasonEspnExtractionConfigs.hasDivisions,
            runInBackground: seasonEspnExtractionConfigs.runInBackground,
          },
        })
        .from(seasons)
        .leftJoin(sports, eq(seasons.sportId, sports.id))
        .leftJoin(leagues, eq(seasons.leagueId, leagues.id))
        .leftJoin(seasonEspnExtractionConfigs, eq(seasonEspnExtractionConfigs.seasonId, seasons.id));

      const seasonRows = seasonIds && seasonIds.length > 0
        ? await selectQuery
          .where(inArray(seasons.id, seasonIds))
          .orderBy(desc(seasons.startYear), asc(leagues.secondaryName), asc(seasons.id))
        : await selectQuery
          .where(eq(seasons.flgDefault, true))
          .orderBy(asc(leagues.secondaryName), desc(seasons.startYear), asc(seasons.id));

      return this.inferMissingEspnLeagueCodes(seasonRows);
    } catch (error) {
      if (!this.isMissingSeasonEspnExtractionConfigsTableError(error)) {
        throw error;
      }

      const fallbackQuery = this.db
        .select(baseFields)
        .from(seasons)
        .leftJoin(sports, eq(seasons.sportId, sports.id))
        .leftJoin(leagues, eq(seasons.leagueId, leagues.id));

      const seasonRows = seasonIds && seasonIds.length > 0
        ? await fallbackQuery
          .where(inArray(seasons.id, seasonIds))
          .orderBy(desc(seasons.startYear), asc(leagues.secondaryName), asc(seasons.id))
        : await fallbackQuery
          .where(eq(seasons.flgDefault, true))
          .orderBy(asc(leagues.secondaryName), desc(seasons.startYear), asc(seasons.id));

      return this.inferMissingEspnLeagueCodes(seasonRows.map((row) => ({
        ...row,
        extraction: {
          seasonId: null,
          externalLeagueCode: null,
          startDate: null,
          endDate: null,
          sameYears: null,
          hasPostseason: null,
          scheduleType: null,
          hasGroups: null,
          numberOfGroups: null,
          hasDivisions: null,
          runInBackground: null,
        },
      })));
    }
  }

  private isMissingSeasonEspnExtractionConfigsTableError(error: unknown): boolean {
    const candidates = [
      error,
      typeof error === 'object' && error !== null ? (error as { cause?: unknown }).cause : null,
    ];

    return candidates.some((candidate) => {
      if (!candidate || typeof candidate !== 'object') {
        return false;
      }

      const code = (candidate as { code?: unknown }).code;
      const message = String((candidate as { message?: unknown }).message ?? '').toLowerCase();

      return (code === '42P01' || message.includes('relation')) && message.includes('season_espn_extraction_configs');
    });
  }

  private mapEspnExtractionSettingsRow(row: any): CurrentSeasonEspnExtractionSettingsRow {
    const defaults = this.buildEspnSportRuleDefaults(row?.sport?.name ?? null);
    const fallbackStartDate = this.buildDefaultStartDate(row.startYear, row.endYear);
    const fallbackEndDate = this.buildDefaultEndDate(row.startYear, row.endYear);
    const startDate = this.normalizeDateValue(row?.extraction?.startDate) ?? fallbackStartDate;
    const endDate = this.normalizeDateValue(row?.extraction?.endDate) ?? fallbackEndDate;
    const sameYears = this.computeSameYears(startDate, endDate, row.startYear === row.endYear);
    const storedLeagueCode = String(row?.extraction?.externalLeagueCode ?? '').trim();

    return {
      seasonId: row.id,
      sportId: row.sportId,
      leagueId: row.leagueId,
      sportName: row?.sport?.name ?? null,
      leagueName: this.resolveLeagueName(row),
      seasonLabel: this.buildSeasonLabel(row.startYear, row.endYear),
      seasonStatus: this.resolveSeasonStatus(endDate, row.status),
      isSeasonDefault: Boolean(row.flgDefault),
      isLeagueDefault: Boolean(row?.league?.flgDefault),
      externalLeagueCode: storedLeagueCode,
      startDate,
      endDate,
      sameYears,
      hasPostseason: row?.extraction?.hasPostseason ?? Boolean(row.flgHasPostseason),
      scheduleType: this.normalizeScheduleType(row?.extraction?.scheduleType ?? defaults.scheduleType),
      hasGroups: row?.extraction?.hasGroups ?? defaults.hasGroups,
      numberOfGroups: Number(row?.extraction?.numberOfGroups ?? defaults.numberOfGroups),
      hasDivisions: row?.extraction?.hasDivisions ?? defaults.hasDivisions,
      runInBackground: row?.extraction?.runInBackground ?? defaults.runInBackground,
      inferClubs: defaults.inferClubs,
      isConfigured: Boolean(row?.extraction?.seasonId) && storedLeagueCode.length > 0,
    };
  }

  private normalizeEspnExtractionSettingsInput(
    row: Partial<CurrentSeasonEspnExtractionSettingsRow>,
    baseline: CurrentSeasonEspnExtractionSettingsRow,
    headerStartDate: string | null,
    headerEndDate: string | null,
  ) {
    const startDate =
      this.normalizeDateValue(row.startDate ?? null) ??
      headerStartDate ??
      this.normalizeDateValue(baseline.startDate);
    const endDate =
      this.normalizeDateValue(row.endDate ?? null) ??
      headerEndDate ??
      this.normalizeDateValue(baseline.endDate);

    if (!startDate || !endDate) {
      throw new BadRequestException(`Season ${baseline.seasonId} requires both a start date and an end date.`);
    }

    if (startDate > endDate) {
      throw new BadRequestException(`Season ${baseline.seasonId} has a start date after the end date.`);
    }

    const submittedExternalLeagueCode = typeof row.externalLeagueCode === 'string'
      ? row.externalLeagueCode.trim()
      : '';
    const externalLeagueCode = submittedExternalLeagueCode || String(baseline.externalLeagueCode ?? '').trim();
    if (!externalLeagueCode) {
      throw new BadRequestException(`Season ${baseline.seasonId} requires the ESPN league code.`);
    }

    const sportRules = this.buildEspnSportRuleDefaults(baseline.sportName);
    const hasGroups = typeof row.hasGroups === 'boolean' ? row.hasGroups : baseline.hasGroups;
    const requestedNumberOfGroups = Number(row.numberOfGroups);
    const numberOfGroups = hasGroups
      ? Number.isInteger(requestedNumberOfGroups) && requestedNumberOfGroups > 0
        ? requestedNumberOfGroups
        : baseline.numberOfGroups
      : 0;

    return {
      externalLeagueCode,
      startDate,
      endDate,
      sameYears: this.computeSameYears(startDate, endDate, Boolean(row.sameYears ?? baseline.sameYears)),
      hasPostseason: typeof row.hasPostseason === 'boolean' ? row.hasPostseason : baseline.hasPostseason,
      scheduleType: this.normalizeScheduleType(row.scheduleType ?? baseline.scheduleType),
      hasGroups,
      numberOfGroups,
      hasDivisions: sportRules.hasDivisions,
      runInBackground: sportRules.runInBackground,
    };
  }

  private buildEspnSportRuleDefaults(sportName: string | null | undefined) {
    const normalizedSportName = String(sportName ?? '').trim().toLowerCase();
    const isFootball = normalizedSportName.includes('football');

    return {
      scheduleType: (isFootball ? 'Round' : 'Date') as 'Round' | 'Date',
      hasGroups: !isFootball,
      numberOfGroups: isFootball ? 0 : 2,
      hasDivisions: !isFootball,
      runInBackground: isFootball,
      inferClubs: isFootball,
    };
  }

  private buildDefaultStartDate(startYear: number, endYear: number) {
    return startYear === endYear ? `${startYear}-01-01` : `${startYear}-08-01`;
  }

  private buildDefaultEndDate(startYear: number, endYear: number) {
    return startYear === endYear ? `${endYear}-12-31` : `${endYear}-05-31`;
  }

  private normalizeDateValue(value: Date | string | null | undefined): string | null {
    if (value == null) {
      return null;
    }

    const rawValue = String(value).trim();
    if (!rawValue) {
      return null;
    }

    if (/^\d{4}-\d{2}-\d{2}$/.test(rawValue)) {
      return rawValue;
    }

    const parsed = new Date(rawValue);
    if (Number.isNaN(parsed.getTime())) {
      return null;
    }

    return parsed.toISOString().slice(0, 10);
  }

  private computeSameYears(startDate: string | null, endDate: string | null, fallback: boolean): boolean {
    if (!startDate || !endDate) {
      return fallback;
    }

    return startDate.slice(0, 4) === endDate.slice(0, 4);
  }

  private normalizeScheduleType(value: string | null | undefined): 'Round' | 'Date' {
    return String(value ?? '').trim().toLowerCase() === 'round' ? 'Round' : 'Date';
  }

  private resolveSeasonStatus(endDate: string | null, fallbackStatus: string | null | undefined): string {
    if (!endDate) {
      return this.capitalizeStatus(fallbackStatus ?? 'Finished');
    }

    const endYear = Number(endDate.slice(0, 4));
    if (Number.isInteger(endYear)) {
      return endYear >= new Date().getFullYear() ? 'Active' : 'Finished';
    }

    return this.capitalizeStatus(fallbackStatus ?? 'Finished');
  }

  private capitalizeStatus(status: string) {
    const normalized = String(status ?? '').trim().toLowerCase();
    if (!normalized) {
      return 'Finished';
    }

    return normalized.charAt(0).toUpperCase() + normalized.slice(1);
  }

  private resolveLeagueName(row: any) {
    return row?.league?.secondaryName?.trim() || row?.league?.originalName?.trim() || `League ${row.leagueId}`;
  }

  private buildSeasonLabel(startYear: number, endYear: number) {
    return `${startYear}/${endYear}`;
  }

  private deriveHeaderDefaults(rows: CurrentSeasonEspnExtractionSettingsRow[]) {
    const uniqueStartDates = [...new Set(rows.map((row) => row.startDate).filter(Boolean))];
    const uniqueEndDates = [...new Set(rows.map((row) => row.endDate).filter(Boolean))];

    return {
      startDate: uniqueStartDates.length === 1 ? uniqueStartDates[0] : null,
      endDate: uniqueEndDates.length === 1 ? uniqueEndDates[0] : null,
    };
  }

  private async inferMissingEspnLeagueCodes(rows: any[]) {
    const rowsMissingLeagueCode = rows.filter(
      (row) => String(row?.extraction?.externalLeagueCode ?? '').trim().length === 0,
    );
    if (rowsMissingLeagueCode.length === 0) {
      return rows;
    }

    const seasonYears = [...new Set(
      rowsMissingLeagueCode
        .map((row) => Number(row?.startYear))
        .filter((year) => Number.isInteger(year) && year > 0),
    )];
    if (seasonYears.length === 0) {
      return rows;
    }

    const candidates = await this.loadInferredEspnLeagueCodeCandidates(seasonYears);
    if (candidates.length === 0) {
      return rows;
    }

    return rows.map((row) => {
      const storedLeagueCode = String(row?.extraction?.externalLeagueCode ?? '').trim();
      if (storedLeagueCode) {
        return row;
      }

      const inferredLeagueCode = this.findInferredEspnLeagueCode(row, candidates);
      if (!inferredLeagueCode) {
        return row;
      }

      return {
        ...row,
        extraction: {
          ...(row?.extraction ?? {}),
          externalLeagueCode: inferredLeagueCode,
        },
      };
    });
  }

  private async loadInferredEspnLeagueCodeCandidates(seasonYears: number[]): Promise<InferredEspnLeagueCodeCandidate[]> {
    const safeSeasonYears = [...new Set(
      seasonYears
        .map((year) => Number(year))
        .filter((year) => Number.isInteger(year) && year > 0),
    )];
    if (safeSeasonYears.length === 0) {
      return [];
    }

    try {
      const result = await this.db.execute(sql.raw(`
        select distinct on (season, league)
          season,
          league as "leagueCode",
          coalesce(payload->'leagues'->0->>'name', payload->'leagues'->0->>'abbreviation') as "leagueName"
        from api_transitional
        where coalesce(origin, 'Api-Football') = 'Api-Espn'
          and coalesce(trim(league), '') <> ''
          and season in (${safeSeasonYears.join(', ')})
        order by season, league, fetched_at desc
      `));

      return result.rows.map((row: any) => ({
        season: Number(row.season),
        leagueCode: String(row.leagueCode ?? '').trim(),
        leagueName: typeof row.leagueName === 'string' ? row.leagueName.trim() : null,
      })).filter((row) => Number.isInteger(row.season) && row.season > 0 && row.leagueCode.length > 0);
    } catch {
      return [];
    }
  }

  private findInferredEspnLeagueCode(row: any, candidates: InferredEspnLeagueCodeCandidate[]): string | null {
    const seasonYear = Number(row?.startYear);
    if (!Number.isInteger(seasonYear) || seasonYear <= 0) {
      return null;
    }

    const leagueNames = this.collectEspnLeagueMatchNames(row);
    if (leagueNames.length === 0) {
      return null;
    }

    const matchingCandidate = candidates.find(
      (candidate) => candidate.season === seasonYear && this.matchesEspnLeagueName(candidate.leagueName, leagueNames),
    );

    return matchingCandidate?.leagueCode ?? null;
  }

  private collectEspnLeagueMatchNames(row: any): string[] {
    const names = new Set<string>();

    const candidateNames = [
      row?.league?.secondaryName,
      row?.league?.originalName,
      this.resolveLeagueName(row),
    ];

    for (const candidateName of candidateNames) {
      const trimmedName = String(candidateName ?? '').trim();
      if (trimmedName) {
        names.add(trimmedName);
      }
    }

    for (const name of [...names]) {
      if (this.normalizeLeagueName(name) === 'nba') {
        names.add('National Basketball Association');
      }
    }

    return [...names];
  }

  private matchesEspnLeagueName(candidateName: string | null, leagueNames: string[]): boolean {
    const normalizedCandidate = this.normalizeLeagueName(candidateName);
    if (!normalizedCandidate) {
      return false;
    }

    return leagueNames.some((leagueName) => {
      const normalizedLeagueName = this.normalizeLeagueName(leagueName);
      if (!normalizedLeagueName) {
        return false;
      }

      return (
        normalizedCandidate === normalizedLeagueName ||
        normalizedCandidate.includes(normalizedLeagueName) ||
        normalizedLeagueName.includes(normalizedCandidate) ||
        this.hasAllLeagueTokens(normalizedCandidate, normalizedLeagueName)
      );
    });
  }

  private hasAllLeagueTokens(candidate: string, expected: string): boolean {
    const candidateTokens = new Set(candidate.split(' ').filter(Boolean));
    const expectedTokens = [...new Set(expected.split(' ').filter(Boolean))];

    return expectedTokens.length > 0 && expectedTokens.every((token) => candidateTokens.has(token));
  }

  private normalizeLeagueName(value: string | null | undefined): string {
    return String(value ?? '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, ' ')
      .trim();
  }
}
