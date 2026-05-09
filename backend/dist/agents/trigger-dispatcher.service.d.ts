import { AgentRunExecutionReport, AgentRunRequest } from './contracts';
import { AgentRunner } from './agent-runner.service';
export declare class TriggerDispatcher {
    private readonly agentRunner;
    constructor(agentRunner: AgentRunner);
    dispatch(request: AgentRunRequest): Promise<AgentRunExecutionReport>;
    dispatchManual(agentKey: string, request: Omit<AgentRunRequest, 'agentKey' | 'triggerType'>): Promise<AgentRunExecutionReport>;
    dispatchScheduled(agentKey: string, triggerSource: string, request: Omit<AgentRunRequest, 'agentKey' | 'triggerType' | 'triggerSource'>): Promise<AgentRunExecutionReport>;
    dispatchEvent(agentKey: string, triggerSource: string, request: Omit<AgentRunRequest, 'agentKey' | 'triggerType' | 'triggerSource'>): Promise<AgentRunExecutionReport>;
}
