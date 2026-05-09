import { Injectable } from '@nestjs/common';
import { AgentRunExecutionReport, AgentRunRequest } from './contracts';
import { AgentRunner } from './agent-runner.service';

@Injectable()
export class TriggerDispatcher {
  constructor(private readonly agentRunner: AgentRunner) {}

  dispatch(request: AgentRunRequest): Promise<AgentRunExecutionReport> {
    return this.agentRunner.run(request);
  }

  dispatchManual(
    agentKey: string,
    request: Omit<AgentRunRequest, 'agentKey' | 'triggerType'>,
  ): Promise<AgentRunExecutionReport> {
    return this.agentRunner.run({
      ...request,
      agentKey,
      triggerType: 'manual',
    });
  }

  dispatchScheduled(
    agentKey: string,
    triggerSource: string,
    request: Omit<AgentRunRequest, 'agentKey' | 'triggerType' | 'triggerSource'>,
  ): Promise<AgentRunExecutionReport> {
    return this.agentRunner.run({
      ...request,
      agentKey,
      triggerType: 'schedule',
      triggerSource,
    });
  }

  dispatchEvent(
    agentKey: string,
    triggerSource: string,
    request: Omit<AgentRunRequest, 'agentKey' | 'triggerType' | 'triggerSource'>,
  ): Promise<AgentRunExecutionReport> {
    return this.agentRunner.run({
      ...request,
      agentKey,
      triggerType: 'event',
      triggerSource,
    });
  }
}