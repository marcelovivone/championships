export declare class ApiService {
    private readonly logger;
    importData(payload: any): Promise<{
        id: any;
        fetched_at: any;
    }>;
    extractStructuredFromTransitional(id: number): Promise<{
        found: boolean;
        firstRow?: undefined;
        matches?: undefined;
    } | {
        found: boolean;
        firstRow: Record<string, any>;
        matches: Record<string, any>[];
    }>;
    fetchAndStore(league: string, season: number, sport?: number, origin?: string, startDate?: string, endDate?: string, seasonStatus?: boolean | string, isSeasonDefault?: boolean, sameYears?: boolean, hasPostseason?: boolean, scheduleType?: string, isLeagueDefault?: boolean, hasDivisions?: boolean, hasGroups?: boolean, numberOfGroups?: number, runInBackground?: boolean, inferClubs?: boolean): Promise<{
        id: number;
        fetched_at: any;
        background: boolean;
        startDate: string;
        endDate: string;
    } | {
        id: any;
        fetched_at: any;
        background?: undefined;
        startDate?: undefined;
        endDate?: undefined;
    }>;
    listTransitional(limit?: number): Promise<any[]>;
    getTransitional(id: number): Promise<any>;
    private ensureRoundReviewTable;
    getRoundReview(id: number): Promise<any>;
    saveRoundReview(id: number, overrides: Record<string, number>): Promise<any>;
    resolveRoundReview(id: number, overrides?: Record<string, number>): Promise<any>;
    deleteRoundReview(id: number): Promise<{
        deleted: boolean;
    }>;
    private ensureEntityReviewTable;
    getEntityReview(id: number): Promise<any>;
    saveEntityReview(id: number, leagueMapping: number | null, clubMappings: Record<string, number>, stadiumMappings: Record<string, number>, countryMapping?: number | null): Promise<any>;
    private resolvePersistentClubAlias;
    deleteEntityReview(id: number): Promise<{
        deleted: boolean;
    }>;
    private ensureApplyJobColumns;
    startApplyJob(id: number): Promise<void>;
    finishApplyJob(id: number, result: any): Promise<void>;
    failApplyJob(id: number, error: string): Promise<void>;
    getApplyStatus(id: number): Promise<{
        status: any;
        result: any;
    }>;
    repairDivisionsFromPayload(id: number, sportId?: number): Promise<{
        repaired: number;
        skipped: number;
        errors: number;
    }>;
    private getDraftEntityMappings;
    detectEntitiesForReview(id: number, sportId?: number, seasonPhase?: string): Promise<{
        found: boolean;
        reason: string;
        country?: undefined;
        league?: undefined;
        clubs?: undefined;
        stadiums?: undefined;
        needsReview?: undefined;
        payloadCountry?: undefined;
    } | {
        found: boolean;
        country: {
            incomingName: any;
            suggestions: {
                id: any;
                name: any;
                code: any;
            }[];
        };
        league: any;
        clubs: any[];
        stadiums: any[];
        needsReview: boolean;
        payloadCountry: {
            name: string | null;
            id: number | null;
        };
        reason?: undefined;
    } | {
        found: boolean;
        league: {
            incomingName: any;
            suggestions: {
                id: any;
                originalName: any;
                secondaryName: any;
                countryId: any;
            }[];
        };
        clubs: {
            name: string;
            suggestions: any[];
        }[];
        stadiums: any[];
        needsReview: boolean;
        payloadCountry: {
            name: string | null;
            id: number | null;
        };
        reason?: undefined;
        country?: undefined;
    } | {
        found: boolean;
        clubs: {
            name: string;
            suggestions: any[];
        }[];
        stadiums: {
            name: string;
            city: string;
            suggestions: any[];
        }[];
        needsReview: boolean;
        payloadCountry: {
            name: string | null;
            id: number | null;
        };
        reason?: undefined;
        country?: undefined;
        league?: undefined;
    }>;
    private getDraftRoundOverrides;
    deleteTransitional(id: number): Promise<{
        deleted: boolean;
        id: any;
    } | {
        deleted: boolean;
        id?: undefined;
    }>;
    updateTransitional(id: number, updates: any): Promise<{
        updated: boolean;
        id?: undefined;
        status?: undefined;
    } | {
        updated: boolean;
        id: any;
        status: any;
    }>;
    parseTransitional(id: number, roundOverrides?: Record<string, number>, seasonPhase?: string, fallbackCountry?: string | null): Promise<{
        found: boolean;
        reason: string;
        error?: undefined;
        details?: undefined;
        columns?: undefined;
        rows?: undefined;
    } | {
        found: boolean;
        reason: string;
        error: string;
        details: {
            message: string;
            currentEvent: {
                id: any;
                date: any;
                homeTeam: any;
                awayTeam: any;
                homeShortName: any;
                awayShortName: any;
            };
            reviewMatches: {
                id: string;
                eventId: string;
                date: any;
                leagueLocalDate: string;
                homeTeam: any;
                awayTeam: any;
                homeShortName: any;
                awayShortName: any;
                homeId: string;
                awayId: string;
                venueName: any;
                venueCity: any;
                homeScore: number;
                awayScore: number;
                isCompleted: any;
                statusLong: any;
                statusShort: any;
                assignedRound: number;
                candidateRounds: number[];
                needsReview: boolean;
                assignmentSource: string;
            }[];
            roundSummary: {
                round: number;
                assignedMatches: number;
                expectedMatches: number;
                missingMatches: number;
                duplicateTeamIds: string[];
                eventIds: string[];
                startDate: string;
                endDate: string;
                dateRange: string;
                status: string;
            }[];
            validationErrors: {
                code: string;
                message: string;
                round?: number;
            }[];
            partialEvents: {
                eventId: any;
                date: string;
                homeId: string;
                awayId: string;
                homeName: any;
                awayName: any;
                homeShortName: any;
                awayShortName: any;
            }[];
            roundAssignments: {
                eventId: string;
                round: number;
            }[];
            reservedEventIds: string[];
            allTeamIds: {
                id: string;
                name: string;
            }[];
        };
        columns?: undefined;
        rows?: undefined;
    } | {
        found: boolean;
        columns: string[];
        rows: any[];
        reason?: undefined;
        error?: undefined;
        details?: undefined;
    } | {
        found: boolean;
        reason?: undefined;
        error?: undefined;
        details?: undefined;
    } | {
        found: boolean;
        reason: string;
        error: string;
        details?: undefined;
    } | {
        found: boolean;
        reason: string;
        details: {
            leagueId: number;
            seasonId: number;
            message?: undefined;
        };
        error?: undefined;
    } | {
        found: boolean;
        reason: string;
        details: {
            message: string;
            leagueId: number;
            seasonId: number;
        };
        error?: undefined;
    }>;
    private normalizeSeasonPhaseFilter;
    private isAmbiguousClubPlaceholderName;
    private rankClubSuggestionRows;
    private classifyEspnEventSeasonPhase;
    private filterEspnEventsBySeasonPhase;
    private filterApiFootballFixturesBySeasonPhase;
    private inferSeasonPhaseDetailFromText;
    private inferEspnSeasonPhase;
    private inferApiFootballSeasonPhase;
    private isRawEspnEventFinished;
    private isRawApiFootballFixtureFinished;
    private detectCurrentSeasonPhase;
    private parseTransitionalEspn;
    applyTransitional(id: number, options?: {
        dryRun?: boolean;
        targetTable?: string;
        mapping?: Record<string, string>;
    }): Promise<{
        applied: number;
        reason: any;
        error: any;
        details: any;
        logId: any;
        preview?: undefined;
        rolledBack?: undefined;
        dryRun?: undefined;
    } | {
        applied: number;
        reason: string;
        error?: undefined;
        details?: undefined;
        logId?: undefined;
        preview?: undefined;
        rolledBack?: undefined;
        dryRun?: undefined;
    } | {
        applied: number;
        preview: {
            columns: any;
            rows: any;
        };
        reason?: undefined;
        error?: undefined;
        details?: undefined;
        logId?: undefined;
        rolledBack?: undefined;
        dryRun?: undefined;
    } | {
        applied: number;
        error: string;
        rolledBack: boolean;
        details: any;
        reason?: undefined;
        logId?: undefined;
        preview?: undefined;
        dryRun?: undefined;
    } | {
        applied: number;
        dryRun: boolean;
        reason?: undefined;
        error?: undefined;
        details?: undefined;
        logId?: undefined;
        preview?: undefined;
        rolledBack?: undefined;
    } | {
        applied: number;
        error: string;
        details: any;
        reason?: undefined;
        logId?: undefined;
        preview?: undefined;
        rolledBack?: undefined;
        dryRun?: undefined;
    }>;
    getTableColumns(tableName: string): Promise<any[]>;
    createMatchDivisions(client: any, sportId: number, matchId: number, matchRow: Record<string, any>, flgHasDivisions?: boolean): Promise<{
        created: number;
        hasLinescores: boolean;
    } | {
        created: number;
        hasLinescores?: undefined;
    }>;
    private formatEspnDate;
    private getEspnSeasonStartYear;
    private findPreferredSeasonRow;
    private findPreferredSeasonRowForYears;
    private fetchEspnScoreboardByDate;
    private fetchEspnSeasonByDay;
    private fetchEspnEventLinescores;
    enrichMatchDivisionsFromEspn(sportName: string, leagueCode: string, matchesForEnrichment: Array<{
        matchId: number;
        originApiId: string;
    }>, rateMs?: number): Promise<{
        enriched: number;
        skipped: number;
        errors: number;
    }>;
    applyFirstRowToApp(id: number, options?: {
        sportId?: number;
        roundOverrides?: Record<string, number>;
        leagueId?: number;
        countryId?: number;
        seasonPhase?: string;
    }): Promise<{
        applied: boolean;
        reason: any;
        error: any;
        details: any;
        missing?: undefined;
        logId?: undefined;
        countryId?: undefined;
        leagueId?: undefined;
        seasonId?: undefined;
    } | {
        applied: boolean;
        reason: string;
        error?: undefined;
        details?: undefined;
        missing?: undefined;
        logId?: undefined;
        countryId?: undefined;
        leagueId?: undefined;
        seasonId?: undefined;
    } | {
        applied: boolean;
        reason: string;
        missing: string[];
        logId: any;
        error?: undefined;
        details?: undefined;
        countryId?: undefined;
        leagueId?: undefined;
        seasonId?: undefined;
    } | {
        applied: boolean;
        countryId: number;
        leagueId: number;
        seasonId: number;
        reason?: undefined;
        error?: undefined;
        details?: undefined;
        missing?: undefined;
        logId?: undefined;
    } | {
        applied: boolean;
        error: string;
        reason?: undefined;
        details?: undefined;
        missing?: undefined;
        logId?: undefined;
        countryId?: undefined;
        leagueId?: undefined;
        seasonId?: undefined;
    }>;
    private extractLeagueMetadata;
    private isParsedFixtureFinished;
    private parseTransitionalEspnLightweight;
    applyAllRowsToApp(id: number, options?: {
        sportId?: number;
        leagueId?: number;
        seasonId?: number;
        dryRun?: boolean;
        roundOverrides?: Record<string, number>;
        seasonPhase?: string;
    }): Promise<any>;
}
