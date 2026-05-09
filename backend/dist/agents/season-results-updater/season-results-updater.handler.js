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
Object.defineProperty(exports, "__esModule", { value: true });
exports.ScheduledSeasonResultsUpdaterHandler = void 0;
const promises_1 = require("fs/promises");
const os = require("os");
const path = require("path");
const common_1 = require("@nestjs/common");
const api_service_1 = require("../../api/api.service");
const matches_service_1 = require("../../matches/matches.service");
const seasons_service_1 = require("../../seasons/seasons.service");
const standings_service_1 = require("../../standings/standings.service");
let ScheduledSeasonResultsUpdaterHandler = class ScheduledSeasonResultsUpdaterHandler {
    constructor(seasonsService, matchesService, standingsService, apiService) {
        this.seasonsService = seasonsService;
        this.matchesService = matchesService;
        this.standingsService = standingsService;
        this.apiService = apiService;
        this.definition = {
            agentKey: 'scheduled-season-results-updater',
            name: 'Scheduled Season Results Updater',
            description: 'Scans active seasons against staged ETL payloads and emits a deterministic dry-run update plan.',
            defaultMode: 'dry-run',
            supportsManualTrigger: true,
            supportsSchedule: true,
            supportsEventTrigger: false,
        };
    }
    async run(context) {
        const payload = this.normalizePayload(context.payload);
        const selectionSource = payload.seasonIds.length > 0 ? 'payload-season-ids' : 'default-season';
        const warnings = [];
        const allSeasons = (await this.seasonsService.findAll());
        const candidateSeasons = this.selectCandidateSeasons(allSeasons, payload);
        const missingRequestedSeasonIds = payload.seasonIds.filter((seasonId) => !candidateSeasons.some((season) => season.id === seasonId));
        if (missingRequestedSeasonIds.length > 0) {
            warnings.push(this.buildWarning('SEASON_RESULTS_UPDATER_UNKNOWN_SEASON_IDS', `Ignored unknown season ids: ${missingRequestedSeasonIds.join(', ')}.`, { requestedSeasonIds: payload.seasonIds, missingRequestedSeasonIds }));
        }
        if (candidateSeasons.length === 0) {
            warnings.push(this.buildWarning('SEASON_RESULTS_UPDATER_NO_ACTIVE_SEASONS', 'No active or ongoing seasons were available for the updater to inspect.', { requestedSeasonIds: payload.seasonIds }));
            return {
                status: 'completed',
                summary: 'Scheduled Season Results Updater found no candidate seasons to inspect.',
                actions: [],
                warnings,
                metrics: {
                    readCount: 1,
                    actionCount: 0,
                    warningCount: warnings.length,
                    errorCount: 0,
                    candidateCount: 0,
                },
                result: {
                    selection: {
                        source: selectionSource,
                        requestedSeasonIds: payload.seasonIds,
                        missingRequestedSeasonIds,
                        maxSeasons: payload.maxSeasons,
                        evaluatedAt: context.startedAt.toISOString(),
                    },
                    totals: {
                        evaluatedSeasons: 0,
                        matchedTransitionalLoads: 0,
                        seasonsWithChanges: 0,
                        seasonsWithoutChanges: 0,
                        reviewRequiredSeasons: 0,
                        missingLoadSeasons: 0,
                        proposedMatchUpdates: 0,
                        proposedNewMatches: 0,
                        proposedStandingsWrites: 0,
                        proposedDivisionWrites: 0,
                        proposedRoundCreates: 0,
                    },
                    candidates: [],
                },
            };
        }
        const transitionalSearchLimit = Math.max(200, Math.min(2000, candidateSeasons.length * 25));
        let transitionalRows = (await this.apiService.listTransitional(transitionalSearchLimit));
        const extractionSettingsBySeasonId = (await this.seasonsService.getEspnExtractionSettingsBySeasonIds(candidateSeasons.map((season) => season.id)));
        const actions = [];
        const candidates = [];
        const prefetchBySeasonId = new Map();
        let readCount = 3;
        for (const season of candidateSeasons) {
            const prefetch = await this.prepareSeasonTransitionalRows(season, context.startedAt, transitionalRows, extractionSettingsBySeasonId[season.id], payload.transitionalIdBySeason[season.id]);
            transitionalRows = prefetch.rows;
            prefetchBySeasonId.set(season.id, prefetch);
            readCount += prefetch.readOperations;
            warnings.push(...prefetch.warnings);
        }
        for (const season of candidateSeasons) {
            let inspection = await this.inspectSeason(season, transitionalRows, payload, selectionSource);
            readCount += inspection.readOperations;
            const prefetch = prefetchBySeasonId.get(season.id);
            if (prefetch?.freshRowId && prefetch.replacedRow && inspection.plan.state === 'no-change') {
                const cleanup = await this.cleanupNoChangeFreshPayload(season, inspection.plan, transitionalRows, prefetch.freshRowId, prefetch.replacedRow);
                transitionalRows = cleanup.rows;
                inspection = {
                    ...inspection,
                    plan: cleanup.plan,
                    warnings: [...inspection.warnings, ...cleanup.warnings],
                    readOperations: inspection.readOperations + cleanup.readOperations,
                };
                readCount += cleanup.readOperations;
            }
            candidates.push(inspection.plan);
            warnings.push(...inspection.warnings);
            const seasonActions = await this.buildActionsForInspection(context, inspection.plan);
            warnings.push(...seasonActions.warnings);
            actions.push(...seasonActions.actions);
        }
        const totals = {
            evaluatedSeasons: candidates.length,
            matchedTransitionalLoads: candidates.filter((candidate) => candidate.transitionalSource !== null).length,
            seasonsWithChanges: candidates.filter((candidate) => candidate.plan.hasChanges).length,
            seasonsWithoutChanges: candidates.filter((candidate) => candidate.state === 'no-change').length,
            reviewRequiredSeasons: candidates.filter((candidate) => candidate.state === 'review-required').length,
            missingLoadSeasons: candidates.filter((candidate) => candidate.state === 'missing-transitional-load').length,
            proposedMatchUpdates: candidates.reduce((sum, candidate) => sum + candidate.plan.proposedMatchUpdates, 0),
            proposedNewMatches: candidates.reduce((sum, candidate) => sum + candidate.plan.proposedNewMatches, 0),
            proposedStandingsWrites: candidates.reduce((sum, candidate) => sum + candidate.plan.proposedStandingsWrites, 0),
            proposedDivisionWrites: candidates.reduce((sum, candidate) => sum + candidate.plan.proposedDivisionWrites, 0),
            proposedRoundCreates: candidates.reduce((sum, candidate) => sum + candidate.plan.proposedRoundCreates, 0),
        };
        return {
            status: 'completed',
            summary: this.buildRunSummary(totals),
            actions,
            warnings: warnings.length > 0 ? warnings : undefined,
            metrics: {
                readCount,
                actionCount: actions.length,
                warningCount: warnings.length,
                errorCount: 0,
                candidateCount: candidates.length,
                matchedLoadCount: totals.matchedTransitionalLoads,
                changedCandidateCount: totals.seasonsWithChanges,
            },
            result: {
                selection: {
                    source: selectionSource,
                    requestedSeasonIds: payload.seasonIds,
                    missingRequestedSeasonIds,
                    maxSeasons: payload.maxSeasons,
                    transitionalSearchLimit,
                    evaluatedAt: context.startedAt.toISOString(),
                },
                totals,
                candidates,
            },
        };
    }
    async inspectSeason(season, transitionalRows, payload, selectionSource) {
        const warnings = [];
        let readOperations = 1;
        const allMatches = (await this.matchesService.findByLeagueAndSeason(season.leagueId, season.id));
        const leagueNames = this.collectLeagueNames(season, allMatches);
        const localSnapshot = this.buildLocalSnapshot(season, allMatches);
        let standingsSnapshot = null;
        const latestRegularFinishedMatch = this.findLatestFinishedMatch(allMatches, 'Regular');
        if (latestRegularFinishedMatch?.roundId) {
            const standingsRows = await this.standingsService.findByLeagueIdAndSeasonIdAndRoundId(season.leagueId, season.id, latestRegularFinishedMatch.roundId);
            readOperations += 1;
            standingsSnapshot = {
                basis: 'round',
                reference: latestRegularFinishedMatch.round?.roundNumber ?? latestRegularFinishedMatch.roundId,
                rowCount: standingsRows.length,
            };
        }
        else if (latestRegularFinishedMatch?.date) {
            const matchDate = this.toDateKey(latestRegularFinishedMatch.date);
            if (matchDate) {
                const standingsRows = await this.standingsService.findByLeagueIdAndSeasonIdAndMatchDate(season.leagueId, season.id, matchDate);
                readOperations += 1;
                standingsSnapshot = {
                    basis: 'date',
                    reference: matchDate,
                    rowCount: standingsRows.length,
                };
            }
        }
        const transitionalSelection = await this.findMatchingTransitionalRow(season, leagueNames, transitionalRows, payload.transitionalIdBySeason[season.id]);
        readOperations += transitionalSelection.readOperations;
        if (!transitionalSelection.selectedRow) {
            if (transitionalSelection.pendingRow) {
                warnings.push(this.buildWarning('SEASON_RESULTS_UPDATER_FETCH_PENDING', `${leagueNames[0] ?? `Season ${season.id}`} has a matching staged payload, but the fetch is still ${transitionalSelection.pendingRow.fetch_status ?? 'pending'}.`, {
                    seasonId: season.id,
                    transitionalId: transitionalSelection.pendingRow.id,
                    fetchStatus: transitionalSelection.pendingRow.fetch_status ?? null,
                }));
            }
            else {
                warnings.push(this.buildWarning('SEASON_RESULTS_UPDATER_NO_TRANSITIONAL_MATCH', `${leagueNames[0] ?? `Season ${season.id}`} has no matching staged ETL payload to inspect.`, {
                    seasonId: season.id,
                    sportId: season.sportId,
                    startYear: season.startYear,
                    leagueNames,
                }));
            }
            return {
                plan: {
                    seasonId: season.id,
                    leagueId: season.leagueId,
                    sportId: season.sportId,
                    seasonLabel: this.buildSeasonLabel(season),
                    seasonStatus: season.status,
                    sportName: season.sport?.name ?? null,
                    leagueNames,
                    selectionSource,
                    currentPhase: season.currentPhase,
                    currentPhaseDetail: season.currentPhaseDetail,
                    state: transitionalSelection.pendingRow ? 'fetch-pending' : 'missing-transitional-load',
                    localSnapshot,
                    standingsSnapshot,
                    transitionalSource: transitionalSelection.pendingRow
                        ? {
                            id: transitionalSelection.pendingRow.id,
                            externalLeagueCode: transitionalSelection.pendingRow.league ?? null,
                            parsedLeagueName: null,
                            origin: transitionalSelection.pendingRow.origin ?? null,
                            fetchedAt: this.toIsoString(transitionalSelection.pendingRow.fetched_at),
                            fetchStatus: transitionalSelection.pendingRow.fetch_status ?? null,
                            alreadyApplied: transitionalSelection.pendingRow.status ?? null,
                            matchedBy: null,
                        }
                        : null,
                    plan: {
                        hasChanges: false,
                        proposedMatchUpdates: 0,
                        proposedNewMatches: 0,
                        proposedStandingsWrites: 0,
                        proposedDivisionWrites: 0,
                        proposedRoundCreates: 0,
                        skippedUnchanged: 0,
                        downstreamRecalculationNeeded: false,
                        dryRunReason: transitionalSelection.pendingRow ? 'fetch_not_complete' : 'no_matching_transitional_load',
                        dryRunError: null,
                    },
                },
                warnings,
                readOperations,
            };
        }
        const dryRunResult = this.normalizeDryRunResult(await this.apiService.applyAllRowsToApp(transitionalSelection.selectedRow.id, {
            sportId: season.sportId,
            leagueId: season.leagueId,
            seasonId: season.id,
            dryRun: true,
            seasonPhase: this.resolveSeasonPhaseFilter(season.currentPhase),
        }));
        readOperations += 1;
        if (dryRunResult.reason === 'fetch_not_complete') {
            warnings.push(this.buildWarning('SEASON_RESULTS_UPDATER_FETCH_PENDING', `${leagueNames[0] ?? `Season ${season.id}`} matched a staged payload, but it is not ready for dry-run inspection yet.`, {
                seasonId: season.id,
                transitionalId: transitionalSelection.selectedRow.id,
                reason: dryRunResult.reason,
                details: dryRunResult.details,
            }));
        }
        else if (dryRunResult.reason && this.isReviewRequiredReason(dryRunResult.reason)) {
            warnings.push(this.buildWarning('SEASON_RESULTS_UPDATER_REVIEW_REQUIRED', `${leagueNames[0] ?? `Season ${season.id}`} needs ETL review before the updater can build a clean plan.`, {
                seasonId: season.id,
                transitionalId: transitionalSelection.selectedRow.id,
                reason: dryRunResult.reason,
                details: dryRunResult.details,
            }));
        }
        else if (dryRunResult.error) {
            warnings.push(this.buildWarning('SEASON_RESULTS_UPDATER_DRY_RUN_ERROR', `${leagueNames[0] ?? `Season ${season.id}`} dry-run planning returned an error.`, {
                seasonId: season.id,
                transitionalId: transitionalSelection.selectedRow.id,
                reason: dryRunResult.reason,
                error: dryRunResult.error,
            }));
        }
        const hasChanges = dryRunResult.createdMatches +
            dryRunResult.updatedMatches +
            dryRunResult.createdStandings +
            dryRunResult.createdDivisions +
            dryRunResult.createdRounds >
            0;
        return {
            plan: {
                seasonId: season.id,
                leagueId: season.leagueId,
                sportId: season.sportId,
                seasonLabel: this.buildSeasonLabel(season),
                seasonStatus: season.status,
                sportName: season.sport?.name ?? null,
                leagueNames,
                selectionSource,
                currentPhase: season.currentPhase,
                currentPhaseDetail: season.currentPhaseDetail,
                state: this.resolvePlanState(dryRunResult, hasChanges),
                localSnapshot,
                standingsSnapshot,
                transitionalSource: {
                    id: transitionalSelection.selectedRow.id,
                    externalLeagueCode: transitionalSelection.selectedRow.league ?? null,
                    parsedLeagueName: transitionalSelection.parsedLeagueName,
                    origin: transitionalSelection.selectedRow.origin ?? null,
                    fetchedAt: this.toIsoString(transitionalSelection.selectedRow.fetched_at),
                    fetchStatus: transitionalSelection.selectedRow.fetch_status ?? null,
                    alreadyApplied: transitionalSelection.selectedRow.status ?? null,
                    matchedBy: transitionalSelection.matchedBy,
                },
                plan: {
                    hasChanges,
                    proposedMatchUpdates: dryRunResult.updatedMatches,
                    proposedNewMatches: dryRunResult.createdMatches,
                    proposedStandingsWrites: dryRunResult.createdStandings,
                    proposedDivisionWrites: dryRunResult.createdDivisions,
                    proposedRoundCreates: dryRunResult.createdRounds,
                    skippedUnchanged: dryRunResult.skippedUnchanged,
                    downstreamRecalculationNeeded: dryRunResult.createdStandings > 0,
                    dryRunReason: dryRunResult.reason,
                    dryRunError: dryRunResult.error,
                },
            },
            warnings,
            readOperations,
        };
    }
    async prepareSeasonTransitionalRows(season, startedAt, transitionalRows, extractionSettings, requestedTransitionalId) {
        const warnings = [];
        let readOperations = 0;
        if (requestedTransitionalId) {
            return { rows: transitionalRows, warnings, readOperations, freshRowId: null, replacedRow: null };
        }
        const seedLeagueNames = this.collectSeedLeagueNames(season);
        const currentSelection = await this.findMatchingTransitionalRow(season, seedLeagueNames, transitionalRows);
        readOperations += currentSelection.readOperations;
        if (currentSelection.pendingRow) {
            return { rows: transitionalRows, warnings, readOperations, freshRowId: null, replacedRow: null };
        }
        if (currentSelection.selectedRow && this.isFreshForRun(currentSelection.selectedRow, startedAt)) {
            return { rows: transitionalRows, warnings, readOperations, freshRowId: null, replacedRow: null };
        }
        if (extractionSettings?.isConfigured) {
            try {
                const fetched = await this.apiService.fetchAndStore(extractionSettings.externalLeagueCode, season.startYear, season.sportId, 'Api-Espn', extractionSettings.startDate, extractionSettings.endDate, extractionSettings.seasonStatus, extractionSettings.isSeasonDefault, extractionSettings.sameYears, extractionSettings.hasPostseason, extractionSettings.scheduleType, extractionSettings.isLeagueDefault, extractionSettings.hasDivisions, extractionSettings.hasGroups, extractionSettings.numberOfGroups, extractionSettings.runInBackground, extractionSettings.inferClubs);
                const fetchedRow = {
                    id: Number(fetched.id),
                    league: extractionSettings.externalLeagueCode,
                    season: season.startYear,
                    sport: season.sportId,
                    origin: 'Api-Espn',
                    source_url: null,
                    status: false,
                    fetched_at: fetched.fetched_at ?? startedAt.toISOString(),
                    fetch_status: fetched.background === true ? 'fetching' : 'done',
                    season_status: extractionSettings.seasonStatus,
                    flg_season_default: extractionSettings.isSeasonDefault,
                    flg_season_same_years: extractionSettings.sameYears,
                    league_schedule_type: extractionSettings.scheduleType,
                    flg_league_default: extractionSettings.isLeagueDefault,
                    flg_has_divisions: extractionSettings.hasDivisions,
                    flg_has_groups: extractionSettings.hasGroups,
                    number_of_groups: extractionSettings.numberOfGroups,
                    flg_run_in_background: extractionSettings.runInBackground,
                    flg_infer_clubs: extractionSettings.inferClubs,
                    flg_has_postseason: extractionSettings.hasPostseason,
                };
                return {
                    rows: [fetchedRow, ...transitionalRows.filter((row) => row.id !== fetchedRow.id)].slice(0, transitionalRows.length + 1),
                    warnings,
                    readOperations,
                    freshRowId: fetchedRow.id,
                    replacedRow: currentSelection.selectedRow,
                };
            }
            catch (error) {
                warnings.push(this.buildWarning('SEASON_RESULTS_UPDATER_FETCH_FAILED', `${seedLeagueNames[0] ?? `Season ${season.id}`} could not generate a fresh ETL extraction from the saved ESPN season settings.`, {
                    seasonId: season.id,
                    externalLeagueCode: extractionSettings.externalLeagueCode,
                    error: error instanceof Error ? error.message : String(error),
                }));
                return { rows: transitionalRows, warnings, readOperations, freshRowId: null, replacedRow: null };
            }
        }
        const template = currentSelection.selectedRow
            ? {
                row: currentSelection.selectedRow,
                parsedLeagueName: currentSelection.parsedLeagueName,
                readOperations: 0,
            }
            : await this.findReusableFetchTemplate(season, seedLeagueNames, transitionalRows);
        readOperations += template?.readOperations ?? 0;
        if (!template) {
            warnings.push(this.buildWarning('SEASON_RESULTS_UPDATER_FETCH_TEMPLATE_MISSING', `${seedLeagueNames[0] ?? `Season ${season.id}`} has no historical ETL template to generate a fresh extraction automatically.`, {
                seasonId: season.id,
                sportId: season.sportId,
                leagueNames: seedLeagueNames,
            }));
            return { rows: transitionalRows, warnings, readOperations, freshRowId: null, replacedRow: null };
        }
        const externalLeagueCode = this.resolveExternalLeagueCode(template.row);
        if (!externalLeagueCode) {
            warnings.push(this.buildWarning('SEASON_RESULTS_UPDATER_FETCH_TEMPLATE_INVALID', `${seedLeagueNames[0] ?? `Season ${season.id}`} has ETL history, but the updater could not recover the external league code needed to refetch it.`, {
                seasonId: season.id,
                templateTransitionalId: template.row.id,
                parsedLeagueName: template.parsedLeagueName,
                storedLeagueCode: template.row.league ?? null,
                sourceUrl: template.row.source_url ?? null,
            }));
            return { rows: transitionalRows, warnings, readOperations, freshRowId: null, replacedRow: null };
        }
        try {
            const sameYears = template.row.flg_season_same_years ?? season.startYear === season.endYear;
            const fetched = await this.apiService.fetchAndStore(externalLeagueCode, season.startYear, season.sportId, template.row.origin ?? 'Api-Football', undefined, undefined, template.row.season_status ?? season.status, template.row.flg_season_default ?? season.flgDefault, sameYears, template.row.flg_has_postseason ?? season.flgHasPostseason ?? false, template.row.league_schedule_type ?? 'Round', template.row.flg_league_default ?? false, template.row.flg_has_divisions ?? true, template.row.flg_has_groups ?? (season.numberOfGroups ?? 0) > 0, template.row.number_of_groups ?? season.numberOfGroups ?? 0, false, template.row.flg_infer_clubs ?? false);
            const fetchedRow = {
                id: Number(fetched.id),
                league: externalLeagueCode,
                season: season.startYear,
                sport: season.sportId,
                origin: template.row.origin ?? 'Api-Football',
                source_url: template.row.source_url ?? null,
                status: false,
                fetched_at: fetched.fetched_at ?? startedAt.toISOString(),
                fetch_status: fetched.background === true ? 'fetching' : 'done',
                season_status: template.row.season_status ?? season.status,
                flg_season_default: template.row.flg_season_default ?? season.flgDefault,
                flg_season_same_years: sameYears,
                league_schedule_type: template.row.league_schedule_type ?? 'Round',
                flg_league_default: template.row.flg_league_default ?? false,
                flg_has_divisions: template.row.flg_has_divisions ?? true,
                flg_has_groups: template.row.flg_has_groups ?? (season.numberOfGroups ?? 0) > 0,
                number_of_groups: template.row.number_of_groups ?? season.numberOfGroups ?? 0,
                flg_run_in_background: false,
                flg_infer_clubs: template.row.flg_infer_clubs ?? false,
                flg_has_postseason: template.row.flg_has_postseason ?? season.flgHasPostseason ?? false,
            };
            return {
                rows: [fetchedRow, ...transitionalRows.filter((row) => row.id !== fetchedRow.id)].slice(0, transitionalRows.length + 1),
                warnings,
                readOperations,
                freshRowId: fetchedRow.id,
                replacedRow: currentSelection.selectedRow,
            };
        }
        catch (error) {
            warnings.push(this.buildWarning('SEASON_RESULTS_UPDATER_FETCH_FAILED', `${seedLeagueNames[0] ?? `Season ${season.id}`} could not generate a fresh ETL extraction before dry-run planning.`, {
                seasonId: season.id,
                templateTransitionalId: template.row.id,
                externalLeagueCode,
                error: error instanceof Error ? error.message : String(error),
            }));
            return { rows: transitionalRows, warnings, readOperations, freshRowId: null, replacedRow: null };
        }
    }
    async cleanupNoChangeFreshPayload(season, plan, transitionalRows, freshRowId, replacedRow) {
        try {
            await this.apiService.deleteTransitional(freshRowId);
            return {
                plan: {
                    ...plan,
                    transitionalSource: {
                        id: replacedRow.id,
                        externalLeagueCode: replacedRow.league ?? null,
                        parsedLeagueName: plan.transitionalSource?.parsedLeagueName ?? null,
                        origin: replacedRow.origin ?? null,
                        fetchedAt: this.toIsoString(replacedRow.fetched_at),
                        fetchStatus: replacedRow.fetch_status ?? null,
                        alreadyApplied: replacedRow.status ?? null,
                        matchedBy: plan.transitionalSource?.matchedBy ?? null,
                    },
                },
                rows: transitionalRows.filter((row) => row.id !== freshRowId),
                warnings: [
                    this.buildWarning('SEASON_RESULTS_UPDATER_DISCARDED_NO_CHANGE_PAYLOAD', `${plan.leagueNames[0] ?? `Season ${season.id}`} was already up to date, so the freshly generated staged payload was discarded.`, {
                        seasonId: season.id,
                        discardedTransitionalId: freshRowId,
                        retainedTransitionalId: replacedRow.id,
                    }),
                ],
                readOperations: 1,
            };
        }
        catch (error) {
            return {
                plan,
                rows: transitionalRows,
                warnings: [
                    this.buildWarning('SEASON_RESULTS_UPDATER_NO_CHANGE_CLEANUP_FAILED', `${plan.leagueNames[0] ?? `Season ${season.id}`} had no changes, but the updater could not discard the redundant staged payload.`, {
                        seasonId: season.id,
                        transitionalId: freshRowId,
                        error: error instanceof Error ? error.message : String(error),
                    }),
                ],
                readOperations: 1,
            };
        }
    }
    normalizePayload(payload) {
        const source = payload && typeof payload === 'object' ? payload : {};
        const seasonIds = Array.isArray(source.seasonIds)
            ? source.seasonIds
                .map((seasonId) => Number(seasonId))
                .filter((seasonId) => Number.isInteger(seasonId) && seasonId > 0)
            : [];
        const maxSeasonsValue = Number(source.maxSeasons);
        const maxSeasons = Number.isInteger(maxSeasonsValue) && maxSeasonsValue > 0 ? maxSeasonsValue : null;
        const transitionalIdSource = source.transitionalIdBySeason && typeof source.transitionalIdBySeason === 'object'
            ? source.transitionalIdBySeason
            : {};
        const transitionalIdBySeason = Object.entries(transitionalIdSource).reduce((result, [key, value]) => {
            const seasonId = Number(key);
            const transitionalId = Number(value);
            if (Number.isInteger(seasonId) && seasonId > 0 && Number.isInteger(transitionalId) && transitionalId > 0) {
                result[seasonId] = transitionalId;
            }
            return result;
        }, {});
        return {
            seasonIds,
            maxSeasons,
            transitionalIdBySeason,
        };
    }
    selectCandidateSeasons(allSeasons, payload) {
        const selected = payload.seasonIds.length > 0
            ? allSeasons.filter((season) => payload.seasonIds.includes(season.id))
            : allSeasons.filter((season) => season.flgDefault);
        const ordered = [...selected].sort((left, right) => {
            if (left.startYear !== right.startYear) {
                return right.startYear - left.startYear;
            }
            if (left.leagueId !== right.leagueId) {
                return left.leagueId - right.leagueId;
            }
            return left.id - right.id;
        });
        return payload.maxSeasons ? ordered.slice(0, payload.maxSeasons) : ordered;
    }
    collectSeedLeagueNames(season) {
        const names = new Set();
        const originalName = season.league?.originalName?.trim();
        if (originalName) {
            names.add(originalName);
        }
        const secondaryName = season.league?.secondaryName?.trim();
        if (secondaryName) {
            names.add(secondaryName);
        }
        return [...names];
    }
    async findMatchingTransitionalRow(season, leagueNames, transitionalRows, requestedTransitionalId) {
        let readOperations = 0;
        if (requestedTransitionalId) {
            const requestedRow = transitionalRows.find((row) => Number(row.id) === requestedTransitionalId) ?? null;
            if (!requestedRow) {
                return {
                    selectedRow: null,
                    pendingRow: null,
                    parsedLeagueName: null,
                    matchedBy: null,
                    readOperations,
                };
            }
            if (requestedRow.fetch_status && requestedRow.fetch_status !== 'done') {
                return {
                    selectedRow: null,
                    pendingRow: requestedRow,
                    parsedLeagueName: null,
                    matchedBy: null,
                    readOperations,
                };
            }
            const requestedDetail = await this.apiService.getTransitional(requestedRow.id);
            readOperations += 1;
            return {
                selectedRow: requestedRow,
                pendingRow: null,
                parsedLeagueName: this.extractRawLeagueName(requestedDetail),
                matchedBy: 'payload-override',
                readOperations,
            };
        }
        const seasonRows = transitionalRows.filter((row) => Number(row.sport ?? 0) === season.sportId && Number(row.season ?? 0) === season.startYear);
        const pendingRow = seasonRows.find((row) => row.fetch_status && row.fetch_status !== 'done') ?? null;
        const readyRows = seasonRows.filter((row) => !row.fetch_status || row.fetch_status === 'done').slice(0, 6);
        if (readyRows.length === 0) {
            return {
                selectedRow: null,
                pendingRow,
                parsedLeagueName: null,
                matchedBy: null,
                readOperations,
            };
        }
        if (readyRows.length === 1 && leagueNames.length === 0) {
            const detail = await this.apiService.getTransitional(readyRows[0].id);
            readOperations += 1;
            return {
                selectedRow: readyRows[0],
                pendingRow: null,
                parsedLeagueName: this.extractRawLeagueName(detail),
                matchedBy: 'single-candidate',
                readOperations,
            };
        }
        for (const row of readyRows) {
            const detail = await this.apiService.getTransitional(row.id);
            readOperations += 1;
            const parsedLeagueName = this.extractRawLeagueName(detail);
            if (readyRows.length === 1 || this.matchesLeagueName(parsedLeagueName, leagueNames)) {
                return {
                    selectedRow: row,
                    pendingRow: null,
                    parsedLeagueName,
                    matchedBy: readyRows.length === 1 ? 'single-candidate' : 'league-name',
                    readOperations,
                };
            }
        }
        return {
            selectedRow: null,
            pendingRow,
            parsedLeagueName: null,
            matchedBy: null,
            readOperations,
        };
    }
    async findReusableFetchTemplate(season, leagueNames, transitionalRows) {
        let readOperations = 0;
        const candidateRows = transitionalRows
            .filter((row) => Number(row.sport ?? 0) === season.sportId)
            .filter((row) => !row.fetch_status || row.fetch_status === 'done')
            .sort((left, right) => this.compareFetchedAt(right.fetched_at, left.fetched_at));
        for (const row of candidateRows.slice(0, 12)) {
            if (!this.resolveExternalLeagueCode(row)) {
                continue;
            }
            if (this.matchesLeagueName(row.league ?? null, leagueNames)) {
                return {
                    row,
                    parsedLeagueName: row.league ?? null,
                    readOperations,
                };
            }
            const detail = await this.apiService.getTransitional(row.id);
            readOperations += 1;
            const parsedLeagueName = this.extractRawLeagueName(detail);
            if (this.matchesLeagueName(parsedLeagueName, leagueNames)) {
                return {
                    row,
                    parsedLeagueName,
                    readOperations,
                };
            }
        }
        return null;
    }
    buildLocalSnapshot(season, matches) {
        const finishedMatches = matches.filter((match) => this.isFinishedMatch(match.status)).length;
        const latestFinishedMatch = this.findLatestFinishedMatch(matches);
        const currentPhaseMatchCount = matches.filter((match) => {
            if (match.seasonPhase !== season.currentPhase) {
                return false;
            }
            if (season.currentPhase === 'Regular') {
                return true;
            }
            return match.seasonPhaseDetail === season.currentPhaseDetail;
        }).length;
        return {
            totalMatches: matches.length,
            finishedMatches,
            pendingMatches: matches.length - finishedMatches,
            currentPhaseMatchCount,
            latestFinishedMatch: latestFinishedMatch
                ? {
                    matchId: latestFinishedMatch.id,
                    date: this.toIsoString(latestFinishedMatch.date),
                    roundId: latestFinishedMatch.roundId ?? null,
                    roundNumber: latestFinishedMatch.round?.roundNumber ?? null,
                    seasonPhase: latestFinishedMatch.seasonPhase ?? null,
                    seasonPhaseDetail: latestFinishedMatch.seasonPhaseDetail ?? null,
                    homeClub: latestFinishedMatch.homeClub?.shortName ?? latestFinishedMatch.homeClub?.name ?? null,
                    awayClub: latestFinishedMatch.awayClub?.shortName ?? latestFinishedMatch.awayClub?.name ?? null,
                    score: latestFinishedMatch.homeScore != null && latestFinishedMatch.awayScore != null
                        ? `${latestFinishedMatch.homeScore}-${latestFinishedMatch.awayScore}`
                        : null,
                }
                : null,
        };
    }
    findLatestFinishedMatch(matches, seasonPhase) {
        for (let index = matches.length - 1; index >= 0; index -= 1) {
            const match = matches[index];
            if (!this.isFinishedMatch(match.status)) {
                continue;
            }
            if (seasonPhase && match.seasonPhase !== seasonPhase) {
                continue;
            }
            return match;
        }
        return null;
    }
    isFinishedMatch(status) {
        return String(status ?? '').trim().toLowerCase() === 'finished';
    }
    collectLeagueNames(season, matches) {
        const names = new Set();
        const originalName = season.league?.originalName?.trim();
        if (originalName) {
            names.add(originalName);
        }
        const secondaryName = season.league?.secondaryName?.trim();
        if (secondaryName) {
            names.add(secondaryName);
        }
        for (const match of matches) {
            const originalName = match.league?.originalName?.trim();
            if (originalName) {
                names.add(originalName);
            }
        }
        return [...names];
    }
    matchesLeagueName(candidateName, leagueNames) {
        if (!candidateName) {
            return false;
        }
        const normalizedCandidate = this.normalizeName(candidateName);
        return leagueNames.some((leagueName) => {
            const normalizedLeagueName = this.normalizeName(leagueName);
            return (normalizedCandidate === normalizedLeagueName ||
                normalizedCandidate.includes(normalizedLeagueName) ||
                normalizedLeagueName.includes(normalizedCandidate));
        });
    }
    normalizeName(value) {
        return String(value ?? '')
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, ' ')
            .trim();
    }
    resolveExternalLeagueCode(row) {
        const storedLeagueCode = String(row.league ?? '').trim();
        if (storedLeagueCode.length > 0) {
            return storedLeagueCode;
        }
        const sourceUrl = String(row.source_url ?? '').trim();
        if (!sourceUrl) {
            return null;
        }
        try {
            const parsedUrl = new URL(sourceUrl);
            const segments = parsedUrl.pathname.split('/').filter(Boolean);
            const scoreboardIndex = segments.lastIndexOf('scoreboard');
            if (scoreboardIndex > 0) {
                return segments[scoreboardIndex - 1] ?? null;
            }
        }
        catch {
            return null;
        }
        return null;
    }
    isFreshForRun(row, startedAt) {
        const fetchedAt = this.toComparableTime(row.fetched_at);
        const runStartedAt = startedAt.getTime();
        return fetchedAt !== null && fetchedAt >= runStartedAt;
    }
    compareFetchedAt(left, right) {
        const leftValue = this.toComparableTime(left) ?? Number.NEGATIVE_INFINITY;
        const rightValue = this.toComparableTime(right) ?? Number.NEGATIVE_INFINITY;
        return leftValue - rightValue;
    }
    toComparableTime(value) {
        if (!value) {
            return null;
        }
        if (value instanceof Date) {
            return Number.isNaN(value.getTime()) ? null : value.getTime();
        }
        const parsed = new Date(value);
        return Number.isNaN(parsed.getTime()) ? null : parsed.getTime();
    }
    extractRawLeagueName(transitionalRow) {
        const payload = transitionalRow?.payload ?? {};
        const origin = transitionalRow?.origin ?? 'Api-Football';
        if (origin === 'Api-Espn') {
            return payload?.leagues?.[0]?.name ?? payload?.leagues?.[0]?.abbreviation ?? null;
        }
        if (Array.isArray(payload?.response) && payload.response.length > 0) {
            return payload.response[0]?.league?.name ?? null;
        }
        if (Array.isArray(payload?.data) && payload.data.length > 0) {
            return payload.data[0]?.league?.name ?? null;
        }
        if (Array.isArray(payload) && payload.length > 0) {
            return payload[0]?.league?.name ?? null;
        }
        return payload?.league?.name ?? null;
    }
    normalizeDryRunResult(result) {
        return {
            applied: Number(result?.applied ?? 0),
            createdMatches: Number(result?.createdMatches ?? 0),
            updatedMatches: Number(result?.updatedMatches ?? 0),
            createdStandings: Number(result?.createdStandings ?? 0),
            createdDivisions: Number(result?.createdDivisions ?? 0),
            createdRounds: Number(result?.createdRounds ?? 0),
            skippedUnchanged: Number(result?.skippedUnchanged ?? 0),
            dryRun: result?.dryRun !== false,
            isSubsequentLoad: result?.isSubsequentLoad === true,
            enrichmentQueued: Number(result?.enrichmentQueued ?? 0),
            reason: typeof result?.reason === 'string' ? result.reason : null,
            error: typeof result?.error === 'string' ? result.error : null,
            details: result?.details ?? null,
        };
    }
    resolvePlanState(dryRunResult, hasChanges) {
        if (dryRunResult.reason === 'fetch_not_complete') {
            return 'fetch-pending';
        }
        if ((dryRunResult.reason && this.isReviewRequiredReason(dryRunResult.reason)) || dryRunResult.error) {
            return 'review-required';
        }
        return hasChanges ? 'planned-update' : 'no-change';
    }
    isReviewRequiredReason(reason) {
        return (reason === 'needs_round_review' ||
            reason === 'round_assignment_conflict' ||
            reason === 'first_row_failed' ||
            reason === 'lightweight_parse_failed');
    }
    buildReadAction(plan) {
        return {
            actionKey: `season-plan-${plan.seasonId}`,
            kind: 'read',
            writeDisposition: 'read-only',
            summary: this.buildActionSummary(plan),
            targetType: 'season',
            targetId: String(plan.seasonId),
            payload: {
                seasonId: plan.seasonId,
                leagueId: plan.leagueId,
                sportId: plan.sportId,
                seasonLabel: plan.seasonLabel,
                state: plan.state,
                transitionalId: plan.transitionalSource?.id ?? null,
                currentPhase: plan.currentPhase,
                currentPhaseDetail: plan.currentPhaseDetail,
                plan: plan.plan,
            },
        };
    }
    async buildActionsForInspection(context, plan) {
        const actions = [this.buildReadAction(plan)];
        const warnings = [];
        if (plan.state !== 'planned-update' || !plan.transitionalSource?.id) {
            return { actions, warnings };
        }
        const artifact = await this.createExecutionArtifact(context, plan);
        if (artifact.warning) {
            warnings.push(artifact.warning);
        }
        actions.push(this.buildWriteAction(plan, artifact.artifactPath));
        return { actions, warnings };
    }
    buildWriteAction(plan, generatedArtifactPath) {
        const leagueLabel = plan.leagueNames[0] ?? `Season ${plan.seasonId}`;
        const payload = {
            executor: 'scheduled-season-results-updater.apply-season-plan',
            transitionalId: plan.transitionalSource.id,
            sportId: plan.sportId,
            leagueId: plan.leagueId,
            seasonId: plan.seasonId,
            seasonLabel: `${leagueLabel} ${plan.seasonLabel}`,
            seasonPhase: this.resolveSeasonPhaseFilter(plan.currentPhase),
            currentPhaseDetail: plan.currentPhaseDetail,
            expectedPlan: plan.plan,
        };
        return {
            actionKey: `apply-season-results-${plan.seasonId}`,
            kind: 'write',
            writeDisposition: 'approval-required',
            requiresApproval: true,
            summary: `${leagueLabel} ${plan.seasonLabel}: apply ${plan.plan.proposedMatchUpdates} staged match update(s), ${plan.plan.proposedNewMatches} new match(es), and ${plan.plan.proposedStandingsWrites} standings write(s).`,
            targetType: 'season',
            targetId: String(plan.seasonId),
            payload,
            generatedArtifactPath: generatedArtifactPath ?? undefined,
        };
    }
    async createExecutionArtifact(context, plan) {
        const artifactBaseDir = process.env.AGENT_ARTIFACTS_DIR?.trim()
            ? path.resolve(process.env.AGENT_ARTIFACTS_DIR.trim())
            : process.env.NODE_ENV === 'test'
                ? path.join(os.tmpdir(), 'championships-agent-artifacts', context.agentKey)
                : path.resolve(process.cwd(), 'agent-artifacts', context.agentKey);
        const timestampToken = context.startedAt.toISOString().replace(/[:.]/g, '-');
        const artifactPath = path.join(artifactBaseDir, `${timestampToken}-season-${plan.seasonId}.json`);
        const artifactPayload = {
            agentKey: context.agentKey,
            generatedAt: context.startedAt.toISOString(),
            triggerType: context.triggerType,
            triggerSource: context.triggerSource,
            mode: context.mode,
            season: {
                id: plan.seasonId,
                label: plan.seasonLabel,
                leagueId: plan.leagueId,
                sportId: plan.sportId,
                leagueNames: plan.leagueNames,
                currentPhase: plan.currentPhase,
                currentPhaseDetail: plan.currentPhaseDetail,
            },
            transitionalSource: plan.transitionalSource,
            expectedPlan: plan.plan,
            localSnapshot: plan.localSnapshot,
            standingsSnapshot: plan.standingsSnapshot,
            executionRequest: {
                executor: 'scheduled-season-results-updater.apply-season-plan',
                transitionalId: plan.transitionalSource?.id ?? null,
                sportId: plan.sportId,
                leagueId: plan.leagueId,
                seasonId: plan.seasonId,
                seasonPhase: this.resolveSeasonPhaseFilter(plan.currentPhase) ?? null,
            },
        };
        try {
            await (0, promises_1.mkdir)(artifactBaseDir, { recursive: true });
            await (0, promises_1.writeFile)(artifactPath, JSON.stringify(artifactPayload, null, 2), 'utf8');
            return { artifactPath };
        }
        catch (error) {
            return {
                artifactPath: null,
                warning: this.buildWarning('SEASON_RESULTS_UPDATER_ARTIFACT_WRITE_FAILED', `The updater could not write the human-review artifact for season ${plan.seasonId}.`, {
                    seasonId: plan.seasonId,
                    attemptedArtifactPath: artifactPath,
                    error: error instanceof Error ? error.message : String(error),
                }),
            };
        }
    }
    buildActionSummary(plan) {
        const leagueLabel = plan.leagueNames[0] ?? `Season ${plan.seasonId}`;
        if (plan.state === 'planned-update') {
            return `${leagueLabel} ${plan.seasonLabel}: planned ${plan.plan.proposedMatchUpdates} match updates, ${plan.plan.proposedNewMatches} new matches, and ${plan.plan.proposedStandingsWrites} standings writes.`;
        }
        if (plan.state === 'fetch-pending') {
            return `${leagueLabel} ${plan.seasonLabel}: staged payload found, but fetch is still pending.`;
        }
        if (plan.state === 'review-required') {
            return `${leagueLabel} ${plan.seasonLabel}: dry-run planning surfaced a review requirement before writes can be proposed.`;
        }
        if (plan.state === 'missing-transitional-load') {
            return `${leagueLabel} ${plan.seasonLabel}: no matching staged payload was available for planning.`;
        }
        return `${leagueLabel} ${plan.seasonLabel}: dry-run planning found no pending result or standings changes.`;
    }
    buildRunSummary(totals) {
        const summaryParts = [
            `Checked ${totals.evaluatedSeasons} current season(s)`,
            `${totals.seasonsWithChanges} need update action(s)`,
            `${totals.seasonsWithoutChanges} are already up to date`,
        ];
        if (totals.reviewRequiredSeasons > 0) {
            summaryParts.push(`${totals.reviewRequiredSeasons} need review`);
        }
        if (totals.missingLoadSeasons > 0) {
            summaryParts.push(`${totals.missingLoadSeasons} had no usable staged load`);
        }
        summaryParts.push(`detected ${totals.proposedMatchUpdates} match update(s), ${totals.proposedNewMatches} new match(es), and ${totals.proposedStandingsWrites} standings write(s)`);
        return `${summaryParts.join('; ')}.`;
    }
    buildWarning(code, message, details) {
        return { code, message, details };
    }
    buildSeasonLabel(season) {
        return `${season.startYear}/${season.endYear}`;
    }
    resolveSeasonPhaseFilter(currentPhase) {
        const normalizedPhase = String(currentPhase ?? '').trim();
        return normalizedPhase.length > 0 ? normalizedPhase : undefined;
    }
    toIsoString(value) {
        if (!value) {
            return null;
        }
        if (value instanceof Date) {
            return Number.isNaN(value.getTime()) ? null : value.toISOString();
        }
        const date = new Date(value);
        return Number.isNaN(date.getTime()) ? String(value) : date.toISOString();
    }
    toDateKey(value) {
        const isoString = this.toIsoString(value);
        return isoString ? isoString.slice(0, 10) : null;
    }
};
exports.ScheduledSeasonResultsUpdaterHandler = ScheduledSeasonResultsUpdaterHandler;
exports.ScheduledSeasonResultsUpdaterHandler = ScheduledSeasonResultsUpdaterHandler = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [seasons_service_1.SeasonsService,
        matches_service_1.MatchesService,
        standings_service_1.StandingsService,
        api_service_1.ApiService])
], ScheduledSeasonResultsUpdaterHandler);
//# sourceMappingURL=season-results-updater.handler.js.map