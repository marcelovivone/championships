'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { sportsApi, clubsApi, sportClubsApi } from '@/lib/api/entities';
import { Sport, Club, SportClub } from '@/lib/api/types';
import { ArrowLeft, ArrowRight, Loader2 } from 'lucide-react';

export default function SportClubsPage() {
  const queryClient = useQueryClient();
  
  const [selectedSportId, setSelectedSportId] = useState<number | null>(null);
  const [availableClubs, setAvailableClubs] = useState<Club[]>([]);
  const [assignedSportClubs, setAssignedSportClubs] = useState<SportClub[]>([]);
  const [selectedAvailable, setSelectedAvailable] = useState<number[]>([]);
  const [selectedAssigned, setSelectedAssigned] = useState<number[]>([]);
  const [hasChanges, setHasChanges] = useState(false);
  
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

  // Fetch all clubs with server-side pagination
  const { data: clubsData, isLoading: clubsLoading } = useQuery({
    queryKey: ['clubs', availablePage, assignedPage],
    queryFn: () => clubsApi.getAll({ page: 1, limit: 500 }), // Load all for filtering
  });

  // Fetch sport-club associations
  const { data: sportClubs, isLoading: sportClubsLoading, refetch: refetchSportClubs } = useQuery({
    queryKey: ['sport-clubs', selectedSportId],
    queryFn: () => selectedSportId ? sportClubsApi.getBySport(selectedSportId) : Promise.resolve([]),
    enabled: !!selectedSportId,
  });

  // Bulk update mutation
  const bulkUpdateMutation = useMutation({
    mutationFn: ({ sportId, sportClubData }: { sportId: number; sportClubData: { id: number; clubId: number; name: string }[] }) =>
      sportClubsApi.bulkUpdateForSport(sportId, { sportClubData }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sport-clubs'] });
      alert('Sport clubs updated successfully');
      setHasChanges(false);
      refetchSportClubs();
    },
    onError: (error: any) => {
      alert(error.response?.data?.message || 'Failed to update sport clubs');
    },
  });

  // Update available and assigned clubs when sport or data changes
  useEffect(() => {
    if (!selectedSportId || !clubsData?.data || !sportClubs) {
      setAvailableClubs([]);
      setAssignedSportClubs([]);
      return;
    }

    const assignedClubIds = new Set(sportClubs.map(sc => sc.clubId));
    const available = clubsData.data.filter(club => !assignedClubIds.has(club.id));

    // Map sportClubs to include club data
    const assignedWithClubData = sportClubs.map(sportClub => {
      const club = clubsData.data.find(c => c.id === sportClub.clubId);
      return {
        ...sportClub,
        club: club || undefined
      };
    });

    setAvailableClubs(available);
    setAssignedSportClubs(assignedWithClubData);
  }, [selectedSportId, clubsData, sportClubs]);

  const handleSportChange = (sportId: string) => {
    if (hasChanges) {
      const confirmed = confirm('You have unsaved changes. Do you want to discard them?');
      if (!confirmed) return;
    }
    setSelectedSportId(Number(sportId));
    setSelectedAvailable([]);
    setSelectedAssigned([]);
    setHasChanges(false);
    setAvailablePage(1);
    setAssignedPage(1);
  };

  const moveToAssigned = () => {
    if (selectedAvailable.length === 0) return;

    // Create new SportClub entries for the selected clubs
    const newSportClubs: SportClub[] = selectedAvailable.map(clubId => {
      const club = clubsData?.data.find(c => c.id === clubId);
      return {
        id: Date.now() + Math.random(), // Temporary ID
        sportId: selectedSportId!,
        clubId: clubId,
        name: club?.name || '', // Default to club name initially
        flgActive: true,
        createdAt: new Date().toISOString(),
        club: club
      };
    });

    setAvailableClubs(prev => prev.filter(club => !selectedAvailable.includes(club.id)));
    setAssignedSportClubs(prev => [...prev, ...newSportClubs].sort((a, b) => a.club!.name.localeCompare(b.club!.name)));
    setSelectedAvailable([]);
    setHasChanges(true);
  };

  const moveToAvailable = () => {
    if (selectedAssigned.length === 0) return;

    const clubsToRemove = assignedSportClubs.filter(sportClub => selectedAssigned.includes(sportClub.id));
    setAssignedSportClubs(prev => prev.filter(sportClub => !selectedAssigned.includes(sportClub.id)));
    setAvailableClubs(prev => [...prev, ...clubsToRemove.map(sc => sc.club!)].sort((a, b) => a.name.localeCompare(b.name)));
    setSelectedAssigned([]);
    setHasChanges(true);
  };

  const handleSave = () => {
    if (!selectedSportId) return;

    // Prepare the payload with sport club data including names
    const sportClubData = assignedSportClubs.map(sportClub => ({
      id: sportClub.id,
      clubId: sportClub.clubId,
      name: sportClub.name
    }));
    
    bulkUpdateMutation.mutate({ 
      sportId: selectedSportId, 
      sportClubData 
    });
  };

  const handleCancel = () => {
    if (!hasChanges || confirm('Are you sure you want to discard your changes?')) {
      // Recalculate lists from the current server data
      if (selectedSportId && clubsData?.data && sportClubs) {
        const assignedClubIds = new Set(sportClubs.map(sc => sc.clubId));
        const available = clubsData.data.filter(club => !assignedClubIds.has(club.id));

        // Map sportClubs to include club data
        const assignedWithClubData = sportClubs.map(sportClub => {
          const club = clubsData.data.find(c => c.id === sportClub.clubId);
          return {
            ...sportClub,
            club: club || undefined
          };
        });

        setAvailableClubs(available);
        setAssignedSportClubs(assignedWithClubData);
      }
      setSelectedAvailable([]);
      setSelectedAssigned([]);
      setHasChanges(false);
    }
  };

  const sports = sportsData?.data || [];
  const isLoading = sportsLoading || clubsLoading || sportClubsLoading;

  // Pagination calculations for available clubs
  const availableTotalPages = Math.ceil(availableClubs.length / availableLimit);
  const availableStartIndex = (availablePage - 1) * availableLimit;
  const availableEndIndex = availableStartIndex + availableLimit;
  const paginatedAvailableClubs = availableClubs.slice(availableStartIndex, availableEndIndex);

  // Pagination calculations for assigned clubs
  const assignedTotalPages = Math.ceil(assignedSportClubs.length / assignedLimit);
  const assignedStartIndex = (assignedPage - 1) * assignedLimit;
  const assignedEndIndex = assignedStartIndex + assignedLimit;
  const paginatedAssignedClubs = assignedSportClubs.slice(assignedStartIndex, assignedEndIndex);

  return (
    <div className="container mx-auto p-6">
      <div className="bg-white rounded-lg shadow">
        <div className="border-b px-6 py-4">
          <h1 className="text-2xl font-bold">Sport Clubs Management</h1>
          <p className="text-sm text-gray-600 mt-1">
            Assign clubs to sports using the transfer lists below
          </p>
        </div>
        <div className="p-6 space-y-6">
          {/* Sport Selection */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">Select Sport</label>
            <select
              value={selectedSportId?.toString() || ''}
              onChange={(e) => handleSportChange(e.target.value)}
              disabled={isLoading}
              className="w-full md:w-96 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <option value="">Choose a sport...</option>
              {sports.map((sport) => (
                <option key={sport.id} value={sport.id.toString()}>
                  {sport.name}
                </option>
              ))}
            </select>
          </div>

          {/* Transfer Lists */}
          {selectedSportId && (
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
                  {/* Pagination controls for available clubs */}
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
                  <label className="block text-sm font-medium text-gray-700">Assigned Clubs ({assignedSportClubs.length})</label>
                  <div className="border rounded-md h-96 overflow-y-auto bg-gray-50">
                    {assignedSportClubs.length === 0 ? (
                      <div className="flex items-center justify-center h-full text-sm text-gray-500">
                        {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'No assigned clubs'}
                      </div>
                    ) : (
                      <div className="divide-y divide-gray-200">
                        <div className="grid grid-cols-2 p-2 bg-gray-100 font-semibold text-sm text-gray-700 sticky top-0 z-10">
                          <div>Original Name</div>
                          <div>Sport Name</div>
                        </div>
                        <div className="overflow-y-auto max-h-[calc(24rem-2.5rem)]">
                          {paginatedAssignedClubs.map((sportClub) => (
                            <div
                              key={sportClub.id}
                              onClick={() => {
                                setSelectedAssigned(prev =>
                                  prev.includes(sportClub.id)
                                    ? prev.filter(id => id !== sportClub.id)
                                    : [...prev, sportClub.id]
                                );
                              }}
                              className={`grid grid-cols-2 p-2 rounded cursor-pointer hover:bg-gray-200 transition-colors ${
                                selectedAssigned.includes(sportClub.id) ? 'bg-blue-600 text-white hover:bg-blue-700' : ''
                              }`}
                            >
                              <div>{sportClub.club?.name || 'N/A'}</div>
                              <div>
                                <input
                                  type="text"
                                  value={sportClub.name}
                                  onChange={(e) => {
                                    // Update the sportClub name when user modifies it
                                    setAssignedSportClubs(prev =>
                                      prev.map(sc => sc.id === sportClub.id ? {...sc, name: e.target.value} : sc)
                                    );
                                    setHasChanges(true);
                                  }}
                                  className={`w-full ${selectedAssigned.includes(sportClub.id) ? 'bg-blue-700 text-white placeholder:text-blue-200' : 'bg-white'} border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-500`}
                                  placeholder="Enter sport name..."
                                />
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                  {/* Pagination controls for assigned clubs */}
                  {assignedSportClubs.length > assignedLimit && (
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
                  disabled={!hasChanges || bulkUpdateMutation.isPending}
                  className="px-4 py-2 text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={!hasChanges || bulkUpdateMutation.isPending}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {bulkUpdateMutation.isPending ? (
                    <>
                      <Loader2 className="inline mr-2 h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    'Save Changes'
                  )}
                </button>
              </div>
            </>
          )}

          {!selectedSportId && !isLoading && (
            <div className="text-center py-12 text-gray-500">
              Please select a sport to manage its clubs
            </div>
          )}
        </div>
      </div>
    </div>
  );
}