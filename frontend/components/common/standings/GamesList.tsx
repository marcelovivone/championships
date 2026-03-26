"use client";

import React from 'react';

type Game = {
  id: number;
  stadium: string;
  dateTime: string;
  home: { name: string; image?: string };
  away: { name: string; image?: string };
  status: string | null;
  score: string | null;
};

export default function GamesList({ games, isLoading, error, onRetry, showUserTimezone = false }: { games?: Game[]; isLoading?: boolean; error?: string | null; onRetry?: () => void; showUserTimezone?: boolean }) {
  const list = Array.isArray(games) ? games : [];

  const formatDateTime = (dateTime: string | null) => {
    if (!dateTime) return '';
    
    if (showUserTimezone) {
      // Show in user's current timezone - let JavaScript handle the conversion
      const date = new Date(dateTime);
      return date.toLocaleString(undefined, {
        day: '2-digit',
        month: '2-digit', 
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
      });
    } else {
      // Show as stored (match local time) - extract time from the stored value directly
      try {
        const date = new Date(dateTime);
        // Extract the date/time components and format without timezone conversion
        const year = date.getUTCFullYear();
        const month = String(date.getUTCMonth() + 1).padStart(2, '0');
        const day = String(date.getUTCDate()).padStart(2, '0');
        const hours = String(date.getUTCHours()).padStart(2, '0');
        const minutes = String(date.getUTCMinutes()).padStart(2, '0');
        
        return `${day}/${month}/${year}, ${hours}:${minutes}`;
      } catch (e) {
        return dateTime;
      }
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
                {g.home.image ? (
                  <div className="w-8 h-8 rounded-full overflow-hidden bg-white flex items-center justify-center p-0.5 flex-shrink-0">
                    <img src={g.home.image} alt={g.home.name} className="max-w-full max-h-full object-contain" />
                  </div>
                ) : (
                  <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-sm flex-shrink-0"> {g.home.name.charAt(0)}</div>
                )}
                <div className="text-sm min-w-0 flex-1">{g.home.name}</div>
              </div>

              <div className="w-16 flex-shrink-0 text-center">
                  <div>
                    <div className="text-gray-800 font-semibold text-xs">{g.status === 'Finished' ? g.score : '-'}</div>
                    {g.status && <div className="text-xs text-gray-500">{g.status}</div>}
                  </div>
              </div>

              <div className="flex items-center gap-3 justify-end flex-1 min-w-0 max-w-[40%]">
                <div className="text-sm text-right min-w-0 flex-1">{g.away.name}</div>
                {g.away.image ? (
                  <div className="w-8 h-8 rounded-full overflow-hidden bg-white flex items-center justify-center p-0.5 flex-shrink-0">
                    <img src={g.away.image} alt={g.away.name} className="max-w-full max-h-full object-contain" />
                  </div>
                ) : (
                  <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-sm flex-shrink-0">{g.away.name.charAt(0)}</div>
                )}
              </div>
            </div>
            {/* score/status shown inline between teams when available */}
          </div>
        ))}
      </div>
    </div>
  );
}
