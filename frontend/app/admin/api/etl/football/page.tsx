'use client';

import { useEffect, useState, useRef, useLayoutEffect } from 'react';
import DataTable from '@/components/ui/data-table';
import { Table as TableIcon, Database, Trash2 } from 'lucide-react';
import { useSearchParams } from 'next/navigation';
function downloadFile(filename: string, data: string) {
    const blob = new Blob([data], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
}

function toCSV(items: any[]) {
    if (!items.length) return '';
    const keys = Array.from(new Set(items.flatMap(Object.keys)));
    const rows = [keys.join(',')];
    for (const it of items) {
        rows.push(keys.map((k) => JSON.stringify(it[k] ?? '')).join(','));
    }
    return rows.join('\n');
}

export default function EtlPage() {
    const [rows, setRows] = useState<any[]>([]);
    const [selected, setSelected] = useState<any | null>(null);
    const [parsedColumns, setParsedColumns] = useState<string[] | null>(null);
    const [parsedRowsData, setParsedRowsData] = useState<any[] | null>(null);
    const [loadingRows, setLoadingRows] = useState(false);
    const [loadingRow, setLoadingRow] = useState(false);
    const [targetTable, setTargetTable] = useState('');
    const [dryRun, setDryRun] = useState(true);
    const [mappingInputs, setMappingInputs] = useState<Record<string, string>>({});
    const [loadResult, setLoadResult] = useState<any | null>(null);
    const [runningLoad, setRunningLoad] = useState(false);
    const [targetColumns, setTargetColumns] = useState<string[] | null>(null);
    const [viewMode, setViewMode] = useState<'table' | 'json'>('table');
    const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
    const searchParams = useSearchParams();
    const exportJsonRef = useRef<HTMLButtonElement | null>(null);
    const resetBtnRef = useRef<HTMLButtonElement | null>(null);
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

    useLayoutEffect(() => {
        const measure = () => {
            try {
                // Prefer the Export button (typically wider) when measuring initial width
                const el = exportJsonRef.current ?? resetBtnRef.current;
                const width = el?.offsetWidth ?? exportJsonRef.current?.offsetWidth ?? 0;
                // Determine candidate width (measured or fallback)
                const candidateMeasured = (width && width > 0) ? width : 0;
                const candidateFallback = exportJsonRef.current?.offsetWidth || 100;
                const candidate = candidateMeasured || candidateFallback;
                // Read stored value and enforce a 100px baseline so we don't shrink below it
                let storedRaw = 0;
                try { storedRaw = Number(localStorage.getItem('etl_min_btn_width') || 0); } catch (e) { storedRaw = 0; }
                const baseline = Math.max(storedRaw || 0, 100);
                const tag = el?.tagName ?? 'unknown';
                const snippet = String(el?.textContent ?? '').trim().slice(0, 30);
                if (candidate >= baseline) {
                    setMinBtnWidth(candidate);
                    try { localStorage.setItem('etl_min_btn_width', String(candidate)); } catch (e) {}
                }
            } catch (err) {
                console.error('[ETL] measure failed', err);
            }
        };
        // measure synchronously before paint and again after paint (rAF) to catch refs
        measure();
        let rafId: number | null = null;
        try {
            rafId = window.requestAnimationFrame(() => measure());
        } catch (e) {
            rafId = null;
        }
        window.addEventListener('resize', measure);
        return () => {
            window.removeEventListener('resize', measure);
            if (rafId) window.cancelAnimationFrame(rafId);
        };
    }, [selected, parsedRowsData]);

    useEffect(() => {
        setLoadingRows(true);
        fetch(`${API_BASE}/v1/api/transitional`)
            .then((r) => r.json())
            .then((d) => setRows(d.items || d.data?.items || []))
            .catch((e) => console.error(e))
            .finally(() => setLoadingRows(false));
    }, []);

    const reloadRows = async () => {
        setLoadingRows(true);
        try {
            const r = await fetch(`${API_BASE}/v1/api/transitional`);
            const j = await r.json();
            setRows(j.items || j.data?.items || []);
        } catch (e) {
            console.error(e);
        } finally {
            setLoadingRows(false);
        }
    };

    useEffect(() => {
        const id = searchParams?.get?.('rowId');
        if (!id) return;
        loadRow(Number(id));
    }, [searchParams?.toString()]);

    const loadRow = async (id: number) => {
        setLoadingRow(true);
        setParsedColumns(null);
        setParsedRowsData(null);
        try {
            // Fetch parsed tabular data from server-side parser
            const pResp = await fetch(`${API_BASE}/v1/api/transitional/${id}/parse`);
            console.log('Parse response:', pResp);
            const pJson = await pResp.json();
            console.log('parse body:', pJson);
            // Backend wraps responses with { statusCode, success, data } via interceptor
            const payload = pJson?.data ?? pJson;
            console.log('parse payload:', payload);
            if (payload?.found) {
                console.log('Flattened rows:', payload.rows);
                console.log('Columns:', payload.columns);
                setParsedColumns(payload.columns || []);
                setParsedRowsData(payload.rows || []);
            }

            // Also fetch the raw item for preview
            const rResp = await fetch(`${API_BASE}/v1/api/transitional/${id}`);
            const rJson = await rResp.json();
            const item = rJson.item || rJson.data?.item || rJson.data || rJson;
            setSelected(item || null);
        } catch (e) {
            console.error(e);
            setSelected(null);
        } finally {
            setLoadingRow(false);
        }
    };

    const handleSelect = (id: number) => {
        loadRow(id);
    };

    const handleToFrontendTable = (id: number) => {
        // Reuse existing selection logic to show the parsed preview
        loadRow(id);
        // ensure table view
        setViewMode('table');
        // scroll to processing result
        setTimeout(() => {
            const el = document.querySelector('h2 + div, section + div');
            if (el) (el as HTMLElement).scrollIntoView({ behavior: 'smooth' });
        }, 200);
    };

    const handleToDbTables = async (id: number) => {
        // Fetch the transitional row to check status before processing
        let transitionalRow: any = null;
        try {
            const checkResp = await fetch(`${API_BASE}/v1/api/transitional/${id}`);
            const checkJson = await checkResp.json().catch(() => ({}));
            transitionalRow = checkJson.item || checkJson.data?.item || checkJson;
        } catch (e) {
            console.error('Failed to fetch transitional row for status check', e);
        }
        const alreadyProcessed = transitionalRow?.status === true || transitionalRow?.status === 't';
        const verb = dryRun ? 'run a dry-run of' : 'run the process to apply the first parsed row into application tables';
        if (alreadyProcessed && !dryRun) {
            alert('This row was already processed (status = True).');
            return;
        }
        if (!confirm(`Confirm: ${verb}?`)) return;
        setRunningLoad(true);
        setLoadResult(null);
        try {
            // Use apply-all-rows for both dry runs and real runs (backend will honor dryRun flag)
            const resp = await fetch(`${API_BASE}/v1/api/transitional/${id}/apply-all-rows`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ sportId: 36, dryRun: !!dryRun }),
            });
            const j = await resp.json();
            const payload = j?.data ?? j;
            setLoadResult(payload ?? payload?.result ?? j);
                if (!resp.ok) alert(`${dryRun ? 'Dry run' : 'Apply'} failed: ${payload?.error || resp.statusText}`);
            else {
                alert(`${dryRun ? 'Dry run' : 'Apply'} completed — see Last Operation Result for details.`);
                // If this was a real run, persist status=true on the server and update UI
                if (!dryRun) {
                    try {
                        const persistResp = await fetch(`${API_BASE}/v1/api/transitional/${id}`, {
                            method: 'PATCH',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ status: true }),
                        });
                        if (!persistResp.ok) {
                            const errBody = await persistResp.json().catch(() => ({}));
                            console.warn('[ETL] failed to persist status update', errBody || persistResp.statusText);
                        }
                    } catch (e) {
                        console.warn('[ETL] status persist failed', e);
                    }

                    // Update local UI optimistically and then refresh from server
                    setRows((s) => s.map((r) => (r.id === id ? { ...r, status: true } : r)));
                    setSelected((s: any) => (s && s.id === id ? { ...s, status: true } : s));
                    await reloadRows();
                    loadRow(id);
                }
            }
        } catch (e) {
            console.error(e);
            setLoadResult({ error: String(e) });
            alert(`Operation failed: ${String(e)}`);
        } finally {
            setRunningLoad(false);
        }
    };

    const handleClearResults = () => {
        // Clear parsed preview and hide processing result
        setParsedColumns(null);
        setParsedRowsData(null);
        setSelected(null);
        setLoadResult(null);
        setViewMode('table');
        // Scroll up to top of page
        setTimeout(() => {
            const el = document.querySelector('h1');
            if (el) (el as HTMLElement).scrollIntoView({ behavior: 'smooth' });
        }, 100);
    };

    const handleDeleteRow = async (id: number) => {
        if (!confirm('Delete this transitional row from the database? This cannot be undone.')) return;
        try {
            const resp = await fetch(`${API_BASE}/v1/api/transitional/${id}`, { method: 'DELETE' });
            if (!resp.ok) {
                const j = await resp.json().catch(() => ({}));
                const payload = j?.data ?? j;
                alert(`Delete failed: ${payload?.error || resp.statusText}`);
                return;
            }
            // Remove from UI list
            setRows((s) => s.filter((r) => r.id !== id));
            if (selected?.id === id) setSelected(null);
        } catch (e) {
            console.error(e);
            alert(`Delete failed: ${String(e)}`);
        }
    };

    const handleExport = () => {
        if (!selected) return;
        const row = selected;
        // Always export JSON. Prefer server-parsed rows when available.
        let payloadToExport: any = null;
        if (parsedRowsData && parsedRowsData.length) payloadToExport = parsedRowsData;
        else {
            const payload = row.payload || row;
            let arr: any[] | null = null;
            if (Array.isArray(payload)) arr = payload as any[];
            else if (payload?.response && Array.isArray(payload.response)) arr = payload.response;
            else if (payload?.data && Array.isArray(payload.data)) arr = payload.data;
            payloadToExport = arr ?? payload;
        }
        downloadFile(`api_transitional_${row.id}.json`, JSON.stringify(payloadToExport ?? (row.payload || row), null, 2));
    };

    const runLoad = async (doDryRun: boolean) => {
        if (!selected) return;
        setRunningLoad(true);
        setLoadResult(null);
        try {
            // Build mapping object: target -> source
            const mapping: Record<string, string> = {};
            for (const src of parsedColumns || []) {
                const tgt = mappingInputs[src];
                if (tgt && tgt.trim()) mapping[tgt.trim()] = src;
            }

            const payload = { dryRun: !!doDryRun, targetTable: targetTable || undefined, mapping: Object.keys(mapping).length ? mapping : undefined };
            const resp = await fetch(`${API_BASE}/v1/api/transitional/${selected.id}/load`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });
            const j = await resp.json();
            setLoadResult(j);
        } catch (e) {
            console.error(e);
            setLoadResult({ error: String(e) });
        } finally {
            setRunningLoad(false);
        }
    };

    const fetchTargetColumns = async (table?: string) => {
        const t = table ?? targetTable;
        if (!t) {
            setTargetColumns(null);
            return;
        }
        try {
            const resp = await fetch(`${API_BASE}/v1/api/target-columns?table=${encodeURIComponent(t)}`);
            const j = await resp.json();
            setTargetColumns(j.columns || j.data?.columns || []);
        } catch (e) {
            console.error(e);
            setTargetColumns([]);
        }
    };

    useEffect(() => {
        // fetch target columns when table name changes (debounce could be added)
        if (!targetTable) {
            setTargetColumns(null);
            return;
        }
        fetchTargetColumns(targetTable);
    }, [targetTable]);

    const autoMap = () => {
        if (!targetColumns || !parsedColumns) return;
        const newMap: Record<string, string> = { ...mappingInputs };
        for (const src of parsedColumns) {
            if (targetColumns.includes(src)) newMap[src] = src;
        }
        setMappingInputs(newMap);
    };

    const updateMappingInput = (source: string, value: string) => {
        setMappingInputs((s) => ({ ...s, [source]: value }));
    };

    // derive array key and header info from payload for JSON/table split view
    const getPayloadArrayInfo = (payload: any) => {
        if (!payload) return { array: null as any[] | null, arrayKey: null as string | null, header: {} };
        if (Array.isArray(payload)) return { array: payload, arrayKey: null, header: {} };
        // common top-level keys
        for (const k of ['response', 'data', 'results']) {
            if (payload[k] && Array.isArray(payload[k])) {
                const header: Record<string, any> = {};
                for (const key of Object.keys(payload)) {
                    if (key === k) continue;
                    header[key] = payload[key];
                }
                return { array: payload[k], arrayKey: k, header };
            }
        }
        // find first nested array
        const stack: any[] = [payload];
        const seen = new Set();
        while (stack.length) {
            const cur = stack.shift();
            if (!cur || typeof cur !== 'object') continue;
            if (seen.has(cur)) continue;
            seen.add(cur);
            for (const key of Object.keys(cur)) {
                const v = cur[key];
                if (Array.isArray(v)) {
                    // header fallback: top-level without modification
                    return { array: v, arrayKey: key, header: payload };
                }
                if (v && typeof v === 'object') stack.push(v);
            }
        }
        return { array: null, arrayKey: null, header: payload };
    };

    // derive combined columns and merged rows (header repeated per row) for table view
    //   const deriveTable = (selectedItem: any, parsedCols: string[] | null, parsedRows: any[] | null) => {
    //     const payload = selectedItem?.payload || selectedItem || null;
    //     const info = getPayloadArrayInfo(payload);
    //     // Use the response array (or parsedRows if not available)
    //     const arr = info.array ?? (Array.isArray(payload) ? payload : parsedRows || []);
    //     const pCols = parsedCols || [];

    //     // flatten nested objects in array elements (dot notation)
    //     const flatten = (obj: any, prefix = '') => {
    //       const out: Record<string, any> = {};
    //       if (obj === null || obj === undefined) return out;
    //       if (typeof obj !== 'object' || obj instanceof Date) {
    //         out[prefix || 'value'] = obj;
    //         return out;
    //       }
    //       for (const k of Object.keys(obj)) {
    //         const v = obj[k];
    //         const key = prefix ? `${prefix}.${k}` : k;
    //         if (v === null || v === undefined) {
    //           out[key] = v;
    //         } else if (Array.isArray(v)) {
    //           try { out[key] = JSON.stringify(v); } catch (e) { out[key] = String(v); }
    //         } else if (typeof v === 'object') {
    //           Object.assign(out, flatten(v, key));
    //         } else if (v instanceof Date) {
    //           out[key] = v.toISOString();
    //         } else {
    //           out[key] = v;
    //         }
    //       }
    //       return out;
    //     };
    const deriveTable = (selectedItem: any) => {
        const payload: any = selectedItem?.payload || selectedItem || {};

        const responseArray: any[] = Array.isArray(payload?.response)
            ? payload.response
            : [];

        const flatten = (obj: any, prefix = ''): Record<string, any> => {
            const out: Record<string, any> = {};

            if (!obj || typeof obj !== 'object') return out;

            for (const key of Object.keys(obj)) {
                const value = obj[key];
                const newKey = prefix ? `${prefix}.${key}` : key;

                if (value === null || value === undefined) {
                    out[newKey] = '';
                } else if (Array.isArray(value)) {
                    out[newKey] = JSON.stringify(value);
                } else if (typeof value === 'object') {
                    Object.assign(out, flatten(value, newKey));
                } else {
                    out[newKey] = value;
                }
            }

            return out;
        };

        const flatRows: Record<string, any>[] = responseArray.map((r) => flatten(r));

        const columns: string[] = Array.from(
            new Set(flatRows.flatMap((r) => Object.keys(r)))
        );

        const rows: Record<string, any>[] = flatRows.map((r) => {
            const row: Record<string, any> = {};

            for (const col of columns) {
                row[col] = r[col] ?? '';
            }

            return row;
        });

        return { combined: columns, rows };
    };

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold">ETL - Football</h1>
            </div>

            <section className="mb-6">
                <div className="flex justify-between items-center mb-2">
                    <h2 className="text-lg font-semibold">Available API Loads</h2>
                    <button onClick={() => reloadRows()} className="px-3 py-2 bg-blue-600 text-white rounded text-sm" style={minBtnWidth ? { minWidth: `${minBtnWidth}px` } : undefined}>Reload</button>
                </div>
                <DataTable
                    columns={[
                        { header: 'ID', accessor: 'id' },
                        { header: 'League', accessor: (r: any) => r.league ?? '-' , width: '240px' },
                        { header: 'Season', accessor: 'season' },
                        { header: 'Source', accessor: (r: any) => <div className="truncate max-w-xs">{r.source_url ?? '-'}</div> },
                        { header: 'Fetched At', accessor: (r: any) => formatDateTimeMinute(r.fetched_at) },
                        { header: 'Status', accessor: (r: any) => (r.status ? 'Loaded' : 'Not Loaded') },
                        {
                            header: 'Actions',
                            accessor: (r: any) => (
                                <div className="flex items-center gap-3 justify-end">
                                    <button onClick={() => handleToFrontendTable(r.id)} className="text-blue-600 hover:text-blue-900" title="Table/Json View">
                                        <TableIcon size={18} />
                                    </button>
                                    <button onClick={() => handleToDbTables(r.id)} disabled={runningLoad} className={`text-green-600 hover:text-green-900 ${runningLoad ? 'opacity-50 cursor-not-allowed' : ''}`} title="Transform & Load">
                                        <Database size={18} />
                                    </button>
                                    <button onClick={() => handleDeleteRow(r.id)} className="text-red-600 hover:text-red-900" title="Delete">
                                        <Trash2 size={18} />
                                    </button>
                                </div>
                            ),
                        },
                    ]}
                    data={rows}
                    isLoading={loadingRows}
                    emptyMessage="No API loads found."
                />
            </section>

            {/* Operation result feedback */}
            {loadResult && (
                <div className="mb-6">
                            <h3 className="font-medium mb-2">Last Operation Result</h3>
                            <pre className="bg-gray-50 border p-3 rounded text-sm max-h-40 overflow-auto">{JSON.stringify(loadResult?.data ?? loadResult ?? loadResult, null, 2)}</pre>
                    
                </div>
            )}

            <section>
                <div className="flex justify-between items-center mb-2">
                    <h2 className="text-lg font-semibold">Result</h2>
                    <button ref={resetBtnRef} onClick={handleClearResults} className="px-3 py-2 bg-gray-300 text-gray-800 rounded text-sm" style={minBtnWidth ? { minWidth: `${minBtnWidth}px` } : undefined}>Clear</button>
                </div>
                {loadingRow && <div>Loading selected row...</div>}
                {!selected && !loadingRow && <div>Select an API load above to preview its payload and export.</div>}
                {selected && (
                    <div>
                        <div className="mb-4">
                            <strong>ID:</strong> {selected.id} &nbsp; <strong>Fetched:</strong> {formatDateTimeMinute(selected.fetched_at)}
                        </div>
                        <div className="mb-4">
                            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 w-full">
                                {/* Left: To DB + Dry run + Clear */}
                                <div className="flex items-center gap-2 order-1 md:order-1">
                                    <button disabled={runningLoad} onClick={() => selected && handleToDbTables(selected.id)} className={`px-3 py-2 rounded text-sm ${runningLoad ? 'bg-gray-400 text-gray-800' : 'bg-green-600 text-white'}`} style={minBtnWidth ? { minWidth: `${minBtnWidth}px` } : undefined}>
                                        {runningLoad ? 'Running...' : (dryRun ? 'Transform & Load (Dry run)' : 'Transform & Load')}
                                    </button>
                                    <label className="inline-flex items-center text-sm ml-1">
                                        <input type="checkbox" checked={dryRun} onChange={(e) => setDryRun(e.target.checked)} className="mr-2" />
                                        Dry run
                                    </label>
                                </div>

                                {/* Center: view toggles */}
                                <div className="flex items-center gap-2 order-3 md:order-2 justify-center">
                                    <div className="flex items-center bg-gray-100 rounded space-x-2 p-2">
                                        <button onClick={() => setViewMode('table')} className={`px-3 py-2 rounded text-sm ${viewMode === 'table' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700'}`} style={minBtnWidth ? { minWidth: `${minBtnWidth}px` } : undefined}>Table</button>
                                        <button onClick={() => setViewMode('json')} className={`px-3 py-2 rounded text-sm ${viewMode === 'json' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700'}`} style={minBtnWidth ? { minWidth: `${minBtnWidth}px` } : undefined}>JSON</button>
                                    </div>
                                </div>

                                {/* Right: Export buttons */}
                                <div className="flex items-center gap-2 order-2 md:order-3 justify-end">
                                    <button ref={exportJsonRef} onClick={handleExport} className="px-3 py-2 bg-blue-600 text-white rounded text-sm">Export JSON</button>
                                    <button onClick={() => downloadFile(`api_transitional_${selected.id}_preview.csv`, toCSV(parsedRowsData || []))} className="px-3 py-2 bg-blue-600 text-white rounded text-sm" style={minBtnWidth ? { minWidth: `${minBtnWidth}px` } : undefined}>Export CSV</button>
                                </div>
                            </div>
                        </div>
                        {/* <div className="mb-4 p-3 border rounded bg-gray-50">
                            <div>viewMode: {viewMode}</div>
                            <div>parsedRowsData.length: {parsedRowsData?.length ?? 0}</div>
                            <div className="mt-2">
                                <div className="text-xs text-gray-600">Parsed preview (first 3 rows):</div>
                                <pre className="bg-white p-2 rounded text-xs max-h-40 overflow-auto">{JSON.stringify((parsedRowsData || []).slice(0, 3), null, 2)}</pre>
                            </div>
                        </div> */}
                        {viewMode === 'table' && parsedRowsData && parsedRowsData.length ? (
                            <div className="mb-4">
                                <h3 className="font-medium mb-2">Parsed Preview</h3>
                                <div className="overflow-auto border rounded max-h-[60vh]">
                                    {(() => {
                                        // const tbl = deriveTable(selected, parsedColumns, parsedRowsData);
                                        const tbl = deriveTable(selected);
                                        const cols = tbl.combined;
                                        const rows = tbl.rows;
                                        return (
                                            <table className="min-w-max table-fixed border-collapse whitespace-nowrap">
                                                <thead className="bg-gray-100">
                                                    <tr>
                                                        {cols.map((c) => (
                                                            <th key={c} className="p-2 text-left text-sm border-b">{c}</th>
                                                        ))}
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {rows.map((r, i) => (
                                                        <tr key={i} className="odd:bg-white even:bg-gray-50 border-t">
                                                            {cols.map((c) => (
                                                                <td key={c} className="p-2 text-sm align-top border-r">{String(r[c] ?? '')}</td>
                                                            ))}
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        );
                                    })()}
                                </div>
                                {/* <div className="mt-4 p-3 border-t">
                                    <h4 className="font-medium mb-2">Loader</h4>
                                    <div className="mb-2">
                                        <label className="block text-sm">Target table (exact name)</label>
                                        <input value={targetTable} onChange={(e) => setTargetTable(e.target.value)} className="border p-2 rounded w-full" />
                                    </div>
                                    <div className="mb-2">
                                        <label className="inline-flex items-center">
                                            <input type="checkbox" checked={dryRun} onChange={(e) => setDryRun(e.target.checked)} className="mr-2" />
                                            Dry run (do not commit)
                                        </label>
                                    </div>

                                    <div className="mb-2">
                                        <div className="text-sm font-medium">Column mapping (optional)</div>
                                        <div className="text-xs text-gray-600 mb-2">Map parsed column → target column. Leave empty to use intersection.</div>
                                        <div className="grid grid-cols-2 gap-2">
                                            {(parsedColumns || Object.keys(parsedRowsData[0] || {})).map((src) => (
                                                <div key={src} className="p-2 border rounded">
                                                    <div className="text-xs text-gray-600">Parsed:</div>
                                                    <div className="text-sm font-mono mb-1 truncate">{src}</div>
                                                    {targetColumns && targetColumns.length ? (
                                                        <select value={mappingInputs[src] || ''} onChange={(e) => updateMappingInput(src, e.target.value)} className="w-full p-1 border rounded text-sm">
                                                            <option value="">-- (no mapping) --</option>
                                                            {targetColumns.map((tc) => (
                                                                <option key={tc} value={tc}>{tc}</option>
                                                            ))}
                                                        </select>
                                                    ) : (
                                                        <input value={mappingInputs[src] || ''} onChange={(e) => updateMappingInput(src, e.target.value)} placeholder="target column name" className="w-full p-1 border rounded text-sm" />
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="mb-2">
                                        <button type="button" onClick={autoMap} className="px-2 py-1 mr-2 bg-blue-500 text-white rounded text-sm">Auto-map identical names</button>
                                        <button type="button" onClick={() => fetchTargetColumns()} className="px-2 py-1 bg-gray-200 rounded text-sm">Refresh columns</button>
                                    </div>

                                    <div className="flex gap-2 mt-3">
                                        <button disabled={runningLoad} onClick={() => runLoad(true)} className="px-3 py-2 bg-gray-500 text-white rounded">Run Dry Run</button>
                                        <button disabled={runningLoad} onClick={() => runLoad(false)} className="px-3 py-2 bg-green-600 text-white rounded">Apply</button>
                                    </div>

                                    {runningLoad && <div className="mt-2">Running...</div>}
                                    {loadResult && (
                                        <pre className="mt-3 bg-gray-50 border p-2 rounded text-sm max-h-40 overflow-auto">{JSON.stringify(loadResult, null, 2)}</pre>
                                    )}
                                </div> */}
                            </div>
                        ) : viewMode === 'json' ? (
                            <div className="mb-4">
                                <h3 className="font-medium mb-2">JSON View</h3>
                                {/* Header: top-level metadata (excluding response array if found at top-level) */}
                                {selected && (
                                    (() => {
                                        const payload = selected.payload || selected;
                                        const info = getPayloadArrayInfo(payload);
                                        return (
                                            <div>
                                                <div className="mb-3">
                                                    <div className="text-sm font-medium">Header</div>
                                                    <div className="overflow-auto border rounded mt-2 p-2 text-sm">
                                                        <table className="w-full table-auto">
                                                            <tbody>
                                                                {Object.keys(info.header || {}).map((k) => (
                                                                    <tr key={k} className="border-t">
                                                                        <td className="p-2 font-mono text-xs text-gray-700 w-1/3">{k}</td>
                                                                        <td className="p-2 text-sm">{typeof info.header[k] === 'object' ? JSON.stringify(info.header[k]) : String(info.header[k])}</td>
                                                                    </tr>
                                                                ))}
                                                                {Object.keys(info.header || {}).length === 0 && (
                                                                    <tr><td className="p-2 text-sm">(no header fields)</td></tr>
                                                                )}
                                                            </tbody>
                                                        </table>
                                                    </div>
                                                </div>

                                                <div>
                                                    <div className="text-sm font-medium mb-1">Response (raw)</div>
                                                    <pre className="bg-gray-50 border p-3 rounded text-sm max-h-[40vh] overflow-auto">{JSON.stringify(info.array ?? payload, null, 2)}</pre>
                                                </div>
                                            </div>
                                        );
                                    })()
                                )}
                            </div>
                        ) : (
                            <div className="mb-4">
                                <h3 className="font-medium mb-2">Raw Payload</h3>
                                <pre className="bg-gray-50 border p-3 rounded text-sm max-h-[60vh] overflow-auto">{JSON.stringify(selected.payload, null, 2)}</pre>
                            </div>
                        )}
                    </div>
                )}
            </section>
        </div>
    );
}

function formatDateTimeMinute(input?: string | null) {
    if (!input) return '-';
    const d = new Date(String(input));
    if (Number.isNaN(d.getTime())) return String(input);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    const hh = String(d.getHours()).padStart(2, '0');
    const min = String(d.getMinutes()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd} ${hh}:${min}`;
}