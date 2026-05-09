import { ApiService } from '../api/api.service';
export interface AgentActionExecutionOutcome {
    status: 'approved' | 'executed' | 'failed';
    summary: string;
    resultPayload?: unknown;
    errorCode?: string;
    errorMessage?: string;
}
export declare class AgentActionExecutionService {
    private readonly apiService;
    constructor(apiService: ApiService);
    executeApprovedAction(input: {
        agentKey: string;
        actionKey: string;
        actionPayload: unknown;
        summary: string;
    }): Promise<AgentActionExecutionOutcome>;
    private executeSeasonResultsUpdaterAction;
    private asSeasonResultsUpdaterExecutionPayload;
    private isObject;
}
