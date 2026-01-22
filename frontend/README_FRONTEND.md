# Championships Frontend - Next.js 14

**Status**: Phase 2 Development - Initialized January 22, 2026  
**Framework**: Next.js 14+ with TypeScript  
**Styling**: Tailwind CSS + shadcn/ui  
**State Management**: React Query + Zustand  

---

## Project Setup

### Dependencies Installed

**Core Framework**:
- `next@14+` - React framework
- `react@18+` - UI library
- `react-dom@18+` - DOM renderer
- `typescript@5.3+` - Type safety

**Styling & Components**:
- `tailwindcss@4+` - Utility-first CSS
- `shadcn/ui` - Component library
- `class-variance-authority` - Component variants
- `clsx` - Class name utilities
- `lucide-react` - Icon library

**State Management**:
- `@tanstack/react-query` - Server state (async data)
- `zustand@4.4+` - Client state (UI state)

**Forms & Validation**:
- `react-hook-form` - Form state management
- `zod` - TypeScript-first schema validation

**HTTP Client**:
- `axios` - Promise-based HTTP requests

**Utilities**:
- `date-fns` - Date manipulation

### Folder Structure

```
frontend/
├── app/                          # Next.js App Router
│   ├── (auth)/                  # Auth routes (login, register)
│   ├── admin/                   # Admin routes
│   ├── user/                    # User (viewer) routes
│   ├── globals.css              # Global styles
│   ├── layout.tsx               # Root layout
│   └── page.tsx                 # Home page
│
├── components/                   # React components
│   ├── ui/                      # shadcn/ui components
│   ├── common/                  # Shared components (Header, Footer, etc)
│   ├── admin/                   # Admin-specific components
│   ├── user/                    # User-specific components
│   └── sports/                  # Sport-specific components
│
├── lib/                          # Utility functions
│   ├── api.ts                   # Axios instance + interceptors
│   ├── auth.ts                  # Auth utilities
│   ├── hooks.ts                 # Custom React hooks
│   ├── utils.ts                 # General utilities (from shadcn)
│   └── types.ts                 # TypeScript types
│
├── store/                        # Zustand state management
│   ├── authStore.ts             # Authentication state
│   ├── uiStore.ts               # UI state (theme, sidebar, etc)
│   └── filterStore.ts           # Filter/selection state
│
├── public/                       # Static assets
├── .gitignore                    # Git ignore rules
├── components.json               # shadcn/ui config
├── eslint.config.mjs             # ESLint rules
├── next.config.ts                # Next.js config
├── package.json                  # Dependencies
├── postcss.config.mjs             # PostCSS config
├── tailwind.config.ts             # Tailwind config
└── tsconfig.json                 # TypeScript config
```

---

## Getting Started

### 1. Install Dependencies
```bash
cd frontend
npm install
```

### 2. Start Development Server
```bash
npm run dev
```
Visit `http://localhost:3000`

### 3. Build for Production
```bash
npm run build
npm start
```

---

## Development Workflow

### Add shadcn/ui Components
```bash
npx shadcn@latest add button
npx shadcn@latest add table
npx shadcn@latest add form
```

### Key Files to Implement

#### Phase 2a - User Views (Weeks 1-2)
1. **Authentication** (`lib/api.ts`, `store/authStore.ts`)
   - Setup Axios with JWT interceptors
   - Create auth store for user state
   
2. **User Layout** (`app/user/layout.tsx`)
   - Header with logo and user menu
   - Bottom tab navigation (mobile) or side nav (desktop)
   
3. **Standings Page** (`app/user/standings/page.tsx`)
   - Sport selector tabs
   - Round selector
   - Responsive standings table (CRITICAL)
   
4. **Rounds Page** (`app/user/rounds/page.tsx`)
   - Round navigation
   - Match list with scores

#### Phase 2b - Admin Entry (Weeks 3-4)
1. **Admin Dashboard** (`app/admin/dashboard/page.tsx`)
   - Quick stats overview
   - Recent matches
   - Action buttons

2. **Match Entry Form** (`app/admin/matches/entry/page.tsx`)
   - Sport-specific form
   - Division score inputs
   - Form validation with Zod

3. **Team/Division Management** (`app/admin/teams`, `app/admin/divisions`)
   - CRUD operations
   - List tables
   - Edit/create forms

---

## Architecture Decisions

### State Management Pattern
```typescript
// Server state (React Query)
const { data: standings } = useQuery({
  queryKey: ['standings', season, round],
  queryFn: () => api.get('/standings')
});

// Client state (Zustand)
const { selectedRound, setRound } = useFilterStore();
```

### API Integration
```typescript
// In lib/api.ts
export const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_BASE_URL,
  withCredentials: true,
});

api.interceptors.request.use((config) => {
  // Add JWT token from auth store
  return config;
});
```

### Responsive Design
- Mobile-first approach
- Tailwind breakpoints: `sm`, `md`, `lg`, `xl`, `2xl`
- Responsive tables with horizontal scroll on mobile
- Column visibility: `hidden md:block lg:block`

---

## Environment Variables

Create `.env.local`:
```
NEXT_PUBLIC_API_BASE_URL=http://localhost:3001
NEXT_PUBLIC_APP_NAME=Championships
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

---

## Testing

### Unit Tests
```bash
npm run test
```

### E2E Tests
```bash
npm run test:e2e
```

---

## Deployment

### Vercel (Recommended)
```bash
vercel deploy
```

### Manual Deployment
```bash
npm run build
npm start
```

---

## Useful Commands

```bash
# Format code
npm run format

# Lint code
npm run lint

# Check types
npm run type-check

# Build project
npm run build

# Start production server
npm start

# Development server
npm run dev
```

---

## Key Documentation

Refer to these documents for detailed implementation guidance:

- **Architecture**: `../FRONTEND_ARCHITECTURE.ts` (Sections 1-20)
- **Design Specs**: `../documentation/FOOTBALL_MOCKUP_ANALYSIS.md`
- **Tech Stack**: `../FRONTEND_ARCHITECTURE.ts` (Section 2)
- **Project Structure**: `../FRONTEND_ARCHITECTURE.ts` (Section 5)
- **Components**: `../FRONTEND_ARCHITECTURE.ts` (Section 6)
- **Responsive Design**: `../FRONTEND_ARCHITECTURE.ts` (Section 10)

---

## Next Steps

1. **Create auth system** (lib/api.ts, store/authStore.ts)
2. **Build common components** (Header, Footer, Navigation)
3. **Implement user layout & standings page**
4. **Create responsive tables** (critical component)
5. **Build admin entry form** (match results)
6. **Add more sports** (Basketball, Ice Hockey, etc)

---

**Initialized**: January 22, 2026  
**Status**: Ready for development  
**Phase**: 2a - User Views

