'use client';

import Link from 'next/link';

const sports = [
  { id: 'football', name: 'Football' },
  { id: 'basketball', name: 'Basketball' },
  { id: 'futsal', name: 'Futsal' },
  { id: 'handball', name: 'Handball' },
  { id: 'ice-hockey', name: 'Ice Hockey' },
  { id: 'volleyball', name: 'Volleyball' },
];

export default function StandingsIndex() {
  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">Standings</h1>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {sports.map((s) => (
          <Link key={s.id} href={`/common/standings/${s.id}`} className="block p-4 bg-white rounded shadow hover:shadow-md">
            <h3 className="text-lg font-semibold">{s.name}</h3>
            <p className="text-sm text-gray-600 mt-2">View standings and games for {s.name}.</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
