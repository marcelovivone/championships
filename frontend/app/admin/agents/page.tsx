'use client';

import Link from 'next/link';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Bot, ChevronRight, Clock3, Gauge, RefreshCw } from 'lucide-react';
import { agentsAdminApi } from '@/lib/api/agents';

const statusStyles: Record<string, string> = {
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

export default function AgentsAdminPage() {
  const queryClient = useQueryClient();
  const { data: items = [], isLoading, isError } = useQuery({
    queryKey: ['agent-setups'],
    queryFn: agentsAdminApi.getAll,
  });

  const reloadSchedules = useMutation({
    mutationFn: agentsAdminApi.reloadSchedules,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agent-setups'] });
    },
  });

  const enabledCount = items.filter((item) => item.config?.isEnabled).length;
  const scheduledCount = items.filter((item) => item.schedules.length > 0).length;
  const waitingApprovalCount = items.filter((item) => item.latestRun?.status === 'waiting-approval').length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">List of Agents</h1>
          <p className="mt-2 max-w-3xl text-sm text-slate-600">
            Configure local-first agent runtime settings, inspect the latest run state, and open each agent&apos;s setup view.
          </p>
        </div>

        <button
          onClick={() => reloadSchedules.mutate()}
          disabled={reloadSchedules.isPending}
          className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <RefreshCw size={16} className={reloadSchedules.isPending ? 'animate-spin' : ''} />
          Reload schedules
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="text-sm font-medium text-slate-500">Registered agents</div>
          <div className="mt-2 text-3xl font-bold text-slate-900">{items.length}</div>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="text-sm font-medium text-slate-500">Enabled agents</div>
          <div className="mt-2 text-3xl font-bold text-slate-900">{enabledCount}</div>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="text-sm font-medium text-slate-500">Waiting approval</div>
          <div className="mt-2 text-3xl font-bold text-slate-900">{waitingApprovalCount}</div>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-6 py-4">
          <div className="text-lg font-semibold text-slate-900">Agent list</div>
          <div className="mt-1 text-sm text-slate-500">{scheduledCount} agent(s) currently have cron schedules loaded.</div>
        </div>

        {isLoading && <div className="px-6 py-8 text-sm text-slate-500">Loading agents...</div>}
        {isError && <div className="px-6 py-8 text-sm text-red-600">Failed to load agent setup data.</div>}

        {!isLoading && !isError && items.length === 0 && (
          <div className="px-6 py-8 text-sm text-slate-500">No registered agents were found.</div>
        )}

        {!isLoading && !isError && items.length > 0 && (
          <div className="divide-y divide-slate-200">
            {items.map((item) => {
              const latestStatus = item.latestRun?.status ?? 'never-run';
              return (
                <div key={item.definition.agentKey} className="px-6 py-5">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="flex min-w-0 gap-4">
                      <div className="mt-1 rounded-xl bg-slate-100 p-3 text-slate-700">
                        <Bot size={20} />
                      </div>

                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h2 className="text-lg font-semibold text-slate-900">{item.definition.name}</h2>
                          <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">
                            {item.definition.agentKey}
                          </span>
                          <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${statusStyles[latestStatus] ?? 'bg-slate-100 text-slate-700'}`}>
                            {latestStatus}
                          </span>
                        </div>

                        <p className="mt-2 text-sm text-slate-600">{item.definition.description ?? 'No description provided.'}</p>

                        <div className="mt-4 grid grid-cols-1 gap-3 text-sm text-slate-600 md:grid-cols-3">
                          <div className="rounded-lg bg-slate-50 px-3 py-2">
                            <div className="font-medium text-slate-800">Current mode</div>
                            <div className="mt-1">{item.config?.mode ?? item.definition.defaultMode}</div>
                          </div>
                          <div className="rounded-lg bg-slate-50 px-3 py-2">
                            <div className="font-medium text-slate-800">Schedule</div>
                            <div className="mt-1">{item.config?.scheduleExpression ?? 'Not scheduled'}</div>
                          </div>
                          <div className="rounded-lg bg-slate-50 px-3 py-2">
                            <div className="font-medium text-slate-800">Latest run</div>
                            <div className="mt-1">{formatDate(item.latestRun?.createdAt)}</div>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col items-start gap-3 lg:items-end">
                      <div className="flex flex-wrap gap-2 text-xs">
                        <span className={`rounded-full px-2.5 py-1 font-medium ${item.config?.isEnabled ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-700'}`}>
                          {item.config?.isEnabled ? 'Enabled' : 'Disabled'}
                        </span>
                        <span className="rounded-full bg-blue-100 px-2.5 py-1 font-medium text-blue-800">
                          {item.schedules.length} schedule(s)
                        </span>
                      </div>

                      <Link
                        href={`/admin/agents/${item.definition.agentKey}`}
                        className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
                      >
                        Open setup
                        <ChevronRight size={16} />
                      </Link>

                      {item.latestRun && (
                        <div className="max-w-sm rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
                          <div className="flex items-center gap-2 font-medium text-slate-800">
                            <Gauge size={14} />
                            {item.latestRun.summary ?? 'Latest run recorded'}
                          </div>
                          <div className="mt-1 flex items-center gap-2">
                            <Clock3 size={12} />
                            {item.latestRun.triggerType} via {item.latestRun.triggerSource}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}