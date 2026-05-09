"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var AgentRunner_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AgentRunner = void 0;
const common_1 = require("@nestjs/common");
const drizzle_orm_1 = require("drizzle-orm");
const node_postgres_1 = require("drizzle-orm/node-postgres");
const schema = require("../db/schema");
const agent_registry_service_1 = require("./agent-registry.service");
const tokens_1 = require("./tokens");
let AgentRunner = AgentRunner_1 = class AgentRunner {
    constructor(db, registry, lifecycleHooks = []) {
        this.db = db;
        this.registry = registry;
        this.lifecycleHooks = lifecycleHooks;
        this.logger = new common_1.Logger(AgentRunner_1.name);
    }
    async run(request) {
        const handler = this.registry.get(request.agentKey);
        if (!handler) {
            throw new common_1.NotFoundException(`No agent registered for key "${request.agentKey}"`);
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
        const context = {
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
        const lifecycleEvent = {
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
            await this.persistRunArtifacts(runRecord.id, definitionRecord.id, result);
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
                .where((0, drizzle_orm_1.eq)(schema.runHistory.id, runRecord.id));
            const report = {
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
            }
            else if (result.status === 'failed' || result.status === 'rejected') {
                await this.invokeLifecycleHook('onRunFailed', { ...lifecycleEvent, result, error: firstError });
            }
            else {
                await this.invokeLifecycleHook('onRunSucceeded', { ...lifecycleEvent, result });
            }
            return report;
        }
        catch (error) {
            const normalizedError = this.normalizeError(error);
            const failureResult = {
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
                .where((0, drizzle_orm_1.eq)(schema.runHistory.id, runRecord.id));
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
    async ensureAgentDefinition(definition) {
        const [existing] = await this.db
            .select()
            .from(schema.agentDefinitions)
            .where((0, drizzle_orm_1.eq)(schema.agentDefinitions.agentKey, definition.agentKey))
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
    async resolveAgentConfig(agentDefinitionId) {
        const [configRecord] = await this.db
            .select()
            .from(schema.agentConfig)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema.agentConfig.agentDefinitionId, agentDefinitionId), (0, drizzle_orm_1.eq)(schema.agentConfig.isEnabled, true)))
            .orderBy((0, drizzle_orm_1.desc)(schema.agentConfig.createdAt))
            .limit(1);
        return configRecord ?? null;
    }
    async findExistingRunByIdempotencyKey(agentDefinitionId, idempotencyKey) {
        const [existingRun] = await this.db
            .select()
            .from(schema.runHistory)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema.runHistory.agentDefinitionId, agentDefinitionId), (0, drizzle_orm_1.eq)(schema.runHistory.idempotencyKey, idempotencyKey)))
            .orderBy((0, drizzle_orm_1.desc)(schema.runHistory.createdAt))
            .limit(1);
        return existingRun ?? null;
    }
    buildExistingRunReport(runRecord, definition) {
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
    async persistRunArtifacts(runHistoryId, agentDefinitionId, result) {
        const actionIds = new Map();
        if (result.actions.length > 0) {
            const insertedActions = await this.db
                .insert(schema.actionLogs)
                .values(result.actions.map((action) => ({
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
            })))
                .returning({ id: schema.actionLogs.id, actionKey: schema.actionLogs.actionKey });
            insertedActions.forEach((action) => actionIds.set(action.actionKey, action.id));
        }
        if (result.approvals && result.approvals.length > 0) {
            await this.db.insert(schema.approvals).values(result.approvals.map((approval) => ({
                runHistoryId,
                actionLogId: approval.actionKey ? (actionIds.get(approval.actionKey) ?? null) : null,
                status: approval.status ?? 'pending',
                summary: approval.summary,
                reason: approval.reason,
            })));
        }
        if (result.notifications && result.notifications.length > 0) {
            await this.db.insert(schema.notifications).values(result.notifications.map((notification) => ({
                agentDefinitionId,
                runHistoryId,
                channel: notification.channel,
                status: notification.status ?? 'pending',
                recipient: notification.recipient,
                subject: notification.subject,
                message: notification.message,
                metadata: notification.metadata,
            })));
        }
    }
    enforceModePolicies(context, result) {
        const actions = result.actions.map((action) => ({ ...action }));
        const approvals = [...(result.approvals ?? [])];
        const warnings = [...(result.warnings ?? [])];
        const existingApprovalActionKeys = new Set(approvals.flatMap((approval) => (approval.actionKey ? [approval.actionKey] : [])));
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
                warnings.push(this.buildModeWarning('AGENT_MODE_DRY_RUN_BLOCKED_WRITE', action, 'Dry-run suppressed a write action and converted it into a non-executing artifact.'));
                continue;
            }
            if (context.mode === 'manual') {
                manualBlockedWrites += 1;
                action.requiresApproval = false;
                action.requiresHumanExecution = true;
                action.status = 'blocked';
                warnings.push(this.buildModeWarning('AGENT_MODE_MANUAL_BLOCKED_WRITE', action, 'Manual mode prepared a write action but blocked automatic execution.'));
                continue;
            }
            const requiresApproval = context.mode === 'semi-automatic' ||
                action.requiresApproval === true ||
                action.writeDisposition === 'approval-required';
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
                warnings.push(this.buildModeWarning('AGENT_MODE_APPROVAL_REQUIRED', action, `${context.mode} mode requires approval before this write action can proceed.`));
                continue;
            }
            if (!action.status && !hasTerminalFailure) {
                action.status = 'executed';
            }
        }
        const normalizedStatus = !hasTerminalFailure && approvals.some((approval) => (approval.status ?? 'pending') === 'pending')
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
    resolveActionStatus(action, runStatus) {
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
    isWriteAction(action) {
        return (action.kind === 'write' ||
            action.writeDisposition === 'approval-required' ||
            action.writeDisposition === 'direct-write');
    }
    buildApprovalRequest(context, action) {
        return {
            approvalKey: `${context.agentKey}:${action.actionKey}:approval`,
            actionKey: action.actionKey,
            status: 'pending',
            requestedBy: context.initiatedBy,
            summary: `Approve action ${action.actionKey} for agent ${context.agentKey}`,
            reason: action.summary,
        };
    }
    buildModeWarning(code, action, message) {
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
    buildModeSummary(baseSummary, dryRunSuppressedWrites, manualBlockedWrites, pendingApprovalWrites) {
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
    buildMetrics(context, existingMetrics, actions, warnings, errors) {
        return {
            ...(existingMetrics ?? {}),
            readCount: existingMetrics?.readCount ?? actions.filter((action) => action.kind === 'read').length,
            actionCount: actions.length,
            warningCount: warnings.length,
            errorCount: errors?.length ?? 0,
            durationMs: Date.now() - context.startedAt.getTime(),
        };
    }
    normalizeError(error) {
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
    buildRunKey(agentKey) {
        return `${agentKey}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    }
    asStoredResult(value, fallbackStatus, fallbackSummary, agentName) {
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
            summary: typeof stored.summary === 'string' && stored.summary.length > 0
                ? stored.summary
                : (fallbackSummary ?? `${agentName} reused an existing run`),
            actions: Array.isArray(stored.actions) ? stored.actions : [],
            warnings: Array.isArray(stored.warnings) ? stored.warnings : undefined,
            errors: Array.isArray(stored.errors) ? stored.errors : undefined,
            approvals: Array.isArray(stored.approvals) ? stored.approvals : undefined,
            notifications: Array.isArray(stored.notifications)
                ? stored.notifications
                : undefined,
            metrics: this.asObject(stored.metrics),
            result: stored.result,
        };
    }
    asRunStatus(value, fallbackStatus) {
        return typeof value === 'string' ? value : fallbackStatus;
    }
    asObject(value) {
        return typeof value === 'object' && value !== null && !Array.isArray(value)
            ? value
            : null;
    }
    async invokeLifecycleHook(hookName, event) {
        for (const hook of this.lifecycleHooks) {
            const hookFn = hook[hookName];
            if (!hookFn) {
                continue;
            }
            try {
                await hookFn(event);
            }
            catch (error) {
                this.logger.warn(`Lifecycle hook ${String(hookName)} failed for ${event.definition.agentKey}: ${error instanceof Error ? error.message : 'Unknown hook error'}`);
            }
        }
    }
};
exports.AgentRunner = AgentRunner;
exports.AgentRunner = AgentRunner = AgentRunner_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)('DRIZZLE')),
    __param(2, (0, common_1.Inject)(tokens_1.AGENT_RUNTIME_LIFECYCLE_HOOKS)),
    __metadata("design:paramtypes", [node_postgres_1.NodePgDatabase,
        agent_registry_service_1.AgentRegistry, Array])
], AgentRunner);
//# sourceMappingURL=agent-runner.service.js.map