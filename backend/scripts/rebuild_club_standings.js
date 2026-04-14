require('dotenv').config();

const { Pool } = require('pg');
const { StandingsCalculatorService } = require('../dist/standings/standings-calculator.service.js');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const calculator = new StandingsCalculatorService();

const [sportIdArg, leagueIdArg, seasonIdArg, ...clubIdArgs] = process.argv.slice(2);

if (!sportIdArg || !leagueIdArg || !seasonIdArg || clubIdArgs.length === 0) {
  console.error('Usage: node scripts/rebuild_club_standings.js <sportId> <leagueId> <seasonId> <clubId> [clubId...]');
  process.exit(1);
}

const sportId = Number(sportIdArg);
const leagueId = Number(leagueIdArg);
const seasonId = Number(seasonIdArg);
const clubIds = clubIdArgs.map(Number).filter(Number.isFinite);

const updateSql = `
  update standings
  set points = $2,
      played = $3,
      wins = $4,
      draws = $5,
      losses = $6,
      goals_for = $7,
      goals_against = $8,
      sets_won = $9,
      sets_lost = $10,
      home_games_played = $11,
      away_games_played = $12,
      home_points = $13,
      away_points = $14,
      home_wins = $15,
      home_draws = $16,
      home_losses = $17,
      home_goals_for = $18,
      home_goals_against = $19,
      away_wins = $20,
      away_draws = $21,
      away_losses = $22,
      away_goals_for = $23,
      away_goals_against = $24,
      overtime_wins = $25,
      overtime_losses = $26,
      penalty_wins = $27,
      penalty_losses = $28,
      regulation_wins = $29,
      regulation_ot_wins = $30,
      updated_at = now()
  where id = $1
`;

async function main() {
  const sportRes = await pool.query('select name from sports where id = $1 limit 1', [sportId]);
  const sportName = sportRes.rows[0]?.name ?? 'Football';

  await pool.query('BEGIN');

  for (const clubId of clubIds) {
    const standingsRes = await pool.query(
      `
        select s.id as standings_id,
               s.round_id,
               s.group_id,
               s.match_id,
               m.date as match_date,
               m.home_club_id,
               m.away_club_id,
               m.home_score,
               m.away_score
        from standings s
        inner join matches m on m.id = s.match_id
        where s.club_id = $1 and s.league_id = $2 and s.season_id = $3
        order by m.date asc, s.id asc
      `,
      [clubId, leagueId, seasonId],
    );

    let previousStanding = null;

    for (const row of standingsRes.rows) {
      const divisionRes = await pool.query(
        `
          select id,
                 division_number as "divisionNumber",
                 division_type as "divisionType",
                 home_score as "homeScore",
                 away_score as "awayScore"
          from match_divisions
          where match_id = $1
          order by division_number asc, id asc
        `,
        [row.match_id],
      );

      const matchData = {
        sportId,
        leagueId,
        seasonId,
        roundId: row.round_id,
        matchDate: row.match_date,
        groupId: row.group_id,
        homeClubId: row.home_club_id,
        awayClubId: row.away_club_id,
        homeScore: row.home_score ?? 0,
        awayScore: row.away_score ?? 0,
        matchId: row.match_id,
        matchDivisions: divisionRes.rows,
      };

      const isHome = row.home_club_id === clubId;
      const result = isHome
        ? calculator.calculate(sportName, matchData, previousStanding, null).home
        : calculator.calculate(sportName, matchData, null, previousStanding).away;

      await pool.query(updateSql, [
        row.standings_id,
        result.points,
        result.played,
        result.wins,
        result.draws,
        result.losses,
        result.goalsFor,
        result.goalsAgainst,
        result.setsWon,
        result.setsLost,
        result.homeGamesPlayed,
        result.awayGamesPlayed,
        result.homePoints,
        result.awayPoints,
        result.homeWins,
        result.homeDraws,
        result.homeLosses,
        result.homeGoalsFor,
        result.homeGoalsAgainst,
        result.awayWins,
        result.awayDraws,
        result.awayLosses,
        result.awayGoalsFor,
        result.awayGoalsAgainst,
        result.overtimeWins,
        result.overtimeLosses,
        result.penaltyWins,
        result.penaltyLosses,
        result.regulationWins,
        result.regulationOtWins,
      ]);

      previousStanding = result;
    }
  }

  await pool.query('COMMIT');
}

main()
  .then(async () => {
    await pool.end();
    console.log('Club standings rebuilt successfully.');
  })
  .catch(async (error) => {
    try {
      await pool.query('ROLLBACK');
    } catch {}
    console.error(error);
    await pool.end();
    process.exit(1);
  });