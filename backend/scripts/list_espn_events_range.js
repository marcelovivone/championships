(async () => {
  try {
    const endpoint = 'https://site.api.espn.com/apis/site/v2/sports/soccer/eng.1/scoreboard?dates=20250801-20260531&limit=1000';
    const resp = await fetch(endpoint);
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    const json = await resp.json();
    const events = json.events ?? [];
    const start = new Date('2026-02-21T00:00:00Z');
    const end = new Date('2026-02-23T23:59:59Z');
    const inRange = events.filter(e => {
      const competition = e?.competitions?.[0];
      const raw = competition?.startDate ?? competition?.date ?? e?.date ?? null;
      if (!raw) return false;
      const d = new Date(String(raw));
      return d >= start && d <= end;
    }).map(e => {
      const competition = e?.competitions?.[0];
      const competitors = competition?.competitors ?? [];
      const home = competitors.find(c => c.homeAway === 'home') ?? competitors[0] ?? null;
      const away = competitors.find(c => c.homeAway === 'away') ?? competitors[1] ?? competitors.find(c => c !== home) ?? null;
      return {
        id: e.id,
        date: (competition?.startDate ?? competition?.date ?? e?.date) || null,
        home: home?.team?.displayName ?? home?.team?.name ?? null,
        away: away?.team?.displayName ?? away?.team?.name ?? null,
      };
    });
    console.log(`Events between 2026-02-21 and 2026-02-23: ${inRange.length}`);
    console.log(JSON.stringify(inRange, null, 2));
  } catch (err) {
    console.error(err);
    process.exit(2);
  }
})();
