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
var AgentScheduleService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AgentScheduleService = void 0;
const common_1 = require("@nestjs/common");
const schedule_1 = require("@nestjs/schedule");
const drizzle_orm_1 = require("drizzle-orm");
const node_postgres_1 = require("drizzle-orm/node-postgres");
const cron_1 = require("cron");
const schema = require("../db/schema");
const trigger_dispatcher_service_1 = require("./trigger-dispatcher.service");
let AgentScheduleService = AgentScheduleService_1 = class AgentScheduleService {
    constructor(db, schedulerRegistry, triggerDispatcher) {
        this.db = db;
        this.schedulerRegistry = schedulerRegistry;
        this.triggerDispatcher = triggerDispatcher;
        this.logger = new common_1.Logger(AgentScheduleService_1.name);
        this.managedJobNames = new Set();
    }
    async onModuleInit() {
        await this.reloadSchedules();
    }
    onModuleDestroy() {
        this.clearManagedJobs();
    }
    async reloadSchedules() {
        this.clearManagedJobs();
        const scheduledConfigs = await this.loadScheduledConfigs();
        const invalidSchedules = [];
        for (const config of scheduledConfigs) {
            try {
                await this.registerSchedule(config);
            }
            catch (error) {
                invalidSchedules.push(`${config.agentKey}:${config.scheduleExpression}`);
                this.logger.warn(`Skipping invalid schedule for ${config.agentKey} (${config.scheduleExpression}): ${error instanceof Error ? error.message : 'Unknown error'}`);
            }
        }
        return {
            registeredJobs: this.managedJobNames.size,
            invalidSchedules,
            jobNames: Array.from(this.managedJobNames.values()),
        };
    }
    async listSchedules() {
        const scheduledConfigs = await this.loadScheduledConfigs();
        return scheduledConfigs.map((config) => {
            const jobName = this.buildJobName(config);
            const job = this.managedJobNames.has(jobName) ? this.schedulerRegistry.getCronJob(jobName) : null;
            return {
                jobName,
                agentKey: config.agentKey,
                agentName: config.agentName,
                scheduleExpression: config.scheduleExpression,
                nextScheduledAt: job ? this.getNextScheduledAt(job) : null,
                agentConfigId: config.agentConfigId,
            };
        });
    }
    dispatchScheduledAgent(agentKey, request = {}) {
        return this.triggerDispatcher.dispatchScheduled(agentKey, request.triggerSource ?? `manual-schedule:${agentKey}`, {
            mode: request.mode,
            initiatedBy: request.initiatedBy,
            identifiers: {
                idempotencyKey: request.idempotencyKey,
                correlationId: request.correlationId,
                requestId: request.requestId,
            },
            payload: request.payload,
            metadata: request.metadata,
        });
    }
    async loadScheduledConfigs() {
        return this.db
            .select({
            agentDefinitionId: schema.agentDefinitions.id,
            agentConfigId: schema.agentConfig.id,
            agentKey: schema.agentDefinitions.agentKey,
            agentName: schema.agentDefinitions.name,
            mode: schema.agentConfig.mode,
            scheduleExpression: schema.agentConfig.scheduleExpression,
        })
            .from(schema.agentConfig)
            .innerJoin(schema.agentDefinitions, (0, drizzle_orm_1.eq)(schema.agentConfig.agentDefinitionId, schema.agentDefinitions.id))
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema.agentConfig.isEnabled, true), (0, drizzle_orm_1.eq)(schema.agentDefinitions.supportsSchedule, true), (0, drizzle_orm_1.isNotNull)(schema.agentConfig.scheduleExpression)));
    }
    async registerSchedule(config) {
        const jobName = this.buildJobName(config);
        const job = new cron_1.CronJob(config.scheduleExpression, () => {
            void this.handleScheduledExecution(config, jobName);
        });
        this.schedulerRegistry.addCronJob(jobName, job);
        this.managedJobNames.add(jobName);
        job.start();
        await this.upsertTriggerMetadata(config, null, this.getNextScheduledAt(job), `cron:${config.scheduleExpression}`);
    }
    async handleScheduledExecution(config, jobName) {
        const startedAt = new Date();
        try {
            const report = await this.triggerDispatcher.dispatchScheduled(config.agentKey, `cron:${config.scheduleExpression}`, {
                mode: config.mode,
                initiatedBy: 'system:scheduler',
                metadata: {
                    agentConfigId: config.agentConfigId,
                    scheduleExpression: config.scheduleExpression,
                    scheduledJobName: jobName,
                },
            });
            const job = this.schedulerRegistry.getCronJob(jobName);
            await this.upsertTriggerMetadata(config, startedAt, this.getNextScheduledAt(job), `cron:${config.scheduleExpression}`, report.runId);
        }
        catch (error) {
            this.logger.error(`Scheduled execution failed for ${config.agentKey}: ${error instanceof Error ? error.message : 'Unknown error'}`, error instanceof Error ? error.stack : undefined);
        }
    }
    async upsertTriggerMetadata(config, lastFiredAt, nextScheduledAt, triggerSource, lastRunId) {
        const triggerKey = this.buildJobName(config);
        const metadata = {
            agentKey: config.agentKey,
            agentConfigId: config.agentConfigId,
            scheduleExpression: config.scheduleExpression,
            lastRunId: lastRunId ?? null,
        };
        const [existing] = await this.db
            .select()
            .from(schema.triggerMetadata)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema.triggerMetadata.agentDefinitionId, config.agentDefinitionId), (0, drizzle_orm_1.eq)(schema.triggerMetadata.triggerType, 'schedule'), (0, drizzle_orm_1.eq)(schema.triggerMetadata.triggerKey, triggerKey)))
            .limit(1);
        if (existing) {
            await this.db
                .update(schema.triggerMetadata)
                .set({
                triggerSource,
                metadata,
                lastFiredAt: lastFiredAt ?? existing.lastFiredAt,
                nextScheduledAt,
                updatedAt: new Date(),
            })
                .where((0, drizzle_orm_1.eq)(schema.triggerMetadata.id, existing.id));
            return;
        }
        await this.db.insert(schema.triggerMetadata).values({
            agentDefinitionId: config.agentDefinitionId,
            triggerType: 'schedule',
            triggerKey,
            triggerSource,
            metadata,
            lastFiredAt: lastFiredAt ?? undefined,
            nextScheduledAt: nextScheduledAt ?? undefined,
        });
    }
    buildJobName(config) {
        return `agent-schedule:${config.agentKey}:${config.agentConfigId}`;
    }
    getNextScheduledAt(job) {
        try {
            const nextValue = job.nextDate();
            if (!nextValue) {
                return null;
            }
            if (typeof nextValue.toJSDate === 'function') {
                return nextValue.toJSDate();
            }
            if (nextValue instanceof Date) {
                return nextValue;
            }
            const asDate = new Date(String(nextValue));
            return Number.isNaN(asDate.getTime()) ? null : asDate;
        }
        catch {
            return null;
        }
    }
    clearManagedJobs() {
        for (const jobName of this.managedJobNames) {
            try {
                const job = this.schedulerRegistry.getCronJob(jobName);
                job.stop();
                this.schedulerRegistry.deleteCronJob(jobName);
            }
            catch {
            }
        }
        this.managedJobNames.clear();
    }
};
exports.AgentScheduleService = AgentScheduleService;
exports.AgentScheduleService = AgentScheduleService = AgentScheduleService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)('DRIZZLE')),
    __metadata("design:paramtypes", [node_postgres_1.NodePgDatabase,
        schedule_1.SchedulerRegistry,
        trigger_dispatcher_service_1.TriggerDispatcher])
], AgentScheduleService);
//# sourceMappingURL=agent-schedule.service.js.map