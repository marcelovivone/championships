import { AgentHandlerContract, AgentRunResult } from '../../src/agents/contracts';
import { AgentRegistry } from '../../src/agents/agent-registry.service';
import { AgentRunner } from '../../src/agents/agent-runner.service';
import * as schema from '../../src/db/schema';

function createDbMock(
  configMode: 'dry-run' | 'manual' | 'semi-automatic' | 'autonomous',
  options?: {
    existingRun?: typeof schema.runHistory.$inferSelect | null;
  },
) {
  const inserted = {
    runHistory: [] as any[],
    actionLogs: [] as any[],
    approvals: [] as any[],
    notifications: [] as any[],
  };
  const updates = {
    runHistory: [] as any[],
  };

  const existingDefinition = {
    id: 7,
    agentKey: 'mode-probe-agent',
    name: 'Mode Probe Agent',
    description: 'Used by tests',
    version: '1.0.0',
    defaultMode: 'dry-run',
    supportsManualTrigger: true,
    supportsSchedule: true,
    supportsEventTrigger: true,
    owner: null,
    createdAt: new Date('2026-04-30T10:00:00.000Z'),
    updatedAt: new Date('2026-04-30T10:00:00.000Z'),
  };

  const existingConfig = {
    id: 9,
    agentDefinitionId: 7,
    isEnabled: true,
    mode: configMode,
    scheduleExpression: null,
    timeoutSeconds: 300,
    maxRetries: 0,
    approvalRequiredForWrites: true,
    notificationRecipients: null,
    triggerFilters: null,
    configJson: null,
    createdAt: new Date('2026-04-30T10:00:00.000Z'),
    updatedAt: new Date('2026-04-30T10:00:00.000Z'),
  };

  const existingRun = options?.existingRun ?? null;

  const db = {
    select: jest.fn(() => ({
      from: jest.fn((table: unknown) => ({
        where: jest.fn(() => {
          if (table === schema.agentDefinitions) {
            return {
              limit: jest.fn(async () => [existingDefinition]),
            };
          }

          if (table === schema.agentConfig) {
            return {
              orderBy: jest.fn(() => ({
                limit: jest.fn(async () => [existingConfig]),
              })),
            };
          }

          if (table === schema.runHistory) {
            return {
              orderBy: jest.fn(() => ({
                limit: jest.fn(async () => (existingRun ? [existingRun] : [])),
              })),
            };
          }

          return {
            limit: jest.fn(async () => []),
          };
        }),
      })),
    })),
    insert: jest.fn((table: unknown) => ({
      values: jest.fn((values: any) => {
        const normalizedValues = Array.isArray(values) ? values : [values];

        if (table === schema.runHistory) {
          inserted.runHistory.push(...normalizedValues);
        }

        if (table === schema.actionLogs) {
          inserted.actionLogs.push(...normalizedValues);
        }

        if (table === schema.approvals) {
          inserted.approvals.push(...normalizedValues);
        }

        if (table === schema.notifications) {
          inserted.notifications.push(...normalizedValues);
        }

        return {
          returning: jest.fn(async () => {
            if (table === schema.runHistory) {
              return [{ id: 41 }];
            }

            if (table === schema.actionLogs) {
              return normalizedValues.map((value: any, index: number) => ({
                id: 100 + index,
                actionKey: value.actionKey,
              }));
            }

            return normalizedValues;
          }),
        };
      }),
    })),
    update: jest.fn((table: unknown) => ({
      set: jest.fn((values: any) => ({
        where: jest.fn(async () => {
          if (table === schema.runHistory) {
            updates.runHistory.push(values);
          }

          return [];
        }),
      })),
    })),
  };

  return { db, inserted, updates };
}

function createHandler(resultFactory: () => AgentRunResult): AgentHandlerContract {
  return {
    definition: {
      agentKey: 'mode-probe-agent',
      name: 'Mode Probe Agent',
      description: 'Used by tests',
      defaultMode: 'dry-run',
      supportsManualTrigger: true,
      supportsSchedule: true,
      supportsEventTrigger: true,
    },
    run: jest.fn(async () => resultFactory()),
  };
}

describe('AgentRunner mode enforcement', () => {
  const baseWriteResult = (): AgentRunResult => ({
    status: 'completed',
    summary: 'Mode probe completed',
    actions: [
      {
        actionKey: 'write-club-row',
        kind: 'write',
        writeDisposition: 'direct-write',
        summary: 'Update one club row',
        targetType: 'club',
        targetId: '12',
      },
    ],
  });

  it('suppresses write actions in dry-run mode', async () => {
    const { db, inserted, updates } = createDbMock('dry-run');
    const handler = createHandler(baseWriteResult);
    const registry = { get: jest.fn().mockReturnValue(handler) } as unknown as AgentRegistry;
    const runner = new AgentRunner(db as never, registry, []);

    const report = await runner.run({
      agentKey: 'mode-probe-agent',
      triggerType: 'manual',
      triggerSource: 'spec:dry-run',
    });

    expect(report.status).toBe('completed');
    expect(report.actions[0]).toMatchObject({
      kind: 'generate-script',
      writeDisposition: 'generate-script',
      status: 'skipped',
      requiresHumanExecution: true,
    });
    expect(report.warnings?.[0]?.code).toBe('AGENT_MODE_DRY_RUN_BLOCKED_WRITE');
    expect(report.approvals).toBeUndefined();
    expect(inserted.actionLogs[0]).toMatchObject({ kind: 'generate-script', status: 'skipped' });
    expect(updates.runHistory[0]).toMatchObject({ status: 'completed' });
  });

  it('blocks automatic write execution in manual mode', async () => {
    const { db, inserted, updates } = createDbMock('manual');
    const handler = createHandler(baseWriteResult);
    const registry = { get: jest.fn().mockReturnValue(handler) } as unknown as AgentRegistry;
    const runner = new AgentRunner(db as never, registry, []);

    const report = await runner.run({
      agentKey: 'mode-probe-agent',
      triggerType: 'manual',
      triggerSource: 'spec:manual',
    });

    expect(report.status).toBe('completed');
    expect(report.actions[0]).toMatchObject({
      kind: 'write',
      status: 'blocked',
      requiresHumanExecution: true,
      requiresApproval: false,
    });
    expect(report.approvals).toBeUndefined();
    expect(inserted.actionLogs[0]).toMatchObject({ kind: 'write', status: 'blocked' });
    expect(inserted.approvals).toHaveLength(0);
    expect(updates.runHistory[0]).toMatchObject({ status: 'completed' });
  });

  it('queues approvals and pauses the run in semi-automatic mode', async () => {
    const { db, inserted, updates } = createDbMock('semi-automatic');
    const handler = createHandler(baseWriteResult);
    const registry = { get: jest.fn().mockReturnValue(handler) } as unknown as AgentRegistry;
    const runner = new AgentRunner(db as never, registry, []);

    const report = await runner.run({
      agentKey: 'mode-probe-agent',
      triggerType: 'manual',
      triggerSource: 'spec:semi-automatic',
      initiatedBy: 'tester',
    });

    expect(report.status).toBe('waiting-approval');
    expect(report.actions[0]).toMatchObject({
      kind: 'write',
      writeDisposition: 'approval-required',
      status: 'pending-approval',
      requiresApproval: true,
    });
    expect(report.approvals).toHaveLength(1);
    expect(report.approvals?.[0]).toMatchObject({
      actionKey: 'write-club-row',
      status: 'pending',
      requestedBy: 'tester',
    });
    expect(inserted.actionLogs[0]).toMatchObject({ status: 'pending-approval', requiresApproval: true });
    expect(inserted.approvals[0]).toMatchObject({ status: 'pending', actionLogId: 100 });
    expect(updates.runHistory[0]).toMatchObject({ status: 'waiting-approval' });
  });

  it('keeps autonomous writes audited through the same action log pipeline', async () => {
    const { db, inserted, updates } = createDbMock('autonomous');
    const handler = createHandler(baseWriteResult);
    const registry = { get: jest.fn().mockReturnValue(handler) } as unknown as AgentRegistry;
    const runner = new AgentRunner(db as never, registry, []);

    const report = await runner.run({
      agentKey: 'mode-probe-agent',
      triggerType: 'event',
      triggerSource: 'spec:autonomous',
    });

    expect(report.status).toBe('completed');
    expect(report.actions[0]).toMatchObject({
      kind: 'write',
      writeDisposition: 'direct-write',
      status: 'executed',
    });
    expect(report.approvals).toBeUndefined();
    expect(inserted.actionLogs[0]).toMatchObject({ kind: 'write', status: 'executed' });
    expect(inserted.approvals).toHaveLength(0);
    expect(updates.runHistory[0]).toMatchObject({ status: 'completed' });
  });

  it('reuses an existing run for duplicate idempotency keys without re-executing the handler', async () => {
    const existingRun: typeof schema.runHistory.$inferSelect = {
      id: 41,
      agentDefinitionId: 7,
      agentConfigId: 9,
      runKey: 'existing-run-key',
      triggerType: 'manual',
      triggerSource: 'spec:idempotent',
      mode: 'manual',
      status: 'completed',
      initiatedBy: 'tester',
      idempotencyKey: 'duplicate-trigger-1',
      correlationId: 'corr-existing',
      summary: 'Mode probe completed',
      payload: { source: 'duplicate' },
      resultJson: {
        status: 'completed',
        summary: 'Mode probe completed',
        actions: [
          {
            actionKey: 'read-existing-state',
            kind: 'read',
            writeDisposition: 'read-only',
            summary: 'Read the current agent state',
            status: 'executed',
          },
        ],
      },
      errorCode: null,
      errorMessage: null,
      startedAt: new Date('2026-04-30T10:00:00.000Z'),
      finishedAt: new Date('2026-04-30T10:01:00.000Z'),
      createdAt: new Date('2026-04-30T10:00:00.000Z'),
    };
    const { db, inserted, updates } = createDbMock('manual', { existingRun });
    const handler = createHandler(baseWriteResult);
    const registry = { get: jest.fn().mockReturnValue(handler) } as unknown as AgentRegistry;
    const runner = new AgentRunner(db as never, registry, []);

    const report = await runner.run({
      agentKey: 'mode-probe-agent',
      triggerType: 'manual',
      triggerSource: 'spec:idempotent',
      identifiers: { idempotencyKey: 'duplicate-trigger-1' },
    });

    expect(handler.run).not.toHaveBeenCalled();
    expect(inserted.runHistory).toHaveLength(0);
    expect(inserted.actionLogs).toHaveLength(0);
    expect(updates.runHistory).toHaveLength(0);
    expect(report).toMatchObject({
      runId: 41,
      runKey: 'existing-run-key',
      status: 'completed',
      context: {
        triggerType: 'manual',
        triggerSource: 'spec:idempotent',
        identifiers: {
          idempotencyKey: 'duplicate-trigger-1',
          correlationId: 'corr-existing',
        },
      },
      actions: [
        {
          actionKey: 'read-existing-state',
          kind: 'read',
          status: 'executed',
        },
      ],
    });
  });
});