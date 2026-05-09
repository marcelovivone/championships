"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SeasonsService = void 0;
const common_1 = require("@nestjs/common");
const node_postgres_1 = require("drizzle-orm/node-postgres");
const drizzle_orm_1 = require("drizzle-orm");
const schema = require("../db/schema");
const schema_1 = require("../db/schema");
let SeasonsService = class SeasonsService {
    constructor(db) {
        this.db = db;
    }
    async findAllPaginated(page, limit, sortBy, sortOrder) {
        const offset = (page - 1) * limit;
        const sortableColumns = ['startYear', 'endYear', 'status', 'flgDefault', 'createdAt', 'sportName', 'leagueName'];
        const orderByField = sortableColumns.includes(sortBy) ? sortBy : 'startYear';
        const order = sortOrder === 'desc' ? drizzle_orm_1.desc : drizzle_orm_1.asc;
        try {
            let orderByClause;
            switch (orderByField) {
                case 'sportName':
                    orderByClause = order(schema_1.sports.name);
                    break;
                case 'leagueName':
                    orderByClause = order(schema_1.leagues.secondaryName);
                    break;
                case 'endYear':
                    orderByClause = order(schema_1.seasons.endYear);
                    break;
                case 'status':
                    orderByClause = order(schema_1.seasons.status);
                    break;
                case 'flgDefault':
                    orderByClause = order(schema_1.seasons.flgDefault);
                    break;
                case 'createdAt':
                    orderByClause = order(schema_1.seasons.createdAt);
                    break;
                case 'startYear':
                default:
                    orderByClause = order(schema_1.seasons.startYear);
                    break;
            }
            const data = await this.db
                .select({
                id: schema_1.seasons.id,
                sportId: schema_1.seasons.sportId,
                leagueId: schema_1.seasons.leagueId,
                startYear: schema_1.seasons.startYear,
                endYear: schema_1.seasons.endYear,
                status: schema_1.seasons.status,
                flgDefault: schema_1.seasons.flgDefault,
                numberOfGroups: schema_1.seasons.numberOfGroups,
                flgHasPostseason: schema_1.seasons.flgHasPostseason,
                currentPhase: schema_1.seasons.currentPhase,
                currentPhaseDetail: schema_1.seasons.currentPhaseDetail,
                createdAt: schema_1.seasons.createdAt,
                sport: {
                    id: schema_1.sports.id,
                    name: schema_1.sports.name,
                },
                league: {
                    id: schema_1.leagues.id,
                    secondaryName: schema_1.leagues.secondaryName,
                },
            })
                .from(schema_1.seasons)
                .leftJoin(schema_1.sports, (0, drizzle_orm_1.eq)(schema_1.seasons.sportId, schema_1.sports.id))
                .leftJoin(schema_1.leagues, (0, drizzle_orm_1.eq)(schema_1.seasons.leagueId, schema_1.leagues.id))
                .orderBy(orderByClause)
                .limit(limit)
                .offset(offset);
            const totalResult = await this.db
                .select({ count: (0, drizzle_orm_1.sql) `count(*)` })
                .from(schema_1.seasons)
                .leftJoin(schema_1.sports, (0, drizzle_orm_1.eq)(schema_1.seasons.sportId, schema_1.sports.id))
                .leftJoin(schema_1.leagues, (0, drizzle_orm_1.eq)(schema_1.seasons.leagueId, schema_1.leagues.id));
            const total = Number(totalResult[0].count);
            return { data, total, page, limit };
        }
        catch (error) {
            throw new common_1.BadRequestException('Failed to fetch paginated seasons');
        }
    }
    async findAll() {
        return this.db
            .select({
            id: schema_1.seasons.id,
            sportId: schema_1.seasons.sportId,
            leagueId: schema_1.seasons.leagueId,
            startYear: schema_1.seasons.startYear,
            endYear: schema_1.seasons.endYear,
            status: schema_1.seasons.status,
            flgDefault: schema_1.seasons.flgDefault,
            numberOfGroups: schema_1.seasons.numberOfGroups,
            flgHasPostseason: schema_1.seasons.flgHasPostseason,
            currentPhase: schema_1.seasons.currentPhase,
            currentPhaseDetail: schema_1.seasons.currentPhaseDetail,
            createdAt: schema_1.seasons.createdAt,
            sport: {
                id: schema_1.sports.id,
                name: schema_1.sports.name,
            },
            league: {
                id: schema_1.leagues.id,
                originalName: schema_1.leagues.originalName,
                secondaryName: schema_1.leagues.secondaryName,
            },
        })
            .from(schema_1.seasons)
            .leftJoin(schema_1.sports, (0, drizzle_orm_1.eq)(schema_1.seasons.sportId, schema_1.sports.id))
            .leftJoin(schema_1.leagues, (0, drizzle_orm_1.eq)(schema_1.seasons.leagueId, schema_1.leagues.id));
    }
    async findOne(id) {
        const result = await this.db.select().from(schema_1.seasons).where((0, drizzle_orm_1.eq)(schema_1.seasons.id, id)).limit(1);
        if (!result.length)
            throw new common_1.NotFoundException('Season not found');
        return result[0];
    }
    async findAllByLeague(leagueId) {
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
                .leftJoin(schema.sports, (0, drizzle_orm_1.eq)(schema.seasons.sportId, schema.sports.id))
                .leftJoin(schema.leagues, (0, drizzle_orm_1.eq)(schema.seasons.leagueId, schema.leagues.id))
                .where((0, drizzle_orm_1.eq)(schema.seasons.leagueId, leagueId));
        }
        catch (error) {
            throw new common_1.BadRequestException('Failed to fetch seasons by league');
        }
    }
    async findByLeague(leagueId) {
        return this.db.select().from(schema_1.seasons).where((0, drizzle_orm_1.eq)(schema_1.seasons.leagueId, leagueId));
    }
    async findCurrentEspnExtractionSettings() {
        const seasonRows = await this.querySeasonsWithEspnExtractionSettings();
        const rows = seasonRows.map((row) => this.mapEspnExtractionSettingsRow(row));
        return {
            header: this.deriveHeaderDefaults(rows),
            rows,
        };
    }
    async getEspnExtractionSettingsBySeasonIds(seasonIds) {
        if (seasonIds.length === 0) {
            return {};
        }
        const seasonRows = await this.querySeasonsWithEspnExtractionSettings(seasonIds);
        return seasonRows
            .map((row) => this.mapEspnExtractionSettingsRow(row))
            .reduce((result, row) => {
            result[row.seasonId] = row;
            return result;
        }, {});
    }
    async saveCurrentEspnExtractionSettings(payload) {
        const requestedRows = Array.isArray(payload?.rows) ? payload.rows : [];
        if (requestedRows.length === 0) {
            throw new common_1.BadRequestException('No ESPN extraction settings were provided.');
        }
        const seasonIds = [...new Set(requestedRows.map((row) => Number(row.seasonId)).filter((seasonId) => Number.isInteger(seasonId) && seasonId > 0))];
        if (seasonIds.length === 0) {
            throw new common_1.BadRequestException('At least one valid season id is required.');
        }
        const existingSettings = await this.getEspnExtractionSettingsBySeasonIds(seasonIds);
        const missingSeasonIds = seasonIds.filter((seasonId) => !existingSettings[seasonId]);
        if (missingSeasonIds.length > 0) {
            throw new common_1.BadRequestException(`Some season ids were not found: ${missingSeasonIds.join(', ')}`);
        }
        const headerStartDate = this.normalizeDateValue(payload?.header?.startDate ?? null);
        const headerEndDate = this.normalizeDateValue(payload?.header?.endDate ?? null);
        try {
            await this.db.transaction(async (tx) => {
                for (const row of requestedRows) {
                    const seasonId = Number(row.seasonId);
                    const baseline = existingSettings[seasonId];
                    if (!baseline) {
                        throw new common_1.BadRequestException(`Season ${seasonId} is not available for ESPN extraction settings.`);
                    }
                    const normalized = this.normalizeEspnExtractionSettingsInput(row, baseline, headerStartDate, headerEndDate);
                    await tx
                        .insert(schema_1.seasonEspnExtractionConfigs)
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
                        target: schema_1.seasonEspnExtractionConfigs.seasonId,
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
        }
        catch (error) {
            if (error instanceof common_1.BadRequestException) {
                throw error;
            }
            if (this.isMissingSeasonEspnExtractionConfigsTableError(error)) {
                throw new common_1.BadRequestException('The ESPN extraction settings table is not available yet. Run migration 0025_create_season_espn_extraction_configs.sql before saving settings.');
            }
            throw error;
        }
        return this.findCurrentEspnExtractionSettings();
    }
    async findDefaultSeasonByLeague(leagueId, excludeSeasonId) {
        const conditions = excludeSeasonId
            ? (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.seasons.leagueId, leagueId), (0, drizzle_orm_1.eq)(schema_1.seasons.flgDefault, true), (0, drizzle_orm_1.eq)(schema_1.seasons.id, excludeSeasonId))
            : (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.seasons.leagueId, leagueId), (0, drizzle_orm_1.eq)(schema_1.seasons.flgDefault, true));
        const result = await this.db
            .select()
            .from(schema_1.seasons)
            .where(conditions)
            .limit(1);
        return result.length > 0 ? result[0] : null;
    }
    async create(createSeasonDto) {
        try {
            const sport = await this.db
                .select()
                .from(schema_1.sports)
                .where((0, drizzle_orm_1.eq)(schema_1.sports.id, createSeasonDto.sportId))
                .limit(1);
            if (!sport || sport.length === 0) {
                throw new common_1.BadRequestException(`Sport with ID ${createSeasonDto.sportId} not found`);
            }
            const league = await this.db
                .select()
                .from(schema_1.leagues)
                .where((0, drizzle_orm_1.eq)(schema_1.leagues.id, createSeasonDto.leagueId))
                .limit(1);
            if (!league || league.length === 0) {
                throw new common_1.BadRequestException(`League with ID ${createSeasonDto.leagueId} not found`);
            }
            if (createSeasonDto.flgDefault) {
                await this.db
                    .update(schema_1.seasons)
                    .set({ flgDefault: false })
                    .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.seasons.leagueId, createSeasonDto.leagueId), (0, drizzle_orm_1.eq)(schema_1.seasons.flgDefault, true)));
            }
            const result = await this.db
                .insert(schema_1.seasons)
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
        }
        catch (error) {
            if (error instanceof common_1.BadRequestException)
                throw error;
            throw new common_1.BadRequestException('Failed to create season');
        }
    }
    async update(id, updateSeasonDto) {
        try {
            const existingSeason = await this.findOne(id);
            if (updateSeasonDto.sportId) {
                const sport = await this.db
                    .select()
                    .from(schema_1.sports)
                    .where((0, drizzle_orm_1.eq)(schema_1.sports.id, updateSeasonDto.sportId))
                    .limit(1);
                if (!sport || sport.length === 0) {
                    throw new common_1.BadRequestException(`Sport with ID ${updateSeasonDto.sportId} not found`);
                }
            }
            if (updateSeasonDto.flgDefault === true) {
                const leagueId = updateSeasonDto.leagueId || existingSeason.leagueId;
                await this.db
                    .update(schema_1.seasons)
                    .set({ flgDefault: false })
                    .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.seasons.leagueId, leagueId), (0, drizzle_orm_1.eq)(schema_1.seasons.flgDefault, true)));
            }
            const result = await this.db
                .update(schema_1.seasons)
                .set(updateSeasonDto)
                .where((0, drizzle_orm_1.eq)(schema_1.seasons.id, id))
                .returning();
            if (!result.length)
                throw new common_1.NotFoundException('Season not found');
            return result[0];
        }
        catch (error) {
            if (error instanceof common_1.BadRequestException || error instanceof common_1.NotFoundException)
                throw error;
            throw new common_1.BadRequestException('Failed to update season');
        }
    }
    async changeDefaultSeason(currentDefaultId, newDefaultId) {
        try {
            await this.db
                .update(schema_1.seasons)
                .set({ flgDefault: false })
                .where((0, drizzle_orm_1.eq)(schema_1.seasons.id, currentDefaultId));
            const result = await this.db
                .update(schema_1.seasons)
                .set({ flgDefault: true })
                .where((0, drizzle_orm_1.eq)(schema_1.seasons.id, newDefaultId))
                .returning();
            return result[0];
        }
        catch (error) {
            throw new common_1.BadRequestException('Failed to change default season');
        }
    }
    async remove(id) {
        const result = await this.db.delete(schema_1.seasons).where((0, drizzle_orm_1.eq)(schema_1.seasons.id, id)).returning();
        if (!result.length)
            throw new common_1.NotFoundException('Season not found');
        return result[0];
    }
    async querySeasonsWithEspnExtractionSettings(seasonIds) {
        const baseFields = {
            id: schema_1.seasons.id,
            sportId: schema_1.seasons.sportId,
            leagueId: schema_1.seasons.leagueId,
            startYear: schema_1.seasons.startYear,
            endYear: schema_1.seasons.endYear,
            status: schema_1.seasons.status,
            flgDefault: schema_1.seasons.flgDefault,
            numberOfGroups: schema_1.seasons.numberOfGroups,
            flgHasPostseason: schema_1.seasons.flgHasPostseason,
            sport: {
                id: schema_1.sports.id,
                name: schema_1.sports.name,
            },
            league: {
                id: schema_1.leagues.id,
                originalName: schema_1.leagues.originalName,
                secondaryName: schema_1.leagues.secondaryName,
                flgDefault: schema_1.leagues.flgDefault,
            },
        };
        try {
            const selectQuery = this.db
                .select({
                ...baseFields,
                extraction: {
                    seasonId: schema_1.seasonEspnExtractionConfigs.seasonId,
                    externalLeagueCode: schema_1.seasonEspnExtractionConfigs.externalLeagueCode,
                    startDate: schema_1.seasonEspnExtractionConfigs.startDate,
                    endDate: schema_1.seasonEspnExtractionConfigs.endDate,
                    sameYears: schema_1.seasonEspnExtractionConfigs.sameYears,
                    hasPostseason: schema_1.seasonEspnExtractionConfigs.hasPostseason,
                    scheduleType: schema_1.seasonEspnExtractionConfigs.scheduleType,
                    hasGroups: schema_1.seasonEspnExtractionConfigs.hasGroups,
                    numberOfGroups: schema_1.seasonEspnExtractionConfigs.numberOfGroups,
                    hasDivisions: schema_1.seasonEspnExtractionConfigs.hasDivisions,
                    runInBackground: schema_1.seasonEspnExtractionConfigs.runInBackground,
                },
            })
                .from(schema_1.seasons)
                .leftJoin(schema_1.sports, (0, drizzle_orm_1.eq)(schema_1.seasons.sportId, schema_1.sports.id))
                .leftJoin(schema_1.leagues, (0, drizzle_orm_1.eq)(schema_1.seasons.leagueId, schema_1.leagues.id))
                .leftJoin(schema_1.seasonEspnExtractionConfigs, (0, drizzle_orm_1.eq)(schema_1.seasonEspnExtractionConfigs.seasonId, schema_1.seasons.id));
            const seasonRows = seasonIds && seasonIds.length > 0
                ? await selectQuery
                    .where((0, drizzle_orm_1.inArray)(schema_1.seasons.id, seasonIds))
                    .orderBy((0, drizzle_orm_1.desc)(schema_1.seasons.startYear), (0, drizzle_orm_1.asc)(schema_1.leagues.secondaryName), (0, drizzle_orm_1.asc)(schema_1.seasons.id))
                : await selectQuery
                    .where((0, drizzle_orm_1.eq)(schema_1.seasons.flgDefault, true))
                    .orderBy((0, drizzle_orm_1.asc)(schema_1.leagues.secondaryName), (0, drizzle_orm_1.desc)(schema_1.seasons.startYear), (0, drizzle_orm_1.asc)(schema_1.seasons.id));
            return this.inferMissingEspnLeagueCodes(seasonRows);
        }
        catch (error) {
            if (!this.isMissingSeasonEspnExtractionConfigsTableError(error)) {
                throw error;
            }
            const fallbackQuery = this.db
                .select(baseFields)
                .from(schema_1.seasons)
                .leftJoin(schema_1.sports, (0, drizzle_orm_1.eq)(schema_1.seasons.sportId, schema_1.sports.id))
                .leftJoin(schema_1.leagues, (0, drizzle_orm_1.eq)(schema_1.seasons.leagueId, schema_1.leagues.id));
            const seasonRows = seasonIds && seasonIds.length > 0
                ? await fallbackQuery
                    .where((0, drizzle_orm_1.inArray)(schema_1.seasons.id, seasonIds))
                    .orderBy((0, drizzle_orm_1.desc)(schema_1.seasons.startYear), (0, drizzle_orm_1.asc)(schema_1.leagues.secondaryName), (0, drizzle_orm_1.asc)(schema_1.seasons.id))
                : await fallbackQuery
                    .where((0, drizzle_orm_1.eq)(schema_1.seasons.flgDefault, true))
                    .orderBy((0, drizzle_orm_1.asc)(schema_1.leagues.secondaryName), (0, drizzle_orm_1.desc)(schema_1.seasons.startYear), (0, drizzle_orm_1.asc)(schema_1.seasons.id));
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
    isMissingSeasonEspnExtractionConfigsTableError(error) {
        const candidates = [
            error,
            typeof error === 'object' && error !== null ? error.cause : null,
        ];
        return candidates.some((candidate) => {
            if (!candidate || typeof candidate !== 'object') {
                return false;
            }
            const code = candidate.code;
            const message = String(candidate.message ?? '').toLowerCase();
            return (code === '42P01' || message.includes('relation')) && message.includes('season_espn_extraction_configs');
        });
    }
    mapEspnExtractionSettingsRow(row) {
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
    normalizeEspnExtractionSettingsInput(row, baseline, headerStartDate, headerEndDate) {
        const startDate = this.normalizeDateValue(row.startDate ?? null) ??
            headerStartDate ??
            this.normalizeDateValue(baseline.startDate);
        const endDate = this.normalizeDateValue(row.endDate ?? null) ??
            headerEndDate ??
            this.normalizeDateValue(baseline.endDate);
        if (!startDate || !endDate) {
            throw new common_1.BadRequestException(`Season ${baseline.seasonId} requires both a start date and an end date.`);
        }
        if (startDate > endDate) {
            throw new common_1.BadRequestException(`Season ${baseline.seasonId} has a start date after the end date.`);
        }
        const submittedExternalLeagueCode = typeof row.externalLeagueCode === 'string'
            ? row.externalLeagueCode.trim()
            : '';
        const externalLeagueCode = submittedExternalLeagueCode || String(baseline.externalLeagueCode ?? '').trim();
        if (!externalLeagueCode) {
            throw new common_1.BadRequestException(`Season ${baseline.seasonId} requires the ESPN league code.`);
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
    buildEspnSportRuleDefaults(sportName) {
        const normalizedSportName = String(sportName ?? '').trim().toLowerCase();
        const isFootball = normalizedSportName.includes('football');
        return {
            scheduleType: (isFootball ? 'Round' : 'Date'),
            hasGroups: !isFootball,
            numberOfGroups: isFootball ? 0 : 2,
            hasDivisions: !isFootball,
            runInBackground: isFootball,
            inferClubs: isFootball,
        };
    }
    buildDefaultStartDate(startYear, endYear) {
        return startYear === endYear ? `${startYear}-01-01` : `${startYear}-08-01`;
    }
    buildDefaultEndDate(startYear, endYear) {
        return startYear === endYear ? `${endYear}-12-31` : `${endYear}-05-31`;
    }
    normalizeDateValue(value) {
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
    computeSameYears(startDate, endDate, fallback) {
        if (!startDate || !endDate) {
            return fallback;
        }
        return startDate.slice(0, 4) === endDate.slice(0, 4);
    }
    normalizeScheduleType(value) {
        return String(value ?? '').trim().toLowerCase() === 'round' ? 'Round' : 'Date';
    }
    resolveSeasonStatus(endDate, fallbackStatus) {
        if (!endDate) {
            return this.capitalizeStatus(fallbackStatus ?? 'Finished');
        }
        const endYear = Number(endDate.slice(0, 4));
        if (Number.isInteger(endYear)) {
            return endYear >= new Date().getFullYear() ? 'Active' : 'Finished';
        }
        return this.capitalizeStatus(fallbackStatus ?? 'Finished');
    }
    capitalizeStatus(status) {
        const normalized = String(status ?? '').trim().toLowerCase();
        if (!normalized) {
            return 'Finished';
        }
        return normalized.charAt(0).toUpperCase() + normalized.slice(1);
    }
    resolveLeagueName(row) {
        return row?.league?.secondaryName?.trim() || row?.league?.originalName?.trim() || `League ${row.leagueId}`;
    }
    buildSeasonLabel(startYear, endYear) {
        return `${startYear}/${endYear}`;
    }
    deriveHeaderDefaults(rows) {
        const uniqueStartDates = [...new Set(rows.map((row) => row.startDate).filter(Boolean))];
        const uniqueEndDates = [...new Set(rows.map((row) => row.endDate).filter(Boolean))];
        return {
            startDate: uniqueStartDates.length === 1 ? uniqueStartDates[0] : null,
            endDate: uniqueEndDates.length === 1 ? uniqueEndDates[0] : null,
        };
    }
    async inferMissingEspnLeagueCodes(rows) {
        const rowsMissingLeagueCode = rows.filter((row) => String(row?.extraction?.externalLeagueCode ?? '').trim().length === 0);
        if (rowsMissingLeagueCode.length === 0) {
            return rows;
        }
        const seasonYears = [...new Set(rowsMissingLeagueCode
                .map((row) => Number(row?.startYear))
                .filter((year) => Number.isInteger(year) && year > 0))];
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
    async loadInferredEspnLeagueCodeCandidates(seasonYears) {
        const safeSeasonYears = [...new Set(seasonYears
                .map((year) => Number(year))
                .filter((year) => Number.isInteger(year) && year > 0))];
        if (safeSeasonYears.length === 0) {
            return [];
        }
        try {
            const result = await this.db.execute(drizzle_orm_1.sql.raw(`
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
            return result.rows.map((row) => ({
                season: Number(row.season),
                leagueCode: String(row.leagueCode ?? '').trim(),
                leagueName: typeof row.leagueName === 'string' ? row.leagueName.trim() : null,
            })).filter((row) => Number.isInteger(row.season) && row.season > 0 && row.leagueCode.length > 0);
        }
        catch {
            return [];
        }
    }
    findInferredEspnLeagueCode(row, candidates) {
        const seasonYear = Number(row?.startYear);
        if (!Number.isInteger(seasonYear) || seasonYear <= 0) {
            return null;
        }
        const leagueNames = this.collectEspnLeagueMatchNames(row);
        if (leagueNames.length === 0) {
            return null;
        }
        const matchingCandidate = candidates.find((candidate) => candidate.season === seasonYear && this.matchesEspnLeagueName(candidate.leagueName, leagueNames));
        return matchingCandidate?.leagueCode ?? null;
    }
    collectEspnLeagueMatchNames(row) {
        const names = new Set();
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
    matchesEspnLeagueName(candidateName, leagueNames) {
        const normalizedCandidate = this.normalizeLeagueName(candidateName);
        if (!normalizedCandidate) {
            return false;
        }
        return leagueNames.some((leagueName) => {
            const normalizedLeagueName = this.normalizeLeagueName(leagueName);
            if (!normalizedLeagueName) {
                return false;
            }
            return (normalizedCandidate === normalizedLeagueName ||
                normalizedCandidate.includes(normalizedLeagueName) ||
                normalizedLeagueName.includes(normalizedCandidate) ||
                this.hasAllLeagueTokens(normalizedCandidate, normalizedLeagueName));
        });
    }
    hasAllLeagueTokens(candidate, expected) {
        const candidateTokens = new Set(candidate.split(' ').filter(Boolean));
        const expectedTokens = [...new Set(expected.split(' ').filter(Boolean))];
        return expectedTokens.length > 0 && expectedTokens.every((token) => candidateTokens.has(token));
    }
    normalizeLeagueName(value) {
        return String(value ?? '')
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, ' ')
            .trim();
    }
};
exports.SeasonsService = SeasonsService;
exports.SeasonsService = SeasonsService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)('DRIZZLE')),
    __metadata("design:paramtypes", [node_postgres_1.NodePgDatabase])
], SeasonsService);
//# sourceMappingURL=seasons.service.js.map