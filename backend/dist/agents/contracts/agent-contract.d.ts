export declare const AGENT_EXECUTION_MODES: readonly ["dry-run", "manual", "semi-automatic", "autonomous"];
export type AgentExecutionMode = (typeof AGENT_EXECUTION_MODES)[number];
export declare const AGENT_TRIGGER_TYPES: readonly ["manual", "schedule", "event"];
export type AgentTriggerType = (typeof AGENT_TRIGGER_TYPES)[number];
export declare const AGENT_RUN_STATUSES: readonly ["queued", "running", "waiting-approval", "completed", "failed", "cancelled", "rejected"];
export type AgentRunStatus = (typeof AGENT_RUN_STATUSES)[number];
export declare const AGENT_ACTION_KINDS: readonly ["read", "notify", "generate-script", "write"];
export type AgentActionKind = (typeof AGENT_ACTION_KINDS)[number];
export declare const AGENT_ACTION_STATUSES: readonly ["planned", "pending-approval", "approved", "executed", "blocked", "skipped", "failed", "rejected"];
export type AgentActionStatus = (typeof AGENT_ACTION_STATUSES)[number];
export declare const AGENT_APPROVAL_STATUSES: readonly ["pending", "approved", "rejected", "cancelled"];
export type AgentApprovalStatus = (typeof AGENT_APPROVAL_STATUSES)[number];
export declare const AGENT_NOTIFICATION_CHANNELS: readonly ["email", "in-app"];
export type AgentNotificationChannel = (typeof AGENT_NOTIFICATION_CHANNELS)[number];
export declare const AGENT_NOTIFICATION_STATUSES: readonly ["pending", "sent", "failed", "cancelled"];
export type AgentNotificationStatus = (typeof AGENT_NOTIFICATION_STATUSES)[number];
export declare const AGENT_WRITE_DISPOSITIONS: readonly ["read-only", "generate-script", "approval-required", "direct-write"];
export type AgentWriteDisposition = (typeof AGENT_WRITE_DISPOSITIONS)[number];
export interface AgentRunIdentifiers {
    idempotencyKey?: string;
    correlationId?: string;
    requestId?: string;
}
export interface AgentExecutionContext {
    agentKey: string;
    mode: AgentExecutionMode;
    triggerType: AgentTriggerType;
    triggerSource: string;
    startedAt: Date;
    initiatedBy?: string;
    identifiers?: AgentRunIdentifiers;
    payload?: unknown;
    metadata?: Record<string, unknown>;
}
export interface AgentRunRequest {
    agentKey: string;
    mode?: AgentExecutionMode;
    triggerType: AgentTriggerType;
    triggerSource: string;
    initiatedBy?: string;
    identifiers?: AgentRunIdentifiers;
    payload?: unknown;
    metadata?: Record<string, unknown>;
}
export interface AgentNotice {
    code: string;
    message: string;
    details?: unknown;
}
export interface AgentWarning extends AgentNotice {
}
export interface AgentError extends AgentNotice {
    retryable?: boolean;
    cause?: unknown;
}
export interface AgentAction {
    actionKey: string;
    kind: AgentActionKind;
    status?: AgentActionStatus;
    writeDisposition: AgentWriteDisposition;
    summary: string;
    targetType?: string;
    targetId?: string;
    requiresApproval?: boolean;
    requiresHumanExecution?: boolean;
    payload?: unknown;
    generatedArtifactPath?: string;
}
export interface AgentApprovalRequest {
    approvalKey: string;
    actionKey?: string;
    summary: string;
    status?: AgentApprovalStatus;
    requestedBy?: string;
    reason?: string;
}
export interface AgentNotification {
    channel: AgentNotificationChannel;
    recipient: string;
    subject?: string;
    message: string;
    status?: AgentNotificationStatus;
    metadata?: Record<string, unknown>;
}
export interface AgentDefinitionContract {
    agentKey: string;
    name: string;
    description?: string;
    defaultMode: AgentExecutionMode;
    supportsManualTrigger: boolean;
    supportsSchedule: boolean;
    supportsEventTrigger: boolean;
}
export interface AgentRunMetrics {
    readCount?: number;
    actionCount?: number;
    warningCount?: number;
    errorCount?: number;
    durationMs?: number;
    [metricName: string]: number | undefined;
}
export interface AgentRunResult {
    status: AgentRunStatus;
    summary: string;
    actions: AgentAction[];
    warnings?: AgentWarning[];
    errors?: AgentError[];
    approvals?: AgentApprovalRequest[];
    notifications?: AgentNotification[];
    metrics?: AgentRunMetrics;
    result?: unknown;
}
export interface AgentRunExecutionReport extends AgentRunResult {
    runId: number;
    runKey: string;
    agentDefinitionId: number;
    agentConfigId?: number | null;
    definition: AgentDefinitionContract;
    context: AgentExecutionContext;
}
export interface AgentRunLifecycleEvent {
    runId: number;
    runKey: string;
    agentDefinitionId: number;
    agentConfigId?: number | null;
    definition: AgentDefinitionContract;
    context: AgentExecutionContext;
    result?: AgentRunResult;
    error?: AgentError;
}
export interface AgentRunLifecycleHook {
    onRunStarted?(event: AgentRunLifecycleEvent): Promise<void> | void;
    onRunSucceeded?(event: AgentRunLifecycleEvent): Promise<void> | void;
    onRunFailed?(event: AgentRunLifecycleEvent): Promise<void> | void;
    onRunCancelled?(event: AgentRunLifecycleEvent): Promise<void> | void;
}
export interface AgentHandlerContract {
    definition: AgentDefinitionContract;
    run(context: AgentExecutionContext): Promise<AgentRunResult>;
}
