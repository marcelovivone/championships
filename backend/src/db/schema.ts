import { pgTable, serial, varchar, integer, boolean, timestamp, text, decimal } from 'drizzle-orm/pg-core';

/**
 * ============================================================================
 * PROJECT CHAMPIONSHIPS - DATABASE SCHEMA
 * ============================================================================
 * This schema defines all tables for managing multi-sport tournaments.
 * MVP Focus: Leagues, Clubs, Matches, and Standings for collective sports.
 * Phase 2: Players, Teams, and detailed player statistics.
 * Phase 3: Individual sports and tournament management.
 * ============================================================================
 */

// ============================================================================
// 1. SPORTS TABLE - Core rules for each sport
// ============================================================================
export const sports = pgTable('sports', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 100 }).notNull().unique(), // e.g., 'Football', 'Basketball'
  reducedName: varchar('reduced_name', { length: 20 }).notNull(), // e.g., 'FB', 'BB'
  type: varchar('type', { length: 20 }).notNull(), // 'collective' or 'individual'
  divisionType: varchar('division_type', { length: 20 }).notNull(), // 'period', 'quarter', 'set', 'time'
  divisionsNumber: integer('divisions_number').notNull(), // e.g., 2 for football, 3 for ice hockey, 4 for basketball
  divisionTime: integer('division_time').notNull(), // In minutes (45 for football, 20 for ice hockey, etc.)
  scoreType: varchar('score_type', { length: 20 }).notNull(), // 'goals' or 'points'
  hasOvertime: boolean('has_overtime').default(false).notNull(),
  hasPenalties: boolean('has_penalties').default(false).notNull(),
  imageUrl: text('image_url').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// ============================================================================
// 2. COUNTRIES TABLE
// ============================================================================
export const countries = pgTable('countries', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 100 }).notNull(),
  continent: varchar('continent', { length: 50 }).notNull(), // 'Africa', 'Asia', 'Europe', 'North America', 'South America', 'Oceania'
  code: varchar('code', { length: 3 }).notNull().unique(), // ISO 3166-1 alpha-3 (e.g., 'BRA', 'USA')
  flagUrl: text('flag_url'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// ============================================================================
// 3. CITIES TABLE
// ============================================================================
export const cities = pgTable('cities', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 100 }).notNull(),
  countryId: integer('country_id').references(() => countries.id).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// ============================================================================
// 4. STADIUMS/GYMNASIUMS TABLE
// ============================================================================
export const stadiums = pgTable('stadiums', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 150 }).notNull(),
  cityId: integer('city_id').references(() => cities.id).notNull(),
  capacity: integer('capacity'), // Public capacity
  yearConstructed: integer('year_constructed'), // Year of construction
  type: varchar('type', { length: 50 }).notNull(), // 'stadium' or 'gymnasium'
  imageUrl: text('image_url'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// ============================================================================
// 5. CLUBS TABLE
// ============================================================================
export const clubs = pgTable('clubs', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 150 }).notNull(),
  shortName: varchar('short_name', { length: 50 }),
  foundationYear: integer('foundation_year').notNull(), // Mandatory field per specification
  countryId: integer('country_id').references(() => countries.id).notNull(), // Mandatory per specification
  imageUrl: text('image_url'), // Shield/emblem image
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// ============================================================================
// 6. CLUB_STADIUMS TABLE - Temporal relationship between Clubs and Stadiums
// ============================================================================
// Allows a club to have multiple stadiums over different time periods
// Only one stadium per club can be active at any given time
export const clubStadiums = pgTable('club_stadiums', {
  id: serial('id').primaryKey(),
  clubId: integer('club_id').references(() => clubs.id).notNull(),
  stadiumId: integer('stadium_id').references(() => stadiums.id).notNull(),
  startDate: timestamp('start_date').notNull(), // When the club started using this stadium
  endDate: timestamp('end_date'), // When the club stopped using this stadium (NULL = currently active)
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// ============================================================================
// 7. LEAGUES TABLE - Enhanced with comprehensive configuration
// ============================================================================
export const leagues = pgTable('leagues', {
  id: serial('id').primaryKey(),
  originalName: varchar('original_name', { length: 150 }).notNull(), // Primary name (e.g., 'Premier League')
  secondaryName: varchar('secondary_name', { length: 150 }), // Alternative name (e.g., 'English Football League')
  sportId: integer('sport_id').references(() => sports.id).notNull(),
  countryId: integer('country_id').references(() => countries.id), // NULL for international tournaments
  cityId: integer('city_id').references(() => cities.id), // NULL for leagues spanning multiple cities
  startYear: integer('start_year').notNull(), // Season start year
  endYear: integer('end_year').notNull(), // Season end year
  numberOfTurns: integer('number_of_turns').notNull(), // Number of turns/legs (typically 1 or 2)
  numberOfRounds: integer('number_of_rounds').notNull(), // Total rounds in the season
  
  // Division configuration (can override sport defaults)
  minDivisionsNumber: integer('min_divisions_number').notNull(), // Minimum match divisions
  maxDivisionsNumber: integer('max_divisions_number').notNull(), // Maximum match divisions
  divisionsTime: integer('divisions_time'), // Override sport's divisionTime (NULL = use sport value)
  hasOvertimeOverride: boolean('has_overtime_override'), // Override sport's hasOvertime (NULL = use sport value)
  hasPenaltiesOverride: boolean('has_penalties_override'), // Override sport's hasPenalties (NULL = use sport value)
  
  // Promotion/Relegation configuration
  hasAscends: boolean('has_ascends').notNull().default(false), // Does the league promote clubs?
  ascendsQuantity: integer('ascends_quantity'), // Number of clubs promoted (required if hasAscends = true)
  hasDescends: boolean('has_descends').notNull().default(false), // Does the league relegate clubs?
  descendsQuantity: integer('descends_quantity'), // Number of clubs relegated (required if hasDescends = true)
  
  // Sub-league configuration (e.g., East/West conferences in NHL)
  hasSubLeagues: boolean('has_sub_leagues').notNull().default(false), // Does the league have divisions/conferences?
  numberOfSubLeagues: integer('number_of_sub_leagues'), // Number of divisions/conferences (required if hasSubLeagues = true)
  
  imageUrl: text('image_url'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// ============================================================================
// 8. LEAGUE_LINKS TABLE - Multiple external links per league
// ============================================================================
export const leagueLinks = pgTable('league_links', {
  id: serial('id').primaryKey(),
  leagueId: integer('league_id').references(() => leagues.id).notNull(),
  label: varchar('label', { length: 100 }).notNull(), // e.g., 'Official Website', 'Twitter', 'Wikipedia'
  url: text('url').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// ============================================================================
// 9. LEAGUE_DIVISIONS (Sub-leagues/Conferences) TABLE
// ============================================================================
// Examples: NHL East/West, NBA Eastern/Western Conferences, Liga Mx Apertura/Clausura groups
export const leagueDivisions = pgTable('league_divisions', {
  id: serial('id').primaryKey(),
  leagueId: integer('league_id').references(() => leagues.id).notNull(),
  name: varchar('name', { length: 100 }).notNull(), // e.g., 'East', 'West', 'North', 'South'
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// ============================================================================
// 10. SEASONS TABLE
// ============================================================================
export const seasons = pgTable('seasons', {
  id: serial('id').primaryKey(),
  leagueId: integer('league_id').references(() => leagues.id).notNull(),
  startYear: integer('year').notNull(), // Season year/identifier
  endYear: integer('year').notNull(), // Season year/identifier
  status: varchar('status', { length: 20 }).default('planned').notNull(), // 'planned', 'ongoing', 'finished'
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// ============================================================================
// 10A. SEASON_CLUBS TABLE - Associates clubs to league seasons
// ============================================================================
// Critical for MVP: Links which clubs are participating in which league seasons
// Example: Arsenal participates in Premier League 2025/2026 season
export const seasonClubs = pgTable('season_clubs', {
  id: serial('id').primaryKey(),
  seasonId: integer('season_id').references(() => seasons.id).notNull(),
  clubId: integer('club_id').references(() => clubs.id).notNull(),
  joinDate: timestamp('join_date').notNull(), // When the club joined this season
  leaveDate: timestamp('leave_date'), // When the club left (NULL = still active)
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// ============================================================================
// 11. PHASES TABLE - Tournament phases (Regular Season, Playoffs, etc.)
// ============================================================================
export const phases = pgTable('phases', {
  id: serial('id').primaryKey(),
  seasonId: integer('season_id').references(() => seasons.id).notNull(),
  name: varchar('name', { length: 100 }).notNull(), // e.g., 'Regular Season', 'Playoffs', 'Finals'
  type: varchar('type', { length: 50 }).notNull(), // 'league', 'knockout', 'groups'
  order: integer('order').notNull(), // Display order
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// ============================================================================
// 12. ROUNDS/RODADAS TABLE - Specific rounds within a season/phase
// ============================================================================
export const rounds = pgTable('rounds', {
  id: serial('id').primaryKey(),
  leagueId: integer('league_id').references(() => leagues.id).notNull(),
  phaseId: integer('phase_id').references(() => phases.id).notNull(),
  roundNumber: integer('round_number').notNull(), // Sequential round number (1, 2, 3, ...)
  startDate: timestamp('start_date'),
  endDate: timestamp('end_date'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// ============================================================================
// 13. GROUPS/KEYS TABLE - Tournament groups (used in group stages)
// ============================================================================
export const groups = pgTable('groups', {
  id: serial('id').primaryKey(),
  phaseId: integer('phase_id').references(() => phases.id).notNull(),
  name: varchar('name', { length: 50 }).notNull(), // e.g., 'Group A', 'Group B', 'Key 1'
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// ============================================================================
// 14. GROUP_CLUBS - Many-to-Many relationship between Groups and Clubs
// ============================================================================
export const groupClubs = pgTable('group_clubs', {
  id: serial('id').primaryKey(),
  groupId: integer('group_id').references(() => groups.id).notNull(),
  clubId: integer('club_id').references(() => clubs.id).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// ============================================================================
// 15. MATCHES TABLE - Individual matches
// ============================================================================
export const matches = pgTable('matches', {
  id: serial('id').primaryKey(),
  leagueId: integer('league_id').references(() => leagues.id).notNull(),
  seasonId: integer('season_id').references(() => seasons.id).notNull(),
  phaseId: integer('phase_id').references(() => phases.id).notNull(),
  roundId: integer('round_id').references(() => rounds.id).notNull(),
  groupId: integer('group_id').references(() => groups.id), // NULL if not part of group stage
  leagueDivisionId: integer('league_division_id').references(() => leagueDivisions.id), // e.g., division/conference
  turn: integer('turn').notNull().default(1), // 1 or 2 (for double round-robin leagues)
  homeClubId: integer('home_club_id').references(() => clubs.id).notNull(),
  awayClubId: integer('away_club_id').references(() => clubs.id).notNull(),
  stadiumId: integer('stadium_id').references(() => stadiums.id), // Stadium where match was played
  date: timestamp('date').notNull(),
  status: varchar('status', { length: 20 }).default('scheduled').notNull(), // 'scheduled', 'live', 'finished', 'postponed', 'cancelled'
  homeScore: integer('home_score'), // Only set when match is finished
  awayScore: integer('away_score'), // Only set when match is finished
  hasOvertime: boolean('has_overtime').default(false), // TRUE if match went to overtime
  hasPenalties: boolean('has_penalties').default(false), // TRUE if decided by penalties
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// ============================================================================
// 16. MATCH_DIVISIONS TABLE - Scores for each period/quarter/set
// ============================================================================
// Examples:
// - Football: 2 rows (1st half, 2nd half)
// - Basketball: 4 rows (4 quarters)
// - Ice Hockey: 3 rows (3 periods)
// - Volleyball: 3-5 rows (sets)
export const matchDivisions = pgTable('match_divisions', {
  id: serial('id').primaryKey(),
  matchId: integer('match_id').references(() => matches.id).notNull(),
  divisionNumber: integer('division_number').notNull(), // 1, 2, 3, ... or 'OT' (overtime), 'SO' (shootout/penalties)
  divisionType: varchar('division_type', { length: 20 }).notNull(), // 'regular', 'overtime', 'penalties'
  homeScore: integer('home_score').default(0).notNull(),
  awayScore: integer('away_score').default(0).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// ============================================================================
// 17. MATCH_EVENTS TABLE - Events during the match (placeholder for future)
// ============================================================================
// Can be extended to track goals, substitutions, cards, etc.
export const matchEvents = pgTable('match_events', {
  id: serial('id').primaryKey(),
  matchId: integer('match_id').references(() => matches.id).notNull(),
  eventType: varchar('event_type', { length: 50 }).notNull(), // 'goal', 'yellow_card', 'red_card', 'substitution', etc.
  clubId: integer('club_id').references(() => clubs.id).notNull(),
  playerId: integer('player_id'), // For Phase 2: reference to players table (foreign key to be added)
  minute: integer('minute'), // Minute when event occurred
  description: text('description'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// ============================================================================
// 18. STANDINGS TABLE - Historical standings by round
// ============================================================================
// Tracks standings progression through each round
// Sport-specific columns accommodate different scoring systems
export const standings = pgTable('standings', {
  id: serial('id').primaryKey(),
  leagueId: integer('league_id').references(() => leagues.id).notNull(),
  seasonId: integer('season_id').references(() => seasons.id).notNull(),
  phaseId: integer('phase_id').references(() => phases.id).notNull(),
  roundId: integer('round_id').references(() => rounds.id).notNull(),
  groupId: integer('group_id').references(() => groups.id), // NULL if no group stage
  leagueDivisionId: integer('league_division_id').references(() => leagueDivisions.id), // Standings per division if applicable
  clubId: integer('club_id').references(() => clubs.id).notNull(),
  
  // General statistics
  points: integer('points').default(0).notNull(),
  played: integer('played').default(0).notNull(),
  wins: integer('wins').default(0).notNull(),
  draws: integer('draws').default(0).notNull(),
  losses: integer('losses').default(0).notNull(),
  goalsFor: integer('goals_for').default(0).notNull(),
  goalsAgainst: integer('goals_against').default(0).notNull(),
  goalDifference: integer('goal_difference').default(0).notNull(),
  
  // Ice Hockey specific: overtime/shootout statistics
  overtimeWins: integer('overtime_wins').default(0), // Wins in overtime
  overtimeLosses: integer('overtime_losses').default(0), // Losses in overtime
  penaltyWins: integer('penalty_wins').default(0), // Wins via shootout/penalties
  penaltyLosses: integer('penalty_losses').default(0), // Losses via shootout/penalties
  
  // Volleyball specific: set statistics
  setsWon: integer('sets_won').default(0), // Total sets won
  setsLost: integer('sets_lost').default(0), // Total sets lost
  
  // Basketball specific: divisions statistics (if applicable by sport)
  divisionsWon: integer('divisions_won').default(0), // For sports that use divisions
  divisionsLost: integer('divisions_lost').default(0),
  
  // Home/Away filter support
  homeGamesPlayed: integer('home_games_played').default(0),
  awayGamesPlayed: integer('away_games_played').default(0),
  homeWins: integer('home_wins').default(0),
  homeLosses: integer('home_losses').default(0),
  homeDraws: integer('home_draws').default(0),
  awayWins: integer('away_wins').default(0),
  awayLosses: integer('away_losses').default(0),
  awayDraws: integer('away_draws').default(0),
  
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// ============================================================================
// 19. USERS TABLE - Authentication & Authorization
// ============================================================================
export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  password: text('password').notNull(), // Will store hashed password
  name: varchar('name', { length: 100 }).notNull(),
  role: varchar('role', { length: 20 }).default('user').notNull(), // 'admin', 'editor', 'user'
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});