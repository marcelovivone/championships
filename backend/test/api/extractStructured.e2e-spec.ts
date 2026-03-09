import { ApiService } from '../../src/api/api.service';

describe('ApiService.extractStructuredFromTransitional', () => {
  it('extracts firstRow and matches from sample payload', async () => {
    const api = new ApiService();

    // minimal sample mimicking api-football fixtures structure
    const sample = {
      response: [
        {
          league: { name: 'Premier League', season: 2024, country: 'England', flag: 'url://flag' },
          goals: { home: 2, away: 1 },
          score: { halftime: { home: 1, away: 0 } },
          teams: { home: { name: 'Team A' }, away: { name: 'Team B' } },
          fixture: { date: '2024-08-01', venue: { city: 'London', name: 'Stadium' }, status: { long: 'Match Finished', short: 'FT' }, timestamp: 1720000000 }
        }
      ]
    };

    // Spy getTransitional to return our sample
    jest.spyOn(api, 'getTransitional' as any).mockResolvedValue({ payload: sample });

    const res = await api.extractStructuredFromTransitional(1);

    expect(res).toHaveProperty('found', true);
    expect(res.firstRow['league.name']).toBe('Premier League');
    expect(res.firstRow['league.season']).toBe(2024);
    expect(res.firstRow['league.country']).toBe('England');
    expect(res.firstRow['league.flag']).toBe('url://flag');

    expect(Array.isArray(res.matches)).toBe(true);
    expect(res.matches[0]['teams.home.name']).toBe('Team A');
    expect(res.matches[0]['teams.away.name']).toBe('Team B');
    expect(res.matches[0]['goals.home']).toBe(2);
    expect(res.matches[0]['goals.away']).toBe(1);
    expect(res.matches[0]['fixture.venue.city']).toBe('London');
  });
});
