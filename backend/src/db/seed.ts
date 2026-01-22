import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as dotenv from 'dotenv';
import * as schema from './schema';
import { countries, sports, leagues, cities, stadiums, clubs } from './schema';
import { eq } from 'drizzle-orm';

dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const db = drizzle(pool, { schema });

async function main() {
  console.log('--- Starting Database Cleanup ---');
  // Cascading truncate to remove all data while keeping the structure
  await pool.query(`
    TRUNCATE TABLE 
      match_events, match_divisions, matches, standings, 
      group_clubs, groups, rounds, phases, seasons, 
      league_divisions, league_links, leagues, 
      club_stadiums, clubs, stadiums, cities, 
      countries, sports CASCADE;
  `);

  console.log('--- Seeding Countries with Flag URLs ---');
  const countriesData = [
    // South America
    { name: 'Brazil', continent: 'South America', code: 'BRA', flagUrl: 'https://flagcdn.com/br.svg' },
    { name: 'Argentina', continent: 'South America', code: 'ARG', flagUrl: 'https://flagcdn.com/ar.svg' },
    // North America
    { name: 'United States', continent: 'North America', code: 'USA', flagUrl: 'https://flagcdn.com/us.svg' },
    { name: 'Canada', continent: 'North America', code: 'CAN', flagUrl: 'https://flagcdn.com/ca.svg' },
    // Europe
    { name: 'Spain', continent: 'Europe', code: 'ESP', flagUrl: 'https://flagcdn.com/es.svg' },
    { name: 'Germany', continent: 'Europe', code: 'GER', flagUrl: 'https://flagcdn.com/de.svg' },
    { name: 'United Kingdom', continent: 'Europe', code: 'GBR', flagUrl: 'https://flagcdn.com/gb.svg' },
    { name: 'Italy', continent: 'Europe', code: 'ITA', flagUrl: 'https://flagcdn.com/it.svg' },
    { name: 'France', continent: 'Europe', code: 'FRA', flagUrl: 'https://flagcdn.com/fr.svg' },
    { name: 'Portugal', continent: 'Europe', code: 'POR', flagUrl: 'https://flagcdn.com/pt.svg' },
    { name: 'Sweden', continent: 'Europe', code: 'SWE', flagUrl: 'https://flagcdn.com/se.svg' },
    { name: 'Finland', continent: 'Europe', code: 'FIN', flagUrl: 'https://flagcdn.com/fi.svg' },
    { name: 'Poland', continent: 'Europe', code: 'POL', flagUrl: 'https://flagcdn.com/pl.svg' },
    { name: 'Norway', continent: 'Europe', code: 'NOR', flagUrl: 'https://flagcdn.com/no.svg' },
    { name: 'Greece', continent: 'Europe', code: 'GRE', flagUrl: 'https://flagcdn.com/gr.svg' },
    { name: 'Czech Republic', continent: 'Europe', code: 'CZE', flagUrl: 'https://flagcdn.com/cz.svg' },
    { name: 'Romania', continent: 'Europe', code: 'ROU', flagUrl: 'https://flagcdn.com/ro.svg' },
    { name: 'Turkey', continent: 'Europe', code: 'TUR', flagUrl: 'https://flagcdn.com/tr.svg' },
    { name: 'Russia', continent: 'Europe', code: 'RUS', flagUrl: 'https://flagcdn.com/ru.svg' },
    // Asia
    { name: 'China', continent: 'Asia', code: 'CHN', flagUrl: 'https://flagcdn.com/cn.svg' },
    { name: 'Japan', continent: 'Asia', code: 'JPN', flagUrl: 'https://flagcdn.com/jp.svg' },
    { name: 'Egypt', continent: 'Africa', code: 'EGY', flagUrl: 'https://flagcdn.com/eg.svg' },
  ];
  await db.insert(countries).values(countriesData);

  console.log('--- Seeding Sports with Official Rules (MVP: 6 Collective Sports) ---');
  /**
   * MVP Sports Configuration:
   * 1. Basketball (NBA) - 4 quarters of 12 min, points, overtime allowed
   * 2. Ice Hockey (NHL) - 3 periods of 20 min, goals, overtime + penalties
   * 3. Football (Premier League) - 2 halves of 45 min, goals, overtime + penalties
   * 4. Handball (IHF) - 2 halves of 30 min, goals, overtime allowed
   * 5. Futsal (FIFA) - 2 halves of 20 min, goals, overtime + penalties
   * 6. Volleyball (FIVB) - Up to 5 sets variable time, points, no overtime/penalties
   */
  const sportsData = [
    // Basketball
    {
      name: 'Basketball',
      reducedName: 'BB',
      type: 'collective',
      divisionType: 'quarter',
      divisionsNumber: 4,
      divisionTime: 12, // 12 minutes per quarter
      scoreType: 'points',
      hasOvertime: true,
      hasPenalties: false,
      imageUrl: 'https://img.icons8.com/color/96/basketball.png',
    },
    // Ice Hockey
    {
      name: 'Ice Hockey',
      reducedName: 'IH',
      type: 'collective',
      divisionType: 'period',
      divisionsNumber: 3,
      divisionTime: 20, // 20 minutes per period
      scoreType: 'goals',
      hasOvertime: true,
      hasPenalties: true, // Shootout
      imageUrl: 'https://img.icons8.com/color/96/ice-hockey.png',
    },
    // Football (Soccer)
    {
      name: 'Football',
      reducedName: 'FB',
      type: 'collective',
      divisionType: 'period',
      divisionsNumber: 2,
      divisionTime: 45, // 45 minutes per half
      scoreType: 'goals',
      hasOvertime: true,
      hasPenalties: true,
      imageUrl: 'https://img.icons8.com/color/96/football.png',
    },
    // Handball
    {
      name: 'Handball',
      reducedName: 'HB',
      type: 'collective',
      divisionType: 'period',
      divisionsNumber: 2,
      divisionTime: 30, // 30 minutes per half
      scoreType: 'goals',
      hasOvertime: true,
      hasPenalties: false, // 7-meter throws (not penalties)
      imageUrl: 'https://img.icons8.com/color/96/handball.png',
    },
    // Futsal (Indoor Football)
    {
      name: 'Futsal',
      reducedName: 'FS',
      type: 'collective',
      divisionType: 'period',
      divisionsNumber: 2,
      divisionTime: 20, // 20 minutes per half
      scoreType: 'goals',
      hasOvertime: true,
      hasPenalties: true,
      imageUrl: 'https://img.icons8.com/color/96/football.png',
    },
    // Volleyball
    {
      name: 'Volleyball',
      reducedName: 'VB',
      type: 'collective',
      divisionType: 'set',
      divisionsNumber: 5, // Best of 5 sets
      divisionTime: 0, // No fixed time per set (25 points to win)
      scoreType: 'points',
      hasOvertime: false,
      hasPenalties: false,
      imageUrl: 'https://img.icons8.com/color/96/volleyball.png',
    },
  ];
  await db.insert(sports).values(sportsData);

  // Helper functions to get Foreign Keys
  const getS = async (n: string) => (await db.select().from(sports).where(eq(sports.name, n)).limit(1))[0].id;
  const getC = async (c: string) => (await db.select().from(countries).where(eq(countries.code, c)).limit(1))[0]?.id;

  console.log('--- Seeding Cities ---');
  const citiesData = [
    // USA Cities
    { name: 'New York', countryId: await getC('USA') },
    { name: 'Los Angeles', countryId: await getC('USA') },
    { name: 'Boston', countryId: await getC('USA') },
    { name: 'Chicago', countryId: await getC('USA') },
    { name: 'Miami', countryId: await getC('USA') },
    { name: 'Denver', countryId: await getC('USA') },
    { name: 'Toronto', countryId: await getC('CAN') },
    { name: 'Vancouver', countryId: await getC('CAN') },
    // UK Cities
    { name: 'London', countryId: await getC('GBR') },
    { name: 'Manchester', countryId: await getC('GBR') },
    { name: 'Liverpool', countryId: await getC('GBR') },
    // Europe
    { name: 'Barcelona', countryId: await getC('ESP') },
    { name: 'Madrid', countryId: await getC('ESP') },
    { name: 'Milan', countryId: await getC('ITA') },
    { name: 'Rome', countryId: await getC('ITA') },
    { name: 'Paris', countryId: await getC('FRA') },
    { name: 'Berlin', countryId: await getC('GER') },
    // Brazil
    { name: 'São Paulo', countryId: await getC('BRA') },
    { name: 'Rio de Janeiro', countryId: await getC('BRA') },
    { name: 'Salvador', countryId: await getC('BRA') },
    { name: 'Brasília', countryId: await getC('BRA') },
  ];
  await db.insert(cities).values(citiesData);

  console.log('--- Seeding Stadiums/Gymnasiums ---');
  const stadiumsData = [
    // Basketball Arenas (USA)
    { name: 'Crypto.com Arena', cityId: (await db.select().from(cities).where(eq(cities.name, 'Los Angeles')).limit(1))[0].id, capacity: 19079, yearConstructed: 1999, type: 'gymnasium', imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/4/42/Crypto_Arena_-_September_2022.jpg' },
    { name: 'Madison Square Garden', cityId: (await db.select().from(cities).where(eq(cities.name, 'New York')).limit(1))[0].id, capacity: 19812, yearConstructed: 1968, type: 'gymnasium', imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/9/95/Madison_Square_Garden_-_November_13%2C_2014.jpg' },
    
    // Ice Hockey Arenas (Canada/USA)
    { name: 'Scotiabank Arena', cityId: (await db.select().from(cities).where(eq(cities.name, 'Toronto')).limit(1))[0].id, capacity: 19800, yearConstructed: 1999, type: 'gymnasium', imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/7/76/Scotiabank_Arena_outside.jpg/1024px-Scotiabank_Arena_outside.jpg' },
    { name: 'Rogers Place', cityId: (await db.select().from(cities).where(eq(cities.name, 'Vancouver')).limit(1))[0].id, capacity: 18259, yearConstructed: 2016, type: 'gymnasium', imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/9/98/Rogers_Arena_Oct_2017.jpg' },
    
    // Football Stadiums (UK)
    { name: 'Stamford Bridge', cityId: (await db.select().from(cities).where(eq(cities.name, 'London')).limit(1))[0].id, capacity: 60477, yearConstructed: 1877, type: 'stadium', imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/a/a1/Stamford_Bridge_-_geograph.org.uk_-_1619757.jpg' },
    { name: 'Anfield', cityId: (await db.select().from(cities).where(eq(cities.name, 'Liverpool')).limit(1))[0].id, capacity: 61294, yearConstructed: 1892, type: 'stadium', imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/3/3c/Anfield_Road_End%2C_2013.jpg' },
    { name: 'Old Trafford', cityId: (await db.select().from(cities).where(eq(cities.name, 'Manchester')).limit(1))[0].id, capacity: 74140, yearConstructed: 1910, type: 'stadium', imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/9/95/Old_Trafford_North_2017.jpg' },
    
    // Football Stadiums (Europe)
    { name: 'Camp Nou', cityId: (await db.select().from(cities).where(eq(cities.name, 'Barcelona')).limit(1))[0].id, capacity: 99354, yearConstructed: 1957, type: 'stadium', imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/6/66/Camp_Nou_-_2013-11-01_%281%29.jpg' },
    { name: 'Santiago Bernabéu', cityId: (await db.select().from(cities).where(eq(cities.name, 'Madrid')).limit(1))[0].id, capacity: 81044, yearConstructed: 1947, type: 'stadium', imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/3/38/Bernabeu_1.jpg' },
    
    // Brazil Stadiums
    { name: 'Maracanã', cityId: (await db.select().from(cities).where(eq(cities.name, 'Rio de Janeiro')).limit(1))[0].id, capacity: 76935, yearConstructed: 1950, type: 'stadium', imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/5/5e/Maracana_2013.jpg' },
    { name: 'Estádio do Morumbi', cityId: (await db.select().from(cities).where(eq(cities.name, 'São Paulo')).limit(1))[0].id, capacity: 72039, yearConstructed: 1960, type: 'stadium', imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/f/fc/Estádio_Cícero_Pompeu_de_Toledo_-_2019.jpg' },
  ];
  await db.insert(stadiums).values(stadiumsData);

  console.log('--- Seeding Clubs ---');
  const clubsData = [
    // Basketball
    { name: 'Los Angeles Lakers', shortName: 'LAL', foundationYear: 1947, countryId: await getC('USA'), imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/3/3c/Los_Angeles_Lakers_logo.svg' },
    { name: 'New York Knicks', shortName: 'NYK', foundationYear: 1946, countryId: await getC('USA'), imageUrl: 'https://upload.wikimedia.org/wikipedia/en/2/25/New_York_Knicks_logo.svg' },
    { name: 'Boston Celtics', shortName: 'BOS', foundationYear: 1946, countryId: await getC('USA'), imageUrl: 'https://upload.wikimedia.org/wikipedia/en/8/8f/Boston_Celtics.svg' },
    
    // Ice Hockey
    { name: 'Toronto Maple Leafs', shortName: 'TOR', foundationYear: 1926, countryId: await getC('CAN'), imageUrl: 'https://upload.wikimedia.org/wikipedia/en/b/b0/Toronto_Maple_Leafs_2016_logo.svg' },
    { name: 'Vancouver Canucks', shortName: 'VAN', foundationYear: 1970, countryId: await getC('CAN'), imageUrl: 'https://upload.wikimedia.org/wikipedia/en/3/3a/Vancouver_Canucks_logo.svg' },
    
    // Football
    { name: 'Chelsea FC', shortName: 'CHE', foundationYear: 1905, countryId: await getC('GBR'), imageUrl: 'https://upload.wikimedia.org/wikipedia/en/c/cc/Chelsea_FC.svg' },
    { name: 'Liverpool FC', shortName: 'LIV', foundationYear: 1892, countryId: await getC('GBR'), imageUrl: 'https://upload.wikimedia.org/wikipedia/en/0/0c/Liverpool_FC.svg' },
    { name: 'Manchester United', shortName: 'MUN', foundationYear: 1878, countryId: await getC('GBR'), imageUrl: 'https://upload.wikimedia.org/wikipedia/en/7/7a/Manchester_United_FC_badge.png' },
    { name: 'FC Barcelona', shortName: 'BAR', foundationYear: 1899, countryId: await getC('ESP'), imageUrl: 'https://upload.wikimedia.org/wikipedia/en/4/47/FC_Barcelona_%282009%E2%80%932011%29.svg' },
    { name: 'Real Madrid', shortName: 'RMA', foundationYear: 1902, countryId: await getC('ESP'), imageUrl: 'https://upload.wikimedia.org/wikipedia/en/5/56/Real_Madrid_CF.svg' },
    
    // Brazil Football
    { name: 'Fluminense FC', shortName: 'FLU', foundationYear: 1902, countryId: await getC('BRA'), imageUrl: 'https://upload.wikimedia.org/wikipedia/pt/a/a3/Fluminense_FC_escudo.png' },
    { name: 'São Paulo FC', shortName: 'SAO', foundationYear: 1930, countryId: await getC('BRA'), imageUrl: 'https://upload.wikimedia.org/wikipedia/pt/6/6e/Sao_Paulo_Futebol_Clube.png' },
  ];
  await db.insert(clubs).values(clubsData);

  console.log('--- Seeding Leagues with MVP Configuration ---');
  /**
   * MVP Leagues Configuration per Specifications:
   * - NBA (Basketball): USA, 30 teams, 2 turns, 82 rounds per turn, 4 divisions (East/West)
   * - NHL (Ice Hockey): USA/Canada, 32 teams, 1 turn, 82 rounds, 2 divisions (East/West)
   * - Premier League (Football): UK, 20 teams, 1 turn, 38 rounds, no divisions
   * - IHF Handball: International, varies
   * - Futsal: International/Domestic, varies
   * - Volleyball: International, varies
   */
  const basketballId = await getS('Basketball');
  const hockeyId = await getS('Ice Hockey');
  const footballId = await getS('Football');
  const handballId = await getS('Handball');
  const futsalId = await getS('Futsal');
  const volleyballId = await getS('Volleyball');

  const leaguesData = [
    // Basketball
    {
      originalName: 'National Basketball Association',
      secondaryName: 'NBA',
      sportId: basketballId,
      countryId: await getC('USA'),
      cityId: null,
      startYear: 2024,
      endYear: 2025,
      numberOfTurns: 1,
      numberOfRounds: 82,
      minDivisionsNumber: 4,
      maxDivisionsNumber: 4,
      divisionsTime: null, // Use sport default
      hasOvertimeOverride: null,
      hasPenaltiesOverride: null,
      hasAscends: false,
      ascendsQuantity: null,
      hasDescends: false,
      descendsQuantity: null,
      hasSubLeagues: true,
      numberOfSubLeagues: 2, // East/West Conferences
      imageUrl: 'https://upload.wikimedia.org/wikipedia/en/0/03/National_Basketball_Association_logo.svg',
    },
    // Ice Hockey
    {
      originalName: 'National Hockey League',
      secondaryName: 'NHL',
      sportId: hockeyId,
      countryId: null, // International (USA/Canada)
      cityId: null,
      startYear: 2024,
      endYear: 2025,
      numberOfTurns: 1,
      numberOfRounds: 82,
      minDivisionsNumber: 3,
      maxDivisionsNumber: 3,
      divisionsTime: null,
      hasOvertimeOverride: true, // Allow OT in regular season
      hasPenaltiesOverride: true, // Shootouts in regular season
      hasAscends: false,
      ascendsQuantity: null,
      hasDescends: false,
      descendsQuantity: null,
      hasSubLeagues: true,
      numberOfSubLeagues: 2, // East/West Conferences
      imageUrl: 'https://upload.wikimedia.org/wikipedia/en/3/3a/05_NHL_Shield.svg',
    },
    // Football
    {
      originalName: 'English Premier League',
      secondaryName: 'Premier League',
      sportId: footballId,
      countryId: await getC('GBR'),
      cityId: null,
      startYear: 2024,
      endYear: 2025,
      numberOfTurns: 2, // Home and away
      numberOfRounds: 38,
      minDivisionsNumber: 2,
      maxDivisionsNumber: 2,
      divisionsTime: null,
      hasOvertimeOverride: null, // Use sport default (false for league)
      hasPenaltiesOverride: null,
      hasAscends: true,
      ascendsQuantity: 2, // 2 teams promoted
      hasDescends: true,
      descendsQuantity: 3, // 3 teams relegated
      hasSubLeagues: false,
      numberOfSubLeagues: null,
      imageUrl: 'https://upload.wikimedia.org/wikipedia/en/f/f2/Premier_League_Logo.svg',
    },
    // Handball
    {
      originalName: 'International Handball Federation World Championship',
      secondaryName: 'IHF World Championship',
      sportId: handballId,
      countryId: null,
      cityId: null,
      startYear: 2024,
      endYear: 2025,
      numberOfTurns: 1,
      numberOfRounds: 8, // Example: 4 groups, 2 rounds of matches
      minDivisionsNumber: 2,
      maxDivisionsNumber: 2,
      divisionsTime: null,
      hasOvertimeOverride: true,
      hasPenaltiesOverride: false,
      hasAscends: false,
      ascendsQuantity: null,
      hasDescends: false,
      descendsQuantity: null,
      hasSubLeagues: true,
      numberOfSubLeagues: 4, // Groups A, B, C, D
      imageUrl: 'https://upload.wikimedia.org/wikipedia/en/5/5c/International_Handball_Federation_logo.svg',
    },
    // Futsal
    {
      originalName: 'FIFA Futsal World Cup',
      secondaryName: 'Futsal WC',
      sportId: futsalId,
      countryId: null,
      cityId: null,
      startYear: 2024,
      endYear: 2025,
      numberOfTurns: 1,
      numberOfRounds: 4,
      minDivisionsNumber: 2,
      maxDivisionsNumber: 2,
      divisionsTime: null,
      hasOvertimeOverride: true,
      hasPenaltiesOverride: true,
      hasAscends: false,
      ascendsQuantity: null,
      hasDescends: false,
      descendsQuantity: null,
      hasSubLeagues: true,
      numberOfSubLeagues: 4, // Groups
      imageUrl: 'https://upload.wikimedia.org/wikipedia/en/f/f4/FIFA_Logo.svg',
    },
    // Volleyball
    {
      originalName: 'FIVB Volleyball Men\'s World Championship',
      secondaryName: 'Volleyball WC',
      sportId: volleyballId,
      countryId: null,
      cityId: null,
      startYear: 2024,
      endYear: 2025,
      numberOfTurns: 1,
      numberOfRounds: 3,
      minDivisionsNumber: 3,
      maxDivisionsNumber: 5,
      divisionsTime: null,
      hasOvertimeOverride: null,
      hasPenaltiesOverride: null,
      hasAscends: false,
      ascendsQuantity: null,
      hasDescends: false,
      descendsQuantity: null,
      hasSubLeagues: true,
      numberOfSubLeagues: 4, // Groups
      imageUrl: 'https://upload.wikimedia.org/wikipedia/en/9/91/FIVB_logo.png',
    },
  ];
  await db.insert(leagues).values(leaguesData);

  console.log('--- Seeding Process Completed Successfully ---');
  process.exit(0);
}

main().catch((err) => {
  console.error('Seeding failed:', err);
  process.exit(1);
});