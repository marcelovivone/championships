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
        value.some(d => d.divisionType === 'OVERTIME')
    );
    const [hasPenalties, setHasPenalties] = useState(
        value.some(d => d.divisionType === 'PENALTIES')
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
                            fetchedDivisions.some(d => d.divisionType === 'OVERTIME')
                        );
                        setHasPenalties(
                            fetchedDivisions.some(d => d.divisionType === 'PENALTIES')
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

    // Sync local state with parent value safely
    useEffect(() => {
        const valueJson = JSON.stringify(value);
        const divisionsJson = JSON.stringify(divisions);
        if (valueJson !== divisionsJson) {
            setDivisions(value);
            setHasOvertime(value.some(d => d.divisionType === 'OVERTIME'));
            setHasPenalties(value.some(d => d.divisionType === 'PENALTIES'));
        }
    }, [value, divisions]);

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

    // Add or remove special divisions (Overtime / Penalties)
    const toggleSpecialDivision = (type: 'OVERTIME' | 'PENALTIES', enabled: boolean) => {
        if (enabled) {
            // Only add if it doesn't exist
            if (!divisions.some(d => d.divisionType === type)) {
                const newDivision: MatchDivision = {
                    id: type === 'OVERTIME' ? -10 : -11, // Temporary ID for new divisions that haven't been saved yet
                    matchId: 0,
                    divisionNumber: divisions.length + 1,
                    homeScore: null,
                    awayScore: null,
                    divisionType: type,
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                };
                const newDivisions = [...divisions, newDivision];
                setDivisions(newDivisions);
                onChange(newDivisions);
            }
        } else {
            const newDivisions = divisions.filter(d => d.divisionType !== type);
            setDivisions(newDivisions);
            onChange(newDivisions);
        }
    };

    return (
        <div className="space-y-4 p-4 border rounded bg-gray-50 dark:bg-gray-900 dark:border-gray-800">
            <div className="grid grid-cols-3 gap-6">
                {divisions.map((d, i) => (
                    <div key={i} className="flex items-center gap-4">
                        {(i + 1 <= sport.minMatchDivisionsNumber) && (
                        <span className="block text-sm font-medium text-gray-700 mb-1">
                            {d.id === -10 ? 'Overtime' : d.id === -11 ? 'Penalties' : sport.divisionType.charAt(0).toUpperCase() + sport.divisionType.slice(1) + ' ' + d.divisionNumber}
                        </span>
                        ) || (
                        <span className="block text-sm font-medium text-gray-700 mb-1">
                            {(sport.hasOvertime || sport.hasPenalties) && (
                                <label className="flex items-center gap-2">
                                    <input
                                        type="checkbox"
                                        checked={d.id === -10 ? hasOvertime : hasPenalties}
                                        onChange={(e) => {
                                            if (d.id === -10) {
                                                setHasOvertime(e.target.checked);
                                            } else {
                                                setHasPenalties(e.target.checked);
                                            }
                                            toggleSpecialDivision(d.id === -10 ? 'OVERTIME' : 'PENALTIES', e.target.checked);
                                        }}
                                    />
                                    {d.id === -10 ? 'Overtime' : 'Penalties'}
                                </label>
                            ) || (
                                sport.divisionType.charAt(0).toUpperCase() + sport.divisionType.slice(1) + ' ' + d.divisionNumber
                            )}
                        </span>
                        )}
                        <input
                            type="number"
                            value={d.homeScore ?? ''}
                            onChange={e => updateDivision(i, { homeScore: e.target.value === '' ? null : Number(e.target.value) })}
                            className="w-25 px-2 py-1 border rounded text-center bg-white"
                            placeholder="Home"
                        />

                        <input
                            type="number"
                            value={d.awayScore ?? ''}
                            onChange={e => updateDivision(i, { awayScore: e.target.value === '' ? null : Number(e.target.value) })}
                            className="w-25 px-2 py-1 border rounded text-center bg-white"
                            placeholder="Away"
                        />
                    </div>
                ))}
            </div>
        </div>
    );
};

export default MatchDetailsEditor;