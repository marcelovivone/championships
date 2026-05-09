import { AgentExecutionMode, AgentRunExecutionReport } from './contracts';
import { TriggerDispatcher } from './trigger-dispatcher.service';
export interface AgentEventDispatchRequest {
    triggerSource: string;
    mode?: AgentExecutionMode;
    initiatedBy?: string;
    idempotencyKey?: string;
    correlationId?: string;
    requestId?: string;
    payload?: unknown;
    metadata?: Record<string, unknown>;
}
export declare class AgentEventTriggerService {
    private readonly triggerDispatcher;
    constructor(triggerDispatcher: TriggerDispatcher);
    dispatch(agentKey: string, request: AgentEventDispatchRequest): Promise<AgentRunExecutionReport>;
}
