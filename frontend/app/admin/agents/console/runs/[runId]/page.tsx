'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, BellRing, CircleAlert, ListChecks, ShieldAlert } from 'lucide-react';
import { agentsAdminApi } from '@/lib/api/agents';

const INFORMATIONAL_UPDATER_WARNING_CODES = new Set([
  'SEASON_RESULTS_UPDATER_DISCARDED_NO_CHANGE_PAYLOAD',
  'SEASON_RESULTS_UPDATER_NO_TRANSITIONAL_MATCH',
  'SEASON_RESULTS_UPDATER_FETCH_PENDING',
]);

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }

  return value as Record<string, unknown>;
}

function toCount(value: unknown): number {
  const normalized = Number(value);
  return Number.isFinite(normalized) ? normalized : 0;
}

function getActionOutcomeBadge(action: {
  kind: string;
  status: string;
  actionPayload: unknown;
  resultPayload: unknown;
}) {
  const payload = asRecord(action.actionPayload);
  const planState = typeof payload?.state === 'string' ? payload.state : null;

  if (action.kind === 'read') {
    switch (planState) {
      case 'planned-update':
        return { label: 'Updates Found', className: 'bg-amber-100 text-amber-800' };
      case 'no-change':
        return { label: 'Up To Date', className: 'bg-emerald-100 text-emerald-800' };
      case 'missing-transitional-load':
        return { label: 'No Staged Load', className: 'bg-slate-200 text-slate-700' };
      case 'fetch-pending':
        return { label: 'Fetch Pending', className: 'bg-sky-100 text-sky-800' };
      case 'review-required':
        return { label: 'Review Required', className: 'bg-rose-100 text-rose-800' };
      default:
        return null;
    }
  }

  if (action.kind === 'write' && action.status === 'executed') {
    const result = asRecord(asRecord(action.resultPayload)?.result);
    const wroteAnything =
      toCount(result?.createdMatches) > 0 ||
      toCount(result?.updatedMatches) > 0 ||
      toCount(result?.createdStandings) > 0 ||
      toCount(result?.createdDivisions) > 0 ||
      toCount(result?.createdRounds) > 0;

    return wroteAnything
      ? { label: 'Updated', className: 'bg-emerald-100 text-emerald-800' }
      : { label: 'Executed', className: 'bg-slate-200 text-slate-700' };
  }

  return null;
}

function formatDate(value?: string | null) {
  if (!value) {
    return 'Never';
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
}

function renderJson(value: unknown) {
  if (value === null || typeof value === 'undefined') {
    return 'null';
  }

  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

export default function AgentRunDetailPage() {
  const params = useParams<{ runId: string }>();
  const runId = useMemo(() => {
    const raw = params?.runId;
    const normalized = Array.isArray(raw) ? raw[0] : raw;
    return normalized ? Number(normalized) : null;
  }, [params]);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['agent-run-detail', runId],
    queryFn: () => agentsAdminApi.getRunDetail(runId!),
    enabled: typeof runId === 'number' && !Number.isNaN(runId),
  });

  if (isLoading) {
    return <div className="rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-500 shadow-sm">Loading run detail...</div>;
  }

  if (isError || !data) {
    return <div className="rounded-xl border border-red-200 bg-white p-6 text-sm text-red-600 shadow-sm">Failed to load this run detail.</div>;
  }

  const visibleWarnings = (data.warnings ?? []).filter(
    (warning) => !INFORMATIONAL_UPDATER_WARNING_CODES.has(warning.code),
  );
  const visibleErrors = data.errors ?? [];

  return (
    <div className="space-y-6">
      <div>
        <Link href="/admin/agents/console" className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-900">
          <ArrowLeft size={16} />
          Back to run console
        </Link>
        <h1 className="mt-4 text-3xl font-bold text-slate-900">Run Detail</h1>
        <p className="mt-2 text-sm text-slate-600">Inspect actions, warnings, failure details, approvals, and notifications for this run.</p>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,2fr)_minmax(320px,1fr)]">
        <div className="space-y-6">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-semibold text-slate-900">Run summary</h2>
            <div className="mt-4 grid grid-cols-1 gap-4 text-sm text-slate-600 md:grid-cols-2">
              <div>
                <div className="font-medium text-slate-800">Agent</div>
                <div className="mt-1">{data.run.agentName ?? data.run.agentKey}</div>
              </div>
              <div>
                <div className="font-medium text-slate-800">Status</div>
                <div className="mt-1">{data.run.status}</div>
              </div>
              <div>
                <div className="font-medium text-slate-800">Trigger</div>
                <div className="mt-1">{data.run.triggerType} via {data.run.triggerSource}</div>
              </div>
              <div>
                <div className="font-medium text-slate-800">Mode</div>
                <div className="mt-1">{data.run.mode}</div>
              </div>
              <div>
                <div className="font-medium text-slate-800">Started</div>
                <div className="mt-1">{formatDate(data.run.startedAt ?? data.run.createdAt)}</div>
              </div>
              <div>
                <div className="font-medium text-slate-800">Finished</div>
                <div className="mt-1">{formatDate(data.run.finishedAt)}</div>
              </div>
            </div>
            <div className="mt-4 rounded-lg bg-slate-50 px-4 py-3 text-sm text-slate-700">{data.run.summary ?? 'No summary recorded.'}</div>
            {data.run.errorMessage && (
              <div className="mt-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{data.run.errorCode ? `${data.run.errorCode}: ` : ''}{data.run.errorMessage}</div>
            )}
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center gap-2 text-lg font-semibold text-slate-900">
              <ListChecks size={18} /> Action logs
            </div>
            <div className="mt-4 space-y-3">
              {data.actions.length === 0 && <div className="text-sm text-slate-500">No action logs recorded.</div>}
              {data.actions.map((action) => (
                <div key={action.id} className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
                  {(() => {
                    const outcomeBadge = getActionOutcomeBadge(action);

                    return (
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="font-medium text-slate-900">{action.summary}</div>
                    {outcomeBadge && (
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${outcomeBadge.className}`}>
                        {outcomeBadge.label}
                      </span>
                    )}
                    <span className="rounded-full bg-slate-200 px-2 py-0.5 text-xs font-medium text-slate-700">{action.kind}</span>
                    <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-800">{action.status}</span>
                  </div>
                    );
                  })()}
                  <div className="mt-2 text-xs text-slate-500">{action.actionKey}{action.targetType ? ` • ${action.targetType}` : ''}{action.targetId ? ` #${action.targetId}` : ''}</div>
                  {action.generatedArtifactPath && <div className="mt-2 text-xs text-slate-500">Artifact: {action.generatedArtifactPath}</div>}
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex items-center gap-2 text-lg font-semibold text-slate-900">
                <CircleAlert size={18} /> Warnings and errors
              </div>
              <div className="mt-4 space-y-3">
                {visibleWarnings.length === 0 && visibleErrors.length === 0 && (
                  <div className="text-sm text-slate-500">No warnings or errors were recorded.</div>
                )}
                {visibleWarnings.map((warning, index) => (
                  <div key={`warning-${index}`} className="rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-800">
                    <div className="font-medium">{warning.code}</div>
                    <div className="mt-1">{warning.message}</div>
                  </div>
                ))}
                {visibleErrors.map((error, index) => (
                  <div key={`error-${index}`} className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-800">
                    <div className="font-medium">{error.code}</div>
                    <div className="mt-1">{error.message}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex items-center gap-2 text-lg font-semibold text-slate-900">
                <ShieldAlert size={18} /> Approval history
              </div>
              <div className="mt-4 space-y-3">
                {data.approvals.length === 0 && <div className="text-sm text-slate-500">No approval records were attached to this run.</div>}
                {data.approvals.map((approval) => (
                  <div key={approval.id} className="rounded-lg bg-slate-50 px-4 py-3 text-sm text-slate-700">
                    <div className="font-medium text-slate-900">{approval.summary}</div>
                    <div className="mt-1 text-xs text-slate-500">{approval.status} • requested {formatDate(approval.requestedAt)}</div>
                    {approval.reason && <div className="mt-2 text-xs text-slate-600 whitespace-pre-wrap">{approval.reason}</div>}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center gap-2 text-lg font-semibold text-slate-900">
              <BellRing size={18} /> Notifications
            </div>
            <div className="mt-4 space-y-3">
              {data.notifications.length === 0 && <div className="text-sm text-slate-500">No notifications were recorded for this run.</div>}
              {data.notifications.map((notification) => (
                <div key={notification.id} className="rounded-lg bg-slate-50 px-4 py-3 text-sm text-slate-700">
                  <div className="font-medium text-slate-900">{notification.subject ?? notification.channel}</div>
                  <div className="mt-1 text-xs text-slate-500">{notification.status} • {notification.recipient}</div>
                  <div className="mt-2 text-xs text-slate-600">{notification.message}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900">Payload</h2>
            <pre className="mt-4 overflow-x-auto rounded-lg bg-slate-950 p-4 text-xs text-slate-100">{renderJson(data.payload)}</pre>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900">Result and metrics</h2>
            <pre className="mt-4 overflow-x-auto rounded-lg bg-slate-950 p-4 text-xs text-slate-100">{renderJson({ metrics: data.metrics, result: data.result })}</pre>
          </div>
        </div>
      </div>
    </div>
  );
}