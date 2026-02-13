'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { seasonClubsApi, sportsApi, seasonsApi, clubsApi, groupsApi, sportClubsApi, leaguesApi } from '@/lib/api/entities';
import { Sport, League, Season, Club, Group } from '@/lib/api/types';
import { ArrowLeft, ArrowRight, Loader2 } from 'lucide-react';

interface ClubWithGroup {
  club: Club;
  groupId?: number;
}

export default function SeasonClubsPage() {
  const queryClient = useQueryClient();
  
  const [selectedSportId, setSelectedSportId] = useState<number | null>(null);
  const [selectedLeagueId, setSelectedLeagueId] = useState<number | null>(null);
  const [selectedSeasonId, setSelectedSeasonId] = useState<number | null>(null);
  const [selectedGroupFilterId, setSelectedGroupFilterId] = useState<number | null>(null);
  const [availableClubs, setAvailableClubs] = useState<Club[]>([]);
  const [assignedClubs, setAssignedClubs] = useState<ClubWithGroup[]>([]);
  const [selectedAvailable, setSelectedAvailable] = useState<number[]>([]);
  const [selectedAssigned, setSelectedAssigned] = useState<number[]>([]);
  const [hasChanges, setHasChanges] = useState(false);
  const [groupAssignments, setGroupAssignments] = useState<Record<number, number | undefined>>({});
  
  // Pagination state for available clubs
  const [availablePage, setAvailablePage] = useState(1);
  const [availableLimit] = useState(10);
  
  // Pagination state for assigned clubs
  const [assignedPage, setAssignedPage] = useState(1);
  const [assignedLimit] = useState(10);

  // Fetch sports
  const { data: sportsData, isLoading: sportsLoading } = useQuery({
    queryKey: ['sports'],
    queryFn: () => sportsApi.getAll({ page: 1, limit: 500 }),
  });

  // Fetch all leagues
  const { data: leaguesData, isLoading: leaguesLoading } = useQuery({
    queryKey: ['leagues'],
    queryFn: () => leaguesApi.getAll({ page: 1, limit: 500 }),
  });

  // Fetch all seasons
  const { data: seasonsData, isLoading: seasonsLoading } = useQuery({
    queryKey: ['seasons'],
    queryFn: () => seasonsApi.getAll({ page: 1, limit: 500 }),
  });

  // Fetch all clubs
  const { data: clubsData, isLoading: clubsLoading } = useQuery({
    queryKey: ['clubs'],
    queryFn: () => clubsApi.getAll({ page: 1, limit: 500 }),
  });

  // Fetch groups
  const { data: groupsData } = useQuery({
    queryKey: ['groups'],
    queryFn: () => groupsApi.getAll({ page: 1, limit: 500 }),
  });

  // Fetch sport-clubs associations for selected sport
  const { data: sportClubsData } = useQuery({
    queryKey: ['sport-clubs', selectedSportId],
    queryFn: () => selectedSportId ? sportClubsApi.getBySport(selectedSportId) : Promise.resolve([]),
    enabled: !!selectedSportId,
  });

  // Fetch season-club associations for selected season
  const { data: seasonClubs, isLoading: seasonClubsLoading, refetch: refetchSeasonClubs } = useQuery({
    queryKey: ['season-clubs-by-season', selectedSeasonId],
    queryFn: () => selectedSeasonId ? seasonClubsApi.getBySeason(selectedSeasonId) : Promise.resolve([]),
    enabled: !!selectedSeasonId,
  });

  const sports = sportsData?.data || [];
  const allLeagues = leaguesData?.data || [];
  const allSeasons = seasonsData?.data || [];
  const allClubs = clubsData?.data || [];
  const allGroups = groupsData?.data || [];

  // Filter leagues based on selected sport
  const filteredLeagues = selectedSportId 
    ? allLeagues.filter(league => league.sportId === selectedSportId)
    : [];

  // Filter seasons based on selected league
  const filteredSeasons = selectedLeagueId
    ? allSeasons
        .filter(season => season.leagueId === selectedLeagueId)
        .sort((a, b) => b.startYear - a.startYear)
    : [];

  // Filter groups based on selected season
  const filteredGroups = selectedSeasonId
    ? allGroups.filter(group => group.seasonId === selectedSeasonId)
    : [];

  // Get selected league and season details
  const selectedLeague = selectedLeagueId
    ? allLeagues.find(l => l.id === selectedLeagueId)
    : null;
    
  const selectedSeason = selectedSeasonId
    ? allSeasons.find(s => s.id === selectedSeasonId)
    : null;

  // Check if groups are required (league has sub-leagues)
  const groupsRequired = selectedLeague && selectedLeague.hasSubLeagues;

  // Update available and assigned clubs when season or data changes
  useEffect(() => {
    if (!selectedSeasonId || !clubsData?.data || !selectedSportId || !sportClubsData) {
      setAvailableClubs([]);
      setAssignedClubs([]);
      setGroupAssignments({});
      return;
    }

    // If groups are required but none selected, don't show clubs yet
    if (groupsRequired && !selectedGroupFilterId) {
      setAvailableClubs([]);
      setAssignedClubs([]);
      setGroupAssignments({});
      return;
    }

    // Get clubs that belong to the selected sport
    const sportClubIds = new Set(sportClubsData.map(sc => sc.clubId));
    const clubsForSport = clubsData.data.filter(club => sportClubIds.has(club.id));

    // Get ALL clubs already assigned to this season (for exclusion from available list)
    const allAssignedClubIds = new Set(
      seasonClubs?.map(sc => sc.clubId) || []
    );

    // Get clubs assigned to this season with their group info
    let assignedClubData = seasonClubs?.map(sc => ({
      club: clubsData.data.find(c => c.id === sc.clubId)!,
      groupId: sc.groupId || undefined,
    })).filter(item => item.club) || [];

    // If group filter is selected, only show clubs in that group (for display in right list)
    if (selectedGroupFilterId) {
      assignedClubData = assignedClubData.filter(item => item.groupId === selectedGroupFilterId);
    }
    
    // Sort assigned clubs by name
    assignedClubData.sort((a, b) => a.club.name.localeCompare(b.club.name));
    
    // Available clubs = clubs for this sport NOT assigned to ANY group in this season
    const available = clubsForSport.filter(club => !allAssignedClubIds.has(club.id));

    setAvailableClubs(available);
    setAssignedClubs(assignedClubData);

    // Initialize group assignments
    const initialGroupAssignments: Record<number, number | undefined> = {};
    assignedClubData.forEach(item => {
      initialGroupAssignments[item.club.id] = item.groupId;
    });
    setGroupAssignments(initialGroupAssignments);
  }, [selectedSeasonId, clubsData, seasonClubs, selectedSportId, sportClubsData, groupsRequired, selectedGroupFilterId]);

  const handleSportChange = (sportId: string) => {
    if (hasChanges) {
      const confirmed = confirm('You have unsaved changes. Do you want to discard them?');
      if (!confirmed) return;
    }
    setSelectedSportId(Number(sportId));
    setSelectedLeagueId(null);
    setSelectedSeasonId(null);
    setSelectedAvailable([]);
    setSelectedAssigned([]);
    setHasChanges(false);
    setAvailablePage(1);
    setAssignedPage(1);
  };

  const handleLeagueChange = (leagueId: string) => {
    if (hasChanges) {
      const confirmed = confirm('You have unsaved changes. Do you want to discard them?');
      if (!confirmed) return;
    }
    setSelectedLeagueId(Number(leagueId));
    setSelectedSeasonId(null);
    setSelectedAvailable([]);
    setSelectedAssigned([]);
    setHasChanges(false);
    setAvailablePage(1);
    setAssignedPage(1);
  };

  const handleSeasonChange = (seasonId: string) => {
    if (hasChanges) {
      const confirmed = confirm('You have unsaved changes. Do you want to discard them?');
      if (!confirmed) return;
    }
    setSelectedSeasonId(Number(seasonId));
    setSelectedGroupFilterId(null);
    setSelectedAvailable([]);
    setSelectedAssigned([]);
    setHasChanges(false);
    setAvailablePage(1);
    setAssignedPage(1);
  };

  const moveToAssigned = () => {
    if (selectedAvailable.length === 0) return;

    // Use the selectedGroupFilterId if groups are required, otherwise undefined
    const assignedGroupId = groupsRequired ? (selectedGroupFilterId ?? undefined) : undefined;

    const clubsToMove = availableClubs
      .filter(club => selectedAvailable.includes(club.id))
      .map(club => ({ club, groupId: assignedGroupId }));

    setAvailableClubs(prev => prev.filter(club => !selectedAvailable.includes(club.id)));
    setAssignedClubs(prev => [...prev, ...clubsToMove].sort((a, b) => a.club.name.localeCompare(b.club.name)));
    setSelectedAvailable([]);
    setHasChanges(true);
  };

  const moveToAvailable = () => {
    if (selectedAssigned.length === 0) return;

    const clubsToMove = assignedClubs
      .filter(item => selectedAssigned.includes(item.club.id))
      .map(item => item.club);

    setAssignedClubs(prev => prev.filter(item => !selectedAssigned.includes(item.club.id)));
    setAvailableClubs(prev => [...prev, ...clubsToMove].sort((a, b) => a.name.localeCompare(b.name)));
    
    // Remove group assignments for moved clubs
    const newGroupAssignments = { ...groupAssignments };
    clubsToMove.forEach(club => {
      delete newGroupAssignments[club.id];
    });
    setGroupAssignments(newGroupAssignments);
    
    setSelectedAssigned([]);
    setHasChanges(true);
  };

  const handleSave = async () => {
    if (!selectedSportId || !selectedLeagueId || !selectedSeasonId) return;

    try {
      // If groups are required and selected, only update clubs for the selected group
      if (groupsRequired && selectedGroupFilterId) {
        // Delete existing associations for this season AND group only
        const clubsToDelete = seasonClubs?.filter(sc => sc.groupId === selectedGroupFilterId) || [];
        if (clubsToDelete.length > 0) {
          await Promise.all(
            clubsToDelete.map(sc => seasonClubsApi.delete(sc.id))
          );
        }

        // Create new associations for this group
        await Promise.all(
          assignedClubs.map(item => 
            seasonClubsApi.create({
              sportId: selectedSportId,
              leagueId: selectedLeagueId,
              seasonId: selectedSeasonId,
              clubId: item.club.id,
              groupId: selectedGroupFilterId,
            })
          )
        );
      } else {
        // No groups - delete all and recreate (original logic for non-grouped leagues)
        if (seasonClubs && seasonClubs.length > 0) {
          await Promise.all(
            seasonClubs.map(sc => seasonClubsApi.delete(sc.id))
          );
        }

        // Create new associations
        await Promise.all(
          assignedClubs.map(item => 
            seasonClubsApi.create({
              sportId: selectedSportId,
              leagueId: selectedLeagueId,
              seasonId: selectedSeasonId,
              clubId: item.club.id,
              groupId: item.groupId,
            })
          )
        );
      }

      queryClient.invalidateQueries({ queryKey: ['season-clubs-by-season'] });
      alert('Season clubs updated successfully');
      setHasChanges(false);
      refetchSeasonClubs();
    } catch (error: any) {
      alert(error.response?.data?.message || 'Failed to update season clubs');
    }
  };

  const handleCancel = () => {
    if (!hasChanges || confirm('Are you sure you want to discard your changes?')) {
      // Recalculate lists from the current server data
      if (selectedSeasonId && clubsData?.data && selectedSportId && sportClubsData) {
        // Get clubs that belong to the selected sport
        const sportClubIds = new Set(sportClubsData.map(sc => sc.clubId));
        const clubsForSport = clubsData.data.filter(club => sportClubIds.has(club.id));

        // Get ALL clubs already assigned to this season (for exclusion from available list)
        const allAssignedClubIds = new Set(
          seasonClubs?.map(sc => sc.clubId) || []
        );

        // Get clubs assigned to this season with their group info
        let assignedClubData = seasonClubs?.map(sc => ({
          club: clubsData.data.find(c => c.id === sc.clubId)!,
          groupId: sc.groupId || undefined,
        })).filter(item => item.club) || [];

        // If group filter is selected, only show clubs in that group
        if (selectedGroupFilterId) {
          assignedClubData = assignedClubData.filter(item => item.groupId === selectedGroupFilterId);
        }

        // Sort assigned clubs by name
        assignedClubData.sort((a, b) => a.club.name.localeCompare(b.club.name));

        // Available clubs = clubs for this sport NOT assigned to ANY group in this season
        const available = clubsForSport.filter(club => !allAssignedClubIds.has(club.id));

        setAvailableClubs(available);
        setAssignedClubs(assignedClubData);

        const initialGroupAssignments: Record<number, number | undefined> = {};
        assignedClubData.forEach(item => {
          initialGroupAssignments[item.club.id] = item.groupId;
        });
        setGroupAssignments(initialGroupAssignments);
      }
      setSelectedAvailable([]);
      setSelectedAssigned([]);
      setHasChanges(false);
    }
  };

  const isLoading = sportsLoading || leaguesLoading || seasonsLoading || clubsLoading || seasonClubsLoading;

  // Pagination calculations for available clubs
  const availableTotalPages = Math.ceil(availableClubs.length / availableLimit);
  const availableStartIndex = (availablePage - 1) * availableLimit;
  const availableEndIndex = availableStartIndex + availableLimit;
  const paginatedAvailableClubs = availableClubs.slice(availableStartIndex, availableEndIndex);

  // Pagination calculations for assigned clubs
  const assignedTotalPages = Math.ceil(assignedClubs.length / assignedLimit);
  const assignedStartIndex = (assignedPage - 1) * assignedLimit;
  const assignedEndIndex = assignedStartIndex + assignedLimit;
  const paginatedAssignedClubs = assignedClubs.slice(assignedStartIndex, assignedEndIndex);

  return (
    <div className="container mx-auto p-6">
      <div className="bg-white rounded-lg shadow">
        <div className="border-b px-6 py-4">
          <h1 className="text-2xl font-bold">Season Clubs Management</h1>
          <p className="text-sm text-gray-600 mt-1">
            Assign clubs to seasons with optional group assignments
          </p>
        </div>
        <div className="p-6 space-y-6">
          {/* Sport, League, Season, and Group Selection */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">Select Sport</label>
              <select
                value={selectedSportId?.toString() || ''}
                onChange={(e) => handleSportChange(e.target.value)}
                disabled={isLoading}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <option value="">Choose a sport...</option>
                {sports.map((sport) => (
                  <option key={sport.id} value={sport.id.toString()}>
                    {sport.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">Select League</label>
              <select
                value={selectedLeagueId?.toString() || ''}
                onChange={(e) => handleLeagueChange(e.target.value)}
                disabled={!selectedSportId || isLoading}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <option value="">Choose a league...</option>
                {filteredLeagues.map((league) => (
                  <option key={league.id} value={league.id.toString()}>
                    {league.secondaryName || league.originalName}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">Select Season</label>
              <select
                value={selectedSeasonId?.toString() || ''}
                onChange={(e) => handleSeasonChange(e.target.value)}
                disabled={!selectedLeagueId || isLoading}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <option value="">Choose a season...</option>
                {filteredSeasons.map((season) => (
                  <option key={season.id} value={season.id.toString()}>
                    {season.startYear}/{season.endYear}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                Filter by Group {groupsRequired && <span className="text-red-500">*</span>}
              </label>
              <select
                value={selectedGroupFilterId?.toString() || ''}
                onChange={(e) => setSelectedGroupFilterId(e.target.value ? Number(e.target.value) : null)}
                disabled={!selectedSeasonId || filteredGroups.length === 0}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <option value="">{groupsRequired ? 'Choose a group...' : 'All groups'}</option>
                {filteredGroups.map((group) => (
                  <option key={group.id} value={group.id.toString()}>
                    {group.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Warning when group is required */}
          {selectedSeasonId && groupsRequired && !selectedGroupFilterId && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
              <p className="text-sm text-yellow-800">
                <strong>Note:</strong> This league has sub-divisions/groups. Please select a group to manage club assignments.
              </p>
            </div>
          )}

          {/* Transfer Lists */}
          {selectedSeasonId && (!groupsRequired || selectedGroupFilterId) && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_1fr] gap-4 items-start">
                {/* Available Clubs */}
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">Available Clubs ({availableClubs.length})</label>
                  <div className="border rounded-md h-96 overflow-y-auto bg-gray-50">
                    {availableClubs.length === 0 ? (
                      <div className="flex items-center justify-center h-full text-sm text-gray-500">
                        {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'No available clubs'}
                      </div>
                    ) : (
                      <div className="p-2 space-y-1">
                        {paginatedAvailableClubs.map((club) => (
                          <div
                            key={club.id}
                            onClick={() => {
                              setSelectedAvailable(prev =>
                                prev.includes(club.id)
                                  ? prev.filter(id => id !== club.id)
                                  : [...prev, club.id]
                              );
                            }}
                            className={`p-2 rounded cursor-pointer hover:bg-gray-200 transition-colors ${
                              selectedAvailable.includes(club.id) ? 'bg-blue-600 text-white hover:bg-blue-700' : ''
                            }`}
                          >
                            {club.name}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  
                  {/* Pagination for Available Clubs */}
                  {availableClubs.length > availableLimit && (
                    <div className="flex items-center justify-between gap-2 px-2 py-2 border-t text-sm">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => setAvailablePage(1)}
                          disabled={availablePage === 1}
                          className="px-2 py-1 text-blue-600 hover:bg-blue-50 rounded disabled:opacity-50 disabled:cursor-not-allowed"
                          title="First page"
                        >
                          ««
                        </button>
                        <button
                          onClick={() => setAvailablePage(p => Math.max(1, p - 1))}
                          disabled={availablePage === 1}
                          className="px-2 py-1 text-blue-600 hover:bg-blue-50 rounded disabled:opacity-50 disabled:cursor-not-allowed"
                          title="Previous page"
                        >
                          ‹
                        </button>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-gray-600">Page</span>
                        <input
                          type="number"
                          min="1"
                          max={availableTotalPages}
                          value={availablePage}
                          onChange={(e) => {
                            const page = parseInt(e.target.value);
                            if (page >= 1 && page <= availableTotalPages) {
                              setAvailablePage(page);
                            }
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              const page = parseInt(e.currentTarget.value);
                              if (page >= 1 && page <= availableTotalPages) {
                                setAvailablePage(page);
                              }
                            }
                          }}
                          className="w-16 px-2 py-1 border border-gray-300 rounded text-center"
                        />
                        <span className="text-gray-600">of {availableTotalPages}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => setAvailablePage(p => Math.min(availableTotalPages, p + 1))}
                          disabled={availablePage === availableTotalPages}
                          className="px-2 py-1 text-blue-600 hover:bg-blue-50 rounded disabled:opacity-50 disabled:cursor-not-allowed"
                          title="Next page"
                        >
                          ›
                        </button>
                        <button
                          onClick={() => setAvailablePage(availableTotalPages)}
                          disabled={availablePage === availableTotalPages}
                          className="px-2 py-1 text-blue-600 hover:bg-blue-50 rounded disabled:opacity-50 disabled:cursor-not-allowed"
                          title="Last page"
                        >
                          »»
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Transfer Buttons */}
                <div className="flex flex-col gap-2 justify-center md:pt-8">
                  <button
                    onClick={moveToAssigned}
                    disabled={selectedAvailable.length === 0 || isLoading}
                    title="Add selected clubs"
                    className="p-2 border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ArrowRight className="h-4 w-4" />
                  </button>
                  <button
                    onClick={moveToAvailable}
                    disabled={selectedAssigned.length === 0 || isLoading}
                    title="Remove selected clubs"
                    className="p-2 border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ArrowLeft className="h-4 w-4" />
                  </button>
                </div>

                {/* Assigned Clubs */}
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">Assigned Clubs ({assignedClubs.length})</label>
                  <div className="border rounded-md h-96 overflow-y-auto bg-gray-50">
                    {assignedClubs.length === 0 ? (
                      <div className="flex items-center justify-center h-full text-sm text-gray-500">
                        {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'No assigned clubs'}
                      </div>
                    ) : (
                      <div className="p-2 space-y-1">
                        {paginatedAssignedClubs.map((item) => (
                          <div
                            key={item.club.id}
                            onClick={() => {
                              setSelectedAssigned(prev =>
                                prev.includes(item.club.id)
                                  ? prev.filter(id => id !== item.club.id)
                                  : [...prev, item.club.id]
                              );
                            }}
                            className={`p-2 rounded cursor-pointer hover:bg-gray-200 transition-colors ${
                              selectedAssigned.includes(item.club.id) ? 'bg-blue-600 text-white hover:bg-blue-700' : ''
                            }`}
                          >
                            {item.club.name}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  
                  {/* Pagination for Assigned Clubs */}
                  {assignedClubs.length > assignedLimit && (
                    <div className="flex items-center justify-between gap-2 px-2 py-2 border-t text-sm">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => setAssignedPage(1)}
                          disabled={assignedPage === 1}
                          className="px-2 py-1 text-blue-600 hover:bg-blue-50 rounded disabled:opacity-50 disabled:cursor-not-allowed"
                          title="First page"
                        >
                          ««
                        </button>
                        <button
                          onClick={() => setAssignedPage(p => Math.max(1, p - 1))}
                          disabled={assignedPage === 1}
                          className="px-2 py-1 text-blue-600 hover:bg-blue-50 rounded disabled:opacity-50 disabled:cursor-not-allowed"
                          title="Previous page"
                        >
                          ‹
                        </button>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-gray-600">Page</span>
                        <input
                          type="number"
                          min="1"
                          max={assignedTotalPages}
                          value={assignedPage}
                          onChange={(e) => {
                            const page = parseInt(e.target.value);
                            if (page >= 1 && page <= assignedTotalPages) {
                              setAssignedPage(page);
                            }
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              const page = parseInt(e.currentTarget.value);
                              if (page >= 1 && page <= assignedTotalPages) {
                                setAssignedPage(page);
                              }
                            }
                          }}
                          className="w-16 px-2 py-1 border border-gray-300 rounded text-center"
                        />
                        <span className="text-gray-600">of {assignedTotalPages}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => setAssignedPage(p => Math.min(assignedTotalPages, p + 1))}
                          disabled={assignedPage === assignedTotalPages}
                          className="px-2 py-1 text-blue-600 hover:bg-blue-50 rounded disabled:opacity-50 disabled:cursor-not-allowed"
                          title="Next page"
                        >
                          ›
                        </button>
                        <button
                          onClick={() => setAssignedPage(assignedTotalPages)}
                          disabled={assignedPage === assignedTotalPages}
                          className="px-2 py-1 text-blue-600 hover:bg-blue-50 rounded disabled:opacity-50 disabled:cursor-not-allowed"
                          title="Last page"
                        >
                          »»
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2 justify-end">
                <button
                  onClick={handleCancel}
                  disabled={!hasChanges}
                  className="px-4 py-2 text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={!hasChanges}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                >
                  Save Changes
                </button>
              </div>
            </>
          )}

          {!selectedSeasonId && !isLoading && (
            <div className="text-center py-12 text-gray-500">
              {!selectedSportId && 'Please select a sport to begin'}
              {selectedSportId && !selectedLeagueId && 'Please select a league'}
              {selectedLeagueId && !selectedSeasonId && 'Please select a season to manage its clubs'}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
