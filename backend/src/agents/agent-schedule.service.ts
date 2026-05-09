import { Inject, Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { SchedulerRegistry } from '@nestjs/schedule';
import { and, eq, isNotNull } from 'drizzle-orm';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { CronJob } from 'cron';
import * as schema from '../db/schema';
import { AgentExecutionMode, AgentRunExecutionReport } from './contracts';
import { TriggerDispatcher } from './trigger-dispatcher.service';

interface ScheduledAgentConfig {
  agentDefinitionId: number;
  agentConfigId: number;
  agentKey: string;
  agentName: string;
  mode: AgentExecutionMode;
  scheduleExpression: string;
}

export interface AgentScheduledDispatchRequest {
  triggerSource?: string;
  mode?: AgentExecutionMode;
  initiatedBy?: string;
  idempotencyKey?: string;
  correlationId?: string;
  requestId?: string;
  payload?: unknown;
  metadata?: Record<string, unknown>;
}

@Injectable()
export class AgentScheduleService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(AgentScheduleService.name);
  private readonly managedJobNames = new Set<string>();

  constructor(
    @Inject('DRIZZLE') private readonly db: NodePgDatabase<typeof schema>,
    private readonly schedulerRegistry: SchedulerRegistry,
    private readonly triggerDispatcher: TriggerDispatcher,
  ) {}

  async onModuleInit(): Promise<void> {
    await this.reloadSchedules();
  }

  onModuleDestroy(): void {
    this.clearManagedJobs();
  }

  async reloadSchedules(): Promise<{ registeredJobs: number; invalidSchedules: string[]; jobNames: string[] }> {
    this.clearManagedJobs();

    const scheduledConfigs = await this.loadScheduledConfigs();
    const invalidSchedules: string[] = [];

    for (const config of scheduledConfigs) {
      try {
        await this.registerSchedule(config);
      } catch (error) {
        invalidSchedules.push(`${config.agentKey}:${config.scheduleExpression}`);
        this.logger.warn(
          `Skipping invalid schedule for ${config.agentKey} (${config.scheduleExpression}): ${error instanceof Error ? error.message : 'Unknown error'}`,
        );
      }
    }

    return {
      registeredJobs: this.managedJobNames.size,
      invalidSchedules,
      jobNames: Array.from(this.managedJobNames.values()),
    };
  }

  async listSchedules(): Promise<
    Array<{
      jobName: string;
      agentKey: string;
      agentName: string;
      scheduleExpression: string;
      nextScheduledAt: Date | null;
      agentConfigId: number;
    }>
  > {
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

  dispatchScheduledAgent(
    agentKey: string,
    request: AgentScheduledDispatchRequest = {},
  ): Promise<AgentRunExecutionReport> {
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

  private async loadScheduledConfigs(): Promise<ScheduledAgentConfig[]> {
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
      .innerJoin(
        schema.agentDefinitions,
        eq(schema.agentConfig.agentDefinitionId, schema.agentDefinitions.id),
      )
      .where(
        and(
          eq(schema.agentConfig.isEnabled, true),
          eq(schema.agentDefinitions.supportsSchedule, true),
          isNotNull(schema.agentConfig.scheduleExpression),
        ),
      ) as Promise<ScheduledAgentConfig[]>;
  }

  private async registerSchedule(config: ScheduledAgentConfig): Promise<void> {
    const jobName = this.buildJobName(config);
    const job = new CronJob(config.scheduleExpression, () => {
      void this.handleScheduledExecution(config, jobName);
    });

    this.schedulerRegistry.addCronJob(jobName, job);
    this.managedJobNames.add(jobName);
    job.start();

    await this.upsertTriggerMetadata(
      config,
      null,
      this.getNextScheduledAt(job),
      `cron:${config.scheduleExpression}`,
    );
  }

  private async handleScheduledExecution(config: ScheduledAgentConfig, jobName: string): Promise<void> {
    const startedAt = new Date();

    try {
      const report = await this.triggerDispatcher.dispatchScheduled(
        config.agentKey,
        `cron:${config.scheduleExpression}`,
        {
          mode: config.mode,
          initiatedBy: 'system:scheduler',
          metadata: {
            agentConfigId: config.agentConfigId,
            scheduleExpression: config.scheduleExpression,
            scheduledJobName: jobName,
          },
        },
      );

      const job = this.schedulerRegistry.getCronJob(jobName);
      await this.upsertTriggerMetadata(
        config,
        startedAt,
        this.getNextScheduledAt(job),
        `cron:${config.scheduleExpression}`,
        report.runId,
      );
    } catch (error) {
      this.logger.error(
        `Scheduled execution failed for ${config.agentKey}: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error.stack : undefined,
      );
    }
  }

  private async upsertTriggerMetadata(
    config: ScheduledAgentConfig,
    lastFiredAt: Date | null,
    nextScheduledAt: Date | null,
    triggerSource: string,
    lastRunId?: number,
  ): Promise<void> {
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
      .where(
        and(
          eq(schema.triggerMetadata.agentDefinitionId, config.agentDefinitionId),
          eq(schema.triggerMetadata.triggerType, 'schedule'),
          eq(schema.triggerMetadata.triggerKey, triggerKey),
        ),
      )
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
        .where(eq(schema.triggerMetadata.id, existing.id));
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

  private buildJobName(config: ScheduledAgentConfig): string {
    return `agent-schedule:${config.agentKey}:${config.agentConfigId}`;
  }

  private getNextScheduledAt(job: CronJob): Date | null {
    try {
      const nextValue = job.nextDate();

      if (!nextValue) {
        return null;
      }

      if (typeof (nextValue as { toJSDate?: () => Date }).toJSDate === 'function') {
        return (nextValue as { toJSDate: () => Date }).toJSDate();
      }

      if (nextValue instanceof Date) {
        return nextValue;
      }

      const asDate = new Date(String(nextValue));
      return Number.isNaN(asDate.getTime()) ? null : asDate;
    } catch {
      return null;
    }
  }

  private clearManagedJobs(): void {
    for (const jobName of this.managedJobNames) {
      try {
        const job = this.schedulerRegistry.getCronJob(jobName);
        job.stop();
        this.schedulerRegistry.deleteCronJob(jobName);
      } catch {
        // Ignore already-removed jobs.
      }
    }

    this.managedJobNames.clear();
  }
}