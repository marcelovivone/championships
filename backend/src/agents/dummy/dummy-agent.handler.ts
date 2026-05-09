import { Injectable } from '@nestjs/common';
import {
  AgentExecutionContext,
  AgentHandlerContract,
  AgentRunResult,
} from '../contracts';

@Injectable()
export class DummyAgentHandler implements AgentHandlerContract {
  readonly definition = {
    agentKey: 'dummy-agent',
    name: 'Dummy Agent',
    description: 'A runtime smoke-test agent used to validate the shared agent pipeline.',
    defaultMode: 'dry-run' as const,
    supportsManualTrigger: true,
    supportsSchedule: true,
    supportsEventTrigger: true,
  };

  async run(context: AgentExecutionContext): Promise<AgentRunResult> {
    return {
      status: 'completed',
      summary: `Dummy agent executed in ${context.mode} mode via ${context.triggerType}`,
      actions: [
        {
          actionKey: 'dummy-read-health-check',
          kind: 'read',
          writeDisposition: 'read-only',
          summary: 'Recorded a runtime smoke-check action without mutating application state.',
          payload: {
            triggerSource: context.triggerSource,
            initiatedBy: context.initiatedBy ?? null,
          },
        },
      ],
      warnings: context.payload ? undefined : [{ code: 'DUMMY_NO_PAYLOAD', message: 'Dummy agent executed without an input payload.' }],
      metrics: {
        readCount: 1,
        actionCount: 1,
        warningCount: context.payload ? 0 : 1,
        errorCount: 0,
      },
      result: {
        echoedPayload: context.payload ?? null,
        metadata: context.metadata ?? null,
      },
    };
  }
}