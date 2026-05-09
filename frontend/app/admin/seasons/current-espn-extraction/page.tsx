'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Save } from 'lucide-react';
import { seasonsApi } from '@/lib/api/entities';
import {
  CurrentSeasonEspnExtractionSettingsResponse,
  CurrentSeasonEspnExtractionSettingsRow,
} from '@/lib/api/types';

type HeaderState = {
  startDate: string;
  endDate: string;
};

const EMPTY_RESPONSE: CurrentSeasonEspnExtractionSettingsResponse = {
  header: {
    startDate: null,
    endDate: null,
  },
  rows: [],
};

function computeSameYears(startDate: string, endDate: string, currentValue: boolean) {
  if (!startDate || !endDate) {
    return currentValue;
  }

  return startDate.slice(0, 4) === endDate.slice(0, 4);
}

function toHeaderState(data: CurrentSeasonEspnExtractionSettingsResponse | undefined): HeaderState {
  return {
    startDate: data?.header.startDate ?? '',
    endDate: data?.header.endDate ?? '',
  };
}

function extractErrorMessage(error: unknown): string | null {
  if (!error || typeof error !== 'object') {
    return null;
  }

  const responseMessage = (error as { response?: { data?: { message?: unknown } } }).response?.data?.message;
  if (Array.isArray(responseMessage)) {
    return responseMessage.map((value) => String(value).trim()).filter(Boolean).join(', ') || null;
  }
  if (typeof responseMessage === 'string' && responseMessage.trim()) {
    return responseMessage.trim();
  }

  const directMessage = (error as { message?: unknown }).message;
  if (Array.isArray(directMessage)) {
    return directMessage.map((value) => String(value).trim()).filter(Boolean).join(', ') || null;
  }
  if (typeof directMessage === 'string' && directMessage.trim()) {
    return directMessage.trim();
  }

  return null;
}

export default function CurrentEspnSeasonExtractionPage() {
  const queryClient = useQueryClient();
  const [header, setHeader] = useState<HeaderState>({ startDate: '', endDate: '' });
  const [rows, setRows] = useState<CurrentSeasonEspnExtractionSettingsRow[]>([]);

  const { data, isLoading, isFetching, error } = useQuery({
    queryKey: ['seasons', 'current-espn-extraction'],
    queryFn: () => seasonsApi.getCurrentEspnExtractionSettings(),
  });

  useEffect(() => {
    setHeader(toHeaderState(data));
    setRows(data?.rows ?? []);
  }, [data]);

  const saveMutation = useMutation({
    mutationFn: seasonsApi.saveCurrentEspnExtractionSettings,
    onSuccess: (response) => {
      queryClient.setQueryData(['seasons', 'current-espn-extraction'], response);
      setHeader(toHeaderState(response));
      setRows(response.rows);
    },
  });

  const serializedLoadedState = useMemo(() => JSON.stringify(data ?? EMPTY_RESPONSE), [data]);
  const serializedCurrentState = useMemo(
    () => JSON.stringify({
      header: {
        startDate: header.startDate || null,
        endDate: header.endDate || null,
      },
      rows,
    }),
    [header, rows],
  );
  const hasUnsavedChanges = serializedLoadedState !== serializedCurrentState;
  const loadErrorMessage = useMemo(() => extractErrorMessage(error), [error]);
  const saveErrorMessage = useMemo(() => extractErrorMessage(saveMutation.error), [saveMutation.error]);

  const handleHeaderChange = (field: keyof HeaderState, value: string) => {
    setHeader((current) => ({ ...current, [field]: value }));
  };

  const handleApplyHeaderDates = () => {
    setRows((currentRows) =>
      currentRows.map((row) => {
        const startDate = header.startDate || row.startDate;
        const endDate = header.endDate || row.endDate;

        return {
          ...row,
          startDate,
          endDate,
          sameYears: computeSameYears(startDate, endDate, row.sameYears),
        };
      }),
    );
  };

  const handleRowChange = <K extends keyof CurrentSeasonEspnExtractionSettingsRow>(
    seasonId: number,
    field: K,
    value: CurrentSeasonEspnExtractionSettingsRow[K],
  ) => {
    setRows((currentRows) =>
      currentRows.map((row) => {
        if (row.seasonId !== seasonId) {
          return row;
        }

        const nextRow = { ...row, [field]: value };

        if (field === 'startDate' || field === 'endDate') {
          nextRow.sameYears = computeSameYears(nextRow.startDate, nextRow.endDate, nextRow.sameYears);
        }

        if (field === 'hasGroups' && !value) {
          nextRow.numberOfGroups = 0;
        }

        return nextRow;
      }),
    );
  };

  const handleSave = async () => {
    try {
      await saveMutation.mutateAsync({
        header: {
          startDate: header.startDate || null,
          endDate: header.endDate || null,
        },
        rows: rows.map((row) => ({
          seasonId: row.seasonId,
          externalLeagueCode: row.externalLeagueCode,
          startDate: row.startDate,
          endDate: row.endDate,
          sameYears: row.sameYears,
          hasPostseason: row.hasPostseason,
          scheduleType: row.scheduleType,
          hasGroups: row.hasGroups,
          numberOfGroups: row.numberOfGroups,
          hasDivisions: row.hasDivisions,
          runInBackground: row.runInBackground,
        })),
      });
    } catch {
      // The mutation state drives the inline error banner; avoid surfacing handled 400s as uncaught promises.
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="flex items-center gap-3 text-sm text-slate-500">
            <Link href="/admin/agents" className="inline-flex items-center gap-2 hover:text-slate-800">
              <ArrowLeft size={16} />
              Agents
            </Link>
          </div>
          <h1 className="mt-2 text-3xl font-bold text-slate-900">Current Seasons ESPN Extraction</h1>
          <p className="mt-2 max-w-3xl text-sm text-slate-600">
            Configure the ESPN extraction values that the backend agents use for each league&apos;s default season. Date fields in the header can be applied across all rows; each season still saves its own extraction settings.
          </p>
        </div>

        <button
          onClick={handleSave}
          disabled={saveMutation.isPending || rows.length === 0 || !hasUnsavedChanges}
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Save size={18} />
          {saveMutation.isPending ? 'Saving...' : 'Save Settings'}
        </button>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="mb-2 block text-sm font-medium text-slate-700">Header Start Date</span>
              <input
                type="date"
                value={header.startDate}
                onChange={(event) => handleHeaderChange('startDate', event.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
              />
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-medium text-slate-700">Header End Date</span>
              <input
                type="date"
                value={header.endDate}
                onChange={(event) => handleHeaderChange('endDate', event.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
              />
            </label>
          </div>

          <button
            onClick={handleApplyHeaderDates}
            disabled={rows.length === 0 || (!header.startDate && !header.endDate)}
            className="inline-flex items-center justify-center rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Apply Header Dates To All Rows
          </button>
        </div>

        <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          This page uses each league&apos;s default season as its current season. Origin is fixed to Api-Espn. Has Divisions and Run in Background stay locked to the same sport rules used by the manual extract page.
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-[1400px] divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th rowSpan={2} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Sport / League / Season
                </th>
                <th colSpan={4} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Season Information
                </th>
                <th colSpan={4} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                  League Information
                </th>
                <th colSpan={2} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Match Division Information
                </th>
              </tr>
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Start Date</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">End Date</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Same Years</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Has Postseason</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">League Name</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Schedule</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Has Groups</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Number Of Groups</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Has Divisions</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Run In Background</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 bg-white">
              {isLoading && (
                <tr>
                  <td colSpan={11} className="px-4 py-12 text-center text-sm text-slate-500">
                    Loading current season extraction settings...
                  </td>
                </tr>
              )}

              {!isLoading && error && rows.length === 0 && (
                <tr>
                  <td colSpan={11} className="px-4 py-12 text-center text-sm text-slate-500">
                    Unable to load the current default-season rows.
                  </td>
                </tr>
              )}

              {!isLoading && !error && rows.length === 0 && (
                <tr>
                  <td colSpan={11} className="px-4 py-12 text-center text-sm text-slate-500">
                    No default seasons are currently available. This page lists the default season used as the current season for each league.
                  </td>
                </tr>
              )}

              {!isLoading && rows.map((row) => (
                <tr key={row.seasonId} className="align-top hover:bg-slate-50/60">
                  <td className="px-4 py-4">
                    <div className="min-w-[240px]">
                      <div className="text-sm font-semibold text-slate-900">{row.sportName || 'Unknown Sport'}</div>
                      <div className="mt-1 text-sm text-slate-700">{row.leagueName}</div>
                      <div className="mt-1 text-xs text-slate-500">Season {row.seasonLabel}</div>
                    </div>
                  </td>

                  <td className="px-4 py-4">
                    <input
                      type="date"
                      value={row.startDate}
                      onChange={(event) => handleRowChange(row.seasonId, 'startDate', event.target.value)}
                      className="w-full min-w-[150px] rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                    />
                  </td>

                  <td className="px-4 py-4">
                    <input
                      type="date"
                      value={row.endDate}
                      onChange={(event) => handleRowChange(row.seasonId, 'endDate', event.target.value)}
                      className="w-full min-w-[150px] rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                    />
                  </td>

                  <td className="px-4 py-4">
                    <label className="flex items-center gap-2 text-sm text-slate-700">
                      <input
                        type="checkbox"
                        checked={row.sameYears}
                        onChange={(event) => handleRowChange(row.seasonId, 'sameYears', event.target.checked)}
                        className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                      />
                      Yes
                    </label>
                  </td>

                  <td className="px-4 py-4">
                    <label className="flex items-center gap-2 text-sm text-slate-700">
                      <input
                        type="checkbox"
                        checked={row.hasPostseason}
                        onChange={(event) => handleRowChange(row.seasonId, 'hasPostseason', event.target.checked)}
                        className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                      />
                      Enabled
                    </label>
                  </td>

                  <td className="px-4 py-4">
                    <input
                      value={row.externalLeagueCode}
                      onChange={(event) => handleRowChange(row.seasonId, 'externalLeagueCode', event.target.value)}
                      placeholder="nba, eng.1, etc."
                      className="w-full min-w-[180px] rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                    />
                  </td>

                  <td className="px-4 py-4">
                    <select
                      value={row.scheduleType}
                      onChange={(event) => handleRowChange(row.seasonId, 'scheduleType', event.target.value as 'Round' | 'Date')}
                      className="w-full min-w-[120px] rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                    >
                      <option value="Round">Round</option>
                      <option value="Date">Date</option>
                    </select>
                  </td>

                  <td className="px-4 py-4">
                    <label className="flex items-center gap-2 text-sm text-slate-700">
                      <input
                        type="checkbox"
                        checked={row.hasGroups}
                        onChange={(event) => handleRowChange(row.seasonId, 'hasGroups', event.target.checked)}
                        className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                      />
                      Enabled
                    </label>
                  </td>

                  <td className="px-4 py-4">
                    <input
                      type="number"
                      min={0}
                      value={row.numberOfGroups}
                      disabled={!row.hasGroups}
                      onChange={(event) => handleRowChange(row.seasonId, 'numberOfGroups', Number(event.target.value))}
                      className="w-full min-w-[110px] rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 disabled:cursor-not-allowed disabled:bg-slate-100"
                    />
                  </td>

                  <td className="px-4 py-4">
                    <label className="flex items-center gap-2 text-sm text-slate-500">
                      <input
                        type="checkbox"
                        checked={row.hasDivisions}
                        disabled
                        className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 disabled:cursor-not-allowed"
                      />
                      Locked
                    </label>
                  </td>

                  <td className="px-4 py-4">
                    <label className="flex items-center gap-2 text-sm text-slate-500">
                      <input
                        type="checkbox"
                        checked={row.runInBackground}
                        disabled
                        className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 disabled:cursor-not-allowed"
                      />
                      Locked
                    </label>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          Failed to load the current default seasons and their saved ESPN extraction settings.
          {loadErrorMessage ? ` ${loadErrorMessage}` : ''}
        </div>
      )}

      {saveMutation.isError && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          Failed to save the extraction settings. Check required league codes and dates, then try again.
          {saveErrorMessage ? ` ${saveErrorMessage}` : ''}
        </div>
      )}

      {(isFetching || saveMutation.isSuccess) && (
        <div className="text-xs text-slate-500">
          {isFetching ? 'Refreshing data...' : 'Saved.'}
        </div>
      )}
    </div>
  );
}