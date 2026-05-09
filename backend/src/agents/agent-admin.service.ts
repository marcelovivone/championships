import { BadRequestException, Inject, Injectable, NotFoundException, Optional } from '@nestjs/common';
import { and, desc, eq } from 'drizzle-orm';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from '../db/schema';
import {
  AgentApprovalStatus,
  AgentDefinitionContract,
  AgentExecutionMode,
  AgentError,
  AgentRunStatus,
  AgentTriggerType,
} from './contracts';
import { AgentActionExecutionService } from './agent-action-execution.service';
import { AgentNotificationService } from './agent-notification.service';
import { AgentRegistry } from './agent-registry.service';
import { AgentScheduleService } from './agent-schedule.service';

export interface AgentSetupConfigInput {
  isEnabled: boolean;
  mode: AgentExecutionMode;
  scheduleExpression?: string | null;
  timeoutSeconds: number;
  maxRetries: number;
  approvalRequiredForWrites: boolean;
  notificationRecipients?: string[];
}

export interface AgentRunHistoryFilters {
  agentKey?: string;
  status?: AgentRunStatus;
  triggerType?: AgentTriggerType;
  limit?: number;
}

export interface ApprovalQueueFilters {
  agentKey?: string;
  status?: AgentApprovalStatus;
  limit?: number;
}

export interface ApprovalDecisionInput {
  decidedByUserId?: number;
  note?: string;
}

type AgentDefinitionRow = typeof schema.agentDefinitions.$inferSelect;
type AgentConfigRow = typeof schema.agentConfig.$inferSelect;
type RunHistoryRow = typeof schema.runHistory.$inferSelect;
type ActionLogRow = typeof schema.actionLogs.$inferSelect;
type ApprovalRow = typeof schema.approvals.$inferSelect;
type NotificationRow = typeof schema.notifications.$inferSelect;

@Injectable()
export class AgentAdminService {
  constructor(
    @Inject('DRIZZLE') private readonly db: NodePgDatabase<typeof schema>,
    private readonly registry: AgentRegistry,
    private readonly agentScheduleService: AgentScheduleService,
    @Optional() private readonly agentActionExecutionService?: AgentActionExecutionService,
    @Optional() private readonly agentNotificationService?: AgentNotificationService,
  ) {}

  async listAgentSetups() {
    const definitions = await this.ensureRegisteredDefinitions();
    const schedules = await this.agentScheduleService.listSchedules();
    const schedulesByAgentKey = new Map<string, Array<(typeof schedules)[number]>>();

    schedules.forEach((schedule) => {
      const existing = schedulesByAgentKey.get(schedule.agentKey) ?? [];
      existing.push(schedule);
      schedulesByAgentKey.set(schedule.agentKey, existing);
    });

    const items = await Promise.all(
      this.registry.list().map(async (handler) => {
        const definition = definitions.get(handler.definition.agentKey);

        if (!definition) {
          throw new NotFoundException(`Missing persisted definition for ${handler.definition.agentKey}`);
        }

        const [config, latestRun] = await Promise.all([
          this.getLatestConfig(definition.id),
          this.getLatestRun(definition.id),
        ]);

        return {
          definition: this.serializeDefinition(handler.definition, definition),
          config: this.serializeConfig(config),
          latestRun: this.serializeRun(latestRun),
          schedules: schedulesByAgentKey.get(handler.definition.agentKey) ?? [],
        };
      }),
    );

    return { items };
  }

  async getAgentSetup(agentKey: string) {
    const definition = await this.ensureRegisteredDefinition(agentKey);
    const handler = this.registry.get(agentKey);

    if (!handler) {
      throw new NotFoundException(`No agent registered for key "${agentKey}"`);
    }

    const schedules = await this.agentScheduleService.listSchedules();
    const [config, latestRun] = await Promise.all([
      this.getLatestConfig(definition.id),
      this.getLatestRun(definition.id),
    ]);

    return {
      definition: this.serializeDefinition(handler.definition, definition),
      config: this.serializeConfig(config),
      latestRun: this.serializeRun(latestRun),
      schedules: schedules.filter((schedule) => schedule.agentKey === agentKey),
    };
  }

  async saveAgentSetup(agentKey: string, input: AgentSetupConfigInput) {
    const definition = await this.ensureRegisteredDefinition(agentKey);
    const currentConfig = await this.getLatestConfig(definition.id);
    const normalizedSchedule = input.scheduleExpression?.trim() ? input.scheduleExpression.trim() : null;
    const normalizedRecipients = (input.notificationRecipients ?? [])
      .map((recipient) => recipient.trim())
      .filter(Boolean);

    if (currentConfig) {
      await this.db
        .update(schema.agentConfig)
        .set({
          isEnabled: input.isEnabled,
          mode: input.mode,
          scheduleExpression: normalizedSchedule,
          timeoutSeconds: input.timeoutSeconds,
          maxRetries: input.maxRetries,
          approvalRequiredForWrites: input.approvalRequiredForWrites,
          notificationRecipients: normalizedRecipients.length > 0 ? normalizedRecipients : null,
          updatedAt: new Date(),
        })
        .where(eq(schema.agentConfig.id, currentConfig.id));
    } else {
      await this.db.insert(schema.agentConfig).values({
        agentDefinitionId: definition.id,
        isEnabled: input.isEnabled,
        mode: input.mode,
        scheduleExpression: normalizedSchedule,
        timeoutSeconds: input.timeoutSeconds,
        maxRetries: input.maxRetries,
        approvalRequiredForWrites: input.approvalRequiredForWrites,
        notificationRecipients: normalizedRecipients.length > 0 ? normalizedRecipients : null,
      });
    }

    await this.agentScheduleService.reloadSchedules();

    return this.getAgentSetup(agentKey);
  }

  async listRunHistory(filters: AgentRunHistoryFilters = {}) {
    const limit = Math.min(Math.max(filters.limit ?? 25, 1), 100);
    const conditions = [] as ReturnType<typeof eq>[];

    if (filters.agentKey) {
      conditions.push(eq(schema.agentDefinitions.agentKey, filters.agentKey));
    }

    if (filters.status) {
      conditions.push(eq(schema.runHistory.status, filters.status));
    }

    if (filters.triggerType) {
      conditions.push(eq(schema.runHistory.triggerType, filters.triggerType));
    }

    const baseQuery = this.db
      .select({
        run: schema.runHistory,
        definition: schema.agentDefinitions,
      })
      .from(schema.runHistory)
      .innerJoin(
        schema.agentDefinitions,
        eq(schema.runHistory.agentDefinitionId, schema.agentDefinitions.id),
      );

    const rows = conditions.length > 0
      ? await baseQuery.where(and(...conditions)).orderBy(desc(schema.runHistory.createdAt)).limit(limit)
      : await baseQuery.orderBy(desc(schema.runHistory.createdAt)).limit(limit);

    return {
      items: rows.map((row) => this.serializeRun(row.run, row.definition)),
    };
  }

  async getRunDetail(runId: number) {
    const [runRecord] = await this.db
      .select({
        run: schema.runHistory,
        definition: schema.agentDefinitions,
      })
      .from(schema.runHistory)
      .innerJoin(
        schema.agentDefinitions,
        eq(schema.runHistory.agentDefinitionId, schema.agentDefinitions.id),
      )
      .where(eq(schema.runHistory.id, runId))
      .limit(1);

    if (!runRecord) {
      throw new NotFoundException(`Run ${runId} was not found`);
    }

    const [actions, approvals, notifications] = await Promise.all([
      this.db
        .select()
        .from(schema.actionLogs)
        .where(eq(schema.actionLogs.runHistoryId, runId))
        .orderBy(desc(schema.actionLogs.createdAt)),
      this.db
        .select()
        .from(schema.approvals)
        .where(eq(schema.approvals.runHistoryId, runId))
        .orderBy(desc(schema.approvals.requestedAt)),
      this.db
        .select()
        .from(schema.notifications)
        .where(eq(schema.notifications.runHistoryId, runId))
        .orderBy(desc(schema.notifications.createdAt)),
    ]);

    const resultJson = this.asObject(runRecord.run.resultJson);

    return {
      run: this.serializeRun(runRecord.run, runRecord.definition),
      warnings: this.asArray(resultJson?.warnings),
      errors: this.asArray(resultJson?.errors),
      approvals: approvals.map((approval) =>
        this.serializeApproval(
          approval,
          runRecord.run,
          runRecord.definition,
          actions.find((action) => action.id === approval.actionLogId) ?? null,
        ),
      ),
      actions: actions.map((action) => this.serializeAction(action)),
      notifications: notifications.map((notification) => this.serializeNotification(notification)),
      metrics: resultJson?.metrics ?? null,
      result: resultJson?.result ?? null,
      payload: runRecord.run.payload ?? null,
    };
  }

  async listApprovals(filters: ApprovalQueueFilters = {}) {
    const limit = Math.min(Math.max(filters.limit ?? 25, 1), 100);
    const conditions = [] as ReturnType<typeof eq>[];

    if (filters.agentKey) {
      conditions.push(eq(schema.agentDefinitions.agentKey, filters.agentKey));
    }

    if (filters.status) {
      conditions.push(eq(schema.approvals.status, filters.status));
    }

    const baseQuery = this.db
      .select({
        approval: schema.approvals,
        run: schema.runHistory,
        definition: schema.agentDefinitions,
        action: schema.actionLogs,
      })
      .from(schema.approvals)
      .innerJoin(
        schema.runHistory,
        eq(schema.approvals.runHistoryId, schema.runHistory.id),
      )
      .innerJoin(
        schema.agentDefinitions,
        eq(schema.runHistory.agentDefinitionId, schema.agentDefinitions.id),
      )
      .leftJoin(
        schema.actionLogs,
        eq(schema.approvals.actionLogId, schema.actionLogs.id),
      );

    const rows = conditions.length > 0
      ? await baseQuery.where(and(...conditions)).orderBy(desc(schema.approvals.requestedAt)).limit(limit)
      : await baseQuery.orderBy(desc(schema.approvals.requestedAt)).limit(limit);

    return {
      items: rows.map((row) => this.serializeApproval(row.approval, row.run, row.definition, row.action ?? null)),
    };
  }

  async approveApproval(approvalId: number, input: ApprovalDecisionInput) {
    return this.decideApproval(approvalId, 'approved', input);
  }

  async rejectApproval(approvalId: number, input: ApprovalDecisionInput) {
    return this.decideApproval(approvalId, 'rejected', input);
  }

  private async ensureRegisteredDefinitions(): Promise<Map<string, AgentDefinitionRow>> {
    const definitionMap = new Map<string, AgentDefinitionRow>();

    for (const handler of this.registry.list()) {
      const persisted = await this.ensureDefinition(handler.definition);
      definitionMap.set(handler.definition.agentKey, persisted);
    }

    return definitionMap;
  }

  private async ensureRegisteredDefinition(agentKey: string): Promise<AgentDefinitionRow> {
    const handler = this.registry.get(agentKey);

    if (!handler) {
      throw new NotFoundException(`No agent registered for key "${agentKey}"`);
    }

    return this.ensureDefinition(handler.definition);
  }

  private async ensureDefinition(definition: AgentDefinitionContract): Promise<AgentDefinitionRow> {
    const [existing] = await this.db
      .select()
      .from(schema.agentDefinitions)
      .where(eq(schema.agentDefinitions.agentKey, definition.agentKey))
      .limit(1);

    if (!existing) {
      const [created] = await this.db
        .insert(schema.agentDefinitions)
        .values({
          agentKey: definition.agentKey,
          name: definition.name,
          description: definition.description,
          defaultMode: definition.defaultMode,
          supportsManualTrigger: definition.supportsManualTrigger,
          supportsSchedule: definition.supportsSchedule,
          supportsEventTrigger: definition.supportsEventTrigger,
        })
        .returning();

      return created;
    }

    const needsUpdate =
      existing.name !== definition.name ||
      existing.description !== (definition.description ?? null) ||
      existing.defaultMode !== definition.defaultMode ||
      existing.supportsManualTrigger !== definition.supportsManualTrigger ||
      existing.supportsSchedule !== definition.supportsSchedule ||
      existing.supportsEventTrigger !== definition.supportsEventTrigger;

    if (!needsUpdate) {
      return existing;
    }

    const [updated] = await this.db
      .update(schema.agentDefinitions)
      .set({
        name: definition.name,
        description: definition.description ?? null,
        defaultMode: definition.defaultMode,
        supportsManualTrigger: definition.supportsManualTrigger,
        supportsSchedule: definition.supportsSchedule,
        supportsEventTrigger: definition.supportsEventTrigger,
        updatedAt: new Date(),
      })
      .where(eq(schema.agentDefinitions.id, existing.id))
      .returning();

    return updated;
  }

  private async getLatestConfig(agentDefinitionId: number): Promise<AgentConfigRow | null> {
    const [config] = await this.db
      .select()
      .from(schema.agentConfig)
      .where(eq(schema.agentConfig.agentDefinitionId, agentDefinitionId))
      .orderBy(desc(schema.agentConfig.updatedAt), desc(schema.agentConfig.createdAt))
      .limit(1);

    return config ?? null;
  }

  private async getLatestRun(agentDefinitionId: number): Promise<RunHistoryRow | null> {
    const [run] = await this.db
      .select()
      .from(schema.runHistory)
      .where(eq(schema.runHistory.agentDefinitionId, agentDefinitionId))
      .orderBy(desc(schema.runHistory.createdAt))
      .limit(1);

    return run ?? null;
  }

  private async decideApproval(
    approvalId: number,
    decision: 'approved' | 'rejected',
    input: ApprovalDecisionInput,
  ) {
    const [approval] = await this.db
      .select()
      .from(schema.approvals)
      .where(eq(schema.approvals.id, approvalId))
      .limit(1);

    if (!approval) {
      throw new NotFoundException(`Approval ${approvalId} was not found`);
    }

    if (approval.status !== 'pending') {
      throw new BadRequestException(`Approval ${approvalId} is already ${approval.status}`);
    }

    if (input.decidedByUserId) {
      const [user] = await this.db
        .select()
        .from(schema.users)
        .where(eq(schema.users.id, input.decidedByUserId))
        .limit(1);

      if (!user) {
        throw new NotFoundException(`User ${input.decidedByUserId} was not found`);
      }
    }

    const [runRecord] = await this.db
      .select({
        run: schema.runHistory,
        definition: schema.agentDefinitions,
      })
      .from(schema.runHistory)
      .innerJoin(
        schema.agentDefinitions,
        eq(schema.runHistory.agentDefinitionId, schema.agentDefinitions.id),
      )
      .where(eq(schema.runHistory.id, approval.runHistoryId))
      .limit(1);

    if (!runRecord) {
      throw new NotFoundException(`Run ${approval.runHistoryId} for approval ${approvalId} was not found`);
    }

    const decidedAt = new Date();
    const nextReason = input.note?.trim()
      ? approval.reason
        ? `${approval.reason}\nDecision note: ${input.note.trim()}`
        : `Decision note: ${input.note.trim()}`
      : approval.reason;

    await this.db
      .update(schema.approvals)
      .set({
        status: decision,
        decidedByUserId: input.decidedByUserId ?? null,
        decidedAt,
        reason: nextReason,
      })
      .where(eq(schema.approvals.id, approvalId));

    let action: ActionLogRow | null = null;
    let actionStatus: ActionLogRow['status'] | null = null;
    let actionResultPayload: unknown = null;
    let executionFailure: { code: string; message: string } | null = null;

    if (approval.actionLogId) {
      const [existingAction] = await this.db
        .select()
        .from(schema.actionLogs)
        .where(eq(schema.actionLogs.id, approval.actionLogId))
        .limit(1);

      action = existingAction ?? null;

      if (action) {
        actionStatus = decision;
        actionResultPayload = action.resultPayload ?? null;

        if (decision === 'approved' && this.agentActionExecutionService) {
          const execution = await this.agentActionExecutionService.executeApprovedAction({
            agentKey: runRecord.definition.agentKey,
            actionKey: action.actionKey,
            actionPayload: action.actionPayload,
            summary: action.summary,
          });

          actionStatus = execution.status;
          actionResultPayload = execution.resultPayload ?? null;

          if (execution.status === 'failed') {
            executionFailure = {
              code: execution.errorCode ?? 'AGENT_ACTION_EXECUTION_FAILED',
              message: execution.errorMessage ?? execution.summary,
            };
          }
        }

        await this.db
          .update(schema.actionLogs)
          .set({
            status: actionStatus,
            resultPayload: actionResultPayload,
            updatedAt: decidedAt,
          })
          .where(eq(schema.actionLogs.id, action.id));

        action = {
          ...action,
          status: actionStatus,
          resultPayload: actionResultPayload,
          updatedAt: decidedAt,
        };
      }
    }

    const approvals = await this.db
      .select()
      .from(schema.approvals)
      .where(eq(schema.approvals.runHistoryId, approval.runHistoryId))
      .orderBy(desc(schema.approvals.requestedAt));

    const nextRunStatus: AgentRunStatus = executionFailure
      ? 'failed'
      : approvals.some((item) => item.status === 'rejected')
        ? 'rejected'
        : approvals.some((item) => item.status === 'pending')
          ? 'waiting-approval'
          : 'completed';

    const nextRunSummary = executionFailure
      ? `${runRecord.definition.name} failed while executing an approved action`
      : nextRunStatus === 'rejected'
        ? `${runRecord.definition.name} was rejected in the approval queue`
        : nextRunStatus === 'waiting-approval'
          ? `${runRecord.definition.name} is still waiting for approval decisions`
          : `${runRecord.definition.name} completed approval review`;

    await this.db
      .update(schema.runHistory)
      .set({
        status: nextRunStatus,
        summary: nextRunSummary,
        resultJson: this.buildUpdatedResultJson(
          runRecord.run,
          approvals,
          action?.actionKey ?? null,
          decision,
          actionStatus,
          actionResultPayload,
          nextRunStatus,
          nextRunSummary,
          executionFailure,
        ),
        errorCode: executionFailure?.code ?? null,
        errorMessage: executionFailure?.message ?? null,
        finishedAt: nextRunStatus === 'waiting-approval' ? null : decidedAt,
      })
      .where(eq(schema.runHistory.id, runRecord.run.id));

    if (executionFailure && this.agentNotificationService) {
      const failureError: AgentError = {
        code: executionFailure.code,
        message: executionFailure.message,
        retryable: false,
      };

      await this.agentNotificationService.notifyFailedRun({
        runId: runRecord.run.id,
        agentDefinitionId: runRecord.definition.id,
        agentConfigId: runRecord.run.agentConfigId ?? null,
        agentKey: runRecord.definition.agentKey,
        agentName: runRecord.definition.name,
        summary: nextRunSummary,
        initiatedBy: runRecord.run.initiatedBy ?? null,
        triggerType: runRecord.run.triggerType,
        triggerSource: runRecord.run.triggerSource,
        error: failureError,
      });
    }

    return this.serializeApproval(
      {
        ...approval,
        status: decision,
        decidedByUserId: input.decidedByUserId ?? null,
        decidedAt,
        reason: nextReason,
      },
      {
        ...runRecord.run,
        status: nextRunStatus,
        summary: nextRunSummary,
        errorCode: executionFailure?.code ?? null,
        errorMessage: executionFailure?.message ?? null,
      },
      runRecord.definition,
      action,
    );
  }

  private serializeDefinition(definition: AgentDefinitionContract, persisted: AgentDefinitionRow) {
    return {
      id: persisted.id,
      agentKey: definition.agentKey,
      name: definition.name,
      description: definition.description ?? null,
      defaultMode: definition.defaultMode,
      supportsManualTrigger: definition.supportsManualTrigger,
      supportsSchedule: definition.supportsSchedule,
      supportsEventTrigger: definition.supportsEventTrigger,
      version: persisted.version,
      owner: persisted.owner,
      createdAt: persisted.createdAt,
      updatedAt: persisted.updatedAt,
    };
  }

  private serializeConfig(config: AgentConfigRow | null) {
    if (!config) {
      return null;
    }

    return {
      id: config.id,
      isEnabled: config.isEnabled,
      mode: config.mode,
      scheduleExpression: config.scheduleExpression,
      timeoutSeconds: config.timeoutSeconds,
      maxRetries: config.maxRetries,
      approvalRequiredForWrites: config.approvalRequiredForWrites,
      notificationRecipients: Array.isArray(config.notificationRecipients) ? config.notificationRecipients : [],
      updatedAt: config.updatedAt,
      createdAt: config.createdAt,
    };
  }

  private serializeRun(run: RunHistoryRow | null, definition?: AgentDefinitionRow) {
    if (!run) {
      return null;
    }

    return {
      id: run.id,
      runKey: run.runKey,
      status: run.status,
      mode: run.mode,
      triggerType: run.triggerType,
      triggerSource: run.triggerSource,
      initiatedBy: run.initiatedBy,
      summary: run.summary,
      errorCode: run.errorCode,
      errorMessage: run.errorMessage,
      startedAt: run.startedAt,
      finishedAt: run.finishedAt,
      createdAt: run.createdAt,
      agentDefinitionId: run.agentDefinitionId,
      agentConfigId: run.agentConfigId,
      agentKey: definition?.agentKey,
      agentName: definition?.name,
    };
  }

  private serializeAction(action: ActionLogRow) {
    return {
      id: action.id,
      runHistoryId: action.runHistoryId,
      actionKey: action.actionKey,
      kind: action.kind,
      status: action.status,
      summary: action.summary,
      targetType: action.targetType,
      targetId: action.targetId,
      requiresApproval: action.requiresApproval,
      requiresHumanExecution: action.requiresHumanExecution,
      generatedArtifactPath: action.generatedArtifactPath,
      actionPayload: action.actionPayload,
      resultPayload: action.resultPayload,
      createdAt: action.createdAt,
      updatedAt: action.updatedAt,
    };
  }

  private serializeApproval(
    approval: ApprovalRow,
    run: RunHistoryRow,
    definition: AgentDefinitionRow,
    action: ActionLogRow | null,
  ) {
    return {
      id: approval.id,
      status: approval.status,
      summary: approval.summary,
      reason: approval.reason,
      requestedAt: approval.requestedAt,
      decidedAt: approval.decidedAt,
      requestedByUserId: approval.requestedByUserId,
      decidedByUserId: approval.decidedByUserId,
      runId: run.id,
      runKey: run.runKey,
      runStatus: run.status,
      initiatedBy: run.initiatedBy,
      triggerType: run.triggerType,
      triggerSource: run.triggerSource,
      agentKey: definition.agentKey,
      agentName: definition.name,
      actionLogId: approval.actionLogId,
      actionKey: action?.actionKey ?? null,
      actionStatus: action?.status ?? null,
      actionSummary: action?.summary ?? null,
    };
  }

  private serializeNotification(notification: NotificationRow) {
    return {
      id: notification.id,
      agentDefinitionId: notification.agentDefinitionId,
      runHistoryId: notification.runHistoryId,
      approvalId: notification.approvalId,
      channel: notification.channel,
      status: notification.status,
      recipient: notification.recipient,
      subject: notification.subject,
      message: notification.message,
      metadata: notification.metadata,
      sentAt: notification.sentAt,
      createdAt: notification.createdAt,
    };
  }

  private buildUpdatedResultJson(
    run: RunHistoryRow,
    approvals: ApprovalRow[],
    actionKey: string | null,
    decision: 'approved' | 'rejected',
    actionStatus: ActionLogRow['status'] | null,
    actionResultPayload: unknown,
    status: AgentRunStatus,
    summary: string,
    executionFailure: { code: string; message: string } | null,
  ) {
    const resultJson = this.asObject(run.resultJson) ?? {};
    const nextResult = {
      ...resultJson,
      status,
      summary,
    } as Record<string, unknown>;

    const existingApprovals = this.asArray(resultJson.approvals);
    if (existingApprovals) {
      nextResult.approvals = existingApprovals.map((item) => {
        if (!this.isObject(item)) {
          return item;
        }

        const sameAction = actionKey && item.actionKey && actionKey === item.actionKey;
        return sameAction ? { ...item, status: decision } : item;
      });
    }

    const existingActions = this.asArray(resultJson.actions);
    if (existingActions) {
      nextResult.actions = existingActions.map((item) => {
        if (!this.isObject(item) || !actionKey || item.actionKey !== actionKey) {
          return item;
        }

        return {
          ...item,
          status: actionStatus ?? decision,
          resultPayload: actionResultPayload,
        };
      });
    }

    if (executionFailure) {
      nextResult.errors = [
        {
          code: executionFailure.code,
          message: executionFailure.message,
        },
      ];
      nextResult.errorCode = executionFailure.code;
      nextResult.errorMessage = executionFailure.message;
    }

    nextResult.approvalSummary = {
      total: approvals.length,
      pending: approvals.filter((item) => item.status === 'pending').length,
      approved: approvals.filter((item) => item.status === 'approved').length,
      rejected: approvals.filter((item) => item.status === 'rejected').length,
    };

    return nextResult;
  }

  private asObject(value: unknown): Record<string, any> | null {
    return this.isObject(value) ? value : null;
  }

  private asArray(value: unknown): any[] | null {
    return Array.isArray(value) ? value : null;
  }

  private isObject(value: unknown): value is Record<string, any> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
  }
}