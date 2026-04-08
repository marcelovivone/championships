"use client";

import React from 'react';
import { apiClient } from '@/lib/api/client';

function ChevronIcon({ direction }: { direction: 'left' | 'right' }) {
    return (
        <svg
            viewBox="0 0 16 16"
            aria-hidden="true"
            className="h-4 w-4"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.25"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            {direction === 'left' ? (
                <path d="M9.75 3.25 5 8l4.75 4.75" />
            ) : (
                <path d="M6.25 3.25 11 8l-4.75 4.75" />
            )}
        </svg>
    );
}

export default function FilterBar({
    season,
    setSeason,
    league,
    setLeague,
    roundOrDay,
    setRoundOrDay,
    viewType,
    setViewType,
    group,
    setGroup,
    hasGroups = false,
    leagues = [],
    seasons = [],
    showTop = true,
    showBottom = true,
    compact = false,
    effectiveMaxRound,
    combineGroups = false,
    setCombineGroups = () => {},
}: any) {
    const dateInputRef = React.useRef<HTMLInputElement | null>(null);
    const [inputRoundValue, setInputRoundValue] = React.useState<string>(String(roundOrDay ?? ''));
    const [seasonGroups, setSeasonGroups] = React.useState<any[]>([]);
    const [seasonHasGroups, setSeasonHasGroups] = React.useState<boolean>(false);
    const selectedLeague = Array.isArray(leagues) ? leagues.find((l: any) => String(l.id) === String(league)) : null;
    const rawSchedule = selectedLeague && (selectedLeague.typeOfSchedule || selectedLeague.type_of_schedule || selectedLeague.scheduleType || selectedLeague.type || selectedLeague.type_of_schedule_code);
    const scheduleStr = rawSchedule !== undefined && rawSchedule !== null ? String(rawSchedule).toLowerCase() : '';
    const scheduleIsDate = scheduleStr.includes('date') || scheduleStr.includes('day') || scheduleStr.includes('calendar') || scheduleStr.includes('dt') || scheduleStr === '1' || scheduleStr === 'date_based';
    const adjustDate = (delta: number) => {
        try {
            const cur = roundOrDay ? new Date(roundOrDay) : new Date();
            const d = new Date(cur);
            d.setDate(d.getDate() + delta);
            const iso = d.toISOString().slice(0, 10);
            setRoundOrDay(iso);
        } catch (e) {
            // ignore invalid date
        }
    };
    const getLeagueMaxRounds = (l: any) => {
        // Prefer the season-specific max derived from actual rounds data; this handles
        // leagues that change team count (and thus number of rounds) per season.
        if (effectiveMaxRound) return effectiveMaxRound;
        if (!l) return undefined;
        return Number(l.number_of_rounds_matches ?? l.numberOfRoundsMatches ?? l.numberOfRounds ?? l.number_of_rounds ?? l.numberOfRoundsMatches ?? 0) || undefined;
    };
    // Ensure seasons list is presented in descending order (by start year or id fallback)
    const seasonsDesc = Array.isArray(seasons)
        ? [...seasons].sort((a: any, b: any) => {
            const aStart = Number(a.startYear ?? a.start_year ?? a.start ?? a.id ?? 0);
            const bStart = Number(b.startYear ?? b.start_year ?? b.start ?? b.id ?? 0);
            return bStart - aStart;
        })
        : [];
    const commitRoundInput = (rawValue?: string) => {
        const v = (rawValue ?? inputRoundValue).trim();
        const min = 1;
        const max = getLeagueMaxRounds(selectedLeague) ?? Infinity;

        if (v === '') {
            return;
        }

        const parsed = Number(v);
        if (isNaN(parsed)) {
            return;
        }

        const clamped = Math.max(min, Math.min(max, Math.trunc(parsed)));
        setRoundOrDay(clamped);
        setInputRoundValue(String(clamped));
    };

    React.useEffect(() => {
        if (!scheduleIsDate) {
            setInputRoundValue(String(roundOrDay ?? ''));
        }
    }, [roundOrDay, scheduleIsDate]);

    // Top row: League / Season / Round controls
    const TopRow = () => (
        <div className="flex flex-col sm:flex-row sm:items-center sm:gap-4 bg-white p-1 rounded-lg">
            <div className="flex flex-col xs:flex-row xs:items-center gap-2 w-full sm:w-auto">
                <label className="text-sm text-gray-600">League</label>
                <select value={league} onChange={(e) => setLeague(e.target.value)} className="ml-0 xs:ml-2 px-2 py-1 border rounded w-full xs:w-48">
                    {Array.isArray(leagues) && leagues.length > 0 ? (
                        leagues.map((l: any) => (
                            <option key={l.id} value={String(l.id)}>{l.originalName}</option>
                        ))
                    ) : (
                        <>
                            <option value="league-a">League A</option>
                            <option value="league-b">League B</option>
                        </>
                    )}
                </select>
            </div>

            <div className="flex flex-col xs:flex-row xs:items-center gap-2 w-full sm:w-auto">
                <label className="text-sm text-gray-600">Season</label>
                <select value={season} onChange={(e) => setSeason(e.target.value)} className="ml-0 xs:ml-2 px-2 py-1 border rounded w-full xs:w-32">
                    {Array.isArray(seasonsDesc) && seasonsDesc.length > 0 ? (
                        seasonsDesc.map((s: any) => (
                            <option key={s.id} value={String(s.id)}>{`${s.startYear}/${s.endYear}`}</option>
                        ))
                    ) : (
                        <>
                            <option value={new Date().getFullYear().toString()}>{new Date().getFullYear()}</option>
                            <option value={(new Date().getFullYear() - 1).toString()}>{new Date().getFullYear() - 1}</option>
                        </>
                    )}
                </select>
            </div>

            <div className="flex flex-col xs:flex-row xs:items-center gap-2 w-full sm:w-auto sm:ml-auto">
                <label className="text-sm text-gray-600">{scheduleIsDate ? 'Date' : 'Round'}</label>
                <div className="mt-0 flex items-center gap-2 whitespace-nowrap">
                    {scheduleIsDate ? (
                        <div className="flex items-center overflow-hidden rounded-md border bg-white shadow-sm">
                            <button
                                onClick={() => adjustDate(-1)}
                                className="flex h-10 w-10 items-center justify-center border-r border-slate-200 text-slate-500 transition-colors hover:bg-slate-50 hover:text-slate-700"
                                aria-label="Previous date"
                            >
                                <ChevronIcon direction="left" />
                            </button>
                            <input
                                ref={dateInputRef}
                                type="date"
                                className="w-36 text-center px-3 py-2 bg-gray-50 border-0 focus:outline-none"
                                value={roundOrDay || ''}
                                onChange={(e) => setRoundOrDay(e.target.value)}
                            />
                            <button
                                onClick={() => adjustDate(1)}
                                className="flex h-10 w-10 items-center justify-center border-l border-slate-200 text-slate-500 transition-colors hover:bg-slate-50 hover:text-slate-700"
                                aria-label="Next date"
                            >
                                <ChevronIcon direction="right" />
                            </button>
                        </div>
                    ) : (
                        <div className="flex items-center overflow-hidden rounded-md border bg-white shadow-sm">
                            <button onClick={() => {
                                const cur = Number(roundOrDay || 1);
                                const min = 1;
                                const max = getLeagueMaxRounds(selectedLeague) ?? Infinity;
                                const next = Math.max(min, cur - 1);
                                const clamped = next > max ? max : next;
                                setRoundOrDay(clamped);
                                setInputRoundValue(String(clamped));
                            }} className="flex h-10 w-10 items-center justify-center border-r border-slate-200 text-slate-500 transition-colors hover:bg-slate-50 hover:text-slate-700" aria-label="Previous round"><ChevronIcon direction="left" /></button>
                            <input
                                type="number"
                                min={1}
                                max={getLeagueMaxRounds(selectedLeague) || undefined}
                                className="no-spinner w-14 text-center px-2 py-2 bg-gray-50 border-0 focus:outline-none"
                                value={inputRoundValue}
                                onChange={(e) => {
                                    const v = e.target.value;
                                    if (v === '') {
                                        setInputRoundValue('');
                                        return;
                                    }

                                    if (/^\d{1,3}$/.test(v)) {
                                        setInputRoundValue(v);
                                    }
                                }}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                        e.preventDefault();
                                        commitRoundInput(e.currentTarget.value);
                                    }

                                    if (e.key === 'Tab') {
                                        commitRoundInput(e.currentTarget.value);
                                    }
                                }}
                            />
                            <button onClick={() => {
                                const cur = Number(roundOrDay || 1);
                                const min = 1;
                                const max = getLeagueMaxRounds(selectedLeague) ?? Infinity;
                                const next = Math.min(max, cur + 1);
                                const clamped = next < min ? min : next;
                                setRoundOrDay(clamped);
                                setInputRoundValue(String(clamped));
                            }} className="flex h-10 w-10 items-center justify-center border-l border-slate-200 text-slate-500 transition-colors hover:bg-slate-50 hover:text-slate-700" aria-label="Next round"><ChevronIcon direction="right" /></button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );

    // Bottom row: ViewType + Group (supports inline compact mode)
    const BottomRow = ({ inline = false }: { inline?: boolean }) => {
        const btnRefs = React.useRef<(HTMLButtonElement | null)[]>([null, null, null]);
        const [btnMinWidth, setBtnMinWidth] = React.useState<number | null>(null);

        React.useLayoutEffect(() => {
            const nodes = btnRefs.current.filter(Boolean) as HTMLButtonElement[];
            if (!nodes.length) return;
            const widths = nodes.map((n) => Math.ceil(n.getBoundingClientRect().width));
            const max = Math.max(...widths);
            if (max && max !== btnMinWidth) setBtnMinWidth(max);
        }, [viewType, inline, seasonGroups.length, seasonHasGroups]);

        const btnStyle = btnMinWidth ? { minWidth: `${btnMinWidth}px` } : undefined;

        const Buttons = () => (
            <div className="flex items-center gap-2">
                <button ref={(el) => { btnRefs.current[0] = el; }} style={btnStyle} className={`px-3 py-1 rounded ${viewType === 'all' ? 'bg-blue-600 text-white' : 'bg-gray-100'}`} onClick={() => setViewType('all')}>All</button>
                <button ref={(el) => { btnRefs.current[1] = el; }} style={btnStyle} className={`px-3 py-1 rounded ${viewType === 'home' ? 'bg-blue-600 text-white' : 'bg-gray-100'}`} onClick={() => setViewType('home')}>Home</button>
                <button ref={(el) => { btnRefs.current[2] = el; }} style={btnStyle} className={`px-3 py-1 rounded ${viewType === 'away' ? 'bg-blue-600 text-white' : 'bg-gray-100'}`} onClick={() => setViewType('away')}>Away</button>
            </div>
        );

        return (
            <div className={inline ? 'flex items-center gap-3 w-full pr-6 mt-1' : 'flex flex-col sm:flex-row sm:items-center sm:justify-start sm:gap-4'}>
                {inline ? (
                    <>
                        {seasonHasGroups && (
                            <div className="flex items-center gap-2 text-sm ml-4">
                                <select value={group} onChange={(e) => setGroup(e.target.value)} className="ml-2 px-2 py-0.5 border rounded text-sm">
                                    <option value="all">All groups</option>
                                    {seasonGroups.map((g: any) => (
                                        <option key={g.id} value={String(g.id)}>{g.name ?? g.originalName ?? g.code ?? `Group ${g.id}`}</option>
                                    ))}
                                </select>
                            </div>
                        )}

                        {seasonHasGroups && group === 'all' && (
                            <label className="flex items-center gap-2 text-sm text-gray-600 whitespace-nowrap">
                                <input
                                    type="checkbox"
                                    checked={Boolean(combineGroups)}
                                    onChange={(e) => setCombineGroups(e.target.checked)}
                                    className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                />
                                <span>Combine groups</span>
                            </label>
                        )}

                        <div className="flex-1" />

                        <div className="flex items-center gap-2 text-sm">
                            <Buttons />
                        </div>
                    </>
                ) : (
                    <>
                        <Buttons />

                        {seasonHasGroups && (
                            <div className="flex items-center gap-2 mt-2 sm:mt-0">
                                <select value={group} onChange={(e) => setGroup(e.target.value)} className="ml-2 px-2 py-1 border rounded">
                                    <option value="all">All groups</option>
                                    {seasonGroups.map((g: any) => (
                                        <option key={g.id} value={String(g.id)}>{g.name ?? g.originalName ?? g.code ?? `Group ${g.id}`}</option>
                                    ))}
                                </select>
                            </div>
                        )}

                        {seasonHasGroups && group === 'all' && (
                            <label className="flex items-center gap-2 text-sm text-gray-600 mt-2 sm:mt-0">
                                <input
                                    type="checkbox"
                                    checked={Boolean(combineGroups)}
                                    onChange={(e) => setCombineGroups(e.target.checked)}
                                    className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                />
                                <span>Combine groups</span>
                            </label>
                        )}
                    </>
                )}

            </div>
        );
    };

    // When league (or season) changes, initialize roundOrDay depending on schedule type.
    // Round/day auto-selection is handled exclusively by BaseStandings (the parent)
    // which has season-status awareness (active → flgCurrent round, finished → last round).
    // FilterBar is a display/input component and should not compete with that logic.

    // When season changes, determine if it has groups and fetch them
    React.useEffect(() => {
        let mounted = true;

        const sel = Array.isArray(seasonsDesc) ? seasonsDesc.find((s: any) => String(s.id) === String(season)) : null;
        const num = sel ? Number(sel.numberOfGroups ?? sel.number_of_groups ?? 0) : 0;
        if (!mounted) return;
        if (num && num > 0) {
            setSeasonHasGroups(true);
            // fetch groups for season
            (async () => {
                try {
                    const resp = await apiClient.get(`/v1/groups?seasonId=${Number(season)}`);
                    const data = (resp.data && Array.isArray(resp.data)) ? resp.data : (Array.isArray(resp) ? resp : []);
                    if (mounted) {
                        setSeasonGroups(data);
                        // default group to 'all'
                        setGroup('all');
                    }
                } catch (e) {
                    if (mounted) {
                        setSeasonGroups([]);
                        setGroup('all');
                    }
                }
            })();
        } else {
            setSeasonHasGroups(false);
            setSeasonGroups([]);
            setGroup('all');
        }

        return () => {
            mounted = false;
        };
    }, [season, seasons]);

    // If compact, render only the inline bottom row without padding/background
    if (compact) {
        return (
            <div className="inline-flex items-center w-full pl-14 pr-16">
                <BottomRow inline />
            </div>
        );
    }

    return (
        <div className="bg-white rounded p-4 flex flex-col gap-3">
            {showTop && TopRow()}
            {showBottom && <BottomRow />}
        </div>
    );
}
