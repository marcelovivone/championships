"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.users = exports.standings = exports.matchEvents = exports.matchDivisions = exports.matches = exports.groupClubs = exports.groups = exports.rounds = exports.phases = exports.seasonClubs = exports.seasons = exports.leagueDivisions = exports.leagueLinks = exports.leagues = exports.clubStadiums = exports.clubs = exports.stadiums = exports.cities = exports.countries = exports.sports = void 0;
const pg_core_1 = require("drizzle-orm/pg-core");
exports.sports = (0, pg_core_1.pgTable)('sports', {
    id: (0, pg_core_1.serial)('id').primaryKey(),
    name: (0, pg_core_1.varchar)('name', { length: 100 }).notNull().unique(),
    reducedName: (0, pg_core_1.varchar)('reduced_name', { length: 20 }).notNull(),
    type: (0, pg_core_1.varchar)('type', { length: 20 }).notNull(),
    divisionType: (0, pg_core_1.varchar)('division_type', { length: 20 }).notNull(),
    divisionsNumber: (0, pg_core_1.integer)('divisions_number').notNull(),
    divisionTime: (0, pg_core_1.integer)('division_time').notNull(),
    scoreType: (0, pg_core_1.varchar)('score_type', { length: 20 }).notNull(),
    hasOvertime: (0, pg_core_1.boolean)('has_overtime').default(false).notNull(),
    hasPenalties: (0, pg_core_1.boolean)('has_penalties').default(false).notNull(),
    imageUrl: (0, pg_core_1.text)('image_url').notNull(),
    createdAt: (0, pg_core_1.timestamp)('created_at').defaultNow().notNull(),
});
exports.countries = (0, pg_core_1.pgTable)('countries', {
    id: (0, pg_core_1.serial)('id').primaryKey(),
    name: (0, pg_core_1.varchar)('name', { length: 100 }).notNull(),
    continent: (0, pg_core_1.varchar)('continent', { length: 50 }).notNull(),
    code: (0, pg_core_1.varchar)('code', { length: 3 }).notNull().unique(),
    flagUrl: (0, pg_core_1.text)('flag_url'),
    createdAt: (0, pg_core_1.timestamp)('created_at').defaultNow().notNull(),
});
exports.cities = (0, pg_core_1.pgTable)('cities', {
    id: (0, pg_core_1.serial)('id').primaryKey(),
    name: (0, pg_core_1.varchar)('name', { length: 100 }).notNull(),
    countryId: (0, pg_core_1.integer)('country_id').references(() => exports.countries.id).notNull(),
    createdAt: (0, pg_core_1.timestamp)('created_at').defaultNow().notNull(),
});
exports.stadiums = (0, pg_core_1.pgTable)('stadiums', {
    id: (0, pg_core_1.serial)('id').primaryKey(),
    name: (0, pg_core_1.varchar)('name', { length: 150 }).notNull(),
    cityId: (0, pg_core_1.integer)('city_id').references(() => exports.cities.id).notNull(),
    capacity: (0, pg_core_1.integer)('capacity'),
    yearConstructed: (0, pg_core_1.integer)('year_constructed'),
    type: (0, pg_core_1.varchar)('type', { length: 50 }).notNull(),
    imageUrl: (0, pg_core_1.text)('image_url'),
    createdAt: (0, pg_core_1.timestamp)('created_at').defaultNow().notNull(),
});
exports.clubs = (0, pg_core_1.pgTable)('clubs', {
    id: (0, pg_core_1.serial)('id').primaryKey(),
    name: (0, pg_core_1.varchar)('name', { length: 150 }).notNull(),
    shortName: (0, pg_core_1.varchar)('short_name', { length: 50 }),
    foundationYear: (0, pg_core_1.integer)('foundation_year').notNull(),
    countryId: (0, pg_core_1.integer)('country_id').references(() => exports.countries.id).notNull(),
    imageUrl: (0, pg_core_1.text)('image_url'),
    createdAt: (0, pg_core_1.timestamp)('created_at').defaultNow().notNull(),
});
exports.clubStadiums = (0, pg_core_1.pgTable)('club_stadiums', {
    id: (0, pg_core_1.serial)('id').primaryKey(),
    clubId: (0, pg_core_1.integer)('club_id').references(() => exports.clubs.id).notNull(),
    stadiumId: (0, pg_core_1.integer)('stadium_id').references(() => exports.stadiums.id).notNull(),
    startDate: (0, pg_core_1.timestamp)('start_date').notNull(),
    endDate: (0, pg_core_1.timestamp)('end_date'),
    createdAt: (0, pg_core_1.timestamp)('created_at').defaultNow().notNull(),
});
exports.leagues = (0, pg_core_1.pgTable)('leagues', {
    id: (0, pg_core_1.serial)('id').primaryKey(),
    originalName: (0, pg_core_1.varchar)('original_name', { length: 150 }).notNull(),
    secondaryName: (0, pg_core_1.varchar)('secondary_name', { length: 150 }),
    sportId: (0, pg_core_1.integer)('sport_id').references(() => exports.sports.id).notNull(),
    countryId: (0, pg_core_1.integer)('country_id').references(() => exports.countries.id),
    cityId: (0, pg_core_1.integer)('city_id').references(() => exports.cities.id),
    startYear: (0, pg_core_1.integer)('start_year').notNull(),
    endYear: (0, pg_core_1.integer)('end_year').notNull(),
    numberOfTurns: (0, pg_core_1.integer)('number_of_turns').notNull(),
    numberOfRounds: (0, pg_core_1.integer)('number_of_rounds').notNull(),
    minDivisionsNumber: (0, pg_core_1.integer)('min_divisions_number').notNull(),
    maxDivisionsNumber: (0, pg_core_1.integer)('max_divisions_number').notNull(),
    divisionsTime: (0, pg_core_1.integer)('divisions_time'),
    hasOvertimeOverride: (0, pg_core_1.boolean)('has_overtime_override'),
    hasPenaltiesOverride: (0, pg_core_1.boolean)('has_penalties_override'),
    hasAscends: (0, pg_core_1.boolean)('has_ascends').notNull().default(false),
    ascendsQuantity: (0, pg_core_1.integer)('ascends_quantity'),
    hasDescends: (0, pg_core_1.boolean)('has_descends').notNull().default(false),
    descendsQuantity: (0, pg_core_1.integer)('descends_quantity'),
    hasSubLeagues: (0, pg_core_1.boolean)('has_sub_leagues').notNull().default(false),
    numberOfSubLeagues: (0, pg_core_1.integer)('number_of_sub_leagues'),
    imageUrl: (0, pg_core_1.text)('image_url'),
    createdAt: (0, pg_core_1.timestamp)('created_at').defaultNow().notNull(),
});
exports.leagueLinks = (0, pg_core_1.pgTable)('league_links', {
    id: (0, pg_core_1.serial)('id').primaryKey(),
    leagueId: (0, pg_core_1.integer)('league_id').references(() => exports.leagues.id).notNull(),
    label: (0, pg_core_1.varchar)('label', { length: 100 }).notNull(),
    url: (0, pg_core_1.text)('url').notNull(),
    createdAt: (0, pg_core_1.timestamp)('created_at').defaultNow().notNull(),
});
exports.leagueDivisions = (0, pg_core_1.pgTable)('league_divisions', {
    id: (0, pg_core_1.serial)('id').primaryKey(),
    leagueId: (0, pg_core_1.integer)('league_id').references(() => exports.leagues.id).notNull(),
    name: (0, pg_core_1.varchar)('name', { length: 100 }).notNull(),
    createdAt: (0, pg_core_1.timestamp)('created_at').defaultNow().notNull(),
});
exports.seasons = (0, pg_core_1.pgTable)('seasons', {
    id: (0, pg_core_1.serial)('id').primaryKey(),
    leagueId: (0, pg_core_1.integer)('league_id').references(() => exports.leagues.id).notNull(),
    startYear: (0, pg_core_1.integer)('year').notNull(),
    endYear: (0, pg_core_1.integer)('year').notNull(),
    status: (0, pg_core_1.varchar)('status', { length: 20 }).default('planned').notNull(),
    createdAt: (0, pg_core_1.timestamp)('created_at').defaultNow().notNull(),
});
exports.seasonClubs = (0, pg_core_1.pgTable)('season_clubs', {
    id: (0, pg_core_1.serial)('id').primaryKey(),
    seasonId: (0, pg_core_1.integer)('season_id').references(() => exports.seasons.id).notNull(),
    clubId: (0, pg_core_1.integer)('club_id').references(() => exports.clubs.id).notNull(),
    joinDate: (0, pg_core_1.timestamp)('join_date').notNull(),
    leaveDate: (0, pg_core_1.timestamp)('leave_date'),
    createdAt: (0, pg_core_1.timestamp)('created_at').defaultNow().notNull(),
    updatedAt: (0, pg_core_1.timestamp)('updated_at').defaultNow().notNull(),
});
exports.phases = (0, pg_core_1.pgTable)('phases', {
    id: (0, pg_core_1.serial)('id').primaryKey(),
    seasonId: (0, pg_core_1.integer)('season_id').references(() => exports.seasons.id).notNull(),
    name: (0, pg_core_1.varchar)('name', { length: 100 }).notNull(),
    type: (0, pg_core_1.varchar)('type', { length: 50 }).notNull(),
    order: (0, pg_core_1.integer)('order').notNull(),
    createdAt: (0, pg_core_1.timestamp)('created_at').defaultNow().notNull(),
});
exports.rounds = (0, pg_core_1.pgTable)('rounds', {
    id: (0, pg_core_1.serial)('id').primaryKey(),
    leagueId: (0, pg_core_1.integer)('league_id').references(() => exports.leagues.id).notNull(),
    phaseId: (0, pg_core_1.integer)('phase_id').references(() => exports.phases.id).notNull(),
    roundNumber: (0, pg_core_1.integer)('round_number').notNull(),
    startDate: (0, pg_core_1.timestamp)('start_date'),
    endDate: (0, pg_core_1.timestamp)('end_date'),
    createdAt: (0, pg_core_1.timestamp)('created_at').defaultNow().notNull(),
});
exports.groups = (0, pg_core_1.pgTable)('groups', {
    id: (0, pg_core_1.serial)('id').primaryKey(),
    phaseId: (0, pg_core_1.integer)('phase_id').references(() => exports.phases.id).notNull(),
    name: (0, pg_core_1.varchar)('name', { length: 50 }).notNull(),
    createdAt: (0, pg_core_1.timestamp)('created_at').defaultNow().notNull(),
});
exports.groupClubs = (0, pg_core_1.pgTable)('group_clubs', {
    id: (0, pg_core_1.serial)('id').primaryKey(),
    groupId: (0, pg_core_1.integer)('group_id').references(() => exports.groups.id).notNull(),
    clubId: (0, pg_core_1.integer)('club_id').references(() => exports.clubs.id).notNull(),
    createdAt: (0, pg_core_1.timestamp)('created_at').defaultNow().notNull(),
});
exports.matches = (0, pg_core_1.pgTable)('matches', {
    id: (0, pg_core_1.serial)('id').primaryKey(),
    leagueId: (0, pg_core_1.integer)('league_id').references(() => exports.leagues.id).notNull(),
    seasonId: (0, pg_core_1.integer)('season_id').references(() => exports.seasons.id).notNull(),
    phaseId: (0, pg_core_1.integer)('phase_id').references(() => exports.phases.id).notNull(),
    roundId: (0, pg_core_1.integer)('round_id').references(() => exports.rounds.id).notNull(),
    groupId: (0, pg_core_1.integer)('group_id').references(() => exports.groups.id),
    leagueDivisionId: (0, pg_core_1.integer)('league_division_id').references(() => exports.leagueDivisions.id),
    turn: (0, pg_core_1.integer)('turn').notNull().default(1),
    homeClubId: (0, pg_core_1.integer)('home_club_id').references(() => exports.clubs.id).notNull(),
    awayClubId: (0, pg_core_1.integer)('away_club_id').references(() => exports.clubs.id).notNull(),
    stadiumId: (0, pg_core_1.integer)('stadium_id').references(() => exports.stadiums.id),
    date: (0, pg_core_1.timestamp)('date').notNull(),
    status: (0, pg_core_1.varchar)('status', { length: 20 }).default('scheduled').notNull(),
    homeScore: (0, pg_core_1.integer)('home_score'),
    awayScore: (0, pg_core_1.integer)('away_score'),
    hasOvertime: (0, pg_core_1.boolean)('has_overtime').default(false),
    hasPenalties: (0, pg_core_1.boolean)('has_penalties').default(false),
    createdAt: (0, pg_core_1.timestamp)('created_at').defaultNow().notNull(),
    updatedAt: (0, pg_core_1.timestamp)('updated_at').defaultNow().notNull(),
});
exports.matchDivisions = (0, pg_core_1.pgTable)('match_divisions', {
    id: (0, pg_core_1.serial)('id').primaryKey(),
    matchId: (0, pg_core_1.integer)('match_id').references(() => exports.matches.id).notNull(),
    divisionNumber: (0, pg_core_1.integer)('division_number').notNull(),
    divisionType: (0, pg_core_1.varchar)('division_type', { length: 20 }).notNull(),
    homeScore: (0, pg_core_1.integer)('home_score').default(0).notNull(),
    awayScore: (0, pg_core_1.integer)('away_score').default(0).notNull(),
    createdAt: (0, pg_core_1.timestamp)('created_at').defaultNow().notNull(),
});
exports.matchEvents = (0, pg_core_1.pgTable)('match_events', {
    id: (0, pg_core_1.serial)('id').primaryKey(),
    matchId: (0, pg_core_1.integer)('match_id').references(() => exports.matches.id).notNull(),
    eventType: (0, pg_core_1.varchar)('event_type', { length: 50 }).notNull(),
    clubId: (0, pg_core_1.integer)('club_id').references(() => exports.clubs.id).notNull(),
    playerId: (0, pg_core_1.integer)('player_id'),
    minute: (0, pg_core_1.integer)('minute'),
    description: (0, pg_core_1.text)('description'),
    createdAt: (0, pg_core_1.timestamp)('created_at').defaultNow().notNull(),
});
exports.standings = (0, pg_core_1.pgTable)('standings', {
    id: (0, pg_core_1.serial)('id').primaryKey(),
    leagueId: (0, pg_core_1.integer)('league_id').references(() => exports.leagues.id).notNull(),
    seasonId: (0, pg_core_1.integer)('season_id').references(() => exports.seasons.id).notNull(),
    phaseId: (0, pg_core_1.integer)('phase_id').references(() => exports.phases.id).notNull(),
    roundId: (0, pg_core_1.integer)('round_id').references(() => exports.rounds.id).notNull(),
    groupId: (0, pg_core_1.integer)('group_id').references(() => exports.groups.id),
    leagueDivisionId: (0, pg_core_1.integer)('league_division_id').references(() => exports.leagueDivisions.id),
    clubId: (0, pg_core_1.integer)('club_id').references(() => exports.clubs.id).notNull(),
    points: (0, pg_core_1.integer)('points').default(0).notNull(),
    played: (0, pg_core_1.integer)('played').default(0).notNull(),
    wins: (0, pg_core_1.integer)('wins').default(0).notNull(),
    draws: (0, pg_core_1.integer)('draws').default(0).notNull(),
    losses: (0, pg_core_1.integer)('losses').default(0).notNull(),
    goalsFor: (0, pg_core_1.integer)('goals_for').default(0).notNull(),
    goalsAgainst: (0, pg_core_1.integer)('goals_against').default(0).notNull(),
    goalDifference: (0, pg_core_1.integer)('goal_difference').default(0).notNull(),
    overtimeWins: (0, pg_core_1.integer)('overtime_wins').default(0),
    overtimeLosses: (0, pg_core_1.integer)('overtime_losses').default(0),
    penaltyWins: (0, pg_core_1.integer)('penalty_wins').default(0),
    penaltyLosses: (0, pg_core_1.integer)('penalty_losses').default(0),
    setsWon: (0, pg_core_1.integer)('sets_won').default(0),
    setsLost: (0, pg_core_1.integer)('sets_lost').default(0),
    divisionsWon: (0, pg_core_1.integer)('divisions_won').default(0),
    divisionsLost: (0, pg_core_1.integer)('divisions_lost').default(0),
    homeGamesPlayed: (0, pg_core_1.integer)('home_games_played').default(0),
    awayGamesPlayed: (0, pg_core_1.integer)('away_games_played').default(0),
    homeWins: (0, pg_core_1.integer)('home_wins').default(0),
    homeLosses: (0, pg_core_1.integer)('home_losses').default(0),
    homeDraws: (0, pg_core_1.integer)('home_draws').default(0),
    awayWins: (0, pg_core_1.integer)('away_wins').default(0),
    awayLosses: (0, pg_core_1.integer)('away_losses').default(0),
    awayDraws: (0, pg_core_1.integer)('away_draws').default(0),
    createdAt: (0, pg_core_1.timestamp)('created_at').defaultNow().notNull(),
    updatedAt: (0, pg_core_1.timestamp)('updated_at').defaultNow().notNull(),
});
exports.users = (0, pg_core_1.pgTable)('users', {
    id: (0, pg_core_1.serial)('id').primaryKey(),
    email: (0, pg_core_1.varchar)('email', { length: 255 }).notNull().unique(),
    password: (0, pg_core_1.text)('password').notNull(),
    name: (0, pg_core_1.varchar)('name', { length: 100 }).notNull(),
    role: (0, pg_core_1.varchar)('role', { length: 20 }).default('user').notNull(),
    createdAt: (0, pg_core_1.timestamp)('created_at').defaultNow().notNull(),
    updatedAt: (0, pg_core_1.timestamp)('updated_at').defaultNow().notNull(),
});
//# sourceMappingURL=schema.js.map