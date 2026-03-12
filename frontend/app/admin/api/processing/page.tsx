'use client';

import { useEffect, useState } from 'react';

export default function ProcessingPage() {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [apiStatus, setApiStatus] = useState<string | null>(null);
  const [rawResponse, setRawResponse] = useState<string | null>(null);
  const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

//   useEffect(() => {
//     fetch(`${API_BASE}/v1/api/transitional`)
//       .then((r) => r.json())
//       .then((d) => setRows(d.items || []))
//       .catch((e) => console.error(e))
//       .finally(() => setLoading(false));
//   }, []);

    useEffect(() => {
    fetch(`${API_BASE}/v1/api/transitional`)
        .then((r) => r.json())
        .then((d) => setRows(d.items || d.data?.items || []))
        .catch((e) => console.error(e))
        .finally(() => setLoading(false));
    }, []);

  const reloadRows = async () => {
    setLoading(true);
    try {
      const r = await fetch(`${API_BASE}/v1/api/transitional`);
      const j = await r.json();
      setRows(j.items || j.data?.items || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">API Processing</h1>
        <div>
          <button onClick={reloadRows} className="px-3 py-2 bg-blue-600 text-white rounded text-sm">Reload</button>
        </div>
      </div>
      {loading && <div>Loading...</div>}
      {error && <div className="text-red-600">Error: {error}</div>}
      <div className="mt-2 text-sm text-gray-600">API_BASE: {API_BASE}</div>
      {apiStatus && <div className="mt-1 text-sm">API status: {apiStatus}</div>}
      {rawResponse && (
        <div className="mt-2 p-2 bg-gray-50 border rounded text-xs max-h-40 overflow-auto">
          <strong>Raw response preview:</strong>
          <pre className="whitespace-pre-wrap">{rawResponse}</pre>
        </div>
      )}
      <table className="w-full table-auto border-collapse">
        <thead>
          <tr className="text-left">
            <th className="p-2">ID</th>
            <th className="p-2">League</th>
            <th className="p-2">Season</th>
            <th className="p-2">Source</th>
            <th className="p-2">Fetched At</th>
            <th className="p-2">Actions</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id} className="border-t">
              <td className="p-2">{r.id}</td>
              <td className="p-2">{r.league ?? '-'}</td>
              <td className="p-2">{r.season ?? '-'}</td>
              <td className="p-2 truncate max-w-xs">{r.source_url ?? '-'}</td>
              <td className="p-2">{r.fetched_at}</td>
              <td className="p-2">
                <a className="text-blue-600" href={`/admin/api/etl?rowId=${r.id}`}>Process</a>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
