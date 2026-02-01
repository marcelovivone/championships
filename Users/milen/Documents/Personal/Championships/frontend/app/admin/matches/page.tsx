useEffect(() => {
  // When league is changed, reset round and date
  if (selectedLeagueId === null) {
    setSelectedRoundId(null);
    setMatchDate('');
  }
}, [selectedLeagueId]);

// Add this new useEffect to handle season changes
useEffect(() => {
  // When season is changed, reset group, round, and date
  if (selectedSeasonId === null) {
    setSelectedGroupId(null);
    setSelectedRoundId(null);
    setMatchDate('');
  }
}, [selectedSeasonId]);

// Add this new useEffect to handle sport changes
useEffect(() => {
  // When sport is changed, reset league, season, group, round, and date
  if (selectedSportId === null) {
    setSelectedLeagueId(null);
    setSelectedSeasonId(null);
    setSelectedGroupId(null);
    setSelectedRoundId(null);
    setMatchDate('');
  }
}, [selectedSportId]);

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
    console.log("Formatted Matches for Date:", formattedMatches);
    setMatchesList(formattedMatches);
  } catch (error) {
    console.error("Error loading matches for date:", error);
    setMatchesList([]);
  }
};
