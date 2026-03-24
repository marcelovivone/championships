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
    fetchAndStore(league: string, season: number, sport?: number, origin?: string, startDate?: string, endDate?: string, seasonStatus?: boolean | string, isSeasonDefault?: boolean, sameYears?: boolean, scheduleType?: string, isLeagueDefault?: boolean, hasDivisions?: boolean, runInBackground?: boolean): Promise<void>;
    listTransitional(limit?: number): Promise<any[]>;
    getTransitional(id: number): Promise<any>;
    private ensureRoundReviewTable;
    getRoundReview(id: number): Promise<any>;
    saveRoundReview(id: number, overrides: Record<string, number>): Promise<any>;
    resolveRoundReview(id: number, overrides?: Record<string, number>): Promise<any>;
    deleteRoundReview(id: number): Promise<{
        deleted: boolean;
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
    parseTransitional(id: number, roundOverrides?: Record<string, number>): Promise<{
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
    } | {
        isSubsequentLoad: boolean;
        found: boolean;
        reason: string;
        columns?: undefined;
        rows?: undefined;
    } | {
        isSubsequentLoad: boolean;
        found: boolean;
        columns: string[];
        rows: any[];
        reason?: undefined;
    }>;
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
    }>;
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
    private parseTransitionalEspnLightweight;
    applyAllRowsToApp(id: number, options?: {
        sportId?: number;
        leagueId?: number;
        seasonId?: number;
        dryRun?: boolean;
        roundOverrides?: Record<string, number>;
    }): Promise<any>;
}
