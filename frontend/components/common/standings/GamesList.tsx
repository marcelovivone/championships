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

export default function GamesList({ games, isLoading, error, onRetry }: { games?: Game[]; isLoading?: boolean; error?: string | null; onRetry?: () => void }) {
  const list = Array.isArray(games) ? games : [];

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
                <span className="truncate">{g.dateTime ? new Date(g.dateTime).toLocaleString() : ''}</span>
              </div>
            </div>
            <div className="mt-2 flex flex-col sm:flex-row sm:items-center gap-3">
              <div className="flex items-center gap-3 flex-1 min-w-0">
                {g.home.image ? (
                  <div className="w-8 h-8 rounded-full overflow-hidden bg-white flex items-center justify-center p-0.5">
                    <img src={g.home.image} alt={g.home.name} className="max-w-full max-h-full object-contain" />
                  </div>
                ) : (
                  <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-sm"> {g.home.name.charAt(0)}</div>
                )}
                <div className="text-sm truncate">{g.home.name}</div>
              </div>

              <div className="w-20 flex-shrink-0 text-center">
                {g.score ? (
                  <div>
                    <div className="text-gray-800 font-semibold">{g.score}</div>
                    {g.status && <div className="text-xs text-gray-500">{g.status}</div>}
                  </div>
                ) : (
                  <div className="text-gray-400">X</div>
                )}
              </div>

              <div className="flex items-center gap-3 justify-end flex-1 min-w-0">
                <div className="text-sm text-right truncate">{g.away.name}</div>
                {g.away.image ? (
                  <div className="w-8 h-8 rounded-full overflow-hidden bg-white flex items-center justify-center p-0.5">
                    <img src={g.away.image} alt={g.away.name} className="max-w-full max-h-full object-contain" />
                  </div>
                ) : (
                  <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-sm">{g.away.name.charAt(0)}</div>
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
