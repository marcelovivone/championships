import { Injectable } from '@nestjs/common';
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

@Injectable()
export class AgentEventTriggerService {
  constructor(private readonly triggerDispatcher: TriggerDispatcher) {}

  dispatch(agentKey: string, request: AgentEventDispatchRequest): Promise<AgentRunExecutionReport> {
    return this.triggerDispatcher.dispatchEvent(agentKey, request.triggerSource, {
      mode: request.mode,
      initiatedBy: request.initiatedBy,
      identifiers: {
        idempotencyKey: request.idempotencyKey,
        correlationId: request.correlationId,
        requestId: request.requestId,
      },
      payload: request.payload,
      metadata: request.metadata,
    });
  }
}