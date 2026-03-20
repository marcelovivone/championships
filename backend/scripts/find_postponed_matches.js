#!/usr/bin/env node
(async () => {
  try {
    const endpoint = 'https://site.api.espn.com/apis/site/v2/sports/soccer/bra.1/scoreboard?dates=20250101-20251231&limit=2000';
    console.log('Fetching ESPN Brasil scoreboard (2025)...');
    const resp = await fetch(endpoint);
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    const json = await resp.json();
    const events = json.events ?? [];
    console.log(`Fetched ${events.length} events`);

    const normalizePair = (homeId, awayId) => (homeId && awayId) ? [String(homeId), String(awayId)].sort().join('-') : null;

    const byPair = new Map();
    for (const ev of events) {
      const comp = ev?.competitions?.[0];
      if (!comp) continue;
      const competitors = comp.competitors ?? [];
      const home = competitors.find(c => c.homeAway === 'home') ?? competitors[0];
      const away = competitors.find(c => c.homeAway === 'away') ?? competitors[1] ?? competitors.find(c => c !== home);
      const homeId = home?.team?.id ?? home?.id;
      const awayId = away?.team?.id ?? away?.id;
      const pairKey = normalizePair(homeId, awayId);
      if (!pairKey) continue;
      const dateRaw = comp?.startDate ?? ev?.date ?? null;
      const date = dateRaw ? new Date(String(dateRaw)) : null;
      if (!date) continue;
      if (!byPair.has(pairKey)) byPair.set(pairKey, []);
      byPair.get(pairKey).push({ id: ev.id, date: date.toISOString(), home: home?.team?.displayName, away: away?.team?.displayName });
    }

    const longGaps = [];
    for (const [pair, matches] of byPair.entries()) {
      if (matches.length < 2) continue;
      const sorted = matches.sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      for (let i = 1; i < sorted.length; i++) {
        const prev = new Date(sorted[i-1].date);
        const cur = new Date(sorted[i].date);
        const days = Math.round((cur - prev) / (24*60*60*1000));
        if (days >= 30) {
          longGaps.push({ pair, prev: sorted[i-1], cur: sorted[i], gapDays: days });
        }
      }
    }

    if (!longGaps.length) {
      console.log('No match pairs played 30+ days apart found in the 2025 ESPN payload.');
      process.exit(0);
    }

    console.log(`Found ${longGaps.length} match pairs with gaps >= 30 days:`);
    for (const g of longGaps.sort((a,b) => b.gapDays - a.gapDays)) {
      console.log(`\nPair: ${g.pair} — gap ${g.gapDays} days`);
      console.log(`  Earlier: [${g.prev.date.slice(0,10)}] ${g.prev.home} vs ${g.prev.away} (event ${g.prev.id})`);
      console.log(`  Later:   [${g.cur.date.slice(0,10)}] ${g.cur.home} vs ${g.cur.away} (event ${g.cur.id})`);
    }
    process.exit(0);
  } catch (e) {
    console.error('Error:', e && e.stack ? e.stack : String(e));
    process.exit(2);
  }
})();
