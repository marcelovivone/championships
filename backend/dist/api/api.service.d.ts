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
    fetchAndStore(league: number, season: number, sport?: number, origin?: string, startDate?: string, endDate?: string): Promise<{
        id: any;
        fetched_at: any;
    }>;
    listTransitional(limit?: number): Promise<any[]>;
    getTransitional(id: number): Promise<any>;
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
            };
            reviewMatches: {
                id: string;
                eventId: string;
                date: any;
                homeTeam: any;
                awayTeam: any;
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
    createMatchDivisions(client: any, sportId: number, matchId: number, matchRow: Record<string, any>): Promise<{
        created: number;
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
    applyAllRowsToApp(id: number, options?: {
        sportId?: number;
        leagueId?: number;
        seasonId?: number;
        dryRun?: boolean;
        roundOverrides?: Record<string, number>;
    }): Promise<{
        applied: number;
        reason: any;
        error: any;
        details: any;
        rolledBack?: undefined;
        createdClubs?: undefined;
        createdRounds?: undefined;
        createdDivisions?: undefined;
        createdStandings?: undefined;
        clubsIncluded?: undefined;
        dryRun?: undefined;
    } | {
        applied: number;
        reason: string;
        error?: undefined;
        details?: undefined;
        rolledBack?: undefined;
        createdClubs?: undefined;
        createdRounds?: undefined;
        createdDivisions?: undefined;
        createdStandings?: undefined;
        clubsIncluded?: undefined;
        dryRun?: undefined;
    } | {
        applied: number;
        reason: string;
        details: {
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
        };
        error?: undefined;
        rolledBack?: undefined;
        createdClubs?: undefined;
        createdRounds?: undefined;
        createdDivisions?: undefined;
        createdStandings?: undefined;
        clubsIncluded?: undefined;
        dryRun?: undefined;
    } | {
        applied: number;
        error: string;
        rolledBack: boolean;
        details: any;
        reason?: undefined;
        createdClubs?: undefined;
        createdRounds?: undefined;
        createdDivisions?: undefined;
        createdStandings?: undefined;
        clubsIncluded?: undefined;
        dryRun?: undefined;
    } | {
        applied: number;
        createdClubs: number;
        createdRounds: number;
        createdDivisions: number;
        createdStandings: number;
        clubsIncluded: string[];
        dryRun: boolean;
        reason?: undefined;
        error?: undefined;
        details?: undefined;
        rolledBack?: undefined;
    } | {
        applied: number;
        error: string;
        details: any;
        reason?: undefined;
        rolledBack?: undefined;
        createdClubs?: undefined;
        createdRounds?: undefined;
        createdDivisions?: undefined;
        createdStandings?: undefined;
        clubsIncluded?: undefined;
        dryRun?: undefined;
    }>;
}
