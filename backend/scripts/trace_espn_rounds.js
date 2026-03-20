(async () => {
  try {
    const endpoint = 'https://site.api.espn.com/apis/site/v2/sports/soccer/eng.1/scoreboard?dates=20250801-20260531&limit=1000';
    const resp = await fetch(endpoint);
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    const json = await resp.json();
    const events = json.events ?? [];
    console.log(`Fetched ${events.length} events`);

    const getTeamId = (competitor) => {
      const teamId = competitor?.team?.id ?? competitor?.id;
      return teamId !== undefined && teamId !== null ? String(teamId) : null;
    };
    const getTeamName = (competitor) => competitor?.team?.displayName ?? competitor?.team?.shortDisplayName ?? competitor?.team?.name ?? null;

    const uniqueClubIds = new Set();
    for (const event of events) {
      const competition = event?.competitions?.[0];
      const competitors = competition?.competitors ?? [];
      for (const competitor of competitors) {
        const teamId = getTeamId(competitor);
        if (teamId) uniqueClubIds.add(teamId);
      }
    }
    const allTeamIds = Array.from(uniqueClubIds);
    const maxMatchesPerRound = uniqueClubIds.size >= 2 ? Math.floor(uniqueClubIds.size / 2) : null;
    console.log(`Unique clubs: ${uniqueClubIds.size}, maxMatchesPerRound: ${maxMatchesPerRound}`);

    const toUtcDay = (date) => Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
    const sortableEvents = events
      .map((event, index) => {
        const competition = event?.competitions?.[0];
        const competitors = competition?.competitors ?? [];
        const home = competitors.find((c) => c.homeAway === 'home') ?? competitors[0] ?? null;
        const away = competitors.find((c) => c.homeAway === 'away') ?? competitors[1] ?? competitors.find((c) => c !== home) ?? null;
        const rawDate = competition?.startDate ?? competition?.date ?? event?.date ?? null;
        const parsedDate = rawDate ? new Date(String(rawDate)) : null;
        return {
          event,
          index,
          date: parsedDate && !Number.isNaN(parsedDate.getTime()) ? parsedDate : null,
          homeId: getTeamId(home),
          awayId: getTeamId(away),
          homeName: getTeamName(home),
          awayName: getTeamName(away),
        };
      })
      .filter((item) => item.date !== null)
      .sort((left, right) => left.date.getTime() - right.date.getTime());

    const roundByEventId = new Map();
    const reservedEventIds = new Set();
    let currentRound = 1;
    let previousDate = null;
    let matchesInCurrentRound = 0;
    let currentRoundTeamIds = new Set();
    let index = 0;

    // Only log rounds 25–27 in detail
    const LOG_ROUNDS = new Set([24, 25, 26, 27]);

    while (index < sortableEvents.length) {
      const item = sortableEvents[index];
      const currentDate = item.date;
      const eventId = item.event?.id !== undefined && item.event?.id !== null ? String(item.event.id) : null;

      if (!item.homeId || !item.awayId) { previousDate = currentDate; index++; continue; }

      if (eventId && reservedEventIds.has(eventId)) {
        if (LOG_ROUNDS.has(currentRound)) console.log(`  [R${currentRound}] SKIP reserved ${eventId} ${item.homeName} vs ${item.awayName} [${currentDate.toISOString().slice(0,10)}]`);
        previousDate = currentDate; index++; continue;
      }

      const roundReachedExpectedSize = maxMatchesPerRound !== null && matchesInCurrentRound >= maxMatchesPerRound;
      if (roundReachedExpectedSize) {
        if (LOG_ROUNDS.has(currentRound)) console.log(`  [R${currentRound}] Round full (${matchesInCurrentRound}/${maxMatchesPerRound}), bumping to R${currentRound + 1}`);
        currentRound++; matchesInCurrentRound = 0; currentRoundTeamIds = new Set(); previousDate = null; continue;
      }

      if (previousDate) {
        const diffInDays = Math.floor((toUtcDay(currentDate) - toUtcDay(previousDate)) / (24 * 60 * 60 * 1000));
        const shouldSplitByGap = maxMatchesPerRound === null && diffInDays > 1;
        if (shouldSplitByGap) {
          if (LOG_ROUNDS.has(currentRound)) console.log(`  [R${currentRound}] Gap split, bumping to R${currentRound + 1}`);
          currentRound++; matchesInCurrentRound = 0; currentRoundTeamIds = new Set(); previousDate = null; continue;
        }
      }

      const teamAlreadyInRound = currentRoundTeamIds.has(item.homeId) || currentRoundTeamIds.has(item.awayId);
      if (teamAlreadyInRound && maxMatchesPerRound !== null) {
        const missingTeamIds = allTeamIds.filter((teamId) => !currentRoundTeamIds.has(teamId));
        if (LOG_ROUNDS.has(currentRound)) {
          const whoIsIn = item.homeId && currentRoundTeamIds.has(item.homeId) ? item.homeName : item.awayName;
          console.log(`  [R${currentRound}] CONFLICT: event ${eventId} ${item.homeName} vs ${item.awayName} [${currentDate.toISOString().slice(0,10)}] — ${whoIsIn} already in round. Missing ${missingTeamIds.length} teams.`);
        }
        if (missingTeamIds.length > 2) {
          console.log('\n=== FATAL CONFLICT ===');
          console.log(`Round ${currentRound}, assigned ${matchesInCurrentRound}/${maxMatchesPerRound}`);
          console.log('Teams already in round:', Array.from(currentRoundTeamIds).join(', '));
          console.log('Missing teams:', missingTeamIds.join(', '));
          console.log('Current event:', eventId, item.homeName, 'vs', item.awayName, currentDate.toISOString());
          break;
        }
        if (missingTeamIds.length === 2) {
          const [missingHomeId, missingAwayId] = missingTeamIds;
          const foundReplacement = sortableEvents.find((candidate, candidateIndex) => {
            if (candidateIndex <= index) return false;
            const ceid = candidate.event?.id !== undefined ? String(candidate.event.id) : null;
            if (!ceid || reservedEventIds.has(ceid) || roundByEventId.has(ceid)) return false;
            return (candidate.homeId === missingHomeId && candidate.awayId === missingAwayId) || (candidate.homeId === missingAwayId && candidate.awayId === missingHomeId);
          });
          if (!foundReplacement) {
            if (LOG_ROUNDS.has(currentRound)) console.log(`  [R${currentRound}] No replacement found for missing ${missingTeamIds.join(',')}`);
            break;
          }
          const replacementEventId = String(foundReplacement.event.id);
          if (LOG_ROUNDS.has(currentRound)) console.log(`  [R${currentRound}] Reserved replacement ${replacementEventId} ${foundReplacement.homeName} vs ${foundReplacement.awayName} [${foundReplacement.date.toISOString().slice(0,10)}] for missing teams ${missingTeamIds.join(',')}`);
          roundByEventId.set(replacementEventId, currentRound);
          reservedEventIds.add(replacementEventId);
          matchesInCurrentRound += 1;
          currentRoundTeamIds.add(missingHomeId);
          currentRoundTeamIds.add(missingAwayId);
          currentRound++; matchesInCurrentRound = 0; currentRoundTeamIds = new Set(); previousDate = null;
          continue;
        }
      }

      if (LOG_ROUNDS.has(currentRound)) {
        console.log(`  [R${currentRound}] Assign ${eventId} ${item.homeName} vs ${item.awayName} [${currentDate.toISOString().slice(0,10)}] (${matchesInCurrentRound + 1}/${maxMatchesPerRound})`);
      }
      if (eventId) roundByEventId.set(eventId, currentRound);
      matchesInCurrentRound++;
      currentRoundTeamIds.add(item.homeId);
      currentRoundTeamIds.add(item.awayId);
      previousDate = currentDate;
      index++;
    }
  } catch (e) {
    console.error(e);
    process.exit(2);
  }
})();
