'use client';

import { useState, useRef, useEffect, useLayoutEffect } from 'react';
import { useRouter } from 'next/navigation';
import { sportsApi } from '@/lib/api/entities';
import { STATIC_STATUS_PAGE_GET_INITIAL_PROPS_ERROR } from 'next/dist/lib/constants';

export default function AdminApiPage() {
  const [payload, setPayload] = useState('');
  const [result, setResult] = useState<any>(null);
  const [processingRowId, setProcessingRowId] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [league, setLeague] = useState('39');
  const [season, setSeason] = useState('2025');
  const [startDate, setStartDate] = useState('2025-08-01');
  const [endDate, setEndDate] = useState('2026-05-31');
  const [sameYears, setSameYears] = useState<boolean>(false);
  const [seasonStatus, setSeasonStatus] = useState<string>('Finished');
  const [isSeasonDefault, setIsSeasonDefault] = useState<boolean>(false);
  const [isLeagueDefault, setIsLeagueDefault] = useState<boolean>(false);
  const [scheduleType, setScheduleType] = useState<string>('Date');
  const [addDivisions, setAddDivisions] = useState<boolean>(true);
  const [runInBackground, setRunInBackground] = useState<boolean>(true);
  const [sports, setSports] = useState<any[]>([]);
  const [sportId, setSportId] = useState<number>(36);
  const [origin, setOrigin] = useState<string>('Api-Espn');
  const [minBtnWidth, setMinBtnWidth] = useState<number | null>(() => {
    try {
      if (typeof window === 'undefined') return 100;
      const raw = Number(localStorage.getItem('etl_min_btn_width') || 0);
      const stored = Math.max(raw || 0, 100);
      try { localStorage.setItem('etl_min_btn_width', String(stored)); } catch (e) {}
      return stored;
    } catch {
      return 100;
    }
  });
  const resetBtnRef = useRef<HTMLButtonElement | null>(null);
  const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
  const controllerRef = useRef<AbortController | null>(null);
  const TIMEOUT_MS = 60_000; // 60s timeout

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await sportsApi.getAll({ page: 1, limit: 100 });
        if (!mounted) return;
        const normalized = Array.isArray(res.data) ? res.data.map((s: any) => ({ id: s.id, name: s.name })) : [];
        setSports(normalized);
        if (normalized.length && !normalized.find((s: any) => s.id === sportId)) setSportId(normalized[0].id);
      } catch (e) {
        // ignore
      }
    })();
    return () => { mounted = false; };
  }, []);

  // default scheduleType to 'Round' when the selected sport looks like football
  useEffect(() => {
    try {
      const sp = sports.find((s: any) => s.id === sportId);
      const isFootball = !!(sp && typeof sp.name === 'string' && sp.name.toLowerCase().includes('football'));
      setScheduleType(isFootball ? 'Round' : 'Date');
    } catch (e) {
      // noop
    }
  }, [sports, sportId]);

  useLayoutEffect(() => {
    const measure = () => {
      try {
        const el = resetBtnRef.current;
        const width = el?.offsetWidth ?? 0;
        const candidateMeasured = (width && width > 0) ? width : 0;
        const candidateFallback = resetBtnRef.current?.offsetWidth || 100;
        const candidate = candidateMeasured || candidateFallback;
        let storedRaw = 0;
        try { storedRaw = Number(localStorage.getItem('etl_min_btn_width') || 0); } catch (e) { storedRaw = 0; }
        const baseline = Math.max(storedRaw || 0, 100);
        const tag = el?.tagName ?? 'unknown';
        const snippet = String(el?.textContent ?? '').trim().slice(0, 30);
        if (candidate >= baseline) {
          console.log('[ETL] applying width', candidate, 'from', tag, 'text', snippet, 'baseline', baseline);
          setMinBtnWidth(candidate);
          try { localStorage.setItem('etl_min_btn_width', String(candidate)); } catch (e) {}
        } else {
          console.log('[ETL] measured width', candidate, 'from', tag, 'text', snippet, '— skipping smaller than baseline', baseline);
        }
      } catch (err) {
        console.error('[ETL] measure failed', err);
      }
    };
    // measure synchronously before paint and again after paint (rAF) to catch refs
    measure();
    let rafId: number | null = null;
    try { rafId = window.requestAnimationFrame(() => measure()); } catch (e) { rafId = null; }
    window.addEventListener('resize', measure);
    return () => { window.removeEventListener('resize', measure); if (rafId) window.cancelAnimationFrame(rafId); };
  }, []);

  const handleSubmit = async () => {
    setLoading(true);
    try {
      controllerRef.current = new AbortController();
      const timeout = setTimeout(() => controllerRef.current?.abort(), TIMEOUT_MS);
      const body = payload ? JSON.parse(payload) : {};
      const res = await fetch(`${API_BASE}/v1/api/import`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: controllerRef.current.signal,
      });
      clearTimeout(timeout);
      const txt = await res.text();
      let data: any;
      try { data = JSON.parse(txt); } catch (e) { data = txt; }
      setResult({ status: res.status, body: data });
    } catch (err) {
      setResult({ error: String(err) });
    } finally {
      setLoading(false);
      controllerRef.current = null;
    }
  };

  const handleFetchAndStore = async () => {
    setLoading(true);
    try {
      controllerRef.current = new AbortController();
      const timeout = setTimeout(() => controllerRef.current?.abort(), TIMEOUT_MS);
      const res = await fetch(`${API_BASE}/v1/api/fetch-and-store`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          league: league,
          season: Number(season),
          sport: Number(sportId),
          origin,
          startDate,
          endDate,
          seasonStatus,
          isSeasonDefault,
          sameYears,
          scheduleType,
          isLeagueDefault,
          addDivisions,
          runInBackground,
        }),
        signal: controllerRef.current.signal,
      });
      clearTimeout(timeout);
      const txt = await res.text();
      let data: any;
      try { data = JSON.parse(txt); } catch (e) { data = txt; }
      setResult({ status: res.status, body: data });
      // if backend returned created transitional id, show processing result and link to ETL preview
      const createdId = data?.id ?? data?.stored?.id ?? data?.created?.id ?? null;
      if (createdId) setProcessingRowId(Number(createdId));
    } catch (err) {
      setResult({ error: String(err) });
    } finally {
      setLoading(false);
      controllerRef.current = null;
    }
  };

  const handleCancel = () => {
    controllerRef.current?.abort();
    setLoading(false);
    setResult({ error: 'Cancelled by user' });
    controllerRef.current = null;
  };

  const handleClearResults = () => {
    setResult(null);
    setProcessingRowId(null);
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Extract from API</h1>
      </div>
      {/* Top row: only Origin, Sport, Fetch & Store */}
      <div className="w-full my-4" aria-hidden>
        <div style={{ height: '1px', background: '#e6e6e6', boxShadow: '0 1px 0 rgba(0,0,0,0.06)' }} />
        <div className="mt-3 mb-4 text-sm text-gray-600 flex items-center gap-3">
          <span className="text-gray-700 text-lg">Main Information</span>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mb-4 items-end">
        <div>
          <label className="block text-sm text-gray-600">Origin</label>
          <select value={origin} onChange={(e) => setOrigin(e.target.value)} className="w-full p-2 border rounded">
            <option value="Api-Football">Api-Football</option>
            <option value="Api-Espn">Api-Espn</option>
          </select>
        </div>
        <div>
          <label className="block text-sm text-gray-600">Sport</label>
          <select value={sportId} onChange={(e) => setSportId(Number(e.target.value))} className="w-full p-2 border rounded">
            {sports && sports.length ? (
              sports.map((s) => <option key={s.id} value={s.id}>{s.name || s.id}</option>)
            ) : (null)}
          </select>
        </div>
        <div className="flex items-end justify-end gap-2">
          <button
            onClick={handleFetchAndStore}
            disabled={loading}
            className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading && (
              <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path>
              </svg>
            )}
            <span>{loading ? 'Fetching...' : 'Fetch & Store'}</span>
          </button>
        </div>
      </div>

      {/* Decorative separator between top controls and secondary inputs */}
      <div className="w-full my-4" aria-hidden>
        <div style={{ height: '1px', background: '#e6e6e6', boxShadow: '0 1px 0 rgba(0,0,0,0.06)' }} />
        <div className="mt-3 mb-4 text-sm text-gray-600 flex items-center gap-3">
          <span className="text-gray-700 text-lg">Season/Date Information</span>
        </div>
      </div>

      {/* Secondary row: remaining fields (moved below) */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-2 mt-2 mb-6">
        {origin !== 'Api-Espn' && (
          <div>
            <label className="block text-sm text-gray-600">Season</label>
            <input className="w-full p-2 border rounded" value={season} onChange={(e) => setSeason(e.target.value)} />
          </div>
        )}

        {origin === 'Api-Espn' && (
          <>
            <div>
              <label className="block text-sm text-gray-600">Start Date</label>
              <input
                type="date"
                className="w-full p-2 border rounded"
                value={startDate}
                onChange={(e) => {
                  const nextStartDate = e.target.value;
                  setStartDate(nextStartDate);
                  if (nextStartDate) {
                    setSeason(nextStartDate.slice(0, 4));
                  }
                }}
              />
            </div>
            <div>
              <label className="block text-sm text-gray-600">End Date</label>
              <input
                type="date"
                className="w-full p-2 border rounded"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
          </>
        )}

        <div className="flex items-center gap-2 ml-10 mt-2">
          <input
            id="etl-same-years-checkbox"
            type="checkbox"
            checked={sameYears}
            onChange={(e) => setSameYears(e.target.checked)}
            className="h-4 w-4"
          />
          <label htmlFor="etl-same-years-checkbox" className="text-sm text-gray-600">Same Start and End Years?</label>
        </div>

        <div>
          <label className="block text-sm text-gray-600">Status</label>
          <select value={seasonStatus} onChange={(e) => setSeasonStatus(e.target.value)} className="w-full p-2 border rounded">
            <option value="Active">Active</option>
            <option value="Planned">Planned</option>
            <option value="Finished">Finished</option>
          </select>
        </div>

        <div className="flex items-center gap-2 ml-10 mt-2">
          <input
            id="etl-season-default-checkbox"
            type="checkbox"
            checked={isSeasonDefault}
            onChange={(e) => setIsSeasonDefault(e.target.checked)}
            className="h-4 w-4"
          />
          <label htmlFor="etl-season-default-checkbox" className="text-sm text-gray-600">Default</label>
        </div>
      </div>

      {/* Decorative separator between the input logical sections */}
      <div className="w-full my-4" aria-hidden>
        <div style={{ height: '1px', background: '#e6e6e6', boxShadow: '0 1px 0 rgba(0,0,0,0.06)' }} />
        <div className="mt-3 mb-4 text-sm text-gray-600 flex items-center gap-3">
          <span className="text-gray-700 text-lg">League Infomation</span>
        </div>
      </div>

      {/* League section: league input moved here and visible only for Api-Football */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mb-6">
        <div>
            <label className="block text-sm text-gray-600">League (used by the API server originally)</label>
            <input className="w-full p-2 border rounded" value={league} onChange={(e) => setLeague(e.target.value)} />
        </div>

        <div>
            <label className="block text-sm text-gray-600">Schedule</label>
            <select value={scheduleType} onChange={(e) => setScheduleType(e.target.value)} className="w-full p-2 border rounded">
            <option value="Date">Date</option>
            <option value="Round">Round</option>
            </select>
        </div>

        <div className="flex items-center gap-2 ml-10 mt-6 md:mt-0">
            <input
            id="league-default-checkbox"
            type="checkbox"
            checked={isLeagueDefault}
            onChange={(e) => setIsLeagueDefault(e.target.checked)}
            className="h-4 w-4"
            />
            <label htmlFor="league-default-checkbox" className="text-sm text-gray-600">Default</label>
        </div>
      </div>



      <div className="w-full my-4" aria-hidden>
        <div style={{ height: '1px', background: '#e6e6e6', boxShadow: '0 1px 0 rgba(0,0,0,0.06)' }} />
        <div className="mt-3 mb-4 text-sm text-gray-600 flex items-center gap-3">
          <span className="text-gray-700 text-lg">Match Division Information</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-2">
          <div className="flex items-center gap-2">
            <input
              id="md-add-divisions"
              type="checkbox"
              checked={addDivisions}
              onChange={(e) => setAddDivisions(e.target.checked)}
              className="h-4 w-4"
            />
            <label htmlFor="md-add-divisions" className="text-sm text-gray-600">Add divisions</label>
          </div>

          <div className="flex items-center gap-2">
            <input
              id="md-run-background"
              type="checkbox"
              checked={runInBackground}
              onChange={(e) => setRunInBackground(e.target.checked)}
              className="h-4 w-4"
            />
            <label htmlFor="md-run-background" className="text-sm text-gray-600">Run in background</label>
          </div>
        </div>
      </div>

      {processingRowId && (
        <div className="mt-4 bg-yellow-50 border p-3 rounded">
          <div className="flex items-center justify-between mb-2">
            <div className="font-medium">Result</div>
            <div className="text-sm text-gray-600">Transitional ID: {processingRowId}</div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => window.open(`/admin/api/etl/football?rowId=${processingRowId}`, '_blank')}
              className="px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Open ETL Preview
            </button>
            <button
              onClick={() => setProcessingRowId(null)}
              className="px-3 py-2 border rounded bg-white hover:bg-gray-50"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {result && (
        <>
          <div className="flex justify-between items-center mb-2">
            <h2 className="text-lg font-semibold">Result</h2>
            <div className="flex items-center gap-2">
              <button onClick={handleClearResults} className="px-3 py-1.5 bg-gray-200 text-gray-800 rounded text-sm hover:bg-gray-300" style={minBtnWidth ? { minWidth: `${minBtnWidth}px` } : undefined}>Clear</button>
            </div>
          </div>

          <div className="mt-4 bg-white border rounded shadow-sm">
            <div className="p-3">
              <pre className="text-sm font-mono whitespace-pre-wrap break-words">{JSON.stringify(result, null, 2)}</pre>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
