'use client';

import React from 'react';
import BaseStandings from '@/components/common/standings/BaseStandings';
import { mockStandings, mockGames } from '@/components/common/standings/mockData';
import { useQuery } from '@tanstack/react-query';
import { sportsApi, leaguesApi } from '@/lib/api/entities';

export default function FootballStandingsPage() {
  // Fetch sports and find Football sport id
  const { data: sportsData } = useQuery({
    queryKey: ['sports'],
    queryFn: () => sportsApi.getAll({ page: 1, limit: 200 }),
    staleTime: 1000 * 60 * 5,
  });

  const sports = sportsData?.data || [];
  const football = sports.find((s: any) => s.name?.toLowerCase() === 'football' || s.reducedName?.toLowerCase() === 'fb');
  const sportId = football?.id ?? null;

  const { data: leaguesData } = useQuery({
    queryKey: ['leagues', sportId],
    queryFn: () => (sportId ? leaguesApi.getBySport(sportId) : Promise.resolve([])),
    enabled: Boolean(sportId),
  });

  const leagues = leaguesData || [];
  const defaultLeague = leagues.find((l: any) => l.flgDefault) || leagues[0];

  return (
    <BaseStandings
      title="Standings — Football"
      hasGroups={false}
      standings={mockStandings}
      games={mockGames}
      leagues={leagues}
      initialLeagueId={defaultLeague?.id}
      sportId={sportId}
    />
  );
}
