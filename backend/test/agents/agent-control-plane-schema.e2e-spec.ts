import * as schema from '../../src/db/schema';

describe('Agent control plane schema', () => {
  it('defines the expected control plane enums', () => {
    expect(schema.agentModeEnum.enumValues).toEqual(['dry-run', 'manual', 'semi-automatic', 'autonomous']);
    expect(schema.agentTriggerTypeEnum.enumValues).toEqual(['manual', 'schedule', 'event']);
    expect(schema.agentRunStatusEnum.enumValues).toEqual([
      'queued',
      'running',
      'waiting-approval',
      'completed',
      'failed',
      'cancelled',
      'rejected',
    ]);
    expect(schema.agentActionKindEnum.enumValues).toEqual(['read', 'notify', 'generate-script', 'write']);
    expect(schema.agentActionStatusEnum.enumValues).toEqual([
      'planned',
      'pending-approval',
      'approved',
      'executed',
      'blocked',
      'skipped',
      'failed',
      'rejected',
    ]);
    expect(schema.approvalStatusEnum.enumValues).toEqual(['pending', 'approved', 'rejected', 'cancelled']);
    expect(schema.notificationChannelEnum.enumValues).toEqual(['email', 'in-app']);
    expect(schema.notificationStatusEnum.enumValues).toEqual(['pending', 'sent', 'failed', 'cancelled']);
  });

  it('defines the expected control plane tables and key columns', () => {
    expect(schema.agentDefinitions.agentKey.name).toBe('agent_key');
    expect(schema.agentDefinitions.defaultMode.name).toBe('default_mode');
    expect(schema.agentConfig.agentDefinitionId.name).toBe('agent_definition_id');
    expect(schema.agentConfig.notificationRecipients.name).toBe('notification_recipients');
    expect(schema.runHistory.runKey.name).toBe('run_key');
    expect(schema.runHistory.idempotencyKey.name).toBe('idempotency_key');
    expect(schema.actionLogs.runHistoryId.name).toBe('run_history_id');
    expect(schema.actionLogs.actionPayload.name).toBe('action_payload');
    expect(schema.approvals.actionLogId.name).toBe('action_log_id');
    expect(schema.notifications.approvalId.name).toBe('approval_id');
    expect(schema.triggerMetadata.triggerKey.name).toBe('trigger_key');
  });
});