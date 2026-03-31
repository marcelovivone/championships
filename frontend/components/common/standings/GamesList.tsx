"use client";

import React from 'react';

// IANA timezone per country — same list as the backend's COUNTRY_TIMEZONES map
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

/**
 * Dates are stored in the DB as "match local time treated as UTC".
 * e.g. a Brazilian match at 19:30 local time is stored as 2026-04-01T19:30:00Z
 * instead of the true UTC value 2026-04-01T22:30:00Z.
 *
 * To convert to the user's browser timezone we must:
 *   1. Read the stored UTC value (which encodes the local clock time).
 *   2. Find what the match timezone's clock shows for that UTC moment.
 *   3. The difference tells us how far the stored value is from true UTC.
 *   4. Apply that correction to get the true UTC instant.
 *   5. Display that true UTC instant in the browser's local timezone.
 */
function storedLocalToUserTimezone(dateTime: string, matchTimezone: string): string {
  const storedDate = new Date(dateTime);

  // What does matchTimezone's clock show for the stored UTC value?
  const tzParts = new Intl.DateTimeFormat('en-US', {
    timeZone: matchTimezone,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(storedDate);

  const tzHour = parseInt(tzParts.find(p => p.type === 'hour')?.value ?? '0', 10);
  const tzMin  = parseInt(tzParts.find(p => p.type === 'minute')?.value ?? '0', 10);

  const storedHour = storedDate.getUTCHours();
  const storedMin  = storedDate.getUTCMinutes();

  // Correction in minutes: shift the stored date to the true UTC instant.
  // Normalise to [-14h, +14h] to handle day-boundary wraps gracefully.
  let diffMins = (storedHour - tzHour) * 60 + (storedMin - tzMin);
  if (diffMins < -14 * 60) diffMins += 24 * 60;
  if (diffMins >  14 * 60) diffMins -= 24 * 60;

  const trueUtcDate = new Date(storedDate.getTime() + diffMins * 60 * 1000);

  return trueUtcDate.toLocaleString(undefined, {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

type Game = {
  id: number;
  stadium: string;
  dateTime: string;
  home: { name: string; image?: string };
  away: { name: string; image?: string };
  status: string | null;
  score: string | null;
};

export default function GamesList({
  games,
  isLoading,
  error,
  onRetry,
  showUserTimezone = false,
  matchCountry,
}: {
  games?: Game[];
  isLoading?: boolean;
  error?: string | null;
  onRetry?: () => void;
  showUserTimezone?: boolean;
  /** Country name of the league (e.g. "Brazil") — used to derive the match timezone */
  matchCountry?: string;
}) {
  const list = Array.isArray(games) ? games : [];
  const matchTimezone = matchCountry ? (COUNTRY_TIMEZONES[matchCountry] ?? null) : null;

  const formatDateTime = (dateTime: string | null) => {
    if (!dateTime) return '';

    if (showUserTimezone && matchTimezone) {
      // Dates are stored as match-local time with a UTC marker.
      // Reinterpret through the match timezone to get the true UTC instant,
      // then display in the user's browser timezone.
      try {
        return storedLocalToUserTimezone(dateTime, matchTimezone);
      } catch {
        // fall through to UTC display on any error
      }
    }

    // Default: show the stored value as-is (match local time)
    try {
      const date = new Date(dateTime);
      const year  = date.getUTCFullYear();
      const month = String(date.getUTCMonth() + 1).padStart(2, '0');
      const day   = String(date.getUTCDate()).padStart(2, '0');
      const hours = String(date.getUTCHours()).padStart(2, '0');
      const mins  = String(date.getUTCMinutes()).padStart(2, '0');
      return `${day}/${month}/${year}, ${hours}:${mins}`;
    } catch {
      return dateTime;
    }
  };

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow overflow-hidden p-4">
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-12 bg-gray-200 rounded animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg shadow overflow-hidden p-4">
        <div className="text-sm text-red-600">{error}</div>
        {onRetry && (
          <button onClick={onRetry} className="mt-3 inline-block px-3 py-1 bg-blue-600 text-white rounded">Retry</button>
        )}
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      <div>
        {list.map((g) => (
          <div key={g.id} className="px-4 py-3 pt-4 pb-4 border-b border-gray-100">
            <div className="text-sm text-gray-500 text-center">
              <div className="inline-flex items-center justify-center gap-3">
                <span className="truncate">{g.stadium}</span>
                <span className="text-gray-300">·</span>
                <span className="truncate">{formatDateTime(g.dateTime)}</span>
              </div>
            </div>
            <div className="mt-2 flex flex-col sm:flex-row sm:items-center gap-3">
              <div className="flex items-center gap-3 flex-1 min-w-0 max-w-[40%]">
                <div className="text-sm min-w-0 flex-1 text-right">{g.home.name}</div>
                {g.home.image ? (
                  <div className="w-8 h-8 rounded-full overflow-hidden bg-white flex items-center justify-center p-0.5 flex-shrink-0">
                    <img src={g.home.image} alt={g.home.name} className="max-w-full max-h-full object-contain" />
                  </div>
                ) : (
                  <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-sm flex-shrink-0"> {g.home.name.charAt(0)}</div>
                )}
              </div>

              <div className="w-16 flex-shrink-0 text-center">
                  <div>
                    <div className="text-gray-800 font-semibold text-xs">{g.status === 'Finished' ? g.score : '-'}</div>
                    {g.status && <div className="text-xs text-gray-500">{g.status}</div>}
                  </div>
              </div>

              <div className="flex items-center gap-3 justify-end flex-1 min-w-0 max-w-[40%]">
                {g.away.image ? (
                    <div className="w-8 h-8 rounded-full overflow-hidden bg-white flex items-center justify-center p-0.5 flex-shrink-0">
                    <img src={g.away.image} alt={g.away.name} className="max-w-full max-h-full object-contain" />
                  </div>
                ) : (
                    <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-sm flex-shrink-0">{g.away.name.charAt(0)}</div>
                )}
                <div className="text-sm min-w-0 flex-1 text-left">{g.away.name}</div>
              </div>
            </div>
            {/* score/status shown inline between teams when available */}
          </div>
        ))}
      </div>
    </div>
  );
}
