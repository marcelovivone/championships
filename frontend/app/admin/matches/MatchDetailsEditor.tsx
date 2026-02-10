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
          setDivisions(fetchedDivisions);
          setHasOvertime(fetchedDivisions.some((d: MatchDivision) => d.divisionType === 'OVERTIME'));
          setHasPenalties(fetchedDivisions.some((d: MatchDivision) => d.divisionType === 'PENALTIES'));
          onChange(fetchedDivisions); // Update parent component with loaded data
        })
        .catch((error: any) => {
          console.error('Error fetching match divisions:', error);
        });
    } else {
      // For new matches, initialize with the value prop
      setDivisions(value);
    }
  }, [matchId]); // Only run when matchId changes

  // Sync local state with parent value safely
  useEffect(() => {
    const valueJson = JSON.stringify(value);
    console.log('valueJson', valueJson);
    const divisionsJson = JSON.stringify(divisions);
    console.log('divisionsJson', divisionsJson);
    if (valueJson !== divisionsJson) {
        console.log('valueJson !== divisionsJson');
      setDivisions(value);
      setHasOvertime(value.some(d => d.divisionType === 'OVERTIME'));
      setHasPenalties(value.some(d => d.divisionType === 'PENALTIES'));
    }
  }, [value, divisions]);

  // Update a division and notify parent
  const updateDivision = (index: number, updatedDivision: Partial<MatchDivision>) => {
    const newDivisions = [...divisions];
    newDivisions[index] = { ...newDivisions[index], ...updatedDivision };
    setDivisions(newDivisions);
    onChange(newDivisions);
  };

  // Add a new regular division
  const addDivision = () => {
    if (divisions.length < sport.maxMatchDivisionsNumber) {
      const newDivision: MatchDivision = {
        id: -1, // Temporary ID for new divisions that haven't been saved yet
        matchId: 0,
        divisionNumber: divisions.length + 1,
        homeScore: null,
        awayScore: null,
        divisionType: 'REGULAR',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      const newDivisions = [...divisions, newDivision];
      setDivisions(newDivisions);
      onChange(newDivisions);
    }
  };

  // Add or remove special divisions (Overtime / Penalties)
  const toggleSpecialDivision = (type: 'OVERTIME' | 'PENALTIES', enabled: boolean) => {
    if (enabled) {
      // Only add if it doesn't exist
      if (!divisions.some(d => d.divisionType === type)) {
        const newDivision: MatchDivision = {
          id: -1, // Temporary ID for new divisions that haven't been saved yet
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
    <div className="space-y-4"> 
        {matchId === 0 ? (
        <>
         {divisions.map((d, i) => (
            <div key={i} className="flex items-center gap-4">
            <span className="w-28 font-medium">
                {sport.divisionType.charAt(0).toUpperCase() + sport.divisionType.slice(1)} {d.divisionNumber}
            </span>

            <input
                type="number"
                placeholder="Home"
                value={d.homeScore ?? ''}
                onChange={e => updateDivision(i, { homeScore: e.target.value === '' ? null : Number(e.target.value) })}
                className="w-20 border rounded px-2 py-1"
            />

            <input
                type="number"
                placeholder="Away"
                value={d.awayScore ?? ''}
                onChange={e => updateDivision(i, { awayScore: e.target.value === '' ? null : Number(e.target.value) })}
                className="w-20 border rounded px-2 py-1"
                />

            <select
                value={d.divisionType}
                onChange={e => updateDivision(i, { divisionType: e.target.value as MatchDivision['divisionType'] })}
                className="border rounded px-2 py-1"
            >
                <option value="REGULAR">Regular</option>
                {sport.hasOvertime && <option value="OVERTIME">Overtime</option>}
                {sport.hasPenalties && <option value="PENALTIES">Penalties</option>}
            </select>
            </div>
        ))}

        {sport.hasOvertime && (
            <label className="flex items-center gap-2">
            <input
                type="checkbox"
                checked={hasOvertime}
                onChange={(e) => {
                    setHasOvertime(e.target.checked);
                    toggleSpecialDivision('OVERTIME', e.target.checked);
                }}
                />
            Overtime
            </label>
        )}

        {sport.hasPenalties && (
            <label className="flex items-center gap-2">
            <input
                type="checkbox"
                checked={hasPenalties}
                onChange={(e) => {
                    setHasPenalties(e.target.checked);
                    toggleSpecialDivision('PENALTIES', e.target.checked);
                }}
            />
            Penalties
            </label>
        )}

        <button
            onClick={addDivision}
            className="px-4 py-2 bg-blue-500 text-white rounded"
        >
            Add Division
        </button>
        </>
        ) : (    
        // Editable form for existing match
        <>
           {divisions.map((d, i) => (
            <div key={d.id || i} className="flex items-center gap-4">
              <span className="w-28 font-medium">
                {sport.divisionType.charAt(0).toUpperCase() + sport.divisionType.slice(1)} {d.divisionNumber}
              </span>

              <input
                type="number"
                placeholder="Home"
                value={d.homeScore ?? ''}
                onChange={e => updateDivision(i, { homeScore: e.target.value === '' ? null : Number(e.target.value) })}
                className="w-20 border rounded px-2 py-1"
              />

              <input
                type="number"
                placeholder="Away"
                value={d.awayScore ?? ''}
                onChange={e => updateDivision(i, { awayScore: e.target.value === '' ? null : Number(e.target.value) })}
                className="w-20 border rounded px-2 py-1"
              />

              <select
                value={d.divisionType}
                onChange={e => updateDivision(i, { divisionType: e.target.value as MatchDivision['divisionType'] })}
                className="border rounded px-2 py-1"
              >
                <option value="REGULAR">Regular</option>
                {sport.hasOvertime && <option value="OVERTIME">Overtime</option>}
                {sport.hasPenalties && <option value="PENALTIES">Penalties</option>}
              </select>
            </div>
          ))}

          {sport.hasOvertime && (
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={hasOvertime}
                onChange={(e) => {
                  setHasOvertime(e.target.checked);
                  toggleSpecialDivision('OVERTIME', e.target.checked);
                }}
              />
              Overtime
            </label>
          )}

          {sport.hasPenalties && (
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={hasPenalties}
                onChange={(e) => {
                  setHasPenalties(e.target.checked);
                  toggleSpecialDivision('PENALTIES', e.target.checked);
                }}
              />
              Penalties
            </label>
          )}

          <button
            onClick={addDivision}
            className="px-4 py-2 bg-blue-500 text-white rounded"
          >
            Add Division
          </button>
       </>
        )}
    </div>
  );
};

export default MatchDetailsEditor;
