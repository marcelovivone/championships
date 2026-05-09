const mockQuery = jest.fn();
const mockRelease = jest.fn();
const mockEnd = jest.fn();

jest.mock('pg', () => ({
  Pool: jest.fn().mockImplementation(() => ({
    connect: async () => ({
      query: mockQuery,
      release: mockRelease,
    }),
    end: mockEnd,
  })),
}));

import { ApiService } from '../../src/api/api.service';

describe('ApiService.applyAllRowsToApp', () => {
  beforeEach(() => {
    process.env.DATABASE_URL = 'postgres://test-db';
    mockQuery.mockReset();
    mockRelease.mockReset();
    mockEnd.mockReset();
    mockRelease.mockImplementation(() => undefined);
    mockEnd.mockResolvedValue(undefined);
  });

  afterAll(() => {
    delete process.env.DATABASE_URL;
  });

  it('updates a finished subsequent-load ESPN match when the stored score changed', async () => {
    const api = new ApiService();

    (api as any).getTransitional = jest.fn().mockResolvedValue({
      id: 143,
      league: 'eng.1',
      season: 2025,
      origin: 'Api-Espn',
      payload: {},
      fetch_status: 'done',
      flg_has_divisions: true,
      flg_has_groups: false,
      flg_run_in_background: false,
      league_schedule_type: 'Round',
    });
    (api as any).extractLeagueMetadata = jest.fn().mockReturnValue({
      leagueName: 'English Premier League',
      leagueSeason: 2025,
    });
    (api as any).parseTransitionalEspnLightweight = jest.fn().mockReturnValue({
      found: true,
      rows: [
        {
          origin_api_id: '740926',
          'fixture.date': '2026-04-27T20:00:00Z',
          'goals.home': 2,
          'goals.away': 1,
          'season.phase': 'Regular',
          'season.phase_detail': 'Regular',
        },
      ],
    });
    (api as any).getDraftEntityMappings = jest.fn().mockResolvedValue({});
    (api as any).createMatchDivisions = jest.fn().mockResolvedValue({
      created: 2,
      hasLinescores: true,
    });
    (api as any).isParsedFixtureFinished = jest.fn().mockReturnValue(true);

    mockQuery.mockImplementation(async (sql: string) => {
      if (sql.includes('CREATE TABLE IF NOT EXISTS api_import_log')) {
        return { rows: [] };
      }
      if (sql.includes('CREATE TABLE IF NOT EXISTS api_transitional_audit')) {
        return { rows: [] };
      }
      if (sql.includes('SELECT id FROM leagues')) {
        return { rows: [{ id: 48 }] };
      }
      if (sql.includes('SELECT c.name FROM leagues l LEFT JOIN countries c')) {
        return { rows: [{ name: 'England' }] };
      }
      if (sql.includes('SELECT id FROM seasons WHERE sport_id = $1 AND league_id = $2 AND start_year = $3')) {
        return { rows: [{ id: 34 }] };
      }
      if (sql.includes('SELECT COUNT(*)::int as cnt FROM rounds WHERE league_id = $1 AND season_id = $2')) {
        return { rows: [{ cnt: 1 }] };
      }
      if (sql.includes('SELECT column_name, is_nullable FROM information_schema.columns WHERE table_name = $1')) {
        return {
          rows: [
            { column_name: 'origin_api_id', is_nullable: 'YES' },
            { column_name: 'season_phase', is_nullable: 'YES' },
            { column_name: 'season_phase_detail', is_nullable: 'YES' },
            { column_name: 'home_club_id', is_nullable: 'NO' },
            { column_name: 'away_club_id', is_nullable: 'NO' },
            { column_name: 'home_score', is_nullable: 'YES' },
            { column_name: 'away_score', is_nullable: 'YES' },
          ],
        };
      }
      if (sql.includes('SELECT country_id FROM leagues WHERE id = $1 LIMIT 1')) {
        return { rows: [{ country_id: 1 }] };
      }
      if (sql === 'BEGIN') {
        return { rows: [] };
      }
      if (sql.includes('SELECT id, status, round_id, home_club_id, away_club_id, home_score, away_score FROM matches')) {
        return {
          rows: [
            {
              id: 9245,
              status: 'Finished',
              round_id: 925,
              home_club_id: 501,
              away_club_id: 502,
              home_score: 2,
              away_score: 2,
            },
          ],
        };
      }
      if (sql.startsWith('UPDATE matches SET status = $1')) {
        return { rows: [] };
      }
      if (sql.startsWith('DELETE FROM match_divisions WHERE match_id = $1')) {
        return { rows: [] };
      }
      if (sql.includes('SELECT COUNT(*)::int as cnt FROM standings WHERE match_id = $1')) {
        return { rows: [{ cnt: 1 }] };
      }
      if (sql.includes('INSERT INTO api_transitional_audit')) {
        return { rows: [] };
      }
      if (sql === 'ROLLBACK') {
        return { rows: [] };
      }

      throw new Error(`Unexpected SQL in test: ${sql}`);
    });

    const result = await api.applyAllRowsToApp(143, { sportId: 36, dryRun: true });

    expect(result).toMatchObject({
      applied: 1,
      createdDivisions: 2,
      skippedUnchanged: 0,
      updatedMatches: 1,
      dryRun: true,
      isSubsequentLoad: true,
    });

    const updateCall = mockQuery.mock.calls.find(
      ([sql]) => typeof sql === 'string' && sql.startsWith('UPDATE matches SET status = $1'),
    );

    expect(updateCall).toBeDefined();
    expect(updateCall?.[1]).toEqual([
      'Finished',
      2,
      1,
      '2026-04-27 20:00:00',
      'Regular',
      'Regular',
      9245,
    ]);
    expect((api as any).createMatchDivisions).toHaveBeenCalledWith(
      expect.anything(),
      36,
      9245,
      expect.objectContaining({ origin_api_id: '740926' }),
      true,
    );
    expect(mockRelease).toHaveBeenCalledTimes(1);
    expect(mockEnd).toHaveBeenCalledTimes(1);
  });
});