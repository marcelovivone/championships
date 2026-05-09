import { apiClient } from './client';
import {
  AgentApprovalQueueItem,
  AgentExecutionMode,
  AgentRunDetail,
  AgentRunStatus,
  AgentSetupSummary,
  AgentTriggerType,
  ApprovalDecisionDto,
  UpdateAgentSetupDto,
} from './types';

export const agentsAdminApi = {
  getAll: async (): Promise<AgentSetupSummary[]> => {
    const response = await apiClient.get('/v1/admin/agents');
    const result = response.data as { items?: AgentSetupSummary[] } | AgentSetupSummary[];
    return Array.isArray(result) ? result : (result.items ?? []);
  },

  getByKey: async (agentKey: string): Promise<AgentSetupSummary> => {
    const response = await apiClient.get<AgentSetupSummary>(`/v1/admin/agents/${agentKey}`);
    return response.data;
  },

  updateConfig: async (agentKey: string, data: UpdateAgentSetupDto): Promise<AgentSetupSummary> => {
    const response = await apiClient.put<AgentSetupSummary>(`/v1/admin/agents/${agentKey}/config`, data);
    return response.data;
  },

  triggerManual: async (agentKey: string, data?: { mode?: AgentExecutionMode; initiatedBy?: string; triggerSource?: string }) => {
    const response = await apiClient.post(`/v1/admin/agents/${agentKey}/trigger/manual`, data ?? {});
    return response.data;
  },

  reloadSchedules: async () => {
    const response = await apiClient.post('/v1/admin/agents/schedules/reload');
    return response.data;
  },

  listRuns: async (params?: {
    agentKey?: string;
    status?: AgentRunStatus;
    triggerType?: AgentTriggerType;
    limit?: number;
  }) => {
    const searchParams = new URLSearchParams();
    if (params?.agentKey) searchParams.set('agentKey', params.agentKey);
    if (params?.status) searchParams.set('status', params.status);
    if (params?.triggerType) searchParams.set('triggerType', params.triggerType);
    if (params?.limit) searchParams.set('limit', String(params.limit));
    const response = await apiClient.get(`/v1/admin/agents/console/runs${searchParams.toString() ? `?${searchParams.toString()}` : ''}`);
    const result = response.data as { items?: AgentSetupSummary[] } | any[];
    return Array.isArray(result) ? result : (result.items ?? []);
  },

  getRunDetail: async (runId: number): Promise<AgentRunDetail> => {
    const response = await apiClient.get<AgentRunDetail>(`/v1/admin/agents/console/runs/${runId}`);
    return response.data;
  },

  listApprovals: async (params?: { agentKey?: string; status?: AgentApprovalQueueItem['status']; limit?: number }) => {
    const searchParams = new URLSearchParams();
    if (params?.agentKey) searchParams.set('agentKey', params.agentKey);
    if (params?.status) searchParams.set('status', params.status);
    if (params?.limit) searchParams.set('limit', String(params.limit));
    const response = await apiClient.get(`/v1/admin/agents/console/approvals${searchParams.toString() ? `?${searchParams.toString()}` : ''}`);
    const result = response.data as { items?: AgentApprovalQueueItem[] } | AgentApprovalQueueItem[];
    return Array.isArray(result) ? result : (result.items ?? []);
  },

  approveApproval: async (approvalId: number, data?: ApprovalDecisionDto) => {
    const response = await apiClient.post<AgentApprovalQueueItem>(`/v1/admin/agents/console/approvals/${approvalId}/approve`, data ?? {});
    return response.data;
  },

  rejectApproval: async (approvalId: number, data?: ApprovalDecisionDto) => {
    const response = await apiClient.post<AgentApprovalQueueItem>(`/v1/admin/agents/console/approvals/${approvalId}/reject`, data ?? {});
    return response.data;
  },
};