# Football Mockup Analysis & Design Specifications

**Date**: January 22, 2026  
**Sport**: Football/Soccer  
**Mockup Size**: 1933px × 1204px (Desktop viewport)  
**User Role**: Regular User (View-Only)  
**Mockup Source**: Championship - Football.drawio.svg

---

## 1. Mockup Overview

### Viewport Dimensions
- **Original Design Width**: 1933px (desktop-sized)
- **Original Design Height**: 1204px
- **Aspect Ratio**: ~1.6:1 (wider landscape format)

### Target Device Adaptation
The mockup was designed for desktop viewing without specific scale markings. We need to adapt these dimensions to standard responsive web breakpoints:

#### Responsive Breakpoints (Adapted from Mockup)
| Breakpoint | Width | Scale Factor | Adapted Width | Adapted Height |
|-----------|-------|--------------|----------------|------------------|
| Mobile | 480px | 0.248 | 480px | 298px |
| Tablet | 768px | 0.397 | 768px | 477px |
| Desktop | 1024px | 0.529 | 1024px | 636px |
| Large Desktop | 1280px | 0.662 | 1280px | 795px |
| Extra Large | 1400px | 0.724 | 1400px | 870px |

### Design Pattern
The mockup contains:
- External link reference: `https://ge.globo.com/futebol/brasileirao-serie-a/`
- Multiple UI sections (to be visualized from SVG structure)
- Sport-specific standings table for Football
- Round navigation and match viewing features

---

## 2. Football-Specific UI Elements

### Standings Table Columns (Football)
Based on the application requirements, the Football standings table should display:

```
| Pos | Team | MP | W | D | L | GF | GA | GD | Pts |
```

**Column Definitions**:
- **Pos**: Position in standings (1-20 for most leagues)
- **Team**: Club name (clickable for details)
- **MP**: Matches Played
- **W**: Wins
- **D**: Draws
- **L**: Losses
- **GF**: Goals For (scored)
- **GA**: Goals Against (conceded)
- **GD**: Goal Difference (GF - GA)
- **Pts**: Points (W*3 + D*1)

### Responsive Table Strategy
Since Football standings have 9 columns (many on mobile), implement responsive behavior:

#### Desktop View (1024px+)
- All columns visible
- Full team names
- Hover effects for interactivity
- Sortable columns (optional)

#### Tablet View (768px)
- Hide GD column (derivable from GF/GA)
- Show abbreviated team names
- Stack info slightly

#### Mobile View (480px)
- Show only: Pos | Team | Pts
- Horizontal scroll for detailed stats
- OR: Expandable rows (tap team → see full stats)

---

## 3. Key Screens Identification

### Screen 1: Standings View (Main)
**Purpose**: Display current league standings  
**Layout**:
- Header: League name, season year, current round
- Navigation tabs: Standings | Rounds | Statistics
- Standings table (sport-specific columns)
- Team rows with interactive selection

**Key Features**:
- Filter by round (historical standings)
- Sort by different columns
- Team selection for detailed view
- Direct link to external resources (e.g., Globo Esporte)

### Screen 2: Rounds View
**Purpose**: Show past, current, and future rounds  
**Layout**:
- Round navigation (previous/next arrows)
- Current round matches list
- Match score display with division breakdown
- Match details (team names, stadium, time)

**Key Features**:
- Past rounds (completed matches with final scores)
- Current round (ongoing with live updates)
- Future rounds (scheduled matches)

### Screen 3: Match Details
**Purpose**: View full match information  
**Layout**:
- Match header (teams, date, stadium)
- Score by halves:
  - Half 1 (45 minutes)
  - Half 2 (45 minutes)
  - Total score
- Match events (if implemented Phase 3)

**Key Features**:
- Goal scorers
- Yellow/red cards
- Substitutions
- Match statistics

---

## 4. Design Specifications for Implementation

### Typography
- **Header**: 24-28px (desktop), scale down to 18px (mobile)
- **Table Headers**: 14px
- **Table Data**: 13px (desktop), 12px (mobile)
- **Labels**: 12px
- **Links**: 14px, color: brand color (clickable appearance)

### Color Palette (Football Theme)
- **Primary**: Green (#2D5016) - represents football field
- **Secondary**: White (#FFFFFF) - background
- **Accent**: Gold/Yellow (#FFD700) - for highlights
- **Text**: Dark Gray (#333333)
- **Table Stripes**: Light Gray (#F5F5F5) - alternate rows
- **Borders**: Light Gray (#DDDDDD)

### Spacing
- **Container padding**: 16px (mobile), 24px (tablet), 32px (desktop)
- **Row height**: 40px (table rows)
- **Gap between sections**: 20px (mobile), 32px (desktop)

### Interactive Elements
- **Buttons**: 44px minimum height (touch-friendly)
- **Hover state**: Background color change, subtle shadow
- **Active state**: Bold text, underline or background highlight
- **Focus state**: Visible focus ring for keyboard navigation

---

## 5. Navigation Structure

```
League View
├── Standings Tab
│   ├── Current Standings (default)
│   └── Historical Standings (by round)
├── Rounds Tab
│   ├── Past Rounds
│   ├── Current Round
│   └── Future Rounds
├── Statistics Tab (Phase 3)
│   ├── Team Stats
│   ├── Player Stats
│   └── Trends
└── Match Details
    ├── Teams
    ├── Score by Half
    ├── Match Events
    └── External Link
```

---

## 6. Implementation Checklist

### Phase 2a: Admin Match Entry (Not in this mockup)
- [ ] Match entry form with half scores
- [ ] Team selection
- [ ] Stadium selection
- [ ] Date/time input

### Phase 2b: User Viewing (This Mockup)
- [ ] Standings table component
- [ ] Responsive table layout
- [ ] Standings filtering (by round)
- [ ] Rounds view component
- [ ] Match list display
- [ ] Match details view
- [ ] Navigation between rounds
- [ ] External link integration (Globo Esporte link in mockup)

### Phase 3: Statistics (Future)
- [ ] Team statistics display
- [ ] Player statistics (if applicable)
- [ ] Historical trends
- [ ] Advanced filtering

---

## 7. Responsive Design Notes

### Mobile (480px)
- **Standings**: Show Pos | Team | Pts, horizontal scroll for details
- **Rounds**: One match per row, tap to expand
- **Navigation**: Bottom tab bar or hamburger menu

### Tablet (768px)
- **Standings**: Show main columns, hide derivable columns (GD)
- **Rounds**: Grid layout for matches (2 columns)
- **Navigation**: Horizontal tabs

### Desktop (1024px+)
- **Standings**: All columns visible, full layout
- **Rounds**: Multiple matches visible, full details
- **Navigation**: Side navigation or horizontal menu

---

## 8. API Integration Points

### Endpoints Used
- `GET /v1/standings` - Get standings for league/season/round
- `GET /v1/rounds` - Get rounds for league/season
- `GET /v1/matches` - Get matches for a round
- `GET /v1/matches/:id` - Get match details

### Data Requirements
- **Standings Data**: Team, position, MP, W, D, L, GF, GA, GD, Pts
- **Matches Data**: Home team, away team, score (by halves), date, stadium
- **Round Data**: Round number, start date, end date, status

---

## 9. Special Considerations

### Football-Specific Rules
- Matches have 2 halves (45 minutes each) + potential extra time
- Draw is possible (3 pts for win, 1 pt for draw, 0 for loss)
- Goal difference is key tiebreaker
- Some leagues have additional tiebreaker rules (head-to-head)

### Data Validation
- Ensure total score = half 1 score + half 2 score
- Validate team participation in league for season
- Check round dates are sequential

---

## 10. Next Steps

1. **Component Design**: Create reusable standings table component
2. **API Testing**: Verify Football standings endpoint returns correct data
3. **Responsive Testing**: Test layout at all breakpoints
4. **Accessibility**: Ensure tables are screen-reader friendly
5. **Performance**: Optimize large standings tables (20+ teams)

---

**Document Status**: Ready for Frontend Architecture Specification  
**Waiting For**: Basketball, Ice Hockey, Volleyball, Handball, Futsal mockups

