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
Object.defineProperty(exports, "__esModule", { value: true });
exports.AgentAdminService = void 0;
const common_1 = require("@nestjs/common");
const drizzle_orm_1 = require("drizzle-orm");
const node_postgres_1 = require("drizzle-orm/node-postgres");
const schema = require("../db/schema");
const agent_action_execution_service_1 = require("./agent-action-execution.service");
const agent_notification_service_1 = require("./agent-notification.service");
const agent_registry_service_1 = require("./agent-registry.service");
const agent_schedule_service_1 = require("./agent-schedule.service");
let AgentAdminService = class AgentAdminService {
    constructor(db, registry, agentScheduleService, agentActionExecutionService, agentNotificationService) {
        this.db = db;
        this.registry = registry;
        this.agentScheduleService = agentScheduleService;
        this.agentActionExecutionService = agentActionExecutionService;
        this.agentNotificationService = agentNotificationService;
    }
    async listAgentSetups() {
        const definitions = await this.ensureRegisteredDefinitions();
        const schedules = await this.agentScheduleService.listSchedules();
        const schedulesByAgentKey = new Map();
        schedules.forEach((schedule) => {
            const existing = schedulesByAgentKey.get(schedule.agentKey) ?? [];
            existing.push(schedule);
            schedulesByAgentKey.set(schedule.agentKey, existing);
        });
        const items = await Promise.all(this.registry.list().map(async (handler) => {
            const definition = definitions.get(handler.definition.agentKey);
            if (!definition) {
                throw new common_1.NotFoundException(`Missing persisted definition for ${handler.definition.agentKey}`);
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
        }));
        return { items };
    }
    async getAgentSetup(agentKey) {
        const definition = await this.ensureRegisteredDefinition(agentKey);
        const handler = this.registry.get(agentKey);
        if (!handler) {
            throw new common_1.NotFoundException(`No agent registered for key "${agentKey}"`);
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
    async saveAgentSetup(agentKey, input) {
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
                .where((0, drizzle_orm_1.eq)(schema.agentConfig.id, currentConfig.id));
        }
        else {
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
    async listRunHistory(filters = {}) {
        const limit = Math.min(Math.max(filters.limit ?? 25, 1), 100);
        const conditions = [];
        if (filters.agentKey) {
            conditions.push((0, drizzle_orm_1.eq)(schema.agentDefinitions.agentKey, filters.agentKey));
        }
        if (filters.status) {
            conditions.push((0, drizzle_orm_1.eq)(schema.runHistory.status, filters.status));
        }
        if (filters.triggerType) {
            conditions.push((0, drizzle_orm_1.eq)(schema.runHistory.triggerType, filters.triggerType));
        }
        const baseQuery = this.db
            .select({
            run: schema.runHistory,
            definition: schema.agentDefinitions,
        })
            .from(schema.runHistory)
            .innerJoin(schema.agentDefinitions, (0, drizzle_orm_1.eq)(schema.runHistory.agentDefinitionId, schema.agentDefinitions.id));
        const rows = conditions.length > 0
            ? await baseQuery.where((0, drizzle_orm_1.and)(...conditions)).orderBy((0, drizzle_orm_1.desc)(schema.runHistory.createdAt)).limit(limit)
            : await baseQuery.orderBy((0, drizzle_orm_1.desc)(schema.runHistory.createdAt)).limit(limit);
        return {
            items: rows.map((row) => this.serializeRun(row.run, row.definition)),
        };
    }
    async getRunDetail(runId) {
        const [runRecord] = await this.db
            .select({
            run: schema.runHistory,
            definition: schema.agentDefinitions,
        })
            .from(schema.runHistory)
            .innerJoin(schema.agentDefinitions, (0, drizzle_orm_1.eq)(schema.runHistory.agentDefinitionId, schema.agentDefinitions.id))
            .where((0, drizzle_orm_1.eq)(schema.runHistory.id, runId))
            .limit(1);
        if (!runRecord) {
            throw new common_1.NotFoundException(`Run ${runId} was not found`);
        }
        const [actions, approvals, notifications] = await Promise.all([
            this.db
                .select()
                .from(schema.actionLogs)
                .where((0, drizzle_orm_1.eq)(schema.actionLogs.runHistoryId, runId))
                .orderBy((0, drizzle_orm_1.desc)(schema.actionLogs.createdAt)),
            this.db
                .select()
                .from(schema.approvals)
                .where((0, drizzle_orm_1.eq)(schema.approvals.runHistoryId, runId))
                .orderBy((0, drizzle_orm_1.desc)(schema.approvals.requestedAt)),
            this.db
                .select()
                .from(schema.notifications)
                .where((0, drizzle_orm_1.eq)(schema.notifications.runHistoryId, runId))
                .orderBy((0, drizzle_orm_1.desc)(schema.notifications.createdAt)),
        ]);
        const resultJson = this.asObject(runRecord.run.resultJson);
        return {
            run: this.serializeRun(runRecord.run, runRecord.definition),
            warnings: this.asArray(resultJson?.warnings),
            errors: this.asArray(resultJson?.errors),
            approvals: approvals.map((approval) => this.serializeApproval(approval, runRecord.run, runRecord.definition, actions.find((action) => action.id === approval.actionLogId) ?? null)),
            actions: actions.map((action) => this.serializeAction(action)),
            notifications: notifications.map((notification) => this.serializeNotification(notification)),
            metrics: resultJson?.metrics ?? null,
            result: resultJson?.result ?? null,
            payload: runRecord.run.payload ?? null,
        };
    }
    async listApprovals(filters = {}) {
        const limit = Math.min(Math.max(filters.limit ?? 25, 1), 100);
        const conditions = [];
        if (filters.agentKey) {
            conditions.push((0, drizzle_orm_1.eq)(schema.agentDefinitions.agentKey, filters.agentKey));
        }
        if (filters.status) {
            conditions.push((0, drizzle_orm_1.eq)(schema.approvals.status, filters.status));
        }
        const baseQuery = this.db
            .select({
            approval: schema.approvals,
            run: schema.runHistory,
            definition: schema.agentDefinitions,
            action: schema.actionLogs,
        })
            .from(schema.approvals)
            .innerJoin(schema.runHistory, (0, drizzle_orm_1.eq)(schema.approvals.runHistoryId, schema.runHistory.id))
            .innerJoin(schema.agentDefinitions, (0, drizzle_orm_1.eq)(schema.runHistory.agentDefinitionId, schema.agentDefinitions.id))
            .leftJoin(schema.actionLogs, (0, drizzle_orm_1.eq)(schema.approvals.actionLogId, schema.actionLogs.id));
        const rows = conditions.length > 0
            ? await baseQuery.where((0, drizzle_orm_1.and)(...conditions)).orderBy((0, drizzle_orm_1.desc)(schema.approvals.requestedAt)).limit(limit)
            : await baseQuery.orderBy((0, drizzle_orm_1.desc)(schema.approvals.requestedAt)).limit(limit);
        return {
            items: rows.map((row) => this.serializeApproval(row.approval, row.run, row.definition, row.action ?? null)),
        };
    }
    async approveApproval(approvalId, input) {
        return this.decideApproval(approvalId, 'approved', input);
    }
    async rejectApproval(approvalId, input) {
        return this.decideApproval(approvalId, 'rejected', input);
    }
    async ensureRegisteredDefinitions() {
        const definitionMap = new Map();
        for (const handler of this.registry.list()) {
            const persisted = await this.ensureDefinition(handler.definition);
            definitionMap.set(handler.definition.agentKey, persisted);
        }
        return definitionMap;
    }
    async ensureRegisteredDefinition(agentKey) {
        const handler = this.registry.get(agentKey);
        if (!handler) {
            throw new common_1.NotFoundException(`No agent registered for key "${agentKey}"`);
        }
        return this.ensureDefinition(handler.definition);
    }
    async ensureDefinition(definition) {
        const [existing] = await this.db
            .select()
            .from(schema.agentDefinitions)
            .where((0, drizzle_orm_1.eq)(schema.agentDefinitions.agentKey, definition.agentKey))
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
        const needsUpdate = existing.name !== definition.name ||
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
            .where((0, drizzle_orm_1.eq)(schema.agentDefinitions.id, existing.id))
            .returning();
        return updated;
    }
    async getLatestConfig(agentDefinitionId) {
        const [config] = await this.db
            .select()
            .from(schema.agentConfig)
            .where((0, drizzle_orm_1.eq)(schema.agentConfig.agentDefinitionId, agentDefinitionId))
            .orderBy((0, drizzle_orm_1.desc)(schema.agentConfig.updatedAt), (0, drizzle_orm_1.desc)(schema.agentConfig.createdAt))
            .limit(1);
        return config ?? null;
    }
    async getLatestRun(agentDefinitionId) {
        const [run] = await this.db
            .select()
            .from(schema.runHistory)
            .where((0, drizzle_orm_1.eq)(schema.runHistory.agentDefinitionId, agentDefinitionId))
            .orderBy((0, drizzle_orm_1.desc)(schema.runHistory.createdAt))
            .limit(1);
        return run ?? null;
    }
    async decideApproval(approvalId, decision, input) {
        const [approval] = await this.db
            .select()
            .from(schema.approvals)
            .where((0, drizzle_orm_1.eq)(schema.approvals.id, approvalId))
            .limit(1);
        if (!approval) {
            throw new common_1.NotFoundException(`Approval ${approvalId} was not found`);
        }
        if (approval.status !== 'pending') {
            throw new common_1.BadRequestException(`Approval ${approvalId} is already ${approval.status}`);
        }
        if (input.decidedByUserId) {
            const [user] = await this.db
                .select()
                .from(schema.users)
                .where((0, drizzle_orm_1.eq)(schema.users.id, input.decidedByUserId))
                .limit(1);
            if (!user) {
                throw new common_1.NotFoundException(`User ${input.decidedByUserId} was not found`);
            }
        }
        const [runRecord] = await this.db
            .select({
            run: schema.runHistory,
            definition: schema.agentDefinitions,
        })
            .from(schema.runHistory)
            .innerJoin(schema.agentDefinitions, (0, drizzle_orm_1.eq)(schema.runHistory.agentDefinitionId, schema.agentDefinitions.id))
            .where((0, drizzle_orm_1.eq)(schema.runHistory.id, approval.runHistoryId))
            .limit(1);
        if (!runRecord) {
            throw new common_1.NotFoundException(`Run ${approval.runHistoryId} for approval ${approvalId} was not found`);
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
            .where((0, drizzle_orm_1.eq)(schema.approvals.id, approvalId));
        let action = null;
        let actionStatus = null;
        let actionResultPayload = null;
        let executionFailure = null;
        if (approval.actionLogId) {
            const [existingAction] = await this.db
                .select()
                .from(schema.actionLogs)
                .where((0, drizzle_orm_1.eq)(schema.actionLogs.id, approval.actionLogId))
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
                    .where((0, drizzle_orm_1.eq)(schema.actionLogs.id, action.id));
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
            .where((0, drizzle_orm_1.eq)(schema.approvals.runHistoryId, approval.runHistoryId))
            .orderBy((0, drizzle_orm_1.desc)(schema.approvals.requestedAt));
        const nextRunStatus = executionFailure
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
            resultJson: this.buildUpdatedResultJson(runRecord.run, approvals, action?.actionKey ?? null, decision, actionStatus, actionResultPayload, nextRunStatus, nextRunSummary, executionFailure),
            errorCode: executionFailure?.code ?? null,
            errorMessage: executionFailure?.message ?? null,
            finishedAt: nextRunStatus === 'waiting-approval' ? null : decidedAt,
        })
            .where((0, drizzle_orm_1.eq)(schema.runHistory.id, runRecord.run.id));
        if (executionFailure && this.agentNotificationService) {
            const failureError = {
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
        return this.serializeApproval({
            ...approval,
            status: decision,
            decidedByUserId: input.decidedByUserId ?? null,
            decidedAt,
            reason: nextReason,
        }, {
            ...runRecord.run,
            status: nextRunStatus,
            summary: nextRunSummary,
            errorCode: executionFailure?.code ?? null,
            errorMessage: executionFailure?.message ?? null,
        }, runRecord.definition, action);
    }
    serializeDefinition(definition, persisted) {
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
    serializeConfig(config) {
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
    serializeRun(run, definition) {
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
    serializeAction(action) {
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
    serializeApproval(approval, run, definition, action) {
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
    serializeNotification(notification) {
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
    buildUpdatedResultJson(run, approvals, actionKey, decision, actionStatus, actionResultPayload, status, summary, executionFailure) {
        const resultJson = this.asObject(run.resultJson) ?? {};
        const nextResult = {
            ...resultJson,
            status,
            summary,
        };
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
    asObject(value) {
        return this.isObject(value) ? value : null;
    }
    asArray(value) {
        return Array.isArray(value) ? value : null;
    }
    isObject(value) {
        return typeof value === 'object' && value !== null && !Array.isArray(value);
    }
};
exports.AgentAdminService = AgentAdminService;
exports.AgentAdminService = AgentAdminService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)('DRIZZLE')),
    __param(3, (0, common_1.Optional)()),
    __param(4, (0, common_1.Optional)()),
    __metadata("design:paramtypes", [node_postgres_1.NodePgDatabase,
        agent_registry_service_1.AgentRegistry,
        agent_schedule_service_1.AgentScheduleService,
        agent_action_execution_service_1.AgentActionExecutionService,
        agent_notification_service_1.AgentNotificationService])
], AgentAdminService);
//# sourceMappingURL=agent-admin.service.js.map