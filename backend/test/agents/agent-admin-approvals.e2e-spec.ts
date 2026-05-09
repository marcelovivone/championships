import { AgentAdminService } from '../../src/agents/agent-admin.service';
import { AgentActionExecutionService } from '../../src/agents/agent-action-execution.service';
import { AgentRegistry } from '../../src/agents/agent-registry.service';
import { AgentScheduleService } from '../../src/agents/agent-schedule.service';
import * as schema from '../../src/db/schema';

function createApprovalDbMock(initialDecisionStatus: 'approved' | 'rejected') {
  const approval = {
    id: 11,
    runHistoryId: 21,
    actionLogId: 31,
    requestedByUserId: null,
    decidedByUserId: null,
    status: 'pending' as const,
    summary: 'Approve write-club-row',
    reason: 'Needs operator review',
    requestedAt: new Date('2026-04-30T12:00:00.000Z'),
    decidedAt: null,
    createdAt: new Date('2026-04-30T12:00:00.000Z'),
  };

  const user = {
    id: 5,
    email: 'admin@championships.com',
    password: 'hash',
    name: 'Admin',
    profile: 'admin',
    isActive: true,
    createdAt: new Date('2026-04-30T09:00:00.000Z'),
    updatedAt: new Date('2026-04-30T09:00:00.000Z'),
  };

  const definition = {
    id: 7,
    agentKey: 'mode-probe-agent',
    name: 'Mode Probe Agent',
    description: 'Test agent',
    version: '1.0.0',
    defaultMode: 'dry-run',
    supportsManualTrigger: true,
    supportsSchedule: true,
    supportsEventTrigger: true,
    owner: null,
    createdAt: new Date('2026-04-30T09:00:00.000Z'),
    updatedAt: new Date('2026-04-30T09:00:00.000Z'),
  };

  const run = {
    id: 21,
    agentDefinitionId: 7,
    agentConfigId: 9,
    runKey: 'mode-probe-run-1',
    triggerType: 'manual' as const,
    triggerSource: 'admin-console',
    mode: 'semi-automatic' as const,
    status: 'waiting-approval' as const,
    initiatedBy: 'Admin',
    idempotencyKey: null,
    correlationId: 'corr-1',
    summary: 'Waiting for approval',
    payload: { probe: true },
    resultJson: {
      status: 'waiting-approval',
      summary: 'Waiting for approval',
      approvals: [{ actionKey: 'write-club-row', status: 'pending' }],
      actions: [{ actionKey: 'write-club-row', status: 'pending-approval' }],
    },
    errorCode: null,
    errorMessage: null,
    startedAt: new Date('2026-04-30T12:00:00.000Z'),
    finishedAt: null,
    createdAt: new Date('2026-04-30T12:00:00.000Z'),
  };

  const action = {
    id: 31,
    runHistoryId: 21,
    actionKey: 'write-club-row',
    kind: 'write' as const,
    status: 'pending-approval' as const,
    summary: 'Update one club row',
    targetType: 'club',
    targetId: '12',
    requiresApproval: true,
    requiresHumanExecution: false,
    generatedArtifactPath: null,
    actionPayload: null,
    resultPayload: null,
    createdAt: new Date('2026-04-30T12:00:00.000Z'),
    updatedAt: new Date('2026-04-30T12:00:00.000Z'),
  };

  const updates = {
    approvals: [] as any[],
    actionLogs: [] as any[],
    runHistory: [] as any[],
  };

  const db = {
    select: jest.fn((selection?: any) => ({
      from: jest.fn((table: unknown) => {
        if (selection && selection.run && selection.definition && table === schema.runHistory) {
          return {
            innerJoin: jest.fn(() => ({
              where: jest.fn(() => ({
                limit: jest.fn(async () => [{ run, definition }]),
              })),
            })),
          };
        }

        if (table === schema.approvals) {
          return {
            where: jest.fn((condition?: unknown) => ({
              limit: jest.fn(async () => [approval]),
              orderBy: jest.fn(async () => [approval]),
            })),
          };
        }

        if (table === schema.users) {
          return {
            where: jest.fn(() => ({
              limit: jest.fn(async () => [user]),
            })),
          };
        }

        if (table === schema.actionLogs) {
          return {
            where: jest.fn(() => ({
              limit: jest.fn(async () => [action]),
            })),
          };
        }

        return {
          where: jest.fn(() => ({
            limit: jest.fn(async () => []),
          })),
        };
      }),
    })),
    update: jest.fn((table: unknown) => ({
      set: jest.fn((values: any) => ({
        where: jest.fn(async () => {
          if (table === schema.approvals) {
            Object.assign(approval, values);
            updates.approvals.push(values);
          }

          if (table === schema.actionLogs) {
            Object.assign(action, values);
            updates.actionLogs.push(values);
          }

          if (table === schema.runHistory) {
            Object.assign(run, values);
            updates.runHistory.push(values);
          }

          if (table === schema.agentDefinitions) {
            Object.assign(definition, values);
          }

          return [];
        }),
      })),
    })),
    insert: jest.fn(() => ({
      values: jest.fn(() => ({
        returning: jest.fn(async () => []),
      })),
    })),
  };

  return { db, updates, approval, run, action, decision: initialDecisionStatus };
}

function createExecutableApprovalDbMock() {
  const approval = {
    id: 41,
    runHistoryId: 51,
    actionLogId: 61,
    requestedByUserId: null,
    decidedByUserId: null,
    status: 'pending' as const,
    summary: 'Approve apply-season-results-80',
    reason: 'Needs operator review',
    requestedAt: new Date('2026-04-30T12:00:00.000Z'),
    decidedAt: null,
    createdAt: new Date('2026-04-30T12:00:00.000Z'),
  };

  const user = {
    id: 5,
    email: 'admin@championships.com',
    password: 'hash',
    name: 'Admin',
    profile: 'admin',
    isActive: true,
    createdAt: new Date('2026-04-30T09:00:00.000Z'),
    updatedAt: new Date('2026-04-30T09:00:00.000Z'),
  };

  const definition = {
    id: 17,
    agentKey: 'scheduled-season-results-updater',
    name: 'Scheduled Season Results Updater',
    description: 'Test agent',
    version: '1.0.0',
    defaultMode: 'dry-run',
    supportsManualTrigger: true,
    supportsSchedule: true,
    supportsEventTrigger: false,
    owner: null,
    createdAt: new Date('2026-04-30T09:00:00.000Z'),
    updatedAt: new Date('2026-04-30T09:00:00.000Z'),
  };

  const run = {
    id: 51,
    agentDefinitionId: 17,
    agentConfigId: 19,
    runKey: 'season-updater-run-1',
    triggerType: 'manual' as const,
    triggerSource: 'admin-console',
    mode: 'semi-automatic' as const,
    status: 'waiting-approval' as const,
    initiatedBy: 'Admin',
    idempotencyKey: null,
    correlationId: 'corr-updater-1',
    summary: 'Waiting for approval',
    payload: { probe: true },
    resultJson: {
      status: 'waiting-approval',
      summary: 'Waiting for approval',
      approvals: [{ actionKey: 'apply-season-results-80', status: 'pending' }],
      actions: [{ actionKey: 'apply-season-results-80', status: 'pending-approval' }],
    },
    errorCode: null,
    errorMessage: null,
    startedAt: new Date('2026-04-30T12:00:00.000Z'),
    finishedAt: null,
    createdAt: new Date('2026-04-30T12:00:00.000Z'),
  };

  const action = {
    id: 61,
    runHistoryId: 51,
    actionKey: 'apply-season-results-80',
    kind: 'write' as const,
    status: 'pending-approval' as const,
    summary: 'Apply staged results for Premier League 2025/2026',
    targetType: 'season',
    targetId: '80',
    requiresApproval: true,
    requiresHumanExecution: false,
    generatedArtifactPath: 'C:/temp/season-80.json',
    actionPayload: {
      executor: 'scheduled-season-results-updater.apply-season-plan',
      transitionalId: 101,
      sportId: 1,
      leagueId: 10,
      seasonId: 80,
      seasonLabel: 'Premier League 2025/2026',
      seasonPhase: 'Regular',
      currentPhaseDetail: 'Regular',
    },
    resultPayload: null,
    createdAt: new Date('2026-04-30T12:00:00.000Z'),
    updatedAt: new Date('2026-04-30T12:00:00.000Z'),
  };

  const updates = {
    approvals: [] as any[],
    actionLogs: [] as any[],
    runHistory: [] as any[],
  };

  const db = {
    select: jest.fn((selection?: any) => ({
      from: jest.fn((table: unknown) => {
        if (selection && selection.run && selection.definition && table === schema.runHistory) {
          return {
            innerJoin: jest.fn(() => ({
              where: jest.fn(() => ({
                limit: jest.fn(async () => [{ run, definition }]),
              })),
            })),
          };
        }

        if (table === schema.approvals) {
          return {
            where: jest.fn(() => ({
              limit: jest.fn(async () => [approval]),
              orderBy: jest.fn(async () => [approval]),
            })),
          };
        }

        if (table === schema.users) {
          return {
            where: jest.fn(() => ({
              limit: jest.fn(async () => [user]),
            })),
          };
        }

        if (table === schema.actionLogs) {
          return {
            where: jest.fn(() => ({
              limit: jest.fn(async () => [action]),
            })),
          };
        }

        return {
          where: jest.fn(() => ({
            limit: jest.fn(async () => []),
          })),
        };
      }),
    })),
    update: jest.fn((table: unknown) => ({
      set: jest.fn((values: any) => ({
        where: jest.fn(async () => {
          if (table === schema.approvals) {
            Object.assign(approval, values);
            updates.approvals.push(values);
          }

          if (table === schema.actionLogs) {
            Object.assign(action, values);
            updates.actionLogs.push(values);
          }

          if (table === schema.runHistory) {
            Object.assign(run, values);
            updates.runHistory.push(values);
          }

          return [];
        }),
      })),
    })),
    insert: jest.fn(() => ({
      values: jest.fn(() => ({
        returning: jest.fn(async () => []),
      })),
    })),
  };

  return { db, updates, approval, run, action };
}

describe('AgentAdminService approval decisions', () => {
  const registry = { list: jest.fn().mockReturnValue([]), get: jest.fn().mockReturnValue(null) } as unknown as AgentRegistry;
  const scheduleService = { listSchedules: jest.fn().mockResolvedValue([]), reloadSchedules: jest.fn().mockResolvedValue(undefined) } as unknown as AgentScheduleService;

  it('marks approved semi-automatic runs as completed and updates action status', async () => {
    const { db, updates } = createApprovalDbMock('approved');
    const service = new AgentAdminService(db as never, registry, scheduleService);

    const result = await service.approveApproval(11, { decidedByUserId: 5, note: 'Approved for continuation' });

    expect(result.status).toBe('approved');
    expect(result.runStatus).toBe('completed');
    expect(result.actionStatus).toBe('approved');
    expect(updates.approvals[0]).toMatchObject({ status: 'approved', decidedByUserId: 5 });
    expect(updates.actionLogs[0]).toMatchObject({ status: 'approved' });
    expect(updates.runHistory[0]).toMatchObject({ status: 'completed' });
  });

  it('marks rejected semi-automatic runs as rejected and preserves the decision note', async () => {
    const { db, updates } = createApprovalDbMock('rejected');
    const service = new AgentAdminService(db as never, registry, scheduleService);

    const result = await service.rejectApproval(11, { decidedByUserId: 5, note: 'Rejected because the payload is stale' });

    expect(result.status).toBe('rejected');
    expect(result.runStatus).toBe('rejected');
    expect(result.actionStatus).toBe('rejected');
    expect(updates.approvals[0]).toMatchObject({ status: 'rejected', decidedByUserId: 5 });
    expect(updates.runHistory[0]).toMatchObject({ status: 'rejected' });
    expect(String(result.reason)).toContain('Rejected because the payload is stale');
  });

  it('executes approved updater actions and persists their result payload', async () => {
    const { db, updates, action } = createExecutableApprovalDbMock();
    const actionExecutionService = {
      executeApprovedAction: jest.fn().mockResolvedValue({
        status: 'executed',
        summary: 'Applied staged results for Premier League 2025/2026.',
        resultPayload: {
          request: { seasonId: 80, transitionalId: 101 },
          result: { applied: 12, updatedMatches: 1, createdStandings: 2 },
        },
      }),
    } as unknown as AgentActionExecutionService;
    const service = new AgentAdminService(db as never, registry, scheduleService, actionExecutionService);

    const result = await service.approveApproval(41, { decidedByUserId: 5, note: 'Approved for execution' });

    expect(actionExecutionService.executeApprovedAction).toHaveBeenCalledWith({
      agentKey: 'scheduled-season-results-updater',
      actionKey: 'apply-season-results-80',
      actionPayload: action.actionPayload,
      summary: action.summary,
    });
    expect(result.status).toBe('approved');
    expect(result.runStatus).toBe('completed');
    expect(result.actionStatus).toBe('executed');
    expect(updates.actionLogs[0]).toMatchObject({
      status: 'executed',
      resultPayload: {
        request: { seasonId: 80, transitionalId: 101 },
        result: { applied: 12, updatedMatches: 1, createdStandings: 2 },
      },
    });
    expect(updates.runHistory[0]).toMatchObject({ status: 'completed', errorCode: null, errorMessage: null });
  });

  it('marks the run as failed when approved updater execution fails', async () => {
    const { db, updates } = createExecutableApprovalDbMock();
    const actionExecutionService = {
      executeApprovedAction: jest.fn().mockResolvedValue({
        status: 'failed',
        summary: 'Execution failed',
        errorCode: 'AGENT_ACTION_EXECUTION_FAILED',
        errorMessage: 'fetch_not_complete',
        resultPayload: { result: { reason: 'fetch_not_complete' } },
      }),
    } as unknown as AgentActionExecutionService;
    const service = new AgentAdminService(db as never, registry, scheduleService, actionExecutionService);

    const result = await service.approveApproval(41, { decidedByUserId: 5, note: 'Approved but failed' });

    expect(result.status).toBe('approved');
    expect(result.runStatus).toBe('failed');
    expect(result.actionStatus).toBe('failed');
    expect(updates.actionLogs[0]).toMatchObject({ status: 'failed' });
    expect(updates.runHistory[0]).toMatchObject({
      status: 'failed',
      errorCode: 'AGENT_ACTION_EXECUTION_FAILED',
      errorMessage: 'fetch_not_complete',
    });
  });
});