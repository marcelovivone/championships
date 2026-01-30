/**
 * FRONTEND_ARCHITECTURE.ts
 * 
 * Championship Management System - MVP Phase 1-B (Frontend) Architecture
 * 
 * Comprehensive design specification for the Next.js frontend implementation
 * covering responsive design, component structure, role-based access, and sport-specific layouts.
 * 
 * Date: January 22, 2026
 * Status: Ready for Implementation
 * Scope: MVP Phase 1-B (Frontend) + Phases 2-3 Enhancements
 */

/**
 * ============================================================================
 * SECTION 1: PROJECT OVERVIEW & ARCHITECTURE
 * ============================================================================
 */

export const FRONTEND_ARCHITECTURE = {
  project: {
    name: 'Championship Management System - Frontend',
    framework: 'Next.js 14+',
    language: 'TypeScript 5.3+',
    cssFramework: 'Tailwind CSS 3.4+',
    componentLibrary: 'shadcn/ui',
    phase: 'MVP Phase 1-B (Frontend) — complements Phase 1-A (Backend) of MVP; future Phases 2-3 expand features',
    status: 'In Planning - Ready for Implementation (MVP continuation)',
  },

  // ============================================================================
  // SECTION 2: TECHNOLOGY STACK & DEPENDENCIES
  // ============================================================================

  techStack: {
    frontend: {
      framework: 'Next.js 14.0.0+',
      language: 'TypeScript 5.3+',
      stateManagement: {
        server: 'TanStack Query (React Query)',
        client: 'Zustand 4.4+',
      },
      formHandling: {
        library: 'React Hook Form',
        validation: 'Zod',
      },
      http: 'Axios',
      styling: {
        framework: 'Tailwind CSS 3.4+',
        components: 'shadcn/ui',
      },
      dataVisualization: 'Recharts',
      utilities: {
        dateTime: 'date-fns',
        utilities: 'lodash-es',
        classNames: 'clsx',
      },
    },
    deployment: 'Vercel (Next.js native)',
    monitoring: 'Vercel Analytics',
    devTools: {
      linting: 'ESLint',
      formatting: 'Prettier',
      testing: 'Jest + React Testing Library',
      e2e: 'Playwright',
    },
  },

  // ============================================================================
  // SECTION 3: RESPONSIVE DESIGN BREAKPOINTS
  // ============================================================================

  responsiveDesign: {
    description: 'Mobile-first responsive design following Tailwind CSS breakpoints',
    
    breakpoints: {
      mobile: {
        name: 'Mobile',
        minWidth: 320,
        maxWidth: 479,
        tailwindClass: 'base (no prefix)',
        columnCount: {
          standings: 3, // Pos | Team | Pts
          matches: 2,  // Team1 | Score
        },
        layout: 'Stacked, full-width',
        features: {
          table: 'Horizontal scroll, expandable rows',
          navigation: 'Bottom tab bar',
          forms: 'Full-width inputs, stacked',
        },
      },
      tablet: {
        name: 'Tablet',
        minWidth: 480,
        maxWidth: 767,
        tailwindClass: 'sm:',
        columnCount: {
          standings: 5, // Pos | Team | MP | W | Pts
          matches: 3,  // Team1 | Score | Team2
        },
        layout: '2-column grids where applicable',
        features: {
          table: 'Hide GD column, abbreviated names',
          navigation: 'Horizontal tabs or pill buttons',
          forms: 'Multi-column inputs (2 cols)',
        },
      },
      landscape: {
        name: 'Landscape',
        minWidth: 768,
        maxWidth: 1023,
        tailwindClass: 'md:',
        columnCount: {
          standings: 7, // Pos | Team | MP | W | D | L | Pts
          matches: 4,
        },
        layout: '2-column grid, better spacing',
        features: {
          table: 'Show all columns except GD',
          navigation: 'Horizontal tabs with icons',
          forms: 'Multi-column layout (3 cols)',
        },
      },
      desktop: {
        name: 'Desktop',
        minWidth: 1024,
        maxWidth: 1279,
        tailwindClass: 'lg:',
        columnCount: {
          standings: 9, // All columns: Pos | Team | MP | W | D | L | GF | GA | GD | Pts
          matches: 6,
        },
        layout: 'Full-width with padding',
        features: {
          table: 'All columns visible, sortable',
          navigation: 'Horizontal navigation bar',
          forms: 'Multi-column layout (4 cols)',
        },
      },
      largeDesktop: {
        name: 'Large Desktop',
        minWidth: 1280,
        maxWidth: 1535,
        tailwindClass: 'xl:',
        columnCount: {
          standings: 10,
          matches: 7,
        },
        layout: 'Wide container with max-width',
        features: {
          table: 'Additional stats columns, charts',
          navigation: 'Sidebar + horizontal nav',
          forms: 'Multi-column layout (4+ cols)',
        },
      },
      extraLarge: {
        name: 'Extra Large',
        minWidth: 1536,
        maxWidth: 2000,
        tailwindClass: '2xl:',
        columnCount: {
          standings: 12,
          matches: 8,
        },
        layout: 'Max-width container (1400px)',
        features: {
          table: 'All columns + admin actions',
          navigation: 'Expanded sidebar + top nav',
          forms: 'Multi-column layout (5+ cols)',
        },
      },
    },

    principles: [
      'Mobile-first design - start with mobile, enhance for larger screens',
      'Touch-friendly targets - minimum 44x44px for interactive elements',
      'Progressive enhancement - functionality works on all devices',
      'Flexible layouts - use CSS Grid and Flexbox for responsive behavior',
      'Readable typography - font sizes scale with screen size',
      'Optimized images - use Next.js Image component with responsive srcset',
      'Hidden content - intelligently hide/show columns and features by breakpoint',
      'Horizontal scroll - tables on mobile scroll horizontally, not vertically',
    ],
  },

  // ============================================================================
  // SECTION 4: ROLE-BASED ARCHITECTURE (Two-Tier System)
  // ============================================================================

  roleBasedAccess: {
    description: 'Two distinct user roles with separate interfaces and permissions',
    
    roles: {
      admin: {
        name: 'Admin',
        description: 'Full control - Create, Read, Update, Delete',
        permissions: [
          'View all standings and matches',
          'Enter match results',
          'Add/edit teams and clubs',
          'Manage seasons and divisions',
          'View match statistics',
          'Export data',
        ],
        routes: {
          baseURL: '/admin',
          screens: [
            '/admin/dashboard',
            '/admin/matches/entry',
            '/admin/teams',
            '/admin/seasons',
            '/admin/stadiums',
            '/admin/divisions',
            '/admin/users',
          ],
        },
        navigation: 'Sidebar + top bar',
      },
      
      user: {
        name: 'User',
        description: 'View-only access - Read standings and match information',
        permissions: [
          'View standings',
          'View match results',
          'View rounds',
          'View team details',
          'View statistics',
          'No edit capabilities',
        ],
        routes: {
          baseURL: '/user',
          screens: [
            '/user/standings',
            '/user/rounds',
            '/user/matches/:id',
            '/user/teams/:id',
            '/user/statistics',
          ],
        },
        navigation: 'Bottom tabs (mobile) or horizontal tabs (desktop)',
      },
    },

    authentication: {
      system: 'JWT (JSON Web Tokens)',
      flow: [
        '1. User logs in with email/password',
        '2. Backend validates credentials, returns JWT token',
        '3. Frontend stores JWT in httpOnly cookie (secure)',
        '4. Frontend includes JWT in all API requests (Authorization header)',
        '5. Backend validates JWT, checks role/permissions',
        '6. Route guards prevent unauthorized access to role-specific pages',
      ],
      storage: 'httpOnly cookies (not localStorage)',
      guard: 'Route-level auth guard preventing unauthorized navigation',
    },

    routeGuards: {
      publicRoutes: [
        '/login',
        '/register',
        '/',
      ],
      adminRoutes: [
        '/admin/**',
      ],
      userRoutes: [
        '/user/**',
      ],
      requiresAuth: [
        '/admin/**',
        '/user/**',
      ],
    },
  },

  // ============================================================================
  // SECTION 5: PROJECT STRUCTURE
  // ============================================================================

  projectStructure: {
    description: 'Next.js app directory structure (App Router)',
    
    directories: {
      app: {
        description: 'Next.js App Router pages',
        subdirs: {
          '(auth)': {
            description: 'Authentication routes (login, register)',
            files: [
              'login/page.tsx',
              'register/page.tsx',
              'layout.tsx',
            ],
          },
          'admin': {
            description: 'Admin routes',
            subdirs: {
              'dashboard': 'Main admin dashboard',
              'matches': 'Match entry and management',
              'teams': 'Team management',
              'seasons': 'Season management',
              'stadiums': 'Stadium management',
              'divisions': 'Division management',
              'users': 'User management',
            },
          },
          'user': {
            description: 'User (viewer) routes',
            subdirs: {
              'standings': 'League standings display',
              'rounds': 'Match rounds display',
              'matches': 'Match details',
              'teams': 'Team details',
              'statistics': 'Statistics and charts',
            },
          },
          'layout.tsx': 'Root layout (wrapper, providers)',
        },
      },
      
      components: {
        description: 'Reusable React components',
        subdirs: {
          'ui': {
            description: 'shadcn/ui components + customizations',
            examples: [
              'button.tsx',
              'table.tsx',
              'card.tsx',
              'dialog.tsx',
              'input.tsx',
              'select.tsx',
              'tabs.tsx',
            ],
          },
          'common': {
            description: 'Shared components used across app',
            examples: [
              'Header.tsx',
              'Footer.tsx',
              'Navigation.tsx',
              'Sidebar.tsx',
              'Breadcrumbs.tsx',
              'LoadingSpinner.tsx',
              'ErrorBoundary.tsx',
            ],
          },
          'admin': {
            description: 'Admin-specific components',
            examples: [
              'MatchEntryForm.tsx',
              'TeamForm.tsx',
              'DivisionForm.tsx',
              'UserTable.tsx',
              'AdminDashboard.tsx',
            ],
          },
          'user': {
            description: 'User-specific components',
            examples: [
              'StandingsTable.tsx',
              'MatchCard.tsx',
              'RoundSelector.tsx',
              'TeamCard.tsx',
              'StatisticsChart.tsx',
            ],
          },
          'sports': {
            description: 'Sport-specific components',
            structure: [
              'football/StandingsTable.tsx',
              'basketball/StandingsTable.tsx',
              'ice-hockey/StandingsTable.tsx',
              'volleyball/StandingsTable.tsx',
              'handball/StandingsTable.tsx',
              'futsal/StandingsTable.tsx',
            ],
          },
        },
      },

      lib: {
        description: 'Utility functions and helpers',
        subdirs: {
          'api': 'API client setup (Axios instance)',
          'auth': 'Authentication utilities',
          'hooks': 'Custom React hooks',
          'utils': 'General utility functions',
          'constants': 'App-wide constants',
          'types': 'TypeScript type definitions',
        },
      },

      store: {
        description: 'Zustand state management',
        files: [
          'authStore.ts',
          'uiStore.ts',
          'filterStore.ts',
          'notificationStore.ts',
        ],
      },

      styles: {
        description: 'Global styles and Tailwind config',
        files: [
          'globals.css',
          'tailwind.config.ts',
          'postcss.config.js',
        ],
      },

      public: {
        description: 'Static assets (images, icons, etc)',
      },
    },
  },

  // ============================================================================
  // SECTION 6: COMPONENT ARCHITECTURE
  // ============================================================================

  components: {
    description: 'Component breakdown by type and sport',
    
    commonComponents: {
      layout: {
        Header: {
          responsibility: 'Top navigation bar with logo and user menu',
          props: ['isAdmin: boolean', 'user: User'],
          responsive: 'Logo size reduces on mobile, menu collapses to hamburger',
        },
        Sidebar: {
          responsibility: 'Left sidebar for navigation (admin only)',
          props: ['items: NavItem[]', 'active: string'],
          responsive: 'Hidden on mobile (< md:), shown on desktop',
        },
        Footer: {
          responsibility: 'Bottom footer with links and copyright',
          responsive: 'Stacked links on mobile, horizontal on desktop',
        },
        MainContent: {
          responsibility: 'Central content area wrapper',
          props: ['children: ReactNode'],
          responsive: 'Adjusts padding based on sidebar visibility',
        },
      },

      navigation: {
        TabNavigation: {
          responsibility: 'Horizontal tabs for section navigation',
          props: ['tabs: Tab[]', 'activeTab: string', 'onChange: (tab) => void'],
          responsive: 'Scrollable on mobile, all visible on desktop',
        },
        Breadcrumbs: {
          responsibility: 'Show current page hierarchy',
          props: ['items: BreadcrumbItem[]'],
          responsive: 'Collapsed on mobile, full on desktop',
        },
        BottomTabBar: {
          responsibility: 'Mobile-specific bottom navigation',
          props: ['tabs: Tab[]', 'activeTab: string'],
          responsive: 'Only visible on mobile (< md:)',
        },
      },

      tables: {
        BaseTable: {
          responsibility: 'Reusable data table with sorting/pagination',
          props: ['columns: Column[]', 'data: Row[]', 'sortable?: boolean', 'paginated?: boolean'],
          responsive: 'Horizontal scroll on mobile, full layout on desktop',
          accessibility: 'ARIA labels, keyboard navigation, screen reader support',
        },
      },

      forms: {
        Form: {
          responsibility: 'Wrapper for React Hook Form + Zod validation',
          props: ['onSubmit: (data) => void', 'children: ReactNode'],
        },
        FormField: {
          responsibility: 'Single form input with label and error display',
          props: ['label: string', 'name: string', 'type: string', 'required?: boolean'],
        },
      },

      dialogs: {
        Modal: {
          responsibility: 'Dialog/modal overlay for confirmations',
          props: ['title: string', 'content: ReactNode', 'onConfirm: () => void'],
          responsive: 'Full-screen on mobile, centered on desktop',
        },
      },
    },

    userComponents: {
      'StandingsTable': {
        responsibility: 'Display league standings with sport-specific columns',
        props: [
          'sport: Sport',
          'standing: Standing[]',
          'round?: number',
          'onTeamClick?: (team) => void',
        ],
        columns: {
          football: ['Pos', 'Team', 'MP', 'W', 'D', 'L', 'GF', 'GA', 'GD', 'Pts'],
          basketball: ['Pos', 'Team', 'GP', 'W', 'L', 'Pct', 'GB', 'Pts'],
          volleyball: ['Pos', 'Team', 'MP', 'W', 'L', 'Sets', 'Pts'],
          handball: ['Pos', 'Team', 'MP', 'W', 'L', 'GF', 'GA', 'Pts'],
          'ice-hockey': ['Pos', 'Team', 'GP', 'W', 'OTW', 'L', 'Pts'],
          futsal: ['Pos', 'Team', 'MP', 'W', 'D', 'L', 'GF', 'GA', 'Pts'],
        },
        responsive: {
          mobile: 'Show Pos|Team|Pts only, horizontal scroll for details',
          tablet: 'Hide GD/Pct columns, show main stats',
          desktop: 'All columns visible, sortable headers',
        },
      },

      'MatchCard': {
        responsibility: 'Display single match result or scheduled match',
        props: [
          'match: Match',
          'showDetails?: boolean',
          'onClick?: () => void',
        ],
        displays: [
          'Home team name and logo',
          'Away team name and logo',
          'Score by halves (football) or periods',
          'Match date and stadium',
          'Status (scheduled, live, final)',
        ],
        responsive: 'Stacked on mobile, horizontal on desktop',
      },

      'RoundSelector': {
        responsibility: 'Navigate between rounds',
        props: [
          'rounds: Round[]',
          'activeRound: Round',
          'onRoundChange: (round) => void',
        ],
        elements: ['Previous button', 'Current round display', 'Next button'],
      },

      'TeamCard': {
        responsibility: 'Display team information',
        props: ['team: Team', 'onClick?: () => void'],
        displays: ['Team logo', 'Team name', 'Record stats', 'Optional link'],
      },

      'StatisticsChart': {
        responsibility: 'Display statistics with charts (Phase 3)',
        props: ['stat: Statistic', 'type: "bar" | "line" | "pie"'],
        usesLibrary: 'Recharts',
      },
    },

    adminComponents: {
      'MatchEntryForm': {
        responsibility: 'Form for entering match results with division-specific logic',
        props: [
          'match?: Match',
          'sport: Sport',
          'onSubmit: (data) => void',
        ],
        fields: {
          all: ['homeTeam', 'awayTeam', 'date', 'stadium', 'status'],
          football: ['homeTeam', 'awayTeam', 'half1Score', 'half2Score', 'date', 'stadium'],
          basketball: ['homeTeam', 'awayTeam', 'score', 'date', 'stadium'],
          // ... sport-specific fields
        },
        validation: 'Zod schema with sport-specific rules',
        responsive: 'Single column on mobile, multi-column on desktop',
      },

      'TeamForm': {
        responsibility: 'Create/edit team information',
        props: ['team?: Team', 'sport: Sport', 'onSubmit: (data) => void'],
        fields: ['name', 'logo', 'city', 'country', 'stadium'],
      },

      'DivisionForm': {
        responsibility: 'Create/edit divisions',
        props: ['division?: Division', 'sport: Sport', 'onSubmit: (data) => void'],
        fields: ['name', 'league', 'level', 'numberOfTeams'],
      },

      'UserManagementTable': {
        responsibility: 'Admin user management interface',
        props: ['users: User[]', 'onDelete: (id) => void', 'onEdit: (user) => void'],
        actions: ['Edit role', 'Delete user', 'View activity'],
      },
    },

    sportSpecificComponents: {
      'football': {
        'GoalscorersTable': 'Show goal scorers for a match',
        'RedYellowCardsDisplay': 'Display discipline (cards)',
        'SubstitutionsDisplay': 'Show player substitutions',
      },
      'basketball': {
        'QuartersScoreboard': 'Display score by quarters',
        'PlayerStatsTable': 'Show player statistics',
      },
      'volleyball': {
        'SetsDisplay': 'Show sets won by each team',
        'PointsTable': 'Display match points',
      },
      'handball': {
        'HalvesScoreboard': 'Display score by halves',
        'GoalscorersTable': 'Show goal scorers',
      },
      'ice-hockey': {
        'PeriodsScoreboard': 'Display score by periods',
        'GoalscorersTable': 'Show goal scorers',
      },
      'futsal': {
        'HalvesScoreboard': 'Display score by halves',
        'GoalscorersTable': 'Show goal scorers',
      },
    },
  },

  // ============================================================================
  // SECTION 7: STATE MANAGEMENT STRATEGY
  // ============================================================================

  stateManagement: {
    description: 'Hybrid approach: React Query for server state, Zustand for client state',
    
    serverState: {
      library: 'TanStack Query (React Query)',
      responsibility: 'Cache, synchronize, and manage server data',
      uses: [
        'Standings data',
        'Match results',
        'Round information',
        'Team details',
        'User information',
      ],
      example: {
        hook: 'useQuery("standings", () => api.getStandings())',
        features: ['Automatic caching', 'Background refetch', 'Request deduplication'],
      },
      cacheInvalidation: 'Mutation happens → invalidate related queries → automatic refetch',
    },

    clientState: {
      library: 'Zustand',
      responsibility: 'UI state, user preferences, temporary data',
      stores: {
        authStore: {
          state: ['user', 'isAuthenticated', 'role', 'token'],
          actions: ['setUser()', 'logout()', 'updateRole()'],
        },
        uiStore: {
          state: ['sidebarOpen', 'theme', 'notifications'],
          actions: ['toggleSidebar()', 'setTheme()', 'addNotification()'],
        },
        filterStore: {
          state: ['selectedRound', 'selectedSport', 'searchTerm'],
          actions: ['setRound()', 'setSport()', 'setSearchTerm()'],
        },
      },
      persistence: 'localStorage for user preferences (theme, sidebar state)',
    },

    dataFlow: {
      fetch: [
        '1. Component mounts',
        '2. useQuery hook fetches from API',
        '3. Data cached in React Query',
        '4. Component re-renders with data',
      ],
      mutation: [
        '1. User submits form',
        '2. useMutation hook sends POST/PUT request',
        '3. API processes request, returns data',
        '4. Zustand updates client state if needed',
        '5. React Query cache invalidated for related queries',
        '6. Component re-renders with new data',
      ],
    },
  },

  // ============================================================================
  // SECTION 8: API INTEGRATION
  // ============================================================================

  apiIntegration: {
    description: 'Axios client with interceptors for authentication and error handling',
    
    setup: {
      baseURL: 'Backend API URL (from env variable)',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer {token}',
      },
      interceptors: {
        request: 'Add JWT token to all requests',
        response: 'Handle 401 (token expired), 403 (forbidden), 5xx errors',
      },
    },

    endpoints: {
      auth: {
        'POST /auth/register': 'Register new user',
        'POST /auth/login': 'Login user',
        'POST /auth/logout': 'Logout user',
        'POST /auth/refresh': 'Refresh expired token',
      },
      standings: {
        'GET /standings': 'Get current season standings',
        'GET /standings?round=5': 'Get standings for specific round',
        'GET /standings/:id': 'Get detailed standing info',
      },
      matches: {
        'GET /matches': 'Get all matches for league',
        'GET /matches?round=5': 'Get matches for round',
        'GET /matches/:id': 'Get match details',
        'POST /matches': '[Admin] Create match',
        'PUT /matches/:id': '[Admin] Update match',
        'DELETE /matches/:id': '[Admin] Delete match',
      },
      rounds: {
        'GET /rounds': 'Get all rounds for season',
        'GET /rounds/:id': 'Get round details',
        'POST /rounds': '[Admin] Create round',
      },
      teams: {
        'GET /teams': 'Get all teams',
        'GET /teams/:id': 'Get team details',
        'GET /teams/:id/matches': 'Get team matches',
        'POST /teams': '[Admin] Create team',
        'PUT /teams/:id': '[Admin] Update team',
      },
      users: {
        'GET /users': '[Admin] Get all users',
        'GET /users/:id': '[Admin] Get user details',
        'POST /users': '[Admin] Create user',
        'PUT /users/:id': '[Admin] Update user',
        'DELETE /users/:id': '[Admin] Delete user',
      },
    },

    errorHandling: [
      '400 Bad Request → Show validation error messages to user',
      '401 Unauthorized → Redirect to login',
      '403 Forbidden → Show "Access Denied" message',
      '404 Not Found → Show "Not Found" page',
      '5xx Server Error → Show "Server Error" message, log to monitoring',
    ],
  },

  // ============================================================================
  // SECTION 9: AUTHENTICATION & AUTHORIZATION FLOW
  // ============================================================================

  authenticationFlow: {
    description: 'JWT-based authentication with role-based access control',
    
    loginFlow: [
      '1. User enters email/password on login page',
      '2. Form validates input with Zod schema',
      '3. Submit POST /auth/login with credentials',
      '4. Backend validates, returns JWT token',
      '5. Frontend stores token in httpOnly cookie',
      '6. Frontend retrieves user data from token/endpoint',
      '7. Zustand authStore updated with user data',
      '8. Route guard checks authentication status',
      '9. Redirect to /admin or /user based on role',
    ],

    protectedRoutes: {
      adminRoutes: [
        '/admin/** routes protected by roleGuard(role === "admin")',
        'Non-admin users redirected to /user',
        'Unauthenticated users redirected to /login',
      ],
      userRoutes: [
        '/user/** routes protected by authGuard()',
        'Only authenticated users can access',
        'Unauthenticated users redirected to /login',
      ],
    },

    tokenManagement: {
      storage: 'httpOnly cookies (not localStorage)',
      expiration: 'JWT expiration set by backend (typically 24h)',
      refresh: 'New token obtained on 401 response via interceptor',
      logout: 'Token deleted from cookies, Zustand state cleared',
    },

    roleBasedRendering: {
      description: 'Components rendered based on user role',
      examples: [
        '<AdminNav /> only visible if role === "admin"',
        '<UserNav /> only visible if role === "user"',
        '<MatchEntryForm /> only visible to admins',
      ],
    },
  },

  // ============================================================================
  // SECTION 10: RESPONSIVE TABLE IMPLEMENTATION (KEY COMPONENT)
  // ============================================================================

  responsiveTableDesign: {
    description: 'Sport-specific standings tables with responsive behavior',
    
    footballStandingsTable: {
      columns: ['Pos', 'Team', 'MP', 'W', 'D', 'L', 'GF', 'GA', 'GD', 'Pts'],
      
      responsiveBreakdown: {
        mobile: {
          visible: ['Pos', 'Team', 'Pts'],
          hidden: ['MP', 'W', 'D', 'L', 'GF', 'GA', 'GD'],
          behavior: 'Horizontal scroll reveals hidden columns',
          row_height: '40px',
          text_size: '12px',
        },
        tablet: {
          visible: ['Pos', 'Team', 'MP', 'W', 'L', 'Pts'],
          hidden: ['D', 'GF', 'GA', 'GD'],
          behavior: 'Normal table, columns fit without scroll',
          row_height: '44px',
          text_size: '13px',
        },
        desktop: {
          visible: ['Pos', 'Team', 'MP', 'W', 'D', 'L', 'GF', 'GA', 'GD', 'Pts'],
          hidden: [],
          behavior: 'Fully visible, sortable by clicking headers',
          row_height: '48px',
          text_size: '14px',
          features: ['Hover highlight', 'Sortable columns', 'Team click → details'],
        },
      },

      implementation: {
        approach: 'CSS-based column visibility (Tailwind hidden/flex classes)',
        example: [
          '<div className="hidden md:block">{cell}</div> // Hide on mobile',
          '<div className="block md:hidden">{abbreviatedCell}</div> // Show only mobile',
        ],
        horizontalScroll: 'overflow-x-auto on mobile table wrapper',
        sticky: 'Position column sticky on mobile (Pos and Team)',
      },
    },

    otherSportsTables: {
      basketball: {
        columns: ['Pos', 'Team', 'GP', 'W', 'L', 'Pct', 'GB', 'Pts'],
        mobile: ['Pos', 'Team', 'W-L'],
      },
      volleyball: {
        columns: ['Pos', 'Team', 'MP', 'W', 'L', 'Sets', 'Pts'],
        mobile: ['Pos', 'Team', 'Pts'],
      },
      handball: {
        columns: ['Pos', 'Team', 'MP', 'W', 'L', 'GF', 'GA', 'Pts'],
        mobile: ['Pos', 'Team', 'Pts'],
      },
      'ice-hockey': {
        columns: ['Pos', 'Team', 'GP', 'W', 'OTW', 'L', 'Pts'],
        mobile: ['Pos', 'Team', 'Pts'],
      },
      futsal: {
        columns: ['Pos', 'Team', 'MP', 'W', 'D', 'L', 'Pts'],
        mobile: ['Pos', 'Team', 'Pts'],
      },
    },
  },

  // ============================================================================
  // SECTION 11: ROUTING STRUCTURE
  // ============================================================================

  routingStructure: {
    description: 'Next.js App Router directory structure',
    
    routes: {
      '/': {
        name: 'Home/Landing',
        access: 'Public',
        description: 'Landing page with league/sport selection',
        components: ['LeagueSelector', 'SportTabs'],
      },
      '/login': {
        name: 'Login',
        access: 'Public',
        description: 'User login page',
        components: ['LoginForm'],
      },
      '/register': {
        name: 'Register',
        access: 'Public',
        description: 'User registration page',
        components: ['RegisterForm'],
      },
      
      // Admin routes
      '/admin/dashboard': {
        name: 'Admin Dashboard',
        access: 'Admin only',
        description: 'Admin overview and controls',
        components: ['AdminDashboard', 'QuickStats'],
      },
      '/admin/matches/entry': {
        name: 'Match Entry',
        access: 'Admin only',
        description: 'Enter match results',
        components: ['MatchEntryForm', 'SportSelector'],
      },
      '/admin/teams': {
        name: 'Team Management',
        access: 'Admin only',
        description: 'Create/edit teams',
        components: ['TeamForm', 'TeamList'],
      },
      '/admin/seasons': {
        name: 'Season Management',
        access: 'Admin only',
        description: 'Manage seasons and divisions',
      },
      '/admin/stadiums': {
        name: 'Stadium Management',
        access: 'Admin only',
        description: 'Create/edit stadiums',
      },
      '/admin/divisions': {
        name: 'Division Management',
        access: 'Admin only',
        description: 'Manage divisions and matches',
      },
      '/admin/users': {
        name: 'User Management',
        access: 'Admin only',
        description: 'Manage system users and roles',
        components: ['UserManagementTable', 'UserForm'],
      },

      // User routes
      '/user/standings': {
        name: 'Standings',
        access: 'User (authenticated)',
        description: 'View league standings',
        components: ['StandingsTable', 'RoundSelector', 'SportTabs'],
      },
      '/user/rounds': {
        name: 'Rounds',
        access: 'User (authenticated)',
        description: 'View match rounds',
        components: ['RoundSelector', 'MatchList'],
      },
      '/user/matches/:id': {
        name: 'Match Details',
        access: 'User (authenticated)',
        description: 'View match details',
        components: ['MatchDetails', 'ScoreSummary'],
      },
      '/user/teams/:id': {
        name: 'Team Details',
        access: 'User (authenticated)',
        description: 'View team information',
        components: ['TeamProfile', 'TeamMatches'],
      },
      '/user/statistics': {
        name: 'Statistics',
        access: 'User (authenticated)',
        description: 'View statistics and trends (Phase 3)',
        components: ['StatisticsChart', 'StatFilter'],
      },
    },

    redirectRules: [
      'Unauthenticated → /login',
      'Admin accessing /user → /admin/dashboard',
      'User accessing /admin → /user/standings',
      'Expired token → /login',
    ],
  },

  // ============================================================================
  // SECTION 12: FORM HANDLING & VALIDATION
  // ============================================================================

  formHandling: {
    description: 'React Hook Form + Zod for form management and validation',
    
    approach: 'Uncontrolled components with validation',
    
    example: {
      loginForm: {
        fields: ['email', 'password'],
        validation: 'Zod schema',
        successAction: 'Navigate to /admin or /user',
        errorHandling: 'Display validation errors under each field',
      },
      matchEntryForm: {
        fields: ['homeTeam', 'awayTeam', 'date', 'stadium', 'half1Score', 'half2Score'],
        validation: 'Sport-specific Zod schema',
        success: 'Show toast notification, clear form',
        error: 'Display error message, highlight invalid fields',
      },
    },

    validationRules: {
      email: 'Valid email format',
      password: 'Min 8 chars, uppercase, lowercase, number',
      teamName: 'Required, 2-50 chars',
      score: 'Non-negative integer',
      date: 'Valid date, not in future',
    },

    serverSideValidation: 'Backend validates all inputs, frontend validation is UX enhancement',
  },

  // ============================================================================
  // SECTION 13: PERFORMANCE & OPTIMIZATION
  // ============================================================================

  performanceOptimization: {
    description: 'Strategies for fast, responsive user experience',
    
    strategies: {
      imageOptimization: 'Use Next.js Image component, responsive srcset, WebP format',
      codeSpitting: 'Automatic with Next.js, route-based code splitting',
      bundleAnalysis: 'Use webpack-bundle-analyzer to identify large packages',
      caching: 'React Query caching, browser caching headers',
      lazyLoading: 'React.lazy() for heavy components, Suspense boundaries',
      infiniteScroll: 'Implement for large tables/lists using React Query',
    },

    metrics: {
      targetLCP: '< 2.5s (Largest Contentful Paint)',
      targetFID: '< 100ms (First Input Delay)',
      targetCLS: '< 0.1 (Cumulative Layout Shift)',
      targetTTFB: '< 600ms (Time to First Byte)',
    },

    monitoring: 'Vercel Analytics for real-world performance data',
  },

  // ============================================================================
  // SECTION 14: ACCESSIBILITY & SEMANTIC HTML
  // ============================================================================

  accessibility: {
    description: 'WCAG 2.1 Level AA compliance',
    
    principles: [
      'Semantic HTML (use <button>, <table>, <form>, not <div> everywhere)',
      'ARIA labels for interactive elements',
      'Keyboard navigation (tabbing, focus rings)',
      'Screen reader support (alt text, aria-label)',
      'Sufficient color contrast (4.5:1 for text)',
      'Touch targets minimum 44x44px',
    ],

    requirements: {
      tables: 'Use <table>, <th>, <td>; ARIA role="table"',
      forms: '<label> associated with input via htmlFor',
      buttons: 'Proper <button> or role="button"; aria-label for icon buttons',
      navigation: 'nav> wrapper, aria-label for nav regions',
      images: 'alt text for all images (empty alt if decorative)',
      focus: 'Visible focus ring, logical tab order',
    },

    testing: 'Axe DevTools, WebAIM contrast checker, keyboard navigation',
  },

  // ============================================================================
  // SECTION 15: STYLING & DESIGN SYSTEM
  // ============================================================================

  designSystem: {
    description: 'Tailwind CSS + shadcn/ui components',
    
    colors: {
      primary: '#2563eb (blue)', // Brand color
      secondary: '#64748b (slate)',
      success: '#16a34a (green)',
      warning: '#ea580c (orange)',
      danger: '#dc2626 (red)',
      neutral: '#f1f5f9 to #0f172a (light to dark)',
    },

    typography: {
      fontFamily: 'System fonts (Segoe UI, -apple-system, etc)',
      headings: {
        h1: '32px, 700 weight',
        h2: '24px, 600 weight',
        h3: '20px, 600 weight',
        h4: '16px, 600 weight',
      },
      body: '14px, 400 weight',
      small: '12px, 400 weight',
    },

    spacing: 'Tailwind 4px base unit (4, 8, 12, 16, 20, 24, 32, etc)',
    borderRadius: 'Tailwind defaults (sm, base, md, lg, full)',
    shadows: 'Tailwind elevation system (sm, base, md, lg, xl)',
    transitions: 'Smooth (150ms) for interactive elements',
  },

  // ============================================================================
  // SECTION 16: TESTING STRATEGY
  // ============================================================================

  testing: {
    description: 'Multi-level testing approach',
    
    unitTests: {
      framework: 'Jest',
      library: 'React Testing Library',
      coverage: '80%+ of components and utilities',
      examples: [
        'Component rendering with various props',
        'Event handlers (click, form submit)',
        'Conditional rendering (role-based)',
        'Error state handling',
      ],
    },

    integrationTests: {
      framework: 'Playwright',
      scope: 'Full user workflows',
      scenarios: [
        'User login flow',
        'Viewing standings for different sports',
        'Admin entering match results',
        'Navigating between rounds',
      ],
    },

    e2eTests: {
      framework: 'Playwright',
      environment: 'Staging deployment',
      frequency: 'Before release',
      coverage: 'Critical user journeys',
    },

    manualTesting: {
      devices: ['iPhone 12', 'iPad', 'Desktop 1920x1080'],
      browsers: ['Chrome', 'Safari', 'Firefox', 'Edge'],
      checks: ['Responsive layout', 'Touch interaction', 'Performance', 'Accessibility'],
    },
  },

  // ============================================================================
  // SECTION 17: DEPLOYMENT & HOSTING
  // ============================================================================

  deployment: {
    platform: 'Vercel (native Next.js hosting)',
    
    environments: {
      development: {
        url: 'localhost:3000',
        backend: 'Local backend API',
      },
      staging: {
        url: 'staging.championships.vercel.app',
        backend: 'Staging API',
        purpose: 'Final testing before production',
      },
      production: {
        url: 'championships.vercel.app (custom domain)',
        backend: 'Production API',
        ssl: 'Automatic with Vercel',
      },
    },

    cicd: {
      trigger: 'Push to main branch',
      steps: [
        '1. Run linter (ESLint)',
        '2. Run type checker (TypeScript)',
        '3. Run unit tests (Jest)',
        '4. Build Next.js app',
        '5. Deploy to Vercel',
      ],
    },

    monitoring: [
      'Vercel Analytics for performance metrics',
      'Error tracking (Sentry or similar)',
      'User session replay (optional)',
      'Log aggregation (Vercel Logs)',
    ],
  },

  // ============================================================================
  // SECTION 18: IMPLEMENTATION PHASES
  // ============================================================================

  implementationPhases: {
    phase2a: {
      name: 'Phase 2a - User Views (View-Only)',
      duration: 'Weeks 1-2',
      priority: 'High',
      deliverables: [
        'Authentication system (login/logout)',
        'User dashboard/home screen',
        'Standings table (football initial)',
        'Rounds view',
        'Match details page',
        'Team details page',
        'Responsive design (mobile/tablet/desktop)',
      ],
      components: [
        'StandingsTable.tsx',
        'MatchCard.tsx',
        'RoundSelector.tsx',
        'Authentication guards',
        'User navigation',
      ],
    },

    phase2b: {
      name: 'Phase 2b - Admin Entry (Match Results)',
      duration: 'Weeks 3-4',
      priority: 'High',
      deliverables: [
        'Admin dashboard',
        'Match entry form',
        'Team/Division management',
        'User management',
        'Admin navigation',
      ],
      components: [
        'MatchEntryForm.tsx',
        'TeamForm.tsx',
        'DivisionForm.tsx',
        'AdminDashboard.tsx',
      ],
    },

    phase3: {
      name: 'Phase 3 - Additional Sports',
      duration: 'Weeks 5-6+',
      priority: 'Medium',
      deliverables: [
        'Basketball standings/entry',
        'Ice Hockey standings/entry',
        'Volleyball standings/entry',
        'Handball standings/entry',
        'Futsal standings/entry',
        'Statistics and charts',
        'Advanced filters',
      ],
    },
  },

  // ============================================================================
  // SECTION 19: ENVIRONMENT VARIABLES
  // ============================================================================

  environmentVariables: {
    description: 'Next.js environment variable configuration',
    
    required: [
      'NEXT_PUBLIC_API_BASE_URL - Backend API endpoint',
      'NEXT_PUBLIC_APP_NAME - Application name',
      'NEXT_PUBLIC_APP_URL - Frontend URL',
    ],

    optional: [
      'NEXT_PUBLIC_ANALYTICS_ID - Analytics provider ID',
      'NEXT_PUBLIC_SENTRY_DSN - Error tracking endpoint',
      'NODE_ENV - Development/production/test',
    ],

    format: '.env.local (development), .env.production (production)',
  },

  // ============================================================================
  // SECTION 20: QUICK START CHECKLIST
  // ============================================================================

  quickStartChecklist: {
    setup: [
      '[ ] Create Next.js project: npx create-next-app@latest',
      '[ ] Install dependencies: npm install',
      '[ ] Configure Tailwind CSS',
      '[ ] Install shadcn/ui components: npx shadcn-ui@latest init',
      '[ ] Set up TypeScript config',
      '[ ] Create project folder structure',
    ],

    core: [
      '[ ] Set up Axios API client',
      '[ ] Create authentication guard/middleware',
      '[ ] Create Zustand auth store',
      '[ ] Create React Query setup with hooks',
      '[ ] Create reusable UI components (Button, Input, etc)',
    ],

    pages: [
      '[ ] Create login/register pages',
      '[ ] Create admin layout and dashboard',
      '[ ] Create user layout and home',
      '[ ] Create standings table component',
      '[ ] Create match entry form',
    ],

    testing: [
      '[ ] Set up Jest configuration',
      '[ ] Set up React Testing Library',
      '[ ] Write tests for core components',
      '[ ] Set up Playwright for e2e tests',
    ],

    deployment: [
      '[ ] Create Vercel project',
      '[ ] Configure environment variables',
      '[ ] Set up CI/CD pipeline',
      '[ ] Deploy to staging',
      '[ ] Deploy to production',
    ],
  },
};

/**
 * ============================================================================
 * EXPORT
 * ============================================================================
 * 
 * This document serves as the authoritative frontend architecture specification.
 * Refer to specific sections when building components, managing state, or setting
 * up the development environment.
 * 
 * Last Updated: January 22, 2026
 * Status: Ready for Implementation
 * 
 * Questions? Refer to:
 * - FOOTBALL_MOCKUP_ANALYSIS.md for design specifications
 * - PROJECT_REVIEW.ts for Phase 2/3 context
 * - QUICK_START.md for setup instructions
 */

export default FRONTEND_ARCHITECTURE;
