'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { AlignHorizontalDistributeCenter, AlignHorizontalDistributeCenterIcon, Plus, Trash2 } from 'lucide-react';
import { matchesApi, sportsApi, leaguesApi, seasonsApi, clubsApi, stadiumsApi, groupsApi, roundsApi, seasonClubsApi, clubStadiumsApi, matchDivisionsApi } from '@/lib/api/entities';
import { Match, CreateMatchDto, Club, Stadium, Group, Round, SeasonClub, MatchDivision } from '@/lib/api/types';
import DataTable from '@/components/ui/data-table';
import Modal from '@/components/ui/modal';
import { group } from 'console';
import { date } from 'zod';
import MatchDetailsEditor, { SportConfig } from './MatchDetailsEditor';
const MatchesPage = () => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingMatch, setEditingMatch,] = useState<Match | null>(null);
    const [page, setPage] = useState(1);
    const [limit] = useState(10);
    const [pageInput, setPageInput] = useState('1');
    const [sortBy, setSortBy] = useState('date');
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
    const [matchDetails, setMatchDetails] = useState(false);
    const [matchDetailsVisibility, setMatchDetailsVisibility] = useState<Record<number, boolean>>({});

    // State for the upper section form
    const [selectedSportId, setSelectedSportId] = useState<number | null>(null);
    const [selectedLeagueId, setSelectedLeagueId] = useState<number | null>(null);
    const [selectedSeasonId, setSelectedSeasonId] = useState<number | null>(null);
    const [selectedGroupId, setSelectedGroupId] = useState<number | null>(null);
    const [selectedRoundId, setSelectedRoundId] = useState<number | null>(null);
    const [matchDate, setMatchDate] = useState<string>('');
    const [matchesList, setMatchesList] = useState<any[]>([]);
    const [originalMatches, setOriginalMatches] = useState<any[]>([]); // Store original matches for cancel functionality
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

    // Get selected sport
    const selectedSport = sports.find(s => s.id === selectedSportId);

    // Get club name by ID
    const getClubShortName = (clubId: number) => {
        return clubs.find(c => c.id === clubId)?.shortName || "Unknown Club";
    };
    // Convert it to SportConfig type
    const sportConfig: SportConfig | undefined = selectedSport
    ? {
        divisionType: (selectedSport.divisionType ?? 'period') as 'period' | 'quarter' | 'set',
        hasOvertime: selectedSport.hasOvertime ?? false,
        hasPenalties: selectedSport.hasPenalties ?? false,
        minMatchDivisionsNumber: selectedSport.minMatchDivisionNumber ?? 1,
        maxMatchDivisionsNumber: selectedSport.maxMatchDivisionNumber ?? 4,
        }
    : undefined;

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
                    // For 'Date' type leagues, load matches after selecting a date
                    if (league.typeOfSchedule === 'Date' && matchDate) {
                        if (selectedSeasonId !== null) {
                            loadMatchesForDate(selectedSeasonId, matchDate);
                        }
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
                homeScore: typeof match.homeScore === 'number' ? match.homeScore : null,
                awayScore: typeof match.awayScore === 'number' ? match.awayScore : null,
                availableStadiums: match.availableStadiums || [], // Use availableStadiums from the backend
                matchDivisions: match.matchDivisions || [] // Use matchDivisions from the backend
            }));
            setMatchesList(formattedMatches);
            setOriginalMatches(structuredClone(formattedMatches)); // Store a deep copy for cancel functionality
            
            // Reset visibility states for the new matches
            const newVisibilityState: Record<number, boolean> = {};
            formattedMatches.forEach((_, idx) => {
                newVisibilityState[idx] = false;
            });
            setMatchDetailsVisibility(newVisibilityState);
        } catch (error) {
            console.error("Error loading matches for round:", error);
            setMatchesList([]);
            setOriginalMatches([]);
            
            // Reset visibility states when clearing matches
            setMatchDetailsVisibility({});
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
                homeScore: typeof match.homeScore === 'number' ? match.homeScore : null,
                awayScore: typeof match.awayScore === 'number' ? match.awayScore : null,
                availableStadiums: match.availableStadiums || [], // Use availableStadiums from the backend
                matchDivisions: match.matchDivisions || []
            }));
            setMatchesList(formattedMatches);
            setOriginalMatches(structuredClone(formattedMatches)); // Store a deep copy for cancel functionality
        } catch (error) {
            console.error("Error loading matches for date:", error);
            setMatchesList([]);
            setOriginalMatches([]);
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
                homeScore: typeof match.homeScore === 'number' ? match.homeScore : null,
                awayScore: typeof match.awayScore === 'number' ? match.awayScore : null,
                availableStadiums: match.availableStadiums || [], // Use availableStadiums from the backend
                matchDivisions: match.matchDivisions || []
            }));

            setMatchesList(formattedMatches);
            setOriginalMatches(structuredClone(formattedMatches)); // Store a deep copy for cancel functionality
            
            // Reset visibility states for the new matches
            const newVisibilityState: Record<number, boolean> = {};
            formattedMatches.forEach((_, idx) => {
                newVisibilityState[idx] = false;
            });
            setMatchDetailsVisibility(newVisibilityState);
        } catch (error) {
            console.error("Error loading matches by filters:", error);
            setMatchesList([]);
            setOriginalMatches([]);
            
            // Reset visibility states when clearing matches
            setMatchDetailsVisibility({});
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
                        const filteredStadiums = stadiums.filter((stadium: Stadium) => 
                            stadiumIds.includes(stadium.id) && stadium.sportId === selectedSportId);

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

    const replaceMatchDivisions = async (
        matchId: number,
        divisions: MatchDivision[]
        ) => {
        // 1. Load existing divisions for this match
        const existing = await matchDivisionsApi.getByMatchId(matchId);
        
        // 2. Delete existing divisions
        await Promise.all(
            existing.map(d => matchDivisionsApi.delete(d.id))
        );

        // 3. Create new divisions
        await Promise.all(
            divisions.map(d =>
            matchDivisionsApi.create({
                matchId,
                divisionNumber: d.divisionNumber,
                homeScore: d.homeScore,
                awayScore: d.awayScore,
                divisionType: d.divisionType,  // Changed from 'type' to 'divisionType' to match backend DTO
            })
            )
        );
    };

    const handleSaveMatches = async () => {
        // Check if there are unsaved changes by comparing the current matches list with the original
        const hasChanges = JSON.stringify(matchesList) !== JSON.stringify(originalMatches);
        if (hasChanges) {
            // Validation: No club can appear more than once as home or away
            const usedClubIds = new Set<number>();
            for (const match of matchesList) {
                if (match.homeClubId) {
                    if (usedClubIds.has(match.homeClubId)) {
                        alert('A club cannot be selected more than once as home or away.');
                        return;
                    }
                    usedClubIds.add(match.homeClubId);
                }
                if (match.awayClubId) {
                    if (usedClubIds.has(match.awayClubId)) {
                        alert('A club cannot be selected more than once as home or away.');
                        return;
                    }
                    usedClubIds.add(match.awayClubId);
                }

                // if the user informed at least one division score
                const hasAnyDetailScore = match.matchDivisions?.some(
                    (division: MatchDivision) =>
                        (division.homeScore !== null && division.homeScore !== undefined) ||
                        (division.awayScore !== null && division.awayScore !== undefined)
                );
                // the total score for home and away must equal the sum of the division scores if divisions are present
                if (hasAnyDetailScore) {
                    if (match.matchDivisions?.some(
                            (division: MatchDivision) =>
                                division.homeScore === null || division.homeScore === undefined ||
                                division.awayScore === null || division.awayScore === undefined
                            )
                    ) {
                        alert(`All the scores in match details of '${getClubShortName(match.homeClubId)} vs ${getClubShortName(match.awayClubId)}' must be filled.`);
                        return;
                    }
                    const totalHomeScoreDetail = match.matchDivisions?.reduce(
                    (sum: number, division: MatchDivision) =>
                        sum + (division.homeScore || 0),
                    0
                    );
                    if(match.homeScore !== null && totalHomeScoreDetail !== match.homeScore) {
                        alert(`in Match '${getClubShortName(match.homeClubId)} vs ${getClubShortName(match.awayClubId)}', the home score must equal the sum of the division home scores.`);
                        return;
                    }
                    const totalAwayScoreDetail = match.matchDivisions?.reduce(
                    (sum: number, division: MatchDivision) =>
                        sum + (division.awayScore || 0),
                    0
                    );
                    if(match.awayScore !== null && totalAwayScoreDetail !== match.awayScore) {
                        alert(`in Match '${getClubShortName(match.homeClubId)} vs ${getClubShortName(match.awayClubId)}', the away score must equal the sum of the division away scores.`);
                        return;
                    }
                } else {
                    if(match.matchDivisions && match.matchDivisions.length > 0) {
                        if (match.matchDivisions?.every(
                            (division: MatchDivision) =>
                                division.homeScore === null || division.homeScore === undefined ||
                            division.awayScore === null || division.awayScore === undefined
                        )
                        ) {
                            alert(`All the scores in match details of '${getClubShortName(match.homeClubId)} vs ${getClubShortName(match.awayClubId)}' must be filled.`);
                            return;
                        }
                    }
                }
            }

            // Process matches list and save to backend
            for (const match of matchesList) {
                if (match.homeClubId && match.awayClubId && match.homeScore && match.awayScore && match.stadiumId && match.date && match.date != ':00.000Z') { // Only save if all fields are informed
                    // Ensure date is always a full ISO string with time
                    let dateToSend = match.date;
                    if (/^\d{4}-\d{2}-\d{2}$/.test(match.date)) {
                        // If only date part, add default time (e.g., noon)
                        dateToSend = match.date + 'T12:00:00.000Z';
                    }
                    const matchData: CreateMatchDto = {
                        sportId: selectedSportId!,
                        leagueId: selectedLeagueId!,
                        seasonId: selectedSeasonId!,
                        groupId: selectedGroupId || undefined,
                        roundId: leagueTypeOfSchedule === 'Round' ? (selectedRoundId ?? undefined) : undefined,
                        date: dateToSend, // Always use the row's date, which includes the correct time
                        homeClubId: match.homeClubId,
                        awayClubId: match.awayClubId,
                        stadiumId: match.stadiumId || undefined,
                        status: match.status,
                        homeScore: match.homeScore === '' || match.homeScore === null || typeof match.homeScore === 'undefined' ? null : Number(match.homeScore),
                        awayScore: match.awayScore === '' || match.awayScore === null || typeof match.awayScore === 'undefined' ? null : Number(match.awayScore),
                    };

                    try {
                        let savedMatchId = match.id;

                        if (match.id) {
                            // Update existing match
                            await matchesApi.update(match.id, matchData);
                        } else {
                            // Create new match
                            const createdMatch = await matchesApi.create(matchData);
                            savedMatchId = createdMatch.id;
                        }

                        await replaceMatchDivisions(savedMatchId, match.matchDivisions);
                    } catch (error) {
                        alert(`Error saving match: ${error}`);
                        return;
                    }
                }
                else {
                    // console.log("Skipping match save due to incomplete data:", match);
                    if (match.status === 'Finished') {
                        alert("Please inform both Home and Away clubs, stadium, date, and scores for all matches before saving.");
                        return;
                    }
                }
            }

            alert("Matches saved successfully!");

            // Find the league associated with the selected season to get typeOfSchedule
            const seasonObj = seasons.find(s => s.id === selectedSeasonId);
            if (seasonObj) {
                const league = leagues.find(l => l.id === seasonObj.leagueId);
                if (league) {
                    setLeagueTypeOfSchedule(league.typeOfSchedule);
                    if (league.typeOfSchedule === 'Date' && matchDate) {
                        if (selectedSeasonId !== null) {
                            loadMatchesForDate(selectedSeasonId, matchDate);
                        }
                    }
                    // For 'Round' type leagues, only load matches after group selection
                    else if (league.typeOfSchedule === 'Round') {
                        if (selectedRoundId !== null && selectedRoundId !== undefined) {
                            if (selectedSeasonId !== null) {
                                loadMatchesForRound(selectedSeasonId, selectedRoundId);
                            }
                        }
                    }
                }
            }
        }
    };

    // Function to handle cancel button click
    const handleCancel = () => {
        // Check if there are unsaved changes by comparing the current matches list with the original
        const hasChanges = JSON.stringify(matchesList) !== JSON.stringify(originalMatches);
        if (hasChanges) {
            const confirmReset = window.confirm('Are you sure you want to cancel? Unsaved changes will be lost.');
            if (confirmReset) {
                // Restore original matches data
                setMatchesList(JSON.parse(JSON.stringify(originalMatches)));
                if (leagueTypeOfSchedule === 'Round') {
                    console.log('Restored matches for Round schedule.');
                    loadMatchesForRound(selectedSeasonId!, selectedRoundId!);
                } else {
                    console.log('Restored matches for Date schedule.');
                    loadMatchesForDate(selectedSeasonId!, matchDate);
                }
            }
        }
    };

    const addNewMatchRow = () => {
        // Determine the date value based on leagueTypeOfSchedule
        let dateValue = new Date().toISOString();
        if (leagueTypeOfSchedule === 'Date' && matchDate) {
            // If league type is 'Date' and matchDate has a value, use matchDate
            dateValue = new Date(matchDate).toISOString();
        }

        const sport = sports.find(s => s.id === selectedSportId);

        const initialDivisions: MatchDivision[] = sport
        ? Array.from({ length: sport.minMatchDivisionNumber }, (_, i) => ({
            id: -1, // Temporary ID for new divisions that haven't been saved yet
            matchId: 0,
            divisionNumber: i + 1,
            homeScore: null,
            awayScore: null,
            divisionType: 'REGULAR',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          }))
        : [];

        const newMatchIndex = matchesList.length;
        
        setMatchesList([...matchesList, {
            id: 0,
            homeClubId: null,
            awayClubId: null,
            stadiumId: null,
            date: dateValue,
            status: 'scheduled',
            homeClubImage: null,
            awayClubImage: null,
            availableStadiums: [], // Initialize with empty array
            matchDivisions: initialDivisions, 
        }]);
        
        // Initialize visibility for the new match to false
        setMatchDetailsVisibility(prev => ({
            ...prev,
            [newMatchIndex]: false
        }));
    };

    const removeMatchRow = (index: number) => {
        const match = matchesList[index];
        if (match.id) {
            matchesApi.delete(match.id)
                .then(() => {
                    const newList = [...matchesList];
                    newList.splice(index, 1);
                    setMatchesList(newList);
                    
                    // Remove the visibility state for the deleted match and re-index
                    const newVisibilityState: Record<number, boolean> = {};
                    newList.forEach((_, idx) => {
                        newVisibilityState[idx] = matchDetailsVisibility[idx] || false;
                    });
                    setMatchDetailsVisibility(newVisibilityState);
                })
                .catch((error) => {
                    alert('Failed to delete match from server: ' + error);
                });
        } else {
            const newList = [...matchesList];
            newList.splice(index, 1);
            setMatchesList(newList);
            
            // Remove the visibility state for the deleted match and re-index
            const newVisibilityState: Record<number, boolean> = {};
            newList.forEach((_, idx) => {
                newVisibilityState[idx] = matchDetailsVisibility[idx] || false;
            });
            setMatchDetailsVisibility(newVisibilityState);
        }
    };

    const { data, isLoading } = useQuery({
        queryKey: ['matches', page, limit, sortBy, sortOrder],
        queryFn: () => matchesApi.getAll({ page, limit, sortBy, sortOrder }),
    });

    const matches = data?.data || [];
    const total = data?.total || 0;
    const totalPages = Math.ceil(total / limit);

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

                    {selectedLeagueId && selectedSeasonId && showGroupDropdown && (
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
            <div className="flex items-center">
                {/* Left button */}
                <button
                    onClick={addNewMatchRow}
                    disabled={!canEnableButton}
                    className={`rounded-md ${canEnableButton
                            ? 'px-14 py-2 bg-green-600 text-white hover:bg-green-700'
                            : 'px-8 py-2 bg-gray-300 text-gray-500 cursor-not-allowed'
                        }`}
                >
                    Add Match
                </button>

                {/* Right buttons */}
                <div className="ml-auto flex gap-4">
                    <button
                        onClick={handleCancel}
                        disabled={!canEnableButton}
                        className={`px-6 py-2 rounded-md ${canEnableButton
                                ? 'bg-blue-400 text-white hover:bg-blue-500'
                                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                            }`}
                    >
                        Cancel
                    </button>

                    <button
                        onClick={handleSaveMatches}
                        disabled={!canEnableButton}
                        className={`px-6 py-2 rounded-md ${canEnableButton
                                ? 'bg-blue-600 text-white hover:bg-blue-700'
                                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                            }`}
                    >
                        Create/Update Matches
                    </button>
                </div>
            </div>

            <div className="space-y-4 pt-4">
                {matchesList.map((match, index) => (
                    <div key={index} className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
                        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">

                            {/* Home Club */}
                            <div className="md:col-span-3">
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Home Club *
                                </label>
                                <select
                                    value={match.homeClubId || ''}
                                    onChange={(e) =>
                                        updateMatchField(index, 'homeClubId', Number(e.target.value))
                                    }
                                    className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500"
                                    disabled={seasonClubsLoading}
                                >
                                    <option value="">Select home club</option>
                                    {filteredClubs.map((club) => (
                                        <option key={club.id} value={club.id}>
                                            {club.shortName}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {/* Home Image */}
                            <div className="md:col-span-1 flex justify-center">
                                {match.homeClubImage ? (
                                    <img
                                        src={match.homeClubImage}
                                        alt="Home club"
                                        className="mt-5 h-8 w-8 object-contain"
                                    />
                                ) : (
                                    <span className="text-gray-400">---</span>
                                )}
                            </div>

                            {/* Home Score */}
                            <div className="md:col-span-1">
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Home Score
                                </label>
                                <input
                                    type="number"
                                    min="0"
                                    max="999"
                                    value={typeof match.homeScore === 'number' ? match.homeScore : ''}
                                    onChange={(e) =>
                                        updateMatchField(
                                            index,
                                            'homeScore',
                                            e.target.value === '' ? null : Number(e.target.value)
                                        )
                                    }
                                    className="w-full px-2 py-1 border rounded text-center"
                                    placeholder="-"
                                />
                            </div>

                            {/* VS */}
                            <div className="mt-5 md:col-span-1 text-center font-semibold text-gray-500">
                                VS
                            </div>

                            {/* Away Score */}
                            <div className="md:col-span-1">
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Away Score
                                </label>
                                <input
                                    type="number"
                                    min="0"
                                    max="999"
                                    value={typeof match.awayScore === 'number' ? match.awayScore : ''}
                                    onChange={(e) =>
                                        updateMatchField(
                                            index,
                                            'awayScore',
                                            e.target.value === '' ? null : Number(e.target.value)
                                        )
                                    }
                                    className="w-full px-2 py-1 border rounded text-center"
                                    placeholder="-"
                                />
                            </div>

                            {/* Away Image */}
                            <div className="md:col-span-1 flex justify-center">
                                {match.awayClubImage ? (
                                    <img
                                        src={match.awayClubImage}
                                        alt="Away club"
                                        className="mt-5 h-8 w-8 object-contain"
                                    />
                                ) : (
                                    <span className="text-gray-400">---</span>
                                )}
                            </div>

                            {/* Away Club */}
                            <div className="md:col-span-3">
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Away Club *
                                </label>
                                <select
                                    value={match.awayClubId || ''}
                                    onChange={(e) =>
                                        updateMatchField(index, 'awayClubId', Number(e.target.value))
                                    }
                                    className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500"
                                    disabled={seasonClubsLoading}
                                >
                                    <option value="">Select away club</option>
                                    {filteredClubs.map((club) => (
                                        <option key={club.id} value={club.id}>
                                            {club.shortName}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="md:col-span-1 flex justify-end mt-6">
                                <button
                                    onClick={() => removeMatchRow(index)}
                                    className="text-red-600 hover:text-red-900"
                                >
                                    <Trash2 size={18} />
                                </button>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 mt-4 md:grid-cols-18 gap-4 items-center">
                            <div className="md:col-span-2 md:col-start-1 flex justify-start mt-6">
                                <span className="text-blue-900 text-lg">
                                Match {index + 1}
                                </span>
                            </div>
                            <div className="md:col-span-3 md:col-start-3">
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Stadium/Gymnasium
                                </label>
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
                            </div>

                            <div className="md:col-span-3 md:col-start-8">
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Date/Time
                                </label>
                                <input
                                    type="datetime-local"
                                    value={match.date ? match.date.substring(0, 16) : ''}
                                    onChange={(e) => {
                                        // Always use the full value from the input (YYYY-MM-DDTHH:mm)
                                        const inputValue = e.target.value; // e.g. '2026-01-27T03:04'
                                        let isoString = '';
                                        if (inputValue) {
                                            // Append seconds and milliseconds if not present
                                            isoString = inputValue.length === 16
                                                ? inputValue + ':00.000Z'
                                                : inputValue;
                                        }
                                        updateMatchField(index, 'date', isoString);
                                    }}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    disabled={leagueTypeOfSchedule === 'Date' && !!matchDate && matchDate.includes('T')}
                                />
                            </div>

                            <div className="md:col-span-3 md:col-start-13">
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Date/Time
                                </label>
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
                            </div>
                            
                            <div className="md:col-span-2 md:col-start-17 flex justify-end mt-6">
                                <button
                                    type="button"
                                    onClick={() => {
                                        const currentVisibility = matchDetailsVisibility[index] || false;
                                        setMatchDetailsVisibility(prev => ({
                                            ...prev,
                                            [index]: !currentVisibility
                                        }));
                                    }}
                                    disabled={!match.homeClubId || !match.awayClubId || (match.homeScore === null && match.awayScore === null)}
                                    className="
                                        text-gray-800
                                        text-lg
                                        bg-transparent
                                        p-0
                                        cursor-pointer
                                        hover:underline
                                        disabled:text-gray-400
                                        disabled:cursor-not-allowed
                                        disabled:hover:no-underline
                                        focus-visible:outline
                                        focus-visible:outline-2
                                        focus-visible:outline-blue-500
                                    "
                                >
                                    Match Details {(matchDetailsVisibility[index] || false) ? '▲' : '▼'}
                                </button>
                            </div>

                            {(matchDetailsVisibility[index] || false) && sportConfig && (
                            <div className="md:col-span-18">
                                <MatchDetailsEditor
                                sport={sportConfig}
                                matchId={match.id}
                                value={match.matchDivisions}
                                onChange={(divisions) => {
                                    const updated = [...matchesList];
                                    updated[index].matchDivisions = divisions;
                                    setMatchesList(updated);
                                }}
                                />
                            </div>
                            )}
                        </div> 
                    </div>
                ))}
            </div>
        </div>
    );
};

export default MatchesPage;