import { ApiService } from './api.service';
export declare class ApiController {
    private readonly apiService;
    constructor(apiService: ApiService);
    status(): {
        ok: boolean;
    };
    import(payload: any): Promise<{
        created: number;
        items: {
            id: any;
            fetched_at: any;
        };
    }>;
    fetchAndStore(body: {
        league: string;
        season: number;
        sport?: number;
        origin?: string;
        startDate?: string;
        endDate?: string;
        seasonStatus?: string;
        isSeasonDefault?: boolean;
        sameYears?: boolean;
        scheduleType?: string;
        isLeagueDefault?: boolean;
        hasDivisions?: boolean;
        hasGroups?: boolean;
        numberOfGroups?: number;
        runInBackground?: boolean;
        inferClubs?: boolean;
    }): Promise<{
        stored: {
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
        };
    }>;
    listTransitional(limit?: string): Promise<{
        count: number;
        items: any[];
    }>;
    getTransitional(id: number): Promise<{
        found: boolean;
        item?: undefined;
    } | {
        found: boolean;
        item: any;
    }>;
    parseTransitional(id: number, roundOverridesJson?: string): Promise<{
        found: boolean;
        reason: any;
        error: any;
        details: any;
        columns?: undefined;
        rows?: undefined;
        isSubsequentLoad?: undefined;
    } | {
        found: boolean;
        columns: any;
        rows: any;
        isSubsequentLoad: boolean;
        reason?: undefined;
        error?: undefined;
        details?: undefined;
    }>;
    structuredTransitional(id: number): Promise<{
        found: boolean;
        firstRow?: undefined;
        matches?: undefined;
    } | {
        found: boolean;
        firstRow: Record<string, any>;
        matches: Record<string, any>[];
    }>;
    getRoundReview(id: number): Promise<{
        found: boolean;
        item: any;
    }>;
    patchRoundReview(id: number, body: {
        overrides?: Record<string, number>;
    }): Promise<{
        success: boolean;
        item: any;
    }>;
    deleteRoundReview(id: number): Promise<{
        success: boolean;
    }>;
    getEntityReview(id: number): Promise<{
        found: boolean;
        item: any;
    }>;
    patchEntityReview(id: number, body: {
        leagueMapping?: number | null;
        clubMappings?: Record<string, number>;
        stadiumMappings?: Record<string, number>;
        countryMapping?: number | null;
    }): Promise<{
        success: boolean;
        item: any;
    }>;
    deleteEntityReview(id: number): Promise<{
        success: boolean;
    }>;
    getEntitySuggestions(id: number, sportId?: string): Promise<{
        found: boolean;
        reason: string;
        country?: undefined;
        league?: undefined;
        clubs?: undefined;
        stadiums?: undefined;
        needsReview?: undefined;
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
        reason?: undefined;
        country?: undefined;
        league?: undefined;
    }>;
    applyFirstRow(id: number, body: {
        sportId?: number;
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
    applyAllRows(id: number, body: {
        sportId?: number;
        dryRun?: boolean;
        roundOverrides?: Record<string, number>;
    }): Promise<any>;
    getApplyStatus(id: number): Promise<{
        status: any;
        result: any;
    }>;
    repairDivisions(id: number, body: {
        sportId?: number;
    }): Promise<{
        repaired: number;
        skipped: number;
        errors: number;
    }>;
    loadTransitional(id: number, body: {
        dryRun?: boolean;
        targetTable?: string;
        mapping?: Record<string, string>;
    }): Promise<{
        result: {
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
        };
    }>;
    deleteTransitional(id: number): Promise<{
        success: boolean;
        id: any;
    }>;
    patchTransitional(id: number, body: any): Promise<{
        success: boolean;
        id: any;
        status: any;
    }>;
    getTargetColumns(table?: string): Promise<{
        columns: any[];
    }>;
}
