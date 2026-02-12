# BMHL UI/UX Requirements - Frontend Implementation Plan

**Based On:** BMHL-provided mockups (web-example1.png, web-example2.png)
**Date:** 2026-01-29
**Status:** UI Specification Complete, Ready for Implementation
**Priority:** P0 - Critical for BMHL Demo (Part of Gap Analysis)

---

## Executive Summary

BMHL provided two reference screenshots showing their **mental model** of what a modern hockey league website should look like. Our goal is to **replicate this UI exactly** as the baseline, then extend with our platform capabilities (multi-tenant, admin ops, electronic game sheets, payments).

**Key Insight:** This isn't a "design from scratch" task. BMHL already knows what they want. Our job is to match their expectations, then quietly exceed them with backend power.

---

## UI Requirements Summary

| Screen | BMHL's Baseline UI | Our Extension |
|--------|-------------------|---------------|
| **Schedule (Week View)** | Filter bar + day tabs + grouped daily games + sponsor slot | Add: Bulk reschedule, admin actions, conflict warnings |
| **Game Detail** | Head-to-head header + player comparison + season series + team/goalie stats | Add: Live scorekeeper updates, captain verification, event timeline |

---

# Part 1: Schedule Page Specification

## 1.1 Global Header + Navigation

### BMHL's Design
- League header bar: **Logo + "BMHL" text**
- Top navigation: **Scores / Info / Schedule / Standings / Stats / Contact**
- Utility icons: **Login/Logout + Search**

### Multi-Tenant Implementation
```typescript
interface TenantHeader {
  branding: {
    logoUrl: string;           // From leagues.logo_url
    shortName: string;         // "BMHL" or full league name
    primaryColor: string;      // Header background color
  };
  navigation: {
    enabledModules: Module[]; // ['scores', 'schedule', 'standings', 'stats', 'contact']
    customLinks?: CustomLink[]; // Optional additional nav items
  };
}

type Module = 'scores' | 'info' | 'schedule' | 'standings' | 'stats' | 'contact' | 'payments';
```

### Implementation Notes
- Navigation items are **feature-flag aware** (some leagues won't have stats tracking yet)
- Active page highlighted with underline or color change
- Logo links to league homepage
- Search icon opens global search modal (teams, players, games)

### Responsive Behavior
- Desktop: Full horizontal nav
- Mobile: Hamburger menu with drawer

---

## 1.2 Schedule Controls (Filter Bar)

### BMHL's Design
Four filter controls in a horizontal bar:
1. **Date Range Picker** with left/right arrows (e.g., "Jan 25–31")
2. **Season Dropdown** (e.g., "Winter 2025-26")
3. **Division Dropdown** (e.g., "All Divisions")
4. **Season Type Dropdown** (e.g., "Regular Season", "Playoffs")

### URL-Driven State
```
/schedule?seasonId={uuid}&divisionId={uuid}&type=regular&weekStart=2026-01-25
```

### API Query
```
GET /api/{tenant}/schedule
  ?seasonId=uuid
  &divisionId=uuid (optional, null = all divisions)
  &type=regular|playoffs
  &start=2026-01-25
  &end=2026-01-31
```

### Filter Behavior
- **Changing any filter** updates the game list in <300ms (with caching)
- **Week arrows** (< >) change the date range but preserve other filters
- **Filters persist** when sharing link (shareable URLs)
- **Division filter** updates day tab counts (e.g., "Mon: 6 games" → "Mon: 2 games")

### Implementation Notes
- Use query params for filter state (enables sharing)
- Debounce rapid filter changes (300ms)
- Show loading skeleton during filter changes
- Cache results per filter combination (React Query or SWR)

---

## 1.3 Day Tabs Row (Critical UX Element)

### BMHL's Design
- Horizontal row of day pills: **Mon | Tue | Wed | Thu | Fri | Sat | (Sun)**
- Each pill shows:
  - **Day name** (Mon)
  - **Date** (Jan 26)
  - **Game count** ("6 games")

### Why This Matters
- **Human scanning pattern:** Users scan the week at a glance
- **Sets up bulk actions:** "Cancel all Tuesday games due to snow"
- **Filter affordance:** Click tab to jump/filter to that day

### Implementation
```typescript
interface DayTab {
  date: string;          // "2026-01-26"
  dayName: string;       // "Monday"
  dayShort: string;      // "Mon"
  gameCount: number;     // 6
  isToday: boolean;
  hasPostponed: boolean; // Visual indicator
}

// Server computes counts
dayCounts: { '2026-01-26': 6, '2026-01-27': 3, ... }
```

### Interaction Behavior
**Option A (Single Page):** Click tab scrolls to that day section
**Option B (Filtered View):** Click tab filters to show only that day's games

**Recommendation:** Start with Option A (scroll), add Option B later as toggle

### Visual States
- **Default:** Gray text, no background
- **Has games:** Bold text, game count visible
- **Selected/Today:** Highlighted background (primary color)
- **Has postponed games:** Orange/yellow indicator dot

---

## 1.4 Sponsor Slot (Right Side Card)

### BMHL's Design
- Sponsor tile visible on right side of filter strip
- Example: "Skate Zone" logo (300x250 or similar)
- Clean card design with subtle border

### Multi-Tenant Data Model
```typescript
interface SponsorPlacement {
  id: string;
  leagueId: string;
  pageType: 'schedule' | 'standings' | 'stats' | 'game_detail';
  slot: 'header' | 'sidebar' | 'footer';
  sponsor: {
    name: string;
    logoUrl: string;
    linkUrl: string;
    altText: string;
  };
  displayOrder: number;
  isActive: boolean;
}
```

### Database Table
```sql
CREATE TABLE sponsor_placements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  league_id UUID NOT NULL REFERENCES leagues(id) ON DELETE CASCADE,
  sponsor_id UUID REFERENCES league_sponsors(id), -- Optional: link to sponsor record

  page_type TEXT NOT NULL, -- schedule, standings, stats, game_detail
  slot TEXT NOT NULL,      -- header, sidebar, footer

  name TEXT NOT NULL,
  logo_url TEXT NOT NULL,
  link_url TEXT,
  alt_text TEXT,

  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,

  created_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT valid_page_type CHECK (page_type IN ('schedule', 'standings', 'stats', 'game_detail')),
  CONSTRAINT valid_slot CHECK (slot IN ('header', 'sidebar', 'footer'))
);
```

### Implementation Notes
- Render conditionally (only if placement exists for this page)
- Opens link in new tab (`target="_blank" rel="noopener noreferrer"`)
- Graceful fallback if image fails to load
- Admin can manage placements via settings page

---

## 1.5 Daily Group Block

### BMHL's Design
- Section header: **"Monday, January 26th, 2026"**
- Table with columns:
  - **Match Up** (team logos + names + ranks)
  - **Time** (e.g., "7:00 PM")
  - **Rink** (venue name)
  - **Division** (e.g., "B", "C1")
  - **Details** (action icons)

### Implementation Structure
```typescript
interface DayGroup {
  date: string;              // "2026-01-26"
  displayDate: string;       // "Monday, January 26th, 2026"
  games: GameRow[];
}

interface GameRow {
  id: string;
  homeTeam: TeamSummary;
  awayTeam: TeamSummary;
  scheduledAt: string;       // ISO timestamp
  displayTime: string;       // "7:00 PM"
  venue: VenueSummary;
  division: DivisionSummary;
  status: GameStatus;        // scheduled, postponed, in_progress, completed, cancelled
  actions: GameAction[];     // Role-based action icons
}

interface TeamSummary {
  id: string;
  name: string;
  logoUrl: string;
  rank?: number;             // Optional: standings rank (e.g., 3)
  record?: string;           // Optional: "5-2-1"
}
```

### Rendering Pattern
```jsx
<section key={day.date} id={`day-${day.date}`}>
  <h2>{day.displayDate}</h2>
  <table>
    <thead>
      <tr>
        <th>Match Up</th>
        <th>Time</th>
        <th>Rink</th>
        <th>Division</th>
        <th>Details</th>
      </tr>
    </thead>
    <tbody>
      {day.games.map(game => <GameRow key={game.id} game={game} />)}
    </tbody>
  </table>
</section>
```

### Design Notes
- **Avoid one mega-table** across all days (poor performance, bad UX)
- Each day is a separate `<section>` with its own table
- Enables smooth scrolling and day-specific actions

---

## 1.6 Game Row (Critical Component)

### BMHL's Design - Match Up Column
```
[Home Logo] Home Team Name (3)  @  Away Team Name (5) [Away Logo]
```
- Team logos are small (24x24 or 32x32)
- Team names are links (clickable to team page)
- Rankings shown in parentheses: `(3)` means 3rd place in division
- `@` symbol separates teams

### Division Display
- Short code shown: **B**, **C1**, **A**
- Color-coded badge (optional)

### Details Column - Action Icons
BMHL shows two icons:
1. **Eye icon** (👁️) - View game details
2. **Sheet/doc icon** (📄) - Game sheet / Admin actions

### Role-Based Actions
```typescript
interface GameAction {
  icon: IconType;
  label: string;
  href?: string;
  onClick?: () => void;
  roles: Role[];  // Who can see this action
}

// Role-based visibility:
type Role = 'public' | 'player' | 'captain' | 'scorekeeper' | 'admin';

const gameActions: GameAction[] = [
  {
    icon: EyeIcon,
    label: 'View Game',
    href: `/games/${gameId}`,
    roles: ['public', 'player', 'captain', 'scorekeeper', 'admin']
  },
  {
    icon: ClipboardIcon,
    label: 'Enter Stats',
    href: `/scorekeeper/games/${gameId}`,
    roles: ['scorekeeper', 'admin']
  },
  {
    icon: PencilIcon,
    label: 'Edit Game',
    onClick: () => openEditModal(gameId),
    roles: ['admin']
  },
  {
    icon: CalendarIcon,
    label: 'Reschedule',
    onClick: () => openRescheduleModal(gameId),
    roles: ['admin']
  },
  {
    icon: XIcon,
    label: 'Cancel Game',
    onClick: () => openCancelModal(gameId),
    roles: ['admin']
  }
];
```

### Status Visual Indicators
```typescript
type GameStatus = 'scheduled' | 'postponed' | 'in_progress' | 'completed' | 'cancelled';

const statusBadges = {
  scheduled: { color: 'gray', label: null },        // No badge (default)
  postponed: { color: 'orange', label: 'POSTPONED' },
  in_progress: { color: 'green', label: 'LIVE' },
  completed: { color: 'blue', label: 'FINAL' },
  cancelled: { color: 'red', label: 'CANCELLED' }
};
```

### Implementation Notes
- **Team logos:** Lazy load with placeholder (optimize performance)
- **Rankings:** Only show if `division.displayRankings = true` (tenant config)
- **Link behavior:** Team names link to team detail page
- **Mobile:** Collapse table to card layout (stacked vertically)

---

# Part 2: Game Detail Page Specification

## 2.1 Matchup Header Bar

### BMHL's Design
```
┌─────────────────────────────────────────────────────────┐
│  [Logo]                                       [Logo]     │
│   HOME TEAM            vs.           AWAY TEAM          │
│    5-2-1                                  3-4-2          │
│                                                          │
│         Monday, January 26, 2026 • 7:00 PM              │
│              Skate Zone Arena                            │
└─────────────────────────────────────────────────────────┘
```

### Components
- **Team blocks (left + right):**
  - Large team logo (64x64 or 80x80)
  - Team name (bold, large font)
  - Record (W-L-OTL or W-L-T format)
- **Center block:**
  - Date and time
  - Venue name
  - Optional: Division badge
- **Background:** Gradient or solid color using team colors

### Data Requirements
```typescript
interface MatchupHeader {
  homeTeam: {
    id: string;
    name: string;
    logoUrl: string;
    record: TeamRecord;
    primaryColor?: string;
  };
  awayTeam: {
    id: string;
    name: string;
    logoUrl: string;
    record: TeamRecord;
    primaryColor?: string;
  };
  game: {
    scheduledAt: string;
    displayDate: string;    // "Monday, January 26, 2026"
    displayTime: string;    // "7:00 PM"
    venue: VenueSummary;
    division: DivisionSummary;
    status: GameStatus;
  };
}

interface TeamRecord {
  wins: number;
  losses: number;
  otLosses?: number;        // Optional: OT losses (hockey)
  ties?: number;            // Optional: Ties (older leagues)
  displayFormat: 'W-L-OT' | 'W-L-T' | 'W-L';
}
```

### Record Computation
```sql
-- Compute team record for season
SELECT
  COUNT(*) FILTER (WHERE
    (home_team_id = $teamId AND home_score > away_score) OR
    (away_team_id = $teamId AND away_score > home_score)
  ) as wins,
  COUNT(*) FILTER (WHERE
    (home_team_id = $teamId AND home_score < away_score) OR
    (away_team_id = $teamId AND away_score < home_score)
  ) as losses,
  COUNT(*) FILTER (WHERE
    (home_team_id = $teamId OR away_team_id = $teamId) AND
    status = 'completed' AND
    home_score = away_score
  ) as ties
FROM games
WHERE
  (home_team_id = $teamId OR away_team_id = $teamId)
  AND season_id = $seasonId
  AND status = 'completed';
```

### Design Notes
- **Team colors:** Use `teamA.primaryColor` and `teamB.primaryColor` for gradient background
- **Fallback colors:** If team colors not set, use league brand colors
- **Responsive:** Stack vertically on mobile

---

## 2.2 Player Stats Comparison Card

### BMHL's Design
```
┌─────────────────────────────────────────────────────┐
│  Player Stats                                        │
├─────────────────────────────────────────────────────┤
│  POINTS                                              │
│  [Photo] J. Smith #12 (C)      42  ████████ 35      │
│           vs.                                        │
│  [Photo] M. Johnson #7 (RW)    35  ██████ 42        │
├─────────────────────────────────────────────────────┤
│  GOALS                                               │
│  [Photo] T. Brown #9 (LW)      18  ████ 12          │
│           vs.                                        │
│  [Photo] K. Davis #22 (C)      12  ██ 18            │
├─────────────────────────────────────────────────────┤
│  ASSISTS                                             │
│  [Photo] D. Wilson #4 (D)      24  ██████ 23        │
│           vs.                                        │
│  [Photo] R. Taylor #5 (D)      23  ████ 24          │
└─────────────────────────────────────────────────────┘
```

### Data Structure
```typescript
interface PlayerStatsComparison {
  statCategory: StatDefinition;
  homeTeamLeader: PlayerStatLine;
  awayTeamLeader: PlayerStatLine;
}

interface PlayerStatLine {
  player: {
    id: string;
    name: string;
    number: number;
    position: string;      // C, LW, RW, D, G
    photoUrl?: string;
  };
  value: number;           // Stat value (e.g., 42 points)
  rank: number;            // Rank in division (e.g., 3rd)
}

interface StatDefinition {
  key: string;             // 'points', 'goals', 'assists'
  label: string;           // 'Points', 'Goals', 'Assists'
  category: 'player' | 'team' | 'goalie';
  computation: string;     // SQL formula or event aggregation rule
  rankOrder: 'desc' | 'asc'; // Higher is better (desc) or lower is better (asc)
}
```

### Multi-Tenant Stat System
**Critical:** Stat categories cannot be hardcoded across platform.

**Database Table:**
```sql
CREATE TABLE stat_definitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  league_id UUID NOT NULL REFERENCES leagues(id) ON DELETE CASCADE,

  key TEXT NOT NULL,              -- 'points', 'goals', 'assists'
  label TEXT NOT NULL,            -- 'Points', 'Goals', 'Assists'
  short_label TEXT,               -- 'PTS', 'G', 'A'

  category TEXT NOT NULL,         -- player, team, goalie
  computation TEXT NOT NULL,      -- SQL formula or aggregation rule
  rank_order TEXT DEFAULT 'desc', -- desc (higher is better), asc (lower is better)

  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  show_on_comparison BOOLEAN DEFAULT TRUE, -- Show in player comparison card

  created_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT valid_category CHECK (category IN ('player', 'team', 'goalie')),
  CONSTRAINT valid_rank_order CHECK (rank_order IN ('desc', 'asc')),
  UNIQUE(league_id, key)
);
```

**For BMHL Demo, Configure:**
```sql
INSERT INTO stat_definitions (league_id, key, label, category, computation, rank_order, show_on_comparison) VALUES
  ('bmhl-uuid', 'points', 'Points', 'player', 'goals + assists', 'desc', true),
  ('bmhl-uuid', 'goals', 'Goals', 'player', 'COUNT(events WHERE type=goal)', 'desc', true),
  ('bmhl-uuid', 'assists', 'Assists', 'player', 'COUNT(events WHERE type=assist)', 'desc', true);
```

### Implementation Query
```sql
-- Get top player for stat category per team
WITH team_stats AS (
  SELECT
    p.id as player_id,
    p.team_id,
    p.name,
    p.number,
    p.position,
    SUM(ps.goals) as goals,
    SUM(ps.assists) as assists,
    SUM(ps.goals + ps.assists) as points
  FROM player_stats ps
  JOIN players p ON ps.player_id = p.id
  WHERE ps.season_id = $seasonId
  GROUP BY p.id, p.team_id, p.name, p.number, p.position
)
SELECT * FROM team_stats
WHERE team_id IN ($homeTeamId, $awayTeamId)
ORDER BY points DESC
LIMIT 2;  -- Top 1 per team
```

### Visual Design
- **Progress bars:** Show relative comparison (e.g., 42 vs 35 → bars scaled proportionally)
- **Player photos:** Circular avatars (48x48), fallback to initials if no photo
- **Position badge:** Small badge showing position (C, LW, RW, D)
- **"vs." divider:** Center-aligned between two players

---

## 2.3 Season Series Card

### BMHL's Design
```
┌─────────────────────────────────────────┐
│  Season Series                           │
├─────────────────────────────────────────┤
│  CGD leads 1-0                           │
├─────────────────────────────────────────┤
│  Jan 12, 2026                            │
│  CGD 4 - 2 KW                            │
│  Skate Zone Arena                        │
├─────────────────────────────────────────┤
│  Feb 15, 2026  •  7:00 PM                │
│  Skate Zone Arena                        │
│  (Upcoming)                              │
└─────────────────────────────────────────┘
```

### Data Structure
```typescript
interface SeasonSeries {
  seriesRecord: string;        // "CGD leads 1-0" or "Series tied 1-1"
  meetings: SeriesMeeting[];
}

interface SeriesMeeting {
  gameId: string;
  date: string;
  displayDate: string;         // "Jan 12, 2026"
  displayTime?: string;        // "7:00 PM" (if upcoming)
  venue: VenueSummary;
  status: GameStatus;
  result?: {
    homeScore: number;
    awayScore: number;
    winner: 'home' | 'away' | 'tie';
  };
}
```

### Implementation Query
```sql
-- Get all games between two teams in season
SELECT
  id as game_id,
  scheduled_at,
  venue_id,
  status,
  home_score,
  away_score,
  CASE
    WHEN home_score > away_score AND home_team_id = $teamAId THEN 'teamA'
    WHEN away_score > home_score AND away_team_id = $teamAId THEN 'teamA'
    WHEN home_score > away_score AND home_team_id = $teamBId THEN 'teamB'
    WHEN away_score > home_score AND away_team_id = $teamBId THEN 'teamB'
    ELSE 'tie'
  END as winner
FROM games
WHERE
  season_id = $seasonId
  AND (
    (home_team_id = $teamAId AND away_team_id = $teamBId) OR
    (home_team_id = $teamBId AND away_team_id = $teamAId)
  )
ORDER BY scheduled_at ASC;
```

### Series Record Computation
```typescript
function computeSeriesRecord(meetings: SeriesMeeting[], teamAId: string, teamBId: string) {
  const teamAWins = meetings.filter(m => m.status === 'completed' && m.result?.winner === 'teamA').length;
  const teamBWins = meetings.filter(m => m.status === 'completed' && m.result?.winner === 'teamB').length;

  if (teamAWins > teamBWins) return `${teamAName} leads ${teamAWins}-${teamBWins}`;
  if (teamBWins > teamAWins) return `${teamBName} leads ${teamBWins}-${teamAWins}`;
  if (teamAWins === teamBWins && teamAWins > 0) return `Series tied ${teamAWins}-${teamBWins}`;
  return 'First meeting this season';
}
```

### Design Notes
- **Completed games:** Show score + winner highlighted
- **Upcoming games:** Show date/time + venue + "(Upcoming)" badge
- **Click behavior:** Each meeting is clickable to game detail page

---

## 2.4 Team Stats Comparison Card

### BMHL's Design
```
┌─────────────────────────────────────────────────────┐
│  Team Stats                    [Rank by: Dropdown ▼] │
├─────────────────────────────────────────────────────┤
│  Power Play %                                        │
│  22.5% (5th of 11)  ████████  18.3% (8th of 11)     │
├─────────────────────────────────────────────────────┤
│  Penalty Kill %                                      │
│  85.7% (3rd of 11)  ██████████  78.2% (9th of 11)   │
├─────────────────────────────────────────────────────┤
│  Penalty Mins/Game                                   │
│  8.5 (4th of 11)  ████  12.2 (10th of 11)           │
├─────────────────────────────────────────────────────┤
│  Goals For/Game                                      │
│  3.8 (2nd of 11)  ██████████  2.9 (7th of 11)       │
└─────────────────────────────────────────────────────┘
```

### Data Structure
```typescript
interface TeamStatsComparison {
  stat: StatDefinition;
  homeTeam: TeamStatValue;
  awayTeam: TeamStatValue;
}

interface TeamStatValue {
  value: number;           // e.g., 22.5 (for PP%)
  rank: number;            // e.g., 5
  totalTeams: number;      // e.g., 11 (teams in division)
  displayValue: string;    // "22.5%" or "3.8"
  displayRank: string;     // "5th of 11"
}
```

### Stat Definitions (Multi-Tenant)
```sql
-- Team stat definitions for BMHL
INSERT INTO stat_definitions (league_id, key, label, category, computation, rank_order) VALUES
  ('bmhl-uuid', 'pp_pct', 'Power Play %', 'team',
   '(pp_goals / pp_opportunities) * 100', 'desc'),
  ('bmhl-uuid', 'pk_pct', 'Penalty Kill %', 'team',
   '((pk_opportunities - pp_goals_allowed) / pk_opportunities) * 100', 'desc'),
  ('bmhl-uuid', 'pim_per_game', 'Penalty Mins/Game', 'team',
   'total_pim / games_played', 'asc'),
  ('bmhl-uuid', 'gf_per_game', 'Goals For/Game', 'team',
   'total_goals_for / games_played', 'desc');
```

### Aggregation Query
```sql
-- Compute team aggregates from games
CREATE OR REPLACE VIEW team_season_stats AS
WITH team_games AS (
  SELECT
    CASE WHEN home_team_id = t.id THEN home_team_id ELSE away_team_id END as team_id,
    COUNT(*) as games_played,
    SUM(CASE WHEN home_team_id = t.id THEN home_score ELSE away_score END) as goals_for,
    SUM(CASE WHEN home_team_id = t.id THEN away_score ELSE home_score END) as goals_against,
    SUM(pp_goals) as pp_goals,
    SUM(pp_opportunities) as pp_opportunities,
    SUM(pk_opportunities) as pk_opportunities,
    SUM(pim) as total_pim
  FROM games g
  JOIN teams t ON (g.home_team_id = t.id OR g.away_team_id = t.id)
  WHERE g.status = 'completed'
  GROUP BY team_id, g.season_id
)
SELECT
  team_id,
  games_played,
  ROUND((pp_goals::numeric / NULLIF(pp_opportunities, 0)) * 100, 1) as pp_pct,
  ROUND(((pk_opportunities - pp_goals_allowed)::numeric / NULLIF(pk_opportunities, 0)) * 100, 1) as pk_pct,
  ROUND(total_pim::numeric / NULLIF(games_played, 0), 1) as pim_per_game,
  ROUND(goals_for::numeric / NULLIF(games_played, 0), 1) as gf_per_game
FROM team_games;
```

### Ranking Computation
```sql
-- Get rank within division for stat
WITH ranked_teams AS (
  SELECT
    team_id,
    pp_pct,
    RANK() OVER (PARTITION BY division_id ORDER BY pp_pct DESC) as rank,
    COUNT(*) OVER (PARTITION BY division_id) as total_teams
  FROM team_season_stats tss
  JOIN teams t ON tss.team_id = t.id
  WHERE season_id = $seasonId
)
SELECT * FROM ranked_teams WHERE team_id IN ($homeTeamId, $awayTeamId);
```

### Performance Optimization
**Problem:** Computing team aggregates on every page load is slow.

**Solution:** Precompute on game finalization event.

```sql
-- Materialized table updated incrementally
CREATE TABLE team_season_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  league_id UUID NOT NULL REFERENCES leagues(id),
  team_id UUID NOT NULL REFERENCES teams(id),
  season_id UUID NOT NULL REFERENCES seasons(id),

  games_played INTEGER DEFAULT 0,
  wins INTEGER DEFAULT 0,
  losses INTEGER DEFAULT 0,
  ot_losses INTEGER DEFAULT 0,

  goals_for INTEGER DEFAULT 0,
  goals_against INTEGER DEFAULT 0,
  pp_goals INTEGER DEFAULT 0,
  pp_opportunities INTEGER DEFAULT 0,
  pk_opportunities INTEGER DEFAULT 0,
  pp_goals_allowed INTEGER DEFAULT 0,
  total_pim INTEGER DEFAULT 0,

  -- Computed fields
  pp_pct NUMERIC(5,2),
  pk_pct NUMERIC(5,2),
  pim_per_game NUMERIC(5,2),
  gf_per_game NUMERIC(5,2),
  ga_per_game NUMERIC(5,2),

  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(team_id, season_id)
);

-- Trigger on game_events or game finalization
-- Updates team_season_stats incrementally
```

### "Rank By" Dropdown
Allow users to change which stat is shown:
- Power Play %
- Penalty Kill %
- Goals For/Game
- Goals Against/Game
- Plus/Minus
- etc.

**Implementation:** URL param `?rankBy=pp_pct` changes which stat is displayed

---

## 2.5 Goalie Stats Section

### BMHL's Design
```
┌─────────────────────────────────────────────────────┐
│  Goalie Stats                                        │
├─────────────────────────────────────────────────────┤
│  [Photo] J. Smith #30                                │
│  W-L-OT: 5-2-1    GAA: 2.45    SV%: .915    SO: 2   │
│                                                      │
│  [Photo] M. Johnson #1                               │
│  W-L-OT: 3-4-2    GAA: 3.12    SV%: .892    SO: 0   │
└─────────────────────────────────────────────────────┘
```

### Data Structure
```typescript
interface GoalieStatLine {
  goalie: {
    id: string;
    name: string;
    number: number;
    photoUrl?: string;
  };
  stats: {
    wins: number;
    losses: number;
    otLosses: number;
    gaa: number;          // Goals Against Average
    savePct: number;      // Save Percentage (0.915 = 91.5%)
    shutouts: number;
  };
}
```

### Computation
```sql
-- Goalie stats aggregation
SELECT
  g.id as goalie_id,
  g.name,
  g.number,
  COUNT(*) FILTER (WHERE result = 'win') as wins,
  COUNT(*) FILTER (WHERE result = 'loss') as losses,
  COUNT(*) FILTER (WHERE result = 'ot_loss') as ot_losses,
  ROUND(SUM(goals_against)::numeric / SUM(minutes_played) * 60, 2) as gaa,
  ROUND((SUM(saves)::numeric / SUM(shots_against)), 3) as save_pct,
  COUNT(*) FILTER (WHERE goals_against = 0 AND minutes_played >= 60) as shutouts
FROM goalie_stats gs
JOIN players g ON gs.player_id = g.id
WHERE gs.season_id = $seasonId AND g.team_id IN ($homeTeamId, $awayTeamId)
GROUP BY g.id, g.name, g.number;
```

### Important Note
**If BMHL doesn't track shots:** Save percentage will be N/A.
- **UI must handle missing data gracefully**
- Display "N/A" or "-" for SV% if shots_against = 0

---

# Part 3: Implementation Plan

## Phase 1: Schedule Page (Week 1-2)

### Week 1: Core Schedule UI
**Tasks:**
1. ✅ Create `sponsor_placements` table migration
2. ✅ Build tenant header component (logo + nav + search)
3. ✅ Build filter bar (season/division/type dropdowns + date range picker)
4. ✅ Implement URL-driven state management
5. ✅ Build day tabs component with game counts
6. ✅ Build daily group sections with game table
7. ✅ Build game row component with team logos + action icons
8. ✅ Add role-based action icon visibility

**Deliverables:**
- Schedule page matches BMHL mockup structurally (90% visual match)
- Filters work and update URL
- Day tabs show accurate game counts
- Game rows display team info correctly

**API Endpoints:**
```
GET /api/{tenant}/schedule
  ?seasonId&divisionId&type&start&end

Response: {
  filters: { seasons, divisions, types },
  dayCounts: { '2026-01-26': 6, ... },
  days: [
    { date, displayDate, games: [ {...}, {...} ] }
  ]
}
```

---

### Week 2: Schedule Enhancements
**Tasks:**
1. ✅ Add sponsor placement rendering
2. ✅ Implement game status badges (postponed, live, final, cancelled)
3. ✅ Add responsive mobile layout (table → card view)
4. ✅ Implement game row click → navigate to game detail
5. ✅ Add loading skeletons for filter changes
6. ✅ Add empty states ("No games this week")
7. ✅ Performance: React Query caching + debouncing

**Deliverables:**
- Sponsor slots render correctly
- Mobile layout works (stacked cards)
- Performance <300ms on filter changes
- Smooth UX with loading states

---

## Phase 2: Game Detail Page (Week 3-4)

### Week 3: Core Game Detail UI
**Tasks:**
1. ✅ Create `stat_definitions` table migration
2. ✅ Seed BMHL stats (points, goals, assists, PP%, PK%, etc.)
3. ✅ Build matchup header component (team blocks + center info)
4. ✅ Build player stats comparison card
5. ✅ Build season series card
6. ✅ Implement record computation query
7. ✅ Implement top player query per stat

**Deliverables:**
- Game detail page matches BMHL mockup (90% visual match)
- Matchup header shows correct team records
- Player comparison shows top 3 stats (points, goals, assists)
- Season series shows all meetings between teams

**API Endpoints:**
```
GET /api/{tenant}/games/{gameId}

Response: {
  game: { ... },
  matchup: {
    homeTeam: { ..., record: { wins, losses, otLosses } },
    awayTeam: { ..., record: { wins, losses, otLosses } }
  },
  playerComparisons: [
    { stat: 'points', homeLeader: {...}, awayLeader: {...} }
  ],
  seasonSeries: {
    seriesRecord: "CGD leads 1-0",
    meetings: [...]
  }
}
```

---

### Week 4: Team/Goalie Stats
**Tasks:**
1. ✅ Create `team_season_stats` materialized table
2. ✅ Build team stats comparison card
3. ✅ Implement "Rank By" dropdown
4. ✅ Build goalie stats section
5. ✅ Implement ranking computation within division
6. ✅ Add incremental stat updates on game finalization

**Deliverables:**
- Team stats comparison card functional
- Rankings computed correctly (per division)
- "Rank By" dropdown changes displayed stat
- Goalie stats shown with graceful N/A handling

---

## Phase 3: Admin Extensions (Week 5)

### Week 5: Admin Action Icons
**Tasks:**
1. ✅ Add "Reschedule" action icon on game rows (admin only)
2. ✅ Add "Cancel" action icon on game rows (admin only)
3. ✅ Build quick reschedule modal (datetime picker + venue selector)
4. ✅ Build bulk select UI (checkboxes on game rows)
5. ✅ Build bulk reschedule wizard (from P0.2 of gap analysis)
6. ✅ Integrate conflict detection warnings

**Deliverables:**
- Admin can reschedule single game from schedule page
- Admin can bulk-select games and reschedule via wizard
- Conflict warnings display before save

---

## Phase 4: Responsive & Polish (Week 6)

### Week 6: Mobile + Polish
**Tasks:**
1. ✅ Mobile optimization for schedule page (card layout)
2. ✅ Mobile optimization for game detail page (stacked sections)
3. ✅ Add loading skeletons for all API calls
4. ✅ Add error states (network errors, 404s)
5. ✅ Performance audit (Lighthouse score >90)
6. ✅ Accessibility audit (keyboard nav, screen readers)
7. ✅ Browser testing (Chrome, Firefox, Safari, Edge)

**Deliverables:**
- Mobile experience matches desktop quality
- All loading/error states handled gracefully
- Performance metrics pass thresholds
- WCAG 2.1 AA compliance

---

# Part 4: Database Schema Updates

## 4.1 Sponsor Placements Table
```sql
CREATE TABLE sponsor_placements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  league_id UUID NOT NULL REFERENCES leagues(id) ON DELETE CASCADE,
  sponsor_id UUID REFERENCES league_sponsors(id),

  page_type TEXT NOT NULL,
  slot TEXT NOT NULL,

  name TEXT NOT NULL,
  logo_url TEXT NOT NULL,
  link_url TEXT,
  alt_text TEXT,

  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,

  created_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT valid_page_type CHECK (page_type IN ('schedule', 'standings', 'stats', 'game_detail')),
  CONSTRAINT valid_slot CHECK (slot IN ('header', 'sidebar', 'footer'))
);

CREATE INDEX idx_sponsor_placements_league_page ON sponsor_placements(league_id, page_type, slot);
```

## 4.2 Stat Definitions Table
```sql
CREATE TABLE stat_definitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  league_id UUID NOT NULL REFERENCES leagues(id) ON DELETE CASCADE,

  key TEXT NOT NULL,
  label TEXT NOT NULL,
  short_label TEXT,

  category TEXT NOT NULL,
  computation TEXT NOT NULL,
  rank_order TEXT DEFAULT 'desc',

  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  show_on_comparison BOOLEAN DEFAULT TRUE,

  created_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT valid_category CHECK (category IN ('player', 'team', 'goalie')),
  CONSTRAINT valid_rank_order CHECK (rank_order IN ('desc', 'asc')),
  UNIQUE(league_id, key)
);

CREATE INDEX idx_stat_definitions_league_category ON stat_definitions(league_id, category);
```

## 4.3 Team Season Stats Table (Materialized)
```sql
CREATE TABLE team_season_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  league_id UUID NOT NULL REFERENCES leagues(id),
  team_id UUID NOT NULL REFERENCES teams(id),
  season_id UUID NOT NULL REFERENCES seasons(id),

  games_played INTEGER DEFAULT 0,
  wins INTEGER DEFAULT 0,
  losses INTEGER DEFAULT 0,
  ot_losses INTEGER DEFAULT 0,

  goals_for INTEGER DEFAULT 0,
  goals_against INTEGER DEFAULT 0,
  pp_goals INTEGER DEFAULT 0,
  pp_opportunities INTEGER DEFAULT 0,
  pk_opportunities INTEGER DEFAULT 0,
  pp_goals_allowed INTEGER DEFAULT 0,
  total_pim INTEGER DEFAULT 0,

  -- Computed fields
  pp_pct NUMERIC(5,2),
  pk_pct NUMERIC(5,2),
  pim_per_game NUMERIC(5,2),
  gf_per_game NUMERIC(5,2),
  ga_per_game NUMERIC(5,2),

  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(team_id, season_id)
);

CREATE INDEX idx_team_season_stats_league_season ON team_season_stats(league_id, season_id);
CREATE INDEX idx_team_season_stats_team ON team_season_stats(team_id);
```

---

# Part 5: Component Architecture

## 5.1 Schedule Page Component Tree
```
SchedulePage
├── TenantHeader
│   ├── Logo
│   ├── Navigation (feature-flag aware)
│   └── UserMenu (login/logout)
├── ScheduleFilterBar
│   ├── DateRangePicker (week nav)
│   ├── SeasonDropdown
│   ├── DivisionDropdown
│   └── SeasonTypeDropdown
├── DayTabs (horizontal scroll on mobile)
│   └── DayTab[] (day name + date + count)
├── SponsorSlot (conditional render)
└── DayGroups
    └── DayGroup[]
        ├── DayHeader (date display)
        └── GameTable
            └── GameRow[]
                ├── MatchUpCell (logos + names + ranks)
                ├── TimeCell
                ├── RinkCell
                ├── DivisionCell
                └── ActionsCell (role-based icons)
```

## 5.2 Game Detail Page Component Tree
```
GameDetailPage
├── TenantHeader
├── MatchupHeader
│   ├── TeamBlock (home)
│   │   ├── TeamLogo
│   │   ├── TeamName
│   │   └── TeamRecord
│   ├── GameInfo (center)
│   │   ├── Date
│   │   ├── Time
│   │   └── Venue
│   └── TeamBlock (away)
├── PlayerStatsComparison
│   └── StatComparisonRow[]
│       ├── HomePlayerStatLine
│       └── AwayPlayerStatLine
├── SeasonSeriesCard
│   ├── SeriesRecord
│   └── MeetingsList
│       └── MeetingRow[]
├── TeamStatsComparison
│   ├── RankByDropdown
│   └── TeamStatRow[]
│       ├── HomeTeamValue
│       └── AwayTeamValue
└── GoalieStatsSection
    ├── HomeGoalieStatLine
    └── AwayGoalieStatLine
```

---

# Part 6: Follow-Up Questions

### Q1: Navigation Labels - Match BMHL or Use Platform Names?
**BMHL's Nav:** Scores / Info / Schedule / Standings / Stats / Contact

**Recommendation:** Match BMHL exactly for demo, make configurable per tenant.

**Implementation:**
```typescript
interface TenantNavConfig {
  items: NavItem[];
}

interface NavItem {
  label: string;          // "Schedule" or custom
  href: string;           // "/schedule"
  moduleKey: string;      // 'schedule' (internal key)
  enabled: boolean;       // Feature flag
}

// For BMHL demo:
navConfig = {
  items: [
    { label: 'Scores', href: '/scores', moduleKey: 'scores', enabled: true },
    { label: 'Info', href: '/info', moduleKey: 'info', enabled: true },
    { label: 'Schedule', href: '/schedule', moduleKey: 'schedule', enabled: true },
    { label: 'Standings', href: '/standings', moduleKey: 'standings', enabled: true },
    { label: 'Stats', href: '/stats', moduleKey: 'stats', enabled: true },
    { label: 'Contact', href: '/contact', moduleKey: 'contact', enabled: true }
  ]
};
```

---

### Q2: Team Logos/Branding - Scrape/Import for Demo?
**Answer:** Use placeholder logos initially, allow BMHL to upload real logos via admin UI.

**Fallback Strategy:**
1. Check if `team.logoUrl` exists
2. If yes, render logo
3. If no, render team initials in colored circle (e.g., "CGD" in blue circle)

**For Demo:**
- Generate simple SVG logos with team initials + brand color
- BMHL can replace with real logos post-demo

---

### Q3: Standings/Records - Computed or Manual?
**Answer:** ✅ Already computed from game results (see Q3 in gap analysis).

**No changes needed** - maintain current behavior.

Event sourcing refactor will not break this (game state still derives from events).

---

### Q4: Day Tabs - Scroll or Filter?
**Recommendation:** **Scroll behavior (Option A)** for v1.

**Why:**
- Simpler implementation
- Better for scanning full week
- Mobile-friendly (smooth scroll)

**Add Filter Toggle Later (v2):**
- Add toggle button: "View: [All Days] [Single Day]"
- When "Single Day" mode active, clicking tab filters to that day

---

### Q5: Mobile Parity - Desktop First or Mobile First?
**Recommendation:** Desktop first for demo (match BMHL's mockups), mobile parity in Week 6.

**Rationale:**
- BMHL's mockups are desktop-focused
- Admin users (primary use case) are typically on desktop
- Mobile optimization can follow after core functionality proven

**Mobile Strategy:**
- Week 1-4: Desktop-optimized (but not broken on mobile)
- Week 6: Mobile optimization pass (responsive tables, touch targets, card layouts)

---

# Part 7: Success Criteria

## Schedule Page is "Complete" When:
1. ✅ Visually matches BMHL mockup (90% structural match)
2. ✅ All filters work (season, division, type, date range)
3. ✅ Day tabs show accurate game counts
4. ✅ Game rows display correct info (logos, ranks, times, venues)
5. ✅ Role-based action icons visible (public vs admin)
6. ✅ Sponsor slot renders (if placement exists)
7. ✅ Mobile layout works (cards instead of table)
8. ✅ Performance: <300ms filter changes, <2s initial load
9. ✅ Shareable URLs (filters persist in query params)

## Game Detail Page is "Complete" When:
1. ✅ Visually matches BMHL mockup (90% structural match)
2. ✅ Matchup header shows correct team records
3. ✅ Player comparison shows top 3 stats (configurable)
4. ✅ Season series shows all meetings + series record
5. ✅ Team stats comparison functional with rankings
6. ✅ "Rank By" dropdown changes displayed stat
7. ✅ Goalie stats section handles missing data (N/A for SV% if no shots tracked)
8. ✅ Mobile layout works (stacked sections)
9. ✅ Performance: <2s page load

---

# Part 8: Claude Code Handoff (Agent Prompt)

## For Claude Code Agents

**Task:** Implement BMHL-provided Schedule and Game Detail pages exactly as designed, then extend with admin capabilities.

**Input:**
- BMHL mockups: `BMHL/web-example1.png` (schedule), `BMHL/web-example2.png` (game detail)
- This spec document: `BMHL_UI_REQUIREMENTS.md`

**Goals:**
1. **Replicate structure:** 90% visual match to BMHL mockups
2. **Multi-tenant foundation:** All components tenant-aware (branding, nav, stats)
3. **Real data plumbing:** API endpoints return actual data from database
4. **Role-based visibility:** Action icons filtered by user role
5. **Performance:** <300ms filter changes, <2s page loads

**Deliverables:**

### Phase 1: Schedule Page (Week 1-2)
- `app/(public)/[tenant]/schedule/page.tsx` (schedule page)
- `components/schedule/ScheduleFilterBar.tsx`
- `components/schedule/DayTabs.tsx`
- `components/schedule/DayGroup.tsx`
- `components/schedule/GameRow.tsx`
- `components/layout/TenantHeader.tsx`
- `components/sponsors/SponsorSlot.tsx`
- API: `app/api/[tenant]/schedule/route.ts`

### Phase 2: Game Detail Page (Week 3-4)
- `app/(public)/[tenant]/games/[gameId]/page.tsx`
- `components/game-detail/MatchupHeader.tsx`
- `components/game-detail/PlayerStatsComparison.tsx`
- `components/game-detail/SeasonSeriesCard.tsx`
- `components/game-detail/TeamStatsComparison.tsx`
- `components/game-detail/GoalieStatsSection.tsx`
- API: `app/api/[tenant]/games/[gameId]/route.ts`

### Phase 3: Database Migrations
- `supabase/migrations/20260129_create_sponsor_placements.sql`
- `supabase/migrations/20260129_create_stat_definitions.sql`
- `supabase/migrations/20260129_create_team_season_stats.sql`

### Phase 4: Admin Extensions (Week 5)
- Add admin action icons (reschedule, cancel) to `GameRow`
- Build quick reschedule modal
- Integrate bulk reschedule wizard (from P0.2 gap analysis)

**Key Constraints:**
- Do NOT hardcode stat categories (use `stat_definitions` table)
- Do NOT break multi-tenant isolation (all queries scoped by `league_id`)
- Do NOT skip role-based visibility (use existing RBAC system)
- Do NOT optimize prematurely (match structure first, optimize in Week 6)

**Target:** BMHL demo site ready by Week 6 (Mar 12, 2026)

---

## Document Control

**Version:** 1.0
**Author:** System Analysis (based on BMHL UI mockups + requirements)
**Date:** 2026-01-29
**Status:** ✅ UI Specification Complete, Ready for Implementation
**Related Docs:**
- `BMHL_GAP_ANALYSIS.md` (backend requirements)
- `BMHL/web-example1.png` (schedule mockup)
- `BMHL/web-example2.png` (game detail mockup)

**Next Steps:**
1. Review mockups with team (if uploaded)
2. Begin Phase 1 implementation (Schedule Page)
3. Weekly demos to validate UI match
4. Integrate with backend features from gap analysis

---

**END OF DOCUMENT**
