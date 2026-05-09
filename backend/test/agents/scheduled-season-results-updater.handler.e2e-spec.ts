import { ScheduledSeasonResultsUpdaterHandler } from '../../src/agents/season-results-updater/season-results-updater.handler';

describe('ScheduledSeasonResultsUpdaterHandler', () => {
  it('builds a deterministic dry-run plan for an active season', async () => {
    const activeSeason = {
      id: 80,
      sportId: 1,
      leagueId: 10,
      startYear: 2025,
      endYear: 2026,
      status: 'active',
      flgDefault: true,
      numberOfGroups: 0,
      flgHasPostseason: false,
      currentPhase: 'Regular',
      currentPhaseDetail: 'Regular',
      sport: { id: 1, name: 'Football' },
      league: { id: 10, originalName: 'English Premier League', secondaryName: 'Premier League' },
    };

    const localMatches = [
      {
        id: 5001,
        roundId: 5,
        date: new Date('2026-04-29T19:00:00.000Z'),
        status: 'Finished',
        seasonPhase: 'Regular',
        seasonPhaseDetail: 'Regular',
        homeScore: 2,
        awayScore: 1,
        league: { originalName: 'Premier League' },
        round: { roundNumber: 5 },
        homeClub: { shortName: 'ARS', name: 'Arsenal' },
        awayClub: { shortName: 'CHE', name: 'Chelsea' },
      },
      {
        id: 5002,
        roundId: 6,
        date: new Date('2026-05-02T14:00:00.000Z'),
        status: 'Scheduled',
        seasonPhase: 'Regular',
        seasonPhaseDetail: 'Regular',
        homeScore: null,
        awayScore: null,
        league: { originalName: 'Premier League' },
        round: { roundNumber: 6 },
        homeClub: { shortName: 'LIV', name: 'Liverpool' },
        awayClub: { shortName: 'MCI', name: 'Manchester City' },
      },
    ];

    const dryRunResult = {
      applied: 38,
      createdMatches: 0,
      updatedMatches: 1,
      createdStandings: 2,
      createdDivisions: 3,
      createdRounds: 0,
      skippedUnchanged: 37,
      dryRun: true,
      isSubsequentLoad: true,
      enrichmentQueued: 0,
    };

    const seasonsService = {
      findAll: jest.fn().mockResolvedValue([activeSeason]),
      getEspnExtractionSettingsBySeasonIds: jest.fn().mockResolvedValue({
        80: {
          seasonId: 80,
          seasonStatus: 'Active',
          isSeasonDefault: true,
          isLeagueDefault: true,
          externalLeagueCode: 'eng.1',
          startDate: '2025-08-01',
          endDate: '2026-05-31',
          sameYears: false,
          hasPostseason: false,
          scheduleType: 'Round',
          hasGroups: false,
          numberOfGroups: 0,
          hasDivisions: false,
          runInBackground: true,
          inferClubs: true,
          isConfigured: true,
        },
      }),
    };
    const matchesService = {
      findByLeagueAndSeason: jest.fn().mockResolvedValue(localMatches),
    };
    const standingsService = {
      findByLeagueIdAndSeasonIdAndRoundId: jest.fn().mockResolvedValue([{ clubId: 1 }, { clubId: 2 }]),
      findByLeagueIdAndSeasonIdAndMatchDate: jest.fn(),
    };
    const transitionalRows = [
      {
        id: 101,
        league: 'eng.1',
        season: 2025,
        sport: 1,
        origin: 'Api-Espn',
        source_url: 'https://site.api.espn.com/apis/site/v2/sports/soccer/eng.1/scoreboard?dates=20250801-20260531&limit=1000',
        status: false,
        fetched_at: new Date('2026-04-30T08:00:00.000Z'),
        fetch_status: 'done',
        season_status: 'active',
        flg_season_default: true,
        flg_season_same_years: false,
        league_schedule_type: 'Round',
        flg_league_default: true,
        flg_has_divisions: false,
        flg_has_groups: false,
        number_of_groups: 0,
        flg_run_in_background: false,
        flg_infer_clubs: true,
        flg_has_postseason: false,
      },
    ];
    const apiService = {
      listTransitional: jest.fn().mockImplementation(async () => [...transitionalRows]),
      getTransitional: jest.fn().mockImplementation(async (id: number) => {
        if (id === 101 || id === 202) {
          return {
            origin: 'Api-Espn',
            payload: {
              leagues: [{ name: 'Premier League', abbreviation: 'EPL' }],
            },
          };
        }
        return null;
      }),
      fetchAndStore: jest.fn().mockImplementation(async () => {
        const freshRow = {
          ...transitionalRows[0],
          id: 202,
          fetched_at: new Date('2026-04-30T10:00:00.000Z'),
        };
        transitionalRows.unshift(freshRow);
        return { id: 202, fetched_at: freshRow.fetched_at };
      }),
      applyAllRowsToApp: jest.fn().mockResolvedValue(dryRunResult),
    };

    const handler = new ScheduledSeasonResultsUpdaterHandler(
      seasonsService as any,
      matchesService as any,
      standingsService as any,
      apiService as any,
    );

    const context = {
      agentKey: 'scheduled-season-results-updater',
      mode: 'dry-run',
      triggerType: 'manual',
      triggerSource: 'spec:manual',
      startedAt: new Date('2026-04-30T10:00:00.000Z'),
    };

    const firstRun = await handler.run(context as any);
    const secondRun = await handler.run(context as any);

    expect(firstRun.status).toBe('completed');
    expect(firstRun.actions).toHaveLength(2);
    expect(firstRun.actions[0]).toMatchObject({
      actionKey: 'season-plan-80',
      kind: 'read',
      writeDisposition: 'read-only',
    });
    expect(firstRun.actions[1]).toMatchObject({
      actionKey: 'apply-season-results-80',
      kind: 'write',
      writeDisposition: 'approval-required',
      requiresApproval: true,
      targetType: 'season',
      targetId: '80',
      payload: {
        executor: 'scheduled-season-results-updater.apply-season-plan',
        transitionalId: 202,
        sportId: 1,
        leagueId: 10,
        seasonId: 80,
        seasonPhase: 'Regular',
        currentPhaseDetail: 'Regular',
      },
    });
    expect(typeof firstRun.actions[1].generatedArtifactPath).toBe('string');

    const firstCandidates = (firstRun.result as any).candidates;
    const secondCandidates = (secondRun.result as any).candidates;

    expect(firstCandidates).toEqual(secondCandidates);
    expect(firstCandidates[0]).toMatchObject({
      seasonId: 80,
      state: 'planned-update',
      currentPhase: 'Regular',
      standingsSnapshot: {
        basis: 'round',
        reference: 5,
        rowCount: 2,
      },
      transitionalSource: {
        id: 202,
        parsedLeagueName: 'Premier League',
        matchedBy: 'league-name',
      },
      plan: {
        hasChanges: true,
        proposedMatchUpdates: 1,
        proposedNewMatches: 0,
        proposedStandingsWrites: 2,
        proposedDivisionWrites: 3,
        proposedRoundCreates: 0,
        skippedUnchanged: 37,
        downstreamRecalculationNeeded: true,
      },
    });
    expect((firstRun.result as any).totals).toMatchObject({
      evaluatedSeasons: 1,
      matchedTransitionalLoads: 1,
      seasonsWithChanges: 1,
      proposedMatchUpdates: 1,
      proposedNewMatches: 0,
      proposedStandingsWrites: 2,
    });
    expect(firstRun.warnings).toBeUndefined();
    expect(apiService.fetchAndStore).toHaveBeenCalledTimes(1);
    expect(apiService.fetchAndStore).toHaveBeenCalledWith(
      'eng.1',
      2025,
      1,
      'Api-Espn',
      '2025-08-01',
      '2026-05-31',
      'Active',
      true,
      false,
      false,
      'Round',
      true,
      false,
      false,
      0,
      true,
      true,
    );
    expect(apiService.applyAllRowsToApp).toHaveBeenCalledWith(202, {
      sportId: 1,
      leagueId: 10,
      seasonId: 80,
      dryRun: true,
      seasonPhase: 'Regular',
    });
  });

  it('discards a freshly fetched staged payload when the season is already up to date', async () => {
    const activeSeason = {
      id: 80,
      sportId: 1,
      leagueId: 10,
      startYear: 2025,
      endYear: 2026,
      status: 'active',
      flgDefault: true,
      numberOfGroups: 0,
      flgHasPostseason: false,
      currentPhase: 'Regular',
      currentPhaseDetail: 'Regular',
      sport: { id: 1, name: 'Football' },
      league: { id: 10, originalName: 'English Premier League', secondaryName: 'Premier League' },
    };

    const localMatches = [
      {
        id: 5001,
        roundId: 5,
        date: new Date('2026-04-29T19:00:00.000Z'),
        status: 'Finished',
        seasonPhase: 'Regular',
        seasonPhaseDetail: 'Regular',
        homeScore: 2,
        awayScore: 1,
        league: { originalName: 'Premier League' },
        round: { roundNumber: 5 },
        homeClub: { shortName: 'ARS', name: 'Arsenal' },
        awayClub: { shortName: 'CHE', name: 'Chelsea' },
      },
    ];

    const dryRunResult = {
      applied: 38,
      createdMatches: 0,
      updatedMatches: 0,
      createdStandings: 0,
      createdDivisions: 0,
      createdRounds: 0,
      skippedUnchanged: 38,
      dryRun: true,
      isSubsequentLoad: true,
      enrichmentQueued: 0,
    };

    const seasonsService = {
      findAll: jest.fn().mockResolvedValue([activeSeason]),
      getEspnExtractionSettingsBySeasonIds: jest.fn().mockResolvedValue({
        80: {
          seasonId: 80,
          seasonStatus: 'Active',
          isSeasonDefault: true,
          isLeagueDefault: true,
          externalLeagueCode: 'eng.1',
          startDate: '2025-08-01',
          endDate: '2026-05-31',
          sameYears: false,
          hasPostseason: false,
          scheduleType: 'Round',
          hasGroups: false,
          numberOfGroups: 0,
          hasDivisions: false,
          runInBackground: true,
          inferClubs: true,
          isConfigured: true,
        },
      }),
    };
    const matchesService = {
      findByLeagueAndSeason: jest.fn().mockResolvedValue(localMatches),
    };
    const standingsService = {
      findByLeagueIdAndSeasonIdAndRoundId: jest.fn().mockResolvedValue([{ clubId: 1 }, { clubId: 2 }]),
      findByLeagueIdAndSeasonIdAndMatchDate: jest.fn(),
    };
    const transitionalRows = [
      {
        id: 101,
        league: 'eng.1',
        season: 2025,
        sport: 1,
        origin: 'Api-Espn',
        source_url: 'https://site.api.espn.com/apis/site/v2/sports/soccer/eng.1/scoreboard?dates=20250801-20260531&limit=1000',
        status: true,
        fetched_at: new Date('2026-04-30T08:00:00.000Z'),
        fetch_status: 'done',
        season_status: 'active',
        flg_season_default: true,
        flg_season_same_years: false,
        league_schedule_type: 'Round',
        flg_league_default: true,
        flg_has_divisions: false,
        flg_has_groups: false,
        number_of_groups: 0,
        flg_run_in_background: false,
        flg_infer_clubs: true,
        flg_has_postseason: false,
      },
    ];
    const apiService = {
      listTransitional: jest.fn().mockImplementation(async () => [...transitionalRows]),
      getTransitional: jest.fn().mockImplementation(async (id: number) => {
        if (id === 101 || id === 202) {
          return {
            origin: 'Api-Espn',
            payload: {
              leagues: [{ name: 'Premier League', abbreviation: 'EPL' }],
            },
          };
        }
        return null;
      }),
      fetchAndStore: jest.fn().mockResolvedValue({ id: 202, fetched_at: new Date('2026-04-30T10:00:00.000Z') }),
      applyAllRowsToApp: jest.fn().mockResolvedValue(dryRunResult),
      deleteTransitional: jest.fn().mockResolvedValue({ deleted: true }),
    };

    const handler = new ScheduledSeasonResultsUpdaterHandler(
      seasonsService as any,
      matchesService as any,
      standingsService as any,
      apiService as any,
    );

    const context = {
      agentKey: 'scheduled-season-results-updater',
      mode: 'dry-run',
      triggerType: 'manual',
      triggerSource: 'spec:manual',
      startedAt: new Date('2026-04-30T10:00:00.000Z'),
    };

    const result = await handler.run(context as any);

    expect(result.status).toBe('completed');
    expect(result.actions).toHaveLength(1);
    expect(result.summary).toBe(
      'Checked 1 current season(s); 0 need update action(s); 1 are already up to date; detected 0 match update(s), 0 new match(es), and 0 standings write(s).',
    );
    expect((result.result as any).totals).toMatchObject({
      evaluatedSeasons: 1,
      seasonsWithChanges: 0,
      seasonsWithoutChanges: 1,
      reviewRequiredSeasons: 0,
      missingLoadSeasons: 0,
    });
    expect((result.result as any).candidates[0]).toMatchObject({
      seasonId: 80,
      state: 'no-change',
      transitionalSource: {
        id: 101,
        alreadyApplied: true,
      },
      plan: {
        hasChanges: false,
        proposedMatchUpdates: 0,
        proposedNewMatches: 0,
        proposedStandingsWrites: 0,
      },
    });
    expect(apiService.fetchAndStore).toHaveBeenCalledTimes(1);
    expect(apiService.applyAllRowsToApp).toHaveBeenCalledWith(202, {
      sportId: 1,
      leagueId: 10,
      seasonId: 80,
      dryRun: true,
      seasonPhase: 'Regular',
    });
    expect(apiService.deleteTransitional).toHaveBeenCalledWith(202);
  });
});