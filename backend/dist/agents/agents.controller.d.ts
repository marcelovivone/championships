import { AgentAdminService, ApprovalDecisionInput } from './agent-admin.service';
import { AgentEventTriggerService } from './agent-event-trigger.service';
import { AgentApprovalStatus, AgentExecutionMode, AgentRunStatus, AgentTriggerType } from './contracts';
import { AgentScheduleService } from './agent-schedule.service';
import { TriggerDispatcher } from './trigger-dispatcher.service';
declare class AgentTriggerBaseDto {
    mode?: AgentExecutionMode;
    initiatedBy?: string;
    idempotencyKey?: string;
    correlationId?: string;
    requestId?: string;
    payload?: unknown;
    metadata?: Record<string, unknown>;
}
declare class ManualAgentTriggerDto extends AgentTriggerBaseDto {
    triggerSource?: string;
}
declare class ScheduledAgentTriggerDto extends AgentTriggerBaseDto {
    triggerSource?: string;
}
declare class EventAgentTriggerDto extends AgentTriggerBaseDto {
    triggerSource: string;
}
declare class UpdateAgentConfigDto {
    isEnabled: boolean;
    mode: AgentExecutionMode;
    scheduleExpression?: string;
    timeoutSeconds: number;
    maxRetries: number;
    approvalRequiredForWrites: boolean;
    notificationRecipients?: string[];
}
declare class ApprovalDecisionDto implements ApprovalDecisionInput {
    decidedByUserId?: number;
    note?: string;
}
export declare class AgentsController {
    private readonly agentAdminService;
    private readonly triggerDispatcher;
    private readonly agentScheduleService;
    private readonly agentEventTriggerService;
    constructor(agentAdminService: AgentAdminService, triggerDispatcher: TriggerDispatcher, agentScheduleService: AgentScheduleService, agentEventTriggerService: AgentEventTriggerService);
    listAgents(): Promise<{
        items: {
            definition: {
                id: number;
                agentKey: string;
                name: string;
                description: string;
                defaultMode: "manual" | "dry-run" | "semi-automatic" | "autonomous";
                supportsManualTrigger: boolean;
                supportsSchedule: boolean;
                supportsEventTrigger: boolean;
                version: string;
                owner: string;
                createdAt: Date;
                updatedAt: Date;
            };
            config: {
                id: number;
                isEnabled: boolean;
                mode: "manual" | "dry-run" | "semi-automatic" | "autonomous";
                scheduleExpression: string;
                timeoutSeconds: number;
                maxRetries: number;
                approvalRequiredForWrites: boolean;
                notificationRecipients: any[];
                updatedAt: Date;
                createdAt: Date;
            };
            latestRun: {
                id: number;
                runKey: string;
                status: "running" | "queued" | "waiting-approval" | "completed" | "failed" | "cancelled" | "rejected";
                mode: "manual" | "dry-run" | "semi-automatic" | "autonomous";
                triggerType: "event" | "manual" | "schedule";
                triggerSource: string;
                initiatedBy: string;
                summary: string;
                errorCode: string;
                errorMessage: string;
                startedAt: Date;
                finishedAt: Date;
                createdAt: Date;
                agentDefinitionId: number;
                agentConfigId: number;
                agentKey: string;
                agentName: string;
            };
            schedules: {
                jobName: string;
                agentKey: string;
                agentName: string;
                scheduleExpression: string;
                nextScheduledAt: Date | null;
                agentConfigId: number;
            }[];
        }[];
    }>;
    listRuns(agentKey?: string, status?: AgentRunStatus, triggerType?: AgentTriggerType, limit?: string): Promise<{
        items: {
            id: number;
            runKey: string;
            status: "running" | "queued" | "waiting-approval" | "completed" | "failed" | "cancelled" | "rejected";
            mode: "manual" | "dry-run" | "semi-automatic" | "autonomous";
            triggerType: "event" | "manual" | "schedule";
            triggerSource: string;
            initiatedBy: string;
            summary: string;
            errorCode: string;
            errorMessage: string;
            startedAt: Date;
            finishedAt: Date;
            createdAt: Date;
            agentDefinitionId: number;
            agentConfigId: number;
            agentKey: string;
            agentName: string;
        }[];
    }>;
    getRunDetail(runId: number): Promise<{
        run: {
            id: number;
            runKey: string;
            status: "running" | "queued" | "waiting-approval" | "completed" | "failed" | "cancelled" | "rejected";
            mode: "manual" | "dry-run" | "semi-automatic" | "autonomous";
            triggerType: "event" | "manual" | "schedule";
            triggerSource: string;
            initiatedBy: string;
            summary: string;
            errorCode: string;
            errorMessage: string;
            startedAt: Date;
            finishedAt: Date;
            createdAt: Date;
            agentDefinitionId: number;
            agentConfigId: number;
            agentKey: string;
            agentName: string;
        };
        warnings: any[];
        errors: any[];
        approvals: {
            id: number;
            status: "cancelled" | "rejected" | "pending" | "approved";
            summary: string;
            reason: string;
            requestedAt: Date;
            decidedAt: Date;
            requestedByUserId: number;
            decidedByUserId: number;
            runId: number;
            runKey: string;
            runStatus: "running" | "queued" | "waiting-approval" | "completed" | "failed" | "cancelled" | "rejected";
            initiatedBy: string;
            triggerType: "event" | "manual" | "schedule";
            triggerSource: string;
            agentKey: string;
            agentName: string;
            actionLogId: number;
            actionKey: string;
            actionStatus: "skipped" | "planned" | "failed" | "rejected" | "approved" | "executed" | "pending-approval" | "blocked";
            actionSummary: string;
        }[];
        actions: {
            id: number;
            runHistoryId: number;
            actionKey: string;
            kind: "read" | "notify" | "generate-script" | "write";
            status: "skipped" | "planned" | "failed" | "rejected" | "approved" | "executed" | "pending-approval" | "blocked";
            summary: string;
            targetType: string;
            targetId: string;
            requiresApproval: boolean;
            requiresHumanExecution: boolean;
            generatedArtifactPath: string;
            actionPayload: unknown;
            resultPayload: unknown;
            createdAt: Date;
            updatedAt: Date;
        }[];
        notifications: {
            id: number;
            agentDefinitionId: number;
            runHistoryId: number;
            approvalId: number;
            channel: "email" | "in-app";
            status: "failed" | "cancelled" | "pending" | "sent";
            recipient: string;
            subject: string;
            message: string;
            metadata: unknown;
            sentAt: Date;
            createdAt: Date;
        }[];
        metrics: any;
        result: any;
        payload: unknown;
    }>;
    listApprovals(agentKey?: string, status?: AgentApprovalStatus, limit?: string): Promise<{
        items: {
            id: number;
            status: "cancelled" | "rejected" | "pending" | "approved";
            summary: string;
            reason: string;
            requestedAt: Date;
            decidedAt: Date;
            requestedByUserId: number;
            decidedByUserId: number;
            runId: number;
            runKey: string;
            runStatus: "running" | "queued" | "waiting-approval" | "completed" | "failed" | "cancelled" | "rejected";
            initiatedBy: string;
            triggerType: "event" | "manual" | "schedule";
            triggerSource: string;
            agentKey: string;
            agentName: string;
            actionLogId: number;
            actionKey: string;
            actionStatus: "skipped" | "planned" | "failed" | "rejected" | "approved" | "executed" | "pending-approval" | "blocked";
            actionSummary: string;
        }[];
    }>;
    approveApproval(approvalId: number, dto: ApprovalDecisionDto): Promise<{
        id: number;
        status: "cancelled" | "rejected" | "pending" | "approved";
        summary: string;
        reason: string;
        requestedAt: Date;
        decidedAt: Date;
        requestedByUserId: number;
        decidedByUserId: number;
        runId: number;
        runKey: string;
        runStatus: "running" | "queued" | "waiting-approval" | "completed" | "failed" | "cancelled" | "rejected";
        initiatedBy: string;
        triggerType: "event" | "manual" | "schedule";
        triggerSource: string;
        agentKey: string;
        agentName: string;
        actionLogId: number;
        actionKey: string;
        actionStatus: "skipped" | "planned" | "failed" | "rejected" | "approved" | "executed" | "pending-approval" | "blocked";
        actionSummary: string;
    }>;
    rejectApproval(approvalId: number, dto: ApprovalDecisionDto): Promise<{
        id: number;
        status: "cancelled" | "rejected" | "pending" | "approved";
        summary: string;
        reason: string;
        requestedAt: Date;
        decidedAt: Date;
        requestedByUserId: number;
        decidedByUserId: number;
        runId: number;
        runKey: string;
        runStatus: "running" | "queued" | "waiting-approval" | "completed" | "failed" | "cancelled" | "rejected";
        initiatedBy: string;
        triggerType: "event" | "manual" | "schedule";
        triggerSource: string;
        agentKey: string;
        agentName: string;
        actionLogId: number;
        actionKey: string;
        actionStatus: "skipped" | "planned" | "failed" | "rejected" | "approved" | "executed" | "pending-approval" | "blocked";
        actionSummary: string;
    }>;
    getAgent(agentKey: string): Promise<{
        definition: {
            id: number;
            agentKey: string;
            name: string;
            description: string;
            defaultMode: "manual" | "dry-run" | "semi-automatic" | "autonomous";
            supportsManualTrigger: boolean;
            supportsSchedule: boolean;
            supportsEventTrigger: boolean;
            version: string;
            owner: string;
            createdAt: Date;
            updatedAt: Date;
        };
        config: {
            id: number;
            isEnabled: boolean;
            mode: "manual" | "dry-run" | "semi-automatic" | "autonomous";
            scheduleExpression: string;
            timeoutSeconds: number;
            maxRetries: number;
            approvalRequiredForWrites: boolean;
            notificationRecipients: any[];
            updatedAt: Date;
            createdAt: Date;
        };
        latestRun: {
            id: number;
            runKey: string;
            status: "running" | "queued" | "waiting-approval" | "completed" | "failed" | "cancelled" | "rejected";
            mode: "manual" | "dry-run" | "semi-automatic" | "autonomous";
            triggerType: "event" | "manual" | "schedule";
            triggerSource: string;
            initiatedBy: string;
            summary: string;
            errorCode: string;
            errorMessage: string;
            startedAt: Date;
            finishedAt: Date;
            createdAt: Date;
            agentDefinitionId: number;
            agentConfigId: number;
            agentKey: string;
            agentName: string;
        };
        schedules: {
            jobName: string;
            agentKey: string;
            agentName: string;
            scheduleExpression: string;
            nextScheduledAt: Date | null;
            agentConfigId: number;
        }[];
    }>;
    updateAgentConfig(agentKey: string, dto: UpdateAgentConfigDto): Promise<{
        definition: {
            id: number;
            agentKey: string;
            name: string;
            description: string;
            defaultMode: "manual" | "dry-run" | "semi-automatic" | "autonomous";
            supportsManualTrigger: boolean;
            supportsSchedule: boolean;
            supportsEventTrigger: boolean;
            version: string;
            owner: string;
            createdAt: Date;
            updatedAt: Date;
        };
        config: {
            id: number;
            isEnabled: boolean;
            mode: "manual" | "dry-run" | "semi-automatic" | "autonomous";
            scheduleExpression: string;
            timeoutSeconds: number;
            maxRetries: number;
            approvalRequiredForWrites: boolean;
            notificationRecipients: any[];
            updatedAt: Date;
            createdAt: Date;
        };
        latestRun: {
            id: number;
            runKey: string;
            status: "running" | "queued" | "waiting-approval" | "completed" | "failed" | "cancelled" | "rejected";
            mode: "manual" | "dry-run" | "semi-automatic" | "autonomous";
            triggerType: "event" | "manual" | "schedule";
            triggerSource: string;
            initiatedBy: string;
            summary: string;
            errorCode: string;
            errorMessage: string;
            startedAt: Date;
            finishedAt: Date;
            createdAt: Date;
            agentDefinitionId: number;
            agentConfigId: number;
            agentKey: string;
            agentName: string;
        };
        schedules: {
            jobName: string;
            agentKey: string;
            agentName: string;
            scheduleExpression: string;
            nextScheduledAt: Date | null;
            agentConfigId: number;
        }[];
    }>;
    triggerManual(agentKey: string, dto: ManualAgentTriggerDto): Promise<import("./contracts").AgentRunExecutionReport>;
    triggerScheduled(agentKey: string, dto: ScheduledAgentTriggerDto): Promise<import("./contracts").AgentRunExecutionReport>;
    triggerEvent(agentKey: string, dto: EventAgentTriggerDto): Promise<import("./contracts").AgentRunExecutionReport>;
    reloadSchedules(): Promise<{
        registeredJobs: number;
        invalidSchedules: string[];
        jobNames: string[];
    }>;
}
export {};
