import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from '../db/schema';
import { AgentError, AgentRunLifecycleEvent, AgentRunLifecycleHook } from './contracts';
type NotificationDispatchContext = {
    runId: number;
    agentDefinitionId: number;
    agentConfigId?: number | null;
    agentKey: string;
    agentName: string;
    summary: string;
    initiatedBy?: string | null;
    triggerType: string;
    triggerSource: string;
    error?: AgentError;
    approvalCount?: number;
};
export declare class AgentNotificationService implements AgentRunLifecycleHook {
    private readonly db;
    constructor(db: NodePgDatabase<typeof schema>);
    onRunSucceeded(event: AgentRunLifecycleEvent): Promise<void>;
    onRunFailed(event: AgentRunLifecycleEvent): Promise<void>;
    notifyFailedRun(input: NotificationDispatchContext): Promise<void>;
    private dispatchNotifications;
    private getConfig;
    private normalizeRecipients;
    private resolveMaxRetries;
    private classify;
    private buildNotifications;
    private findPendingApprovalId;
    private deliverNotification;
    private resolveTransport;
    private updateRunNotificationSummary;
    private asObject;
}
export {};
