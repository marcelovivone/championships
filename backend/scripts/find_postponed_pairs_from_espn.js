const https = require('https');

const URL = 'https://site.api.espn.com/apis/site/v2/sports/soccer/bra.1/scoreboard?dates=20250101-20251231&limit=2000';
const THRESHOLD_DAYS = 30;

function fetchJson(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (err) {
          reject(err);
        }
      });
    }).on('error', reject);
  });
}

function toISO(d) {
  return new Date(d).toISOString().replace(/T.*$/, '');
}

(async function main() {
  try {
    const json = await fetchJson(URL);
    const events = Array.isArray(json.events) ? json.events : [];

    const pairs = new Map();

    for (const ev of events) {
      const id = ev.id || (ev.uid && ev.uid.split('~e:')[1]) || String(Math.random()).slice(2);
      const date = ev.date;
      if (!ev.competitions || !ev.competitions[0] || !ev.competitions[0].competitors) continue;
      const comps = ev.competitions[0].competitors;
      if (comps.length < 2) continue;
      const home = comps.find(c => c.homeAway === 'home') || comps[0];
      const away = comps.find(c => c.homeAway === 'away') || comps[1];
      const homeId = String(home.id);
      const awayId = String(away.id);
      const key = homeId < awayId ? `${homeId}-${awayId}` : `${awayId}-${homeId}`;
      if (!pairs.has(key)) pairs.set(key, []);
      pairs.get(key).push({ eventId: id, date, homeId, awayId });
    }

    const results = [];
    for (const [key, list] of pairs) {
      if (list.length < 2) continue;
      list.sort((a,b) => new Date(a.date) - new Date(b.date));
      for (let i=1;i<list.length;i++){
        const prev = new Date(list[i-1].date);
        const cur = new Date(list[i].date);
        const diffDays = Math.round((cur - prev) / (1000*60*60*24));
        if (diffDays >= THRESHOLD_DAYS) {
          results.push({ pair: key, gapDays: diffDays, earlier: {id: list[i-1].eventId, date: list[i-1].date}, later: {id: list[i].eventId, date: list[i].date} });
        }
      }
    }

    if (results.length === 0) {
      console.log('No long-gap postponed pairs found (threshold days:', THRESHOLD_DAYS, ')');
      process.exit(0);
    }

    console.log('Found long-gap pairs (>=', THRESHOLD_DAYS, 'days):');
    for (const r of results) {
      console.log(`- Pair ${r.pair}: ${r.earlier.id} (${toISO(r.earlier.date)}) -> ${r.later.id} (${toISO(r.later.date)}) — gap ${r.gapDays} days`);
    }
  } catch (err) {
    console.error('Error:', err && err.message ? err.message : err);
    process.exit(2);
  }
})();
