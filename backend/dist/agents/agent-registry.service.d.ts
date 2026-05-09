import { AgentHandlerContract } from './contracts';
export declare class AgentRegistry {
    private readonly logger;
    private readonly handlers;
    constructor(handlers: AgentHandlerContract[]);
    register(handler: AgentHandlerContract): void;
    get(agentKey: string): AgentHandlerContract | null;
    list(): AgentHandlerContract[];
}
