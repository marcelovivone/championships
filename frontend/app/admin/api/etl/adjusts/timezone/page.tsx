'use client';

import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';

// Types
type League = {
    id: number;
    name: string;
    originalName: string;
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
    'Brazil': 'America/Sao_Paulo',
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
    const [selectedLeagueId, setSelectedLeagueId] = useState<string>('');
    const [selectedSeasonId, setSelectedSeasonId] = useState<string>('');
    const [selectedRoundId, setSelectedRoundId] = useState<string>('');
    const [selectedMatchId, setSelectedMatchId] = useState<string>('');

    // Timezone adjustment options
    const [adjustmentType, setAdjustmentType] = useState<'country' | 'manual'>('country');
    const [manualHours, setManualHours] = useState<number>(0);

    // Process state
    const [isProcessing, setIsProcessing] = useState(false);
    const [processResult, setProcessResult] = useState<any>(null);
    const [processError, setProcessError] = useState<string | null>(null);
    const [lastPayload, setLastPayload] = useState<any>(null);
    const [lastErrorBody, setLastErrorBody] = useState<any>(null);

    // Fetch leagues
    const { data: leaguesData, isLoading: loadingLeagues } = useQuery({
        queryKey: ['leagues'],
        queryFn: async () => {
            const response = await apiClient.get('/v1/leagues');
            return response.data;
        }
    });

    const leagues = leaguesData?.data || [];

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

    const seasons = Array.isArray(seasonsData) ? seasonsData : (seasonsData?.data || []);

    // Fetch rounds (dependent on league + season)
    const { data: roundsData, isLoading: loadingRounds } = useQuery({
        queryKey: ['rounds', selectedLeagueId, selectedSeasonId],
        queryFn: async () => {
            if (!selectedSeasonId) return [];
            const response = await apiClient.get(`/v1/rounds?seasonId=${selectedSeasonId}`);
            return response.data;
        },
        enabled: !!selectedSeasonId
    });

    const rounds = Array.isArray(roundsData) ? roundsData : (roundsData?.data || []);

    // Fetch matches (dependent on league + season + round)
    const { data: matchesData, isLoading: loadingMatches } = useQuery({
        queryKey: ['matches', selectedLeagueId, selectedSeasonId, selectedRoundId],
        queryFn: async () => {
            if (!selectedRoundId) return [];
            const response = await apiClient.get(`/v1/matches?seasonId=${selectedSeasonId}&roundId=${selectedRoundId}`);
            return response.data;
        },
        enabled: !!selectedRoundId
    });

    const matches = Array.isArray(matchesData) ? matchesData : (matchesData?.data || []);
    const [open, setOpen] = useState(false);

    // Reset dependent fields when parent changes
    useEffect(() => {
        setSelectedSeasonId('');
        setSelectedRoundId('');
        setSelectedMatchId('');
    }, [selectedLeagueId]);

    useEffect(() => {
        setSelectedRoundId('');
        setSelectedMatchId('');
    }, [selectedSeasonId]);

    useEffect(() => {
        setSelectedMatchId('');
    }, [selectedRoundId]);

    // Ensure we parse the selected league id safely (handle non-numeric IDs)
    const parsedLeagueId = selectedLeagueId ? parseInt(selectedLeagueId, 10) : NaN;
    const selectedLeague = !Number.isNaN(parsedLeagueId)
        ? leagues.find((l: League) => l.id === parsedLeagueId)
        : undefined;
    const countryTimezone = selectedLeague ? COUNTRY_TIMEZONES[selectedLeague.country?.name] : null;

    const handleProcess = async () => {
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

        setIsProcessing(true);
        setProcessError(null);
        setProcessResult(null);

        try {
            const payload = {
                leagueId: resolvedLeague.id,
                seasonId: selectedSeasonId ? Number(selectedSeasonId) : null,
                roundId: selectedRoundId ? Number(selectedRoundId) : null,
                matchId: selectedMatchId ? Number(selectedMatchId) : null,
                adjustmentType,
                manualHours: adjustmentType === 'manual' ? manualHours : 0,
                countryTimezone: adjustmentType === 'country' ? countryTimezone : null
            };
            console.debug('Selected league id (raw):', selectedLeagueId);
            console.debug('Resolved league object:', resolvedLeague);
            console.debug('Timezone adjustment payload (sending):', payload);
            setLastPayload(payload);
            setLastErrorBody(null);
            const response = await apiClient.post('/v1/admin/timezone-adjustment', payload);
            setProcessResult(response.data);

            // Reset form on success
            if (response.data.success) {
                setSelectedLeagueId('');
                setSelectedSeasonId('');
                setSelectedRoundId('');
                setSelectedMatchId('');
            }
        } catch (error: any) {
            const body = error.response?.data || { message: error.message || 'Process failed' };
            setLastErrorBody(body);
            setProcessError(body?.message || error.message || 'Process failed');
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <div className="p-6 max-w-4xl mx-auto">
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-gray-900">Timezone Adjustment</h1>
                <p className="text-gray-600 mt-2">
                    Update match dates and standings to correct timezone information. Select a league (required) and optionally narrow down by season, round, or specific match.
                </p>
            </div>

            <div className="bg-white rounded-lg shadow p-6 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Filters Section */}
                    <div className="space-y-4">
                        <h3 className="text-lg font-semibold text-gray-900">Filters</h3>

                        {/* League Selector */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                League <span className="text-red-500">*</span>
                            </label>
                            <select
                                value={selectedLeagueId}
                                onChange={(e) => setSelectedLeagueId(e.target.value)}
                                disabled={loadingLeagues}
                                className="w-full p-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            >
                                <option value="">Select League</option>
                                {leagues.map((league: League) => (
                                    <option key={league.id} value={league.id}>
                                        {league.originalName || league.name} ({league.country?.name})
                                    </option>
                                ))}
                            </select>
                            {loadingLeagues && <p className="text-sm text-gray-500 mt-1">Loading leagues...</p>}
                            {!loadingLeagues && leagues.length > 0 && (
                                <p className="text-xs text-blue-600 mt-1">
                                    💡 Tip: You can select just a league, or further narrow down by season/round/match
                                </p>
                            )}
                            {/* DEBUG: show selected league values to help trace frontend issue */}
                            <div className="mt-2 p-2 bg-gray-50 border rounded text-xs text-gray-600">
                                <div><strong>Debug (league):</strong></div>
                                <div>selectedLeagueId (raw): <span className="font-mono">{String(selectedLeagueId)}</span></div>
                                <div>resolvedLeague.id: <span className="font-mono">{selectedLeague ? String(selectedLeague.id) : 'null'}</span></div>
                                <div>resolvedLeague.name: {selectedLeague ? (selectedLeague.originalName || selectedLeague.name) : 'null'}</div>
                            </div>
                            {/* DEBUG: last payload / error from last attempt */}
                            <div className="mt-2 p-2 bg-yellow-50 border rounded text-xs text-gray-700">
                                <div><strong>Debug (last request):</strong></div>
                                <div>Last payload: <pre className="bg-white p-1 rounded text-xs overflow-auto">{lastPayload ? JSON.stringify(lastPayload, null, 2) : 'null'}</pre></div>
                                <div className="mt-1">Last error body: <pre className="bg-white p-1 rounded text-xs overflow-auto">{lastErrorBody ? JSON.stringify(lastErrorBody, null, 2) : 'null'}</pre></div>
                            </div>
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

                        {/* Round Selector (Optional) */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Round (Optional)
                            </label>
                            <select
                                value={selectedRoundId}
                                onChange={(e) => setSelectedRoundId(e.target.value)}
                                disabled={!selectedSeasonId || loadingRounds}
                                className="w-full p-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100"
                            >
                                <option value="">All Rounds</option>
                                {rounds
                                    .sort((a: Round, b: Round) => a.roundNumber - b.roundNumber)
                                    .map((round: Round) => (
                                        <option key={round.id} value={round.id}>
                                            Round {round.roundNumber}
                                        </option>
                                    ))}
                            </select>
                            {loadingRounds && <p className="text-sm text-gray-500 mt-1">Loading rounds...</p>}
                        </div>

                        {/* Match Selector (Optional) */}
                        {/* <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Match (Optional)
                            </label>
                            <select 
                                value={selectedMatchId} 
                                onChange={(e) => setSelectedMatchId(e.target.value)}
                                disabled={!selectedRoundId || loadingMatches}
                                className="w-full p-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 font-mono text-sm"
                            >
                                <option value="">All Matches in Round</option>
                                {matches.map((match: Match) => {
                                // Recalculate based on actual dropdown width from image
                                // Total visible width ≈ 50 chars, Fixed content: " vs " (4) + " │ " (3) + "DD/MM HH:MM" (11) = 18 chars
                                // Remaining for clubs: 50 - 18 = 32 chars, Each club gets 16 chars (32/2)
                                const CLUB_WIDTH = 16;
                                
                                const homeShort = (match.homeClub?.shortName || match.homeClub?.name || 'HOME').slice(0, CLUB_WIDTH).toUpperCase().padEnd(CLUB_WIDTH);
                                const awayShort = (match.awayClub?.shortName || match.awayClub?.name || 'AWAY').slice(0, CLUB_WIDTH).toUpperCase().padEnd(CLUB_WIDTH);
                                const date = new Date(match.date).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit' });
                                const time = new Date(match.date).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false });
                                return (
                                    <option key={match.id} value={match.id}>
                                    {homeShort} vs {awayShort} │ {date} {time}
                                    </option>
                                );
                                })}
                            </select>
                            {loadingMatches && <p className="text-sm text-gray-500 mt-1">Loading matches...</p>}
                        </div>
                    </div> */}
                        <div className="relative w-full">
                            <button
                                type="button"
                                onClick={() => setOpen(!open)}
                                className="w-full p-2 border rounded-md bg-white text-sm font-mono text-center"
                                disabled={!selectedRoundId || loadingMatches}
                            >
                                {selectedMatchId || "All Matches in Round"}
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
                                        const dateObj = new Date(match.date);

                                        const date = dateObj.toLocaleDateString("en-GB", {
                                            day: "2-digit",
                                            month: "2-digit",
                                        });

                                        const time = dateObj.toLocaleTimeString("en-GB", {
                                            hour: "2-digit",
                                            minute: "2-digit",
                                            hour12: false,
                                        });

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

                            {/* Tables to Update Info */}
                            <div className="bg-yellow-50 p-3 rounded-md">
                                <h4 className="font-medium text-sm mb-1">Scope of update:</h4>
                                <ul className="text-sm text-gray-600">
                                    <li>• <strong>League only:</strong> All matches and standings in the entire league</li>
                                    <li>• <strong>League + Season:</strong> All matches and standings in that specific season</li>
                                    <li>• <strong>League + Season + Round:</strong> All matches in that round</li>
                                    <li>• <strong>League + Season + Round + Match:</strong> Only that specific match</li>
                                </ul>
                                <p className="text-xs text-gray-500 mt-2">
                                    Tables updated: matches (date field) and standings (related match dates)
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Process Button */}
                    <div className="pt-4 border-t">
                        <button
                            onClick={handleProcess}
                            disabled={isProcessing || !selectedLeagueId}
                            className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                        >
                            {isProcessing ? 'Processing...' : 'Update Timezone Data'}
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
                                <p>Standings recalculated: {processResult.standingsRecalculated || 0}</p>
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