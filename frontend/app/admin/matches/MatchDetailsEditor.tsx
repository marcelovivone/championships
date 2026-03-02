'use client';

import { useState, useEffect } from 'react';
import { matchDivisionsApi } from '@/lib/api/entities';
import { MatchDivision } from '@/lib/api/types'; // Import MatchDivision from shared types

export type SportConfig = {
    divisionType: 'period' | 'quarter' | 'set';
    hasOvertime: boolean;
    hasPenalties: boolean;
    minMatchDivisionsNumber: number;
    maxMatchDivisionsNumber: number;
};

interface MatchDetailsEditorProps {
    sport: SportConfig;
    matchId: number;
    value?: MatchDivision[];
    onChange: (divisions: MatchDivision[]) => void;
}

const MatchDetailsEditor = ({ sport, matchId, value = [], onChange }: MatchDetailsEditorProps) => {
    const [divisions, setDivisions] = useState<MatchDivision[]>(value);
    const [hasOvertime, setHasOvertime] = useState(
        value.some(d => d.divisionType === 'OVERTIME' || d.id === -10)
    );
    const [hasPenalties, setHasPenalties] = useState(
        value.some(d => d.divisionType === 'PENALTIES' || d.id === -11)
    );

    // Load existing divisions when component mounts or when matchId changes
    useEffect(() => {
        if (matchId && matchId !== 0) {
            matchDivisionsApi.getByMatchId(matchId)
                .then((fetchedDivisions: MatchDivision[]) => {

                    if (fetchedDivisions.length === 0) {
                        // Match existe, mas sem detalhes → inicializa
                        const initialDivisions = initializeDivisionsFromSportConfig();
                        setDivisions(initialDivisions);
                        setHasOvertime(false);
                        setHasPenalties(false);
                        onChange(initialDivisions);
                    } else {
                        // Match existe e já tem divisions
                        setDivisions(fetchedDivisions);
                        setHasOvertime(
                            fetchedDivisions.some(d => d.divisionType === 'OVERTIME' || d.id === -10)
                        );
                        setHasPenalties(
                            fetchedDivisions.some(d => d.divisionType === 'PENALTIES' || d.id === -11)
                        );
                        onChange(fetchedDivisions);
                    }
                })
                .catch((error: any) => {
                    console.error('Error fetching match divisions:', error);
                });
        } else {
                const initialDivisions = initializeDivisionsFromSportConfig();
                setDivisions(initialDivisions);
                onChange(initialDivisions);
        }
    }, [matchId]);

    useEffect(() => {}, [matchId]);

    // Sync local state with parent value safely. Only update when `value` (prop) changes —
    // do not include `divisions` in deps to avoid overwriting local edits before parent confirms.
    useEffect(() => {
        const valueJson = JSON.stringify(value);
        if (valueJson !== JSON.stringify(divisions)) {
            setDivisions(value);
            setHasOvertime(value.some(d => d.divisionType === 'OVERTIME' || d.id === -10));
            setHasPenalties(value.some(d => d.divisionType === 'PENALTIES' || d.id === -11));
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [value]);

    // Update a division and notify parent
    const updateDivision = (
        index: number, 
        updatedDivision: Partial<MatchDivision>
    ) => {
        const newDivisions = [...divisions];
        newDivisions[index] = { ...newDivisions[index], ...updatedDivision };
        setDivisions(newDivisions);
        onChange(newDivisions);
    };

    // Helper function to initialize divisions based on sport configuration
    const initializeDivisionsFromSportConfig = () => {
        const initialDivisions = [];
        for (let i = 0; i < sport.maxMatchDivisionsNumber; i++) {
            initialDivisions.push({
                // MJV TODO Note
                // This first condition is to attend the volleyball case. 
                // This should be refactored in the future to be more flexible and not rely on specific sport configurations like this.
                id: sport.minMatchDivisionsNumber < sport.maxMatchDivisionsNumber && !sport.hasOvertime && !sport.hasPenalties 
                ?
                    i + 1
                : 
                    i + 1 <= sport.minMatchDivisionsNumber 
                    ? 
                        -1 - i 
                    : 
                        i + 1 < sport.maxMatchDivisionsNumber 
                        ? 
                            -10 
                        : 
                            // MJV TODO Note
                            // This inner condition is to attend the basketball case. 
                            // This should also be refactored in the future to be more flexible and not rely on specific sport configurations like this.
                            sport.hasPenalties ? -11 : -10, 
                matchId: 0,
                divisionNumber: i + 1,
                homeScore: null,
                awayScore: null,
                divisionType: 'REGULAR' as const,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
            });
        }
        return initialDivisions;
    };

    // Add or remove special divisions (Overtime / Penalties) by `id` or `divisionType`
    const toggleSpecialDivision = (divisionId: number, enabled: boolean) => {
        
        let changed = false;
        const newDivisions = divisions.map(d => {
            const isOvertime = d.id === -10 || d.divisionType === 'OVERTIME';
            const isPenalties = d.id === -11 || d.divisionType === 'PENALTIES';
            const matches = (divisionId === -10 && isOvertime) || (divisionId === -11 && isPenalties) || d.id === divisionId;
            if (matches) {
                const newHome = enabled ? d.homeScore : null;
                const newAway = enabled ? d.awayScore : null;
                // determine new divisionType for this special division
                let newDivisionType: MatchDivision['divisionType'] = d.divisionType;
                if (isOvertime) newDivisionType = enabled ? 'OVERTIME' : 'REGULAR';
                if (isPenalties) newDivisionType = enabled ? 'PENALTIES' : 'REGULAR';
                // only change if values or type differ
                if (d.homeScore !== newHome || d.awayScore !== newAway || d.divisionType !== newDivisionType) {
                    changed = true;
                    return {
                        ...d,
                        homeScore: newHome,
                        awayScore: newAway,
                        divisionType: newDivisionType,
                    } as MatchDivision;
                }
            }
            return d;
        });

        if (changed) {
            setDivisions(newDivisions);
            onChange(newDivisions);
        }
    };

    // Check if a special division (by id) can be enabled: all rows before it must have both scores
    // For PENALTIES (-11) we may require OVERTIME (-10) to be enabled and filled when the sport supports overtime
    const isSpecialDivisionAvailable = (divisionId: number) => {
        const idx = divisions.findIndex(d => {
            if (divisionId === -10) return d.id === -10 || d.divisionType === 'OVERTIME';
            if (divisionId === -11) return d.id === -11 || d.divisionType === 'PENALTIES';
            return d.id === divisionId;
        });
        if (idx === -1) return false;

        // All divisions before idx must have non-null home and away scores
        for (let i = 0; i < idx; i++) {
            const dd = divisions[i];
            if (dd.homeScore === null || dd.awayScore === null) return false;
        }

        // Additional rule for PENALTIES: if sport supports overtime, require overtime to be enabled and filled
        if (divisionId === -11 && sport.hasOvertime) {
            const overtimeIdx = divisions.findIndex(d => d.id === -10 || d.divisionType === 'OVERTIME');
            if (overtimeIdx === -1) return false;
            // Overtime must be explicitly enabled
            if (!hasOvertime) return false;
            const ot = divisions[overtimeIdx];
            if (ot.homeScore === null || ot.awayScore === null) return false;
        }

        return true;
    };

    // If overtime becomes unavailable (a previous score was cleared), clear and disable overtime automatically
    useEffect(() => {
        console.log('[MatchDetailsEditor] useEffect check', { divisions, hasOvertime, hasPenalties });
        const overtimeIdx = divisions.findIndex(d => d.id === -10 || d.divisionType === 'OVERTIME');
        if (overtimeIdx !== -1) {
            const available = isSpecialDivisionAvailable(-10);
            if (!available) {
                if (hasOvertime) {
                    setHasOvertime(false);
                }
                toggleSpecialDivision(-10, false);
            }
        }

        // Penalties auto-disable: if prerequisites are missing, clear and disable penalties
        const penaltiesIdx = divisions.findIndex(d => d.id === -11 || d.divisionType === 'PENALTIES');
        if (penaltiesIdx !== -1) {
            const availablePen = isSpecialDivisionAvailable(-11);
            if (!availablePen) {
                if (hasPenalties) setHasPenalties(false);
                toggleSpecialDivision(-11, false);
            }
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [divisions, hasOvertime, hasPenalties]);

    return (
        <div className="space-y-4 p-4 border rounded bg-gray-50 dark:bg-gray-900 dark:border-gray-800">
            <div className="grid grid-cols-3 gap-6">
                {divisions.map((d, i) => (
                    <div key={i} className="flex items-center gap-4">
                        {(i + 1 <= sport.minMatchDivisionsNumber) && (
                        <span className="block text-sm font-medium text-gray-700 mb-1">
                            {(d.id === -10 || d.divisionType === 'OVERTIME') ? 'Overtime' : (d.id === -11 || d.divisionType === 'PENALTIES') ? 'Penalties' : sport.divisionType.charAt(0).toUpperCase() + sport.divisionType.slice(1) + ' ' + d.divisionNumber}
                        </span>
                        ) || (
                        <span className="block text-sm font-medium text-gray-700 mb-1">
                            {(sport.hasOvertime || sport.hasPenalties) && (
                                <label className="flex items-center gap-2">
                                    <input
                                        type="checkbox"
                                        checked={(d.id === -10 || d.divisionType === 'OVERTIME') ? hasOvertime : (d.id === -11 || d.divisionType === 'PENALTIES') ? hasPenalties : false}
                                        onChange={(e) => {
                                            const checked = e.target.checked;
                                            const isOver = d.id === -10 || d.divisionType === 'OVERTIME';
                                            const isPen = d.id === -11 || d.divisionType === 'PENALTIES';
                                            if (isOver) {
                                                setHasOvertime(checked);
                                            } else if (isPen) {
                                                setHasPenalties(checked);
                                            }
                                            // call toggle with sentinel ids so toggleSpecialDivision can match by type or id
                                            toggleSpecialDivision(isOver ? -10 : isPen ? -11 : d.id, checked);
                                        }}
                                    />
                                    {(d.id === -10 || d.divisionType === 'OVERTIME') ? 'Overtime' : 'Penalties'}
                                </label>
                            ) || (
                                sport.divisionType.charAt(0).toUpperCase() + sport.divisionType.slice(1) + ' ' + d.divisionNumber
                            )}
                        </span>
                        )}

                        <input
                            type="number"
                            min="0"
                            value={d.homeScore ?? ''}
                            onChange={e => updateDivision(i, { homeScore: e.target.value === '' ? null : Number(e.target.value) })}
                            className="w-25 px-2 py-1 border rounded text-center bg-white"
                            placeholder="Home"
                            disabled={
                                ((d.id === -10 || d.divisionType === 'OVERTIME') && !hasOvertime) ||
                                ((d.id === -11 || d.divisionType === 'PENALTIES') && !hasPenalties)
                            }
                        />

                        <input
                            type="number"
                            min="0"
                            value={d.awayScore ?? ''}
                            onChange={e => updateDivision(i, { awayScore: e.target.value === '' ? null : Number(e.target.value) })}
                            className="w-25 px-2 py-1 border rounded text-center bg-white"
                            placeholder="Away"
                            disabled={
                                ((d.id === -10 || d.divisionType === 'OVERTIME') && !hasOvertime) ||
                                ((d.id === -11 || d.divisionType === 'PENALTIES') && !hasPenalties)
                            }
                        />
                    </div>
                ))}
            </div>
        </div>
    );
};

export default MatchDetailsEditor;