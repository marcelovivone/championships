import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as dotenv from 'dotenv';
import * as bcrypt from 'bcrypt';
import * as schema from './schema';
import { countries, sports, leagues, cities, stadiums, clubs, menuItems, profilePermissions, users } from './schema';
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
      groups, seasons, 
      league_divisions, league_links, leagues, 
      club_stadiums, clubs, stadiums, cities, 
      countries, sports, 
      user_permissions, profile_permissions, menu_items CASCADE;
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
      minMatchDivisionNumber: 4,
      maxMatchDivisionNumber: 4,
      divisionTime: 12, // 12 minutes per quarter
      scoreType: 'points',
      hasOvertime: true,
      hasPenalties: false,
      flgDefault: false,
      imageUrl: 'https://img.icons8.com/color/96/basketball.png',
    },
    // Ice Hockey
    {
      name: 'Ice Hockey',
      reducedName: 'IH',
      type: 'collective',
      divisionType: 'period',
      minMatchDivisionNumber: 3,
      maxMatchDivisionNumber: 3,
      divisionTime: 20, // 20 minutes per period
      scoreType: 'goals',
      hasOvertime: true,
      hasPenalties: true, // Shootout
      flgDefault: false,
      imageUrl: 'https://img.icons8.com/color/96/ice-hockey.png',
    },
    // Football (Soccer)
    {
      name: 'Football',
      reducedName: 'FB',
      type: 'collective',
      divisionType: 'period',
      minMatchDivisionNumber: 2,
      maxMatchDivisionNumber: 2,
      divisionTime: 45, // 45 minutes per half
      scoreType: 'goals',
      hasOvertime: true,
      hasPenalties: true,
      flgDefault: true, // Set Football as default sport
      imageUrl: 'https://img.icons8.com/color/96/football.png',
    },
    // Handball
    {
      name: 'Handball',
      reducedName: 'HB',
      type: 'collective',
      divisionType: 'period',
      minMatchDivisionNumber: 2,
      maxMatchDivisionNumber: 2,
      divisionTime: 30, // 30 minutes per half
      scoreType: 'goals',
      hasOvertime: true,
      hasPenalties: false, // 7-meter throws (not penalties)
      flgDefault: false,
      imageUrl: 'https://img.icons8.com/color/96/handball.png',
    },
    // Futsal (Indoor Football)
    {
      name: 'Futsal',
      reducedName: 'FS',
      type: 'collective',
      divisionType: 'period',
      minMatchDivisionNumber: 2,
      maxMatchDivisionNumber: 2,
      divisionTime: 20, // 20 minutes per half
      scoreType: 'goals',
      hasOvertime: true,
      hasPenalties: true,
      flgDefault: false,
      imageUrl: 'https://img.icons8.com/color/96/football.png',
    },
    // Volleyball
    {
      name: 'Volleyball',
      reducedName: 'VB',
      type: 'collective',
      divisionType: 'set',
      minMatchDivisionNumber: 3,
      maxMatchDivisionNumber: 5, // Best of 5 sets
      divisionTime: 0, // No fixed time per set (25 points to win)
      scoreType: 'points',
      hasOvertime: false,
      hasPenalties: false,
      flgDefault: false,
      imageUrl: 'https://img.icons8.com/color/96/volleyball.png',
    },
  ];
  await db.insert(sports).values(sportsData);

  // Helper functions to get Foreign Keys
  const getS = async (n: string) => (await db.select().from(sports).where(eq(sports.name, n)).limit(1))[0].id;
  const getC = async (c: string) => (await db.select().from(countries).where(eq(countries.code, c)).limit(1))[0]?.id;

  console.log('--- Seeding Cities ---');
  const citiesData = [
    // USA Cities (NBA + NHL)
    { name: 'Atlanta', countryId: await getC('USA') },
    { name: 'Boston', countryId: await getC('USA') },
    { name: 'Brooklyn', countryId: await getC('USA') },
    { name: 'Charlotte', countryId: await getC('USA') },
    { name: 'Chicago', countryId: await getC('USA') },
    { name: 'Cleveland', countryId: await getC('USA') },
    { name: 'Dallas', countryId: await getC('USA') },
    { name: 'Denver', countryId: await getC('USA') },
    { name: 'Detroit', countryId: await getC('USA') },
    { name: 'Golden State', countryId: await getC('USA') },
    { name: 'Houston', countryId: await getC('USA') },
    { name: 'Indianapolis', countryId: await getC('USA') },
    { name: 'Los Angeles', countryId: await getC('USA') },
    { name: 'Memphis', countryId: await getC('USA') },
    { name: 'Miami', countryId: await getC('USA') },
    { name: 'Milwaukee', countryId: await getC('USA') },
    { name: 'Minneapolis', countryId: await getC('USA') },
    { name: 'New Orleans', countryId: await getC('USA') },
    { name: 'New York', countryId: await getC('USA') },
    { name: 'Oklahoma City', countryId: await getC('USA') },
    { name: 'Orlando', countryId: await getC('USA') },
    { name: 'Philadelphia', countryId: await getC('USA') },
    { name: 'Phoenix', countryId: await getC('USA') },
    { name: 'Portland', countryId: await getC('USA') },
    { name: 'Sacramento', countryId: await getC('USA') },
    { name: 'San Antonio', countryId: await getC('USA') },
    { name: 'San Francisco', countryId: await getC('USA') },
    { name: 'Seattle', countryId: await getC('USA') },
    { name: 'Salt Lake City', countryId: await getC('USA') },
    { name: 'Washington', countryId: await getC('USA') },
    { name: 'Anaheim', countryId: await getC('USA') },
    { name: 'Buffalo', countryId: await getC('USA') },
    { name: 'Columbus', countryId: await getC('USA') },
    { name: 'Newark', countryId: await getC('USA') },
    { name: 'Pittsburgh', countryId: await getC('USA') },
    { name: 'Raleigh', countryId: await getC('USA') },
    { name: 'San Jose', countryId: await getC('USA') },
    { name: 'St. Louis', countryId: await getC('USA') },
    { name: 'Tampa', countryId: await getC('USA') },
    { name: 'Las Vegas', countryId: await getC('USA') },
    { name: 'Nashville', countryId: await getC('USA') },
    { name: 'Sunrise', countryId: await getC('USA') },
    { name: 'Glendale', countryId: await getC('USA') },
    // Canada Cities (NHL + OHL)
    { name: 'Toronto', countryId: await getC('CAN') },
    { name: 'Montreal', countryId: await getC('CAN') },
    { name: 'Ottawa', countryId: await getC('CAN') },
    { name: 'Winnipeg', countryId: await getC('CAN') },
    { name: 'Calgary', countryId: await getC('CAN') },
    { name: 'Edmonton', countryId: await getC('CAN') },
    { name: 'Vancouver', countryId: await getC('CAN') },
    { name: 'Barrie', countryId: await getC('CAN') },
    { name: 'Brampton', countryId: await getC('CAN') },
    { name: 'Brantford', countryId: await getC('CAN') },
    { name: 'Flint', countryId: await getC('USA') },
    { name: 'Guelph', countryId: await getC('CAN') },
    { name: 'Kingston', countryId: await getC('CAN') },
    { name: 'Kitchener', countryId: await getC('CAN') },
    { name: 'London', countryId: await getC('CAN') },
    { name: 'Mississauga', countryId: await getC('CAN') },
    { name: 'Niagara Falls', countryId: await getC('CAN') },
    { name: 'North Bay', countryId: await getC('CAN') },
    { name: 'Oshawa', countryId: await getC('CAN') },
    { name: 'Owen Sound', countryId: await getC('CAN') },
    { name: 'Peterborough', countryId: await getC('CAN') },
    { name: 'Saginaw', countryId: await getC('USA') },
    { name: 'Sarnia', countryId: await getC('CAN') },
    { name: 'Sault Ste. Marie', countryId: await getC('CAN') },
    { name: 'Sudbury', countryId: await getC('CAN') },
    { name: 'Windsor', countryId: await getC('CAN') },
    // UK Cities (Premier League)
    { name: 'London', countryId: await getC('GBR') },
    { name: 'Manchester', countryId: await getC('GBR') },
    { name: 'Liverpool', countryId: await getC('GBR') },
    { name: 'Newcastle', countryId: await getC('GBR') },
    { name: 'Birmingham', countryId: await getC('GBR') },
    { name: 'Southampton', countryId: await getC('GBR') },
    { name: 'Wolverhampton', countryId: await getC('GBR') },
    { name: 'Leicester', countryId: await getC('GBR') },
    { name: 'Brighton', countryId: await getC('GBR') },
    { name: 'Nottingham', countryId: await getC('GBR') },
    { name: 'Ipswich', countryId: await getC('GBR') },
    { name: 'Bournemouth', countryId: await getC('GBR') },
    { name: 'Brentford', countryId: await getC('GBR') },
    // Brazil Cities (Série A)
    { name: 'São Paulo', countryId: await getC('BRA') },
    { name: 'Rio de Janeiro', countryId: await getC('BRA') },
    { name: 'Belo Horizonte', countryId: await getC('BRA') },
    { name: 'Porto Alegre', countryId: await getC('BRA') },
    { name: 'Curitiba', countryId: await getC('BRA') },
    { name: 'Salvador', countryId: await getC('BRA') },
    { name: 'Brasília', countryId: await getC('BRA') },
    { name: 'Fortaleza', countryId: await getC('BRA') },
    { name: 'Recife', countryId: await getC('BRA') },
    { name: 'Florianópolis', countryId: await getC('BRA') },
    { name: 'Goiânia', countryId: await getC('BRA') },
    { name: 'Cuiabá', countryId: await getC('BRA') },
    { name: 'Chapecó', countryId: await getC('BRA') },
  ];
  await db.insert(cities).values(citiesData);

  console.log('--- Seeding Stadiums/Gymnasiums ---');
  // Helper to get city ID
  const getCity = async (name: string) => (await db.select().from(cities).where(eq(cities.name, name)).limit(1))[0]?.id;

  const stadiumsData = [
    // NBA Arenas
    { name: 'State Farm Arena', cityId: await getCity('Atlanta'), capacity: 18118, yearConstructed: 1999, type: 'gymnasium', imageUrl: 'https://cdn.nba.com/teams/uploads/sites/1610612737/2019/09/StateFarmArenaExterior.jpg' },
    { name: 'TD Garden', cityId: await getCity('Boston'), capacity: 19156, yearConstructed: 1995, type: 'gymnasium', imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/d/d6/TD_Garden.jpg' },
    { name: 'Barclays Center', cityId: await getCity('Brooklyn'), capacity: 17732, yearConstructed: 2012, type: 'gymnasium', imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/0/08/Barclays_Center_western_entrance.jpg' },
    { name: 'Spectrum Center', cityId: await getCity('Charlotte'), capacity: 19077, yearConstructed: 2005, type: 'gymnasium', imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/f/fa/Spectrum_Center_%28Charlotte%29_exterior.jpg' },
    { name: 'United Center', cityId: await getCity('Chicago'), capacity: 20917, yearConstructed: 1994, type: 'gymnasium', imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/5/53/United_Center.jpg' },
    { name: 'Rocket Mortgage FieldHouse', cityId: await getCity('Cleveland'), capacity: 19432, yearConstructed: 1994, type: 'gymnasium', imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/7/76/Rocket_Mortgage_Fieldhouse_2019.jpg' },
    { name: 'American Airlines Center', cityId: await getCity('Dallas'), capacity: 19200, yearConstructed: 2001, type: 'gymnasium', imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/5/59/American_Airlines_Center_2019.jpg' },
    { name: 'Ball Arena', cityId: await getCity('Denver'), capacity: 19520, yearConstructed: 1999, type: 'gymnasium', imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/3/30/Ball_Arena_-_exterior_-_2019.jpg' },
    { name: 'Little Caesars Arena', cityId: await getCity('Detroit'), capacity: 20491, yearConstructed: 2017, type: 'gymnasium', imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/b/b1/Little_Caesars_Arena.jpg' },
    { name: 'Chase Center', cityId: await getCity('San Francisco'), capacity: 18064, yearConstructed: 2019, type: 'gymnasium', imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/9/96/Chase_Center_exterior_view_2.jpg' },
    { name: 'Toyota Center', cityId: await getCity('Houston'), capacity: 18055, yearConstructed: 2003, type: 'gymnasium', imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/c/c4/Toyota_Center_Houston_Texas_DSC_0676_ad.jpg' },
    { name: 'Gainbridge Fieldhouse', cityId: await getCity('Indianapolis'), capacity: 17900, yearConstructed: 1999, type: 'gymnasium', imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/9/9c/Gainbridge_Fieldhouse_2019.jpg' },
    { name: 'Crypto.com Arena', cityId: await getCity('Los Angeles'), capacity: 19079, yearConstructed: 1999, type: 'gymnasium', imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/4/42/Crypto_Arena_-_September_2022.jpg' },
    { name: 'FedExForum', cityId: await getCity('Memphis'), capacity: 17794, yearConstructed: 2004, type: 'gymnasium', imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/8/8c/FedExForum_Memphis.jpg' },
    { name: 'Kaseya Center', cityId: await getCity('Miami'), capacity: 19600, yearConstructed: 1999, type: 'gymnasium', imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/5/54/Ftx_arena.jpg' },
    { name: 'Fiserv Forum', cityId: await getCity('Milwaukee'), capacity: 17500, yearConstructed: 2018, type: 'gymnasium', imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/9/91/Fiserv_Forum_%28Milwaukee%29.jpg' },
    { name: 'Target Center', cityId: await getCity('Minneapolis'), capacity: 19356, yearConstructed: 1990, type: 'gymnasium', imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/d/d8/Target_Center_%282017%29.jpg' },
    { name: 'Smoothie King Center', cityId: await getCity('New Orleans'), capacity: 16867, yearConstructed: 1999, type: 'gymnasium', imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/d/df/Smoothie_King_Center_2017.jpg' },
    { name: 'Madison Square Garden', cityId: await getCity('New York'), capacity: 19812, yearConstructed: 1968, type: 'gymnasium', imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/9/95/Madison_Square_Garden_-_November_13%2C_2014.jpg' },
    { name: 'Paycom Center', cityId: await getCity('Oklahoma City'), capacity: 18203, yearConstructed: 2002, type: 'gymnasium', imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/8/84/Chesapeake_Energy_Arena_-_March_2015.jpg' },
    { name: 'Kia Center', cityId: await getCity('Orlando'), capacity: 18846, yearConstructed: 2010, type: 'gymnasium', imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/8/8d/Amway_Center.jpg' },
    { name: 'Wells Fargo Center', cityId: await getCity('Philadelphia'), capacity: 21000, yearConstructed: 1996, type: 'gymnasium', imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/e/ea/Wells_Fargo_Center_%282010%29.jpg' },
    { name: 'Footprint Center', cityId: await getCity('Phoenix'), capacity: 18055, yearConstructed: 1992, type: 'gymnasium', imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/0/04/Footprint_Center_%28Phoenix%29.jpg' },
    { name: 'Moda Center', cityId: await getCity('Portland'), capacity: 19393, yearConstructed: 1995, type: 'gymnasium', imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/c/c8/Moda_Center_at_the_Rose_Quarter.jpg' },
    { name: 'Golden 1 Center', cityId: await getCity('Sacramento'), capacity: 17583, yearConstructed: 2016, type: 'gymnasium', imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/1/18/Golden_1_Center_Exterior.jpg' },
    { name: 'Frost Bank Center', cityId: await getCity('San Antonio'), capacity: 18418, yearConstructed: 2002, type: 'gymnasium', imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/a/a6/ATTCenterExterior.jpg' },
    { name: 'Delta Center', cityId: await getCity('Salt Lake City'), capacity: 18306, yearConstructed: 1991, type: 'gymnasium', imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/b/b1/Vivint_Arena.jpg' },
    { name: 'Capital One Arena', cityId: await getCity('Washington'), capacity: 20356, yearConstructed: 1997, type: 'gymnasium', imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/5/5a/Capital_One_Arena.jpg' },
    { name: 'Scotiabank Arena', cityId: await getCity('Toronto'), capacity: 19800, yearConstructed: 1999, type: 'gymnasium', imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/7/76/Scotiabank_Arena_outside.jpg' },
    // NHL Arenas
    { name: 'Honda Center', cityId: await getCity('Anaheim'), capacity: 17174, yearConstructed: 1993, type: 'gymnasium', imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/5/58/Honda_Center_2019.jpg' },
    { name: 'Mullett Arena', cityId: await getCity('Glendale'), capacity: 5000, yearConstructed: 2022, type: 'gymnasium', imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/5/52/Mullett_Arena_exterior.jpg' },
    { name: 'KeyBank Center', cityId: await getCity('Buffalo'), capacity: 19070, yearConstructed: 1996, type: 'gymnasium', imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/b/bc/KeyBank_Center_Buffalo.jpg' },
    { name: 'Scotiabank Saddledome', cityId: await getCity('Calgary'), capacity: 19289, yearConstructed: 1983, type: 'gymnasium', imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/5/53/Scotiabank_Saddledome.jpg' },
    { name: 'PNC Arena', cityId: await getCity('Raleigh'), capacity: 18680, yearConstructed: 1999, type: 'gymnasium', imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/3/3a/PNC_Arena_exterior.jpg' },
    { name: 'Nationwide Arena', cityId: await getCity('Columbus'), capacity: 18500, yearConstructed: 2000, type: 'gymnasium', imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/c/c3/Nationwide_Arena.jpg' },
    { name: 'Rogers Place', cityId: await getCity('Edmonton'), capacity: 18347, yearConstructed: 2016, type: 'gymnasium', imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/6/6e/Rogers_Place_2017.jpg' },
    { name: 'Amerant Bank Arena', cityId: await getCity('Sunrise'), capacity: 19250, yearConstructed: 1998, type: 'gymnasium', imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/9/99/BBT_Center_2018.jpg' },
    { name: 'T-Mobile Arena', cityId: await getCity('Las Vegas'), capacity: 17500, yearConstructed: 2016, type: 'gymnasium', imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/0/08/T-Mobile_Arena.jpg' },
    { name: 'Bell Centre', cityId: await getCity('Montreal'), capacity: 21302, yearConstructed: 1996, type: 'gymnasium', imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/d/de/Bell_Centre.jpg' },
    { name: 'Bridgestone Arena', cityId: await getCity('Nashville'), capacity: 17159, yearConstructed: 1996, type: 'gymnasium', imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/1/16/Bridgestone_Arena_Nashville.jpg' },
    { name: 'Prudential Center', cityId: await getCity('Newark'), capacity: 16514, yearConstructed: 2007, type: 'gymnasium', imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/9/9b/Prudential_Center.jpg' },
    { name: 'UBS Arena', cityId: await getCity('New York'), capacity: 17250, yearConstructed: 2021, type: 'gymnasium', imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/4/48/UBS_Arena_exterior.jpg' },
    { name: 'Canadian Tire Centre', cityId: await getCity('Ottawa'), capacity: 18652, yearConstructed: 1996, type: 'gymnasium', imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/9/95/Canadian_Tire_Centre.jpg' },
    { name: 'PPG Paints Arena', cityId: await getCity('Pittsburgh'), capacity: 18387, yearConstructed: 2010, type: 'gymnasium', imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/7/7a/PPG_Paints_Arena_2017.jpg' },
    { name: 'SAP Center', cityId: await getCity('San Jose'), capacity: 17562, yearConstructed: 1993, type: 'gymnasium', imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/f/f5/SAP_Center_at_San_Jose.jpg' },
    { name: 'Climate Pledge Arena', cityId: await getCity('Seattle'), capacity: 17151, yearConstructed: 2021, type: 'gymnasium', imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/a/a8/Climate_Pledge_Arena_2021.jpg' },
    { name: 'Enterprise Center', cityId: await getCity('St. Louis'), capacity: 18096, yearConstructed: 1994, type: 'gymnasium', imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/9/9c/Enterprise_Center.jpg' },
    { name: 'Amalie Arena', cityId: await getCity('Tampa'), capacity: 19092, yearConstructed: 1996, type: 'gymnasium', imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/f/f7/Amalie_Arena.jpg' },
    { name: 'Rogers Arena', cityId: await getCity('Vancouver'), capacity: 18910, yearConstructed: 1995, type: 'gymnasium', imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/9/98/Rogers_Arena_Oct_2017.jpg' },
    { name: 'Canada Life Centre', cityId: await getCity('Winnipeg'), capacity: 15321, yearConstructed: 2004, type: 'gymnasium', imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/2/21/Bell_MTS_Place.jpg' },
    // OHL Arenas
    { name: 'Sadlon Arena', cityId: await getCity('Barrie'), capacity: 4962, yearConstructed: 2018, type: 'gymnasium', imageUrl: 'https://www.bcolts.com/images/sadlon-arena.jpg' },
    { name: 'CAA Centre', cityId: await getCity('Brampton'), capacity: 5000, yearConstructed: 1998, type: 'gymnasium', imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/5/5c/Brampton_CAA_Centre.jpg' },
    { name: 'Brantford Civic Centre', cityId: await getCity('Brantford'), capacity: 3000, yearConstructed: 1967, type: 'gymnasium', imageUrl: 'https://www.brantford.ca/images/civic-centre.jpg' },
    { name: 'Dort Financial Center', cityId: await getCity('Flint'), capacity: 3500, yearConstructed: 1969, type: 'gymnasium', imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/8/8b/Dort_Financial_Center.jpg' },
    { name: 'Sleeman Centre', cityId: await getCity('Guelph'), capacity: 4715, yearConstructed: 2000, type: 'gymnasium', imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/5/56/Sleeman_Centre.jpg' },
    { name: 'Slush Puppie Place', cityId: await getCity('Kingston'), capacity: 5000, yearConstructed: 2008, type: 'gymnasium', imageUrl: 'https://www.kingstonhockey.com/images/slush-puppie-place.jpg' },
    { name: 'Kitchener Memorial Auditorium', cityId: await getCity('Kitchener'), capacity: 7777, yearConstructed: 1951, type: 'gymnasium', imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/1/17/Kitchener_Memorial_Auditorium.jpg' },
    { name: 'Budweiser Gardens', cityId: await getCity('London'), capacity: 9090, yearConstructed: 2002, type: 'gymnasium', imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/f/f5/Budweiser_Gardens.jpg' },
    { name: 'Paramount Fine Foods Centre', cityId: await getCity('Mississauga'), capacity: 5400, yearConstructed: 1998, type: 'gymnasium', imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/9/95/Paramount_Fine_Foods_Centre.jpg' },
    { name: 'Meridian Centre', cityId: await getCity('Niagara Falls'), capacity: 5300, yearConstructed: 2014, type: 'gymnasium', imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/3/38/Meridian_Centre.jpg' },
    { name: 'North Bay Memorial Gardens', cityId: await getCity('North Bay'), capacity: 4025, yearConstructed: 1955, type: 'gymnasium', imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/6/6e/North_Bay_Memorial_Gardens.jpg' },
    { name: 'Tribute Communities Centre', cityId: await getCity('Oshawa'), capacity: 6200, yearConstructed: 2006, type: 'gymnasium', imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/8/8f/Tribute_Communities_Centre.jpg' },
    { name: 'Harry Lumley Bayshore Community Centre', cityId: await getCity('Owen Sound'), capacity: 3500, yearConstructed: 1983, type: 'gymnasium', imageUrl: 'https://www.attackhockey.com/images/bayshore.jpg' },
    { name: 'Peterborough Memorial Centre', cityId: await getCity('Peterborough'), capacity: 3726, yearConstructed: 1956, type: 'gymnasium', imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/d/d2/Peterborough_Memorial_Centre.jpg' },
    { name: 'Dow Event Center', cityId: await getCity('Saginaw'), capacity: 5527, yearConstructed: 1972, type: 'gymnasium', imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/2/2e/Dow_Event_Center.jpg' },
    { name: 'Progressive Auto Sales Arena', cityId: await getCity('Sarnia'), capacity: 4700, yearConstructed: 1994, type: 'gymnasium', imageUrl: 'https://www.sarniatickets.com/images/progressive-arena.jpg' },
    { name: 'GFL Memorial Gardens', cityId: await getCity('Sault Ste. Marie'), capacity: 4758, yearConstructed: 2006, type: 'gymnasium', imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/d/dd/GFL_Memorial_Gardens.jpg' },
    { name: 'Sudbury Community Arena', cityId: await getCity('Sudbury'), capacity: 4800, yearConstructed: 1951, type: 'gymnasium', imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/3/30/Sudbury_Community_Arena.jpg' },
    { name: 'WFCU Centre', cityId: await getCity('Windsor'), capacity: 6500, yearConstructed: 2008, type: 'gymnasium', imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/5/5d/WFCU_Centre.jpg' },
    // Premier League Stadiums
    { name: 'Emirates Stadium', cityId: await getCity('London'), capacity: 60704, yearConstructed: 2006, type: 'stadium', imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/3/34/Emirates_Stadium_-_East_stand_Club_Level.jpg' },
    { name: 'Villa Park', cityId: await getCity('Birmingham'), capacity: 42657, yearConstructed: 1897, type: 'stadium', imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/7/73/Villa_Park_-_geograph.org.uk_-_4531139.jpg' },
    { name: 'Vitality Stadium', cityId: await getCity('Bournemouth'), capacity: 11379, yearConstructed: 1910, type: 'stadium', imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/f/f9/Vitality_Stadium_Bournemouth.jpg' },
    { name: 'Gtech Community Stadium', cityId: await getCity('Brentford'), capacity: 17250, yearConstructed: 2020, type: 'stadium', imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/f/f8/Brentford_Community_Stadium.jpg' },
    { name: 'American Express Stadium', cityId: await getCity('Brighton'), capacity: 31800, yearConstructed: 2011, type: 'stadium', imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/8/8a/Amex_Stadium_-_Aerial_View.jpg' },
    { name: 'Stamford Bridge', cityId: await getCity('London'), capacity: 40341, yearConstructed: 1877, type: 'stadium', imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/a/a1/Stamford_Bridge_-_geograph.org.uk_-_1619757.jpg' },
    { name: 'Selhurst Park', cityId: await getCity('London'), capacity: 25486, yearConstructed: 1924, type: 'stadium', imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/b/b3/Selhurst_Park_-_geograph.org.uk_-_3707983.jpg' },
    { name: 'Goodison Park', cityId: await getCity('Liverpool'), capacity: 39414, yearConstructed: 1892, type: 'stadium', imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/3/3d/Goodison_Park_-_2020-08-09.jpg' },
    { name: 'Craven Cottage', cityId: await getCity('London'), capacity: 29600, yearConstructed: 1896, type: 'stadium', imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/e/e5/Craven_Cottage_Fulham_FC.jpg' },
    { name: 'Portman Road', cityId: await getCity('Ipswich'), capacity: 30311, yearConstructed: 1884, type: 'stadium', imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/a/a6/Portman_Road_2019.jpg' },
    { name: 'King Power Stadium', cityId: await getCity('Leicester'), capacity: 32261, yearConstructed: 2002, type: 'stadium', imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/3/32/King_Power_Stadium_-_2020-02-22.jpg' },
    { name: 'Anfield', cityId: await getCity('Liverpool'), capacity: 61276, yearConstructed: 1884, type: 'stadium', imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/3/3c/Anfield_Road_End%2C_2013.jpg' },
    { name: 'Etihad Stadium', cityId: await getCity('Manchester'), capacity: 53400, yearConstructed: 2003, type: 'stadium', imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/3/38/Etihad_Stadium_-_20220825.jpg' },
    { name: 'Old Trafford', cityId: await getCity('Manchester'), capacity: 74879, yearConstructed: 1910, type: 'stadium', imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/9/95/Old_Trafford_North_2017.jpg' },
    { name: 'St James Park', cityId: await getCity('Newcastle'), capacity: 52350, yearConstructed: 1892, type: 'stadium', imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/5/54/St_James_Park_Stadium_%282019%29.jpg' },
    { name: 'City Ground', cityId: await getCity('Nottingham'), capacity: 30455, yearConstructed: 1898, type: 'stadium', imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/e/e5/City_Ground_-_geograph.org.uk_-_3020541.jpg' },
    { name: 'St Marys Stadium', cityId: await getCity('Southampton'), capacity: 32384, yearConstructed: 2001, type: 'stadium', imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/d/d2/St_Mary%27s_Stadium_-_geograph.org.uk_-_3423225.jpg' },
    { name: 'Tottenham Hotspur Stadium', cityId: await getCity('London'), capacity: 62850, yearConstructed: 2019, type: 'stadium', imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/7/7f/Tottenham_Hotspur_Stadium.jpg' },
    { name: 'London Stadium', cityId: await getCity('London'), capacity: 62500, yearConstructed: 2012, type: 'stadium', imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/e/e7/London_Stadium_2016_%282%29.jpg' },
    { name: 'Molineux Stadium', cityId: await getCity('Wolverhampton'), capacity: 32050, yearConstructed: 1889, type: 'stadium', imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/0/0e/Molineux_Stadium_-_geograph.org.uk_-_1585281.jpg' },
    // Brasil Série A Stadiums
    { name: 'Neo Química Arena', cityId: await getCity('São Paulo'), capacity: 49205, yearConstructed: 2014, type: 'stadium', imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/2/2c/Arena_Corinthians.jpg' },
    { name: 'Allianz Parque', cityId: await getCity('São Paulo'), capacity: 43713, yearConstructed: 2014, type: 'stadium', imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/7/72/Allianz_Parque_-_2019.jpg' },
    { name: 'Estádio do Morumbi', cityId: await getCity('São Paulo'), capacity: 66795, yearConstructed: 1960, type: 'stadium', imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/f/fc/Estádio_Cícero_Pompeu_de_Toledo_-_2019.jpg' },
    { name: 'Maracanã', cityId: await getCity('Rio de Janeiro'), capacity: 78838, yearConstructed: 1950, type: 'stadium', imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/5/5e/Maracana_2013.jpg' },
    { name: 'Estádio Nilton Santos', cityId: await getCity('Rio de Janeiro'), capacity: 44661, yearConstructed: 2007, type: 'stadium', imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/d/d6/Engenhao_Stadium_2013.jpg' },
    { name: 'São Januário', cityId: await getCity('Rio de Janeiro'), capacity: 21880, yearConstructed: 1927, type: 'stadium', imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/4/4e/São_Januário_Stadium.jpg' },
    { name: 'Mineirão', cityId: await getCity('Belo Horizonte'), capacity: 61846, yearConstructed: 1965, type: 'stadium', imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/3/39/Mineirao_panorama_2013.jpg' },
    { name: 'Arena do Grêmio', cityId: await getCity('Porto Alegre'), capacity: 55662, yearConstructed: 2012, type: 'stadium', imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/4/43/Arena_do_Grêmio.jpg' },
    { name: 'Beira-Rio', cityId: await getCity('Porto Alegre'), capacity: 50842, yearConstructed: 1969, type: 'stadium', imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/a/a1/Beira-Rio_Stadium_2019.jpg' },
    { name: 'Ligga Arena', cityId: await getCity('Curitiba'), capacity: 42372, yearConstructed: 1999, type: 'stadium', imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/5/51/Arena_da_Baixada_2019.jpg' },
    { name: 'Arena Fonte Nova', cityId: await getCity('Salvador'), capacity: 48747, yearConstructed: 2013, type: 'stadium', imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/5/5b/Arena_Fonte_Nova_2013.jpg' },
    { name: 'Arena BRB Mané Garrincha', cityId: await getCity('Brasília'), capacity: 72788, yearConstructured: 1974, type: 'stadium', imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/7/78/Estadio_Mane_Garrincha_Brasilia.jpg' },
    { name: 'Castelão', cityId: await getCity('Fortaleza'), capacity: 63903, yearConstructed: 1973, type: 'stadium', imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/e/e7/Castelao_Stadium_2013.jpg' },
    { name: 'Arena de Pernambuco', cityId: await getCity('Recife'), capacity: 46154, yearConstructed: 2013, type: 'stadium', imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/1/12/Arena_Pernambuco_2014.jpg' },
    { name: 'Ressacada', cityId: await getCity('Florianópolis'), capacity: 19584, yearConstructed: 1983, type: 'stadium', imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/9/97/Ressacada_Stadium.jpg' },
    { name: 'Serrinha', cityId: await getCity('Goiânia'), capacity: 15000, yearConstructed: 1968, type: 'stadium', imageUrl: 'https://www.goiasec.com.br/images/serrinha.jpg' },
    { name: 'Arena Pantanal', cityId: await getCity('Cuiabá'), capacity: 44003, yearConstructed: 2014, type: 'stadium', imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/5/50/Arena_Pantanal_2014.jpg' },
    { name: 'Arena Condá', cityId: await getCity('Chapecó'), capacity: 22600, yearConstructed: 1976, type: 'stadium', imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/8/87/Arena_Conda_2014.jpg' },
  ];
  await db.insert(stadiums).values(stadiumsData);

  console.log('--- Seeding Clubs ---');
  const clubsData = [
    // NBA Teams (30 teams - 2025/26)
    { name: 'Atlanta Hawks', shortName: 'ATL', foundationYear: 1946, countryId: await getC('USA'), imageUrl: 'https://cdn.nba.com/logos/nba/1610612737/primary/L/logo.svg' },
    { name: 'Boston Celtics', shortName: 'BOS', foundationYear: 1946, countryId: await getC('USA'), imageUrl: 'https://cdn.nba.com/logos/nba/1610612738/primary/L/logo.svg' },
    { name: 'Brooklyn Nets', shortName: 'BKN', foundationYear: 1967, countryId: await getC('USA'), imageUrl: 'https://cdn.nba.com/logos/nba/1610612751/primary/L/logo.svg' },
    { name: 'Charlotte Hornets', shortName: 'CHA', foundationYear: 1988, countryId: await getC('USA'), imageUrl: 'https://cdn.nba.com/logos/nba/1610612766/primary/L/logo.svg' },
    { name: 'Chicago Bulls', shortName: 'CHI', foundationYear: 1966, countryId: await getC('USA'), imageUrl: 'https://cdn.nba.com/logos/nba/1610612741/primary/L/logo.svg' },
    { name: 'Cleveland Cavaliers', shortName: 'CLE', foundationYear: 1970, countryId: await getC('USA'), imageUrl: 'https://cdn.nba.com/logos/nba/1610612739/primary/L/logo.svg' },
    { name: 'Dallas Mavericks', shortName: 'DAL', foundationYear: 1980, countryId: await getC('USA'), imageUrl: 'https://cdn.nba.com/logos/nba/1610612742/primary/L/logo.svg' },
    { name: 'Denver Nuggets', shortName: 'DEN', foundationYear: 1967, countryId: await getC('USA'), imageUrl: 'https://cdn.nba.com/logos/nba/1610612743/primary/L/logo.svg' },
    { name: 'Detroit Pistons', shortName: 'DET', foundationYear: 1941, countryId: await getC('USA'), imageUrl: 'https://cdn.nba.com/logos/nba/1610612765/primary/L/logo.svg' },
    { name: 'Golden State Warriors', shortName: 'GSW', foundationYear: 1946, countryId: await getC('USA'), imageUrl: 'https://cdn.nba.com/logos/nba/1610612744/primary/L/logo.svg' },
    { name: 'Houston Rockets', shortName: 'HOU', foundationYear: 1967, countryId: await getC('USA'), imageUrl: 'https://cdn.nba.com/logos/nba/1610612745/primary/L/logo.svg' },
    { name: 'Indiana Pacers', shortName: 'IND', foundationYear: 1967, countryId: await getC('USA'), imageUrl: 'https://cdn.nba.com/logos/nba/1610612754/primary/L/logo.svg' },
    { name: 'Los Angeles Clippers', shortName: 'LAC', foundationYear: 1970, countryId: await getC('USA'), imageUrl: 'https://cdn.nba.com/logos/nba/1610612746/primary/L/logo.svg' },
    { name: 'Los Angeles Lakers', shortName: 'LAL', foundationYear: 1947, countryId: await getC('USA'), imageUrl: 'https://cdn.nba.com/logos/nba/1610612747/primary/L/logo.svg' },
    { name: 'Memphis Grizzlies', shortName: 'MEM', foundationYear: 1995, countryId: await getC('USA'), imageUrl: 'https://cdn.nba.com/logos/nba/1610612763/primary/L/logo.svg' },
    { name: 'Miami Heat', shortName: 'MIA', foundationYear: 1988, countryId: await getC('USA'), imageUrl: 'https://cdn.nba.com/logos/nba/1610612748/primary/L/logo.svg' },
    { name: 'Milwaukee Bucks', shortName: 'MIL', foundationYear: 1968, countryId: await getC('USA'), imageUrl: 'https://cdn.nba.com/logos/nba/1610612749/primary/L/logo.svg' },
    { name: 'Minnesota Timberwolves', shortName: 'MIN', foundationYear: 1989, countryId: await getC('USA'), imageUrl: 'https://cdn.nba.com/logos/nba/1610612750/primary/L/logo.svg' },
    { name: 'New Orleans Pelicans', shortName: 'NOP', foundationYear: 2002, countryId: await getC('USA'), imageUrl: 'https://cdn.nba.com/logos/nba/1610612740/primary/L/logo.svg' },
    { name: 'New York Knicks', shortName: 'NYK', foundationYear: 1946, countryId: await getC('USA'), imageUrl: 'https://cdn.nba.com/logos/nba/1610612752/primary/L/logo.svg' },
    { name: 'Oklahoma City Thunder', shortName: 'OKC', foundationYear: 1967, countryId: await getC('USA'), imageUrl: 'https://cdn.nba.com/logos/nba/1610612760/primary/L/logo.svg' },
    { name: 'Orlando Magic', shortName: 'ORL', foundationYear: 1989, countryId: await getC('USA'), imageUrl: 'https://cdn.nba.com/logos/nba/1610612753/primary/L/logo.svg' },
    { name: 'Philadelphia 76ers', shortName: 'PHI', foundationYear: 1946, countryId: await getC('USA'), imageUrl: 'https://cdn.nba.com/logos/nba/1610612755/primary/L/logo.svg' },
    { name: 'Phoenix Suns', shortName: 'PHX', foundationYear: 1968, countryId: await getC('USA'), imageUrl: 'https://cdn.nba.com/logos/nba/1610612756/primary/L/logo.svg' },
    { name: 'Portland Trail Blazers', shortName: 'POR', foundationYear: 1970, countryId: await getC('USA'), imageUrl: 'https://cdn.nba.com/logos/nba/1610612757/primary/L/logo.svg' },
    { name: 'Sacramento Kings', shortName: 'SAC', foundationYear: 1923, countryId: await getC('USA'), imageUrl: 'https://cdn.nba.com/logos/nba/1610612758/primary/L/logo.svg' },
    { name: 'San Antonio Spurs', shortName: 'SAS', foundationYear: 1967, countryId: await getC('USA'), imageUrl: 'https://cdn.nba.com/logos/nba/1610612759/primary/L/logo.svg' },
    { name: 'Toronto Raptors', shortName: 'TOR-NBA', foundationYear: 1995, countryId: await getC('CAN'), imageUrl: 'https://cdn.nba.com/logos/nba/1610612761/primary/L/logo.svg' },
    { name: 'Utah Jazz', shortName: 'UTA', foundationYear: 1974, countryId: await getC('USA'), imageUrl: 'https://cdn.nba.com/logos/nba/1610612762/primary/L/logo.svg' },
    { name: 'Washington Wizards', shortName: 'WAS-NBA', foundationYear: 1961, countryId: await getC('USA'), imageUrl: 'https://cdn.nba.com/logos/nba/1610612764/primary/L/logo.svg' },
    
    // NHL Teams (32 teams - 2025/26)
    { name: 'Anaheim Ducks', shortName: 'ANA', foundationYear: 1993, countryId: await getC('USA'), imageUrl: 'https://cms.nhl.bamgrid.com/images/photos/326485662/1024x576/cut.png' },
    { name: 'Utah Hockey Club', shortName: 'UTA', foundationYear: 1972, countryId: await getC('USA'), imageUrl: 'https://cms.nhl.bamgrid.com/images/photos/353181130/1024x576/cut.png' },
    { name: 'Boston Bruins', shortName: 'BOS-NHL', foundationYear: 1924, countryId: await getC('USA'), imageUrl: 'https://cms.nhl.bamgrid.com/images/photos/326465918/1024x576/cut.png' },
    { name: 'Buffalo Sabres', shortName: 'BUF', foundationYear: 1970, countryId: await getC('USA'), imageUrl: 'https://cms.nhl.bamgrid.com/images/photos/326465998/1024x576/cut.png' },
    { name: 'Calgary Flames', shortName: 'CGY', foundationYear: 1972, countryId: await getC('CAN'), imageUrl: 'https://cms.nhl.bamgrid.com/images/photos/326485868/1024x576/cut.png' },
    { name: 'Carolina Hurricanes', shortName: 'CAR', foundationYear: 1972, countryId: await getC('USA'), imageUrl: 'https://cms.nhl.bamgrid.com/images/photos/326466102/1024x576/cut.png' },
    { name: 'Chicago Blackhawks', shortName: 'CHI-NHL', foundationYear: 1926, countryId: await getC('USA'), imageUrl: 'https://cms.nhl.bamgrid.com/images/photos/326486038/1024x576/cut.png' },
    { name: 'Colorado Avalanche', shortName: 'COL', foundationYear: 1972, countryId: await getC('USA'), imageUrl: 'https://cms.nhl.bamgrid.com/images/photos/326486154/1024x576/cut.png' },
    { name: 'Columbus Blue Jackets', shortName: 'CBJ', foundationYear: 2000, countryId: await getC('USA'), imageUrl: 'https://cms.nhl.bamgrid.com/images/photos/326486250/1024x576/cut.png' },
    { name: 'Dallas Stars', shortName: 'DAL-NHL', foundationYear: 1967, countryId: await getC('USA'), imageUrl: 'https://cms.nhl.bamgrid.com/images/photos/326486316/1024x576/cut.png' },
    { name: 'Detroit Red Wings', shortName: 'DET-NHL', foundationYear: 1926, countryId: await getC('USA'), imageUrl: 'https://cms.nhl.bamgrid.com/images/photos/326466278/1024x576/cut.png' },
    { name: 'Edmonton Oilers', shortName: 'EDM', foundationYear: 1972, countryId: await getC('CAN'), imageUrl: 'https://cms.nhl.bamgrid.com/images/photos/326486416/1024x576/cut.png' },
    { name: 'Florida Panthers', shortName: 'FLA', foundationYear: 1993, countryId: await getC('USA'), imageUrl: 'https://cms.nhl.bamgrid.com/images/photos/326466362/1024x576/cut.png' },
    { name: 'Los Angeles Kings', shortName: 'LAK', foundationYear: 1967, countryId: await getC('USA'), imageUrl: 'https://cms.nhl.bamgrid.com/images/photos/326486530/1024x576/cut.png' },
    { name: 'Minnesota Wild', shortName: 'MIN-NHL', foundationYear: 2000, countryId: await getC('USA'), imageUrl: 'https://cms.nhl.bamgrid.com/images/photos/326486640/1024x576/cut.png' },
    { name: 'Montreal Canadiens', shortName: 'MTL', foundationYear: 1909, countryId: await getC('CAN'), imageUrl: 'https://cms.nhl.bamgrid.com/images/photos/326466458/1024x576/cut.png' },
    { name: 'Nashville Predators', shortName: 'NSH', foundationYear: 1998, countryId: await getC('USA'), imageUrl: 'https://cms.nhl.bamgrid.com/images/photos/326486762/1024x576/cut.png' },
    { name: 'New Jersey Devils', shortName: 'NJD', foundationYear: 1974, countryId: await getC('USA'), imageUrl: 'https://cms.nhl.bamgrid.com/images/photos/326466556/1024x576/cut.png' },
    { name: 'New York Islanders', shortName: 'NYI', foundationYear: 1972, countryId: await getC('USA'), imageUrl: 'https://cms.nhl.bamgrid.com/images/photos/326466672/1024x576/cut.png' },
    { name: 'New York Rangers', shortName: 'NYR', foundationYear: 1926, countryId: await getC('USA'), imageUrl: 'https://cms.nhl.bamgrid.com/images/photos/326466754/1024x576/cut.png' },
    { name: 'Ottawa Senators', shortName: 'OTT', foundationYear: 1990, countryId: await getC('CAN'), imageUrl: 'https://cms.nhl.bamgrid.com/images/photos/326466828/1024x576/cut.png' },
    { name: 'Philadelphia Flyers', shortName: 'PHI-NHL', foundationYear: 1967, countryId: await getC('USA'), imageUrl: 'https://cms.nhl.bamgrid.com/images/photos/326466916/1024x576/cut.png' },
    { name: 'Pittsburgh Penguins', shortName: 'PIT', foundationYear: 1967, countryId: await getC('USA'), imageUrl: 'https://cms.nhl.bamgrid.com/images/photos/326467020/1024x576/cut.png' },
    { name: 'San Jose Sharks', shortName: 'SJS', foundationYear: 1991, countryId: await getC('USA'), imageUrl: 'https://cms.nhl.bamgrid.com/images/photos/326487010/1024x576/cut.png' },
    { name: 'Seattle Kraken', shortName: 'SEA', foundationYear: 2021, countryId: await getC('USA'), imageUrl: 'https://cms.nhl.bamgrid.com/images/photos/326487156/1024x576/cut.png' },
    { name: 'St. Louis Blues', shortName: 'STL', foundationYear: 1967, countryId: await getC('USA'), imageUrl: 'https://cms.nhl.bamgrid.com/images/photos/326487252/1024x576/cut.png' },
    { name: 'Tampa Bay Lightning', shortName: 'TBL', foundationYear: 1991, countryId: await getC('USA'), imageUrl: 'https://cms.nhl.bamgrid.com/images/photos/326467142/1024x576/cut.png' },
    { name: 'Toronto Maple Leafs', shortName: 'TOR-NHL', foundationYear: 1917, countryId: await getC('CAN'), imageUrl: 'https://cms.nhl.bamgrid.com/images/photos/326467246/1024x576/cut.png' },
    { name: 'Vancouver Canucks', shortName: 'VAN', foundationYear: 1970, countryId: await getC('CAN'), imageUrl: 'https://cms.nhl.bamgrid.com/images/photos/326487440/1024x576/cut.png' },
    { name: 'Vegas Golden Knights', shortName: 'VGK', foundationYear: 2017, countryId: await getC('USA'), imageUrl: 'https://cms.nhl.bamgrid.com/images/photos/326487596/1024x576/cut.png' },
    { name: 'Washington Capitals', shortName: 'WSH-NHL', foundationYear: 1974, countryId: await getC('USA'), imageUrl: 'https://cms.nhl.bamgrid.com/images/photos/326467368/1024x576/cut.png' },
    { name: 'Winnipeg Jets', shortName: 'WPG', foundationYear: 1999, countryId: await getC('CAN'), imageUrl: 'https://cms.nhl.bamgrid.com/images/photos/326487722/1024x576/cut.png' },
    
    // OHL Teams (20 teams - 2025/26)
    { name: 'Barrie Colts', shortName: 'BAR', foundationYear: 1995, countryId: await getC('CAN'), imageUrl: 'https://assets.leaguestat.com/ohl/logos/50x50/50.png' },
    { name: 'Brampton Steelheads', shortName: 'BRA', foundationYear: 1998, countryId: await getC('CAN'), imageUrl: 'https://assets.leaguestat.com/ohl/logos/50x50/689.png' },
    { name: 'Brantford Bulldogs', shortName: 'BFD', foundationYear: 2015, countryId: await getC('CAN'), imageUrl: 'https://assets.leaguestat.com/ohl/logos/50x50/68.png' },
    { name: 'Flint Firebirds', shortName: 'FLT', foundationYear: 2015, countryId: await getC('USA'), imageUrl: 'https://assets.leaguestat.com/ohl/logos/50x50/693.png' },
    { name: 'Guelph Storm', shortName: 'GUE', foundationYear: 1991, countryId: await getC('CAN'), imageUrl: 'https://assets.leaguestat.com/ohl/logos/50x50/52.png' },
    { name: 'Kingston Frontenacs', shortName: 'KGN', foundationYear: 1973, countryId: await getC('CAN'), imageUrl: 'https://assets.leaguestat.com/ohl/logos/50x50/53.png' },
    { name: 'Kitchener Rangers', shortName: 'KIT', foundationYear: 1963, countryId: await getC('CAN'), imageUrl: 'https://assets.leaguestat.com/ohl/logos/50x50/54.png' },
    { name: 'London Knights', shortName: 'LDN', foundationYear: 1965, countryId: await getC('CAN'), imageUrl: 'https://assets.leaguestat.com/ohl/logos/50x50/55.png' },
    { name: 'Mississauga Steelheads', shortName: 'MIS', foundationYear: 2007, countryId: await getC('CAN'), imageUrl: 'https://assets.leaguestat.com/ohl/logos/50x50/690.png' },
    { name: 'Niagara IceDogs', shortName: 'NIA', foundationYear: 2007, countryId: await getC('CAN'), imageUrl: 'https://assets.leaguestat.com/ohl/logos/50x50/59.png' },
    { name: 'North Bay Battalion', shortName: 'NB', foundationYear: 1998, countryId: await getC('CAN'), imageUrl: 'https://assets.leaguestat.com/ohl/logos/50x50/61.png' },
    { name: 'Oshawa Generals', shortName: 'OSH', foundationYear: 1937, countryId: await getC('CAN'), imageUrl: 'https://assets.leaguestat.com/ohl/logos/50x50/63.png' },
    { name: 'Owen Sound Attack', shortName: 'OS', foundationYear: 2000, countryId: await getC('CAN'), imageUrl: 'https://assets.leaguestat.com/ohl/logos/50x50/64.png' },
    { name: 'Peterborough Petes', shortName: 'PET', foundationYear: 1956, countryId: await getC('CAN'), imageUrl: 'https://assets.leaguestat.com/ohl/logos/50x50/66.png' },
    { name: 'Saginaw Spirit', shortName: 'SAG', foundationYear: 2002, countryId: await getC('USA'), imageUrl: 'https://assets.leaguestat.com/ohl/logos/50x50/69.png' },
    { name: 'Sarnia Sting', shortName: 'SAR', foundationYear: 1994, countryId: await getC('CAN'), imageUrl: 'https://assets.leaguestat.com/ohl/logos/50x50/70.png' },
    { name: 'Sault Ste. Marie Greyhounds', shortName: 'SSM', foundationYear: 1962, countryId: await getC('CAN'), imageUrl: 'https://assets.leaguestat.com/ohl/logos/50x50/71.png' },
    { name: 'Sudbury Wolves', shortName: 'SUD', foundationYear: 1972, countryId: await getC('CAN'), imageUrl: 'https://assets.leaguestat.com/ohl/logos/50x50/73.png' },
    { name: 'Windsor Spitfires', shortName: 'WIN', foundationYear: 1953, countryId: await getC('CAN'), imageUrl: 'https://assets.leaguestat.com/ohl/logos/50x50/76.png' },
    { name: 'Erie Otters', shortName: 'ERI', foundationYear: 1996, countryId: await getC('USA'), imageUrl: 'https://assets.leaguestat.com/ohl/logos/50x50/51.png' },
    
    // Premier League Teams (20 teams - 2025/26)
    { name: 'Arsenal FC', shortName: 'ARS', foundationYear: 1886, countryId: await getC('GBR'), imageUrl: 'https://upload.wikimedia.org/wikipedia/en/5/53/Arsenal_FC.svg' },
    { name: 'Aston Villa FC', shortName: 'AVL', foundationYear: 1874, countryId: await getC('GBR'), imageUrl: 'https://upload.wikimedia.org/wikipedia/en/f/f9/Aston_Villa_FC_crest_%282016%29.svg' },
    { name: 'AFC Bournemouth', shortName: 'BOU', foundationYear: 1899, countryId: await getC('GBR'), imageUrl: 'https://upload.wikimedia.org/wikipedia/en/e/e5/AFC_Bournemouth_%282013%29.svg' },
    { name: 'Brentford FC', shortName: 'BRE', foundationYear: 1889, countryId: await getC('GBR'), imageUrl: 'https://upload.wikimedia.org/wikipedia/en/2/2a/Brentford_FC_logo.svg' },
    { name: 'Brighton & Hove Albion', shortName: 'BHA', foundationYear: 1901, countryId: await getC('GBR'), imageUrl: 'https://upload.wikimedia.org/wikipedia/en/f/fd/Brighton_%26_Hove_Albion_logo.svg' },
    { name: 'Chelsea FC', shortName: 'CHE', foundationYear: 1905, countryId: await getC('GBR'), imageUrl: 'https://upload.wikimedia.org/wikipedia/en/c/cc/Chelsea_FC.svg' },
    { name: 'Crystal Palace FC', shortName: 'CRY', foundationYear: 1905, countryId: await getC('GBR'), imageUrl: 'https://upload.wikimedia.org/wikipedia/en/a/a2/Crystal_Palace_FC_logo_%282022%29.svg' },
    { name: 'Everton FC', shortName: 'EVE', foundationYear: 1878, countryId: await getC('GBR'), imageUrl: 'https://upload.wikimedia.org/wikipedia/en/7/7c/Everton_FC_logo.svg' },
    { name: 'Fulham FC', shortName: 'FUL', foundationYear: 1879, countryId: await getC('GBR'), imageUrl: 'https://upload.wikimedia.org/wikipedia/en/e/eb/Fulham_FC_%28shield%29.svg' },
    { name: 'Ipswich Town FC', shortName: 'IPS', foundationYear: 1878, countryId: await getC('GBR'), imageUrl: 'https://upload.wikimedia.org/wikipedia/en/4/43/Ipswich_Town.svg' },
    { name: 'Leicester City FC', shortName: 'LEI', foundationYear: 1884, countryId: await getC('GBR'), imageUrl: 'https://upload.wikimedia.org/wikipedia/en/2/2d/Leicester_City_crest.svg' },
    { name: 'Liverpool FC', shortName: 'LIV', foundationYear: 1892, countryId: await getC('GBR'), imageUrl: 'https://upload.wikimedia.org/wikipedia/en/0/0c/Liverpool_FC.svg' },
    { name: 'Manchester City FC', shortName: 'MCI', foundationYear: 1880, countryId: await getC('GBR'), imageUrl: 'https://upload.wikimedia.org/wikipedia/en/e/eb/Manchester_City_FC_badge.svg' },
    { name: 'Manchester United FC', shortName: 'MUN', foundationYear: 1878, countryId: await getC('GBR'), imageUrl: 'https://upload.wikimedia.org/wikipedia/en/7/7a/Manchester_United_FC_crest.svg' },
    { name: 'Newcastle United FC', shortName: 'NEW', foundationYear: 1892, countryId: await getC('GBR'), imageUrl: 'https://upload.wikimedia.org/wikipedia/en/5/56/Newcastle_United_Logo.svg' },
    { name: 'Nottingham Forest FC', shortName: 'NFO', foundationYear: 1865, countryId: await getC('GBR'), imageUrl: 'https://upload.wikimedia.org/wikipedia/en/e/e5/Nottingham_Forest_F.C._logo.svg' },
    { name: 'Southampton FC', shortName: 'SOU', foundationYear: 1885, countryId: await getC('GBR'), imageUrl: 'https://upload.wikimedia.org/wikipedia/en/c/c9/FC_Southampton.svg' },
    { name: 'Tottenham Hotspur FC', shortName: 'TOT', foundationYear: 1882, countryId: await getC('GBR'), imageUrl: 'https://upload.wikimedia.org/wikipedia/en/b/b4/Tottenham_Hotspur.svg' },
    { name: 'West Ham United FC', shortName: 'WHU', foundationYear: 1895, countryId: await getC('GBR'), imageUrl: 'https://upload.wikimedia.org/wikipedia/en/c/c2/West_Ham_United_FC_logo.svg' },
    { name: 'Wolverhampton Wanderers FC', shortName: 'WOL', foundationYear: 1877, countryId: await getC('GBR'), imageUrl: 'https://upload.wikimedia.org/wikipedia/en/f/fc/Wolverhampton_Wanderers.svg' },
    
    // Brasil Série A Teams (20 teams - 2025/26)
    { name: 'SC Corinthians', shortName: 'COR', foundationYear: 1910, countryId: await getC('BRA'), imageUrl: 'https://upload.wikimedia.org/wikipedia/en/5/5a/Sport_Club_Corinthians_Paulista_crest.svg' },
    { name: 'SE Palmeiras', shortName: 'PAL', foundationYear: 1914, countryId: await getC('BRA'), imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/1/10/Palmeiras_logo.svg' },
    { name: 'São Paulo FC', shortName: 'SAO', foundationYear: 1930, countryId: await getC('BRA'), imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/6/6f/Brasao_do_Sao_Paulo_Futebol_Clube.svg' },
    { name: 'CR Flamengo', shortName: 'FLA', foundationYear: 1895, countryId: await getC('BRA'), imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/9/93/Flamengo-RJ_%28BRA%29.png' },
    { name: 'Fluminense FC', shortName: 'FLU', foundationYear: 1902, countryId: await getC('BRA'), imageUrl: 'https://upload.wikimedia.org/wikipedia/pt/a/a3/Fluminense_FC_escudo.png' },
    { name: 'Botafogo FR', shortName: 'BOT', foundationYear: 1894, countryId: await getC('BRA'), imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/5/52/Botafogo_de_Futebol_e_Regatas_logo.svg' },
    { name: 'CR Vasco da Gama', shortName: 'VAS', foundationYear: 1898, countryId: await getC('BRA'), imageUrl: 'https://upload.wikimedia.org/wikipedia/pt/a/ac/CRVascodaGama.png' },
    { name: 'Atlético Mineiro', shortName: 'CAM', foundationYear: 1908, countryId: await getC('BRA'), imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/5/5f/Atletico_mineiro_galo.png' },
    { name: 'Cruzeiro EC', shortName: 'CRU', foundationYear: 1921, countryId: await getC('BRA'), imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/9/90/Cruzeiro_Esporte_Clube_%28logo%29.svg' },
    { name: 'Grêmio FBPA', shortName: 'GRE', foundationYear: 1903, countryId: await getC('BRA'), imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/3/31/Gremio_logo.svg' },
    { name: 'SC Internacional', shortName: 'INT', foundationYear: 1909, countryId: await getC('BRA'), imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/f/f1/Escudo_do_Sport_Club_Internacional.svg' },
    { name: 'Athletico Paranaense', shortName: 'CAP', foundationYear: 1924, countryId: await getC('BRA'), imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/7/71/Athletico_Paranaense_2019.png' },
    { name: 'EC Bahia', shortName: 'BAH', foundationYear: 1931, countryId: await getC('BRA'), imageUrl: 'https://upload.wikimedia.org/wikipedia/en/5/54/Esporte_Clube_Bahia_logo.svg' },
    { name: 'EC Vitória', shortName: 'VIT', foundationYear: 1899, countryId: await getC('BRA'), imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/9/99/Vit%C3%B3ria_logo.svg' },
    { name: 'Botafogo SP', shortName: 'BOT-SP', foundationYear: 1918, countryId: await getC('BRA'), imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/8/88/Botafogo_Futebol_Clube_%28SP%29_logo.svg' },
    { name: 'Fortaleza EC', shortName: 'FOR', foundationYear: 1918, countryId: await getC('BRA'), imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/4/40/FortalezaEsporteClube.svg' },
    { name: 'Sport Club do Recife', shortName: 'SPO', foundationYear: 1905, countryId: await getC('BRA'), imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/9/94/Sport_Club_do_Recife.png' },
    { name: 'Figueirense FC', shortName: 'FIG', foundationYear: 1921, countryId: await getC('BRA'), imageUrl: 'https://upload.wikimedia.org/wikipedia/en/7/7c/Figueirense_logo.svg' },
    { name: 'Goiás EC', shortName: 'GOI', foundationYear: 1943, countryId: await getC('BRA'), imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/b/b9/Goi%C3%A1s_Esporte_Clube.png' },
    { name: 'Cuiabá EC', shortName: 'CUI', foundationYear: 2001, countryId: await getC('BRA'), imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/2/2a/Cuiab%C3%A1_Esporte_Clube_logo.svg' },
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
      flgDefault: true, // Set NBA as default for Basketball
      typeOfSchedule: 'Date',
      numberOfRoundsMatches: 82,
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
      flgDefault: true, // Set NHL as default for Ice Hockey
      typeOfSchedule: 'Date',
      numberOfRoundsMatches: 82,
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
    // OHL (Ontario Hockey League)
    {
      originalName: 'Ontario Hockey League',
      secondaryName: 'OHL',
      sportId: hockeyId,
      countryId: await getC('CAN'),
      cityId: null,
      flgDefault: false,
      typeOfSchedule: 'Date',
      numberOfRoundsMatches: 68,
      minDivisionsNumber: 3,
      maxDivisionsNumber: 3,
      divisionsTime: null,
      hasOvertimeOverride: true,
      hasPenaltiesOverride: true,
      hasAscends: false,
      ascendsQuantity: null,
      hasDescends: false,
      descendsQuantity: null,
      hasSubLeagues: true,
      numberOfSubLeagues: 2, // East/West Conferences
      imageUrl: 'https://upload.wikimedia.org/wikipedia/en/f/f4/Ontario_Hockey_League_logo.svg',
      flgRoundAutomatic: true,
    },
    // Brasil Série A
    {
      originalName: 'Campeonato Brasileiro Série A',
      secondaryName: 'Brasileirão',
      sportId: footballId,
      countryId: await getC('BRA'),
      cityId: null,
      flgDefault: false,
      typeOfSchedule: 'Round',
      numberOfRoundsMatches: 38,
      minDivisionsNumber: 2,
      maxDivisionsNumber: 2,
      divisionsTime: null,
      hasOvertimeOverride: null,
      hasPenaltiesOverride: null,
      hasAscends: false,
      ascendsQuantity: null,
      hasDescends: true,
      descendsQuantity: 4, // 4 teams relegated to Série B
      hasSubLeagues: false,
      numberOfSubLeagues: null,
      imageUrl: 'https://upload.wikimedia.org/wikipedia/pt/3/38/Brasileirao_2024_logo.png',
      flgRoundAutomatic: true,
    },
    // 
    // Football
    {
      originalName: 'English Premier League',
      secondaryName: 'Premier League',
      sportId: footballId,
      countryId: await getC('GBR'),
      cityId: null,
      flgDefault: true, // Set Premier League as default for Football
      typeOfSchedule: 'Round',
      numberOfRoundsMatches: 38,
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
      flgDefault: true, // Set as default for Handball
      typeOfSchedule: 'Round',
      numberOfRoundsMatches: 8, // Example: 4 groups, 2 rounds of matches
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
      flgDefault: true, // Set as default for Futsal
      typeOfSchedule: 'Round',
      numberOfRoundsMatches: 4,
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
      flgDefault: true, // Set as default for Volleyball
      typeOfSchedule: 'Round',
      numberOfRoundsMatches: 3,
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

  console.log('--- Seeding Menu Items ---');
  const menuItemsData = [
    // Admin-only menu items
    { code: 'admin_dashboard', name: 'Admin Dashboard', description: 'Main admin dashboard', category: 'admin', parentId: null, order: 1, isActive: true },
    { code: 'admin_sports', name: 'Sports Management', description: 'Manage sports and rules', category: 'admin', parentId: null, order: 2, isActive: true },
    { code: 'admin_countries', name: 'Countries Management', description: 'Manage countries', category: 'admin', parentId: null, order: 3, isActive: true },
    { code: 'admin_cities', name: 'Cities Management', description: 'Manage cities', category: 'admin', parentId: null, order: 4, isActive: true },
    { code: 'admin_stadiums', name: 'Stadiums Management', description: 'Manage stadiums', category: 'admin', parentId: null, order: 5, isActive: true },
    { code: 'admin_clubs', name: 'Clubs Management', description: 'Manage clubs', category: 'admin', parentId: null, order: 6, isActive: true },
    { code: 'admin_leagues', name: 'Leagues Management', description: 'Manage leagues', category: 'admin', parentId: null, order: 7, isActive: true },
    { code: 'admin_seasons', name: 'Seasons Management', description: 'Manage seasons', category: 'admin', parentId: null, order: 8, isActive: true },
    { code: 'admin_phases', name: 'Phases Management', description: 'Manage phases', category: 'admin', parentId: null, order: 9, isActive: true },
    { code: 'admin_rounds', name: 'Rounds Management', description: 'Manage rounds', category: 'admin', parentId: null, order: 10, isActive: true },
    { code: 'admin_groups', name: 'Groups Management', description: 'Manage groups', category: 'admin', parentId: null, order: 11, isActive: true },
    { code: 'admin_matches', name: 'Match Entry', description: 'Enter match results', category: 'admin', parentId: null, order: 12, isActive: true },
    { code: 'admin_users', name: 'User Management', description: 'Manage users and permissions', category: 'admin', parentId: null, order: 13, isActive: true },
    
    // Final User menu items (controlled by permissions)
    { code: 'main_screen', name: 'Main Screen', description: 'Combined standings and round games', category: 'final_user', parentId: null, order: 1, isActive: true },
    { code: 'leagues', name: 'Leagues', description: 'Browse leagues', category: 'final_user', parentId: null, order: 2, isActive: true },
    { code: 'standings', name: 'Standings', description: 'View standings tables', category: 'final_user', parentId: null, order: 3, isActive: true },
    { code: 'rounds', name: 'Rounds', description: 'View rounds and matches', category: 'final_user', parentId: null, order: 4, isActive: true },
    { code: 'matches', name: 'Match Details', description: 'View match details', category: 'final_user', parentId: null, order: 5, isActive: true },
    { code: 'statistics', name: 'Statistics', description: 'View statistics and analytics', category: 'final_user', parentId: null, order: 6, isActive: true },
    { code: 'reports', name: 'Reports & Consults', description: 'Generate reports and consults', category: 'final_user', parentId: null, order: 7, isActive: true },
  ];
  
  const insertedMenuItems = await db.insert(menuItems).values(menuItemsData).returning();
  console.log(`✅ Inserted ${insertedMenuItems.length} menu items`);

  console.log('--- Seeding Profile Permissions (Final User defaults) ---');
  // By default, Final Users have access to main screen, leagues, standings, rounds, and matches
  // Statistics and Reports are disabled by default (Admin must enable them)
  const finalUserMenuItems = insertedMenuItems.filter(item => item.category === 'final_user');
  const defaultAccessCodes = ['main_screen', 'leagues', 'standings', 'rounds', 'matches'];
  
  const profilePermissionsData = finalUserMenuItems.map(item => ({
    profile: 'final_user',
    menuItemId: item.id,
    canAccess: defaultAccessCodes.includes(item.code),
  }));
  
  await db.insert(profilePermissions).values(profilePermissionsData);
  console.log(`✅ Created ${profilePermissionsData.length} profile permissions for Final User`);

  console.log('--- Seeding Users ---');
  const hashedPassword = await bcrypt.hash('admin123', 10);
  const usersData = [
    {
      name: 'admin',
      email: 'admin@championships.com',
      password: hashedPassword,
      profile: 'admin',
      isActive: true,
    },
    {
      name: 'finaluser',
      email: 'user@championships.com',
      password: await bcrypt.hash('user123', 10),
      profile: 'final_user',
      isActive: true,
    },
  ];
  await db.insert(users).values(usersData);
  console.log(`✅ Created ${usersData.length} users (admin: admin123, finaluser: user123)`);

  console.log('--- Seeding Process Completed Successfully ---');
  process.exit(0);
}

main().catch((err) => {
  console.error('Seeding failed:', err);
  process.exit(1);
});