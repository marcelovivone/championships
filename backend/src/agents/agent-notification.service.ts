import { Inject, Injectable } from '@nestjs/common';
import { and, eq } from 'drizzle-orm';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as nodemailer from 'nodemailer';
import * as schema from '../db/schema';
import {
  AgentError,
  AgentNotification,
  AgentRunLifecycleEvent,
  AgentRunLifecycleHook,
} from './contracts';

type AgentConfigRow = typeof schema.agentConfig.$inferSelect;
type NotificationRow = typeof schema.notifications.$inferSelect;

type NotificationDispatchReason = 'approval-required' | 'run-completed' | 'run-failed';

type NotificationDispatchContext = {
  runId: number;
  agentDefinitionId: number;
  agentConfigId?: number | null;
  agentKey: string;
  agentName: string;
  summary: string;
  initiatedBy?: string | null;
  triggerType: string;
  triggerSource: string;
  error?: AgentError;
  approvalCount?: number;
};

type DeliverySummary = {
  totalRecipients: number;
  sentCount: number;
  failedCount: number;
  totalAttempts: number;
  maxRetries: number;
  classification: string;
};

@Injectable()
export class AgentNotificationService implements AgentRunLifecycleHook {
  constructor(
    @Inject('DRIZZLE') private readonly db: NodePgDatabase<typeof schema>,
  ) {}

  async onRunSucceeded(event: AgentRunLifecycleEvent): Promise<void> {
    if (!event.result) {
      return;
    }

    const baseContext: NotificationDispatchContext = {
      runId: event.runId,
      agentDefinitionId: event.agentDefinitionId,
      agentConfigId: event.agentConfigId,
      agentKey: event.definition.agentKey,
      agentName: event.definition.name,
      summary: event.result.summary,
      initiatedBy: event.context.initiatedBy ?? null,
      triggerType: event.context.triggerType,
      triggerSource: event.context.triggerSource,
      approvalCount: Array.isArray(event.result.approvals) ? event.result.approvals.length : 0,
    };

    if (event.result.status === 'waiting-approval') {
      await this.dispatchNotifications('approval-required', baseContext);
      return;
    }

    if (event.result.status === 'completed' && event.context.triggerType === 'schedule') {
      await this.dispatchNotifications('run-completed', baseContext);
    }
  }

  async onRunFailed(event: AgentRunLifecycleEvent): Promise<void> {
    const error = event.error ?? event.result?.errors?.[0];

    await this.dispatchNotifications('run-failed', {
      runId: event.runId,
      agentDefinitionId: event.agentDefinitionId,
      agentConfigId: event.agentConfigId,
      agentKey: event.definition.agentKey,
      agentName: event.definition.name,
      summary: event.result?.summary ?? `${event.definition.name} failed`,
      initiatedBy: event.context.initiatedBy ?? null,
      triggerType: event.context.triggerType,
      triggerSource: event.context.triggerSource,
      error,
    });
  }

  async notifyFailedRun(input: NotificationDispatchContext): Promise<void> {
    await this.dispatchNotifications('run-failed', input);
  }

  private async dispatchNotifications(
    reason: NotificationDispatchReason,
    context: NotificationDispatchContext,
  ): Promise<void> {
    const config = await this.getConfig(context.agentConfigId ?? null, context.agentDefinitionId);
    const recipients = this.normalizeRecipients(config?.notificationRecipients);
    const maxRetries = this.resolveMaxRetries(config?.maxRetries ?? 0);
    const classification = this.classify(reason, context.error);

    if (recipients.length === 0) {
      await this.updateRunNotificationSummary(context.runId, {
        reason,
        classification,
        totalRecipients: 0,
        sentCount: 0,
        failedCount: 0,
        totalAttempts: 0,
        maxRetries,
      });
      return;
    }

    const approvalId = reason === 'approval-required' ? await this.findPendingApprovalId(context.runId) : null;
    const notifications = this.buildNotifications(reason, context, recipients);
    const inserted = await this.db
      .insert(schema.notifications)
      .values(
        notifications.map((notification) => ({
          agentDefinitionId: context.agentDefinitionId,
          runHistoryId: context.runId,
          approvalId,
          channel: notification.channel,
          status: notification.status ?? 'pending',
          recipient: notification.recipient,
          subject: notification.subject,
          message: notification.message,
          metadata: notification.metadata,
        })),
      )
      .returning();

    const deliverySummary: DeliverySummary = {
      totalRecipients: inserted.length,
      sentCount: 0,
      failedCount: 0,
      totalAttempts: 0,
      maxRetries,
      classification,
    };

    for (const notification of inserted) {
      const delivery = await this.deliverNotification(notification, maxRetries, classification);
      deliverySummary.totalAttempts += delivery.attemptCount;
      if (delivery.status === 'sent') {
        deliverySummary.sentCount += 1;
      } else {
        deliverySummary.failedCount += 1;
      }
    }

    await this.updateRunNotificationSummary(context.runId, {
      reason,
      classification,
      totalRecipients: deliverySummary.totalRecipients,
      sentCount: deliverySummary.sentCount,
      failedCount: deliverySummary.failedCount,
      totalAttempts: deliverySummary.totalAttempts,
      maxRetries: deliverySummary.maxRetries,
    });
  }

  private async getConfig(
    agentConfigId: number | null,
    agentDefinitionId: number,
  ): Promise<AgentConfigRow | null> {
    if (agentConfigId) {
      const [config] = await this.db
        .select()
        .from(schema.agentConfig)
        .where(eq(schema.agentConfig.id, agentConfigId))
        .limit(1);

      if (config) {
        return config;
      }
    }

    const [config] = await this.db
      .select()
      .from(schema.agentConfig)
      .where(
        and(
          eq(schema.agentConfig.agentDefinitionId, agentDefinitionId),
          eq(schema.agentConfig.isEnabled, true),
        ),
      )
      .limit(1);

    return config ?? null;
  }

  private normalizeRecipients(value: unknown): string[] {
    if (!Array.isArray(value)) {
      return [];
    }

    return value
      .map((recipient) => (typeof recipient === 'string' ? recipient.trim() : ''))
      .filter((recipient) => recipient.length > 0);
  }

  private resolveMaxRetries(value: number): number {
    const normalized = Number(value);
    if (!Number.isInteger(normalized) || normalized <= 0) {
      return 0;
    }

    return Math.min(normalized, 3);
  }

  private classify(reason: NotificationDispatchReason, error?: AgentError): string {
    if (reason === 'approval-required') {
      return 'approval-required';
    }

    if (reason === 'run-completed') {
      return 'scheduled-run-completed';
    }

    return error?.retryable ? 'retryable-run-failure' : 'terminal-run-failure';
  }

  private buildNotifications(
    reason: NotificationDispatchReason,
    context: NotificationDispatchContext,
    recipients: string[],
  ): AgentNotification[] {
    const baseMetadata = {
      reason,
      classification: this.classify(reason, context.error),
      agentKey: context.agentKey,
      triggerType: context.triggerType,
      triggerSource: context.triggerSource,
      initiatedBy: context.initiatedBy ?? null,
    };

    if (reason === 'approval-required') {
      const subject = `[Approval required] ${context.agentName}`;
      const message = `${context.agentName} is waiting for approval. ${context.summary}`;
      return recipients.map((recipient) => ({
        channel: 'email',
        recipient,
        subject,
        message,
        metadata: {
          ...baseMetadata,
          approvalCount: context.approvalCount ?? 0,
        },
      }));
    }

    if (reason === 'run-completed') {
      const subject = `[Agent completed] ${context.agentName}`;
      const message = `${context.agentName} completed its scheduled run. ${context.summary}`;
      return recipients.map((recipient) => ({
        channel: 'email',
        recipient,
        subject,
        message,
        metadata: baseMetadata,
      }));
    }

    const subject = `[Agent failed] ${context.agentName}`;
    const errorMessage = context.error?.message ? ` Error: ${context.error.message}` : '';
    const message = `${context.agentName} failed. ${context.summary}${errorMessage}`;
    return recipients.map((recipient) => ({
      channel: 'email',
      recipient,
      subject,
      message,
      metadata: {
        ...baseMetadata,
        errorCode: context.error?.code ?? null,
        retryable: context.error?.retryable ?? false,
      },
    }));
  }

  private async findPendingApprovalId(runId: number): Promise<number | null> {
    const [approval] = await this.db
      .select()
      .from(schema.approvals)
      .where(
        and(
          eq(schema.approvals.runHistoryId, runId),
          eq(schema.approvals.status, 'pending'),
        ),
      )
      .limit(1);

    return approval?.id ?? null;
  }

  private async deliverNotification(
    notification: NotificationRow,
    maxRetries: number,
    classification: string,
  ): Promise<{ status: 'sent' | 'failed'; attemptCount: number }> {
    const transport = this.resolveTransport();
    let attemptCount = 0;
    let lastError: string | null = null;
    let preview: string | null = null;

    while (attemptCount <= maxRetries) {
      attemptCount += 1;
      try {
        const info = await transport.transporter.sendMail({
          from: process.env.AGENT_EMAIL_FROM || 'agents@championships.local',
          to: notification.recipient,
          subject: notification.subject ?? 'Championships agent notification',
          text: notification.message,
        });
        preview = typeof (info as any).message === 'string'
          ? (info as any).message
          : typeof (info as any).message === 'object'
            ? JSON.stringify((info as any).message)
            : null;

        await this.db
          .update(schema.notifications)
          .set({
            status: 'sent',
            sentAt: new Date(),
            metadata: {
              ...(this.asObject(notification.metadata) ?? {}),
              classification,
              transport: transport.transportLabel,
              attemptCount,
              maxRetries,
              preview,
            },
          })
          .where(eq(schema.notifications.id, notification.id));

        return { status: 'sent', attemptCount };
      } catch (error) {
        lastError = error instanceof Error ? error.message : String(error);
      }
    }

    await this.db
      .update(schema.notifications)
      .set({
        status: 'failed',
        metadata: {
          ...(this.asObject(notification.metadata) ?? {}),
          classification,
          transport: transport.transportLabel,
          attemptCount,
          maxRetries,
          lastError,
        },
      })
      .where(eq(schema.notifications.id, notification.id));

    return { status: 'failed', attemptCount };
  }

  private resolveTransport(): { transporter: nodemailer.Transporter; transportLabel: string } {
    const host = process.env.AGENT_EMAIL_HOST?.trim();
    const port = Number(process.env.AGENT_EMAIL_PORT ?? 0);
    const secure = String(process.env.AGENT_EMAIL_SECURE ?? 'false').toLowerCase() === 'true';
    const user = process.env.AGENT_EMAIL_USER?.trim();
    const pass = process.env.AGENT_EMAIL_PASS?.trim();

    if (host && Number.isFinite(port) && port > 0) {
      return {
        transporter: nodemailer.createTransport({
          host,
          port,
          secure,
          auth: user ? { user, pass } : undefined,
        }),
        transportLabel: 'smtp',
      };
    }

    return {
      transporter: nodemailer.createTransport({ jsonTransport: true }),
      transportLabel: 'json',
    };
  }

  private async updateRunNotificationSummary(
    runId: number,
    summary: {
      reason: NotificationDispatchReason;
      classification: string;
      totalRecipients: number;
      sentCount: number;
      failedCount: number;
      totalAttempts: number;
      maxRetries: number;
    },
  ): Promise<void> {
    const [run] = await this.db
      .select()
      .from(schema.runHistory)
      .where(eq(schema.runHistory.id, runId))
      .limit(1);

    if (!run) {
      return;
    }

    const resultJson = this.asObject(run.resultJson) ?? {};
    await this.db
      .update(schema.runHistory)
      .set({
        resultJson: {
          ...resultJson,
          notificationSummary: {
            ...(this.asObject(resultJson.notificationSummary) ?? {}),
            reason: summary.reason,
            classification: summary.classification,
            totalRecipients: summary.totalRecipients,
            sentCount: summary.sentCount,
            failedCount: summary.failedCount,
            totalAttempts: summary.totalAttempts,
            maxRetries: summary.maxRetries,
            updatedAt: new Date().toISOString(),
          },
        },
      })
      .where(eq(schema.runHistory.id, runId));
  }

  private asObject(value: unknown): Record<string, any> | null {
    return typeof value === 'object' && value !== null && !Array.isArray(value)
      ? (value as Record<string, any>)
      : null;
  }
}