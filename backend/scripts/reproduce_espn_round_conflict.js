(async () => {
  try {
    const endpoint = 'https://site.api.espn.com/apis/site/v2/sports/soccer/eng.1/scoreboard?dates=20250801-20260531&limit=1000';
    console.log('Fetching ESPN scoreboard...');
    const resp = await fetch(endpoint);
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    const json = await resp.json();
    const events = json.events ?? [];
    console.log(`Fetched ${events.length} events`);

    const getEspnRoundNumbers = (items) => {
      const roundByEventId = new Map();
      const uniqueClubIds = new Set();
      const reservedEventIds = new Set();
      const getTeamId = (competitor) => {
        const teamId = competitor?.team?.id ?? competitor?.id;
        return teamId !== undefined && teamId !== null ? String(teamId) : null;
      };
      const getTeamName = (competitor) => competitor?.team?.displayName ?? competitor?.team?.shortDisplayName ?? competitor?.team?.name ?? null;
      for (const event of items) {
        const competition = event?.competitions?.[0];
        const competitors = competition?.competitors ?? [];
        for (const competitor of competitors) {
          const teamId = getTeamId(competitor);
          if (teamId) uniqueClubIds.add(teamId);
        }
      }
      const allTeamIds = Array.from(uniqueClubIds);
      const maxMatchesPerRound = uniqueClubIds.size >= 2 ? Math.floor(uniqueClubIds.size / 2) : null;
      const toUtcDay = (date) => Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
      const sortableEvents = items
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

      let currentRound = 1;
      let previousDate = null;
      let matchesInCurrentRound = 0;
      let currentRoundTeamIds = new Set();
      let index = 0;
      while (index < sortableEvents.length) {
        const item = sortableEvents[index];
        const currentDate = item.date;
        const eventId = item.event?.id !== undefined && item.event?.id !== null ? String(item.event.id) : null;
        if (!item.homeId || !item.awayId) {
          previousDate = currentDate;
          index += 1;
          continue;
        }
        if (eventId && reservedEventIds.has(eventId)) {
          previousDate = currentDate;
          index += 1;
          continue;
        }
        const roundReachedExpectedSize = maxMatchesPerRound !== null && matchesInCurrentRound >= maxMatchesPerRound;
        if (roundReachedExpectedSize) {
          currentRound += 1;
          matchesInCurrentRound = 0;
          currentRoundTeamIds = new Set();
          previousDate = null;
          continue;
        }
        if (previousDate) {
          const diffInDays = Math.floor((toUtcDay(currentDate) - toUtcDay(previousDate)) / (24 * 60 * 60 * 1000));
          const hasRestDayBetweenMatches = diffInDays > 1;
          const shouldSplitByGap = maxMatchesPerRound === null && hasRestDayBetweenMatches;
          if (shouldSplitByGap) {
            currentRound += 1;
            matchesInCurrentRound = 0;
            currentRoundTeamIds = new Set();
            previousDate = null;
            continue;
          }
        }
        const teamAlreadyInRound = currentRoundTeamIds.has(item.homeId) || currentRoundTeamIds.has(item.awayId);
        if (teamAlreadyInRound && maxMatchesPerRound !== null) {
          const missingTeamIds = allTeamIds.filter((teamId) => !currentRoundTeamIds.has(teamId));
          const teamNamesById = new Map();
          for (const entry of sortableEvents) {
            if (entry.homeId && entry.homeName && !teamNamesById.has(entry.homeId)) teamNamesById.set(entry.homeId, entry.homeName);
            if (entry.awayId && entry.awayName && !teamNamesById.has(entry.awayId)) teamNamesById.set(entry.awayId, entry.awayName);
          }
          if (missingTeamIds.length > 2) {
            // Stray-match backtrack: unassign any already-assigned event for this
            // round whose date is > STRAY_THRESHOLD_DAYS before the conflict event.
            const STRAY_THRESHOLD_DAYS = 3;
            let backtracked = false;
            const currentRoundEntries = Array.from(roundByEventId.entries())
              .filter(([, r]) => r === currentRound);
            for (const [assignedEventId] of currentRoundEntries) {
              const assignedItem = sortableEvents.find(
                (se) => se.event?.id != null && String(se.event.id) === assignedEventId,
              );
              if (!assignedItem?.date) continue;
              const daysBefore = Math.floor(
                (toUtcDay(currentDate) - toUtcDay(assignedItem.date)) / (24 * 60 * 60 * 1000),
              );
              if (daysBefore > STRAY_THRESHOLD_DAYS) {
                console.log(`  → Unassigning stray event ${assignedEventId} (${assignedItem.homeName} vs ${assignedItem.awayName}, ${assignedItem.date.toISOString().slice(0,10)}) from round ${currentRound} — ${daysBefore} days before conflict event`);
                roundByEventId.delete(assignedEventId);
                if (assignedItem.homeId) currentRoundTeamIds.delete(assignedItem.homeId);
                if (assignedItem.awayId) currentRoundTeamIds.delete(assignedItem.awayId);
                matchesInCurrentRound -= 1;
                backtracked = true;
                break;
              }
            }
            if (backtracked) continue;

            return {
              roundByEventId,
              reservedEventIds,
              conflict: {
                reason: 'round_assignment_conflict',
                message: `Round ${currentRound} is missing ${missingTeamIds.length / 2} matches; automatic lookup only supports one missing match.`,
                details: {
                  round: currentRound,
                  expectedMatches: maxMatchesPerRound,
                  assignedMatches: matchesInCurrentRound,
                  currentEvent: {
                    id: item.event?.id ?? null,
                    date: item.event?.date ?? currentDate.toISOString(),
                    homeTeam: item.homeName,
                    awayTeam: item.awayName,
                  },
                  missingTeams: missingTeamIds.map((teamId) => ({ id: teamId, name: teamNamesById.get(teamId) ?? teamId })),
                  consoleLog: `Missing team IDs in round ${currentRound}: ${missingTeamIds.join(', ')}. Current round team IDs: ${Array.from(currentRoundTeamIds).join(', ')}. All team IDs: ${allTeamIds.join(', ')}.`,
                },
              },
            };
          }
          if (missingTeamIds.length === 2) {
            const [missingHomeId, missingAwayId] = missingTeamIds;
            const foundReplacement = sortableEvents.find((candidate, candidateIndex) => {
              if (candidateIndex <= index) return false;
              const candidateEventId = candidate.event?.id !== undefined && candidate.event?.id !== null ? String(candidate.event.id) : null;
              if (!candidateEventId || reservedEventIds.has(candidateEventId) || roundByEventId.has(candidateEventId)) return false;
              return (
                (candidate.homeId === missingHomeId && candidate.awayId === missingAwayId) ||
                (candidate.homeId === missingAwayId && candidate.awayId === missingHomeId)
              );
            });
            if (!foundReplacement) {
              return {
                roundByEventId,
                reservedEventIds,
                conflict: {
                  reason: 'round_assignment_conflict',
                  message: `Round ${currentRound} is missing one postponed match, but no future fixture was found for the two missing teams.`,
                  details: {
                    round: currentRound,
                    expectedMatches: maxMatchesPerRound,
                    assignedMatches: matchesInCurrentRound,
                    currentEvent: {
                      id: item.event?.id ?? null,
                      date: item.event?.date ?? currentDate.toISOString(),
                      homeTeam: item.homeName,
                      awayTeam: item.awayName,
                    },
                    missingTeams: missingTeamIds.map((teamId) => ({ id: teamId, name: teamNamesById.get(teamId) ?? teamId })),
                  },
                },
              };
            }
            const replacementEventId = String(foundReplacement.event.id);
            roundByEventId.set(replacementEventId, currentRound);
            reservedEventIds.add(replacementEventId);
            matchesInCurrentRound += 1;
            currentRoundTeamIds.add(missingHomeId);
            currentRoundTeamIds.add(missingAwayId);
            currentRound += 1;
            matchesInCurrentRound = 0;
            currentRoundTeamIds = new Set();
            previousDate = null;
            continue;
          }
        }
        if (eventId) roundByEventId.set(eventId, currentRound);
        matchesInCurrentRound += 1;
        currentRoundTeamIds.add(item.homeId);
        currentRoundTeamIds.add(item.awayId);
        previousDate = currentDate;
        index += 1;
      }
      return { roundByEventId, reservedEventIds, conflict: null };
    };

    const roundResult = getEspnRoundNumbers(events);
    if (roundResult.conflict) {
      console.log('CONFLICT DETECTED');
      console.log(JSON.stringify(roundResult.conflict, null, 2));
      process.exit(1);
    }
    console.log('No conflict detected. ✓');

    // Build a per-round summary: list events, verify no team appears twice in any round
    const byRound = new Map();
    for (const [eventId, round] of roundResult.roundByEventId.entries()) {
      if (!byRound.has(round)) byRound.set(round, []);
      const ev = events.find(e => String(e.id) === String(eventId));
      if (ev) {
        const comp = ev.competitions?.[0];
        const competitors = comp?.competitors ?? [];
        const home = competitors.find(c => c.homeAway === 'home') ?? competitors[0];
        const away = competitors.find(c => c.homeAway === 'away') ?? competitors[1];
        byRound.get(round).push({
          id: eventId,
          date: (comp?.startDate ?? ev.date ?? '').slice(0,10),
          home: home?.team?.displayName ?? '?',
          away: away?.team?.displayName ?? '?',
        });
      }
    }

    console.log(`\nTotal rounds assigned: ${byRound.size}`);
    console.log(`Stray (unassigned) events: ${events.length - roundResult.roundByEventId.size}\n`);

    let hasError = false;
    for (const [round, matches] of [...byRound.entries()].sort((a,b)=>a[0]-b[0])) {
      const teamsSeen = new Set();
      let dupe = false;
      for (const m of matches) {
        // look up team IDs
        const ev = events.find(e => String(e.id) === String(m.id));
        const comp = ev?.competitions?.[0];
        const competitors = comp?.competitors ?? [];
        for (const c of competitors) {
          const tid = c?.team?.id ?? c?.id;
          if (tid && teamsSeen.has(String(tid))) dupe = true;
          if (tid) teamsSeen.add(String(tid));
        }
      }
      const flag = dupe ? ' ← TEAM DUPLICATE!' : '';
      if (dupe) hasError = true;
      // Only print rounds 25-28 in detail and any flagged rounds
      if (round >= 25 && round <= 28 || dupe) {
        console.log(`Round ${round} (${matches.length} games)${flag}:`);
        for (const m of matches.sort((a,b) => a.date.localeCompare(b.date))) {
          console.log(`  [${m.date}] ${m.home} vs ${m.away} (event ${m.id})`);
        }
      }
    }

    if (!hasError) console.log('\nAll rounds validated — no team appears twice in any round. ✓');
  } catch (e) {
    console.error('Error:', e);
    process.exit(2);
  }
})();
