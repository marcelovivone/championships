import { Inject, Injectable, Logger } from '@nestjs/common';
import { AgentHandlerContract } from './contracts';
import { AGENT_HANDLERS } from './tokens';

@Injectable()
export class AgentRegistry {
  private readonly logger = new Logger(AgentRegistry.name);
  private readonly handlers = new Map<string, AgentHandlerContract>();

  constructor(@Inject(AGENT_HANDLERS) handlers: AgentHandlerContract[]) {
    handlers.forEach((handler) => this.register(handler));
  }

  register(handler: AgentHandlerContract): void {
    if (this.handlers.has(handler.definition.agentKey)) {
      throw new Error(`Duplicate agent registration for key "${handler.definition.agentKey}"`);
    }

    this.handlers.set(handler.definition.agentKey, handler);
    this.logger.log(`Registered agent handler ${handler.definition.agentKey}`);
  }

  get(agentKey: string): AgentHandlerContract | null {
    return this.handlers.get(agentKey) ?? null;
  }

  list(): AgentHandlerContract[] {
    return Array.from(this.handlers.values());
  }
}