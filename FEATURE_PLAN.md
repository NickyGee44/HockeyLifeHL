# BeerLeagueHockey — Feature Plan (5 Features)

**Date:** 2026-03-20
**Status:** Planning
**Author:** Codebase analysis by Claude

---

## Executive Summary

Five features targeting pre-playoff operations, competitive integrity, and league governance. Ordered by dependency and value:

1. **Pre-Playoff Ineligible Player Auto-Email** — Low complexity, high immediate value. Leverages existing eligibility RPC + email infrastructure.
2. **Point Carry Rules for Team Movement** — Medium complexity. Extends existing standings and division-shuffle systems for playoff seeding adjustments.
3. **Exemption History + Cooldown Tracking** — Medium complexity. New table + cross-season query logic. No existing exemption infrastructure.
4. **Player Protest Workflow** — Large complexity. New game-lifecycle state, captain UI, admin resolution flow, forfeit automation.
5. **Multi-Metric Team Rebalancing Report** — XL complexity. Requires new advanced queries (close game %, record without top scorer), commissioner approval workflow, and integration with division-shuffle.

**Shared infrastructure** across features: cron job patterns (Feature 1), division movement hooks (Features 2 & 5), admin approval workflows (Features 3 & 4), notification templates (Features 1, 3, 4).

---

## Feature 1: Pre-Playoff Ineligible Player Auto-Email

### What Exists Today

| Component | File | What It Does |
|-----------|------|-------------|
| Eligibility RPC | `supabase/migrations/20260213_combined_pending_features.sql` | `get_playoff_eligibility(p_season_id, p_team_id)` — returns per-player eligibility with `is_eligible`, `games_played_pct`, `min_games` |
| Admin Dashboard | `apps/league-builder/src/app/[locale]/dashboard/seasons/[seasonId]/eligibility/EligibilityDashboard.tsx` | Configure min % / min games, view all players, per-player overrides |
| Captain View | `apps/league-sites/src/components/captain/PlayoffEligibility.tsx` | Read-only eligibility display per team |
| Server Actions | `apps/league-builder/src/lib/actions/playoff-eligibility.ts` | `getPlayoffEligibility()`, `updateSeasonEligibilitySettings()`, `updateGamesPlayedOverride()` |
| Email Service | `apps/league-builder/src/lib/notifications/email-service.ts` | `sendEmail()`, `sendBatchEmails()` with rate limiting, Resend provider |
| Notification Templates | `apps/league-builder/src/lib/notifications/templates/` | Base HTML template, 12+ existing templates (registration, suspension, game reminder, etc.) |
| Cron Infrastructure | `apps/league-builder/src/app/api/cron/send-game-reminders/route.ts` | Pattern: hourly cron, atomic claim, preference checks, unsubscribe links |
| Notification DB | `supabase/migrations_archive/20260129_create_notifications.sql` | `notifications` table with status tracking, `user_notification_preferences` with opt-out flags |
| Season Status | `packages/database/src/types.ts` | Season `status` field transitions: `active` → `playoffs` → `completed` |

### What Needs to Be Built

**New Files:**
| File | Purpose |
|------|---------|
| `apps/league-builder/src/lib/notifications/templates/playoff-ineligibility.ts` | HTML email template: "These players on your roster are currently ineligible for playoffs" with player list, games needed, and link to captain eligibility view |
| `apps/league-builder/src/app/api/cron/send-eligibility-alerts/route.ts` | Cron route: runs daily, detects seasons approaching playoffs (configurable window), sends one email per captain per team |
| `apps/league-builder/src/lib/actions/eligibility-notifications.ts` | Server actions: `sendEligibilityAlerts(seasonId)`, `getEligibilityAlertStatus(seasonId)`, `triggerManualEligibilityAlert(seasonId)` |

**Modified Files:**
| File | Change |
|------|--------|
| `apps/league-builder/src/app/[locale]/dashboard/seasons/[seasonId]/eligibility/EligibilityDashboard.tsx` | Add "Send Eligibility Alerts" button for manual trigger, show alert history |
| `apps/league-builder/src/lib/actions/playoff-eligibility.ts` | Add `getIneligiblePlayersByTeam(seasonId)` — batch query all teams at once |

### DB Schema Changes

```sql
-- Add to seasons table
ALTER TABLE seasons ADD COLUMN eligibility_alert_days_before_playoffs integer DEFAULT 14;
ALTER TABLE seasons ADD COLUMN eligibility_alert_sent_at timestamptz;

-- Track per-captain alert sends (prevents duplicates)
CREATE TABLE eligibility_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  season_id uuid REFERENCES seasons(id) ON DELETE CASCADE,
  team_id uuid REFERENCES teams(id) ON DELETE CASCADE,
  captain_id uuid REFERENCES profiles(id),
  sent_at timestamptz DEFAULT now(),
  ineligible_count integer NOT NULL,
  ineligible_player_ids uuid[] NOT NULL,
  notification_id uuid REFERENCES notifications(id),
  UNIQUE(season_id, team_id, captain_id, sent_at::date)
);

-- RLS
ALTER TABLE eligibility_alerts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "League admins can view alerts" ON eligibility_alerts
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM league_memberships lm
    WHERE lm.league_id = (SELECT league_id FROM seasons WHERE id = eligibility_alerts.season_id)
    AND lm.user_id = auth.uid()
    AND lm.role IN ('owner', 'admin')
  ));
```

### Downstream Impacts

- **Low risk.** All reads are additive. No existing data modified.
- Cron job needs Vercel cron config entry in `vercel.json`.
- Captain email addresses sourced from `teams.captain_id → profiles.email` — must handle captains with no email gracefully.
- Respect `user_notification_preferences.email_enabled` and add new preference flag `email_eligibility_alerts`.

### Implementation Notes

- Follow the `send-game-reminders` cron pattern exactly: atomic claim via `eligibility_alert_sent_at`, rate-limited batch sends, unsubscribe token generation.
- Template should include: league name, team name, season name, list of ineligible players with jersey #, games played, games needed, and a deep link to the captain eligibility page on league-sites.
- Admin can also manually trigger from eligibility dashboard (useful for mid-season check-ins).
- i18n: Add `eligibility.alert.*` keys to both `en.json` and `fr.json`.

### Complexity: **S** (Small)

Estimated: ~2-3 days. All infrastructure exists — this is primarily template creation + cron wiring.

---

## Feature 2: Point Carry Rules for Team Movement

### What Exists Today

| Component | File | What It Does |
|-----------|------|-------------|
| Standings Calc | `apps/league-builder/src/lib/standings/actions.ts` | `getStandings(seasonId)` calls `calculate_standings` RPC — returns wins, losses, ties, points, GF, GA per team |
| Standings RPC | `supabase/migrations_archive/.../20260205_schedule_generation_functions.sql` | `calculate_standings` — sums game results with configurable point values per win/loss/tie |
| Standings Config | `packages/database/src/types.ts` | `standings_config` table: `points_win`, `points_loss`, `points_tie`, `tiebreakers[]`, `playoff_teams_per_division` |
| Division Shuffle | `apps/league-builder/src/lib/actions/division-shuffle.ts` | `getDivisionHealthStats()`, `executeDivisionMoves()` — moves teams between divisions with schedule adjustment options |
| Division Shuffle UI | `apps/league-builder/src/components/divisions/DivisionShuffleTool.tsx` | Visual tool for swap suggestions, health scores, move execution |
| Division Management | `apps/league-builder/src/lib/actions/divisions.ts` | `assignTeamToDivision()`, `moveTeamBetweenDivisions()`, `bulkAssignTeamsToDivision()` |
| Playoff Bracket | `apps/league-builder/src/lib/actions/playoff-bracket.ts` | `generatePlayoffBracket()` uses `get_team_standings` for seeding — **this is where carry rules would apply** |
| Bracket Generation | `apps/league-builder/src/lib/playoffs/bracket-generation.ts` | `buildGeneratedPlayoffScopes()` — seeds teams by points for bracket matchups |
| Standings Types | `apps/league-builder/src/lib/standings/types.ts` | `TeamStanding` interface with `points`, `rank`, `isPlayoffSpot` |

### What Needs to Be Built

**New Files:**
| File | Purpose |
|------|---------|
| `apps/league-builder/src/lib/standings/point-carry.ts` | Point carry calculation logic: `calculateCarriedPoints(originalPoints, moveDirection, carryPercentage)`, `getTeamMovementHistory(teamId, seasonId)` |

**Modified Files:**
| File | Change |
|------|--------|
| `apps/league-builder/src/lib/standings/types.ts` | Add `carriedPoints`, `originalPoints`, `moveDirection`, `carryPercentage` to `TeamStanding` |
| `apps/league-builder/src/lib/standings/actions.ts` | New `getPlayoffSeedings(seasonId)` that applies carry rules on top of `calculate_standings` results |
| `apps/league-builder/src/lib/actions/division-shuffle.ts` | Record movement events when `executeDivisionMoves()` is called — write to `team_division_moves` table |
| `apps/league-builder/src/lib/actions/playoff-bracket.ts` | `generatePlayoffBracket()` uses `getPlayoffSeedings()` instead of raw standings |
| `apps/league-builder/src/components/divisions/DivisionShuffleTool.tsx` | Show projected point carry impact when previewing moves |
| `apps/league-builder/src/components/standings/StandingsTable.tsx` | Optional column showing carried points vs raw points |
| `apps/league-builder/src/lib/standings/types.ts` | Add `StandingsConfig.pointCarryUp`, `pointCarryDown` fields |

### DB Schema Changes

```sql
-- Track team division movements within a season
CREATE TABLE team_division_moves (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  league_id uuid NOT NULL REFERENCES leagues(id) ON DELETE CASCADE,
  season_id uuid NOT NULL REFERENCES seasons(id) ON DELETE CASCADE,
  team_id uuid NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  from_division_id uuid REFERENCES divisions(id) ON DELETE SET NULL,
  to_division_id uuid REFERENCES divisions(id) ON DELETE SET NULL,
  direction text NOT NULL CHECK (direction IN ('up', 'down', 'lateral')),
  points_at_move integer NOT NULL,
  carry_percentage numeric NOT NULL DEFAULT 100,
  carried_points numeric NOT NULL,
  moved_at timestamptz DEFAULT now(),
  moved_by uuid REFERENCES profiles(id),
  reason text,
  created_at timestamptz DEFAULT now()
);

-- Add carry config to standings_config
ALTER TABLE standings_config ADD COLUMN point_carry_up_pct numeric DEFAULT 75;
ALTER TABLE standings_config ADD COLUMN point_carry_down_pct numeric DEFAULT 150;
ALTER TABLE standings_config ADD COLUMN point_carry_enabled boolean DEFAULT false;

-- Indexes
CREATE INDEX idx_team_division_moves_season ON team_division_moves(season_id, team_id);

-- RLS
ALTER TABLE team_division_moves ENABLE ROW LEVEL SECURITY;
CREATE POLICY "League members can view moves" ON team_division_moves
  FOR SELECT USING (league_id IN (
    SELECT league_id FROM league_memberships WHERE user_id = auth.uid()
  ));
CREATE POLICY "League admins can manage moves" ON team_division_moves
  FOR ALL USING (league_id IN (
    SELECT league_id FROM league_memberships
    WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
  ));
```

### Downstream Impacts

- **Medium risk.** Changes playoff seeding logic — must not break existing brackets where carry is disabled.
- `point_carry_enabled` defaults to `false` so existing leagues are unaffected.
- `DivisionShuffleTool` already calls `executeDivisionMoves()` — adding the movement recording is non-breaking.
- The `calculate_standings` RPC stays unchanged (raw points). Carry is applied in the application layer for playoff seeding only, not regular-season standings display.
- Bracket generation must be tested with carry math: e.g., team with 30 points moves up → 22.5 carried → seeded accordingly.

### Implementation Notes

- **Carry applies to playoff seeding only**, not regular-season standings. Regular standings show raw points; playoff seedings show carried points.
- Direction detection: Compare `divisions.sort_order` or `divisions.skill_level` between old and new division. Higher sort_order/skill = "up", lower = "down".
- Multiple moves in a season: carry compounds (e.g., moved up then down — each move applies its percentage to the carried total at time of move).
- Edge case: team moved after playoffs started — should be blocked or require admin override.
- Follow `StandingsConfig` upsert pattern from existing `updateStandingsConfig()`.

### Complexity: **M** (Medium)

Estimated: ~4-5 days. Core logic is straightforward math, but integration touchpoints with bracket generation, standings display, and division shuffle UI add scope.

---

## Feature 3: Exemption History + Cooldown Tracking

### What Exists Today

| Component | File | What It Does |
|-----------|------|-------------|
| Waiver Templates | `apps/league-builder/src/lib/actions/waiver-management.ts` | Admin creates/versions league waivers (liability waivers, not exemptions) |
| Waiver Signing | `apps/league-sites/src/lib/actions/waivers.ts` | Players sign waivers during registration |
| Player Waivers DB | `packages/database/src/types.ts` | `player_waivers` table — signed liability waivers, not exemptions |
| Season Tracking | `packages/database/src/types.ts` | `seasons` table with `start_date`, `end_date`, `status` — needed for cross-season lookups |
| Roster History | `packages/database/src/types.ts` | `team_rosters` with `season_id`, `start_date`, `end_date` — player-season relationship |
| Suspension Appeals | `apps/league-builder/src/lib/actions/suspensions.ts` | Pattern: request → admin review → approve/deny with audit trail — **reusable pattern for exemptions** |

**No existing exemption system.** The waiver system is for legal liability waivers, not competitive exemptions.

### What Needs to Be Built

**New Files:**
| File | Purpose |
|------|---------|
| `apps/league-builder/src/lib/actions/exemptions.ts` | Server actions: `requestExemption()`, `reviewExemption()`, `getExemptionHistory()`, `checkExemptionEligibility()`, `getExemptionCooldownStatus()` |
| `apps/league-builder/src/lib/exemptions/types.ts` | Types: `ExemptionRequest`, `ExemptionStatus`, `CooldownStatus`, `ExemptionType` |
| `apps/league-builder/src/lib/exemptions/cooldown.ts` | Cooldown business logic: `isEligibleForExemption(playerId)` — checks 2-year window, consecutive-season rule |
| `apps/league-builder/src/components/exemptions/ExemptionRequestModal.tsx` | Admin/captain form to submit exemption request |
| `apps/league-builder/src/components/exemptions/ExemptionHistoryTable.tsx` | Per-player exemption history with cooldown indicator |
| `apps/league-builder/src/components/exemptions/ExemptionReviewPanel.tsx` | Admin review queue: approve/deny with notes |
| `apps/league-builder/src/app/[locale]/dashboard/seasons/[seasonId]/exemptions/page.tsx` | Dashboard page listing all exemption requests for the season |
| `apps/league-builder/src/lib/notifications/templates/exemption-decision.ts` | Email template for exemption approved/denied |

**Modified Files:**
| File | Change |
|------|--------|
| `apps/league-builder/src/app/[locale]/dashboard/seasons/[seasonId]/layout.tsx` | Add "Exemptions" nav item |
| `apps/league-builder/src/lib/actions/playoff-eligibility.ts` | Check for active exemptions when computing eligibility — exempt players bypass min-games requirement |

### DB Schema Changes

```sql
-- Exemption types: e.g., injury, personal, medical, travel
CREATE TYPE exemption_type AS ENUM ('injury', 'medical', 'personal', 'travel', 'other');
CREATE TYPE exemption_status AS ENUM ('pending', 'approved', 'denied', 'expired');

CREATE TABLE player_exemptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  league_id uuid NOT NULL REFERENCES leagues(id) ON DELETE CASCADE,
  season_id uuid NOT NULL REFERENCES seasons(id) ON DELETE CASCADE,
  player_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  team_id uuid REFERENCES teams(id) ON DELETE SET NULL,

  -- Request details
  exemption_type exemption_type NOT NULL,
  reason text NOT NULL,
  supporting_docs_url text,  -- Optional doc upload
  requested_by uuid NOT NULL REFERENCES profiles(id),
  requested_at timestamptz DEFAULT now(),

  -- Review
  status exemption_status NOT NULL DEFAULT 'pending',
  reviewed_by uuid REFERENCES profiles(id),
  reviewed_at timestamptz,
  review_notes text,
  denial_reason text,

  -- Cooldown tracking
  season_start_date date NOT NULL,  -- Denormalized for cross-season queries
  season_end_date date NOT NULL,

  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- League-level exemption policy configuration
CREATE TABLE exemption_policies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  league_id uuid NOT NULL REFERENCES leagues(id) ON DELETE CASCADE,
  max_exemptions_per_player integer DEFAULT 1,
  cooldown_years integer DEFAULT 2,
  allow_consecutive_seasons boolean DEFAULT false,
  require_documentation boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(league_id)
);

-- Indexes
CREATE INDEX idx_player_exemptions_player ON player_exemptions(player_id, season_id);
CREATE INDEX idx_player_exemptions_league_season ON player_exemptions(league_id, season_id, status);

-- RLS
ALTER TABLE player_exemptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE exemption_policies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Players can view own exemptions" ON player_exemptions
  FOR SELECT USING (player_id = auth.uid());
CREATE POLICY "League admins can manage exemptions" ON player_exemptions
  FOR ALL USING (league_id IN (
    SELECT league_id FROM league_memberships
    WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
  ));
CREATE POLICY "League admins can manage exemption policies" ON exemption_policies
  FOR ALL USING (league_id IN (
    SELECT league_id FROM league_memberships
    WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
  ));
```

### Downstream Impacts

- **Medium risk.** The eligibility RPC `get_playoff_eligibility` needs to be updated (or wrapped) to check for approved exemptions and bypass min-games for exempt players.
- Captain eligibility view on league-sites should show exemption status.
- The eligibility alert emails (Feature 1) should exclude exempt players from the ineligible list.
- Cross-season queries require denormalized `season_start_date`/`season_end_date` to avoid expensive joins.

### Implementation Notes

- **Cooldown logic:** Query `player_exemptions` WHERE `player_id = X` AND `status = 'approved'` AND `season_end_date > (now() - interval '2 years')`. If count >= `max_exemptions_per_player`, deny. For consecutive check: find most recent approved exemption, check if its season is the immediately prior season.
- Follow the suspension review pattern: `pending` → admin reviews → `approved`/`denied`. Reuse the same `reviewed_by`, `reviewed_at`, `review_notes` column pattern.
- `exemption_policies` table allows per-league configuration. Defaults match spec: 1 per 2 years, no consecutive.
- File upload for supporting docs uses existing Supabase storage pattern from waiver document uploads.
- i18n: Add `exemptions.*` keys to both `en.json` and `fr.json`.

### Complexity: **M** (Medium)

Estimated: ~5-6 days. New domain entity with CRUD, review workflow, cross-season query logic, and eligibility integration.

---

## Feature 4: Player Protest Workflow

### What Exists Today

| Component | File | What It Does |
|-----------|------|-------------|
| Game Table | `packages/database/src/types.ts` | Games have `status` (scheduled/in_progress/completed/pending_verification/cancelled/postponed), home/away verification, contestation fields |
| Contestation Fields | `packages/database/src/types.ts` | `home_contested_at`, `home_contested_reason`, `home_contested_stats`, `away_contested_at`, `away_contested_reason`, `away_contested_stats` — **basic dispute mechanism exists but no protest workflow** |
| Scorekeeper UI | `apps/league-sites/src/components/scorekeeper/ScoringInterface.tsx` | Live scoring with period tracking, goal/penalty entry — **protest filing would integrate here** |
| Game Events | `packages/database/src/types.ts` | `game_events` table with `event_type`, `period`, `game_time_seconds` — could be extended for protest events |
| Captain Verification | `apps/league-sites/src/app/[leagueSlug]/verify/[token]/page.tsx` | Post-game captain review with accept/dispute flow |
| Suspension System | `apps/league-builder/src/lib/actions/suspensions.ts` | Admin review workflow: `pending_review` → `active`/`denied` with appeals — **pattern for protest resolution** |
| Admin Completed Games | `apps/league-builder/src/components/games/completed-games-tabs.tsx` | Tabbed view: Games, Penalties, Suspensions, Referee Notes — **add Protests tab here** |
| Forfeit Logic | — | **Does not exist.** No forfeit handling, no automatic result override. |
| Tiebreaker Rules | `apps/league-builder/src/lib/standings/types.ts` | `TiebreakerType` enum with head_to_head, goal_diff, goals_for, goals_against, wins — **may need forfeit tiebreaker** |

### What Needs to Be Built

**New Files:**
| File | Purpose |
|------|---------|
| `apps/league-builder/src/lib/actions/protests.ts` | Server actions: `fileProtest()`, `resolveProtest()`, `getGameProtests()`, `getPendingProtests()`, `applyForfeitResult()` |
| `apps/league-builder/src/lib/protests/types.ts` | Types: `Protest`, `ProtestStatus`, `ProtestOutcome`, `ProtestResolution` |
| `apps/league-builder/src/lib/protests/forfeit.ts` | Forfeit logic: `applyForfeit(gameId, forfeitingTeamId)` — overrides game result, updates standings, marks game as forfeited |
| `apps/league-builder/src/components/protests/ProtestResolutionPanel.tsx` | Admin UI: review protest, set outcome (valid/invalid), apply forfeit, add notes |
| `apps/league-builder/src/components/protests/ProtestListTable.tsx` | Admin list of pending/resolved protests |
| `apps/league-builder/src/components/protests/ProtestFilingModal.tsx` | Captain-facing protest form (reason, period, accused player) |
| `apps/league-sites/src/components/scorekeeper/ProtestButton.tsx` | In-game protest filing button (available before 3rd period) |
| `apps/league-sites/src/lib/actions/protests.ts` | League-sites protest actions: `fileGameProtest()`, `getProtestStatus()` |
| `apps/league-builder/src/lib/notifications/templates/protest-filed.ts` | Email: admin notified of new protest |
| `apps/league-builder/src/lib/notifications/templates/protest-resolved.ts` | Email: captains notified of resolution |
| `apps/league-builder/src/app/[locale]/dashboard/protests/page.tsx` | Protest management dashboard |

**Modified Files:**
| File | Change |
|------|--------|
| `apps/league-sites/src/components/scorekeeper/ScoringInterface.tsx` | Add protest filing button (disabled after 3rd period starts) |
| `apps/league-builder/src/components/games/completed-games-tabs.tsx` | Add "Protests" tab |
| `apps/league-builder/src/lib/standings/actions.ts` | `getStandings()` must account for forfeited games (forfeit = loss for forfeiting team, win for opponent with configurable score like 1-0) |
| `packages/database/src/types.ts` | Regenerate after migration |
| `apps/league-builder/src/lib/actions/games.ts` | Add `flagGameAsProtested()`, `unflagGame()` |

### DB Schema Changes

```sql
CREATE TYPE protest_status AS ENUM ('filed', 'under_review', 'resolved');
CREATE TYPE protest_outcome AS ENUM ('valid_forfeit', 'valid_no_action', 'invalid', 'withdrawn');

CREATE TABLE game_protests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id uuid NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  league_id uuid NOT NULL REFERENCES leagues(id) ON DELETE CASCADE,
  season_id uuid NOT NULL REFERENCES seasons(id) ON DELETE CASCADE,

  -- Filing
  protesting_team_id uuid NOT NULL REFERENCES teams(id),
  protesting_captain_id uuid NOT NULL REFERENCES profiles(id),
  accused_team_id uuid NOT NULL REFERENCES teams(id),
  accused_player_id uuid REFERENCES profiles(id),  -- Optional: specific player
  filed_at timestamptz DEFAULT now(),
  filed_period integer NOT NULL,  -- Must be < 3 (before 3rd period)
  filed_game_time_seconds integer,  -- Game clock at time of filing

  -- Protest details
  reason text NOT NULL,
  protest_type text NOT NULL CHECK (protest_type IN ('ineligible_player', 'identity_fraud', 'rule_violation', 'other')),

  -- ID verification window
  id_check_requested boolean DEFAULT false,
  id_check_deadline_at timestamptz,  -- filed_at + 5 minutes
  id_check_completed boolean DEFAULT false,
  id_check_result text,  -- Description of ID check outcome

  -- Resolution
  status protest_status NOT NULL DEFAULT 'filed',
  outcome protest_outcome,
  resolved_by uuid REFERENCES profiles(id),
  resolved_at timestamptz,
  resolution_notes text,

  -- Forfeit tracking
  forfeit_applied boolean DEFAULT false,
  original_home_score integer,
  original_away_score integer,
  forfeit_score_home integer,
  forfeit_score_away integer,

  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Add protest flag to games table
ALTER TABLE games ADD COLUMN is_protested boolean DEFAULT false;
ALTER TABLE games ADD COLUMN is_forfeited boolean DEFAULT false;
ALTER TABLE games ADD COLUMN forfeit_team_id uuid REFERENCES teams(id);

-- League protest settings
ALTER TABLE seasons ADD COLUMN protest_filing_deadline_period integer DEFAULT 2;  -- Must file before this period (default: before period 3)
ALTER TABLE seasons ADD COLUMN forfeit_score text DEFAULT '1-0';  -- Configurable forfeit score
ALTER TABLE seasons ADD COLUMN id_verification_window_minutes integer DEFAULT 5;

-- Indexes
CREATE INDEX idx_game_protests_game ON game_protests(game_id);
CREATE INDEX idx_game_protests_league_status ON game_protests(league_id, status);

-- RLS
ALTER TABLE game_protests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Captains can view own team protests" ON game_protests
  FOR SELECT USING (
    protesting_captain_id = auth.uid()
    OR protesting_team_id IN (SELECT id FROM teams WHERE captain_id = auth.uid())
    OR accused_team_id IN (SELECT id FROM teams WHERE captain_id = auth.uid())
  );
CREATE POLICY "League admins can manage protests" ON game_protests
  FOR ALL USING (league_id IN (
    SELECT league_id FROM league_memberships
    WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
  ));
```

### Downstream Impacts

- **High risk area: standings calculation.** Forfeited games must be handled in `calculate_standings` RPC. Two options:
  - (A) Update the RPC to check `is_forfeited` and use forfeit scores — **preferred, single source of truth**.
  - (B) Actually overwrite `home_score`/`away_score` when forfeit is applied (store originals in protest table) — simpler but destructive.
  - **Recommendation:** Option A. Keep original scores intact; standings RPC uses `CASE WHEN is_forfeited THEN forfeit_score ELSE actual_score END`.
- Playoff bracket generation must also respect forfeits.
- Game verification flow: protested games should show a warning banner during captain verification.
- Scorekeeper interface becomes slightly more complex — protest button must be visible but not disruptive to scoring flow.

### Implementation Notes

- **Filing window:** Protest can only be filed when `game.current_period < protest_filing_deadline_period` (default: before 3rd period). Enforced server-side.
- **ID verification window:** When protest is filed, `id_check_deadline_at = now() + 5 minutes`. Scorekeeper UI shows countdown timer. If ID check isn't completed by deadline, it's noted but protest still proceeds to admin review.
- **Forfeit application:** Admin resolves with `valid_forfeit` → system calls `applyForfeit()` which: sets `is_forfeited = true`, `forfeit_team_id`, stores original scores, sets forfeit scores per season config. Does NOT modify `home_score`/`away_score`.
- **Tiebreaker impact:** Forfeited games count as losses for forfeiting team. Forfeited GF/GA uses the forfeit score (e.g., 0-1), not the actual game score.
- Follow the suspension workflow pattern for the admin review flow.
- The scorekeeper PWA works offline — protest filing needs online connectivity (acceptable: protests are filed during games in arenas).

### Complexity: **L** (Large)

Estimated: ~8-10 days. New game lifecycle state, in-game captain UI, admin resolution workflow, forfeit automation with standings integration, plus notification templates.

---

## Feature 5: Multi-Metric Team Rebalancing Report

### What Exists Today

| Component | File | What It Does |
|-----------|------|-------------|
| Standings Data | `apps/league-builder/src/lib/standings/actions.ts` | `getStandings(seasonId)` — wins, losses, ties, points, GF, GA, goal diff per team |
| Standings Types | `apps/league-builder/src/lib/standings/types.ts` | `TeamStanding` with basic metrics |
| Division Health | `apps/league-builder/src/lib/actions/division-shuffle.ts` | `getDivisionHealthStats()` — avg points, avg GF/GA, std dev of goal diff, health score (good/warning/poor), outlier detection |
| Division Shuffle UI | `apps/league-builder/src/components/divisions/DivisionShuffleTool.tsx` | Visual tool with swap suggestions |
| Division Health Dashboard | `apps/league-builder/src/components/divisions/DivisionHealthDashboard.tsx` | Division-level health metrics display |
| Game Events | `packages/database/src/types.ts` | `game_events` with period, game_time_seconds, event_type — **needed for "close game" and "within 1 goal with 5 min left" calculations** |
| Player Stats | `packages/database/src/types.ts` | `player_stats` with goals, assists per player per season — **needed for "record without top scorer"** |
| Export Pattern | `apps/league-builder/src/lib/standings/types.ts` | `ExportFormat`, `ExportOptions` — CSV/PDF export infrastructure |
| Commissioner Role | `packages/database/src/types.ts` | `league_memberships.role` includes 'owner', 'admin' — commissioner maps to owner/admin |

### What Needs to Be Built

**New Files:**
| File | Purpose |
|------|---------|
| `apps/league-builder/src/lib/rebalancing/types.ts` | Types: `RebalancingMetric`, `TeamRebalancingScore`, `RebalancingReport`, `RebalancingRecommendation`, `CommissionerDecision` |
| `apps/league-builder/src/lib/rebalancing/metrics.ts` | Metric calculators: `calcGamesGainingPointsPct()`, `calcPointTotalVsDivision()`, `calcCloseGamePct()`, `calcGFGAVsDivision()`, `calcGAGFRatio()`, `calcLosses()`, `calcRecordWithoutTopScorer()` |
| `apps/league-builder/src/lib/rebalancing/report.ts` | Report generation: `generateRebalancingReport(seasonId)` — orchestrates all metrics, computes composite scores, generates move recommendations |
| `apps/league-builder/src/lib/rebalancing/queries.ts` | Advanced DB queries: close games (game events within 1 goal at 5 min mark), top scorer per team, team record excluding top scorer's goal games |
| `apps/league-builder/src/lib/actions/rebalancing.ts` | Server actions: `generateReport()`, `getReport()`, `approveRecommendation()`, `overrideRecommendation()`, `executeApprovedMoves()`, `exportReport()` |
| `apps/league-builder/src/components/rebalancing/RebalancingDashboard.tsx` | Main dashboard: generate report button, metric breakdown per team, recommendations, approve/override UI |
| `apps/league-builder/src/components/rebalancing/MetricCard.tsx` | Individual metric display card with team comparison |
| `apps/league-builder/src/components/rebalancing/RecommendationPanel.tsx` | Move recommendations with commissioner approve/override/reject |
| `apps/league-builder/src/components/rebalancing/TeamScoreRadar.tsx` | Radar chart showing team across all 7 metrics |
| `apps/league-builder/src/app/[locale]/dashboard/seasons/[seasonId]/rebalancing/page.tsx` | Rebalancing report page |
| `supabase/migrations/XXXXXXXX_add_rebalancing_tables.sql` | Migration for rebalancing tables |

**Modified Files:**
| File | Change |
|------|--------|
| `apps/league-builder/src/app/[locale]/dashboard/seasons/[seasonId]/layout.tsx` | Add "Rebalancing" nav item |
| `apps/league-builder/src/lib/actions/division-shuffle.ts` | `executeDivisionMoves()` accepts optional `rebalancing_report_id` to link moves to a report |

### DB Schema Changes

```sql
-- Rebalancing report snapshots
CREATE TABLE rebalancing_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  league_id uuid NOT NULL REFERENCES leagues(id) ON DELETE CASCADE,
  season_id uuid NOT NULL REFERENCES seasons(id) ON DELETE CASCADE,
  generated_at timestamptz DEFAULT now(),
  generated_by uuid NOT NULL REFERENCES profiles(id),

  -- Snapshot of all team scores (JSONB for flexibility during iteration)
  team_scores jsonb NOT NULL,
  -- [{teamId, teamName, divisionId, divisionName, metrics: {gainingPointsPct, pointsVsDivision, closeGamePct, gfGaVsDivision, gaGfRatio, losses, recordWithoutTopScorer}, compositeScore, rank}]

  -- Recommendations
  recommendations jsonb NOT NULL,
  -- [{teamId, fromDivisionId, toDivisionId, direction, reason, compositeScoreDelta}]

  -- Commissioner decisions
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'pending_review', 'approved', 'executed', 'archived')),
  reviewed_by uuid REFERENCES profiles(id),
  reviewed_at timestamptz,
  review_notes text,
  decisions jsonb,  -- [{recommendationIndex, decision: 'approve'|'override'|'reject', overrideDivisionId?, notes}]
  executed_at timestamptz,

  created_at timestamptz DEFAULT now()
);

-- Metric weight configuration per league
CREATE TABLE rebalancing_metric_weights (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  league_id uuid NOT NULL REFERENCES leagues(id) ON DELETE CASCADE,
  gaining_points_pct_weight numeric DEFAULT 1.0,
  points_vs_division_weight numeric DEFAULT 1.0,
  close_game_pct_weight numeric DEFAULT 1.0,
  gf_ga_vs_division_weight numeric DEFAULT 1.0,
  ga_gf_ratio_weight numeric DEFAULT 1.0,
  losses_weight numeric DEFAULT 1.0,
  record_without_top_scorer_weight numeric DEFAULT 1.0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(league_id)
);

-- Indexes
CREATE INDEX idx_rebalancing_reports_season ON rebalancing_reports(season_id, status);

-- RLS
ALTER TABLE rebalancing_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE rebalancing_metric_weights ENABLE ROW LEVEL SECURITY;

CREATE POLICY "League admins can manage reports" ON rebalancing_reports
  FOR ALL USING (league_id IN (
    SELECT league_id FROM league_memberships
    WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
  ));
CREATE POLICY "League admins can manage metric weights" ON rebalancing_metric_weights
  FOR ALL USING (league_id IN (
    SELECT league_id FROM league_memberships
    WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
  ));
```

### Downstream Impacts

- **Medium risk.** Report generation is read-only until commissioner approves moves. Execution reuses existing `executeDivisionMoves()`.
- Heavy queries: "close game %" requires scanning `game_events` for score state at specific game times. May need a materialized view or denormalized column on games.
- "Record without top scorer" requires identifying each team's top scorer, then recalculating win/loss for games where that player didn't score — computationally expensive. Consider caching.
- If Feature 2 (Point Carry) is implemented first, executed moves from rebalancing should trigger point carry calculations.

### Implementation Notes

**Metric Definitions (7 metrics):**

1. **Games Gaining Points %** — `(games with ≥ 1 point) / total_games * 100`. Uses standings data (wins + ties as "gaining points" games). Higher = stronger team → candidate for move up.

2. **Point Total vs Division** — `team_points / division_avg_points`. Ratio > 1.0 = above average. Significantly above = move up candidate; significantly below = move down candidate.

3. **Close Game %** — Games where the score was within 1 goal with ≤ 5 minutes remaining in the final period. Requires querying `game_events` to reconstruct score state at `(period = max_period AND game_time_seconds ≤ 300)`. High close game % = team is competitive in their division (good placement).

4. **GF/GA vs Division** — `team_gf / division_avg_gf` and `team_ga / division_avg_ga`. Combined ratio indicates offensive/defensive strength relative to division.

5. **GA/GF %** — `goals_against / goals_for * 100`. Lower = better defense-to-offense ratio. Very low = dominant team.

6. **Losses** — Raw loss count. Fewer losses in a lower division = candidate for move up. Many losses in upper division = candidate for move down.

7. **Record Without Top Scorer** — Recalculate W-L-T excluding games where the team's top scorer (by goals) scored. If record collapses, team is dependent on one player — less suitable for upper division.

**Close Game % Query Strategy:**
- Option A: RPC function that reconstructs score at each moment by scanning game_events — accurate but slow.
- Option B: Add `was_close_game` boolean to `games` table, computed by trigger when game completes — fast reads, slightly more schema.
- **Recommendation:** Option B for production performance. Compute on game completion via trigger.

**Record Without Top Scorer Query Strategy:**
- Get top scorer per team from `player_stats` (WHERE `stat_type = 'goals'`, GROUP BY player_id, ORDER BY sum DESC LIMIT 1).
- For each team, re-query games: find games where top scorer has ≥ 1 goal in `game_events`, then compute W-L-T excluding those goal contributions (not excluding the game, excluding the scorer's goals from the team total).
- Actually, re-reading the spec: "record without top scorer" likely means W-L-T in games where the top scorer did NOT play or did NOT score. Clarify with product.
- Either way, this is a complex join. Pre-compute or use an RPC.

**Composite Score:**
- Normalize each metric to 0-100 scale within the division.
- Apply configurable weights from `rebalancing_metric_weights`.
- Composite = weighted average of normalized metrics.
- Rank teams by composite score within their division.
- Recommend moves for teams whose composite score is significantly above/below division median.

**Commissioner Workflow:**
- Admin generates report → status `draft`.
- Admin submits for review → status `pending_review`.
- Commissioner (owner) reviews each recommendation: approve, override (change target division), or reject.
- Commissioner finalizes → status `approved`.
- Admin executes → calls `executeDivisionMoves()` with moves from approved decisions → status `executed`.

### Complexity: **XL** (Extra Large)

Estimated: ~12-15 days. Seven metric calculators (two require complex event-level queries), composite scoring, report generation/storage, commissioner approval workflow, integration with division shuffle execution, radar chart visualization.

---

## Recommended Build Order

| Order | Feature | Rationale |
|-------|---------|-----------|
| **1** | Pre-Playoff Ineligible Player Auto-Email | Lowest risk, highest immediate value. All infrastructure exists. Quick win that validates the email pipeline for other features. |
| **2** | Point Carry Rules for Team Movement | Builds on standings infrastructure. Creates the `team_division_moves` table that Feature 5 also needs. Medium complexity with clear scope. |
| **3** | Exemption History + Cooldown Tracking | Independent domain. No dependency on other features, but Feature 1's eligibility alerts should exclude exempt players (easy to add after). Follows the suspension review pattern. |
| **4** | Player Protest Workflow | Larger scope but self-contained. The forfeit logic needs standings integration (which Feature 2 may have already touched). Admin review pattern is established by Feature 3. |
| **5** | Multi-Metric Rebalancing Report | Depends on clean standings data (Feature 2's carry rules), and benefits from `team_division_moves` tracking. Most complex, highest risk, benefits from all prior infrastructure. |

### Dependency Graph

```
Feature 1 (Email Alerts) ──────────────────────────────────────┐
    │                                                           │
    ▼                                                           │
Feature 3 (Exemptions) ──► updates eligibility alerts           │
    │                                                           │
Feature 2 (Point Carry) ──► team_division_moves table ──────────┤
    │                                                           │
Feature 4 (Protests) ──► forfeit impacts standings ─────────────┤
    │                                                           │
    └──────────────────► all feed into ─────────────────────────┤
                                                                ▼
                                              Feature 5 (Rebalancing Report)
```

---

## Shared Infrastructure

These components serve multiple features and should be built as reusable pieces:

| Component | Used By | Description |
|-----------|---------|-------------|
| **Admin Review Workflow Pattern** | Features 3, 4, 5 | Generic `pending → under_review → approved/denied` state machine with reviewer tracking. Already exists in suspensions — extract as shared pattern. |
| **Notification Template Factory** | Features 1, 3, 4 | Base template + league branding already exists. Each feature adds 1-2 templates following the same pattern. |
| **Division Movement Audit Trail** | Features 2, 5 | `team_division_moves` table records all movements. Feature 2 creates it; Feature 5 reads and writes to it. |
| **Enhanced Game Event Queries** | Features 4, 5 | Close game detection (Feature 5) and protest period validation (Feature 4) both need game-event-level queries. Build a shared `game-event-queries.ts` utility. |
| **Commissioner Approval UI Pattern** | Features 4, 5 | Protest resolution and rebalancing approval share the same UX: list of items, per-item approve/reject/override, bulk finalize. Build as a generic `<ApprovalQueue>` component. |
| **Cross-Season Player Query** | Features 3, 5 | Exemption cooldown and rebalancing both need to query player data across multiple seasons. Build a `getPlayerCrossSeasonData()` utility. |

---

*Generated 2026-03-20. Refresh after significant codebase changes.*

---

## Future Feature Ideas (Backlog)

### 6. "Help a Kid Play" Checkout Donation + Badge
- **Concept:** At checkout (player registration payment), ask players to contribute $5 towards helping a local kid play in their local hockey league. Pure feel-good charity angle for BLH.
- **Badge:** If a player donates, they receive a profile badge showing they helped a kid play hockey (e.g., "Community Champion" or "🏒 Helped a Kid Play").
- **Tournament angle:** BLH could also host a tournament that raises money for kids to play hockey — ties into the same brand identity.
- **Status:** Idea only. No design or implementation yet.
- **Added:** 2026-04-07

### 7. League Fee Financing via Stripe (Capital / Financing)
- **Concept:** Use Stripe's financing/capital capabilities to front 50%+ of a league's collected fees so the league can pay for administration, ice rentals, etc. without chasing players for payments. BLH takes on the collection role from players, and in return takes a percentage.
- **Value prop for leagues:** Cash flow certainty — they get their money upfront. BLH handles the collections headache.
- **Revenue model for BLH:** Percentage of total collected fees (on top of normal transaction processing).
- **Risk:** BLH assumes collection risk on player payments. Need to evaluate Stripe Capital / Stripe Issuing / custom financing terms.
- **Status:** Idea only. Needs Stripe product research to see what's actually available.
- **Added:** 2026-04-07
