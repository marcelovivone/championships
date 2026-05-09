import { Inject, Injectable, Logger, NotFoundException, Optional } from '@nestjs/common';
import { and, desc, eq } from 'drizzle-orm';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from '../db/schema';
import {
  AgentAction,
  AgentActionStatus,
  AgentApprovalRequest,
  AgentDefinitionContract,
  AgentError,
  AgentExecutionContext,
  AgentRunExecutionReport,
  AgentRunLifecycleEvent,
  AgentRunLifecycleHook,
  AgentRunMetrics,
  AgentRunRequest,
  AgentRunResult,
  AgentWarning,
} from './contracts';
import { AgentRegistry } from './agent-registry.service';
import { AGENT_RUNTIME_LIFECYCLE_HOOKS } from './tokens';
import { AgentActionExecutionService } from './agent-action-execution.service';
import { AgentNotificationService } from './agent-notification.service';

@Injectable()
export class AgentRunner {
  private readonly logger = new Logger(AgentRunner.name);

  constructor(
    @Inject('DRIZZLE') private readonly db: NodePgDatabase<typeof schema>,
    private readonly registry: AgentRegistry,
      @Inject(AGENT_RUNTIME_LIFECYCLE_HOOKS)
      private readonly lifecycleHooks: AgentRunLifecycleHook[] = [],
      @Optional() private readonly agentActionExecutionService?: AgentActionExecutionService,
      @Optional() private readonly agentNotificationService?: AgentNotificationService,
  ) {}

  async run(request: AgentRunRequest): Promise<AgentRunExecutionReport> {
    const handler = this.registry.get(request.agentKey);

    if (!handler) {
      throw new NotFoundException(`No agent registered for key "${request.agentKey}"`);
    }

    const definitionRecord = await this.ensureAgentDefinition(handler.definition);
    const idempotencyKey = request.identifiers?.idempotencyKey;

    if (idempotencyKey) {
      const existingRun = await this.findExistingRunByIdempotencyKey(definitionRecord.id, idempotencyKey);

      if (existingRun) {
        return this.buildExistingRunReport(existingRun, handler.definition);
      }
    }

    const configRecord = await this.resolveAgentConfig(definitionRecord.id);
    const effectiveMode = request.mode ?? configRecord?.mode ?? handler.definition.defaultMode;
    const runKey = this.buildRunKey(request.agentKey);
    const startedAt = new Date();
    const context: AgentExecutionContext = {
      agentKey: request.agentKey,
      mode: effectiveMode,
      triggerType: request.triggerType,
      triggerSource: request.triggerSource,
      startedAt,
      initiatedBy: request.initiatedBy,
      identifiers: {
        idempotencyKey: request.identifiers?.idempotencyKey,
        correlationId: request.identifiers?.correlationId ?? runKey,
        requestId: request.identifiers?.requestId,
      },
      payload: request.payload,
      metadata: {
        ...(request.metadata ?? {}),
        agentDefinitionId: definitionRecord.id,
        agentConfigId: configRecord?.id ?? null,
        approvalRequiredForWrites: configRecord?.approvalRequiredForWrites ?? true,
      },
    };

    const [runRecord] = await this.db
      .insert(schema.runHistory)
      .values({
        agentDefinitionId: definitionRecord.id,
        agentConfigId: configRecord?.id,
        runKey,
        triggerType: context.triggerType,
        triggerSource: context.triggerSource,
        mode: context.mode,
        status: 'running',
        initiatedBy: context.initiatedBy,
        idempotencyKey: context.identifiers?.idempotencyKey,
        correlationId: context.identifiers?.correlationId,
        summary: `${handler.definition.name} started`,
        payload: context.payload,
        startedAt,
      })
      .returning();

    const lifecycleEvent: AgentRunLifecycleEvent = {
      runId: runRecord.id,
      runKey,
      agentDefinitionId: definitionRecord.id,
      agentConfigId: configRecord?.id ?? null,
      definition: handler.definition,
      context,
    };

    await this.invokeLifecycleHook('onRunStarted', lifecycleEvent);

    try {
      const result = this.enforceModePolicies(context, await handler.run(context));

      const finishedAt = new Date();
      const firstError = result.errors?.[0];
      await this.db
        .update(schema.runHistory)
        .set({
          status: result.status,
          summary: result.summary,
          resultJson: result,
          errorCode: firstError?.code ?? null,
          errorMessage: firstError?.message ?? null,
          finishedAt,
        })
        .where(eq(schema.runHistory.id, runRecord.id));

      const inserted = await this.persistRunArtifacts(runRecord.id, definitionRecord.id, result);

      const report: AgentRunExecutionReport = {
        ...result,
        runId: runRecord.id,
        runKey,
        agentDefinitionId: definitionRecord.id,
        agentConfigId: configRecord?.id ?? null,
        definition: handler.definition,
        context,
      };

      if (result.status === 'cancelled') {
        await this.invokeLifecycleHook('onRunCancelled', { ...lifecycleEvent, result });
      } else if (result.status === 'failed' || result.status === 'rejected') {
        await this.invokeLifecycleHook('onRunFailed', { ...lifecycleEvent, result, error: firstError });
      } else {
        await this.invokeLifecycleHook('onRunSucceeded', { ...lifecycleEvent, result });
      }

      // If we have an action execution service available and the run is not waiting for approval,
      // execute write actions that are marked as executed (approval not required).
      if (this.agentActionExecutionService && result.status !== 'waiting-approval') {
        let executionFailure: { code: string; message: string } | null = null;

        for (const actionRow of inserted) {
          try {
            if (actionRow.kind !== 'write') continue;

            // fetch the stored action to get current status and payload
            const [storedAction] = await this.db
              .select()
              .from(schema.actionLogs)
              .where(eq(schema.actionLogs.id, actionRow.id))
              .limit(1);

            if (!storedAction) continue;

            const currentStatus = storedAction.status;
            if (currentStatus !== 'executed') continue;

            const execution = await this.agentActionExecutionService.executeApprovedAction({
              agentKey: request.agentKey,
              actionKey: storedAction.actionKey,
              actionPayload: storedAction.actionPayload,
              summary: storedAction.summary,
            });

            await this.db
              .update(schema.actionLogs)
              .set({
                status: execution.status === 'approved' ? 'approved' : execution.status,
                resultPayload: execution.resultPayload ?? null,
                updatedAt: new Date(),
              })
              .where(eq(schema.actionLogs.id, storedAction.id));

            if (execution.status === 'failed') {
              executionFailure = {
                code: execution.errorCode ?? 'AGENT_ACTION_EXECUTION_FAILED',
                message: execution.errorMessage ?? execution.summary,
              };
              break;
            }
          } catch (error) {
            executionFailure = {
              code: 'AGENT_ACTION_EXECUTION_FAILED',
              message: error instanceof Error ? error.message : String(error),
            };
            break;
          }
        }

        if (executionFailure) {
          const finishedAt = new Date();
          const nextRunStatus: AgentRunResult['status'] = 'failed';
          const nextRunSummary = `${handler.definition.name} failed while executing an approved action`;

          await this.db
            .update(schema.runHistory)
            .set({
              status: nextRunStatus,
              summary: nextRunSummary,
              errorCode: executionFailure.code,
              errorMessage: executionFailure.message,
              finishedAt,
            })
            .where(eq(schema.runHistory.id, runRecord.id));

          if (this.agentNotificationService) {
            const failureError = {
              code: executionFailure.code,
              message: executionFailure.message,
              retryable: false,
            } as import('./contracts').AgentError;

            await this.agentNotificationService.notifyFailedRun({
              runId: runRecord.id,
              agentDefinitionId: definitionRecord.id,
              agentConfigId: configRecord?.id ?? null,
              agentKey: handler.definition.agentKey,
              agentName: handler.definition.name,
              summary: nextRunSummary,
              initiatedBy: context.initiatedBy ?? null,
              triggerType: context.triggerType,
              triggerSource: context.triggerSource,
              error: failureError,
            });
          }

          report.status = nextRunStatus;
          report.summary = nextRunSummary;
        }
      }

      return report;
    } catch (error) {
      const normalizedError = this.normalizeError(error);
      const failureResult: AgentRunResult = {
        status: 'failed',
        summary: `${handler.definition.name} failed`,
        actions: [],
        errors: [normalizedError],
      };
      const finishedAt = new Date();

      await this.db
        .update(schema.runHistory)
        .set({
          status: failureResult.status,
          summary: failureResult.summary,
          resultJson: failureResult,
          errorCode: normalizedError.code,
          errorMessage: normalizedError.message,
          finishedAt,
        })
        .where(eq(schema.runHistory.id, runRecord.id));

      this.logger.error(normalizedError.message, error instanceof Error ? error.stack : undefined);
      await this.invokeLifecycleHook('onRunFailed', {
        ...lifecycleEvent,
        result: failureResult,
        error: normalizedError,
      });

      return {
        ...failureResult,
        runId: runRecord.id,
        runKey,
        agentDefinitionId: definitionRecord.id,
        agentConfigId: configRecord?.id ?? null,
        definition: handler.definition,
        context,
      };
    }
  }

  private async ensureAgentDefinition(
    definition: AgentDefinitionContract,
  ): Promise<typeof schema.agentDefinitions.$inferSelect> {
    const [existing] = await this.db
      .select()
      .from(schema.agentDefinitions)
      .where(eq(schema.agentDefinitions.agentKey, definition.agentKey))
      .limit(1);

    if (existing) {
      return existing;
    }

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

  private async resolveAgentConfig(
    agentDefinitionId: number,
  ): Promise<typeof schema.agentConfig.$inferSelect | null> {
    const [configRecord] = await this.db
      .select()
      .from(schema.agentConfig)
      .where(
        and(
          eq(schema.agentConfig.agentDefinitionId, agentDefinitionId),
          eq(schema.agentConfig.isEnabled, true),
        ),
      )
      .orderBy(desc(schema.agentConfig.createdAt))
      .limit(1);

    return configRecord ?? null;
  }

  private async findExistingRunByIdempotencyKey(
    agentDefinitionId: number,
    idempotencyKey: string,
  ): Promise<typeof schema.runHistory.$inferSelect | null> {
    const [existingRun] = await this.db
      .select()
      .from(schema.runHistory)
      .where(
        and(
          eq(schema.runHistory.agentDefinitionId, agentDefinitionId),
          eq(schema.runHistory.idempotencyKey, idempotencyKey),
        ),
      )
      .orderBy(desc(schema.runHistory.createdAt))
      .limit(1);

    return existingRun ?? null;
  }

  private buildExistingRunReport(
    runRecord: typeof schema.runHistory.$inferSelect,
    definition: AgentDefinitionContract,
  ): AgentRunExecutionReport {
    const storedResult = this.asStoredResult(runRecord.resultJson, runRecord.status, runRecord.summary, definition.name);

    return {
      ...storedResult,
      runId: runRecord.id,
      runKey: runRecord.runKey,
      agentDefinitionId: runRecord.agentDefinitionId,
      agentConfigId: runRecord.agentConfigId ?? null,
      definition,
      context: {
        agentKey: definition.agentKey,
        mode: runRecord.mode,
        triggerType: runRecord.triggerType,
        triggerSource: runRecord.triggerSource,
        startedAt: runRecord.startedAt ?? runRecord.createdAt,
        initiatedBy: runRecord.initiatedBy ?? undefined,
        identifiers: {
          idempotencyKey: runRecord.idempotencyKey ?? undefined,
          correlationId: runRecord.correlationId ?? runRecord.runKey,
        },
        payload: runRecord.payload ?? undefined,
        metadata: {
          agentDefinitionId: runRecord.agentDefinitionId,
          agentConfigId: runRecord.agentConfigId ?? null,
          reusedExistingRun: true,
        },
      },
    };
  }

  private async persistRunArtifacts(
    runHistoryId: number,
    agentDefinitionId: number,
    result: AgentRunResult,
  ): Promise<Array<{ id: number; actionKey: string; actionPayload: unknown; status: AgentActionStatus; kind: string }>> {
    const actionIds = new Map<string, number>();
    let insertedActionsResult: Array<{ id: number; actionKey: string; actionPayload: unknown; status: AgentActionStatus; kind: string }> = [];

    if (result.actions.length > 0) {
      const insertedActions = await this.db
        .insert(schema.actionLogs)
        .values(
          result.actions.map((action) => ({
            runHistoryId,
            actionKey: action.actionKey,
            kind: action.kind,
            status: this.resolveActionStatus(action, result.status),
            summary: action.summary,
            targetType: action.targetType,
            targetId: action.targetId,
            requiresApproval: action.requiresApproval ?? false,
            requiresHumanExecution: action.requiresHumanExecution ?? false,
            generatedArtifactPath: action.generatedArtifactPath,
            actionPayload: action.payload,
            resultPayload: null,
          })),
        )
        .returning({ id: schema.actionLogs.id, actionKey: schema.actionLogs.actionKey, actionPayload: schema.actionLogs.actionPayload, kind: schema.actionLogs.kind, status: schema.actionLogs.status });

      insertedActions.forEach((action) => actionIds.set(action.actionKey, action.id));

      insertedActionsResult = insertedActions.map((a) => ({ id: a.id as number, actionKey: a.actionKey as string, actionPayload: a.actionPayload, status: a.status as AgentActionStatus, kind: a.kind as string }));
    }

    if (result.approvals && result.approvals.length > 0) {
      await this.db.insert(schema.approvals).values(
        result.approvals.map((approval) => ({
          runHistoryId,
          actionLogId: approval.actionKey ? (actionIds.get(approval.actionKey) ?? null) : null,
          status: approval.status ?? 'pending',
          summary: approval.summary,
          reason: approval.reason,
        })),
      );
    }

    if (result.notifications && result.notifications.length > 0) {
      await this.db.insert(schema.notifications).values(
        result.notifications.map((notification) => ({
          agentDefinitionId,
          runHistoryId,
          channel: notification.channel,
          status: notification.status ?? 'pending',
          recipient: notification.recipient,
          subject: notification.subject,
          message: notification.message,
          metadata: notification.metadata,
        })),
      );
    }

    return insertedActionsResult;
  }

  private enforceModePolicies(context: AgentExecutionContext, result: AgentRunResult): AgentRunResult {
    const actions = result.actions.map((action) => ({ ...action }));
    const approvals = [...(result.approvals ?? [])];
    const warnings = [...(result.warnings ?? [])];
    const existingApprovalActionKeys = new Set(
      approvals.flatMap((approval) => (approval.actionKey ? [approval.actionKey] : [])),
    );
    const hasTerminalFailure = result.status === 'failed' || result.status === 'rejected' || result.status === 'cancelled';

    let dryRunSuppressedWrites = 0;
    let manualBlockedWrites = 0;
    let pendingApprovalWrites = 0;

    for (const action of actions) {
      if (!this.isWriteAction(action)) {
        if (!action.status && !hasTerminalFailure) {
          action.status = 'executed';
        }
        continue;
      }

      if (context.mode === 'dry-run') {
        dryRunSuppressedWrites += 1;
        action.kind = 'generate-script';
        action.writeDisposition = 'generate-script';
        action.requiresApproval = false;
        action.requiresHumanExecution = true;
        action.status = 'skipped';
        warnings.push(
          this.buildModeWarning('AGENT_MODE_DRY_RUN_BLOCKED_WRITE', action, 'Dry-run suppressed a write action and converted it into a non-executing artifact.'),
        );
        continue;
      }

      if (context.mode === 'manual') {
        manualBlockedWrites += 1;
        action.requiresApproval = false;
        action.requiresHumanExecution = true;
        action.status = 'blocked';
        warnings.push(
          this.buildModeWarning('AGENT_MODE_MANUAL_BLOCKED_WRITE', action, 'Manual mode prepared a write action but blocked automatic execution.'),
        );
        continue;
      }

      const approvalRequiredGlobally =
        (context.metadata && typeof context.metadata.approvalRequiredForWrites !== 'undefined')
          ? Boolean(context.metadata.approvalRequiredForWrites)
          : true;

      const requiresApproval =
        approvalRequiredGlobally &&
        (
          context.mode === 'semi-automatic' ||
          action.requiresApproval === true ||
          action.writeDisposition === 'approval-required'
        );

      if (requiresApproval) {
        pendingApprovalWrites += 1;
        action.requiresApproval = true;
        action.requiresHumanExecution = false;
        action.writeDisposition = 'approval-required';
        action.status = 'pending-approval';

        if (!existingApprovalActionKeys.has(action.actionKey)) {
          approvals.push(this.buildApprovalRequest(context, action));
          existingApprovalActionKeys.add(action.actionKey);
        }

        warnings.push(
          this.buildModeWarning(
            'AGENT_MODE_APPROVAL_REQUIRED',
            action,
            `${context.mode} mode requires approval before this write action can proceed.`,
          ),
        );
        continue;
      }

      if (!action.status && !hasTerminalFailure) {
        action.status = 'executed';
      }
    }

    const normalizedStatus =
      !hasTerminalFailure && approvals.some((approval) => (approval.status ?? 'pending') === 'pending')
        ? 'waiting-approval'
        : result.status;

    return {
      ...result,
      status: normalizedStatus,
      summary: this.buildModeSummary(result.summary, dryRunSuppressedWrites, manualBlockedWrites, pendingApprovalWrites),
      actions,
      warnings: warnings.length > 0 ? warnings : undefined,
      approvals: approvals.length > 0 ? approvals : undefined,
      metrics: this.buildMetrics(context, result.metrics, actions, warnings, result.errors),
    };
  }

  private resolveActionStatus(action: AgentAction, runStatus: AgentRunResult['status']): AgentActionStatus {
    if (action.status) {
      return action.status;
    }

    if (action.requiresApproval || action.writeDisposition === 'approval-required') {
      return 'pending-approval';
    }

    if (runStatus === 'failed' || runStatus === 'rejected') {
      return 'failed';
    }

    if (runStatus === 'cancelled') {
      return 'skipped';
    }

    return 'executed';
  }

  private isWriteAction(action: AgentAction): boolean {
    return (
      action.kind === 'write' ||
      action.writeDisposition === 'approval-required' ||
      action.writeDisposition === 'direct-write'
    );
  }

  private buildApprovalRequest(
    context: AgentExecutionContext,
    action: AgentAction,
  ): AgentApprovalRequest {
    return {
      approvalKey: `${context.agentKey}:${action.actionKey}:approval`,
      actionKey: action.actionKey,
      status: 'pending',
      requestedBy: context.initiatedBy,
      summary: `Approve action ${action.actionKey} for agent ${context.agentKey}`,
      reason: action.summary,
    };
  }

  private buildModeWarning(code: string, action: AgentAction, message: string): AgentWarning {
    return {
      code,
      message,
      details: {
        actionKey: action.actionKey,
        kind: action.kind,
        writeDisposition: action.writeDisposition,
      },
    };
  }

  private buildModeSummary(
    baseSummary: string,
    dryRunSuppressedWrites: number,
    manualBlockedWrites: number,
    pendingApprovalWrites: number,
  ): string {
    if (pendingApprovalWrites > 0) {
      return `${baseSummary} (${pendingApprovalWrites} write action(s) awaiting approval)`;
    }

    if (manualBlockedWrites > 0) {
      return `${baseSummary} (${manualBlockedWrites} write action(s) prepared for manual execution)`;
    }

    if (dryRunSuppressedWrites > 0) {
      return `${baseSummary} (${dryRunSuppressedWrites} write action(s) converted to dry-run artifacts)`;
    }

    return baseSummary;
  }

  private buildMetrics(
    context: AgentExecutionContext,
    existingMetrics: AgentRunMetrics | undefined,
    actions: AgentAction[],
    warnings: AgentWarning[],
    errors: AgentRunResult['errors'],
  ): AgentRunMetrics {
    return {
      ...(existingMetrics ?? {}),
      readCount: existingMetrics?.readCount ?? actions.filter((action) => action.kind === 'read').length,
      actionCount: actions.length,
      warningCount: warnings.length,
      errorCount: errors?.length ?? 0,
      durationMs: Date.now() - context.startedAt.getTime(),
    };
  }

  private normalizeError(error: unknown): AgentError {
    if (error instanceof Error) {
      return {
        code: error.name || 'AGENT_RUNTIME_ERROR',
        message: error.message,
        cause: error,
        retryable: false,
      };
    }

    return {
      code: 'AGENT_RUNTIME_ERROR',
      message: 'Agent execution failed with a non-Error throw value',
      details: error,
      retryable: false,
    };
  }

  private buildRunKey(agentKey: string): string {
    return `${agentKey}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  }

  private asStoredResult(
    value: unknown,
    fallbackStatus: AgentRunResult['status'],
    fallbackSummary: string | null,
    agentName: string,
  ): AgentRunResult {
    const stored = this.asObject(value);

    if (!stored) {
      return {
        status: fallbackStatus,
        summary: fallbackSummary ?? `${agentName} reused an existing run`,
        actions: [],
      };
    }

    return {
      status: this.asRunStatus(stored.status, fallbackStatus),
      summary:
        typeof stored.summary === 'string' && stored.summary.length > 0
          ? stored.summary
          : (fallbackSummary ?? `${agentName} reused an existing run`),
      actions: Array.isArray(stored.actions) ? (stored.actions as AgentAction[]) : [],
      warnings: Array.isArray(stored.warnings) ? (stored.warnings as AgentWarning[]) : undefined,
      errors: Array.isArray(stored.errors) ? (stored.errors as AgentError[]) : undefined,
      approvals: Array.isArray(stored.approvals) ? (stored.approvals as AgentApprovalRequest[]) : undefined,
      notifications: Array.isArray(stored.notifications)
        ? (stored.notifications as AgentRunResult['notifications'])
        : undefined,
      metrics: this.asObject(stored.metrics) as AgentRunMetrics | undefined,
      result: stored.result,
    };
  }

  private asRunStatus(value: unknown, fallbackStatus: AgentRunResult['status']): AgentRunResult['status'] {
    return typeof value === 'string' ? (value as AgentRunResult['status']) : fallbackStatus;
  }

  private asObject(value: unknown): Record<string, unknown> | null {
    return typeof value === 'object' && value !== null && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : null;
  }

  private async invokeLifecycleHook(
    hookName: keyof AgentRunLifecycleHook,
    event: AgentRunLifecycleEvent,
  ): Promise<void> {
    for (const hook of this.lifecycleHooks) {
      const hookFn = hook[hookName];

      if (!hookFn) {
        continue;
      }

      try {
        const fn = hookFn as unknown as Function;
        await fn.call(hook, event);
      } catch (error) {
        this.logger.warn(
          `Lifecycle hook ${String(hookName)} failed for ${event.definition.agentKey}: ${error instanceof Error ? error.message : 'Unknown hook error'}`,
        );
      }
    }
  }
}