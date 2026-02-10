import { pgEnum, pgTable, serial, varchar, integer, boolean, timestamp, text, decimal } from 'drizzle-orm/pg-core';

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
  minMatchDivisionNumber: integer('min_match_divisions_number').notNull(), // Added as per requirements
  maxMatchDivisionNumber: integer('max_match_divisions_number').notNull(), // Renamed from divisions_number as per requirements
  divisionTime: integer('division_time').notNull(), // In minutes (45 for football, 20 for ice hockey, etc.)
  scoreType: varchar('score_type', { length: 20 }).notNull(), // 'goals' or 'points'
  hasOvertime: boolean('has_overtime').default(false).notNull(),
  hasPenalties: boolean('has_penalties').default(false).notNull(),
  flgDefault: boolean('flg_default').default(false).notNull(),
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
  sportId: integer('sport_id').references(() => sports.id).default(36).notNull(),
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
  foundationYear: integer('foundation_year'), // Changed from .notNull() to allow NULL values
  countryId: integer('country_id').references(() => countries.id).notNull(), // Mandatory per specification
  cityId: integer('city_id').references(() => cities.id), // Changed to allow NULL
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
  numberOfRoundsMatches: integer('number_of_rounds_matches').default(0).notNull(), // Changed from numberOfTurns as per requirements
  
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
  flgRoundAutomatic: boolean('flg_round_automatic').default(true).notNull(),
  typeOfSchedule: varchar('type_of_schedule', { length: 10 }).default('Round').notNull(),
  
  imageUrl: text('image_url'),
  flgDefault: boolean('flg_default').default(false).notNull(),
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
// 10. SEASONS TABLE
// ============================================================================
export const seasons = pgTable('seasons', {
  id: serial('id').primaryKey(),
  sportId: integer('sport_id').references(() => sports.id).notNull(),
  leagueId: integer('league_id').references(() => leagues.id).notNull(),
  startYear: integer('start_year').notNull(), // Season year/identifier
  endYear: integer('end_year').notNull(), // Season year/identifier
  status: varchar('status', { length: 20 }).default('planned').notNull(), // 'planned', 'ongoing', 'finished'
  flgDefault: boolean('flg_default').default(false).notNull(),
  numberOfGroups: integer('number_of_groups').default(0).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// ============================================================================
// 10A. SEASON_CLUBS TABLE - Associates clubs to league seasons
// ============================================================================
// Critical for MVP: Links which clubs are participating in which league seasons
// Example: Arsenal participates in Premier League 2025/2026 season
export const seasonClubs = pgTable('season_clubs', {
  id: serial('id').primaryKey(),
  sportId: integer('sport_id').references(() => sports.id).notNull(),
  leagueId: integer('league_id').references(() => leagues.id).notNull(),
  seasonId: integer('season_id').references(() => seasons.id).notNull(),
  clubId: integer('club_id').references(() => clubs.id).notNull(),
  groupId: integer('group_id').references(() => groups.id), // NULL if not assigned to a group
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// ============================================================================
// 12. ROUNDS/RODADAS TABLE - Specific rounds within a season/phase
// ============================================================================
export const rounds = pgTable('rounds', {
  id: serial('id').primaryKey(),
  leagueId: integer('league_id').references(() => leagues.id).notNull(),
  seasonId: integer('season_id').references(() => seasons.id).notNull(), // Adding seasonId as it seems to be missing
  roundNumber: integer('round_number').notNull(), // Sequential round number (1, 2, 3, ...)
  startDate: timestamp('start_date'),
  endDate: timestamp('end_date'),
  flgCurrent: boolean('flg_current').default(false).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// ============================================================================
// 13. GROUPS/KEYS TABLE - Tournament groups (used in group stages)
// ============================================================================
export const groups = pgTable('groups', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 50 }).notNull(), // e.g., 'Group A', 'Group B', 'Key 1'
  sportId: integer('sport_id').references(() => sports.id).notNull(),
  leagueId: integer('league_id').references(() => leagues.id).notNull(),
  seasonId: integer('season_id').references(() => seasons.id).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// ============================================================================
// 15. MATCHES TABLE - Individual matches
// ============================================================================
export const matchStatusEnum = pgEnum('match_status', [
  'scheduled',
  'live',
  'finished',
  'postponed',
  'cancelled',
]);

export const matches = pgTable('matches', {
  id: serial('id').primaryKey(),
  sportId: integer('sport_id').references(() => sports.id).notNull(),
  leagueId: integer('league_id').references(() => leagues.id).notNull(),
  seasonId: integer('season_id').references(() => seasons.id).notNull(),
  roundId: integer('round_id').references(() => rounds.id).notNull(),
  groupId: integer('group_id').references(() => groups.id), // NULL if not part of group stage
  homeClubId: integer('home_club_id').references(() => clubs.id).notNull(),
  awayClubId: integer('away_club_id').references(() => clubs.id).notNull(),
  stadiumId: integer('stadium_id').references(() => stadiums.id), // Stadium where match was played
  date: timestamp('date').notNull(),
  status: matchStatusEnum('status').default('scheduled').notNull(), // 'scheduled', 'live', 'finished', 'postponed', 'cancelled'
  homeScore: integer('home_score'), // Only set when match is finished
  awayScore: integer('away_score'), // Only set when match is finished
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
  roundId: integer('round_id').references(() => rounds.id).notNull(),
  groupId: integer('group_id').references(() => groups.id), // NULL if no group stage
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
  profile: varchar('profile', { length: 20 }).default('user').notNull(), // 'admin', 'final_user'
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// ============================================================================
// 20. MENU_ITEMS TABLE - Menu options for different user profiles
// ============================================================================
export const menuItems = pgTable('menu_items', {
  id: serial('id').primaryKey(),
  code: varchar('code', { length: 50 }).notNull().unique(),
  name: varchar('name', { length: 100 }).notNull(),
  description: text('description'),
  category: varchar('category', { length: 50 }).notNull(), // 'admin', 'final_user', etc.
  parentId: integer('parent_id'), // For hierarchical menu structure
  order: integer('order').default(0).notNull(),
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// ============================================================================
// 21. PROFILE_PERMISSIONS TABLE - Define permissions for user profiles
// ============================================================================
export const profilePermissions = pgTable('profile_permissions', {
  id: serial('id').primaryKey(),
  profile: varchar('profile', { length: 20 }).notNull(), // 'admin', 'final_user', etc.
  menuItemId: integer('menu_item_id').references(() => menuItems.id).notNull(),
  canAccess: boolean('can_access').default(true).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// ============================================================================
// 22. USER_PERMISSIONS TABLE - Specific permissions for individual users
// ============================================================================
export const userPermissions = pgTable('user_permissions', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id).notNull(),
  menuItemId: integer('menu_item_id').references(() => menuItems.id).notNull(),
  canAccess: boolean('can_access').default(true).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// ============================================================================
// 23. SPORT_CLUBS TABLE - Association between sports and clubs
// ============================================================================
export const sportClubs = pgTable('sport_clubs', {
  id: serial('id').primaryKey(),
  sportId: integer('sport_id').references(() => sports.id).notNull(),
  clubId: integer('club_id').references(() => clubs.id).notNull(),
  name: varchar('name', { length: 100 }).default("").notNull(),
  flgActive: boolean('flg_active').default(true).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});
