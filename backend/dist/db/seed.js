"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const node_postgres_1 = require("drizzle-orm/node-postgres");
const pg_1 = require("pg");
const dotenv = require("dotenv");
const schema = require("./schema");
const schema_1 = require("./schema");
const drizzle_orm_1 = require("drizzle-orm");
dotenv.config();
const pool = new pg_1.Pool({
    connectionString: process.env.DATABASE_URL,
});
const db = (0, node_postgres_1.drizzle)(pool, { schema });
async function main() {
    console.log('--- Starting Database Cleanup ---');
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
        { name: 'Brazil', continent: 'South America', code: 'BRA', flagUrl: 'https://flagcdn.com/br.svg' },
        { name: 'Argentina', continent: 'South America', code: 'ARG', flagUrl: 'https://flagcdn.com/ar.svg' },
        { name: 'United States', continent: 'North America', code: 'USA', flagUrl: 'https://flagcdn.com/us.svg' },
        { name: 'Canada', continent: 'North America', code: 'CAN', flagUrl: 'https://flagcdn.com/ca.svg' },
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
        { name: 'China', continent: 'Asia', code: 'CHN', flagUrl: 'https://flagcdn.com/cn.svg' },
        { name: 'Japan', continent: 'Asia', code: 'JPN', flagUrl: 'https://flagcdn.com/jp.svg' },
        { name: 'Egypt', continent: 'Africa', code: 'EGY', flagUrl: 'https://flagcdn.com/eg.svg' },
    ];
    await db.insert(schema_1.countries).values(countriesData);
    console.log('--- Seeding Sports with Official Rules (MVP: 6 Collective Sports) ---');
    const sportsData = [
        {
            name: 'Basketball',
            reducedName: 'BB',
            type: 'collective',
            divisionType: 'quarter',
            divisionsNumber: 4,
            divisionTime: 12,
            scoreType: 'points',
            hasOvertime: true,
            hasPenalties: false,
            imageUrl: 'https://img.icons8.com/color/96/basketball.png',
        },
        {
            name: 'Ice Hockey',
            reducedName: 'IH',
            type: 'collective',
            divisionType: 'period',
            divisionsNumber: 3,
            divisionTime: 20,
            scoreType: 'goals',
            hasOvertime: true,
            hasPenalties: true,
            imageUrl: 'https://img.icons8.com/color/96/ice-hockey.png',
        },
        {
            name: 'Football',
            reducedName: 'FB',
            type: 'collective',
            divisionType: 'period',
            divisionsNumber: 2,
            divisionTime: 45,
            scoreType: 'goals',
            hasOvertime: true,
            hasPenalties: true,
            imageUrl: 'https://img.icons8.com/color/96/football.png',
        },
        {
            name: 'Handball',
            reducedName: 'HB',
            type: 'collective',
            divisionType: 'period',
            divisionsNumber: 2,
            divisionTime: 30,
            scoreType: 'goals',
            hasOvertime: true,
            hasPenalties: false,
            imageUrl: 'https://img.icons8.com/color/96/handball.png',
        },
        {
            name: 'Futsal',
            reducedName: 'FS',
            type: 'collective',
            divisionType: 'period',
            divisionsNumber: 2,
            divisionTime: 20,
            scoreType: 'goals',
            hasOvertime: true,
            hasPenalties: true,
            imageUrl: 'https://img.icons8.com/color/96/football.png',
        },
        {
            name: 'Volleyball',
            reducedName: 'VB',
            type: 'collective',
            divisionType: 'set',
            divisionsNumber: 5,
            divisionTime: 0,
            scoreType: 'points',
            hasOvertime: false,
            hasPenalties: false,
            imageUrl: 'https://img.icons8.com/color/96/volleyball.png',
        },
    ];
    await db.insert(schema_1.sports).values(sportsData);
    const getS = async (n) => (await db.select().from(schema_1.sports).where((0, drizzle_orm_1.eq)(schema_1.sports.name, n)).limit(1))[0].id;
    const getC = async (c) => (await db.select().from(schema_1.countries).where((0, drizzle_orm_1.eq)(schema_1.countries.code, c)).limit(1))[0]?.id;
    console.log('--- Seeding Cities ---');
    const citiesData = [
        { name: 'New York', countryId: await getC('USA') },
        { name: 'Los Angeles', countryId: await getC('USA') },
        { name: 'Boston', countryId: await getC('USA') },
        { name: 'Chicago', countryId: await getC('USA') },
        { name: 'Miami', countryId: await getC('USA') },
        { name: 'Denver', countryId: await getC('USA') },
        { name: 'Toronto', countryId: await getC('CAN') },
        { name: 'Vancouver', countryId: await getC('CAN') },
        { name: 'London', countryId: await getC('GBR') },
        { name: 'Manchester', countryId: await getC('GBR') },
        { name: 'Liverpool', countryId: await getC('GBR') },
        { name: 'Barcelona', countryId: await getC('ESP') },
        { name: 'Madrid', countryId: await getC('ESP') },
        { name: 'Milan', countryId: await getC('ITA') },
        { name: 'Rome', countryId: await getC('ITA') },
        { name: 'Paris', countryId: await getC('FRA') },
        { name: 'Berlin', countryId: await getC('GER') },
        { name: 'São Paulo', countryId: await getC('BRA') },
        { name: 'Rio de Janeiro', countryId: await getC('BRA') },
        { name: 'Salvador', countryId: await getC('BRA') },
        { name: 'Brasília', countryId: await getC('BRA') },
    ];
    await db.insert(schema_1.cities).values(citiesData);
    console.log('--- Seeding Stadiums/Gymnasiums ---');
    const stadiumsData = [
        { name: 'Crypto.com Arena', cityId: (await db.select().from(schema_1.cities).where((0, drizzle_orm_1.eq)(schema_1.cities.name, 'Los Angeles')).limit(1))[0].id, capacity: 19079, yearConstructed: 1999, type: 'gymnasium', imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/4/42/Crypto_Arena_-_September_2022.jpg' },
        { name: 'Madison Square Garden', cityId: (await db.select().from(schema_1.cities).where((0, drizzle_orm_1.eq)(schema_1.cities.name, 'New York')).limit(1))[0].id, capacity: 19812, yearConstructed: 1968, type: 'gymnasium', imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/9/95/Madison_Square_Garden_-_November_13%2C_2014.jpg' },
        { name: 'Scotiabank Arena', cityId: (await db.select().from(schema_1.cities).where((0, drizzle_orm_1.eq)(schema_1.cities.name, 'Toronto')).limit(1))[0].id, capacity: 19800, yearConstructed: 1999, type: 'gymnasium', imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/7/76/Scotiabank_Arena_outside.jpg/1024px-Scotiabank_Arena_outside.jpg' },
        { name: 'Rogers Place', cityId: (await db.select().from(schema_1.cities).where((0, drizzle_orm_1.eq)(schema_1.cities.name, 'Vancouver')).limit(1))[0].id, capacity: 18259, yearConstructed: 2016, type: 'gymnasium', imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/9/98/Rogers_Arena_Oct_2017.jpg' },
        { name: 'Stamford Bridge', cityId: (await db.select().from(schema_1.cities).where((0, drizzle_orm_1.eq)(schema_1.cities.name, 'London')).limit(1))[0].id, capacity: 60477, yearConstructed: 1877, type: 'stadium', imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/a/a1/Stamford_Bridge_-_geograph.org.uk_-_1619757.jpg' },
        { name: 'Anfield', cityId: (await db.select().from(schema_1.cities).where((0, drizzle_orm_1.eq)(schema_1.cities.name, 'Liverpool')).limit(1))[0].id, capacity: 61294, yearConstructed: 1892, type: 'stadium', imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/3/3c/Anfield_Road_End%2C_2013.jpg' },
        { name: 'Old Trafford', cityId: (await db.select().from(schema_1.cities).where((0, drizzle_orm_1.eq)(schema_1.cities.name, 'Manchester')).limit(1))[0].id, capacity: 74140, yearConstructed: 1910, type: 'stadium', imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/9/95/Old_Trafford_North_2017.jpg' },
        { name: 'Camp Nou', cityId: (await db.select().from(schema_1.cities).where((0, drizzle_orm_1.eq)(schema_1.cities.name, 'Barcelona')).limit(1))[0].id, capacity: 99354, yearConstructed: 1957, type: 'stadium', imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/6/66/Camp_Nou_-_2013-11-01_%281%29.jpg' },
        { name: 'Santiago Bernabéu', cityId: (await db.select().from(schema_1.cities).where((0, drizzle_orm_1.eq)(schema_1.cities.name, 'Madrid')).limit(1))[0].id, capacity: 81044, yearConstructed: 1947, type: 'stadium', imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/3/38/Bernabeu_1.jpg' },
        { name: 'Maracanã', cityId: (await db.select().from(schema_1.cities).where((0, drizzle_orm_1.eq)(schema_1.cities.name, 'Rio de Janeiro')).limit(1))[0].id, capacity: 76935, yearConstructed: 1950, type: 'stadium', imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/5/5e/Maracana_2013.jpg' },
        { name: 'Estádio do Morumbi', cityId: (await db.select().from(schema_1.cities).where((0, drizzle_orm_1.eq)(schema_1.cities.name, 'São Paulo')).limit(1))[0].id, capacity: 72039, yearConstructed: 1960, type: 'stadium', imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/f/fc/Estádio_Cícero_Pompeu_de_Toledo_-_2019.jpg' },
    ];
    await db.insert(schema_1.stadiums).values(stadiumsData);
    console.log('--- Seeding Clubs ---');
    const clubsData = [
        { name: 'Los Angeles Lakers', shortName: 'LAL', foundationYear: 1947, countryId: await getC('USA'), imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/3/3c/Los_Angeles_Lakers_logo.svg' },
        { name: 'New York Knicks', shortName: 'NYK', foundationYear: 1946, countryId: await getC('USA'), imageUrl: 'https://upload.wikimedia.org/wikipedia/en/2/25/New_York_Knicks_logo.svg' },
        { name: 'Boston Celtics', shortName: 'BOS', foundationYear: 1946, countryId: await getC('USA'), imageUrl: 'https://upload.wikimedia.org/wikipedia/en/8/8f/Boston_Celtics.svg' },
        { name: 'Toronto Maple Leafs', shortName: 'TOR', foundationYear: 1926, countryId: await getC('CAN'), imageUrl: 'https://upload.wikimedia.org/wikipedia/en/b/b0/Toronto_Maple_Leafs_2016_logo.svg' },
        { name: 'Vancouver Canucks', shortName: 'VAN', foundationYear: 1970, countryId: await getC('CAN'), imageUrl: 'https://upload.wikimedia.org/wikipedia/en/3/3a/Vancouver_Canucks_logo.svg' },
        { name: 'Chelsea FC', shortName: 'CHE', foundationYear: 1905, countryId: await getC('GBR'), imageUrl: 'https://upload.wikimedia.org/wikipedia/en/c/cc/Chelsea_FC.svg' },
        { name: 'Liverpool FC', shortName: 'LIV', foundationYear: 1892, countryId: await getC('GBR'), imageUrl: 'https://upload.wikimedia.org/wikipedia/en/0/0c/Liverpool_FC.svg' },
        { name: 'Manchester United', shortName: 'MUN', foundationYear: 1878, countryId: await getC('GBR'), imageUrl: 'https://upload.wikimedia.org/wikipedia/en/7/7a/Manchester_United_FC_badge.png' },
        { name: 'FC Barcelona', shortName: 'BAR', foundationYear: 1899, countryId: await getC('ESP'), imageUrl: 'https://upload.wikimedia.org/wikipedia/en/4/47/FC_Barcelona_%282009%E2%80%932011%29.svg' },
        { name: 'Real Madrid', shortName: 'RMA', foundationYear: 1902, countryId: await getC('ESP'), imageUrl: 'https://upload.wikimedia.org/wikipedia/en/5/56/Real_Madrid_CF.svg' },
        { name: 'Fluminense FC', shortName: 'FLU', foundationYear: 1902, countryId: await getC('BRA'), imageUrl: 'https://upload.wikimedia.org/wikipedia/pt/a/a3/Fluminense_FC_escudo.png' },
        { name: 'São Paulo FC', shortName: 'SAO', foundationYear: 1930, countryId: await getC('BRA'), imageUrl: 'https://upload.wikimedia.org/wikipedia/pt/6/6e/Sao_Paulo_Futebol_Clube.png' },
    ];
    await db.insert(schema_1.clubs).values(clubsData);
    console.log('--- Seeding Leagues with MVP Configuration ---');
    const basketballId = await getS('Basketball');
    const hockeyId = await getS('Ice Hockey');
    const footballId = await getS('Football');
    const handballId = await getS('Handball');
    const futsalId = await getS('Futsal');
    const volleyballId = await getS('Volleyball');
    const leaguesData = [
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
            divisionsTime: null,
            hasOvertimeOverride: null,
            hasPenaltiesOverride: null,
            hasAscends: false,
            ascendsQuantity: null,
            hasDescends: false,
            descendsQuantity: null,
            hasSubLeagues: true,
            numberOfSubLeagues: 2,
            imageUrl: 'https://upload.wikimedia.org/wikipedia/en/0/03/National_Basketball_Association_logo.svg',
        },
        {
            originalName: 'National Hockey League',
            secondaryName: 'NHL',
            sportId: hockeyId,
            countryId: null,
            cityId: null,
            startYear: 2024,
            endYear: 2025,
            numberOfTurns: 1,
            numberOfRounds: 82,
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
            numberOfSubLeagues: 2,
            imageUrl: 'https://upload.wikimedia.org/wikipedia/en/3/3a/05_NHL_Shield.svg',
        },
        {
            originalName: 'English Premier League',
            secondaryName: 'Premier League',
            sportId: footballId,
            countryId: await getC('GBR'),
            cityId: null,
            startYear: 2024,
            endYear: 2025,
            numberOfTurns: 2,
            numberOfRounds: 38,
            minDivisionsNumber: 2,
            maxDivisionsNumber: 2,
            divisionsTime: null,
            hasOvertimeOverride: null,
            hasPenaltiesOverride: null,
            hasAscends: true,
            ascendsQuantity: 2,
            hasDescends: true,
            descendsQuantity: 3,
            hasSubLeagues: false,
            numberOfSubLeagues: null,
            imageUrl: 'https://upload.wikimedia.org/wikipedia/en/f/f2/Premier_League_Logo.svg',
        },
        {
            originalName: 'International Handball Federation World Championship',
            secondaryName: 'IHF World Championship',
            sportId: handballId,
            countryId: null,
            cityId: null,
            startYear: 2024,
            endYear: 2025,
            numberOfTurns: 1,
            numberOfRounds: 8,
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
            numberOfSubLeagues: 4,
            imageUrl: 'https://upload.wikimedia.org/wikipedia/en/5/5c/International_Handball_Federation_logo.svg',
        },
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
            numberOfSubLeagues: 4,
            imageUrl: 'https://upload.wikimedia.org/wikipedia/en/f/f4/FIFA_Logo.svg',
        },
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
            numberOfSubLeagues: 4,
            imageUrl: 'https://upload.wikimedia.org/wikipedia/en/9/91/FIVB_logo.png',
        },
    ];
    await db.insert(schema_1.leagues).values(leaguesData);
    console.log('--- Seeding Process Completed Successfully ---');
    process.exit(0);
}
main().catch((err) => {
    console.error('Seeding failed:', err);
    process.exit(1);
});
//# sourceMappingURL=seed.js.map