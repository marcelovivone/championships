import {
  pgEnum,
  pgTable,
  serial,
  varchar,
  integer,
  boolean,
  timestamp,
  date,
  text,
  decimal,
  jsonb,
  index,
  uniqueIndex,
} from 'drizzle-orm/pg-core';

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
  flgEspnApiPartialScores: boolean('flg_espn_api_partial_scores').default(false).notNull(), // For integration with ESPN API (if needed)
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
  divisionTime: integer('division_time'), // Override sport's divisionTime (NULL = use sport value)
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
  
  pointSystem: varchar('point_system', { length: 20 }).default('FOOTBALL_3_1_0').notNull(),
  
  imageUrl: text('image_url'),
  flgDefault: boolean('flg_default').default(false).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const seasonPhaseEnum = pgEnum('season_phase', [
  'Regular',
  'Play-ins',
  'Playoffs',
]);

export const seasonPhaseDetailEnum = pgEnum('season_phase_detail', [
  'Regular',
  'Play-ins',
  'Round of 64',
  'Round of 32',
  'Round of 16',
  'Quarterfinals',
  'Semifinals',
  'Finals',
]);

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
  flgHasPostseason: boolean('flg_has_postseason').default(false).notNull(),
  currentPhase: seasonPhaseEnum('current_phase').default('Regular').notNull(),
  currentPhaseDetail: seasonPhaseDetailEnum('current_phase_detail').default('Regular').notNull(),
  flgEspnApiPartialScores: boolean('flg_default').default(false).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// ============================================================================
// 10AA. SEASON_ESPN_EXTRACTION_CONFIGS TABLE - Stored extraction settings for
// current-season ESPN loads
// ============================================================================
export const seasonEspnExtractionConfigs = pgTable('season_espn_extraction_configs', {
  id: serial('id').primaryKey(),
  seasonId: integer('season_id').references(() => seasons.id).notNull(),
  externalLeagueCode: varchar('external_league_code', { length: 120 }).notNull(),
  startDate: date('start_date').notNull(),
  endDate: date('end_date').notNull(),
  sameYears: boolean('same_years').default(false).notNull(),
  hasPostseason: boolean('has_postseason').default(false).notNull(),
  scheduleType: varchar('schedule_type', { length: 10 }).default('Date').notNull(),
  hasGroups: boolean('has_groups').default(false).notNull(),
  numberOfGroups: integer('number_of_groups').default(0).notNull(),
  hasDivisions: boolean('has_divisions').default(true).notNull(),
  runInBackground: boolean('run_in_background').default(false).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  seasonIdUnique: uniqueIndex('season_espn_extraction_configs_season_id_uq').on(table.seasonId),
  externalLeagueCodeIdx: index('season_espn_extraction_configs_external_league_code_idx').on(table.externalLeagueCode),
}));

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
  'Scheduled',
  'Finished',
  'Postponed',
  'Cancelled',
]);

// Enum for standing zone types
export const typeOfStandingEnum = pgEnum('type_of_standing', ['All', 'Combined', 'Group']);

export const matches = pgTable('matches', {
  id: serial('id').primaryKey(),
  sportId: integer('sport_id').references(() => sports.id).notNull(),
  leagueId: integer('league_id').references(() => leagues.id).notNull(),
  seasonId: integer('season_id').references(() => seasons.id).notNull(),
  roundId: integer('round_id').references(() => rounds.id).notNull(),
  groupId: integer('group_id').references(() => groups.id), // NULL if not part of group stage
  homeClubId: integer('home_club_id').references(() => clubs.id),
  awayClubId: integer('away_club_id').references(() => clubs.id),
  homeClubPlaceholder: varchar('home_club_placeholder', { length: 120 }),
  awayClubPlaceholder: varchar('away_club_placeholder', { length: 120 }),
  stadiumId: integer('stadium_id').references(() => stadiums.id), // Stadium where match was played
  date: timestamp('date').notNull(),
  status: matchStatusEnum('status').default('Scheduled').notNull(), // 'Scheduled', 'Finished', 'Postponed', 'Cancelled'
  seasonPhase: seasonPhaseEnum('season_phase').default('Regular').notNull(),
  seasonPhaseDetail: seasonPhaseDetailEnum('season_phase_detail').default('Regular').notNull(),
  homeScore: integer('home_score'), // Only set when match is finished
  awayScore: integer('away_score'), // Only set when match is finished
  originApiId: varchar('origin_api_id', { length: 50 }), // For integration with external API (if needed)
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
  sportId: integer('sport_id').references(() => sports.id).notNull(),
  leagueId: integer('league_id').references(() => leagues.id).notNull(),
  seasonId: integer('season_id').references(() => seasons.id).notNull(),
  roundId: integer('round_id').references(() => rounds.id),
  matchDate: timestamp('match_date'),
  groupId: integer('group_id').references(() => groups.id), // NULL if no group stage
  clubId: integer('club_id').references(() => clubs.id).notNull(),
  matchId: integer('match_id').references(() => matches.id), // Link to match
  
  // General statistics
  points: integer('points').default(0).notNull(),
  played: integer('played').default(0).notNull(),
  wins: integer('wins').default(0).notNull(),
  draws: integer('draws').default(0).notNull(),
  losses: integer('losses').default(0).notNull(),
  goalsFor: integer('goals_for').default(0).notNull(),
  goalsAgainst: integer('goals_against').default(0).notNull(),
  
  // Ice Hockey specific: overtime/shootout statistics
  overtimeWins: integer('overtime_wins').default(0), // Wins in overtime
  overtimeLosses: integer('overtime_losses').default(0), // Losses in overtime
  penaltyWins: integer('penalty_wins').default(0), // Wins via shootout/penalties
  penaltyLosses: integer('penalty_losses').default(0), // Losses via shootout/penalties
  regulationWins: integer('regulation_wins').default(0), // NHL: wins in regulation time
  regulationOtWins: integer('regulation_ot_wins').default(0), // NHL: wins in regulation + OT (excl. shootout)
  
  // Volleyball specific: set statistics
  setsWon: integer('sets_won').default(0), // Total sets won
  setsLost: integer('sets_lost').default(0), // Total sets lost
  
  // Home/Away filter support
  homeGamesPlayed: integer('home_games_played').default(0),
  awayGamesPlayed: integer('away_games_played').default(0),
  homePoints: integer('home_points').default(0),
  awayPoints: integer('away_points').default(0),
  homeWins: integer('home_wins').default(0),
  homeLosses: integer('home_losses').default(0),
  homeDraws: integer('home_draws').default(0),
  homeGoalsFor: integer('home_goals_for').default(0).notNull(),
  homeGoalsAgainst: integer('home_goals_against').default(0).notNull(),
  awayWins: integer('away_wins').default(0),
  awayLosses: integer('away_losses').default(0),
  awayDraws: integer('away_draws').default(0),
  awayGoalsFor: integer('away_goals_for').default(0).notNull(),
  awayGoalsAgainst: integer('away_goals_against').default(0).notNull(),

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

// ============================================================================
// 24. STANDING_ZONES TABLE - Define standing zones for different sports, leagues, and seasons
// ============================================================================
export const standingZones = pgTable('standing_zones', {
  id: serial('id').primaryKey(),
  sportId: integer('sport_id').references(() => sports.id).notNull(),
  leagueId: integer('league_id').references(() => leagues.id).notNull(),
  seasonId: integer('season_id').references(() => seasons.id),
  startPosition: integer('start_position').notNull(),
  endPosition: integer('end_position').notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  typeOfStanding: typeOfStandingEnum('type_of_standing').default('All').notNull(),
  start_year: integer('start_year').default(null),
  end_year: integer('end_year').default(null),
  flg_priority: boolean('flg_priority').default(false).notNull(),
  colorHex: varchar('color_hex', { length: 7 }).default('#FFFFFF').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// ============================================================================
// 25. STANDING_ORDER_RULES TABLE - Tiebreaker criteria per sport/league
// ============================================================================
export const standingOrderRules = pgTable('standing_order_rules', {
  id: serial('id').primaryKey(),
  sportId: integer('sport_id').references(() => sports.id).notNull(),
  leagueId: integer('league_id').references(() => leagues.id), // NULL = sport-level default
  startYear: integer('start_year'),                             // NULL = applies to all years
  endYear: integer('end_year'),                                 // NULL = still in effect
  sortOrder: integer('sort_order').notNull(),                    // gapped: 100, 200, 300...
  criterion: varchar('criterion', { length: 40 }).notNull(),    // e.g. 'POINTS', 'H2H_GOALS_FOR'
  direction: varchar('direction', { length: 4 }).default('DESC').notNull(), // 'DESC' or 'ASC'
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// ============================================================================
// 26. AGENT CONTROL PLANE ENUMS
// ============================================================================
export const agentModeEnum = pgEnum('agent_mode', ['dry-run', 'manual', 'semi-automatic', 'autonomous']);

export const agentTriggerTypeEnum = pgEnum('agent_trigger_type', ['manual', 'schedule', 'event']);

export const agentRunStatusEnum = pgEnum('agent_run_status', [
  'queued',
  'running',
  'waiting-approval',
  'completed',
  'failed',
  'cancelled',
  'rejected',
]);

export const agentActionKindEnum = pgEnum('agent_action_kind', ['read', 'notify', 'generate-script', 'write']);

export const agentActionStatusEnum = pgEnum('agent_action_status', [
  'planned',
  'pending-approval',
  'approved',
  'executed',
  'blocked',
  'skipped',
  'failed',
  'rejected',
]);

export const approvalStatusEnum = pgEnum('approval_status', ['pending', 'approved', 'rejected', 'cancelled']);

export const notificationChannelEnum = pgEnum('notification_channel', ['email', 'in-app']);

export const notificationStatusEnum = pgEnum('notification_status', ['pending', 'sent', 'failed', 'cancelled']);

// ============================================================================
// 27. AGENT_DEFINITIONS TABLE
// ============================================================================
export const agentDefinitions = pgTable('agent_definitions', {
  id: serial('id').primaryKey(),
  agentKey: varchar('agent_key', { length: 80 }).notNull(),
  name: varchar('name', { length: 150 }).notNull(),
  description: text('description'),
  version: varchar('version', { length: 30 }).default('1.0.0').notNull(),
  defaultMode: agentModeEnum('default_mode').default('dry-run').notNull(),
  supportsManualTrigger: boolean('supports_manual_trigger').default(true).notNull(),
  supportsSchedule: boolean('supports_schedule').default(false).notNull(),
  supportsEventTrigger: boolean('supports_event_trigger').default(false).notNull(),
  owner: varchar('owner', { length: 120 }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  agentKeyUnique: uniqueIndex('agent_definitions_agent_key_uq').on(table.agentKey),
  agentKeyIdx: index('agent_definitions_agent_key_idx').on(table.agentKey),
}));

// ============================================================================
// 28. AGENT_CONFIG TABLE
// ============================================================================
export const agentConfig = pgTable('agent_config', {
  id: serial('id').primaryKey(),
  agentDefinitionId: integer('agent_definition_id').references(() => agentDefinitions.id).notNull(),
  isEnabled: boolean('is_enabled').default(false).notNull(),
  mode: agentModeEnum('mode').default('dry-run').notNull(),
  scheduleExpression: varchar('schedule_expression', { length: 120 }),
  timeoutSeconds: integer('timeout_seconds').default(300).notNull(),
  maxRetries: integer('max_retries').default(0).notNull(),
  approvalRequiredForWrites: boolean('approval_required_for_writes').default(true).notNull(),
  notificationRecipients: jsonb('notification_recipients'),
  triggerFilters: jsonb('trigger_filters'),
  configJson: jsonb('config_json'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  agentDefinitionIdIdx: index('agent_config_agent_definition_id_idx').on(table.agentDefinitionId),
}));

// ============================================================================
// 29. RUN_HISTORY TABLE
// ============================================================================
export const runHistory = pgTable('run_history', {
  id: serial('id').primaryKey(),
  agentDefinitionId: integer('agent_definition_id').references(() => agentDefinitions.id).notNull(),
  agentConfigId: integer('agent_config_id').references(() => agentConfig.id),
  runKey: varchar('run_key', { length: 120 }).notNull(),
  triggerType: agentTriggerTypeEnum('trigger_type').notNull(),
  triggerSource: varchar('trigger_source', { length: 120 }).notNull(),
  mode: agentModeEnum('mode').notNull(),
  status: agentRunStatusEnum('status').default('queued').notNull(),
  initiatedBy: varchar('initiated_by', { length: 120 }),
  idempotencyKey: varchar('idempotency_key', { length: 150 }),
  correlationId: varchar('correlation_id', { length: 150 }),
  summary: text('summary'),
  payload: jsonb('payload'),
  resultJson: jsonb('result_json'),
  errorCode: varchar('error_code', { length: 80 }),
  errorMessage: text('error_message'),
  startedAt: timestamp('started_at'),
  finishedAt: timestamp('finished_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  runKeyUnique: uniqueIndex('run_history_run_key_uq').on(table.runKey),
  agentDefinitionIdIdx: index('run_history_agent_definition_id_idx').on(table.agentDefinitionId),
  statusIdx: index('run_history_status_idx').on(table.status),
  createdAtIdx: index('run_history_created_at_idx').on(table.createdAt),
  idempotencyKeyIdx: index('run_history_idempotency_key_idx').on(table.idempotencyKey),
}));

// ============================================================================
// 30. ACTION_LOGS TABLE
// ============================================================================
export const actionLogs = pgTable('action_logs', {
  id: serial('id').primaryKey(),
  runHistoryId: integer('run_history_id').references(() => runHistory.id).notNull(),
  actionKey: varchar('action_key', { length: 150 }).notNull(),
  kind: agentActionKindEnum('kind').notNull(),
  status: agentActionStatusEnum('status').default('planned').notNull(),
  summary: text('summary').notNull(),
  targetType: varchar('target_type', { length: 80 }),
  targetId: varchar('target_id', { length: 120 }),
  requiresApproval: boolean('requires_approval').default(false).notNull(),
  requiresHumanExecution: boolean('requires_human_execution').default(false).notNull(),
  generatedArtifactPath: text('generated_artifact_path'),
  actionPayload: jsonb('action_payload'),
  resultPayload: jsonb('result_payload'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  runHistoryIdIdx: index('action_logs_run_history_id_idx').on(table.runHistoryId),
  actionKeyIdx: index('action_logs_action_key_idx').on(table.actionKey),
  statusIdx: index('action_logs_status_idx').on(table.status),
}));

// ============================================================================
// 31. APPROVALS TABLE
// ============================================================================
export const approvals = pgTable('approvals', {
  id: serial('id').primaryKey(),
  runHistoryId: integer('run_history_id').references(() => runHistory.id).notNull(),
  actionLogId: integer('action_log_id').references(() => actionLogs.id),
  requestedByUserId: integer('requested_by_user_id').references(() => users.id),
  decidedByUserId: integer('decided_by_user_id').references(() => users.id),
  status: approvalStatusEnum('status').default('pending').notNull(),
  summary: text('summary').notNull(),
  reason: text('reason'),
  requestedAt: timestamp('requested_at').defaultNow().notNull(),
  decidedAt: timestamp('decided_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  runHistoryIdIdx: index('approvals_run_history_id_idx').on(table.runHistoryId),
  actionLogIdIdx: index('approvals_action_log_id_idx').on(table.actionLogId),
  statusIdx: index('approvals_status_idx').on(table.status),
  requestedAtIdx: index('approvals_requested_at_idx').on(table.requestedAt),
}));

// ============================================================================
// 32. NOTIFICATIONS TABLE
// ============================================================================
export const notifications = pgTable('notifications', {
  id: serial('id').primaryKey(),
  agentDefinitionId: integer('agent_definition_id').references(() => agentDefinitions.id),
  runHistoryId: integer('run_history_id').references(() => runHistory.id),
  approvalId: integer('approval_id').references(() => approvals.id),
  channel: notificationChannelEnum('channel').notNull(),
  status: notificationStatusEnum('status').default('pending').notNull(),
  recipient: varchar('recipient', { length: 255 }).notNull(),
  subject: varchar('subject', { length: 200 }),
  message: text('message').notNull(),
  metadata: jsonb('metadata'),
  sentAt: timestamp('sent_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  runHistoryIdIdx: index('notifications_run_history_id_idx').on(table.runHistoryId),
  statusIdx: index('notifications_status_idx').on(table.status),
  createdAtIdx: index('notifications_created_at_idx').on(table.createdAt),
}));

// ============================================================================
// 33. TRIGGER_METADATA TABLE
// ============================================================================
export const triggerMetadata = pgTable('trigger_metadata', {
  id: serial('id').primaryKey(),
  agentDefinitionId: integer('agent_definition_id').references(() => agentDefinitions.id).notNull(),
  triggerType: agentTriggerTypeEnum('trigger_type').notNull(),
  triggerKey: varchar('trigger_key', { length: 150 }).notNull(),
  triggerSource: varchar('trigger_source', { length: 120 }),
  metadata: jsonb('metadata'),
  lastFiredAt: timestamp('last_fired_at'),
  nextScheduledAt: timestamp('next_scheduled_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  agentDefinitionIdIdx: index('trigger_metadata_agent_definition_id_idx').on(table.agentDefinitionId),
  triggerKeyIdx: index('trigger_metadata_trigger_key_idx').on(table.triggerKey),
  createdAtIdx: index('trigger_metadata_created_at_idx').on(table.createdAt),
}));