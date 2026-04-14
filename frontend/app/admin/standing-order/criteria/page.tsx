'use client';

const CRITERIA = [
  { category: 'Overall Stats', items: [
    { id: 'POINTS', desc: 'League points from results', direction: 'desc', source: 'standings.points' },
    { id: 'WINS', desc: 'Total wins', direction: 'desc', source: 'standings.wins' },
    { id: 'WIN_PCT', desc: 'Win percentage (wins / played)', direction: 'desc', source: 'standings.wins / standings.played' },
    { id: 'GOAL_DIFFERENCE', desc: 'Goals scored minus goals conceded', direction: 'desc', source: 'standings.goalsFor - standings.goalsAgainst' },
    { id: 'GOALS_FOR', desc: 'Total goals / points scored', direction: 'desc', source: 'standings.goalsFor' },
    { id: 'GOALS_AGAINST', desc: 'Total goals / points conceded (fewer is better)', direction: 'asc', source: 'standings.goalsAgainst' },
    { id: 'AWAY_GOALS_FOR', desc: 'Goals scored in away matches', direction: 'desc', source: 'standings.awayGoalsFor' },
    { id: 'LOSSES', desc: 'Total losses (fewer is better)', direction: 'asc', source: 'standings.losses' },
    { id: 'DRAWS', desc: 'Total draws', direction: 'desc', source: 'standings.draws' },
    { id: 'GAMES_PLAYED', desc: 'Total games played', direction: 'desc', source: 'standings.played' },
  ]},
  { category: 'Head-to-Head', items: [
    { id: 'H2H_POINTS', desc: 'Points in matches between the tied clubs only', direction: 'desc', source: 'computed from mutual matches' },
    { id: 'H2H_GOAL_DIFFERENCE', desc: 'Goal difference in mutual matches', direction: 'desc', source: 'computed from mutual matches' },
    { id: 'H2H_GOALS_FOR', desc: 'Goals scored in mutual matches', direction: 'desc', source: 'computed from mutual matches' },
    { id: 'H2H_AWAY_GOALS', desc: 'Away goals scored in mutual matches', direction: 'desc', source: 'computed from mutual matches' },
    { id: 'H2H_WINS', desc: 'Wins in mutual matches', direction: 'desc', source: 'computed from mutual matches' },
    { id: 'H2H_WIN_PCT', desc: 'Win percentage in mutual matches', direction: 'desc', source: 'computed from mutual matches' },
  ]},
  { category: 'Ice Hockey Specific', items: [
    { id: 'REGULATION_WINS', desc: 'Wins decided in regulation time (no OT or SO)', direction: 'desc', source: 'standings.regulationWins' },
    { id: 'REGULATION_OT_WINS', desc: 'Wins in regulation or overtime (excludes shootout)', direction: 'desc', source: 'standings.regulationOtWins' },
    { id: 'OT_WINS', desc: 'Wins decided in overtime', direction: 'desc', source: 'derived from match divisions' },
    { id: 'PENALTY_WINS', desc: 'Wins decided in penalty shootout', direction: 'desc', source: 'derived from match divisions' },
  ]},
  { category: 'Volleyball / Set-Based', items: [
    { id: 'SET_RATIO', desc: 'Ratio of sets won to sets lost', direction: 'desc', source: 'derived from match divisions' },
    { id: 'POINT_RATIO', desc: 'Ratio of points won to points lost across all sets', direction: 'desc', source: 'derived from set scores' },
    { id: 'NET_POINTS', desc: 'Total points scored minus total points conceded', direction: 'desc', source: 'derived from set scores' },
  ]},
  { category: 'Fallback', items: [
    { id: 'CLUB_ID', desc: 'Alphabetical / Club ID order (ensures deterministic result)', direction: 'asc', source: 'clubs.id' },
  ]},
];

export default function CriteriaReferencePage() {
  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Criteria Reference</h1>
      </div>
      <p className="text-gray-600 mb-6">
        All available tiebreaker criteria that can be used in standing order rules. Each criterion defines how to compare clubs when they have equal values on the previous criterion.
      </p>
      {CRITERIA.map(group => (
        <div key={group.category} className="mb-6">
          <h2 className="text-xl font-semibold mb-3">{group.category}</h2>
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left px-4 py-2 font-medium">Criterion ID</th>
                  <th className="text-left px-4 py-2 font-medium">Description</th>
                  <th className="text-left px-4 py-2 font-medium w-24">Default Dir.</th>
                  <th className="text-left px-4 py-2 font-medium">Data Source</th>
                </tr>
              </thead>
              <tbody>
                {group.items.map(item => (
                  <tr key={item.id} className="border-t">
                    <td className="px-4 py-2 font-mono text-blue-700">{item.id}</td>
                    <td className="px-4 py-2">{item.desc}</td>
                    <td className="px-4 py-2">
                      <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${item.direction === 'desc' ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'}`}>
                        {item.direction === 'desc' ? '↓ DESC' : '↑ ASC'}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-gray-500 text-xs font-mono">{item.source}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ))}
    </div>
  );
}
