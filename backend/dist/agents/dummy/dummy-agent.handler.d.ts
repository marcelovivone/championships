import { AgentExecutionContext, AgentHandlerContract, AgentRunResult } from '../contracts';
export declare class DummyAgentHandler implements AgentHandlerContract {
    readonly definition: {
        agentKey: string;
        name: string;
        description: string;
        defaultMode: "dry-run";
        supportsManualTrigger: boolean;
        supportsSchedule: boolean;
        supportsEventTrigger: boolean;
    };
    run(context: AgentExecutionContext): Promise<AgentRunResult>;
}
