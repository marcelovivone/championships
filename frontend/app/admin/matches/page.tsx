'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { AlignHorizontalDistributeCenter, AlignHorizontalDistributeCenterIcon, Plus, Trash2 } from 'lucide-react';
import { matchesApi, sportsApi, leaguesApi, seasonsApi, clubsApi, stadiumsApi, groupsApi, roundsApi, seasonClubsApi, clubStadiumsApi } from '@/lib/api/entities';
import { Match, CreateMatchDto, Club, Stadium, Group, Round, SeasonClub } from '@/lib/api/types';
import DataTable from '@/components/ui/data-table';
import Modal from '@/components/ui/modal';
import { group } from 'console';

const MatchesPage = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingMatch, setEditingMatch,] = useState<Match | null>(null);
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [pageInput, setPageInput] = useState('1');
  const [sortBy, setSortBy] = useState('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  // State for the upper section form
  const [selectedSportId, setSelectedSportId] = useState<number | null>(null);
  const [selectedLeagueId, setSelectedLeagueId] = useState<number | null>(null);
  const [selectedSeasonId, setSelectedSeasonId] = useState<number | null>(null);
  const [selectedGroupId, setSelectedGroupId] = useState<number | null>(null);
  const [selectedRoundId, setSelectedRoundId] = useState<number | null>(null);
  const [matchDate, setMatchDate] = useState<string>('');
  const [matchesList, setMatchesList] = useState<any[]>([]);
  const [availableClubs, setAvailableClubs] = useState<Club[]>([]);
  const [availableStadiums, setAvailableStadiums] = useState<Stadium[]>([]);
  const [hasGroups, setHasGroups] = useState<boolean>(false); // Track if the selected season has groups
  const [checkingGroups, setCheckingGroups] = useState<boolean>(false); // Track if we're checking for groups
  const [leagueTypeOfSchedule, setLeagueTypeOfSchedule] = useState<string | null>(null); // Track the type of schedule for the selected league

  // Sync pageInput with page state
  useEffect(() => {
    setPageInput(page.toString());
  }, [page]);

  // Queries for dropdowns
  const { data: sportsData } = useQuery({
    queryKey: ['sports'],
    queryFn: () => sportsApi.getAll({ page: 1, limit: 1000 }),
  });

  const { data: leaguesData } = useQuery({
    queryKey: ['leagues'],
    queryFn: () => leaguesApi.getAll({ page: 1, limit: 1000 }),
  });

  const { data: seasonsData } = useQuery({
    queryKey: ['seasons'],
    queryFn: () => seasonsApi.getAll({ page: 1, limit: 1000 }),
  });

  const { data: clubsData } = useQuery({
    queryKey: ['clubs'],
    queryFn: () => clubsApi.getAll({ page: 1, limit: 1000 }),
  });

  // New query for season clubs
  const { data: seasonClubsData, isLoading: seasonClubsLoading } = useQuery({
    queryKey: ['season-clubs-by-season', selectedSeasonId],
    queryFn: () => selectedSeasonId ? seasonClubsApi.getBySeason(selectedSeasonId) : Promise.resolve([]),
    enabled: !!selectedSeasonId,
  });

  const { data: stadiumsData } = useQuery({
    queryKey: ['stadiums'],
    queryFn: () => stadiumsApi.getAll({ page: 1, limit: 1000 }),
  });


  const { data: groupsData } = useQuery({
    queryKey: ['groups'],
    queryFn: () => groupsApi.getAll({ page: 1, limit: 1000 }),
  });

  const { data: roundsData } = useQuery({
    queryKey: ['rounds'],
    queryFn: () => roundsApi.getAll({ page: 1, limit: 1000 }),
  });

  // Filter data based on selections
  const sports = sportsData?.data || [];
  const leagues = leaguesData?.data || [];
  const seasons = seasonsData?.data || [];
  const clubs = clubsData?.data || [];
  const seasonClubs = seasonClubsData || [];
  const stadiums = stadiumsData?.data || [];
  const groups = groupsData?.data || [];
  const rounds = roundsData?.data || [];

  // All sports are available (no filtering needed)
  const filteredSports = sports;

  // Filter leagues based on selected sport
  const filteredLeagues = selectedSportId 
    ? leagues.filter(league => league.sportId === Number(selectedSportId))
    : [];

  // Filter seasons based on selected league
  const filteredSeasons = selectedLeagueId
    ? seasons.filter(season => season.leagueId === Number(selectedLeagueId))
        .sort((a, b) => b.startYear - a.startYear)
    : [];

  // Find the selected season to check if it has groups
  const selectedSeason = filteredSeasons.find(season => season.id === selectedSeasonId);
  const showGroupDropdown = hasGroups; // Show dropdown if the season has groups

  // Filter groups based on selected season
  const filteredGroups = selectedSeasonId
    ? groups.filter(group => group.seasonId === Number(selectedSeasonId))
    : [];

  // Filter rounds based on selected season
  const filteredRounds = selectedSeasonId && leagueTypeOfSchedule === 'Round'
    ? rounds.filter(round => round.seasonId === selectedSeasonId)
    : [];

  // Filter clubs based on selected season - get clubs that are assigned to the selected season
  const filteredClubs = selectedSeasonId && seasonClubs && seasonClubs.length > 0
    ? clubs.filter(club => seasonClubs.some(sc => sc.clubId === club.id))
    : [];

  // Filter stadiums based on selected home club in each match row
  // NOTE: Filtering is handled directly in updateMatchField function when homeClubId changes

  // Filter stadiums based on selected season (we'll use all stadiums for now)
  const filteredStadiums = availableStadiums.length > 0 ? availableStadiums : stadiums;

  // Check if we have enough info to enable the "Create/Update Matches" button
  // The button should only be enabled after we've checked whether the season has groups
  const canEnableButton = selectedSportId && selectedLeagueId && selectedSeasonId && 
                         !checkingGroups && 
                         (!hasGroups || (hasGroups && selectedGroupId)) &&
                         ((leagueTypeOfSchedule === 'Round' && selectedRoundId) || 
                          (leagueTypeOfSchedule === 'Date' && matchDate) ||
                          (!leagueTypeOfSchedule));

  // When sport changes, reset all dependent selections to initial state
  useEffect(() => {
    if (selectedSportId) {
      setSelectedLeagueId(null);
      setSelectedSeasonId(null);
      setSelectedGroupId(null);
    } else {
      setSelectedLeagueId(null);
      setSelectedSeasonId(null);
      setSelectedGroupId(null);
    }
    
    // Clear matches list when changing sport
    setMatchesList([]);
  }, [selectedSportId]);

  // When league changes, reset season, group and schedule-related fields
  useEffect(() => {
    if (selectedLeagueId) {
      setSelectedSeasonId(null);
      setSelectedGroupId(null);
      // Get the typeOfSchedule for the selected league
      const league = leagues.find(l => l.id === selectedLeagueId);
      if (league) {
        setLeagueTypeOfSchedule(league.typeOfSchedule);
      }
    } else {
      setSelectedLeagueId(null);
      setSelectedSeasonId(null);
      setSelectedGroupId(null);
      setLeagueTypeOfSchedule(null);
      // Reset schedule-related fields when league is cleared
      setSelectedRoundId(null);
      setMatchDate('');
    }
    
    // Clear matches list when changing league
    setMatchesList([]);
  }, [selectedLeagueId]);

  // When season changes, reset group
  useEffect(() => {
    if (selectedSeasonId) {
      setSelectedGroupId(null);
    } else {
      setSelectedGroupId(null);
    }
    
    // Clear matches list when changing season
    setMatchesList([]);
  }, [selectedSeasonId]);

  // Effect to check if the selected season has groups and to set the league type of schedule
  useEffect(() => {
    if (selectedSeasonId) {
      // Check if there are actual groups for the selected season (not just numberOfGroups)
      const hasActualGroups = groups.some(g => g.seasonId === selectedSeasonId);
      setHasGroups(hasActualGroups);
      // Find the league associated with the selected season to get typeOfSchedule
      const seasonObj = seasons.find(s => s.id === selectedSeasonId);
      if (seasonObj) {
        const league = leagues.find(l => l.id === seasonObj.leagueId);
        if (league) {
          setLeagueTypeOfSchedule(league.typeOfSchedule);
          console.log("League Type of Schedule:", league.typeOfSchedule);
          // For 'Date' type leagues, load matches after selecting a date
          if (league.typeOfSchedule === 'Date' && matchDate) {
            loadMatchesForDate(selectedSeasonId, matchDate);
          } 
          // For 'Round' type leagues, only load matches after group selection
          else if (league.typeOfSchedule === 'Round') {
            if (selectedRoundId !== null && selectedRoundId !== undefined) {
              loadMatchesForRound(selectedSeasonId, selectedRoundId);
            }
          }
        }
      }
    // } else if (selectedGroupId) {
    //   // Load matches for this group (only for Round-based leagues when group is selected)
    //   loadMatchesForGroup(selectedGroupId);
    }
  }, [selectedGroupId, selectedSeasonId, matchDate, leagues, seasons, groups, selectedRoundId]);

//   const loadMatchesForGroup = async (groupId: number) => {
//     try {
//       // Get the sportId, leagueId, and seasonId from the selected values
//       const selectedLeague = leagues.find(l => l.id === selectedLeagueId);
//       const selectedSeason = seasons.find(s => s.id === selectedSeasonId);
      
//       if (!selectedLeague || !selectedSeason) {
//         console.error("League or Season not found");
//         setMatchesList([]);
//         return;
//       }
      
//       // Fetch matches based on sport, league, season, and group IDs using the custom API method
//       const matchesData = await matchesApi.getBySportLeagueSeasonAndGroup(
//         selectedSeason.sportId,
//         selectedLeague.id,
//         selectedSeason.id,
//         groupId
//       );
//         console.log("Fetched Matches for Group:", matchesData);      
//       // Format the fetched matches to our local format
//       const formattedMatches = matchesData.map((match: Match) => ({
//         id: match.id,
//         homeClubId: match.homeClubId,
//         awayClubId: match.awayClubId,
//         stadiumId: match.stadiumId,
//         date: match.date,
//         status: match.status,
//         homeClubImage: match.homeClub?.imageUrl ? getFullImageUrl(match.homeClub?.imageUrl) : null,
//         awayClubImage: match.awayClub?.imageUrl ? getFullImageUrl(match.awayClub?.imageUrl) : null,
//         homeScore: match.homeScore || null,
//         awayScore: match.awayScore || null,
//         availableStadiums: [] // Will be populated when home club is selected
//       }));
      
//       setMatchesList(formattedMatches);
//       console.log("Matches:", formattedMatches);
//     } catch (error) {
//       console.error("Error loading matches for group:", error);
//       setMatchesList([]);
//     }
//   };

  const loadMatchesForRound = async (seasonId: number, roundId: number) => {
    try {
      // Fetch matches for the specific date using the new API method
      const matchesData = await matchesApi.getBySeasonAndRound(seasonId, roundId);
      
      // Format the fetched matches to our local format
      const formattedMatches = matchesData.map((match: Match) => ({
        id: match.id,
        homeClubId: match.homeClubId,
        awayClubId: match.awayClubId,
        stadiumId: match.stadiumId,
        date: match.date,
        status: match.status,
        homeClubImage: match.homeClub?.imageUrl ? getFullImageUrl(match.homeClub?.imageUrl) : null,
        awayClubImage: match.awayClub?.imageUrl ? getFullImageUrl(match.awayClub?.imageUrl) : null,
        // homeScore: match.homeScore || null,
        homeScore: match.homeScore,
        awayScore: match.awayScore,
        availableStadiums: match.availableStadiums || [] // Use availableStadiums from the backend
      }));
      setMatchesList(formattedMatches);
    } catch (error) {
      console.error("Error loading matches for round:", error);
      setMatchesList([]);
    }
  };

  const loadMatchesForDate = async (seasonId: number, date: string) => {
    try {
      // Fetch matches for the specific date using the new API method
      const matchesData = await matchesApi.getBySeasonAndDate(seasonId, date);
      
      // Format the fetched matches to our local format
      const formattedMatches = matchesData.map((match: Match) => ({
        id: match.id,
        homeClubId: match.homeClubId,
        awayClubId: match.awayClubId,
        stadiumId: match.stadiumId,
        date: match.date,
        status: match.status,
        homeClubImage: match.homeClub?.imageUrl ? getFullImageUrl(match.homeClub?.imageUrl) : null,
        awayClubImage: match.awayClub?.imageUrl ? getFullImageUrl(match.awayClub?.imageUrl) : null,
        homeScore: match.homeScore || null,
        awayScore: match.awayScore || null,
        availableStadiums: match.availableStadiums || [] // Use availableStadiums from the backend
      }));
      setMatchesList(formattedMatches);
    } catch (error) {
      console.error("Error loading matches for date:", error);
      setMatchesList([]);
    }
  };

  // New function to load matches based on sport, league, season and group IDs
  const loadMatchesByFilters = async (sportId: number, leagueId: number, seasonId: number, groupId: number | null = null) => {
    try {
      // Use the new custom API method that handles all filters
      const matchesData = await matchesApi.getBySportLeagueSeasonAndGroup(sportId, leagueId, seasonId, groupId);
      
      // Format the fetched matches to our local format
      const formattedMatches = matchesData.map((match: Match) => ({
        id: match.id,
        homeClubId: match.homeClubId,
        awayClubId: match.awayClubId,
        stadiumId: match.stadiumId,
        date: match.date,
        status: match.status,
        homeClubImage: match.homeClub?.imageUrl ? getFullImageUrl(match.homeClub?.imageUrl) : null,
        awayClubImage: match.awayClub?.imageUrl ? getFullImageUrl(match.awayClub?.imageUrl) : null,
        homeScore: match.homeScore || null,
        awayScore: match.awayScore || null,
        availableStadiums: match.availableStadiums || [] // Use availableStadiums from the backend
      }));
      
      setMatchesList(formattedMatches);
    } catch (error) {
      console.error("Error loading matches by filters:", error);
      setMatchesList([]);
    }
  };

  // For Date-type leagues, we'll call this when date is selected
  const loadMatchesForSeason = async (seasonId: number) => {
    // This function is kept for backward compatibility but will not be used
    // for Date-type leagues since we filter by date
    // For Round-type leagues without group, we could potentially load all matches for the season
    try {
      const matchesData = await matchesApi.getBySeason(seasonId);
      
      // Format the fetched matches to our local format
      const formattedMatches = matchesData.map((match: Match) => ({
        id: match.id,
        homeClubId: match.homeClubId,
        awayClubId: match.awayClubId,
        stadiumId: match.stadiumId,
        date: match.date,
        status: match.status,
        homeClubImage: match.homeClub?.imageUrl ? getFullImageUrl(match.homeClub?.imageUrl) : null,
        awayClubImage: match.awayClub?.imageUrl ? getFullImageUrl(match.awayClub?.imageUrl) : null,
        homeScore: match.homeScore || null,
        awayScore: match.awayScore || null,
        availableStadiums: match.availableStadiums || [] // Use availableStadiums from the backend
      }));
      
      setMatchesList(formattedMatches);
    } catch (error) {
      console.error("Error loading matches for season:", error);
      setMatchesList([]);
    }
  };

  const updateMatchField = (index: number, field: string, value: any) => {
    const newList = [...matchesList];
    newList[index] = { ...newList[index], [field]: value };
    
    // If updating home club, potentially load its image and fetch associated stadiums
    if (field === 'homeClubId') {
      const club = clubs.find(c => c.id === value);
      if (club) {
        newList[index].homeClubImage = club.imageUrl ? getFullImageUrl(club.imageUrl) : null;
        
        // Fetch stadiums associated with this club through clubStadiumsApi
        clubStadiumsApi.getAll({ page: 1, limit: 1000 })
          .then(response => {
            // Filter the club-stadium relationships for this specific club
            const clubStadiums = response.data.filter((cs: any) => cs.clubId === value);
            // Extract stadium IDs from the relationship data
            const stadiumIds = clubStadiums.map((cs: any) => cs.stadiumId);
            // Get actual stadium objects from the global stadiums array
            const filteredStadiums = stadiums.filter((stadium: Stadium) => stadiumIds.includes(stadium.id));
            
            // Update the available stadiums for this match - can be an empty array if no stadiums are associated
            newList[index].availableStadiums = filteredStadiums;
            setMatchesList([...newList]);
          })
          .catch(error => {
            console.error("Error fetching stadiums for club:", error);
            // Even if there's an error, set to an empty array so the UI shows no stadiums available
            newList[index].availableStadiums = [];
            setMatchesList([...newList]);
          });
        
        return; // Return early since we're fetching stadiums asynchronously
      } else {
        newList[index].homeClubImage = null;
        newList[index].availableStadiums = []; // Clear stadiums if club is unselected
      }
    }
    
    // If updating away club, potentially load its image
    if (field === 'awayClubId') {
      const club = clubs.find(c => c.id === value);
      if (club) {
        newList[index].awayClubImage = club.imageUrl ? getFullImageUrl(club.imageUrl) : null;
      }
    }
    
    setMatchesList(newList);
  };

  // Helper function to get full image URL based on whether it's a web URL or local path
  const getFullImageUrl = (imageUrl: string | null) => {
    if (!imageUrl) return null;
    
    // If it's already a web URL (starts with http:// or https://), return as is
    if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
      return imageUrl;
    }
    
    // Otherwise, it's a local path - construct the full URL using the API endpoint
    // Extract just the filename from the path
    const filename = imageUrl.split(/[\\/]/).pop();
    return `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}/v1/clubs/images/${filename}`;
  };

  const addNewMatchRow = () => {
    // Determine the date value based on leagueTypeOfSchedule
    let dateValue = new Date().toISOString();
    if (leagueTypeOfSchedule === 'Date' && matchDate) {
      // If league type is 'Date' and matchDate has a value, use matchDate
      dateValue = new Date(matchDate).toISOString();
    }
    
    setMatchesList([...matchesList, { 
      id: 0, 
      homeClubId: null, 
      awayClubId: null, 
      stadiumId: null, 
      date: dateValue,
      status: 'Scheduled',
      homeClubImage: null,
      awayClubImage: null,
      availableStadiums: [] // Initialize with empty array
    }]);
  };

  const removeMatchRow = (index: number) => {
    const newList = [...matchesList];
    newList.splice(index, 1);
    setMatchesList(newList);
  };

  const handleSaveMatches = async () => {
    // Process matches list and save to backend
    for (const match of matchesList) {
      if (match.homeClubId && match.awayClubId) { // Only save if both clubs are selected
        const matchData: CreateMatchDto = {
          sportId: selectedSportId!,
          leagueId: selectedLeagueId!,
          seasonId: selectedSeasonId!,
          groupId: selectedGroupId || undefined,
          roundId: leagueTypeOfSchedule === 'Round' ? (selectedRoundId ?? undefined) : undefined,
          date: leagueTypeOfSchedule === 'Date' ? matchDate : match.date,
          homeClubId: match.homeClubId,
          awayClubId: match.awayClubId,
          stadiumId: match.stadiumId || undefined,
        };
        
        try {
          if (match.id) {
            // Update existing match
            await matchesApi.update(match.id, matchData);
          } else {
            // Create new match
            await matchesApi.create(matchData);
          }
        } catch (error) {
          console.error("Error saving match:", error);
          alert(`Error saving match: ${error}`);
          return;
        }
      }
    }
    
    alert("Matches saved successfully!");
    // Optionally reload the matches list
    // loadMatchesForSelections();
  };

  const { data, isLoading } = useQuery({
    queryKey: ['matches', page, limit, sortBy, sortOrder],
    queryFn: () => matchesApi.getAll({ page, limit, sortBy, sortOrder }),
  });

  const matches = data?.data || [];
  const total = data?.total || 0;
  const totalPages = Math.ceil(total / limit);

//   const queryClient = useQueryClient();

//   const createMutation = useMutation({
//     mutationFn: matchesApi.create,
//     onSuccess: () => {
//       queryClient.invalidateQueries({ queryKey: ['matches'] });
//       handleCloseModal();
//     },
//   });

//   const updateMutation = useMutation({
//     mutationFn: ({ id, data }: { id: number; data: Partial<CreateMatchDto> }) =>
//       matchesApi.update(id, data),
//     onSuccess: () => {
//       queryClient.invalidateQueries({ queryKey: ['matches'] });
//       handleCloseModal();
//     },
//   });

//   const deleteMutation = useMutation({
//     mutationFn: matchesApi.delete,
//     onSuccess: () => {
//       queryClient.invalidateQueries({ queryKey: ['matches'] });
//     },
//   });

  const handleSort = (columnKey: string) => {
    if (sortBy === columnKey) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(columnKey);
      setSortOrder('asc');
    }
    setPage(1);
  };

  const { register, handleSubmit, reset, watch, formState: { errors } } = useForm<CreateMatchDto>();

  //   const handleCloseModal = () => {
  //     setIsModalOpen(false);
  //     setEditingMatch(null);
  //     reset({
  //       sportId: 0,
  //       leagueId: 0,
  //       seasonId: 0,
  //       roundId: undefined,
  //       groupId: undefined,
  //       homeClubId: 0,
  //       awayClubId: 0,
  //       date: new Date().toISOString(),
  //       stadiumId: undefined,
  //     });
  //   };

  //   const handleAdd = () => {
  //     reset({
  //       sportId: 0,
  //       leagueId: 0,
  //       seasonId: 0,
  //       roundId: undefined,
  //       groupId: undefined,
  //       homeClubId: 0,
  //       awayClubId: 0,
  //       date: new Date().toISOString(),
  //       stadiumId: undefined,
  //     });
  //     setIsModalOpen(true);
  //   };

  //   const handleEdit = (match: Match) => {
  //     setEditingMatch(match);
  //     reset({
  //       sportId: match.sportId,
  //       leagueId: match.leagueId,
  //       seasonId: match.seasonId,
  //       roundId: match.roundId || undefined,
  //       groupId: match.groupId || undefined,
  //       homeClubId: match.homeClubId,
  //       awayClubId: match.awayClubId,
  //       date: match.date,
  //       stadiumId: match.stadiumId || undefined,
  //     });
  //     setIsModalOpen(true);
  //   };

  //   const handleDelete = (match: Match) => {
  //     if (window.confirm(`Are you sure you want to delete this match?`)) {
  //       deleteMutation.mutate(match.id);
  //     }
  //   };

  const columns = [
    {
      header: 'Sport',
      accessor: (match: Match) => {
        const sport = sports.find(s => s.id === match.sportId);
        return sport?.name || '-';
      },
      sortKey: 'sportName',
      sortable: true,
      width: '150px',
    },
    {
      header: 'League',
      accessor: (match: Match) => {
        const league = leagues.find(l => l.id === match.leagueId);
        return league?.originalName || '-';
      },
      sortKey: 'leagueName',
      sortable: true,
      width: '200px',
    },
    {
      header: 'Season',
      accessor: (match: Match) => {
        const season = seasons.find(s => s.id === match.seasonId);
        return season ? `${season.startYear}/${season.endYear}` : '-';
      },
      sortKey: 'seasonInfo',
      sortable: true,
      width: '150px',
    },
    {
      header: 'Group',
      accessor: (match: Match) => {
        const group = groups.find(g => g.id === match.groupId);
        return group ? group.name : '-';
      },
      sortKey: 'groupName',
      sortable: true,
      width: '150px',
    },
    {
      header: 'Home Team',
      accessor: (match: Match) => {
        const club = clubs.find(c => c.id === match.homeClubId);
        return club?.shortName || '-';
      },
      sortKey: 'homeClubName',
      sortable: true,
      width: '200px',
    },
    {
      header: 'Away Team',
      accessor: (match: Match) => {
        const club = clubs.find(c => c.id === match.awayClubId);
        return club?.shortName || '-';
      },
      sortKey: 'awayClubName',
      sortable: true,
      width: '200px',
    },
    {
      header: 'Stadium',
      accessor: (match: Match) => {
        const stadium = stadiums.find(s => s.id === match.stadiumId);
        return stadium ? stadium.name : '-';
      },
      sortKey: 'stadiumName',
      sortable: true,
      width: '200px',
    },
    {
      header: 'Date',
      accessor: (match: Match) => new Date(match.date).toLocaleDateString(),
      sortKey: 'date',
      sortable: true,
      width: '120px',
    },
    {
      header: 'Status',
      accessor: 'status' as keyof Match,
      sortKey: 'status',
      sortable: true,
      width: '120px',
    },
  ];

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Matches</h1>
        {/* <button
          onClick={handleAdd}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus size={20} />
          Add Match
        </button> */}
      </div>

      {/* Upper Section - Filters */}
      <div className="bg-white p-6 rounded-lg shadow mb-6">
        {/* <h2 className="text-xl font-semibold mb-4">Matches</h2> */}
        
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Sport *
            </label>
            <select
              value={selectedSportId || ''}
              onChange={(e) => setSelectedSportId(Number(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select a sport</option>
              {filteredSports.map((sport) => (
                <option key={sport.id} value={sport.id}>
                  {sport.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              League *
            </label>
            <select
              value={selectedLeagueId || ''}
              onChange={(e) => setSelectedLeagueId(Number(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={!selectedSportId}
            >
              <option value="">Select a league</option>
              {filteredLeagues.map((league) => (
                <option key={league.id} value={league.id}>
                  {league.originalName}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Season *
            </label>
            <select
              value={selectedSeasonId || ''}
              onChange={(e) => setSelectedSeasonId(Number(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={!selectedLeagueId}
            >
              <option value="">Select a season</option>
              {filteredSeasons.map((season) => (
                <option key={season.id} value={season.id}>
                  {season.startYear}/{season.endYear}
                </option>
              ))}
            </select>
          </div>

          {showGroupDropdown && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Group *
              </label>
              <select
                value={selectedGroupId || ''}
                onChange={(e) => setSelectedGroupId(Number(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={!selectedSeasonId}
              >
                <option value="">Select a group</option>
                {filteredGroups.map((group) => (
                  <option key={group.id} value={group.id}>
                    {group.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Conditionally render either Round or Date based on league type */}
          {(selectedLeagueId && leagueTypeOfSchedule === 'Round') && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Round *
              </label>
              <select
                value={selectedRoundId || ''}
                onChange={(e) => setSelectedRoundId(Number(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={!selectedSeasonId}
              >
                <option value="">Select a round</option>
                {filteredRounds.map((round) => (
                  <option key={round.id} value={round.id}>
                    {round.roundNumber}
                  </option>
                ))}
              </select>
            </div>
          )}

          {(selectedLeagueId && leagueTypeOfSchedule === 'Date') && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Date *
              </label>
              <input
                type="date"
                value={matchDate}
                onChange={(e) => setMatchDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={!selectedSeasonId}
              />
            </div>
          )}
        </div>
      </div>

      {/* Lower Section - Matches Table */}
      {/* <div className="bg-white p-6 rounded-lg shadow">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-medium">Matches</h3>
          <button
            onClick={handleSaveMatches}
            disabled={!canEnableButton}
            className={`px-4 py-2 rounded-md ${
              canEnableButton
                ? 'bg-blue-600 text-white hover:bg-blue-700'
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            }`}
          >
            Create/Update Matches
          </button>
        </div> */}

        <div className="overflow-x-auto pt-4">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/6">Home Club</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/24">Home Image</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/12">Home Score</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/24"></th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/12">Away Score</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/24">Away Image</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/6">Away Club</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/6">Stadium</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/6">Match Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/6">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/18">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {matchesList.map((match, index) => (
                <tr key={index}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <select
                      value={match.homeClubId || ''}
                      onChange={(e) => updateMatchField(index, 'homeClubId', Number(e.target.value))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      disabled={seasonClubsLoading}
                    >
                      <option value="">Select home club</option>
                      {filteredClubs.map((club) => (
                        <option key={club.id} value={club.id}>
                          {club.shortName}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap flex items-center justify-center align-middle">
                    {match.homeClubImage ? (
                      <img src={match.homeClubImage} alt="Home club" className="mt-1 h-8 w-8 object-contain items-center" />
                    ) : (
                      <span className="text-gray-400">---</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <input
                      type="number"
                      min="0"
                      max="999"
                      value={match.homeScore ?? ''}
                      onChange={(e) => updateMatchField(index, 'homeScore', e.target.value ? Number(e.target.value) : null)}
                      className="w-full px-2 py-1 border border-gray-300 rounded text-center"
                      placeholder="-"
                    />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center">VS</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <input
                      type="number"
                      min="0"
                      max="999"
                      value={match.awayScore ?? ''}
                      onChange={(e) => updateMatchField(index, 'awayScore', e.target.value ? Number(e.target.value) : null)}
                      className="w-full px-2 py-1 border border-gray-300 rounded text-center"
                      placeholder="-"
                    />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap flex items-center justify-center align-middle">
                    {match.awayClubImage ? (
                      <img src={match.awayClubImage} alt="Away club" className="mt-1 h-8 w-8 object-contain" />
                    ) : (
                      <span className="text-gray-400">---</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <select
                      value={match.awayClubId || ''}
                      onChange={(e) => updateMatchField(index, 'awayClubId', Number(e.target.value))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      disabled={seasonClubsLoading}
                    >
                      <option value="">Select away club</option>
                      {filteredClubs.map((club) => (
                        <option key={club.id} value={club.id}>
                          {club.shortName}
                        </option>
                       ))}
                    </select>
                    {/* <input
                      type="text"
                      value={match.awayClubId ?? 'nada'}
                      className="w-full px-2 py-1 border border-gray-300 rounded text-center"
                    /> */}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <select
                      value={match.stadiumId || ''}
                      onChange={(e) => updateMatchField(index, 'stadiumId', Number(e.target.value))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      disabled={!match.homeClubId}  // Disabled if no home club is selected
                    >
                      <option value="">Select stadium</option>
                      {match.homeClubId && match.availableStadiums
                        ? match.availableStadiums.map((stadium: Stadium) => (
                            <option key={stadium.id} value={stadium.id}>
                              {stadium.name}
                            </option>
                          ))
                        : null}
                    </select>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <input
                      type="datetime-local"
                      value={match.date ? match.date.substring(0, 16) : ''}
                      onChange={(e) => {
                        if (leagueTypeOfSchedule === 'Date' && matchDate) {
                          // If using upper section date, preserve the date part and only change the time
                          const newTime = e.target.value.substring(11); // Extract HH:mm part
                          const datePart = matchDate.substring(0, 10); // YYYY-MM-DD from upper section
                          const newDateTime = `${datePart}T${newTime}:00.000Z`;
                          updateMatchField(index, 'date', newDateTime);
                        } else {
                          // If not using upper section date, allow full editing
                          updateMatchField(index, 'date', e.target.value + ':00.000Z');
                        }
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      disabled={leagueTypeOfSchedule === 'Date' && !!matchDate && matchDate.includes('T')}
                    />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <select
                      value={match.status || 'Scheduled'}
                      onChange={(e) => updateMatchField(index, 'status', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="Scheduled">Scheduled</option>
                      <option value="Finished">Finished</option>
                      <option value="Cancelled">Cancelled</option>
                      <option value="Postponed">Postponed</option>
                    </select>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <button
                      onClick={() => removeMatchRow(index)}
                      className="text-red-600 hover:text-red-900"
                    >
                      <Trash2 size={18} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

        <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex justify-between items-center">
            <button
              onClick={addNewMatchRow}
            disabled={!canEnableButton}
            className={`px-4 py-2 rounded-md ${
              canEnableButton
                ? 'px-14 py-2 bg-green-600 text-white rounded-md hover:bg-green-700'
                : 'px-8 py-2 bg-gray-300 text-gray-500 rounded-md cursor-not-allowed'
            }`}
            >
              Add Row
            </button>

            <button
                onClick={handleSaveMatches}
                disabled={!canEnableButton}
                className={`px-4 py-2 rounded-md ${
                canEnableButton
                    ? 'bg-blue-600 text-white hover:bg-blue-700'
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                }`}
            >
                Create/Update Matches
            </button>
            </div>

          {/* <div className="mt-4">
            <button
              onClick={addNewMatchRow}
            disabled={!canEnableButton}
            className={`px-4 py-2 rounded-md ${
              canEnableButton
                ? 'px-14 py-2 bg-green-600 text-white rounded-md hover:bg-green-700'
                : 'px-8 py-2 bg-gray-300 text-gray-500 rounded-md cursor-not-allowed'
            }`}
            >
              Add Row
            </button>
          </div> */}
        </div>
      </div>

      {/* Pagination Controls */}
      <div className="flex items-center justify-between border-t border-gray-200 px-6 py-3">
        <div className="text-sm text-gray-700">
          Showing <span className="font-medium">{(page - 1) * limit + 1}</span> to{' '}
          <span className="font-medium">
            {Math.min(page * limit, total || 0)}
          </span>{' '}
          of <span className="font-medium">{total || 0}</span> matches
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setPage(Math.max(1, page - 1))}
            disabled={page <= 1}
            className={`px-4 py-2 rounded-md ${
              page <= 1
                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            Previous
          </button>
          
          <div className="flex items-center">
            <input
              type="number"
              min="1"
              max={totalPages}
              value={pageInput}
              onChange={(e) => {
                const value = parseInt(e.target.value);
                if (!isNaN(value) && value >= 1 && value <= totalPages) {
                  setPageInput(e.target.value);
                }
              }}
              onBlur={() => {
                const value = parseInt(pageInput);
                if (!isNaN(value)) {
                  setPage(Math.max(1, Math.min(value, totalPages)));
                } else {
                  setPageInput(page.toString());
                }
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  const value = parseInt(pageInput);
                  if (!isNaN(value)) {
                    setPage(Math.max(1, Math.min(value, totalPages)));
                  } else {
                    setPageInput(page.toString());
                  }
                }
              }}
              className="w-16 px-3 py-2 border border-gray-300 rounded-md text-center"
            />
            <span className="mx-2">of {totalPages}</span>
          </div>
          
          <button
            onClick={() => setPage(Math.min(totalPages, page + 1))}
            disabled={totalPages === 0 || page >= totalPages}
            className={`px-4 py-2 rounded-md ${
              totalPages === 0 || page >= totalPages
                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
};

export default MatchesPage;