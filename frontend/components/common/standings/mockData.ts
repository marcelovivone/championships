export const mockStandings = [
  {
    position: 1,
    teamName: 'Club C',
    pts: 18,
    pl: 6,
    w: 6,
    d: 0,
    l: 0,
    gf: 12,
    ga: 5,
    gd: 7,
    pct: 100,
    last5: ['W','W','W','W','W'],
    last10: { w: 8, d: 1, l: 1 },
  },
  {
    position: 2,
    teamName: 'Club X',
    pts: 18,
    pl: 7,
    w: 6,
    d: 0,
    l: 1,
    gf: 10,
    ga: 3,
    gd: 7,
    pct: 85,
    last5: ['W','W','W','D','W'],
    last10: { w: 7, d: 2, l: 1 },
  },
  {
    position: 3,
    teamName: 'Club K',
    pts: 15,
    pl: 7,
    w: 5,
    d: 0,
    l: 2,
    gf: 11,
    ga: 8,
    gd: 3,
    pct: 71,
    last5: ['W','L','W','W','W'],
    last10: { w: 6, d: 2, l: 2 },
  },
];

export const mockGames = [
  {
    id: 1,
    stadium: 'Stadium A',
    dateTime: '2026-03-06T16:00:00',
    home: { name: 'Club C' },
    away: { name: 'Club X' },
    status: 'FT',
    score: '2 x 1',
  },
  {
    id: 2,
    stadium: 'Stadium B',
    dateTime: '2026-03-06T18:30:00',
    home: { name: 'Club K' },
    away: { name: 'Club P' },
    status: 'NS',
    score: null,
  },
];

export const mockSports = [
  { id: 'football', name: 'Football' },
  { id: 'basketball', name: 'Basketball' },
];

export const mockLeagues = [
  { id: 'league-a', name: 'League A', sportId: 'football' },
  { id: 'league-b', name: 'League B', sportId: 'football' },
  { id: 'bb-league', name: 'Basketball League', sportId: 'basketball' },
];

export const mockSeasons = [
  { id: '2026', name: '2026', leagueId: 'league-a' },
  { id: '2025', name: '2025', leagueId: 'league-a' },
  { id: '2026-b', name: '2026', leagueId: 'league-b' },
  { id: '2026-bb', name: '2026', leagueId: 'bb-league' },
];
