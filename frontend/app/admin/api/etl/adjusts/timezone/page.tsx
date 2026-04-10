'use client';

import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';
import { sportsApi, leaguesApi } from '@/lib/api/entities';

// Types
type League = {
    id: number;
    name: string;
    originalName: string;
    typeOfSchedule?: 'Round' | 'Date';
    type_of_schedule?: 'Round' | 'Date';
    country: { name: string; code: string };
};

type Season = {
    id: number;
    startYear: number;
    endYear: number;
    status: string;
};

type Round = {
    id: number;
    roundNumber: number;
    name?: string;
};

type Match = {
    id: number;
    date: string;
    homeClub: { name: string; shortName?: string };
    awayClub: { name: string; shortName?: string };
    status: string;
};

// Country timezone mappings (reused from backend)
const COUNTRY_TIMEZONES: Record<string, string> = {
    // Europe
    'England': 'Europe/London',
    'United Kingdom': 'Europe/London',
    'UK': 'Europe/London',
    'Spain': 'Europe/Madrid',
    'France': 'Europe/Paris',
    'Germany': 'Europe/Berlin',
    'Italy': 'Europe/Rome',
    'Netherlands': 'Europe/Amsterdam',
    'Portugal': 'Europe/Lisbon',
    'Belgium': 'Europe/Brussels',
    'Switzerland': 'Europe/Zurich',
    'Austria': 'Europe/Vienna',
    'Poland': 'Europe/Warsaw',
    'Czech Republic': 'Europe/Prague',
    'Russia': 'Europe/Moscow',
    'Turkey': 'Europe/Istanbul',
    'Greece': 'Europe/Athens',
    'Sweden': 'Europe/Stockholm',
    'Norway': 'Europe/Oslo',
    'Denmark': 'Europe/Copenhagen',
    'Finland': 'Europe/Helsinki',
    'Ukraine': 'Europe/Kiev',
    'Croatia': 'Europe/Zagreb',
    'Serbia': 'Europe/Belgrade',
    'Romania': 'Europe/Bucharest',
    'Bulgaria': 'Europe/Sofia',
    // Americas
    'Brazil': 'America/Brasilia',
    'Argentina': 'America/Argentina/Buenos_Aires',
    'Chile': 'America/Santiago',
    'Colombia': 'America/Bogota',
    'Mexico': 'America/Mexico_City',
    'United States': 'America/New_York',
    'USA': 'America/New_York',
    'Canada': 'America/Toronto',
    'Peru': 'America/Lima',
    'Ecuador': 'America/Guayaquil',
    'Uruguay': 'America/Montevideo',
    'Paraguay': 'America/Asuncion',
    'Bolivia': 'America/La_Paz',
    'Venezuela': 'America/Caracas',
    // Asia
    'Japan': 'Asia/Tokyo',
    'China': 'Asia/Shanghai',
    'South Korea': 'Asia/Seoul',
    'India': 'Asia/Kolkata',
    'Australia': 'Australia/Sydney',
    'Saudi Arabia': 'Asia/Riyadh',
    'UAE': 'Asia/Dubai',
    'Qatar': 'Asia/Qatar',
    'Iran': 'Asia/Tehran',
    'Israel': 'Asia/Jerusalem',
    // Africa
    'South Africa': 'Africa/Johannesburg',
    'Egypt': 'Africa/Cairo',
    'Morocco': 'Africa/Casablanca',
    'Nigeria': 'Africa/Lagos',
    'Algeria': 'Africa/Algiers',
    'Tunisia': 'Africa/Tunis',
};

export default function TimezoneAdjustmentPage() {
    // Form state
    const [selectedSportId, setSelectedSportId] = useState<string>('');
    const [selectedLeagueId, setSelectedLeagueId] = useState<string>('');
    const [selectedSeasonId, setSelectedSeasonId] = useState<string>('');
    const [selectedRoundIds, setSelectedRoundIds] = useState<string[]>([]);
    const [selectedDateFrom, setSelectedDateFrom] = useState<string>('');
    const [selectedDateTo, setSelectedDateTo] = useState<string>('');
    const [selectedMatchId, setSelectedMatchId] = useState<string>('');

    // Timezone adjustment options
    const [adjustmentType, setAdjustmentType] = useState<'country' | 'manual' | 'set'>('country');
    const [manualHours, setManualHours] = useState<number>(0);
    // When using 'set', user provides exact time (HH:MM) and optionally an exact date
    const [setTime, setSetTime] = useState<string>('');
    const [setDate, setSetDate] = useState<string>('');

    // Process state
    const [isProcessing, setIsProcessing] = useState(false);
    const [processResult, setProcessResult] = useState<any>(null);
    const [processError, setProcessError] = useState<string | null>(null);
    const [lastPayload, setLastPayload] = useState<any>(null);
    const [lastErrorBody, setLastErrorBody] = useState<any>(null);

    // Fetch sports list
    const { data: sportsData, isLoading: loadingSports } = useQuery({
        queryKey: ['sports'],
        queryFn: async () => {
            const res = await sportsApi.getAll({ page: 1, limit: 200 });
            return res;
        }
    });

    const sports = sportsData?.data || [];

    // Fetch leagues filtered by selected sport
    const { data: leaguesData, isLoading: loadingLeagues } = useQuery({
        queryKey: ['leagues', selectedSportId],
        queryFn: async () => {
            if (!selectedSportId) return [] as any[];
            const res = await leaguesApi.getBySport(Number(selectedSportId));
            return res;
        },
        enabled: !!selectedSportId,
    });

    const leaguesRaw = leaguesData || [];

    // Ensure leagues are displayed ordered by name (prefer originalName then name)
    const leagues = [...leaguesRaw].sort((a: League, b: League) => {
        const aName = (a.originalName || a.name || '').toLowerCase();
        const bName = (b.originalName || b.name || '').toLowerCase();
        return aName.localeCompare(bName);
    });

    // Fetch seasons (dependent on league)
    const { data: seasonsData, isLoading: loadingSeasons } = useQuery({
        queryKey: ['seasons', selectedLeagueId],
        queryFn: async () => {
            if (!selectedLeagueId) return [];
            const response = await apiClient.get(`/v1/seasons?leagueId=${selectedLeagueId}`);
            return response.data;
        },
        enabled: !!selectedLeagueId
    });

    const seasons = (Array.isArray(seasonsData) ? seasonsData : (seasonsData?.data || [])).slice().sort((a: Season, b: Season) => b.startYear - a.startYear);

    // Detect schedule type from selected league
    const parsedLeagueId = selectedLeagueId ? parseInt(selectedLeagueId, 10) : NaN;
    const selectedLeague = !Number.isNaN(parsedLeagueId)
        ? leagues.find((l: League) => l.id === parsedLeagueId)
        : undefined;
    const rawSchedule = selectedLeague && (selectedLeague.typeOfSchedule || selectedLeague.type_of_schedule);
    const leagueTypeOfSchedule: 'Round' | 'Date' = rawSchedule === 'Date' ? 'Date' : 'Round';

    // Fetch rounds (dependent on league + season)
    const { data: roundsData, isLoading: loadingRounds } = useQuery({
        queryKey: ['rounds', selectedLeagueId, selectedSeasonId],
        queryFn: async () => {
            if (!selectedSeasonId) return [];
            const response = await apiClient.get(`/v1/rounds?seasonId=${selectedSeasonId}`);
            return response.data;
        },
        enabled: !!selectedSeasonId && leagueTypeOfSchedule === 'Round'
    });

    const rounds = Array.isArray(roundsData) ? roundsData : (roundsData?.data || []);

    // Fetch matches (dependent on league + season + single selected round)
    const canPickSingleDateMatch = !!selectedDateFrom && (!selectedDateTo || selectedDateTo === selectedDateFrom);

    const { data: matchesData, isLoading: loadingMatches } = useQuery({
        queryKey: ['matches', selectedLeagueId, selectedSeasonId, selectedRoundIds.join(','), selectedDateFrom, selectedDateTo, leagueTypeOfSchedule],
        queryFn: async () => {
            if (leagueTypeOfSchedule === 'Round') {
                if (selectedRoundIds.length !== 1) return [];
                const roundId = selectedRoundIds[0];
                const response = await apiClient.get(`/v1/matches?seasonId=${selectedSeasonId}&roundId=${roundId}`);
                return response.data;
            }

            if (!canPickSingleDateMatch) return [];
            const response = await apiClient.get(`/v1/matches?seasonId=${selectedSeasonId}&date=${selectedDateFrom}`);
            return response.data;
        },
        enabled: !!selectedSeasonId && (
            (leagueTypeOfSchedule === 'Round' && selectedRoundIds.length === 1) ||
            (leagueTypeOfSchedule === 'Date' && canPickSingleDateMatch)
        )
    });

    const matches = Array.isArray(matchesData) ? matchesData : (matchesData?.data || []);
    const [open, setOpen] = useState(false);

    // Friendly label for selected match (show names + date/time instead of raw id)
    const selectedMatchObj = selectedMatchId ? matches.find((m: Match) => String(m.id) === String(selectedMatchId)) : undefined;
    // Helper: format stored date/time using UTC (do NOT convert to user's local timezone)
    const formatUtcDateTime = (dateStr?: string) => {
        if (!dateStr) return { date: '--/--', time: '--:--' };
        const d = new Date(dateStr);
        if (Number.isNaN(d.getTime())) return { date: '--/--', time: '--:--' };
        const dd = String(d.getUTCDate()).padStart(2, '0');
        const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
        const hh = String(d.getUTCHours()).padStart(2, '0');
        const min = String(d.getUTCMinutes()).padStart(2, '0');
        return { date: `${dd}/${mm}`, time: `${hh}:${min}` };
    };

    const selectedMatchLabel = selectedMatchObj
        ? (() => {
            const { date, time } = formatUtcDateTime(selectedMatchObj.date);
            const home = selectedMatchObj.homeClub?.shortName || selectedMatchObj.homeClub?.name || 'HOME';
            const away = selectedMatchObj.awayClub?.shortName || selectedMatchObj.awayClub?.name || 'AWAY';
            return `${home} vs ${away} — ${date} ${time}`;
        })()
        : '';

    // Reset dependent fields when parent changes
    useEffect(() => {
        setSelectedSeasonId('');
        setSelectedRoundIds([]);
        setSelectedDateFrom('');
        setSelectedDateTo('');
        setSelectedMatchId('');
    }, [selectedLeagueId]);

    // When sport changes, clear league + downstream selections
    useEffect(() => {
        setSelectedLeagueId('');
        setSelectedSeasonId('');
        setSelectedRoundIds([]);
        setSelectedDateFrom('');
        setSelectedDateTo('');
        setSelectedMatchId('');
    }, [selectedSportId]);
    useEffect(() => {
        setSelectedRoundIds([]);
        setSelectedDateFrom('');
        setSelectedDateTo('');
        setSelectedMatchId('');
    }, [selectedSeasonId]);

    useEffect(() => {
        setSelectedMatchId('');
    }, [selectedRoundIds]);

    useEffect(() => {
        setSelectedMatchId('');
    }, [selectedDateFrom, selectedDateTo]);

    useEffect(() => {
        setSelectedRoundIds([]);
        setSelectedDateFrom('');
        setSelectedDateTo('');
        setSelectedMatchId('');
    }, [leagueTypeOfSchedule]);

    const countryTimezone = selectedLeague ? COUNTRY_TIMEZONES[selectedLeague.country?.name] : null;

    const handleProcess = async () => {
        if (!selectedSportId) {
            setProcessError('Please select a sport');
            return;
        }

        if (!selectedLeagueId) {
            setProcessError('Please select at least a league');
            return;
        }

        const leagueIdNum = parseInt(selectedLeagueId, 10);
        if (Number.isNaN(leagueIdNum)) {
            setProcessError('Invalid League ID');
            return;
        }

        // Ensure the parsed league exists in the loaded leagues list
        const resolvedLeague = leagues.find((l: League) => l.id === leagueIdNum);
        if (!resolvedLeague) {
            setProcessError('Please select a valid league');
            return;
        }

        if (leagueTypeOfSchedule === 'Date' && selectedDateFrom && selectedDateTo && selectedDateTo < selectedDateFrom) {
                setProcessError('End date cannot be earlier than start date');
                return;
        }

        // Validate setTime when using 'set' mode
        if (adjustmentType === 'set') {
            if (!setTime) {
                setProcessError('Please provide a time (HH:MM) when using "Set Time" adjustment');
                return;
            }
            // basic validation: expect HH:MM
            if (!/^\d{2}:\d{2}$/.test(setTime)) {
                setProcessError('Please provide time in HH:MM format');
                return;
            }
            // if date provided, basic YYYY-MM-DD validation
            if (setDate && !/^\d{4}-\d{2}-\d{2}$/.test(setDate)) {
                setProcessError('Please provide date in YYYY-MM-DD format');
                return;
            }
        }

        setIsProcessing(true);
        setProcessError(null);
        setProcessResult(null);

            try {
            const payload = {
                sportId: selectedSportId ? Number(selectedSportId) : null,
                leagueId: resolvedLeague.id,
                seasonId: selectedSeasonId ? Number(selectedSeasonId) : null,
                roundIds: leagueTypeOfSchedule === 'Round' && selectedRoundIds.length > 0 ? selectedRoundIds.map(Number) : null,
                startDate: leagueTypeOfSchedule === 'Date' ? selectedDateFrom : null,
                endDate: leagueTypeOfSchedule === 'Date' ? (selectedDateTo || selectedDateFrom) : null,
                matchId: selectedMatchId ? Number(selectedMatchId) : null,
                adjustmentType,
                manualHours: adjustmentType === 'manual' ? manualHours : 0,
                countryTimezone: adjustmentType === 'country' ? countryTimezone : null,
                setTime: adjustmentType === 'set' ? setTime : null,
                setDate: adjustmentType === 'set' ? (setDate || null) : null,
            };
            console.debug('Selected league id (raw):', selectedLeagueId);
            console.debug('Resolved league object:', resolvedLeague);
            console.debug('Timezone adjustment payload (sending):', payload);
            setLastPayload(payload);
            setLastErrorBody(null);
            const response = await apiClient.post('/v1/admin/timezone-adjustment', payload);
            setProcessResult(response.data);
            // Do NOT reset league/season/round selections automatically; keep them for batch updates
        } catch (error: any) {
            const body = error.response?.data || { message: error.message || 'Process failed' };
            setLastErrorBody(body);
            setProcessError(body?.message || error.message || 'Process failed');
        } finally {
            setIsProcessing(false);
        }
    };

    const handleClear = () => {
        setSelectedLeagueId('');
        setSelectedSeasonId('');
        setSelectedRoundIds([]);
        setSelectedDateFrom('');
        setSelectedDateTo('');
        setSelectedMatchId('');
        setAdjustmentType('country');
        setManualHours(0);
        setSetTime('');
        setSetDate('');
        setIsProcessing(false);
        setProcessResult(null);
        setProcessError(null);
        setLastPayload(null);
        setLastErrorBody(null);
    };

    return (
        <div className="p-6 max-w-5xl mx-auto">
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-gray-900">Timezone Adjustment</h1>
                <p className="text-gray-600 mt-2">
                    Update match dates to correct timezone information. Select a sport and league (both required) and optionally narrow down by season, round, or specific match.
                </p>

                <div className="mt-2 text-sm text-gray-600">
                    <strong>Supported sports:</strong>{' '}
                    {loadingSports ? (
                        <span>Loading sports…</span>
                    ) : sports.length ? (
                        <span>{sports.map((s: any) => s.name || s.reducedName || s.id).join(', ')}</span>
                    ) : (
                        <span>No sports available</span>
                    )}
                </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Filters Section */}
                    <div className="space-y-4">
                        <h3 className="text-lg font-semibold text-gray-900">Filters</h3>

                        {/* Sport Selector */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Sport <span className="text-red-500">*</span>
                            </label>
                            <select
                                value={selectedSportId}
                                onChange={(e) => setSelectedSportId(e.target.value)}
                                disabled={loadingSports}
                                className="w-full p-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            >
                                <option value="">Select Sport</option>
                                {sports.map((s: any) => (
                                    <option key={s.id} value={s.id}>{s.name || s.reducedName || s.id}</option>
                                ))}
                            </select>
                            {loadingSports && <p className="text-sm text-gray-500 mt-1">Loading sports...</p>}
                        </div>

                        {/* League Selector */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                League <span className="text-red-500">*</span>
                            </label>
                            <select
                                value={selectedLeagueId}
                                onChange={(e) => setSelectedLeagueId(e.target.value)}
                                disabled={!selectedSportId || loadingLeagues}
                                className="w-full p-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            >
                                <option value="">Select League</option>
                                {leagues.map((league: League) => (
                                    <option key={league.id} value={league.id}>
                                        {league.originalName || league.name} ({league.country?.name})
                                    </option>
                                ))}
                            </select>
                            {!selectedSportId && (
                                <p className="text-sm text-gray-500 mt-1">Please select a sport first to load leagues.</p>
                            )}
                            {loadingLeagues && <p className="text-sm text-gray-500 mt-1">Loading leagues...</p>}
                            {!loadingLeagues && leagues.length > 0 && (
                                <p className="text-xs text-blue-600 mt-1">
                                    💡 Tip: You can select just a league, or further narrow down by season/round/match
                                </p>
                            )}
                            {/* DEBUG: show selected league values to help trace frontend issue */}
                            {/* <div className="mt-2 p-2 bg-gray-50 border rounded text-xs text-gray-600">
                                <div><strong>Debug (league):</strong></div>
                                <div>selectedLeagueId (raw): <span className="font-mono">{String(selectedLeagueId)}</span></div>
                                <div>resolvedLeague.id: <span className="font-mono">{selectedLeague ? String(selectedLeague.id) : 'null'}</span></div>
                                <div>resolvedLeague.name: {selectedLeague ? (selectedLeague.originalName || selectedLeague.name) : 'null'}</div>
                            </div> */}
                            {/* DEBUG: last payload / error from last attempt */}
                            {/* <div className="mt-2 p-2 bg-yellow-50 border rounded text-xs text-gray-700">
                                <div><strong>Debug (last request):</strong></div>
                                <div>Last payload: <pre className="bg-white p-1 rounded text-xs overflow-auto">{lastPayload ? JSON.stringify(lastPayload, null, 2) : 'null'}</pre></div>
                                <div className="mt-1">Last error body: <pre className="bg-white p-1 rounded text-xs overflow-auto">{lastErrorBody ? JSON.stringify(lastErrorBody, null, 2) : 'null'}</pre></div>
                            </div> */}
                        </div>

                        {/* Season Selector */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Season (Optional)
                            </label>
                            <select
                                value={selectedSeasonId}
                                onChange={(e) => setSelectedSeasonId(e.target.value)}
                                disabled={!selectedLeagueId || loadingSeasons}
                                className="w-full p-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100"
                            >
                                <option value="">All Seasons in League</option>
                                {seasons.map((season: Season) => (
                                    <option key={season.id} value={season.id}>
                                        {season.startYear}/{season.endYear} ({season.status})
                                    </option>
                                ))}
                            </select>
                            {loadingSeasons && <p className="text-sm text-gray-500 mt-1">Loading seasons...</p>}
                        </div>

                        {leagueTypeOfSchedule === 'Round' ? (
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Round (Optional)
                                </label>
                                <label className="block text-sm text-gray-500 mb-1">(Ctrl/Cmd+click to multi-select rounds)</label>
                                <select
                                    multiple
                                    value={selectedRoundIds}
                                    onChange={(e) => {
                                        const vals = Array.from(e.target.selectedOptions).map(o => o.value);
                                        setSelectedRoundIds(vals);
                                    }}
                                    disabled={!selectedSeasonId || loadingRounds}
                                    className="w-full p-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 h-36"
                                >
                                    {rounds
                                        .sort((a: Round, b: Round) => a.roundNumber - b.roundNumber)
                                        .map((round: Round) => (
                                            <option key={round.id} value={String(round.id)}>
                                                Round {round.roundNumber}
                                            </option>
                                        ))}
                                </select>
                                {loadingRounds && <p className="text-sm text-gray-500 mt-1">Loading rounds...</p>}
                            </div>
                        ) : (
                            <div className="space-y-3">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Day From (Optional)
                                    </label>
                                    <input
                                        type="date"
                                        value={selectedDateFrom}
                                        onChange={(e) => setSelectedDateFrom(e.target.value)}
                                        disabled={!selectedSeasonId}
                                        className="w-full p-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Day To (Optional)
                                    </label>
                                    <input
                                        type="date"
                                        value={selectedDateTo}
                                        onChange={(e) => setSelectedDateTo(e.target.value)}
                                        disabled={!selectedSeasonId || !selectedDateFrom}
                                        min={selectedDateFrom || undefined}
                                        className="w-full p-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100"
                                    />
                                    <p className="text-sm text-gray-500 mt-1">
                                        Leave both dates empty to update the entire season, select one day to update a single day, or fill both dates to update an interval of days.
                                    </p>
                                </div>
                            </div>
                        )}

                        <div className="relative w-full">
                            <button
                                type="button"
                                onClick={() => setOpen(!open)}
                                className="w-full p-2 border rounded-md bg-white text-sm font-mono text-center"
                                disabled={
                                    loadingMatches ||
                                    (leagueTypeOfSchedule === 'Round' && selectedRoundIds.length !== 1) ||
                                    (leagueTypeOfSchedule === 'Date' && !canPickSingleDateMatch)
                                }
                            >
                                {leagueTypeOfSchedule === 'Round'
                                    ? (selectedRoundIds.length === 1 ? (selectedMatchObj ? selectedMatchLabel : 'All Matches in Round') : 'Matches (select exactly one round to pick a match)')
                                    : (canPickSingleDateMatch ? (selectedMatchObj ? selectedMatchLabel : 'All Matches on Selected Day') : 'Matches (select exactly one day to pick a match)')}
                            </button>

                            {open && (
                                <div className="absolute z-10 w-full mt-1 border rounded-md bg-white shadow max-h-60 overflow-auto">

                                    <div
                                        onClick={() => {
                                            setSelectedMatchId("");
                                            setOpen(false);
                                        }}
                                        className="px-2 py-1 text-center text-sm hover:bg-blue-50 cursor-pointer"
                                    >
                                        All Matches in Round
                                    </div>

                                    {matches.map((match: Match) => {
                                        const { date, time } = formatUtcDateTime(match.date);

                                        const home =
                                            match.homeClub?.shortName ||
                                            match.homeClub?.name ||
                                            "HOME";

                                        const away =
                                            match.awayClub?.shortName ||
                                            match.awayClub?.name ||
                                            "AWAY";

                                        return (
                                            <div
                                                key={match.id}
                                                onClick={() => {
                                                    setSelectedMatchId(String(match.id)); // ✅ FIXED
                                                    setOpen(false); // ✅ FIXED
                                                }}
                                                className="grid grid-cols-[1fr_auto_1fr_auto_auto] items-center px-2 py-1 hover:bg-blue-50 cursor-pointer font-mono text-sm"
                                            >
                                                <div className="text-center truncate">
                                                    {home.toUpperCase()}
                                                </div>

                                                <div className="px-1 text-center">vs</div>

                                                <div className="text-center truncate">
                                                    {away.toUpperCase()}
                                                </div>

                                                <div className="px-2 text-center">│</div>

                                                <div className="text-center whitespace-nowrap">
                                                    {date} {time}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </div>
                    
                    {/* Timezone Adjustment Section */}
                    <div>
                        <div className="space-y-4">
                            <h3 className="text-lg font-semibold text-gray-900">Timezone Adjustment</h3>

                            {/* Adjustment Type */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Adjustment Method</label>
                                <div className="space-y-2">
                                    <label className="flex items-center">
                                        <input
                                            type="radio"
                                            value="country"
                                            checked={adjustmentType === 'country'}
                                            onChange={(e) => setAdjustmentType(e.target.value as 'country')}
                                            className="mr-2"
                                        />
                                        <span>Use League Country Timezone</span>
                                    </label>
                                    <label className="flex items-center">
                                        <input
                                            type="radio"
                                            value="manual"
                                            checked={adjustmentType === 'manual'}
                                            onChange={(e) => setAdjustmentType(e.target.value as 'manual')}
                                            className="mr-2"
                                        />
                                        <span>Manual Hour Adjustment</span>
                                    </label>
                                    <label className="flex items-center">
                                        <input
                                            type="radio"
                                            value="set"
                                            checked={adjustmentType === 'set'}
                                            onChange={(e) => setAdjustmentType(e.target.value as 'set')}
                                            className="mr-2"
                                        />
                                        <span>Set Exact Date and Time</span>
                                    </label>
                                </div>
                            </div>

                            {/* Country Timezone Info */}
                            {adjustmentType === 'country' && selectedLeague && (
                                <div className="bg-blue-50 p-3 rounded-md">
                                    <p className="text-sm">
                                        <strong>League:</strong> {selectedLeague.originalName || selectedLeague.name}<br />
                                        <strong>Country:</strong> {selectedLeague.country?.name}<br />
                                        <strong>Timezone:</strong> {countryTimezone || 'Unknown (will use UTC)'}
                                    </p>
                                </div>
                            )}

                            {/* Manual Hours Input */}
                            {adjustmentType === 'manual' && (
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Hours to Add/Subtract
                                    </label>
                                    <input
                                        type="number"
                                        value={manualHours}
                                        onChange={(e) => setManualHours(Number(e.target.value))}
                                        min={-12}
                                        max={12}
                                        step={0.5}
                                        className="w-full p-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                        placeholder="e.g., +2 for 2 hours ahead, -3 for 3 hours behind"
                                    />
                                    <p className="text-sm text-gray-500 mt-1">
                                        Enter positive numbers to add hours, negative to subtract
                                    </p>
                                </div>
                            )}

                            {/* Set Exact Time (and optional date) Input */}
                            {adjustmentType === 'set' && (
                                <div className="space-y-3">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Exact Date (optional)
                                        </label>
                                        <input
                                            type="date"
                                            value={setDate}
                                            onChange={(e) => setSetDate(e.target.value)}
                                            className="w-full p-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                        />
                                        <p className="text-sm text-gray-500 mt-1">
                                            If provided, this exact date will be used (YYYY-MM-DD). Leave empty to keep existing date.
                                        </p>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Exact Time (HH:MM)
                                        </label>
                                        <input
                                            type="time"
                                            value={setTime}
                                            onChange={(e) => setSetTime(e.target.value)}
                                            className="w-full p-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                        />
                                        <p className="text-sm text-gray-500 mt-1">
                                            Provide the match time (e.g., 19:30). This exact time will be saved for selected matches.
                                        </p>
                                    </div>
                                </div>
                            )}

                            {/* Tables to Update Info */}
                            <div className="bg-yellow-50 p-3 rounded-md">
                                <h4 className="font-medium text-sm mb-1">Scope of update:</h4>
                                <ul className="text-sm text-gray-600">
                                    <li>• <strong>Sport + League only:</strong> All matches in the entire league</li>
                                    <li>• <strong>Sport + League + Season:</strong> All matches in that specific season</li>
                                    <li>• <strong>Round leagues:</strong> Optionally narrow by one round or multiple selected rounds</li>
                                    <li>• <strong>Date leagues:</strong> Optionally narrow by one day or an interval of days</li>
                                    <li>• <strong>Specific match:</strong> Requires exactly one round or exactly one day</li>
                                </ul>
                                <p className="text-xs text-gray-500 mt-2">
                                    Tables updated: matches (date field)
                                </p>
                                <p className="text-xs text-gray-600 mt-2">
                                    <strong>Supported sports:</strong>{' '}
                                    {loadingSports ? (
                                        <span>Loading sports…</span>
                                    ) : sports.length ? (
                                        <span>{sports.map((s: any) => s.name || s.reducedName || s.id).join(', ')}</span>
                                    ) : (
                                        <span>No sports available</span>
                                    )}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Process Button */}
                    <div className="pt-4 border-t flex flex-col md:flex-row md:items-start gap-3">
                        <button
                            onClick={handleProcess}
                            disabled={isProcessing || !selectedSportId || !selectedLeagueId}
                            className="bg-blue-600 text-white px-6 py-3 rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed min-w-[200px] text-center"
                        >
                            {isProcessing ? 'Processing...' : 'Update Timezone Data'}
                        </button>

                        <button
                            type="button"
                            onClick={handleClear}
                            disabled={isProcessing}
                            className="bg-gray-200 text-gray-800 px-4 py-3 rounded-md hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed min-w-[100px]"
                        >
                            Clear
                        </button>
                    </div>

                    {/* Results */}
                    {processError && (
                        <div className="bg-red-50 border-l-4 border-red-400 p-4">
                            <p className="text-red-700">{processError}</p>
                        </div>
                    )}

                    {processResult && (
                        <div className="bg-green-50 border-l-4 border-green-400 p-4">
                            <h4 className="font-medium text-green-900 mb-2">Process Completed Successfully</h4>
                            <div className="text-sm text-green-800">
                                <p>Matches updated: {processResult.matchesUpdated || 0}</p>
                                {processResult.details && (
                                    <pre className="mt-2 bg-green-100 p-2 rounded text-xs overflow-auto">
                                        {JSON.stringify(processResult.details, null, 2)}
                                    </pre>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}