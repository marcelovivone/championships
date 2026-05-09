'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { ArrowLeft, Bot, Play, Save } from 'lucide-react';
import { agentsAdminApi } from '@/lib/api/agents';
import { useAuthStore } from '@/lib/stores/auth-store';
import { AgentExecutionMode, UpdateAgentSetupDto } from '@/lib/api/types';

const MODE_OPTIONS: AgentExecutionMode[] = ['dry-run', 'manual', 'semi-automatic', 'autonomous'];

function formatDate(value?: string | null) {
  if (!value) {
    return 'Never';
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
}

export default function AgentSetupDetailPage() {
  const params = useParams<{ agentKey: string }>();
  const agentKey = useMemo(() => {
    const raw = params?.agentKey;
    return Array.isArray(raw) ? raw[0] : raw;
  }, [params]);
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const [manualRunResult, setManualRunResult] = useState<any>(null);
  const { register, handleSubmit, reset, watch } = useForm<UpdateAgentSetupDto>({
    defaultValues: {
      isEnabled: false,
      mode: 'dry-run',
      scheduleExpression: '',
      timeoutSeconds: 300,
      maxRetries: 0,
      approvalRequiredForWrites: true,
      notificationRecipients: [],
    },
  });

  const { data, isLoading, isError } = useQuery({
    queryKey: ['agent-setup', agentKey],
    queryFn: () => agentsAdminApi.getByKey(agentKey!),
    enabled: !!agentKey,
  });

  useEffect(() => {
    if (!data) {
      return;
    }

    reset({
      isEnabled: data.config?.isEnabled ?? false,
      mode: data.config?.mode ?? data.definition.defaultMode,
      scheduleExpression: data.config?.scheduleExpression ?? '',
      timeoutSeconds: data.config?.timeoutSeconds ?? 300,
      maxRetries: data.config?.maxRetries ?? 0,
      approvalRequiredForWrites: data.config?.approvalRequiredForWrites ?? true,
      notificationRecipients: data.config?.notificationRecipients ?? [],
    });
  }, [data, reset]);

  const saveMutation = useMutation({
    mutationFn: (payload: UpdateAgentSetupDto) => agentsAdminApi.updateConfig(agentKey!, payload),
    onSuccess: (updated) => {
      queryClient.setQueryData(['agent-setup', agentKey], updated);
      queryClient.invalidateQueries({ queryKey: ['agent-setups'] });
    },
  });

  const manualRunMutation = useMutation({
    mutationFn: (mode: AgentExecutionMode) =>
      agentsAdminApi.triggerManual(agentKey!, {
        mode,
        initiatedBy: user?.name ?? user?.email ?? 'admin-user',
        triggerSource: 'admin-agent-setup',
      }),
    onSuccess: (result) => {
      setManualRunResult(result);
      queryClient.invalidateQueries({ queryKey: ['agent-setup', agentKey] });
      queryClient.invalidateQueries({ queryKey: ['agent-setups'] });
    },
  });

  const currentMode = watch('mode');
  const recipientsValue = watch('notificationRecipients');

  const onSubmit = (values: UpdateAgentSetupDto & { notificationRecipients?: string[] | string }) => {
    const rawRecipients = Array.isArray(values.notificationRecipients)
      ? values.notificationRecipients.join(', ')
      : values.notificationRecipients ?? '';

    saveMutation.mutate({
      isEnabled: values.isEnabled,
      mode: values.mode,
      scheduleExpression: values.scheduleExpression?.trim() ?? '',
      timeoutSeconds: Number(values.timeoutSeconds),
      maxRetries: Number(values.maxRetries),
      approvalRequiredForWrites: values.approvalRequiredForWrites,
      notificationRecipients: rawRecipients
        .split(',')
        .map((recipient) => recipient.trim())
        .filter(Boolean),
    });
  };

  if (isLoading) {
    return <div className="rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-500 shadow-sm">Loading agent setup...</div>;
  }

  if (isError || !data) {
    return <div className="rounded-xl border border-red-200 bg-white p-6 text-sm text-red-600 shadow-sm">Failed to load this agent setup.</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <Link href="/admin/agents" className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-900">
            <ArrowLeft size={16} />
            Back to list of agents
          </Link>

          <div className="mt-4 flex items-center gap-3">
            <div className="rounded-xl bg-slate-900 p-3 text-white">
              <Bot size={22} />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-slate-900">{data.definition.name}</h1>
              <p className="mt-1 text-sm text-slate-600">{data.definition.description ?? 'No description provided.'}</p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <span className={`rounded-full px-3 py-1 text-xs font-medium ${data.config?.isEnabled ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-700'}`}>
            {data.config?.isEnabled ? 'Enabled' : 'Disabled'}
          </span>
          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">{data.definition.agentKey}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,2fr)_minmax(320px,1fr)]">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-6">
            <h2 className="text-xl font-semibold text-slate-900">Configuration</h2>
            <p className="mt-1 text-sm text-slate-500">Save runtime mode, scheduling, retry, timeout, and notification settings for this agent.</p>
          </div>

          <form onSubmit={handleSubmit(onSubmit as any)} className="space-y-5">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <label className="rounded-xl border border-slate-200 p-4">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <div className="font-medium text-slate-900">Enabled</div>
                    <div className="mt-1 text-sm text-slate-500">Allow this agent to use saved configuration and scheduling.</div>
                  </div>
                  <input type="checkbox" {...register('isEnabled')} className="h-4 w-4" />
                </div>
              </label>

              <label className="rounded-xl border border-slate-200 p-4">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <div className="font-medium text-slate-900">Approval required for writes</div>
                    <div className="mt-1 text-sm text-slate-500">Keep write-oriented plans approval-aware in future execution flows.</div>
                  </div>
                  <input type="checkbox" {...register('approvalRequiredForWrites')} className="h-4 w-4" />
                </div>
              </label>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">Mode</label>
                <select {...register('mode')} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900">
                  {MODE_OPTIONS.map((mode) => (
                    <option key={mode} value={mode}>
                      {mode}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">Cron schedule</label>
                <input
                  type="text"
                  {...register('scheduleExpression')}
                  disabled={!data.definition.supportsSchedule}
                  placeholder={data.definition.supportsSchedule ? '*/30 * * * *' : 'Scheduling not supported'}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 disabled:bg-slate-100"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">Timeout seconds</label>
                <input type="number" min={1} {...register('timeoutSeconds', { valueAsNumber: true })} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900" />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">Max retries</label>
                <input type="number" min={0} {...register('maxRetries', { valueAsNumber: true })} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900" />
              </div>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">Notification recipients</label>
              <textarea
                value={Array.isArray(recipientsValue) ? recipientsValue.join(', ') : ''}
                onChange={(event) => {
                  const values = event.target.value
                    .split(',')
                    .map((recipient) => recipient.trim())
                    .filter(Boolean);
                  reset({
                    ...watch(),
                    notificationRecipients: values,
                  });
                }}
                rows={3}
                placeholder="ops@example.com, admin@example.com"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900"
              />
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                type="submit"
                disabled={saveMutation.isPending}
                className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Save size={16} />
                Save configuration
              </button>

              <button
                type="button"
                onClick={() => manualRunMutation.mutate(currentMode)}
                disabled={manualRunMutation.isPending}
                className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Play size={16} />
                Manual test-run
              </button>
            </div>
          </form>
        </div>

        <div className="space-y-6">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900">Latest run</h2>

            {data.latestRun ? (
              <div className="mt-4 space-y-3 text-sm text-slate-600">
                <div>
                  <div className="font-medium text-slate-900">Status</div>
                  <div className="mt-1">{data.latestRun.status}</div>
                </div>
                <div>
                  <div className="font-medium text-slate-900">Summary</div>
                  <div className="mt-1">{data.latestRun.summary ?? 'No summary recorded.'}</div>
                </div>
                <div>
                  <div className="font-medium text-slate-900">Trigger</div>
                  <div className="mt-1">{data.latestRun.triggerType} via {data.latestRun.triggerSource}</div>
                </div>
                <div>
                  <div className="font-medium text-slate-900">Started</div>
                  <div className="mt-1">{formatDate(data.latestRun.startedAt ?? data.latestRun.createdAt)}</div>
                </div>
                <div>
                  <div className="font-medium text-slate-900">Finished</div>
                  <div className="mt-1">{formatDate(data.latestRun.finishedAt)}</div>
                </div>
                {data.latestRun.errorMessage && (
                  <div className="rounded-lg bg-red-50 px-3 py-2 text-red-700">
                    {data.latestRun.errorCode ? `${data.latestRun.errorCode}: ` : ''}
                    {data.latestRun.errorMessage}
                  </div>
                )}
              </div>
            ) : (
              <div className="mt-4 text-sm text-slate-500">No runs have been recorded for this agent yet.</div>
            )}
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900">Loaded schedules</h2>

            {data.schedules.length === 0 ? (
              <div className="mt-4 text-sm text-slate-500">No cron schedule is currently loaded for this agent.</div>
            ) : (
              <div className="mt-4 space-y-3">
                {data.schedules.map((schedule) => (
                  <div key={schedule.jobName} className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-3 text-sm text-slate-600">
                    <div className="font-medium text-slate-900">{schedule.scheduleExpression}</div>
                    <div className="mt-1">Next run: {formatDate(schedule.nextScheduledAt)}</div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {manualRunResult && (
            <div className="rounded-2xl border border-blue-200 bg-blue-50 p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-blue-900">Latest manual test-run response</h2>
              <div className="mt-3 text-sm text-blue-800">
                <div>Status: {manualRunResult.status}</div>
                <div>Run key: {manualRunResult.runKey}</div>
                <div>Summary: {manualRunResult.summary}</div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}