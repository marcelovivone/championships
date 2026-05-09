import { AgentNotificationService } from '../../src/agents/agent-notification.service';
import * as schema from '../../src/db/schema';

function createNotificationDbMock() {
  const config = {
    id: 19,
    agentDefinitionId: 17,
    isEnabled: true,
    mode: 'semi-automatic',
    scheduleExpression: null,
    timeoutSeconds: 300,
    maxRetries: 2,
    approvalRequiredForWrites: true,
    notificationRecipients: ['ops@championships.local'],
    triggerFilters: null,
    configJson: null,
    createdAt: new Date('2026-04-30T09:00:00.000Z'),
    updatedAt: new Date('2026-04-30T09:00:00.000Z'),
  };

  const run = {
    id: 51,
    agentDefinitionId: 17,
    agentConfigId: 19,
    runKey: 'run-51',
    triggerType: 'manual',
    triggerSource: 'admin-console',
    mode: 'semi-automatic',
    status: 'waiting-approval',
    initiatedBy: 'Admin',
    idempotencyKey: null,
    correlationId: 'corr-51',
    summary: 'Waiting for approval',
    payload: null,
    resultJson: { status: 'waiting-approval', summary: 'Waiting for approval' },
    errorCode: null,
    errorMessage: null,
    startedAt: new Date('2026-04-30T10:00:00.000Z'),
    finishedAt: null,
    createdAt: new Date('2026-04-30T10:00:00.000Z'),
  };

  const approval = {
    id: 61,
    runHistoryId: 51,
    actionLogId: 71,
    requestedByUserId: null,
    decidedByUserId: null,
    status: 'pending' as const,
    summary: 'Approve apply-season-results-80',
    reason: 'Needs operator review',
    requestedAt: new Date('2026-04-30T10:05:00.000Z'),
    decidedAt: null,
    createdAt: new Date('2026-04-30T10:05:00.000Z'),
  };

  const insertedNotifications: any[] = [];
  const updates = {
    notifications: [] as any[],
    runHistory: [] as any[],
  };

  const db = {
    select: jest.fn(() => ({
      from: jest.fn((table: unknown) => ({
        where: jest.fn(() => ({
          limit: jest.fn(async () => {
            if (table === schema.agentConfig) return [config];
            if (table === schema.approvals) return [approval];
            if (table === schema.runHistory) return [run];
            return [];
          }),
        })),
      })),
    })),
    insert: jest.fn((table: unknown) => ({
      values: jest.fn((values: any) => {
        const normalized = Array.isArray(values) ? values : [values];
        if (table === schema.notifications) {
          insertedNotifications.push(...normalized);
        }
        return {
          returning: jest.fn(async () => normalized.map((value, index) => ({
            id: 100 + index,
            ...value,
            createdAt: new Date('2026-04-30T10:06:00.000Z'),
            sentAt: null,
          }))),
        };
      }),
    })),
    update: jest.fn((table: unknown) => ({
      set: jest.fn((values: any) => ({
        where: jest.fn(async () => {
          if (table === schema.notifications) {
            updates.notifications.push(values);
          }
          if (table === schema.runHistory) {
            Object.assign(run, values);
            updates.runHistory.push(values);
          }
          return [];
        }),
      })),
    })),
  };

  return { db, insertedNotifications, updates, run };
}

describe('AgentNotificationService', () => {
  it('persists and delivers approval-required notifications with a run summary update', async () => {
    const { db, insertedNotifications, updates } = createNotificationDbMock();
    const service = new AgentNotificationService(db as never);
    jest.spyOn(service as any, 'resolveTransport').mockReturnValue({
      transportLabel: 'json',
      transporter: {
        sendMail: jest.fn().mockResolvedValue({ message: '{"preview":true}' }),
      },
    });

    await service.onRunSucceeded({
      runId: 51,
      runKey: 'run-51',
      agentDefinitionId: 17,
      agentConfigId: 19,
      definition: {
        agentKey: 'scheduled-season-results-updater',
        name: 'Scheduled Season Results Updater',
        defaultMode: 'dry-run',
        supportsManualTrigger: true,
        supportsSchedule: true,
        supportsEventTrigger: false,
      },
      context: {
        agentKey: 'scheduled-season-results-updater',
        mode: 'semi-automatic',
        triggerType: 'manual',
        triggerSource: 'admin-console',
        startedAt: new Date('2026-04-30T10:00:00.000Z'),
        initiatedBy: 'Admin',
      },
      result: {
        status: 'waiting-approval',
        summary: 'Waiting for approval',
        actions: [],
        approvals: [{ approvalKey: 'a1', actionKey: 'apply-season-results-80', summary: 'Approve', status: 'pending' }],
      },
    });

    expect(insertedNotifications[0]).toMatchObject({
      recipient: 'ops@championships.local',
      channel: 'email',
      approvalId: 61,
    });
    expect(updates.notifications[0]).toMatchObject({ status: 'sent' });
    expect(updates.runHistory[0].resultJson.notificationSummary).toMatchObject({
      reason: 'approval-required',
      sentCount: 1,
      failedCount: 0,
      totalRecipients: 1,
      maxRetries: 2,
    });
  });

  it('records failed notification delivery attempts with bounded retries', async () => {
    const { db, updates } = createNotificationDbMock();
    const service = new AgentNotificationService(db as never);
    const sendMail = jest.fn().mockRejectedValue(new Error('smtp offline'));
    jest.spyOn(service as any, 'resolveTransport').mockReturnValue({
      transportLabel: 'json',
      transporter: { sendMail },
    });

    await service.onRunFailed({
      runId: 51,
      runKey: 'run-51',
      agentDefinitionId: 17,
      agentConfigId: 19,
      definition: {
        agentKey: 'scheduled-season-results-updater',
        name: 'Scheduled Season Results Updater',
        defaultMode: 'dry-run',
        supportsManualTrigger: true,
        supportsSchedule: true,
        supportsEventTrigger: false,
      },
      context: {
        agentKey: 'scheduled-season-results-updater',
        mode: 'semi-automatic',
        triggerType: 'manual',
        triggerSource: 'admin-console',
        startedAt: new Date('2026-04-30T10:00:00.000Z'),
        initiatedBy: 'Admin',
      },
      result: {
        status: 'failed',
        summary: 'Updater failed',
        actions: [],
        errors: [{ code: 'UPDATER_FAILED', message: 'boom', retryable: false }],
      },
      error: { code: 'UPDATER_FAILED', message: 'boom', retryable: false },
    });

    expect(sendMail).toHaveBeenCalledTimes(3);
    expect(updates.notifications[0]).toMatchObject({
      status: 'failed',
      metadata: expect.objectContaining({
        attemptCount: 3,
        maxRetries: 2,
        lastError: 'smtp offline',
      }),
    });
    expect(updates.runHistory[0].resultJson.notificationSummary).toMatchObject({
      reason: 'run-failed',
      failedCount: 1,
      totalAttempts: 3,
      maxRetries: 2,
      classification: 'terminal-run-failure',
    });
  });

  it('delivers scheduled completion notifications for successful schedule runs', async () => {
    const { db, insertedNotifications, updates } = createNotificationDbMock();
    const service = new AgentNotificationService(db as never);
    jest.spyOn(service as any, 'resolveTransport').mockReturnValue({
      transportLabel: 'json',
      transporter: {
        sendMail: jest.fn().mockResolvedValue({ message: '{"preview":true}' }),
      },
    });

    await service.onRunSucceeded({
      runId: 51,
      runKey: 'run-51',
      agentDefinitionId: 17,
      agentConfigId: 19,
      definition: {
        agentKey: 'scheduled-season-results-updater',
        name: 'Scheduled Season Results Updater',
        defaultMode: 'dry-run',
        supportsManualTrigger: true,
        supportsSchedule: true,
        supportsEventTrigger: false,
      },
      context: {
        agentKey: 'scheduled-season-results-updater',
        mode: 'autonomous',
        triggerType: 'schedule',
        triggerSource: 'cron:0 */6 * * *',
        startedAt: new Date('2026-04-30T10:00:00.000Z'),
        initiatedBy: 'system:scheduler',
      },
      result: {
        status: 'completed',
        summary: 'Checked 9 current season(s); 0 need update action(s).',
        actions: [],
      },
    });

    expect(insertedNotifications[0]).toMatchObject({
      recipient: 'ops@championships.local',
      channel: 'email',
      subject: '[Agent completed] Scheduled Season Results Updater',
    });
    expect(updates.notifications[0]).toMatchObject({ status: 'sent' });
    expect(updates.runHistory[0].resultJson.notificationSummary).toMatchObject({
      reason: 'run-completed',
      classification: 'scheduled-run-completed',
      sentCount: 1,
      failedCount: 0,
      totalRecipients: 1,
    });
  });
});