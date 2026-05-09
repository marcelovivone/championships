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
exports.AgentNotificationService = void 0;
const common_1 = require("@nestjs/common");
const drizzle_orm_1 = require("drizzle-orm");
const node_postgres_1 = require("drizzle-orm/node-postgres");
const nodemailer = require("nodemailer");
const schema = require("../db/schema");
let AgentNotificationService = class AgentNotificationService {
    constructor(db) {
        this.db = db;
    }
    async onRunSucceeded(event) {
        if (event.result?.status !== 'waiting-approval') {
            return;
        }
        await this.dispatchNotifications('approval-required', {
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
        });
    }
    async onRunFailed(event) {
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
    async notifyFailedRun(input) {
        await this.dispatchNotifications('run-failed', input);
    }
    async dispatchNotifications(reason, context) {
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
            .values(notifications.map((notification) => ({
            agentDefinitionId: context.agentDefinitionId,
            runHistoryId: context.runId,
            approvalId,
            channel: notification.channel,
            status: notification.status ?? 'pending',
            recipient: notification.recipient,
            subject: notification.subject,
            message: notification.message,
            metadata: notification.metadata,
        })))
            .returning();
        const deliverySummary = {
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
            }
            else {
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
    async getConfig(agentConfigId, agentDefinitionId) {
        if (agentConfigId) {
            const [config] = await this.db
                .select()
                .from(schema.agentConfig)
                .where((0, drizzle_orm_1.eq)(schema.agentConfig.id, agentConfigId))
                .limit(1);
            if (config) {
                return config;
            }
        }
        const [config] = await this.db
            .select()
            .from(schema.agentConfig)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema.agentConfig.agentDefinitionId, agentDefinitionId), (0, drizzle_orm_1.eq)(schema.agentConfig.isEnabled, true)))
            .limit(1);
        return config ?? null;
    }
    normalizeRecipients(value) {
        if (!Array.isArray(value)) {
            return [];
        }
        return value
            .map((recipient) => (typeof recipient === 'string' ? recipient.trim() : ''))
            .filter((recipient) => recipient.length > 0);
    }
    resolveMaxRetries(value) {
        const normalized = Number(value);
        if (!Number.isInteger(normalized) || normalized <= 0) {
            return 0;
        }
        return Math.min(normalized, 3);
    }
    classify(reason, error) {
        if (reason === 'approval-required') {
            return 'approval-required';
        }
        return error?.retryable ? 'retryable-run-failure' : 'terminal-run-failure';
    }
    buildNotifications(reason, context, recipients) {
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
    async findPendingApprovalId(runId) {
        const [approval] = await this.db
            .select()
            .from(schema.approvals)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema.approvals.runHistoryId, runId), (0, drizzle_orm_1.eq)(schema.approvals.status, 'pending')))
            .limit(1);
        return approval?.id ?? null;
    }
    async deliverNotification(notification, maxRetries, classification) {
        const transport = this.resolveTransport();
        let attemptCount = 0;
        let lastError = null;
        let preview = null;
        while (attemptCount <= maxRetries) {
            attemptCount += 1;
            try {
                const info = await transport.transporter.sendMail({
                    from: process.env.AGENT_EMAIL_FROM || 'agents@championships.local',
                    to: notification.recipient,
                    subject: notification.subject ?? 'Championships agent notification',
                    text: notification.message,
                });
                preview = typeof info.message === 'string'
                    ? info.message
                    : typeof info.message === 'object'
                        ? JSON.stringify(info.message)
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
                    .where((0, drizzle_orm_1.eq)(schema.notifications.id, notification.id));
                return { status: 'sent', attemptCount };
            }
            catch (error) {
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
            .where((0, drizzle_orm_1.eq)(schema.notifications.id, notification.id));
        return { status: 'failed', attemptCount };
    }
    resolveTransport() {
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
    async updateRunNotificationSummary(runId, summary) {
        const [run] = await this.db
            .select()
            .from(schema.runHistory)
            .where((0, drizzle_orm_1.eq)(schema.runHistory.id, runId))
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
            .where((0, drizzle_orm_1.eq)(schema.runHistory.id, runId));
    }
    asObject(value) {
        return typeof value === 'object' && value !== null && !Array.isArray(value)
            ? value
            : null;
    }
};
exports.AgentNotificationService = AgentNotificationService;
exports.AgentNotificationService = AgentNotificationService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)('DRIZZLE')),
    __metadata("design:paramtypes", [node_postgres_1.NodePgDatabase])
], AgentNotificationService);
//# sourceMappingURL=agent-notification.service.js.map