import { OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { SchedulerRegistry } from '@nestjs/schedule';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from '../db/schema';
import { AgentExecutionMode, AgentRunExecutionReport } from './contracts';
import { TriggerDispatcher } from './trigger-dispatcher.service';
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
export declare class AgentScheduleService implements OnModuleInit, OnModuleDestroy {
    private readonly db;
    private readonly schedulerRegistry;
    private readonly triggerDispatcher;
    private readonly logger;
    private readonly managedJobNames;
    constructor(db: NodePgDatabase<typeof schema>, schedulerRegistry: SchedulerRegistry, triggerDispatcher: TriggerDispatcher);
    onModuleInit(): Promise<void>;
    onModuleDestroy(): void;
    reloadSchedules(): Promise<{
        registeredJobs: number;
        invalidSchedules: string[];
        jobNames: string[];
    }>;
    listSchedules(): Promise<Array<{
        jobName: string;
        agentKey: string;
        agentName: string;
        scheduleExpression: string;
        nextScheduledAt: Date | null;
        agentConfigId: number;
    }>>;
    dispatchScheduledAgent(agentKey: string, request?: AgentScheduledDispatchRequest): Promise<AgentRunExecutionReport>;
    private loadScheduledConfigs;
    private registerSchedule;
    private handleScheduledExecution;
    private upsertTriggerMetadata;
    private buildJobName;
    private getNextScheduledAt;
    private clearManagedJobs;
}
