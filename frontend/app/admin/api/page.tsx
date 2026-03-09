'use client';

import { useState, useRef } from 'react';

export default function AdminApiPage() {
  const [payload, setPayload] = useState('');
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [league, setLeague] = useState('39');
  const [season, setSeason] = useState('2025');
  const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
  const controllerRef = useRef<AbortController | null>(null);
  const TIMEOUT_MS = 60_000; // 60s timeout

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
        body: JSON.stringify({ league: Number(league), season: Number(season) }),
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

  const handleCancel = () => {
    controllerRef.current?.abort();
    setLoading(false);
    setResult({ error: 'Cancelled by user' });
    controllerRef.current = null;
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">API Import</h1>
      <p className="text-sm text-gray-600 mb-4">Paste JSON payload below and click Import to POST to <code>/v1/api/import</code>.</p>
      <textarea
        value={payload}
        onChange={(e) => setPayload(e.target.value)}
        className="w-full h-64 p-2 border border-gray-300 rounded mb-4 font-mono text-sm"
        placeholder='e.g. [{"clubId":254,"seasonId":17}, {...}]'
      />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mb-4">
        <div>
          <label className="block text-sm text-gray-600">League</label>
          <input className="w-full p-2 border rounded" value={league} onChange={(e) => setLeague(e.target.value)} />
        </div>
        <div>
          <label className="block text-sm text-gray-600">Season</label>
          <input className="w-full p-2 border rounded" value={season} onChange={(e) => setSeason(e.target.value)} />
        </div>
        <div className="flex items-end gap-2">
          <button
            onClick={handleFetchAndStore}
            disabled={loading}
            className="px-4 py-2 bg-green-600 text-white rounded disabled:opacity-50"
          >
            {loading ? 'Fetching...' : 'Fetch & Store'}
          </button>
          <button
            onClick={handleCancel}
            disabled={!loading}
            className="px-4 py-2 bg-yellow-500 text-white rounded disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="px-4 py-2 bg-blue-600 text-white rounded disabled:opacity-50"
          >
            {loading ? 'Importing...' : 'Import JSON'}
          </button>
          <button
            onClick={() => { setPayload(''); setResult(null); }}
            className="px-4 py-2 border rounded"
          >
            Reset
          </button>
        </div>
      </div>

      {result && (
        <div className="mt-4 bg-gray-50 border p-3 rounded">
          <pre className="text-sm">{JSON.stringify(result, null, 2)}</pre>
        </div>
      )}
    </div>
  );
}
