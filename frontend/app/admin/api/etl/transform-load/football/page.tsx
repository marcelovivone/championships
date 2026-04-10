'use client';

import React, { Fragment, useEffect, useState, useRef, useLayoutEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import DataTable from '@/components/ui/data-table';
import { Table as TableIcon, Database, Trash2, RefreshCw } from 'lucide-react';
import { useSearchParams } from 'next/navigation';
import { sportsApi, countriesApi, clubsApi } from '@/lib/api/entities';

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

function formatLeagueDate(dateValue: string | null | undefined) {
    if (!dateValue) return '-';
    try {
        // The backend now provides dates already converted to local timezone
        // based on the match country, so we can display them directly
        const d = new Date(String(dateValue));
        if (!Number.isNaN(d.getTime())) {
            // For display purposes, show both the date and time in local timezone
            return d.toLocaleString('en-GB', {
                year: 'numeric',
                month: '2-digit', 
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit',
                timeZoneName: 'short'
            });
        }
    } catch {
        return String(dateValue);
    }
    return String(dateValue);
}

function collectManualRoundOverrides(
    matches: any[],
    inputs: Record<string, string>,
    existingOverrides: Record<string, number>,
) {
    const manualOverrides: Record<string, number> = { ...existingOverrides };

    for (const match of matches) {
        const rawValue = inputs[match.id];
        if (!rawValue || isNaN(Number(rawValue))) continue;
        const parsedValue = Number(rawValue);
        if (parsedValue < 1) continue;

        const wasManuallyAssigned = match.assignmentSource === 'manual' || existingOverrides[match.id] != null;
        const changedAutomaticAssignment = match.assignedRound == null || parsedValue !== Number(match.assignedRound);

        if (wasManuallyAssigned || changedAutomaticAssignment) {
            manualOverrides[match.id] = parsedValue;
        }
    }

    return manualOverrides;
}

export default function EtlPage() {
    const [clubCountrySelections, setClubCountrySelections] = useState<Record<string, number | undefined>>({});
    const [clubsByCountry, setClubsByCountry] = useState<Record<number, any[]>>({});
    const [allCountries, setAllCountries] = useState<any[]>([]);
    const [rows, setRows] = useState<any[]>([]);
    const [selected, setSelected] = useState<any | null>(null);
    const [page, setPage] = useState(1);
    const [limit] = useState(10);
    const [pageInput, setPageInput] = useState('1');
    const [sortBy, setSortBy] = useState<string>('fetched_at');
    const [sortOrder, setSortOrder] = useState<'asc'|'desc'>('desc');
    const [parsedColumns, setParsedColumns] = useState<string[] | null>(null);
    const [parsedRowsData, setParsedRowsData] = useState<any[] | null>(null);
    const [loadingRows, setLoadingRows] = useState(false);
    const [loadingRow, setLoadingRow] = useState(false);
    const [targetTable, setTargetTable] = useState('');
    const [dryRun, setDryRun] = useState(false);
    const [seasonPhase, setSeasonPhase] = useState<'all' | 'postseason' | 'regular-season'>('all');
    const [mappingInputs, setMappingInputs] = useState<Record<string, string>>({});
    const [loadResult, setLoadResult] = useState<any | null>(null);
    const [runningLoad, setRunningLoad] = useState(false);
    const [pendingStrays, setPendingStrays] = useState<any[]>([]);
    const [strayInputs, setStrayInputs] = useState<Record<string, string>>({});
    const [accumulatedOverrides, setAccumulatedOverrides] = useState<Record<string, number>>({});
    const [pendingApplyId, setPendingApplyId] = useState<number | null>(null);
    const [footballSportId, setFootballSportId] = useState<number | null>(null);
    const [isSubsequentLoad, setIsSubsequentLoad] = useState(false);
    const [roundReviewSummary, setRoundReviewSummary] = useState<any[]>([]);
    const [expandedRoundDetails, setExpandedRoundDetails] = useState<Record<string, boolean>>({});
    const [targetColumns, setTargetColumns] = useState<string[] | null>(null);
    const [viewMode, setViewMode] = useState<'table' | 'json'>('table');
    const [countryForReview, setCountryForReview] = useState<any | null>(null);
    const [countryMapping, setCountryMapping] = useState<number | null | undefined>(undefined);
    const [leagueForReview, setLeagueForReview] = useState<any | null>(null);
    const [leagueMapping, setLeagueMapping] = useState<number | null | undefined>(undefined);
    const [clubsForReview, setClubsForReview] = useState<any[]>([]);
    const [stadiumsForReview, setStadiumsForReview] = useState<any[]>([]);
    const [payloadCountryForClubs, setPayloadCountryForClubs] = useState<any | null>(null);
    const [clubMappings, setClubMappings] = useState<Record<string, number | null | undefined>>({});
    const [stadiumMappings, setStadiumMappings] = useState<Record<string, string>>({});
    const [pendingEntityReviewApplyId, setPendingEntityReviewApplyId] = useState<number | null>(null);
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

    // Query countries via react-query (normalize paginated responses)
    const countriesQuery = useQuery({
        queryKey: ['countries'],
        queryFn: () => countriesApi.getAll({ page: 1, limit: 1000 }),
    });

    useEffect(() => {
        const countriesData = countriesQuery.data as any;
        const arr = countriesData?.data || countriesData?.items || countriesData || [];
        setAllCountries(Array.isArray(arr) ? arr.map((c: any) => ({ id: Number(c.id), name: c.name })) : []);
    }, [countriesQuery.data, payloadCountryForClubs]);

    // Query clubs via react-query and build clubsByCountry map
    const clubsQuery = useQuery({
        queryKey: ['clubs'],
        queryFn: () => clubsApi.getAll({ page: 1, limit: 1000 }),
    });

    useEffect(() => {
        const data = clubsQuery.data as any;
        const arr = data?.data || data?.items || data || [];
        if (!Array.isArray(arr)) {
            setClubsByCountry({});
            return;
        }
        const byCountry: Record<number, any[]> = {};
        arr.forEach((club: any) => {
            const cid = club.country_id ?? club.countryId ?? club.country?.id ?? null;
            if (cid == null) return;
            const key = Number(cid);
            if (!byCountry[key]) byCountry[key] = [];
            byCountry[key].push(club);
        });
        setClubsByCountry(byCountry);
    }, [clubsQuery.data]);

    useEffect(() => {
        if (!clubsForReview.length || !allCountries.length) return;
        setClubCountrySelections((prev) => {
            const next = { ...prev };
            clubsForReview.forEach((club: any) => {
                const key = (club.name && String(club.name)) || (club.id != null ? String(club.id) : '');
                if (!key) return;
                if (next[key] !== undefined) return;
                let defaultCountryId = undefined;
                if (club.country_id) {
                    defaultCountryId = club.country_id;
                } else if (payloadCountryForClubs?.id) {
                    defaultCountryId = payloadCountryForClubs.id;
                } else if (countryForReview?.suggestions?.length > 0) {
                    defaultCountryId = countryForReview.suggestions[0].id;
                }
                next[key] = defaultCountryId;
            });
            return next;
        });
    }, [clubsForReview, allCountries, countryForReview, payloadCountryForClubs]);

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

    // useEffect(() => {
    //     setLoadingRows(true);
    //     fetch(`${API_BASE}/v1/api/transitional`)
    //         .then((r) => r.json())
    //         .then((d) => setRows(d.items || d.data?.items || []))
    //         .catch((e) => console.error(e))
    //         .finally(() => setLoadingRows(false));
    // }, []);

    useEffect(() => {
        (async () => {
            try {
                const res = await sportsApi.getAll({ page: 1, limit: 100 });
                const normalized = Array.isArray(res.data) ? res.data : [];
                const fball = normalized.find((s: any) => typeof s.name === 'string' && s.name.toLowerCase().includes('football'));
                if (fball) setFootballSportId(fball.id);
            } catch (e) {
                console.error('[ETL Football] failed to fetch sports', e);
            }
        })();
    }, []);

    useEffect(() => {
        if (footballSportId == null) return;
        setLoadingRows(true);
        fetch(`${API_BASE}/v1/api/transitional`)
            .then((r) => r.json())
            .then((d) => {
                const all = d.items || d.data?.items || [];
                setRows(all.filter((r: any) => r.sport === footballSportId));
            })
            .catch((e) => console.error(e))
            .finally(() => setLoadingRows(false));
    }, [footballSportId]);

    // keep page input in sync with page
    useEffect(() => {
        setPageInput(page.toString());
    }, [page]);

    // const reloadRows = async () => {
    //     setLoadingRows(true);
    //     try {
    //         const r = await fetch(`${API_BASE}/v1/api/transitional`);
    //         const j = await r.json();
    //         setRows(j.items || j.data?.items || []);
    //     } catch (e) {
    //         console.error(e);
    //     } finally {
    //         setLoadingRows(false);
    //     }
    // };

        const reloadRows = async () => {
        setLoadingRows(true);
        try {
            const r = await fetch(`${API_BASE}/v1/api/transitional`);
            const j = await r.json();
            const all = j.items || j.data?.items || [];
            setRows(all.filter((r: any) => r.sport === footballSportId));
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

    const loadRow = async (id: number, overrides: Record<string, number> = {}) => {
        setLoadingRow(true);
        setParsedColumns(null);
        setParsedRowsData(null);
        setRoundReviewSummary([]);
        setExpandedRoundDetails({});
        try {
            // Fetch parsed tabular data from server-side parser
            const params = new URLSearchParams();
            if (Object.keys(overrides).length > 0) {
                params.set('roundOverrides', JSON.stringify(overrides));
            }
            params.set('seasonPhase', seasonPhase);
            const query = params.toString();
            const pResp = await fetch(`${API_BASE}/v1/api/transitional/${id}/parse${query ? `?${query}` : ''}`);
            const pJson = await pResp.json();
            // Backend wraps responses with { statusCode, success, data } via interceptor
            const payload = pJson?.data ?? pJson;
            if (payload?.found) {
                setParsedColumns(payload.columns || []);
                setParsedRowsData(payload.rows || []);
                setPendingStrays([]);
                setStrayInputs({});
                setRoundReviewSummary([]);
                setExpandedRoundDetails({});
                setIsSubsequentLoad(!!payload.isSubsequentLoad);

                // Also fetch the raw item for preview (only when parsing succeeded)
                const rResp = await fetch(`${API_BASE}/v1/api/transitional/${id}`);
                const rJson = await rResp.json();
                const item = rJson.item || rJson.data?.item || rJson.data || rJson;
                setSelected(item || null);
            } else if (payload?.reason === 'needs_round_review' && payload?.details?.reviewMatches?.length) {
                setParsedColumns(null);
                setParsedRowsData(null);
                const reviewMatches = payload.details.reviewMatches || [];
                setPendingStrays(reviewMatches);
                setStrayInputs(
                    Object.fromEntries(
                        reviewMatches.map((match: any) => [match.id, match.assignedRound != null ? String(match.assignedRound) : ''])
                    )
                );
                setRoundReviewSummary(payload.details.roundSummary || []);
                setExpandedRoundDetails({});
                setSelected({ id, parseError: 'needs_round_review', parseDetails: payload?.details ?? null });
                const derivedRows = reviewMatches.map((match: any) => ({
                    'league.round': match.assignedRound ?? null,
                    'origin_api_id': match.eventId ?? null,
                    'fixture.date': match.leagueLocalDate ?? match.date ?? null,
                    'teams.home.name': match.homeShortName ?? match.homeTeam ?? null,
                    'teams.away.name': match.awayShortName ?? match.awayTeam ?? null,
                    'fixture.venue.name': match.venueName ?? null,
                    'fixture.venue.city': match.venueCity ?? null,
                    'assignment.source': match.assignmentSource ?? null,
                }));
                setParsedColumns(['league.round','origin_api_id','fixture.date','teams.home.name','teams.away.name','fixture.venue.name','fixture.venue.city','assignment.source']);
                setParsedRowsData(derivedRows);
            } else {
                // Parsing failed: show only the reason/error (and any details) to avoid loading huge payloads
                const reason = payload?.error ?? payload?.reason ?? 'parse_failed';
                setParsedColumns(null);
                setParsedRowsData(null);
                setPendingStrays([]);
                setStrayInputs({});
                setRoundReviewSummary([]);
                setExpandedRoundDetails({});
                // If diagnostics contain partialEvents, show them as a tabular preview instead of raw JSON
                if (payload?.details?.partialEvents) {
                    const roundMap = (payload.details.roundAssignments || []).reduce((acc: any, cur: any) => {
                        if (cur && cur.eventId != null) acc[String(cur.eventId)] = cur.round;
                        return acc;
                    }, {} as Record<string, any>);
                    const derivedRows = (payload.details.partialEvents || []).map((pe: any) => ({
                        'league.round': roundMap[String(pe.eventId)] ?? null,
                        'origin_api_id': pe.eventId ?? null,
                        'fixture.date': pe.date ?? null,
                        'teams.home.name': pe.homeShortName ?? pe.homeName ?? null,
                        'teams.away.name': pe.awayShortName ?? pe.awayName ?? null,
                        'home_id': pe.homeId ?? null,
                        'away_id': pe.awayId ?? null,
                    }));
                    setParsedColumns(['league.round','origin_api_id','fixture.date','teams.home.name','teams.away.name','home_id','away_id']);
                    setParsedRowsData(derivedRows);
                    setSelected({ id, parseError: reason, parseDetails: payload?.details ?? null });
                } else {
                    setSelected({ id, parseError: reason, parseDetails: payload?.details ?? null });
                }
            }
        } catch (e) {
            console.error(e);
            setSelected(null);
        } finally {
            setLoadingRow(false);
        }
    };

    const handleSelect = (id: number) => {
        setPendingStrays([]);
        setStrayInputs({});
        setRoundReviewSummary([]);
        setAccumulatedOverrides({});
        setExpandedRoundDetails({});
        setIsSubsequentLoad(false);
        loadRow(id);
    };

    const handleToFrontendTable = (id: number) => {
        // Reuse existing selection logic to show the parsed preview
        loadRow(id);
        // Also trigger a dry run to show the operation preview
        handleToDbTables(id, undefined, undefined, true);
        // ensure table view
        setViewMode('table');
        // scroll to processing result
        setTimeout(() => {
            const el = document.querySelector('h2 + div, section + div');
            if (el) (el as HTMLElement).scrollIntoView({ behavior: 'smooth' });
        }, 200);
    };

    const handleToDbTables = async (id: number, overridesArg?: Record<string, number>, previewRow?: any, forceDryRun = false, skipEntityReview = false) => {
        const effectiveOverrides = overridesArg ?? accumulatedOverrides;
        const isDryRun = forceDryRun || dryRun;

        // Show the row metadata immediately from the table row the user clicked.
        if (previewRow) {
            setSelected(previewRow);
        }

        // Pre-check: parse the row to detect if round assignment input is needed before confirming.
        // Skip this entirely for subsequent loads — rounds already exist, no review needed.
        if (!isSubsequentLoad && !skipEntityReview) {
          try {
            const params = new URLSearchParams();
            if (Object.keys(effectiveOverrides).length > 0) {
                params.set('roundOverrides', JSON.stringify(effectiveOverrides));
            }
            params.set('seasonPhase', seasonPhase);
            const query = params.toString();
            const pResp = await fetch(`${API_BASE}/v1/api/transitional/${id}/parse${query ? `?${query}` : ''}`);
            const pJson = await pResp.json();
            const pPayload = pJson?.data ?? pJson;
            if (pPayload?.reason === 'needs_round_review' && pPayload?.details?.reviewMatches?.length) {
                // Round input needed — show the stray UI and remember to apply after resolution
                const reviewMatches = pPayload.details.reviewMatches || [];
                setPendingStrays(reviewMatches);
                setStrayInputs(
                    Object.fromEntries(
                        reviewMatches.map((match: any) => [match.id, match.assignedRound != null ? String(match.assignedRound) : ''])
                    )
                );
                setRoundReviewSummary(pPayload.details.roundSummary || []);
                setExpandedRoundDetails({});
                setAccumulatedOverrides(effectiveOverrides);
                const rResp = await fetch(`${API_BASE}/v1/api/transitional/${id}`);
                const rJson = await rResp.json();
                const item = rJson.item || rJson.data?.item || rJson.data || rJson;
                setSelected({ ...(item || { id }), parseError: 'needs_round_review', parseDetails: pPayload?.details ?? null });
                setPendingApplyId(id);
                setViewMode('table');
                setTimeout(() => {
                    const el = document.querySelector('[data-round-review-section]');
                    if (el) (el as HTMLElement).scrollIntoView({ behavior: 'smooth' });
                }, 200);
                return;
            }
          } catch (e) {
            // If pre-check fails, proceed — the apply endpoint will surface the error
            console.warn('[ETL] pre-check parse failed, proceeding with apply', e);
          }
        }

        // Pre-check: detect if entity (club/stadium) mapping is needed before confirming.
        if (!isSubsequentLoad && !skipEntityReview) {
          try {
            
            // Always check for entity conflicts - backend will use existing mappings if available
            const rowSportId = rows.find((r: any) => r.id === id)?.sport ?? footballSportId ?? 34;
            const entityParams = new URLSearchParams({ sportId: String(rowSportId), seasonPhase });
            const entityCheckResp = await fetch(`${API_BASE}/v1/api/transitional/${id}/entity-suggestions?${entityParams.toString()}`);
            const entityCheckJson = await entityCheckResp.json();
            const entityData = entityCheckJson?.data ?? entityCheckJson;
            
            // If there are any entities that need review, show the UI
            if (entityData?.needsReview && (entityData?.country || entityData?.league || entityData?.clubs?.length || entityData?.stadiums?.length)) {
                // Entity review needed — show the mapping UI
                setCountryForReview(entityData.country || null);
                setPayloadCountryForClubs(entityData.payloadCountry || null);
                setCountryMapping(undefined);
                setLeagueForReview(entityData.league || null);
                setLeagueMapping(undefined);
                setClubsForReview(entityData.clubs || []);
                setStadiumsForReview(entityData.stadiums || []);
                // Initialize mappings state with no selections (undefined means user must choose)
                setClubMappings(
                    Object.fromEntries(
                        (entityData.clubs || []).map((club: any) => [club.name, undefined])
                    )
                );
                setClubCountrySelections({});
                setStadiumMappings(
                    Object.fromEntries(
                        (entityData.stadiums || []).map((stadium: any) => [stadium.name, undefined])
                    )
                );
                setPendingEntityReviewApplyId(id);
                setViewMode('table');
                setTimeout(() => {
                    const el = document.querySelector('[data-entity-review-section]');
                    if (el) (el as HTMLElement).scrollIntoView({ behavior: 'smooth' });
                }, 200);
                return;
            }
          } catch (e) {
            console.warn('[ETL] entity pre-check failed, proceeding with apply', e);
          }
        }

        // Fetch the transitional row to check status before processing
        let transitionalRow: any = null;
        try {
            const checkResp = await fetch(`${API_BASE}/v1/api/transitional/${id}`);
            const checkJson = await checkResp.json().catch(() => ({}));
            // Use same extraction strategy as elsewhere: prefer wrapped `item`, then `data.item`, then `data`, then raw
            transitionalRow = checkJson.item || checkJson.data?.item || checkJson.data || checkJson;
            // Show basic metadata to the user before proceeding (origin, league, season, fetched)
            if (transitionalRow) {
                // Normalize fallback extraction from payload when top-level columns are null
                const payload = transitionalRow.payload ?? transitionalRow;
                const get = (obj: any, path: string) => {
                    if (!obj) return null;
                    // support simple nested keys and array indices like 'leagues.0.name'
                    return path.split('.').reduce((acc: any, key: string) => {
                        if (acc == null) return null;
                        // array index
                        const arrMatch = key.match(/^(\d+)$/);
                        if (arrMatch) return Array.isArray(acc) ? acc[Number(arrMatch[1])] : null;
                        // numeric index like 'leagues[0]'
                        const idxMatch = key.match(/^(\w+)\[(\d+)\]$/);
                        if (idxMatch) {
                            const k = idxMatch[1]; const i = Number(idxMatch[2]);
                            return acc[k] && Array.isArray(acc[k]) ? acc[k][i] : null;
                        }
                        return acc[key] !== undefined ? acc[key] : null;
                    }, obj);
                };
                const extractedLeague = transitionalRow.league ?? get(payload, 'league.name') ?? get(payload, 'leagues[0].name') ?? get(payload, 'league') ?? null;
                const extractedSeason = transitionalRow.season ?? get(payload, 'league.season') ?? get(payload, 'season') ?? null;
                const extractedFetched = transitionalRow.fetched_at ?? transitionalRow.fetchedAt ?? get(payload, 'fetched_at') ?? null;
                setSelected({ ...transitionalRow, league: extractedLeague, season: extractedSeason, fetched_at: extractedFetched } as any);
            }
        } catch (e) {
            console.error('Failed to fetch transitional row for status check', e);
        }
        const alreadyProcessed = transitionalRow?.status === true;
        const verb = isDryRun ? 'run a dry-run of' : 'run the process to apply the first parsed row into application tables';
        if (alreadyProcessed && !isDryRun) {
            if (!forceDryRun) {
                alert('This row was already processed (status = True).');
            }
            return;
        }
        if (!forceDryRun && !confirm(`Confirm: ${verb}?`)) return;
        setRunningLoad(true);
        setLoadResult(null);
        try {
            // Use apply-all-rows for both dry runs and real runs (backend will honor dryRun flag)
            const resp = await fetch(`${API_BASE}/v1/api/transitional/${id}/apply-all-rows`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                // body: JSON.stringify({ sportId: 36, dryRun: isDryRun, ...(Object.keys(effectiveOverrides).length > 0 ? { roundOverrides: effectiveOverrides } : {}) }),
                body: JSON.stringify({ sportId: rows.find((r: any) => r.id === id)?.sport ?? footballSportId ?? 36, dryRun: isDryRun, seasonPhase, ...(Object.keys(effectiveOverrides).length > 0 ? { roundOverrides: effectiveOverrides } : {}) }),
            });
            const j = await resp.json();
            let payload = j?.data ?? j;

            // Background mode: poll until the job completes
            if (payload?.background) {
                let jobDone = false;
                while (!jobDone) {
                    await new Promise<void>((r) => setTimeout(r, 3000));
                    try {
                        const statusResp = await fetch(`${API_BASE}/v1/api/transitional/${id}/apply-status`);
                        const statusJson = await statusResp.json();
                        const statusData = statusJson?.data ?? statusJson;
                        if (statusData?.status === 'done' || statusData?.status === 'error') {
                            jobDone = true;
                            payload = statusData.result ?? statusData;
                            setLoadResult(payload);
                        }
                    } catch {
                        jobDone = true;
                    }
                }
            } else {
                setLoadResult(payload ?? payload?.result ?? j);
            }

            const detailedConflictMessage = payload?.error || payload?.details?.message;
            const isLogicalFailure = payload?.reason === 'round_assignment_conflict' || payload?.applied === 0 && !!detailedConflictMessage;

            if (!forceDryRun) {
                if ((!resp.ok && !j?.background) || isLogicalFailure) {
                    const missingTeams = Array.isArray(payload?.details?.missingTeams)
                        ? ` Missing teams: ${payload.details.missingTeams.map((team: any) => team?.name || team?.id).join(', ')}.`
                        : '';
                    alert(`${isDryRun ? 'Dry run' : 'Apply'} failed: ${detailedConflictMessage || resp.statusText}${missingTeams}`);
                } else {
                    alert(`${isDryRun ? 'Dry run' : 'Apply'} completed — see Last Operation Result for details.`);
                }
            }
            // If this was a real run, persist status=true on the server and update UI
            if (!isDryRun) {
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
                await reloadRows();
                // Clear the parse/review UI but keep selected row to show API metadata
                // setSelected(null); // Keep this to show API Processed metadata
                setParsedColumns(null);
                setParsedRowsData(null);
                setRoundReviewSummary([]);
                setAccumulatedOverrides({});
                setPendingStrays([]);
                setStrayInputs({});
                setPendingApplyId(null);
                setExpandedRoundDetails({});
                setIsSubsequentLoad(false); // Reset for next load
            }
        } catch (e) {
            console.error(e);
            setLoadResult({ error: String(e) });
            if (!forceDryRun) {
                alert(`Operation failed: ${String(e)}`);
            }
            setIsSubsequentLoad(false); // Reset on error
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
        setPendingStrays([]);
        setStrayInputs({});
        setRoundReviewSummary([]);
        setAccumulatedOverrides({});
        setPendingApplyId(null);
        setExpandedRoundDetails({});
        setIsSubsequentLoad(false);
        setPayloadCountryForClubs(null);
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

    const selectedRowMeta = selected?.id != null
        ? rows.find((row: any) => row.id === selected.id) ?? null
        : null;

    const selectedDisplay = selected
        ? {
            ...selectedRowMeta,
            ...selected,
            origin: selected?.origin ?? selectedRowMeta?.origin ?? 'Api-Football',
            league: selected?.league ?? selectedRowMeta?.league ?? '-',
            season: selected?.season ?? selectedRowMeta?.season ?? null,
            fetched_at: selected?.fetched_at ?? selectedRowMeta?.fetched_at ?? null,
            flg_season_same_years: selected?.flg_season_same_years ?? selectedRowMeta?.flg_season_same_years ?? false,
        }
        : null;

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold">ETL - Football</h1>
            </div>

            <section className="mb-6">
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-2">
                    <h2 className="text-lg font-semibold">Available API Loads</h2>
                    <div className="flex flex-wrap items-center gap-2">
                        <label className="inline-flex items-center text-sm mr-2">
                            <input type="checkbox" checked={dryRun} onChange={(e) => setDryRun(e.target.checked)} className="mr-2" />
                            Dry run
                        </label>
                        <label className="inline-flex items-center text-sm gap-2">
                            <span>Season Phase</span>
                            <select
                                value={seasonPhase}
                                onChange={(e) => setSeasonPhase(e.target.value as 'all' | 'postseason' | 'regular-season')}
                                className="rounded border border-gray-300 px-2 py-1 text-sm"
                            >
                                <option value="all">All</option>
                                <option value="postseason">Postseason</option>
                                <option value="regular-season">Regular Season</option>
                            </select>
                        </label>
                        <button onClick={() => reloadRows()} className="px-3 py-2 bg-blue-600 text-white rounded text-sm whitespace-nowrap" style={minBtnWidth ? { minWidth: `${minBtnWidth}px` } : undefined}>Reload</button>
                        <button ref={resetBtnRef} onClick={handleClearResults} className="px-3 py-2 bg-gray-300 text-gray-800 rounded text-sm whitespace-nowrap" style={minBtnWidth ? { minWidth: `${minBtnWidth}px` } : undefined}>Clear</button>
                    </div>
                </div>
                {/* slice rows for pagination */}
                {(() => {
                    // apply client-side sorting
                    const sortedRows = [...rows].sort((a: any, b: any) => {
                        const key = sortBy;
                        const va = a?.[key];
                        const vb = b?.[key];
                        // handle dates
                        if (key === 'fetched_at') {
                            const da = va ? new Date(va).getTime() : 0;
                            const db = vb ? new Date(vb).getTime() : 0;
                            return sortOrder === 'asc' ? da - db : db - da;
                        }
                        // handle strings and numbers
                        if (va == null && vb == null) return 0;
                        if (va == null) return sortOrder === 'asc' ? -1 : 1;
                        if (vb == null) return sortOrder === 'asc' ? 1 : -1;
                        const sa = String(va).toLowerCase();
                        const sb = String(vb).toLowerCase();
                        if (sa < sb) return sortOrder === 'asc' ? -1 : 1;
                        if (sa > sb) return sortOrder === 'asc' ? 1 : -1;
                        return 0;
                    });
                    const total = sortedRows.length;
                    const totalPages = Math.max(1, Math.ceil(total / limit));
                    const displayRows = sortedRows.slice((page - 1) * limit, page * limit);
                    return (
                        <>
                            <DataTable
                                columns={[
                                    { header: 'Origin', accessor: (r: any) => r.origin ?? 'Api-Football', sortKey: 'origin', sortable: true },
                                    { header: 'League', accessor: (r: any) => r.league ?? '-' , width: '240px', sortKey: 'league', sortable: true },
                                    { header: 'Season', accessor: (r: any) => (r?.season ? `${r.season}/${Number(r.season) + (r.flg_season_same_years ? 0 : 1)}` : '-'), width: '140px', sortKey: 'season', sortable: true },
                                    { header: 'Source', accessor: (r: any) => <div className="truncate max-w-x10">{r.source_url ?? '-'}</div>, sortKey: 'source_url', sortable: true },
                                    { header: 'Fetched At', accessor: (r: any) => formatDateTimeMinute(r.fetched_at), sortKey: 'fetched_at', sortable: true },
                                    { header: 'Status', accessor: (r: any) => (r.status ? 'Loaded' : 'Not Loaded'), sortKey: 'status', sortable: true },
                                    {
                                        header: 'Actions',
                                        accessor: (r: any) => (
                                            <div className="flex items-center gap-3 justify-end">
                                                <button onClick={() => handleToFrontendTable(r.id)} className="text-blue-600 hover:text-blue-900" title="Table/Json View">
                                                    <TableIcon size={18} />
                                                </button>
                                                <button onClick={() => handleToDbTables(r.id, undefined, r)} disabled={runningLoad} className={`text-green-600 hover:text-green-900 ${runningLoad ? 'opacity-50 cursor-not-allowed' : ''}`} title="Transform & Load">
                                                    <Database size={18} />
                                                </button>
                                                <button
                                                    onClick={async () => {
                                                        if (!confirm('Repair division scores from payload linescores? This will delete & recreate match_divisions for this row.')) return;
                                                        setRunningLoad(true);
                                                        try {
                                                            const rowSportId = r.sport ?? footballSportId ?? 36;
                                                            const resp = await fetch(`${API_BASE}/v1/api/transitional/${r.id}/repair-divisions`, {
                                                                method: 'POST',
                                                                headers: { 'Content-Type': 'application/json' },
                                                                body: JSON.stringify({ sportId: rowSportId }),
                                                            });
                                                            const j = await resp.json();
                                                            alert(`Repair done: ${JSON.stringify(j)}`);
                                                        } catch (e) {
                                                            alert(`Repair failed: ${String(e)}`);
                                                        } finally {
                                                            setRunningLoad(false);
                                                        }
                                                    }}
                                                    disabled={runningLoad}
                                                    className={`text-blue-600 hover:text-blue-900 ${runningLoad ? 'opacity-50 cursor-not-allowed' : ''}`}
                                                    title="Repair division scores from payload"
                                                >
                                                    <RefreshCw size={18} />
                                                </button>
                                                <button onClick={() => handleDeleteRow(r.id)} className="text-red-600 hover:text-red-900" title="Delete">
                                                    <Trash2 size={18} />
                                                </button>
                                            </div>
                                        ),
                                    },
                                ]}
                                data={displayRows}
                                isLoading={loadingRows}
                                emptyMessage="No API loads found."
                                sortBy={sortBy}
                                sortOrder={sortOrder}
                                onSort={(key: string) => {
                                    if (sortBy === key) {
                                        setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
                                    } else {
                                        setSortBy(key);
                                        setSortOrder('asc');
                                    }
                                    setPage(1);
                                }}
                            />

                {/* Pagination Controls */}
                {total > limit && (
                    <div className="mt-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white px-4 py-3 rounded-lg shadow">
                        <div className="text-sm text-gray-700">
                            Showing <span className="font-medium">{(page - 1) * limit + 1}</span> to <span className="font-medium">{Math.min(page * limit, total)}</span> of <span className="font-medium">{total}</span> results
                        </div>
                        <div className="flex flex-wrap gap-2 items-center">
                            <button
                                onClick={() => { setPage(1); }}
                                disabled={page === 1}
                                className="px-3 py-1 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                First
                            </button>
                            <button
                                onClick={() => setPage(p => Math.max(1, p - 1))}
                                disabled={page === 1}
                                className="px-3 py-1 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                Previous
                            </button>
                            <div className="flex items-center gap-2">
                                <span className="text-sm text-gray-700">Page</span>
                                <input
                                    type="number"
                                    min="1"
                                    max={totalPages}
                                    value={pageInput}
                                    onChange={(e) => setPageInput(e.target.value)}
                                    onBlur={() => {
                                        const pageNum = parseInt(pageInput);
                                        if (!isNaN(pageNum) && pageNum >= 1 && pageNum <= totalPages) {
                                            setPage(pageNum);
                                        } else {
                                            setPageInput(page.toString());
                                        }
                                    }}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                            const pageNum = parseInt(pageInput);
                                            if (!isNaN(pageNum) && pageNum >= 1 && pageNum <= totalPages) {
                                                setPage(pageNum);
                                            } else {
                                                setPageInput(page.toString());
                                            }
                                        }
                                    }}
                                    className="w-16 px-2 py-1 border border-gray-300 rounded-md text-sm text-center"
                                />
                                <span className="text-sm text-gray-700">of {totalPages}</span>
                            </div>
                            <button
                                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                                disabled={page === totalPages}
                                className="px-3 py-1 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                Next
                            </button>
                            <button
                                onClick={() => setPage(totalPages)}
                                disabled={page === totalPages}
                                className="px-3 py-1 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                Last
                            </button>
                        </div>
                    </div>
                )}
                        </>
                    );
                })()}
            </section>

            {/* Operation result feedback */}
            {loadResult && (
                <div className="mb-6">
                    <div>
                        <h3 className="font-medium mb-2">API Processed</h3>
                        <div className="mb-4">
                            <div className="flex flex-wrap items-center gap-4 bg-gray-50 border p-3 rounded text-sm">
                                <div className="flex items-baseline gap-3">
                                    <div className="text-s text-gray-500">Origin:</div>
                                    <div className="text-sm text-gray-800">{selectedDisplay?.origin ?? 'Api-Football'}</div>
                                </div>

                                <div className="flex items-baseline ml-4 gap-3">
                                    <div className="text-s text-gray-500">League:</div>
                                    <div className="text-sm text-gray-800">{selectedDisplay?.league ?? '-'}</div>
                                </div>

                                <div className="flex items-baseline ml-4 gap-3">
                                    <div className="text-s text-gray-500">Season:</div>
                                    <div className="text-sm text-gray-800">{selectedDisplay?.season ? `${selectedDisplay.season}/${Number(selectedDisplay.season) + (selectedDisplay.flg_season_same_years ? 0 : 1)}` : '-'}</div>
                                </div>

                                <div className="flex items-baseline ml-4 gap-3">
                                    <div className="text-s text-gray-500">Fetched:</div>
                                    <div className="text-sm text-gray-800">{formatDateTimeMinute(selectedDisplay?.fetched_at)}</div>
                                </div>
                            </div>
                        </div>
                    </div>
                    <h3 className="font-medium mb-2">Operation Result</h3>
                    <div className="mb-4">
                    
                    <div className="mb-4 p-4 border rounded bg-blue-50">
                        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
                            <div>
                                <div className="text-gray-600">Matches Created</div>
                                <div className="text-1xl text-blue-600">{loadResult.createdMatches ?? 0}</div>
                            </div>
                            <div>
                                <div className="text-gray-600">Standings Created</div>
                                <div className="text-1xl text-blue-600">{loadResult.createdStandings ?? 0}</div>
                            </div>
                            <div>
                                <div className="text-gray-600">Clubs Created</div>
                                <div className="text-1xl text-blue-600">{loadResult.createdClubs ?? 0}</div>
                            </div>
                            <div>
                                <div className="text-gray-600">Stadiums Created</div>
                                <div className="text-1xl text-blue-600">{loadResult.createdStadiums ?? 0}</div>
                            </div>
                            <div>
                                <div className="text-gray-600">{loadResult.isDateBased ? 'Days Created' : 'Rounds Created'}</div>
                                <div className="text-1xl text-blue-600">{loadResult.isDateBased ? (loadResult.createdDays ?? 0) : (loadResult.createdRounds ?? 0)}</div>
                            </div>
                        </div>
                    </div>
                    </div>
                    {loadResult.clubsIncluded && loadResult.clubsIncluded.length > 0 && (
                        <div className="mb-4 p-4 border rounded bg-gray-50">
                            <h4 className="font-semibold text-lg mb-2">Clubs Included ({loadResult.clubsIncluded.length})</h4>
                            <ul className="list-disc list-inside text-sm text-gray-700">
                                {loadResult.clubsIncluded.map((clubName: string, idx: number) => (
                                    <li key={idx}>{clubName}</li>
                                ))}
                            </ul>
                        </div>
                    )}
                    {loadResult.stadiumsCreated && loadResult.stadiumsCreated.length > 0 && (
                        <div className="mb-4 p-4 border rounded bg-gray-50">
                            <h4 className="font-semibold text-lg mb-2">Stadiums Created ({loadResult.stadiumsCreated.length})</h4>
                            <ul className="list-disc list-inside text-sm text-gray-700">
                                {loadResult.stadiumsCreated.map((stadium: any) => (
                                    <li key={stadium.id}>
                                        {stadium.name} (ID: {stadium.id})
                                        {stadium.clubName && <span className="text-gray-600 ml-2">— {stadium.clubName}</span>}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}
                    <pre className="bg-gray-50 border p-3 rounded text-sm max-h-40 overflow-auto">{JSON.stringify((() => {
                        const { stadiumsCreated, clubsIncluded, ...rest } = loadResult?.data ?? loadResult ?? {};
                        return rest;
                    })(), null, 2)}</pre>
                </div>
            )}

            <section>
                {/* {(selected || loadingRow) && (
                <div className="flex justify-between items-center mb-2">
                    <h2 className="text-lg font-semibold">Result</h2>
                </div>
                )} */}
                {loadingRow && <div>Loading selected row...</div>}
                {selected && (
                    <div>
                        <div className="mb-4">
                            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 w-full">
                                {/* Left: To DB + Dry run + Clear */}
                                <div className="flex items-center gap-2 order-1 md:order-1">
                                    <button disabled={runningLoad} onClick={() => selected && handleToDbTables(selected.id)} className={`px-3 py-2 rounded text-sm ${runningLoad ? 'bg-gray-400 text-gray-800' : 'bg-green-600 text-white'}`} style={minBtnWidth ? { minWidth: `${minBtnWidth}px` } : undefined}>
                                        {runningLoad ? 'Running...' : (dryRun ? 'Transform & Load (Dry run)' : 'Transform & Load')}
                                    </button>
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
                        {selected.parseError === 'needs_round_review' && pendingStrays.length > 0 && (
                            <div data-round-review-section className="mb-4 rounded border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950">
                                <div className="mb-2 text-base font-semibold">Round review required</div>
                                <p className="mb-4 max-w-5xl">
                                    Automatic import stopped because the round distribution is ambiguous. First review the round summary below. Each round can expand to show the games already assigned to it. Then fill only the games that are still unassigned and process again.
                                </p>

                                {roundReviewSummary.length > 0 && (
                                    <div className="mb-4 overflow-auto rounded border bg-white">
                                        <table className="min-w-full table-auto border-collapse text-xs sm:text-sm">
                                            <thead className="bg-amber-100">
                                                <tr>
                                                    <th className="border-b px-3 py-2 text-left">Round</th>
                                                    <th className="border-b px-3 py-2 text-left">Date Range</th>
                                                    <th className="border-b px-3 py-2 text-left">Assigned</th>
                                                    <th className="border-b px-3 py-2 text-left">Expected</th>
                                                    <th className="border-b px-3 py-2 text-left">Missing</th>
                                                    <th className="border-b px-3 py-2 text-left">Status</th>
                                                    <th className="border-b px-3 py-2 text-left">Games</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {roundReviewSummary.map((summary: any) => {
                                                    const roundMatches = pendingStrays.filter((match: any) => Number(match.assignedRound) === Number(summary.round));
                                                    const isExpanded = !!expandedRoundDetails[String(summary.round)];
                                                    return (
                                                        <Fragment key={summary.round}>
                                                            <tr key={summary.round} className="border-t bg-white">
                                                                <td className="px-3 py-2">{summary.round}</td>
                                                                <td className="px-3 py-2">{summary.dateRange ?? '-'}</td>
                                                                <td className="px-3 py-2">{summary.assignedMatches}</td>
                                                                <td className="px-3 py-2">{summary.expectedMatches ?? '-'}</td>
                                                                <td className="px-3 py-2">{summary.missingMatches ?? '-'}</td>
                                                                <td className="px-3 py-2 capitalize">{summary.status}</td>
                                                                <td className="px-3 py-2">
                                                                    {roundMatches.length > 0 ? (
                                                                        <button
                                                                            type="button"
                                                                            className="rounded border border-amber-300 px-2 py-1 text-xs hover:bg-amber-50"
                                                                            onClick={() => setExpandedRoundDetails((prev) => ({
                                                                                ...prev,
                                                                                [String(summary.round)]: !prev[String(summary.round)],
                                                                            }))}
                                                                        >
                                                                            {isExpanded ? 'Hide games' : 'Show games'}
                                                                        </button>
                                                                    ) : (
                                                                        '-'
                                                                    )}
                                                                </td>
                                                            </tr>
                                                            {isExpanded && roundMatches.map((match: any) => {
                                                                const scoreLabel = match.isCompleted && match.homeScore != null && match.awayScore != null
                                                                    ? `${match.homeScore}-${match.awayScore}`
                                                                    : '-';
                                                                return (
                                                                    <tr key={`${summary.round}-${match.id}`} className="border-t bg-amber-50/40">
                                                                        <td className="px-3 py-2">
                                                                            <input
                                                                                type="number"
                                                                                min={1}
                                                                                className="w-20 rounded border border-amber-300 bg-white px-2 py-1"
                                                                                value={strayInputs[match.id] ?? (match.assignedRound != null ? String(match.assignedRound) : '')}
                                                                                onChange={(e) => setStrayInputs((prev) => ({ ...prev, [match.id]: e.target.value }))}
                                                                            />
                                                                        </td>
                                                                        <td className="px-3 py-2">{formatLeagueDate(match.date)}</td>
                                                                        <td className="px-3 py-2" colSpan={2}>{match.homeShortName ?? match.homeTeam} vs {match.awayShortName ?? match.awayTeam}</td>
                                                                        <td className="px-3 py-2">{match.venueCity ?? '-'}</td>
                                                                        <td className="px-3 py-2">{scoreLabel}</td>
                                                                        <td className="px-3 py-2" colSpan={2}>{match.statusShort ?? match.statusLong ?? '-'}</td>
                                                                    </tr>
                                                                );
                                                            })}
                                                        </Fragment>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    </div>
                                )}

                                <div className="mb-4 overflow-auto rounded border bg-white">
                                    <div className="border-b bg-amber-100 px-3 py-2 font-medium">
                                        Games to assign/review ({pendingStrays.filter((match: any) => match.needsReview).length})
                                    </div>
                                    <table className="min-w-full table-auto border-collapse text-xs sm:text-sm">
                                        <thead className="bg-amber-50">
                                            <tr>
                                                <th className="border-b px-3 py-2 text-left">Round</th>
                                                <th className="border-b px-3 py-2 text-left">Date</th>
                                                <th className="border-b px-3 py-2 text-left">Match</th>
                                                <th className="border-b px-3 py-2 text-left">Venue</th>
                                                <th className="border-b px-3 py-2 text-left">City</th>
                                                <th className="border-b px-3 py-2 text-left">Score</th>
                                                <th className="border-b px-3 py-2 text-left">Status</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {pendingStrays.filter((match: any) => match.needsReview).map((match: any) => {
                                                const dateLabel = formatLeagueDate(match.date);
                                                const scoreLabel = match.isCompleted && match.homeScore != null && match.awayScore != null
                                                    ? `${match.homeScore}-${match.awayScore}`
                                                    : '-';
                                                return (
                                                    <tr key={`manual-${match.id}`} className={`border-t ${match.assignedRound == null ? 'bg-white' : 'bg-amber-50/40'}`}>
                                                        <td className="px-3 py-2 align-top">
                                                            <input
                                                                type="number"
                                                                min={1}
                                                                className="w-20 rounded border border-amber-300 bg-white px-2 py-1"
                                                                value={strayInputs[match.id] ?? ''}
                                                                onChange={(e) => setStrayInputs((prev) => ({ ...prev, [match.id]: e.target.value }))}
                                                            />
                                                        </td>
                                                        <td className="px-3 py-2 align-top">{dateLabel}</td>
                                                        <td className="px-3 py-2 align-top">{match.homeShortName ?? match.homeTeam} vs {match.awayShortName ?? match.awayTeam}</td>
                                                        <td className="px-3 py-2 align-top">{match.venueName ?? '-'}</td>
                                                        <td className="px-3 py-2 align-top">{match.venueCity ?? '-'}</td>
                                                        <td className="px-3 py-2 align-top">{scoreLabel}</td>
                                                        <td className="px-3 py-2 align-top">{match.statusShort ?? match.statusLong ?? '-'}</td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>

                                <button
                                    className="mt-1 rounded bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                                    disabled={Object.keys(collectManualRoundOverrides(pendingStrays, strayInputs, accumulatedOverrides)).length === 0}
                                    onClick={async () => {
                                        const merged = collectManualRoundOverrides(pendingStrays, strayInputs, accumulatedOverrides);
                                        setAccumulatedOverrides(merged);
                                        try {
                                            await fetch(`${API_BASE}/v1/api/transitional/${selected.id}/round-review`, {
                                                method: 'PATCH',
                                                headers: { 'Content-Type': 'application/json' },
                                                body: JSON.stringify({ overrides: merged }),
                                            });
                                        } catch (e) {
                                            console.warn('[ETL] failed to save round review draft', e);
                                        }
                                        if (pendingApplyId !== null) {
                                            const applyId = pendingApplyId;
                                            setPendingApplyId(null);
                                            handleToDbTables(applyId, merged);
                                        } else {
                                            loadRow(selected.id, merged);
                                        }
                                    }}
                                >
                                    {pendingApplyId !== null ? 'Process current assignments and apply' : 'Process current assignments'}
                                </button>
                            </div>
                        )}
                        {(countryForReview || leagueForReview || clubsForReview.length > 0 || stadiumsForReview.length > 0) && (
                            <div data-entity-review-section className="mb-4 rounded border border-purple-300 bg-purple-50 p-4 text-sm text-purple-950">
                                <div className="mb-2 text-base font-semibold">Entity Review Required</div>
                                <p className="mb-4 max-w-5xl">
                                    {countryForReview
                                        ? 'The country for this data could not be determined from the payload. Please select the country this league belongs to.'
                                        : leagueForReview 
                                        ? 'The league in this data was not found in the database. Please select an existing league to map this data to.'
                                        : 'Some clubs or stadiums in this data are not found in the database. You can choose to map them to existing entities or create new ones. Review each item and make your selection below.'
                                    }
                                </p>

                                {countryForReview && (
                                    <div className="mb-4 overflow-auto rounded border bg-white">
                                        <div className="border-b bg-purple-100 px-3 py-2 font-medium">
                                            Country Mapping Required
                                        </div>
                                        <div className="p-3">
                                            <div className="mb-2 font-medium text-purple-900">
                                                The payload has no country information
                                            </div>
                                            <div className="mb-3 text-xs text-gray-600">
                                                Select the country this league belongs to:
                                            </div>
                                            <div className="flex flex-wrap items-center gap-4 bg-gray-50 border p-3 rounded text-sm">
                                                <div className="flex items-baseline gap-3">
                                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                                        Select Country:
                                                    </label>
                                                </div>
                                                <div className="flex items-baseline gap-3">
                                                    <select
                                                        className="w-full rounded border border-purple-300 bg-white px-3 py-2 text-sm focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-200"
                                                        value={countryMapping === undefined ? '' : (countryMapping === null ? '' : String(countryMapping))}
                                                        onChange={(e) => {
                                                            const val = e.target.value;
                                                            if (val === '') setCountryMapping(undefined);
                                                            else setCountryMapping(Number(val));
                                                        }}
                                                    >
                                                        <option value="">-- Select a country --</option>
                                                        {countryForReview.suggestions.map((suggestion: any) => (
                                                            <option key={suggestion.id} value={suggestion.id}>
                                                                {suggestion.name}{suggestion.code ? ` (${suggestion.code})` : ''}
                                                            </option>
                                                        ))}
                                                    </select>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {leagueForReview && (
                                    <div className="mb-4 overflow-auto rounded border bg-white">
                                        <div className="border-b bg-purple-100 px-3 py-2 font-medium">
                                            League Mapping Required
                                        </div>
                                        <div className="p-3">
                                            <div className="mb-2 font-medium text-purple-900">
                                                Incoming League: {leagueForReview.incomingName}
                                            </div>
                                            <div className="mb-3 text-xs text-gray-600">
                                                Select an existing league to map to, or create a new league:
                                            </div>
                                            <div className="flex flex-wrap items-center gap-4 bg-gray-50 border p-3 rounded text-sm">
                                                <div className="flex items-baseline gap-3">
                                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                                        Select Existing League:
                                                    </label>
                                                </div>
                                                <div className="flex items-baseline gap-3">
                                                    <select
                                                        className="w-full rounded border border-purple-300 bg-white px-3 py-2 text-sm focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-200"
                                                        value={leagueMapping === undefined ? '' : (leagueMapping === null ? '' : String(leagueMapping))}
                                                        onChange={(e) => {
                                                            const val = e.target.value;
                                                            if (val === '') setLeagueMapping(undefined);
                                                            else setLeagueMapping(Number(val));
                                                        }}
                                                    >
                                                        <option value="">-- Select a league --</option>
                                                        {leagueForReview.suggestions.map((suggestion: any) => (
                                                            <option key={suggestion.id} value={suggestion.id}>
                                                                {suggestion.originalName}
                                                                {suggestion.secondaryName && ` (${suggestion.secondaryName})`}
                                                                {' — ID: '}
                                                                {suggestion.id}
                                                            </option>
                                                        ))}
                                                    </select>
                                                </div>
                                                <div className="flex items-baseline gap-3">
                                                    <span className="ml-3">-</span><span>OR</span><span className="mr-3">-</span>
                                                </div>
                                                <div className="flex items-baseline">
                                                    <button
                                                        type="button"
                                                        className={`w-full rounded px-4 py-2 text-sm font-medium transition-colors ${
                                                            leagueMapping === null
                                                                ? 'bg-green-600 text-white'
                                                                : 'bg-green-50 text-green-700 border border-green-300 hover:bg-green-100'
                                                        }`}
                                                        onClick={() => setLeagueMapping(null)}
                                                    >
                                                        {leagueMapping === null ? '✓ Creating New League' : '✨ Create New League'}
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {clubsForReview.length > 0 && (
                                    <div className="mb-4 overflow-auto rounded border bg-white">
                                        <div className="border-b bg-purple-100 px-3 py-2 font-medium">
                                            Clubs for review ({clubsForReview.length})
                                        </div>
                                        <div className="p-3 grid grid-cols-1 lg:grid-cols-1 gap-4">
                                            {clubsForReview.map((club: any) => {
                                                const selectedCountryId = clubCountrySelections[club.name];
                                                const clubsList = selectedCountryId && clubsByCountry[selectedCountryId] ? clubsByCountry[selectedCountryId] : [];
                                                return (
                                                <div key={club.name} className="border border-gray-300 rounded bg-white p-3 shadow-sm min-w-0">
                                                    <div className="mb-2 font-medium text-purple-900">
                                                        Incoming: {club.name}
                                                    </div>
                                                    <div className="text-xs text-gray-600 mb-2">
                                                        {clubsList.length > 0
                                                            ? `${clubsList.length} clubs in selected country - select one, create new, or ignore:`
                                                            : 'No clubs found for this country - you can create a new one or ignore:'}
                                                    </div>
                                                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                                                        <select
                                                            className="w-full md:w-56 border rounded px-2 py-1"
                                                            value={selectedCountryId ?? ''}
                                                            onChange={(e) => {
                                                                const val = e.target.value ? Number(e.target.value) : undefined;
                                                                setClubCountrySelections((prev) => ({ ...prev, [club.name]: val }));
                                                                setClubMappings((prev) => ({
                                                                    ...prev,
                                                                    [club.name]: prev[club.name] === null || prev[club.name] === -1 ? prev[club.name] : undefined,
                                                                }));
                                                            }}
                                                        >
                                                            <option value="">-- Select country --</option>
                                                            {allCountries.map((country: any) => (
                                                                <option key={country.id} value={country.id}>{country.name}</option>
                                                            ))}
                                                        </select>
                                                        <select
                                                            className="w-full md:w-72 border rounded px-2 py-1"
                                                            value={clubMappings[club.name] === null || clubMappings[club.name] === -1 ? '' : (clubMappings[club.name] ?? '')}
                                                            onChange={(e) => {
                                                                const val = e.target.value;
                                                                setClubMappings((prev) => ({
                                                                    ...prev,
                                                                    [club.name]: val === '' ? undefined : Number(val),
                                                                }));
                                                            }}
                                                            disabled={!selectedCountryId}
                                                        >
                                                            <option value="">-- Select a club --</option>
                                                            {clubsList.map((suggestion: any) => (
                                                                <option key={suggestion.id} value={suggestion.id}>
                                                                    {suggestion.name} (ID: {suggestion.id})
                                                                </option>
                                                            ))}
                                                        </select>
                                                        <div className="hidden sm:flex items-center gap-1 flex-shrink-0 text-gray-400">
                                                            <span>-</span><span>OR</span><span>-</span>
                                                        </div>
                                                        <button
                                                            type="button"
                                                            className={`sm:whitespace-nowrap rounded px-3 py-2 text-sm font-medium text-center ${
                                                                clubMappings[club.name] === null
                                                                    ? 'bg-green-600 text-white'
                                                                    : 'bg-green-50 text-green-700 border border-green-300 hover:bg-green-100'
                                                            }`}
                                                            onClick={() => setClubMappings(prev => ({ ...prev, [club.name]: null }))}
                                                        >
                                                            {clubMappings[club.name] === null ? '✓ Creating New Club' : '✨ Create New Club'}
                                                        </button>
                                                        <div className="hidden sm:flex items-center gap-1 flex-shrink-0 text-gray-400">
                                                            <span>-</span><span>OR</span><span>-</span>
                                                        </div>
                                                        <button
                                                            type="button"
                                                            className={`sm:whitespace-nowrap rounded px-3 py-2 text-sm font-medium text-center ${
                                                                clubMappings[club.name] === -1
                                                                    ? 'bg-red-600 text-white'
                                                                    : 'bg-red-50 text-red-700 border border-red-300 hover:bg-red-100'
                                                            }`}
                                                            onClick={() => setClubMappings(prev => ({ 
                                                                ...prev, 
                                                                [club.name]: (prev[club.name] as any) === -1 ? undefined : -1 
                                                            }))}
                                                        >
                                                            {clubMappings[club.name] === -1 ? '⊘ Ignoring (undo)' : '⊘ Ignore team'}
                                                        </button>
                                                    </div>
                                                </div>
                                            )})}
                                        </div>
                                    </div>
                                )}

                                {stadiumsForReview.length > 0 && (
                                    <div className="mb-4 overflow-auto rounded border bg-white">
                                        <div className="border-b bg-purple-100 px-3 py-2 font-medium">
                                            Stadiums for review ({stadiumsForReview.length})
                                        </div>
                                        <div className="p-3 grid grid-cols-1 lg:grid-cols-2 gap-4">
                                            {stadiumsForReview.map((stadium: any) => (
                                                <div key={stadium.name} className="border border-gray-300 rounded bg-white p-3 shadow-sm min-w-0">
                                                    <div className="mb-2 font-medium text-purple-900">
                                                        Incoming: {stadium.name} {stadium.city ? `(${stadium.city})` : ''}
                                                    </div>
                                                    <div className="text-xs text-gray-600 mb-2">
                                                        {stadium.suggestions.length > 0 
                                                            ? `${stadium.suggestions.length} stadiums from country - select one or create new:`
                                                            : 'No stadiums found in country - you can create a new one:'}
                                                    </div>
                                                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                                                        {stadium.suggestions.length > 0 && (
                                                            <select
                                                                className="flex-1 min-w-0 rounded border border-gray-300 p-2 text-sm"
                                                                value={stadiumMappings[stadium.name] === null ? '' : (stadiumMappings[stadium.name] || '')}
                                                                onChange={(e) => {
                                                                    const val = e.target.value;
                                                                    setStadiumMappings(prev => ({ 
                                                                        ...prev, 
                                                                        [stadium.name]: val === '' ? undefined : parseInt(val) 
                                                                    }));
                                                                }}
                                                            >
                                                                <option value="">-- Select a stadium --</option>
                                                                {stadium.suggestions.map((suggestion: any) => (
                                                                    <option key={suggestion.id} value={suggestion.id}>
                                                                        {suggestion.name} - {suggestion.city || 'Unknown'} (Cap: {suggestion.capacity || 'N/A'}, ID: {suggestion.id})
                                                                    </option>
                                                                ))}
                                                            </select>
                                                        )}
                                                        <div className="hidden sm:flex items-center gap-1 flex-shrink-0 text-gray-400">
                                                            <span>-</span><span>OR</span><span>-</span>
                                                        </div>
                                                        <button
                                                            type="button"
                                                            className={`sm:whitespace-nowrap rounded px-3 py-2 text-sm font-medium text-center ${
                                                                stadiumMappings[stadium.name] === null
                                                                    ? 'bg-green-600 text-white'
                                                                    : 'bg-green-50 text-green-700 border border-green-300 hover:bg-green-100'
                                                            }`}
                                                            onClick={() => setStadiumMappings(prev => ({ ...prev, [stadium.name]: null }))}
                                                        >
                                                            {stadiumMappings[stadium.name] === null ? '✓ Creating New Stadium' : '✨ Create New Stadium'}
                                                        </button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                <button
                                    className="mt-1 rounded bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                                    disabled={
                                        (countryForReview && countryMapping === undefined) ||
                                        (leagueForReview && leagueMapping === undefined) ||
                                        clubsForReview.some((club: any) => clubMappings[club.name] === undefined) ||
                                        stadiumsForReview.some((stadium: any) => stadiumMappings[stadium.name] === undefined)
                                    }
                                    onClick={async () => {
                                        try {
                                            const response = await fetch(`${API_BASE}/v1/api/transitional/${selected.id}/entity-review`, {
                                                method: 'PATCH',
                                                headers: { 'Content-Type': 'application/json' },
                                                body: JSON.stringify({ 
                                                    countryMapping: countryMapping === undefined ? null : countryMapping,
                                                    leagueMapping: leagueMapping === undefined ? null : leagueMapping,
                                                    clubMappings, 
                                                    stadiumMappings 
                                                }),
                                            });
                                            if (!response.ok) {
                                                const errBody = await response.text();
                                                alert(`Failed to save entity mappings (HTTP ${response.status}): ${errBody}`);
                                                return;
                                            }
                                            await response.json();
                                        } catch (e) {
                                            alert('Failed to save entity mappings. Check console for details.');
                                            return;
                                        }
                                        
                                        // Track what step we just completed so the re-check knows what to show next.
                                        const hasClubsOrStadiums = clubsForReview.length > 0 || stadiumsForReview.length > 0;
                                        const wasShowingCountryOnly = !!countryForReview && !leagueForReview && !hasClubsOrStadiums;
                                        const wasShowingLeagueOnly  = !!leagueForReview && !hasClubsOrStadiums;
                                        
                                        if (pendingEntityReviewApplyId !== null) {
                                            const applyId = pendingEntityReviewApplyId;
                                            
                                            // Re-check only when we just handled a single step (country-only or league-only).
                                            // Once clubs/stadiums are shown we proceed directly.
                                            if (wasShowingCountryOnly || wasShowingLeagueOnly) {
                                                // Clear the step we just completed
                                                setCountryForReview(null);
                                                setCountryMapping(undefined);
                                                setLeagueForReview(null);
                                                setLeagueMapping(undefined);
                                                
                                                try {
                                                    // const entityCheckResp = await fetch(`${API_BASE}/v1/api/transitional/${applyId}/entity-suggestions?sportId=36`);
                                                    const entityParams = new URLSearchParams({
                                                        sportId: String(rows.find((r: any) => r.id === applyId)?.sport ?? footballSportId ?? 36),
                                                        seasonPhase,
                                                    });
                                                    const entityCheckResp = await fetch(`${API_BASE}/v1/api/transitional/${applyId}/entity-suggestions?${entityParams.toString()}`);
                                                    const entityCheckJson = await entityCheckResp.json();
                                                    const entityData = entityCheckJson?.data ?? entityCheckJson;
                                                    
                                                    if (entityData?.needsReview) {
                                                        if (wasShowingCountryOnly) {
                                                            // After country: show league or clubs/stadiums — NOT country again
                                                            if (entityData.league || entityData.clubs?.length > 0 || entityData.stadiums?.length > 0) {
                                                                    setLeagueForReview(entityData.league || null);
                                                                    setPayloadCountryForClubs(entityData.payloadCountry || null);
                                                                    setClubsForReview(entityData.clubs || []);
                                                                    setStadiumsForReview(entityData.stadiums || []);
                                                                setClubMappings(Object.fromEntries((entityData.clubs || []).map((club: any) => [club.name, undefined])));
                                                                setClubCountrySelections({});
                                                                setStadiumMappings(Object.fromEntries((entityData.stadiums || []).map((stadium: any) => [stadium.name, undefined])));
                                                                return;
                                                            }
                                                        } else if (wasShowingLeagueOnly) {
                                                            // After league: show ONLY clubs/stadiums — NOT league or country again
                                                            if (entityData.clubs?.length > 0 || entityData.stadiums?.length > 0) {
                                                                    setPayloadCountryForClubs(entityData.payloadCountry || null);
                                                                    setClubsForReview(entityData.clubs || []);
                                                                    setStadiumsForReview(entityData.stadiums || []);
                                                                    setClubMappings(Object.fromEntries((entityData.clubs || []).map((club: any) => [club.name, undefined])));
                                                                    setClubCountrySelections({});
                                                                    setStadiumMappings(Object.fromEntries((entityData.stadiums || []).map((stadium: any) => [stadium.name, undefined])));
                                                                return;
                                                            }
                                                        }
                                                    }
                                                } catch (e) {
                                                    // console.warn('[ETL] Second entity check failed:', e);
                                                }
                                            }
                                            
                                            // Clear state and proceed to load
                                            setPendingEntityReviewApplyId(null);
                                            setCountryForReview(null);
                                            setCountryMapping(undefined);
                                            setLeagueForReview(null);
                                            setLeagueMapping(undefined);
                                            setClubsForReview([]);
                                            setStadiumsForReview([]);
                                            setClubCountrySelections({});
                                            setClubMappings({});
                                            setStadiumMappings({});
                                            setPayloadCountryForClubs(null);
                                            // Pass skipEntityReview=true to skip checks since we just completed entity review
                                            handleToDbTables(applyId, undefined, undefined, false, true);
                                        }
                                    }}
                                >
                                    {pendingEntityReviewApplyId !== null 
                                        ? ((countryForReview || leagueForReview) && clubsForReview.length === 0 && stadiumsForReview.length === 0
                                            ? 'Save & continue'
                                            : 'Apply mappings and proceed')
                                        : 'Save mappings'}
                                </button>
                            </div>
                        )}
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
                                            // Prefer server-parsed preview when available (parsedRowsData / parsedColumns).
                                            let cols: string[] | null = parsedColumns && parsedColumns.length ? parsedColumns : null;
                                            let rows: any[] | null = parsedRowsData && parsedRowsData.length ? parsedRowsData : null;
                                            if (!cols || !rows) {
                                                const tbl = deriveTable(selected);
                                                cols = cols || tbl.combined;
                                                rows = rows || tbl.rows;
                                            }

                                            // Hide JSON-stringified columns (arrays/objects) for table clarity
                                            const isJsonString = (val: any) => {
                                                if (val == null) return false;
                                                if (typeof val !== 'string') return false;
                                                const s = val.trim();
                                                if (!s) return false;
                                                if ((s.startsWith('{') && s.endsWith('}')) || (s.startsWith('[') && s.endsWith(']'))) {
                                                    try { JSON.parse(s); return true; } catch { return false; }
                                                }
                                                return false;
                                            };

                                            // Prefer `league.round` (or `round`) as first column when present
                                            let visibleCols = cols.filter((c) => {
                                                // keep column if at least one row has a non-json displayable value
                                                const sampleVal = rows.find((r) => r[c] !== undefined && r[c] !== null)?.[c];
                                                return !isJsonString(sampleVal);
                                            });
                                            const preferRoundKeys = ['league.round', 'round'];
                                            const foundRoundKey = preferRoundKeys.find((k) => visibleCols.includes(k));
                                            if (foundRoundKey) {
                                                visibleCols = [foundRoundKey, ...visibleCols.filter((c) => c !== foundRoundKey)];
                                            }

                                            return (
                                                <table className="min-w-max table-fixed border-collapse whitespace-nowrap">
                                                    <thead className="bg-gray-100">
                                                        <tr>
                                                            {visibleCols.map((c) => (
                                                                <th key={c} className="p-2 text-left text-sm border-b">{c}</th>
                                                            ))}
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {rows.map((r, i) => (
                                                            <tr key={i} className="odd:bg-white even:bg-gray-50 border-t">
                                                                {visibleCols.map((c) => (
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
                                {selected.parseError ? (
                                    <div>
                                        {selected.parseError === 'needs_round_review' && pendingStrays.length > 0 ? null : (
                                            <>
                                                <div className="bg-red-50 border border-red-200 text-red-800 p-3 rounded text-sm mb-2">{String(selected.parseError)}</div>
                                                {selected.parseDetails && (
                                                    <div className="bg-yellow-50 border border-yellow-200 text-yellow-900 p-3 rounded text-sm">
                                                        <div className="font-medium mb-1">Parse details</div>
                                                        {selected.parseDetails.currentEvent ? (
                                                            <div className="text-sm">
                                                                <div><strong>Event id:</strong> {String(selected.parseDetails.currentEvent.id ?? '-')}</div>
                                                                <div><strong>Date:</strong> {String(selected.parseDetails.currentEvent.date ?? '-')}</div>
                                                                <div><strong>Home:</strong> {String(selected.parseDetails.currentEvent.homeTeam ?? '-')}</div>
                                                                <div><strong>Away:</strong> {String(selected.parseDetails.currentEvent.awayTeam ?? '-')}</div>
                                                            </div>
                                                        ) : (
                                                            <pre className="text-sm">{JSON.stringify(selected.parseDetails, null, 2)}</pre>
                                                        )}
                                                        {/* Show diagnostic partialEvents and roundAssignments when available */}
                                                        {selected.parseDetails?.partialEvents && (
                                                            <div className="mt-3">
                                                                <div className="text-sm font-medium mb-1">Partial Events (diagnostic)</div>
                                                                <div className="overflow-auto border rounded max-h-48">
                                                                    <table className="min-w-max table-fixed border-collapse whitespace-nowrap text-sm">
                                                                        <thead className="bg-gray-100">
                                                                            <tr>
                                                                                <th className="p-2 text-left border-b">eventId</th>
                                                                                <th className="p-2 text-left border-b">date</th>
                                                                                <th className="p-2 text-left border-b">round</th>
                                                                                <th className="p-2 text-left border-b">homeId</th>
                                                                                <th className="p-2 text-left border-b">awayId</th>
                                                                                <th className="p-2 text-left border-b">homeName</th>
                                                                                <th className="p-2 text-left border-b">awayName</th>
                                                                            </tr>
                                                                        </thead>
                                                                        <tbody>
                                                                            {selected.parseDetails.partialEvents.map((pe: any, idx: number) => {
                                                                                // annotate round from roundAssignments if present
                                                                                const roundMap = (selected.parseDetails?.roundAssignments || []).reduce((acc: any, cur: any) => {
                                                                                    if (cur && cur.eventId != null) acc[String(cur.eventId)] = cur.round;
                                                                                    return acc;
                                                                                }, {} as Record<string, any>);
                                                                                const round = roundMap[String(pe.eventId)] ?? '';
                                                                                return (
                                                                                    <tr key={idx} className="odd:bg-white even:bg-gray-50 border-t">
                                                                                        <td className="p-2">{String(pe.eventId ?? '')}</td>
                                                                                        <td className="p-2">{String(pe.date ?? '')}</td>
                                                                                        <td className="p-2">{String(round ?? '')}</td>
                                                                                        <td className="p-2">{String(pe.homeId ?? '')}</td>
                                                                                        <td className="p-2">{String(pe.awayId ?? '')}</td>
                                                                                        <td className="p-2">{String(pe.homeName ?? '')}</td>
                                                                                        <td className="p-2">{String(pe.awayName ?? '')}</td>
                                                                                    </tr>
                                                                                );
                                                                            })}
                                                                        </tbody>
                                                                    </table>
                                                                </div>
                                                            </div>
                                                        )}
                                                        {selected.parseDetails?.roundAssignments && (
                                                            <div className="mt-3">
                                                                <div className="text-sm font-medium mb-1">Derived Round Assignments</div>
                                                                <pre className="bg-gray-50 border p-2 rounded text-sm max-h-40 overflow-auto">{JSON.stringify(selected.parseDetails.roundAssignments, null, 2)}</pre>
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                            </>
                                        )}
                                    </div>
                                ) : (
                                    <pre className="bg-gray-50 border p-3 rounded text-sm max-h-[60vh] overflow-auto">{JSON.stringify(selected.payload ?? selected, null, 2)}</pre>
                                )}
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