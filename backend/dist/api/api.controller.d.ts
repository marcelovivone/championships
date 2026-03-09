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
        league: number;
        season: number;
        sport?: number;
    }): Promise<{
        stored: {
            id: any;
            fetched_at: any;
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
    parseTransitional(id: number): Promise<{
        found: boolean;
        columns?: undefined;
        rows?: undefined;
    } | {
        found: boolean;
        columns: string[];
        rows: Record<string, any>[];
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
    applyFirstRow(id: number, body: {
        sportId?: number;
    }): Promise<{
        applied: boolean;
        reason: string;
        missing?: undefined;
        logId?: undefined;
        countryId?: undefined;
        leagueId?: undefined;
        seasonId?: undefined;
        error?: undefined;
    } | {
        applied: boolean;
        reason: string;
        missing: string[];
        logId: any;
        countryId?: undefined;
        leagueId?: undefined;
        seasonId?: undefined;
        error?: undefined;
    } | {
        applied: boolean;
        countryId: number;
        leagueId: number;
        seasonId: number;
        reason?: undefined;
        missing?: undefined;
        logId?: undefined;
        error?: undefined;
    } | {
        applied: boolean;
        error: string;
        reason?: undefined;
        missing?: undefined;
        logId?: undefined;
        countryId?: undefined;
        leagueId?: undefined;
        seasonId?: undefined;
    }>;
    loadTransitional(id: number, body: {
        dryRun?: boolean;
        targetTable?: string;
        mapping?: Record<string, string>;
    }): Promise<{
        result: {
            applied: number;
            reason: string;
            preview?: undefined;
            dryRun?: undefined;
            error?: undefined;
        } | {
            applied: number;
            preview: {
                columns: string[];
                rows: Record<string, any>[];
            };
            reason?: undefined;
            dryRun?: undefined;
            error?: undefined;
        } | {
            applied: number;
            dryRun: boolean;
            reason?: undefined;
            preview?: undefined;
            error?: undefined;
        } | {
            applied: number;
            error: string;
            reason?: undefined;
            preview?: undefined;
            dryRun?: undefined;
        };
    }>;
    getTargetColumns(table?: string): Promise<{
        columns: any[];
    }>;
}
