/**
 * PROJECT CHAMPIONSHIPS - IMPLEMENTATION STATUS REVIEW
 * Date: January 20, 2026 - Updated January 30, 2026
 *
 *
 * =========================
 * SESSION SUMMARY (Jan 30, 2026)
 * =========================
 *
 * FOCUS: Implementation of Matches functionality in backend and frontend
 *
 * TODAY'S COMPLETED WORK:
 * - Updated documentation to reflect current project state
 * - Removed references to phases and match_events from MVP scope
 * - Confirmed Groups functionality is complete and stable
 * - Prepared for full Matches implementation (backend and frontend)
 *
 * NEXT STEPS:
 * - Implement complete Matches functionality (backend schema, DTOs, services, controllers)
 * - Implement frontend types, API clients and admin page for Matches
 * - Ensure proper integration with existing entities (sports, leagues, seasons, clubs, etc.)
 *
 * HOW TO GET CONTEXT:
 * - Review this section for a summary of the latest session
 * - See Section 16 (NOTES FOR CONTINUATION) for technical decisions and pending tasks
 * - See Section 12+ for architectural and workflow notes
 * - All recent migrations and DTO changes are in backend/drizzle and backend/src/common/dtos
 *
 *
 * This document provides a comprehensive review of the Championships platform
 * implementation, including completed work, current architecture, and next steps.
 * 
 * PHASE STRUCTURE:
 * - Phase 1A: Backend MVP (COMPLETED)
 * - Phase 1B: Frontend MVP (IN PROGRESS - Item 2)
 * - Phase 2: Players, Teams, Player Statistics (FUTURE)
 * - Phase 3: Individual Sports, Tournaments, Advanced Features (FUTURE)
 */

// ============================================================================
// 0. MONOREPO STRUCTURE (CORRECTED - January 22, 2026)
// ============================================================================
/*
 * PROJECT STRUCTURE:
 * 
 * Championships/                          ← Root project folder (pushed to GitHub)
 * ├── backend/                            ← NestJS backend (Phase 1 Complete)
 * │   ├── src/
 * │   ├── dist/
 * │   ├── node_modules/
 * │   ├── package.json
 * │   ├── tsconfig.json
 * │   ├── nest-cli.json
 * │   ├── drizzle.config.ts
 * │   ├── test.sh
 * │   └── ... (backend files)
 * │
 * ├── frontend/                           ← Next.js frontend (Phase 2 - To be created)
 * │   ├── src/
 * │   ├── public/
 * │   ├── package.json
 * │   ├── tsconfig.json
 * │   ├── tailwind.config.ts
 * │   ├── next.config.ts
 * │   └── ... (frontend files)
 * │
 * ├── documentation/                      ← Shared documentation
 * │   ├── FOOTBALL_MOCKUP_ANALYSIS.md
 * │   ├── ARCHITECTURE_SUMMARY.md
 * │   ├── GITHUB_SETUP_GUIDE.md
 * │   ├── API_QUICK_REFERENCE.md
 * │   └── ... (other docs)
 * │
 * ├── database/                           ← Database initialization scripts
 * │   └── init.sql.sql
 * │
 * ├── docker-compose.yml                  ← PostgreSQL Docker configuration
 * ├── FRONTEND_ARCHITECTURE.ts            ← Phase 2 frontend specs (root level)
 * └── README.md                           ← Project overview (to be created)
 * 
 * GITHUB REPO: https://github.com/marcelovivone/championships.git
 * 
 * STATUS: ✅ Monorepo structure now correctly organized with:
 *         - Backend as first-level folder
 *         - Frontend as first-level folder (ready to create)
 *         - Shared documentation folder
 *         - Proper root-level configuration
 *         - Successfully pushed to GitHub (January 22, 2026)
 */

// ============================================================================
// 1. PROJECT OVERVIEW
// ============================================================================
/*
 * PROJECT NAME: Championships
 * OBJECTIVE: Multi-sport tournament management system
 * CURRENT PHASE: MVP Phase 1B (Frontend Development)
 * COMPLETED: MVP Phase 1A (Backend)
 * 
 * Stack:
 * - Backend: NestJS + TypeScript
 * - Frontend: Next.js 14+ + TypeScript
 * - ORM: Drizzle ORM
 * - Database: PostgreSQL (Docker)
 * - Architecture: Modular (Controller → Service → Repository pattern)
 */

// ============================================================================
// 2. SCHEMA UPDATES & MIGRATIONS
// ============================================================================
/*
 * LATEST CHANGES (User Manual Updates):
 * 
 * 1. Seasons Table:
 *    - Changed from: startDate (timestamp), endDate (timestamp)
 *    - Changed to: year (integer) for both startYear and endYear
 *    - Rationale: Simplifies season identification using year format
 * 
 * 2. Rounds Table:
 *    - Changed from: startDate (NOT NULL), endDate (NOT NULL)
 *    - Changed to: startDate (NULLABLE), endDate (NULLABLE)
 *    - Rationale: Allows flexible round scheduling without mandatory dates
 * 
 * 3. Sports Table (January 25, 2026):
 *    - Changed from: divisionsNumber (single field)
 *    - Changed to: minMatchDivisionNumber + maxMatchDivisionNumber (two fields)
 *    - Rationale: Align sports table with leagues table structure
 *    - All three fields (min, max, divTime) must be > 0 (stricter than leagues)
 * 
 * GENERATED MIGRATIONS:
 * - 0006_quiet_winter_soldier.sql: Initial schema creation
 * - 0007_hard_tempest.sql: User manual schema updates
 * - 0016_damp_kinsey_walden.sql: Sports table min/max divisions
 * 
 * CURRENT WORK IN PROGRESS (Item 2 - Frontend Admin Panels):
 * ✅ COMPLETED (January 23-25, 2026):
 *    - Sports table: Backend + Frontend fully implemented with validation
 *    - Leagues table: Backend + Frontend fully implemented with validation
 *    - Seasons table: Enhanced with sportId column (database + backend + frontend)
 *    - Season_clubs table: Complete implementation with cascading filters
 *      * Database: Added sport_id column (NOT NULL, FK to sports)
 *      * Backend: Updated schema, DTOs, service with sports join and validation
 *      * Frontend: Complete CRUD with cascading dropdowns (Sport → Season → Club → Group)
 *      * Smart filtering: Seasons filtered by sport, Clubs by sport_clubs, Groups by season
 *    - Sport_clubs table: New association table created
 *      * Database: sport_id, club_id, flg_active fields with proper constraints
 *      * Backend: Full CRUD + bulk update endpoint for sport-club associations
 *      * Frontend: Transfer list UI for managing club-sport associations
 *      * Features: Dual-list selection, bulk assign/remove, active flag management
 *    - Groups table: Complete implementation with sport → league → season cascading filters
 *      * Database: Added sport_id and league_id foreign keys to enable filtering
 *      * Backend: Updated schema, DTOs, service with joins and validation
 *      * Frontend: Complete CRUD with cascading dropdowns (Sport → League → Season → Group)
 *      * Smart filtering: Groups filtered by season, allowing proper assignment to matches
 * 
 * 📋 PENDING TABLES TO IMPLEMENT (One at a time):
 *    - Match_events table (Phase 2 - Future implementation)
 *    - Matches table (currently implementing - backend + frontend)
 * 
 * WORKFLOW FOR EACH TABLE:
 * 1. User specifies required changes/updates for the table
 * 2. Apply changes to backend (schema, DTOs, service, migration if needed)
 * 3. Apply changes to frontend (types, API, admin panel, validation)
 * 4. User analyzes and tests the implementation
 * 5. User requests individual adjustments/refinements
 * 6. Once table is complete, move to next table
 * 
 * STATUS: ✅ Sports, Leagues, Seasons, Season_clubs, Sport_clubs, Groups complete and tested
 * NEXT: Implementing Matches table (backend + frontend)
 */

// ============================================================================
// 3. DATABASE SCHEMA STRUCTURE
// ============================================================================
/*
 * COMPLETED TABLES (18 total):
 * 
 * BASE ENTITIES:
 * ✅ sports - Core sport rules (Basketball, Ice Hockey, Football, etc.)
 * ✅ countries - Country information with continent and flags
 * ✅ cities - Cities with country relationships
 * ✅ stadiums - Stadium/Gymnasium with capacity and type
 * ✅ clubs - Clubs with foundation year and country
 * ✅ club_stadiums - Temporal relationship (club can change stadiums)
 * 
 * LEAGUE STRUCTURE:
 * ✅ leagues - Main league configuration (comprehensive fields)
 * ✅ league_divisions - Sub-leagues/Conferences (e.g., NHL East/West)
 * ✅ league_links - External links for leagues
 * ✅ seasons - Seasons for leagues
 * ⏳ phases - Tournament phases (Regular Season, Playoffs, etc.) - REMOVED FROM MVP SCOPE
 * ✅ rounds - Specific rounds within phases (Rodadas)
 * ✅ groups - Tournament groups/keys
 * ✅ group_clubs - Many-to-many for groups and clubs
 * 
 * MATCH & SCORING:
 * ✅ matches - Individual matches with full configuration
 * ✅ match_divisions - Partial scores (periods, quarters, sets)
 * ⏳ match_events - Events during matches (placeholder for Phase 2)
 * 
 * STANDINGS:
 * ✅ standings - Historical standings by round with sport-specific columns
 * 
 * AUTHENTICATION:
 * ✅ users - User credentials and roles (Added Phase 6)
 */

// ============================================================================
// 4. DATA TRANSFER OBJECTS (DTOs) - COMPLETED
// ============================================================================
/*
 * All DTOs created with proper validation:
 * 
 * ✅ SportDto - Create, Update, Response DTOs
 * ✅ CountryDto - Create, Update, Response DTOs
 * ✅ CityDto - Create, Update, Response DTOs
 * ✅ StadiumDto - Create, Update, Response DTOs
 * ✅ ClubDto - Create, Update, Response DTOs
 * ✅ ClubStadiumDto - Create, Update, Response DTOs
 * ✅ LeagueDto - Create, Update, Response DTOs
 * ✅ LeagueDivisionDto - Create, Update, Response DTOs
 * ✅ LeagueLinkDto - Create, Update, Response DTOs
 * ✅ SeasonDto - Create, Update, Response DTOs
 * ⏳ PhaseDto - Create, Update, Response DTOs - REMOVED FROM MVP SCOPE
 * ✅ RoundDto - Create, Update, Response DTOs
 * ✅ GroupDto - Create, Update, Response DTOs
 * ✅ GroupClubDto - Association DTO
 * ✅ MatchDto - Create, Update, Response DTOs + UpdateMatchScoreDto
 * ✅ MatchDivisionDto - Create, Update, Response DTOs
 * ✅ StandingDto - Create, Update, Response DTOs
 * ✅ UserDto - Create, Update, Response DTOs
 * ✅ AuthDto - Login, Response DTOs
 * 
 * All DTOs support:
 * - class-validator decorators for input validation
 * - @nestjs/mapped-types for automatic PartialType generation
 * - class-transformer for type transformation
 * - Proper enum validation for specific fields
 */

// ============================================================================
// 5. SEED DATA - COMPLETED
// ============================================================================
/*
 * SEEDED DATA:
 * ✅ 21 Countries with flags and continents
 * ✅ 6 MVP Sports configurations:
 *    1. Basketball - 4 quarters × 12 min, points, overtime allowed
 *    2. Ice Hockey - 3 periods × 20 min, goals, overtime + penalties
 *    3. Football - 2 halves × 45 min, goals, overtime + penalties
 *    4. Handball - 2 halves × 30 min, goals, overtime allowed
 *    5. Futsal - 2 halves × 20 min, goals, overtime + penalties
 *    6. Volleyball - Up to 5 sets, points, no overtime/penalties
 * 
 * ✅ 21 Sample Cities across multiple countries
 * ✅ 11 Sample Stadiums/Gymnasiums
 * ✅ 12 Sample Clubs (Basketball, Ice Hockey, Football)
 * ✅ 6 Sample Leagues with full MVP configuration
 * 
 * STATUS: Ready to seed database with 'npm run seed'
 */

// ============================================================================
// 6. SERVICES IMPLEMENTATION - COMPLETED (MVP)
// ============================================================================
/*
 * All core services for the MVP have been implemented:
 * ✅ sports.service.ts
 * ✅ countries.service.ts
 * ✅ cities.service.ts
 * ✅ stadiums.service.ts
 * ✅ clubs.service.ts
 * ✅ leagues.service.ts
 * ✅ seasons.service.ts
 * ⏳ phases.service.ts - REMOVED FROM MVP SCOPE
 * ✅ rounds.service.ts
 * ✅ groups.service.ts
 * ⏳ matches.service.ts - Currently implementing
 * ⏳ match-divisions.service.ts - Currently implementing
 * ✅ standings.service.ts
 */

// ============================================================================
// 7. STANDINGS CALCULATION LOGIC - COMPLETED
// ============================================================================
/*
 * ✅ A `StandingsCalculatorService` has been created to encapsulate sport-specific rules.
 * ✅ The service is integrated with `MatchesService`. When a match score is updated, it automatically triggers a standings update for both teams involved.
 * ✅ The logic correctly handles different point systems for Football, Basketball, Ice Hockey, and Volleyball as per the original specification.
 */

// ============================================================================
// 8. CONTROLLERS IMPLEMENTATION - COMPLETED (MVP)
// ============================================================================
/*
 * ✅ Controllers for all core entities have been implemented, providing standard CRUD endpoints.
 * ✅ DTO validation has been globally enabled via `ValidationPipe` in `main.ts`.
 */

// ============================================================================
// 9. API ENDPOINTS & DOCUMENTATION
// ============================================================================
/*
 * ✅ Swagger (OpenAPI) documentation is now set up.
 * ✅ Interactive API browser available at http://localhost:3000/api
 * ✅ All modules documented: Sports, Clubs, Leagues, Matches, Countries, Stadiums, Cities, Groups, Standings, MatchDivisions, MatchEvents
 * NEXT STEPS:
 * ✅ Authentication & Authorization (Phase 6) - Implemented (JWT + Roles)

// ============================================================================
// 10. DEPLOYMENT & TESTING
// ============================================================================
/*
 * DOCKER SETUP:
 * - PostgreSQL container (port 5433)
 * - Backend NestJS app (port 3000)
 * - Drizzle Studio (port 5555)
 * 
 * COMMANDS:
 * - npm run start:dev - Start development server
 * - npm run migration:generate - Generate migrations
 * - npm run migration:push - Apply migrations to DB
 * - npm run db:studio - Open Drizzle Studio
 * - npm run seed - Seed database with initial data
 * 
 * NEXT: Create installation guide for Windows 11
 */

// ============================================================================
// 11. PROJECT TIMELINE
// ============================================================================
/*
 * MVP PHASE 1A - BACKEND (COMPLETED):
 * ✅ Schema design, DTOs, and seed data preparation
 * ✅ Service layer implementation for all entities
 * ✅ Controller layer and basic API endpoints
 * ✅ Complex business logic (standings calculation)
 * ✅ API Documentation (Swagger) and Validation
 * ✅ Authentication & Authorization (JWT + Roles)
 * ✅ Pagination, Filtering, Rate Limiting
 * ✅ Winston Logging and Response Interceptors
 * 
 * MVP PHASE 1B - FRONTEND (IN PROGRESS):
 * □ Phase 1B-a: Admin data entry system
 * □ Phase 1B-b: User league viewing system
 * 
 * POST-MVP PHASES (FUTURE):
 * □ Phase 2: Players, Teams, Player Statistics
 * □ Phase 3: Individual Sports, Tournaments, Advanced Features
 */

// ============================================================================
// 12. PENDING ARCHITECTURAL WORK
// ============================================================================
/*
 * This list tracks non-functional and architectural improvements for the backend.
 * 
 * ✅ Authentication & Authorization (JWT, role-based access control)
 * ✅ Pagination (for list endpoints)
 * ✅ Request/Response Interceptors (standardized response formatting)
 * ✅ Advanced Filtering (Sort, complex filter, and search capabilities)
 * ✅ Rate Limiting (@nestjs/throttler@^5.1.2)
 * ✅ Logging (Winston structured logging)
 * ✅ Integration Tests (jest, supertest, @types/jest configured)
 * ✅ Clean Build (All compilation errors fixed)
 * ✅ API Versioning (/v1/ prefix enabled globally)
 * ✅ Full Swagger Documentation (@ApiTags, @ApiOperation, @ApiResponse on all controllers)
 * 
 * LATEST UPDATE (Jan 21, 2026 - PART 2):
 * 
 * 1. Fixed Throttler Installation
 *    - Corrected version from 6.5.0 (non-existent) to 5.1.2 (stable)
 *    - Fixed import path from 'nestjs-throttler' to '@nestjs/throttler'
 *    - Installed: Winston, nest-winston, Jest, Supertest, @types/jest
 * 
 * 2. Fixed Compilation Errors (26 errors → 0 errors)
 *    - Removed/simplified seasonClubs table references (table doesn't exist yet)
 *    - Fixed groups service: removed roundId field references
 *    - Fixed leagues service: simplified league-link management
 *    - Fixed match-events service: aligned with actual schema fields
 *    - Fixed match-divisions service: removed non-existent divisionId references
 *    - Fixed matches service: converted date strings to Date objects
 *    - Fixed standings service: proper field mapping for inserts
 *    - Fixed season-clubs service: marked as Phase 2 implementation
 *    - Removed enum validations from DTOs (accepting strings instead)
 *    - Moved e2e test file out of src directory
 *    - Fixed main.ts: changed app.log() to console.log()
 * 
 * 3. API Versioning & Swagger Documentation (Jan 21, 2026 - PART 3)
 *    ✅ Implemented URI-based versioning with /v1/ prefix
 *    ✅ All 18 controllers now serve endpoints at /v1/* paths
 *    ✅ Added @ApiTags, @ApiOperation, @ApiResponse to all controllers
 *    ✅ Added @ApiProperty decorators to all DTO fields
 *    ✅ Swagger UI fully functional at /api
 *    ✅ SeasonClubs service fully implemented for Phase 1 MVP
 *       - Added seasonClubs table to database schema
 *       - Generated migration (0009_new_speed.sql)
 *       - Full CRUD operations with all necessary methods
 *       - Query methods: findBySeason(), findByClub(), isClubActiveInSeason()
 *       - Comprehensive error handling and validation
 * 
 * 4. Build Status
 *    ✅ Project builds successfully with NO compilation errors
 *    ✅ All dependencies properly installed and configured
 *    ✅ Ready for integration testing and development
 * 
 * FINAL STATUS (Jan 21, 2026 - COMPLETION):
 * ✅ Database migrations pushed to PostgreSQL
 * ✅ All schema tables created and indexed
 * ✅ Phase 1 Backend MVP 100% COMPLETE
 * 
 * ============================================================================
 * MVP PHASE 1A - BACKEND - FINAL DELIVERABLES
 * ============================================================================
 * 
 * ✅ 19 Database tables with all relationships
 * ✅ 18 REST API controllers (all endpoints at /v1/)
 * ✅ 18 Business logic services
 * ✅ Complete DTOs with validation
 * ✅ Sport-specific standings calculation
 * ✅ SeasonClubs management (core business logic)
 * ✅ JWT Authentication & Role-Based Access Control
 * ✅ Rate limiting, pagination, filtering
 * ✅ Full Swagger/OpenAPI documentation
 * ✅ Winston structured logging
 * ✅ Input validation via ValidationPipe
 * ✅ Standardized response interceptors
 * ✅ Zero compilation errors
 * ✅ Database migrations applied
 * 
 * MVP PHASE 1A STATUS: 🎉 PRODUCTION READY
 */

// ============================================================================
// 13. MVP PHASE 1B - FRONTEND - USER PROFILES & ACCESS CONTROL
// ============================================================================
/*
 * USER PROFILE SYSTEM (Updated Jan 23, 2026):
 * 
 * The application has TWO DISTINCT USER PROFILES with different access levels
 * and a sophisticated permission management system.
 * 
 * ============================================================================
 * USER PROFILE 1: ADMIN
 * ============================================================================
 * 
 * Primary Responsibilities:
 * 1. Enter data for ALL tables in the system
 * 2. Manage user accounts and permissions
 * 3. Control access to menu items and functionalities
 * 
 * Access Level: FULL ACCESS to all menu items and functionalities
 * 
 * Admin CRUD Operations (Complete Data Management):
 * 
 * 1. Sports Management
 *    - Create, update, delete sports
 *    - Configure divisions and rules for each sport
 *    - Set scoring system and competition formats
 * 
 * 2. Geographic Data
 *    - Countries: Create, update, delete
 *    - Cities: Create, update, delete (linked to countries)
 *    - Stadiums/Gymnasiums: Create, update, delete (linked to cities)
 * 
 * 3. Clubs Management
 *    - Create, update, delete clubs
 *    - Manage club stadiums (with temporal tracking for historical records)
 *    - Set country and city associations
 * 
 * 4. Leagues Management
 *    - Create, update, delete leagues
 *    - Configure divisions and conferences
 *    - Create sub-leagues as needed
 *    - Manage external league links
 * 
 * 5. Seasons & Tournament Structure
 *    - Create seasons for existing leagues
 *    - Define phases within seasons (Regular Season, Playoffs, etc.) - REMOVED FROM MVP
 *    - Create rounds within phases
 *    - Configure groups/keys for group-stage competitions
 *    - Assign clubs to seasons (via seasonClubs table)
 *    - Associate clubs with specific groups
 * 
 * 6. Match Entry & Scoring (CRITICAL SCREEN 1)
 *    - Navigate: League → Season → Round → Match
 *    - Enter match details (teams, stadium, date/time)
 *    - Enter match scores with SPORT-SPECIFIC DIVISIONS:
 *      * Basketball: 4 quarters
 *      * Ice Hockey: 3 periods + optional overtime/shootout
 *      * Football: 2 & Permission Control (CRITICAL)
 *    - Create, update, delete user accounts
 *    - Assign user profiles (Admin, Final User)
 *    - Manage user credentials (email, password)
 *    - PERMISSION MANAGEMENT SYSTEM:
 *      * Control which menu items are accessible to Final User profile (global)
 *      * Control which menu items are accessible to individual Final Users (specific)
 *      * Grant/revoke access to specific features per user
 *      * Examples:
 *        - Enable/disable standings view for all Final Users
 *        - Enable/disable statistics for specific Final User
 *        - Enable/disable reports for Final User profile
 * 
 * Admin Dashboard Layout:
 * - Side navigation menu for all management sections
 * - Form-based CRUD for each entity type
 * - User management screen with permission controlsnts
 *    - Assign roles (admin, user)
 *    - Manage user credentials
 * USER PROFILE 2: FINAL USER
 * ============================================================================
 * 
 * Primary Responsibility: View and follow league data (visualization only)
 * Access Level: READ-ONLY (zero data entry capability)
 * 
 * Access Control:
 * - Menu item access controlled by Admin (profile-level)
 * - IMain Screen (CRITICAL - PRIMARY VIEW)
 *    - Combined view of:
 *      * Current standings table (sport-specific layout)
 *      * Round games list (matches with scores/schedules)
 *    - Single integrated dashboard
 *    - Quick access to league information
 *    - Real-time score updates (for live matches)
 * 
 * 2. League Browsing
 *    - View all available leagues
 *    - Filter by sport, country, or status
 *    - Select league to view details
 * 
 * 3. League Overview
 *    - View league information and current season
 *    - Access league configuration and rules
 *    - View external resources/links
 * 
 * 4. Standings View (CRITICAL SCREENntry capability)
 * 
 * User View Operations:
 * 
 * 1. League Browsing
 *    - View all available leagues
 *    - Filter by sport, country, or status
 *    - Select league to view details
 * 
 * 5. Rounds View
 *    - View PAST rounds (completed matches with scores)
 *    - View CURRENT round (ongoing matches with live updates)
 *    - View FUTURE rounds (scheduled matches)
 *    - List all matches in each round with teams and times
 * 
 * 6. Match Details
 *    - View full match information
 *    - See score breakdown by divisions/periods/quarters/halves/sets
 *    - Access match events (if implemented in Phase 2/3)
 * 
 * 7. Statistics View (To be developed)
 *    - Team performance statistics
 *    - League-wide statistics
 *    - Historical comparisons
 *    - Trends and analytics
 *    - Access controlled by Admin permissions
 * 
 * 8. Reports & Consults (To be developed)
 *    - Custom reports generation
 *    - Data queries and exports
 *    - Historical data analysis
 *    - Access controlled by Admin permissions
 * 
 * NOTE: Statistics and Reports are separate from the Main Screen visualizationGA | GD | Pts
 * 
 * Final User Dashboard Layout:
 * - Top navigation bar for league selection
 * - Dynamic menu based on Admin-granted permissions
 * - Main Screen as primary landing page
 * - Clean, read-only interface
 * - Easy navigation between allowed sections
 * - Sport-specific table layouts
 * - No buttons for creating/editing data
 * - Menu items hidden if access not granted by Admin
 *    Volleyball:
 *    Pos | Team | MP | W | L | Sets Won | Sets Lost | Pts
 * 
 * 4. Rounds Viewprofiles)
 * - Admin dashboard and sidebar navigation
 * - Basic CRUD screens for: Sports, Countries, Cities, Stadiums, Clubs
 * - Leagues and Seasons management screens
 * - Tournament Structure: Phases, Rounds, Groups, GroupClubs
 * - SCREEN 1: Match Entry with sport-specific divisions
 * - User management screen with permission controls:
 *   * User CRUD (create, edit, delete users)
 *   * Profile Final User Viewing System (Priority 2)
 * - Final User dashboard with dynamic navigation
 * - Permission-based menu rendering
 * - MAIN SCREEN: Combined standings table + round games list
 * - League browsing and selection
 * - Standings view (sport-specific tables)
 * - Rounds and matches viewing
 * - Match details display
 * - Statistics module (to be developed)
 * - Reports & Consults module (to be developed)if implemented in Phase 3)
 * 
 * 6. Statistics View (PHASE 2 - NOT MVP)
 *    - Team statistics and trends
 *    - Player statistics (if players added)
 *    - Head-to-head comparisons
 *    - Historical performance analysis
 * 
 * User Dashboard Layout:
 * - Top navigation bar for league selection
 * - Clean, read-only interface
 * - Easy navigation between standings, rounds, matches
 * - Sport-specific table layouts
 * - No buttons for creating/editing data
 * 
 * ============================================================================
 * MVP PHASE 1B IMPLEMENTATION TIMELINE
 * ============================================================================
 * 
 * Phase 1B-a: Admin Data Entry System (Priority 1)
 * - Authentication module (login for both roles)
 * - Admin dashboard and sidebar navigation
 * - Basic CRUD screens for: Sports, Countries, Cities, Stadiums, Clubs
 * - Leagues and Seasons management screens
 * - Tournament Structure: Rounds, Groups, GroupClubs (removed Phases from MVP)
 * - SCREEN 1: Match Entry with sport-specific divisions
 * - User management screen
 * 
 * Phase 1B-b: User League Viewing System (Priority 2)
 * - User dashboard and navigation
 * - League browsing and selection
 * - SCREEN 2: Standings view (sport-specific tables)
 * - Rounds and matches viewing
 * - Match details display
 * - Basic statistics display
 * 
 * PHASE 2: Players, Teams & Statistics (Future - Post-MVP)
 * - Player management and profiles
 * - Team compositions
 * - Comprehensive statistics dashboard
 * - Advanced filtering and search
 * 
 * PHASE 3: Individual Sports & Advanced Features (Future - Post-MVP)
 * - Individual sports support (Tennis, Athletics, etc.)
 * - ToMVP PHASE 1B - FRONTEND TECHNOLOGY STACK
 * - Predictions and trends
 * - Betting integration
 */

// ============================================================================
// 14. PHASE 2 FRONTEND - TECHNOLOGY STACK PROPOSAL
// ============================================================================
/*
 * PROPOSED FRONTEND TECH STACK:
 * 
 * Framework & Build:
 * - Next.js 14+ (React metaframework with routing, SSR, API routes)
 * - TypeScript (for type safety matching backend)
 * - Vite (fast build tool alternative or NextJS default)
 * 
 * Styling & UI Components:
 * - Tailwind CSS (utility-first, responsive, modern)
 * - shadcn/ui (built on Radix UI + Tailwind, professional components)
 * - Or Material-UI (if more enterprise-style preferred)
 * 
 * State Management & Data Fetching:
 * - TanStack Query/React Query (server state management, caching, sync)
 * - Zustand (lightweight client state - roles, UI state)
 * - Or Redux Toolkit (if complex state needed)
 * 
 * Form Handling & Validation:
 * - React Hook Form (lightweight, performant forms)
 * - Zod or Yup (schema validation matching backend validation)
 * 
 * HTTP Client:
 * - Axios or Fetch API (with custom wrapper)
 * - Auto-generated SDK from OpenAPI/Swagger (optional, uses backend spec)
 * 
 * ARCHITECTURE - SINGLE APP, ROLE-BASED VIEWS:
 * - Single Next.js application (monolithic, simpler deployment)
 * - Middleware for authentication and role-based access control
 * - Shared component library (UI used by both roles)
 * - Admin-specific components (data entry forms)
 * - User-specific components (view-only dashboards)
 * - Sport-specific components (different match forms/standing tables per sport)
 * - API service layer (abstraction over HTTP calls)
 * 
 * PROJECT STRUCTURE:
 * championships-frontend/
 * ├── app/
 * │   ├── (auth)/
 * │   │   ├── login/                 # Login for both admin and user roles
 * │   │   └── register/              # User registration (if allowed)
 * │   │
 * │   ├── (admin)/                   # Admin-only routes (protected by middleware)
 * │   │   ├── dashboard/             # Admin main dashboard with menu
 * │   │   ├── sports/                # Sports CRUD
 * │   │   │   ├── page.tsx           # List view
 * │   │   │   ├── [id]/page.tsx      # Detail/edit view
 * │   │   │   └── new/page.tsx       # Create form
 * │   │   ├── countries/             # Countries CRUD
 * │   │   ├── cities/                # Cities CRUD
 * │   │   ├── stadiums/              # Stadiums CRUD
 * │   │   ├── clubs/                 # Clubs CRUD
 * │   │   ├── club-stadiums/         # Club-Stadium temporal relationships
 * │   │   ├── leagues/               # Leagues CRUD
 * │   │   ├── seasons/               # Seasons CRUD
 * │   │   ├── season-clubs/          # Associate clubs to seasons
 * │   │   ├── rounds/                # Rounds CRUD
 * │   │   ├── groups/                # Groups CRUD
 * │   │   ├── group-clubs/           # Group membership CRUD
 * │   │   ├── matches/
 * │   │   │   ├── page.tsx           # Match list (filter by league/season/round)
 * │   │   │   ├── [id]/page.tsx      # Match detail/edit
 * │   │   │   └── new/page.tsx       # SCREEN 1: Create new match (SPORT-SPECIFIC FORM)
 * │   │   ├── match-events/          # Match events (if used)
 * │   │   ├── users/                 # User management
 * │   │   └── layout.tsx             # Admin layout with sidebar menu
 * │   │
 * │   ├── (user)/                    # User-only routes (protected by middleware)
 * │   │   ├── dashboard/             # User main dashboard
 * │   │   ├── leagues/               # Browse leagues
 * │   │   │   ├── page.tsx           # Leagues list
 * │   │   │   └── [leagueId]/
 * │   │   │       ├── page.tsx       # League overview
 * │   │   │       ├── standings/
 * │   │   │       │   ├── page.tsx   # SCREEN 2: Current standings (SPORT-SPECIFIC TABLE)
 * │   │   │       │   └── [roundId]/page.tsx # Historical standings by round
 * │   │   │       ├── rounds/
 * │   │   │       │   ├── page.tsx   # Rounds overview
 * │   │   │       │   └── [roundId]/page.tsx # Round matches and details
 * │   │   │       └── statistics/    # Statistics views (Phase 3)
 * │   │   ├── matches/
 * │   │   │   └── [matchId]/page.tsx # View match details (score by divisions)
 * │   │   └── layout.tsx             # User layout with navigation
 * │   │
 * │   └── layout.tsx                 # Root layout (authentication wrapper)
 * │
 * ├── components/
 * │   ├── shared/                    # Shared components (used by both roles)
 * │   │   ├── Header.tsx
 * │   │   ├── Navigation.tsx
 * │   │   ├── Button/
 * │   │   ├── Input/
 * │   │   ├── Modal/
 * │   │   ├── Table/
 * │   │   └── ...
 * │   │
 * │   ├── admin/                     # Admin-only components
 * │   │   ├── AdminSidebar.tsx
 * │   │   ├── DataTable.tsx          # Generic CRUD table for all entities
 * │   │   ├── EntityForm.tsx         # Generic entity form builder
 * │   │   ├── ConfirmDialog.tsx      # Delete confirmation
 * │   │   └── ...
 * │   │
 * │   ├── user/                      # User-only components
 * │   │   ├── LeagueSelector.tsx
 * │   │   ├── RoundNavigation.tsx
 * │   │   └── ...
 * │   │
 * │   └── sports/                    # Sport-specific components
 * │       ├── FootballMatch/
 * │       │   ├── FootballMatchEntryForm.tsx    # Admin: Entry form
 * │       │   └── FootballMatchView.tsx         # User: View match result
 * │       ├── BasketballMatch/
 * │       │   ├── BasketballMatchEntryForm.tsx
 * │       │   └── BasketballMatchView.tsx
 * │       ├── IceHockeyMatch/
 * │       │   ├── IceHockeyMatchEntryForm.tsx
 * │       │   └── IceHockeyMatchView.tsx
 * │       ├── VolleyballMatch/
 * │       │   ├── VolleyballMatchEntryForm.tsx
 * │       │   └── VolleyballMatchView.tsx
 * │       ├── HandballMatch/
 * │       │   ├── HandballMatchEntryForm.tsx
 * │       │   └── HandballMatchView.tsx
 * │       ├── FutsalMatch/
 * │       │   ├── FutsalMatchEntryForm.tsx
 * │       │   └── FutsalMatchView.tsx
 * │       └── standings/
 * │           ├── FootballStandingsTable.tsx
 * │           ├── BasketballStandingsTable.tsx
 * │           ├── IceHockeyStandingsTable.tsx
 * │           ├── VolleyballStandingsTable.tsx
 * │           ├── HandballStandingsTable.tsx
 * │           └── FutsalStandingsTable.tsx
 * │
 * ├── lib/
 * │   ├── api/
 * │   │   ├── client.ts              # Axios/Fetch client with base URL
 * │   │   ├── sports.ts              # Sports API calls
 * │   │   ├── countries.ts           # Countries API calls
 * │   │   ├── cities.ts
 * │   │   ├── stadiums.ts
 * │   │   ├── clubs.ts
 * │   │   ├── leagues.ts
 */