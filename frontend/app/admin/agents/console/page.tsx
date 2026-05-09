'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, CheckCircle2, ExternalLink, Filter, ShieldAlert, XCircle } from 'lucide-react';
import Modal from '@/components/ui/modal';
import { agentsAdminApi } from '@/lib/api/agents';
import { useAuthStore } from '@/lib/stores/auth-store';
import { AgentRunStatus, AgentTriggerType } from '@/lib/api/types';

const RUN_STATUS_OPTIONS: Array<AgentRunStatus | 'all'> = ['all', 'queued', 'running', 'waiting-approval', 'completed', 'failed', 'cancelled', 'rejected'];
const TRIGGER_OPTIONS: Array<AgentTriggerType | 'all'> = ['all', 'manual', 'schedule', 'event'];

const runStatusStyles: Record<string, string> = {
  completed: 'bg-emerald-100 text-emerald-800',
  running: 'bg-amber-100 text-amber-800',
  'waiting-approval': 'bg-orange-100 text-orange-800',
  failed: 'bg-red-100 text-red-800',
  rejected: 'bg-red-100 text-red-800',
  cancelled: 'bg-slate-200 text-slate-700',
  queued: 'bg-sky-100 text-sky-800',
};

function formatDate(value?: string | null) {
  if (!value) {
    return 'Never';
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
}

export default function AgentRunConsolePage() {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const [agentKeyFilter, setAgentKeyFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState<'all' | AgentRunStatus>('all');
  const [triggerFilter, setTriggerFilter] = useState<'all' | AgentTriggerType>('all');
  const [rejectionApprovalId, setRejectionApprovalId] = useState<number | null>(null);
  const [rejectionNote, setRejectionNote] = useState('');

  const { data: setups = [] } = useQuery({
    queryKey: ['agent-setups'],
    queryFn: agentsAdminApi.getAll,
  });

  const { data: runs = [], isLoading: runsLoading } = useQuery({
    queryKey: ['agent-runs', agentKeyFilter, statusFilter, triggerFilter],
    queryFn: () =>
      agentsAdminApi.listRuns({
        agentKey: agentKeyFilter !== 'all' ? agentKeyFilter : undefined,
        status: statusFilter !== 'all' ? statusFilter : undefined,
        triggerType: triggerFilter !== 'all' ? triggerFilter : undefined,
        limit: 50,
      }),
  });

  const { data: approvals = [], isLoading: approvalsLoading } = useQuery({
    queryKey: ['agent-approvals', agentKeyFilter],
    queryFn: () =>
      agentsAdminApi.listApprovals({
        agentKey: agentKeyFilter !== 'all' ? agentKeyFilter : undefined,
        status: 'pending',
        limit: 50,
      }),
  });

  const approveMutation = useMutation({
    mutationFn: (approvalId: number) =>
      agentsAdminApi.approveApproval(approvalId, {
        decidedByUserId: user?.id,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agent-runs'] });
      queryClient.invalidateQueries({ queryKey: ['agent-approvals'] });
      queryClient.invalidateQueries({ queryKey: ['agent-setup'] });
      queryClient.invalidateQueries({ queryKey: ['agent-setups'] });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: ({ approvalId, note }: { approvalId: number; note?: string }) =>
      agentsAdminApi.rejectApproval(approvalId, {
        decidedByUserId: user?.id,
        note,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agent-runs'] });
      queryClient.invalidateQueries({ queryKey: ['agent-approvals'] });
      queryClient.invalidateQueries({ queryKey: ['agent-setup'] });
      queryClient.invalidateQueries({ queryKey: ['agent-setups'] });
    },
  });

  const failedRuns = useMemo(() => runs.filter((run) => run.status === 'failed' || run.status === 'rejected'), [runs]);
  const waitingApprovalRuns = useMemo(() => runs.filter((run) => run.status === 'waiting-approval'), [runs]);

  const closeRejectModal = () => {
    if (rejectMutation.isPending) {
      return;
    }

    setRejectionApprovalId(null);
    setRejectionNote('');
  };

  const handleApprove = (approvalId: number) => {
    if (!window.confirm('Approve this pending action?')) {
      return;
    }

    approveMutation.mutate(approvalId);
  };

  const handleReject = (approvalId: number) => {
    setRejectionApprovalId(approvalId);
    setRejectionNote('');
  };

  const submitReject = () => {
    if (rejectionApprovalId == null) {
      return;
    }

    rejectMutation.mutate(
      {
        approvalId: rejectionApprovalId,
        note: rejectionNote.trim() || undefined,
      },
      {
        onSuccess: () => {
          closeRejectModal();
        },
      },
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Agent Run Console</h1>
          <p className="mt-2 max-w-3xl text-sm text-slate-600">
            Inspect agent runs, review failures without opening server logs, and handle semi-automatic approval items from one screen.
          </p>
        </div>
        <Link href="/admin/agents" className="text-sm font-medium text-slate-600 hover:text-slate-900">
          Open list of agents
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="rounded-xl border border-orange-200 bg-orange-50 p-5 shadow-sm">
          <div className="flex items-center gap-2 text-sm font-medium text-orange-700">
            <ShieldAlert size={16} /> Pending approvals
          </div>
          <div className="mt-2 text-3xl font-bold text-orange-900">{approvals.length}</div>
        </div>
        <div className="rounded-xl border border-red-200 bg-red-50 p-5 shadow-sm">
          <div className="flex items-center gap-2 text-sm font-medium text-red-700">
            <AlertTriangle size={16} /> Failed or rejected runs
          </div>
          <div className="mt-2 text-3xl font-bold text-red-900">{failedRuns.length}</div>
        </div>
        <div className="rounded-xl border border-sky-200 bg-sky-50 p-5 shadow-sm">
          <div className="flex items-center gap-2 text-sm font-medium text-sky-700">
            <Filter size={16} /> Waiting approval runs
          </div>
          <div className="mt-2 text-3xl font-bold text-sky-900">{waitingApprovalRuns.length}</div>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-4 flex items-center gap-2 text-sm font-medium text-slate-700">
          <Filter size={16} /> Filters
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">Agent</label>
            <select value={agentKeyFilter} onChange={(event) => setAgentKeyFilter(event.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900">
              <option value="all">All agents</option>
              {setups.map((setup) => (
                <option key={setup.definition.agentKey} value={setup.definition.agentKey}>
                  {setup.definition.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">Run status</label>
            <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as 'all' | AgentRunStatus)} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900">
              {RUN_STATUS_OPTIONS.map((status) => (
                <option key={status} value={status}>
                  {status === 'all' ? 'All statuses' : status}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">Trigger type</label>
            <select value={triggerFilter} onChange={(event) => setTriggerFilter(event.target.value as 'all' | AgentTriggerType)} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900">
              {TRIGGER_OPTIONS.map((trigger) => (
                <option key={trigger} value={trigger}>
                  {trigger === 'all' ? 'All triggers' : trigger}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,2fr)_minmax(360px,1fr)]">
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 px-6 py-4">
            <div className="text-lg font-semibold text-slate-900">Run history</div>
            <div className="mt-1 text-sm text-slate-500">Filter by agent, status, and trigger type to inspect recent activity.</div>
          </div>

          {runsLoading ? (
            <div className="px-6 py-8 text-sm text-slate-500">Loading runs...</div>
          ) : runs.length === 0 ? (
            <div className="px-6 py-8 text-sm text-slate-500">No runs matched the current filters.</div>
          ) : (
            <div className="divide-y divide-slate-200">
              {runs.map((run) => (
                <div key={run.id} className="px-6 py-5">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="text-base font-semibold text-slate-900">{run.agentName ?? run.agentKey ?? 'Agent run'}</h2>
                        <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${runStatusStyles[run.status] ?? 'bg-slate-100 text-slate-700'}`}>
                          {run.status}
                        </span>
                        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">{run.triggerType}</span>
                      </div>
                      <div className="mt-2 text-sm text-slate-600">{run.summary ?? 'No summary recorded.'}</div>
                      <div className="mt-3 grid grid-cols-1 gap-3 text-sm text-slate-500 md:grid-cols-3">
                        <div>
                          <div className="font-medium text-slate-700">Run key</div>
                          <div className="mt-1 break-all">{run.runKey}</div>
                        </div>
                        <div>
                          <div className="font-medium text-slate-700">Source</div>
                          <div className="mt-1">{run.triggerSource}</div>
                        </div>
                        <div>
                          <div className="font-medium text-slate-700">Created</div>
                          <div className="mt-1">{formatDate(run.createdAt)}</div>
                        </div>
                      </div>
                      {run.errorMessage && (
                        <div className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{run.errorMessage}</div>
                      )}
                    </div>

                    <Link href={`/admin/agents/console/runs/${run.id}`} className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
                      Open detail
                      <ExternalLink size={16} />
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 px-6 py-4">
            <div className="text-lg font-semibold text-slate-900">Approval queue</div>
            <div className="mt-1 text-sm text-slate-500">Approve or reject pending semi-automatic actions.</div>
          </div>

          {approvalsLoading ? (
            <div className="px-6 py-8 text-sm text-slate-500">Loading approvals...</div>
          ) : approvals.length === 0 ? (
            <div className="px-6 py-8 text-sm text-slate-500">No pending approvals right now.</div>
          ) : (
            <div className="divide-y divide-slate-200">
              {approvals.map((approval) => (
                <div key={approval.id} className="px-6 py-5">
                  <div className="flex flex-col gap-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="text-sm font-semibold text-slate-900">{approval.agentName}</div>
                      <span className="rounded-full bg-orange-100 px-2.5 py-1 text-xs font-medium text-orange-800">pending</span>
                    </div>

                    <div className="text-sm text-slate-600">{approval.summary}</div>
                    <div className="text-xs text-slate-500">{approval.actionSummary ?? approval.actionKey ?? approval.runKey}</div>
                    <div className="text-xs text-slate-500">Requested: {formatDate(approval.requestedAt)}</div>

                    <div className="flex flex-wrap gap-2 pt-2">
                      <button
                        onClick={() => handleApprove(approval.id)}
                        disabled={approveMutation.isPending}
                        className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-medium text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        <CheckCircle2 size={14} /> Approve
                      </button>
                      <button
                        onClick={() => handleReject(approval.id)}
                        disabled={rejectMutation.isPending}
                        className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-3 py-2 text-xs font-medium text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        <XCircle size={14} /> Reject
                      </button>
                      <Link href={`/admin/agents/console/runs/${approval.runId}`} className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50">
                        Open run
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <Modal isOpen={rejectionApprovalId != null} onClose={closeRejectModal} title="Reject approval" size="sm">
        <div className="space-y-4">
          <p className="text-sm text-slate-600">
            Add an optional note explaining why this action is being rejected. The note will be stored with the approval decision.
          </p>

          <div>
            <label htmlFor="rejection-note" className="mb-2 block text-sm font-medium text-slate-700">
              Rejection note
            </label>
            <textarea
              id="rejection-note"
              value={rejectionNote}
              onChange={(event) => setRejectionNote(event.target.value)}
              rows={4}
              placeholder="Optional context for the operator trail"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900"
            />
          </div>

          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={closeRejectModal}
              disabled={rejectMutation.isPending}
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={submitReject}
              disabled={rejectMutation.isPending}
              className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <XCircle size={16} />
              Confirm rejection
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}