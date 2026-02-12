# HockeyLifeHL Mobile App - Implementation Plan

## Context

Players currently access HockeyLifeHL via web browser. The goal is to build a **native mobile app for iOS + Android** (modeled after the Brodie League basketball app) that gives players a seamless, all-in-one experience: login, view all leagues/teams, standings, stats, schedules, payments, player profiles, team logos — everything on the website, fully replicated with a polished mobile UX.

**MVP includes all features**: core league data, payments, push notifications, AND social/gamification (team chat, shareable cards, badges). No features are deferred — this is a full-featured launch.

A `player-companion` PWA scaffold already exists at `apps/player-companion/` with offline IndexedDB caching, bottom nav, and basic pages. However, a native Expo (React Native) app was chosen for App Store/Play Store distribution, reliable push notifications, native navigation gestures, and the premium feel that Brodie League delivers.

---

## Recommended Approach: Expo (React Native) in the Monorepo

### Why Expo over enhancing the PWA
- **App Store/Play Store distribution** (Brodie League is a store app)
- **Reliable push notifications** via native APNs/FCM (Web Push is unreliable on iOS)
- **Native UX** — swipe gestures, haptic feedback, bottom sheets, shared element transitions
- **Biometric login** — Face ID / Touch ID for quick access
- **Better performance** — native SQLite for offline, persistent Supabase client

### Why Expo specifically
- React 19 + TypeScript 5 compatible (matches existing stack)
- First-class Turborepo/pnpm workspace support — add `apps/mobile` as workspace member
- Expo Router uses file-based routing matching Next.js App Router conventions
- EAS Build/Submit handles App Store & Play Store builds without native toolchains
- Over-the-air JS updates via EAS Update (skip app store review for non-native changes)

### What gets reused from existing codebase

| Asset | Strategy |
|---|---|
| `packages/database/src/types.ts` (260KB) | Import directly — same Supabase types |
| `apps/league-sites/src/lib/data.ts` | Extract queries into shared `packages/data/` |
| `apps/league-sites/src/lib/types.ts` | Import domain types directly |
| `apps/player-companion/src/lib/offline/db.ts` | Port cache-first pattern to `expo-sqlite` |
| `packages/auth/` | Extend for mobile (SecureStore token persistence) |
| `packages/ui/` | Cannot reuse (web-only Radix). Create `packages/ui-native/` |

---

## API Layer Strategy

**Direct Supabase client + thin Edge Functions** (no REST API gateway needed):

- Use `@supabase/supabase-js` directly in mobile (same as web apps). RLS policies protect data.
- Add Supabase Edge Functions only for server-side operations:
  - `mobile-push-register` — register APNs/FCM device tokens
  - `mobile-push-send` — triggered by DB triggers to send push
  - Stripe operations — reuse existing API routes on league-builder deployment

---

## Navigation Architecture (5 Tabs, Brodie League-style)

```
Tab Bar: [Home] [Leagues] [Schedule] [Stats] [Profile]
```

### Tab 1: Home (Activity Feed)
- Next game countdown card
- Recent results carousel (story-style cards with scores + top performers)
- Payment due banners
- League announcements
- Career-high / badge notifications

### Tab 2: Leagues (Hub)
- List of player's leagues with logos
- Drill into any league for:
  - **Standings** — full standings table
  - **Teams** — team grid with logos, drill into team roster/stats
  - **Schedule** — league schedule with week picker
  - **Scores** — recent game results
  - **Stats** — skater + goalie leaders, leaderboards
  - **Players** — player profiles with badges, career stats, game log
  - **Games** — game detail with stat comparison
  - **News** — league articles
  - **Gallery** — photo albums

### Tab 3: Schedule (My Games)
- Upcoming games across ALL leagues
- Month selector, grouped by date
- RSVP (In/Maybe/Out) per game
- Calendar export (iCal)

### Tab 4: Stats (My Stats)
- Hero stat card (points)
- Season selector
- Stat grid (G, A, GP, PIM, +/-)
- Points trend chart
- Game log
- Career stats across seasons
- Badges & achievements

### Tab 5: Profile
- Avatar with edit (camera/gallery)
- Name, email, jersey number, position
- Team memberships across leagues
- Payment history
- Notification preferences
- App settings, sign out

### Modal Screens
- Login (email/password + magic link)
- Game check-in / RSVP
- Payment checkout (Stripe via WebView)
- Team chat

---

## Key Technical Decisions

| Decision | Choice | Rationale |
|---|---|---|
| Framework | Expo SDK 52+ (React Native) | Store distribution, native push, React/TS familiarity |
| Platforms | iOS + Android | Single Expo codebase, EAS builds both |
| Navigation | Expo Router v4 | File-based routing matching Next.js conventions |
| Data Fetching | TanStack Query + Supabase client | Cache management, background refetch, offline |
| Offline | expo-sqlite | Port existing IndexedDB cache-first pattern |
| Styling | NativeWind (Tailwind for RN) | Consistency with web Tailwind usage |
| Push | expo-notifications + Edge Functions | Native APNs/FCM |
| Images | expo-image | Disk/memory caching, blurhash placeholders |
| Payments | Stripe Checkout via WebView | Exempt from IAP rules (physical services) |
| Auth | @supabase/supabase-js + SecureStore | JWT persistence, biometric unlock |
| Real-time | Supabase Realtime channels | Already used in web, same API |
| Build/Deploy | EAS Build + EAS Submit | Cloud builds, store submission, OTA updates |

---

## New Database Migration

```sql
-- Push notification device tokens
CREATE TABLE push_device_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  device_token TEXT NOT NULL,
  platform TEXT NOT NULL CHECK (platform IN ('ios', 'android')),
  app_version TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  is_active BOOLEAN DEFAULT true,
  UNIQUE(user_id, device_token)
);

ALTER TABLE push_device_tokens ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own tokens" ON push_device_tokens
  FOR ALL USING (auth.uid() = user_id);

-- Extend notification preferences for push channels
ALTER TABLE user_notification_preferences
  ADD COLUMN IF NOT EXISTS push_enabled BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS push_game_reminders BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS push_score_updates BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS push_schedule_changes BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS push_team_messages BOOLEAN DEFAULT true;
```

---

## File Structure: `apps/mobile/`

```
apps/mobile/
  app.json                    # Expo config
  eas.json                    # EAS Build config
  package.json
  tsconfig.json
  tailwind.config.ts          # NativeWind
  app/
    _layout.tsx               # Root layout + providers
    (auth)/
      login.tsx
      forgot-password.tsx
    (tabs)/
      _layout.tsx             # Tab navigator
      home/index.tsx
      leagues/
        index.tsx
        [leagueId]/
          index.tsx           # League home
          standings.tsx
          schedule.tsx
          scores.tsx
          stats/index.tsx
          stats/goalies.tsx
          teams/index.tsx
          teams/[teamId].tsx
          players/[playerId].tsx
          games/[gameId].tsx
          news/index.tsx
          gallery/index.tsx
      schedule/index.tsx      # My games across all leagues
      stats/index.tsx         # My personal stats
      profile/
        index.tsx
        edit.tsx
        payments.tsx
        notifications.tsx
        settings.tsx
  src/
    components/
      home/
        CountdownCard.tsx     # Next game countdown
        RecentResults.tsx     # Story-style result cards
        QuickActions.tsx      # Quick action buttons
      league/
        StandingsTable.tsx
        ScheduleList.tsx
        ScoreTicker.tsx
        TeamGrid.tsx
      game/
        GameCard.tsx
        GameDetail.tsx
        CheckinButtons.tsx    # RSVP In/Maybe/Out
      player/
        PlayerHeader.tsx
        BadgesSection.tsx
        GameLog.tsx
      stats/
        HeroStatCard.tsx
        StatGrid.tsx
        TrendChart.tsx
      team/
        RosterList.tsx
        PlayerRow.tsx
      profile/
        AvatarEditor.tsx
        PaymentHistory.tsx
      chat/
        TeamChat.tsx          # Real-time team messaging
        MessageBubble.tsx
      shared/
        TeamLogo.tsx          # Port of league-sites TeamLogo for RN
        EmptyState.tsx
        Skeleton.tsx
        ErrorCard.tsx
        ShareCard.tsx         # Shareable game result cards
      nav/
        TabBar.tsx            # Custom tab bar
    lib/
      supabase/
        client.ts             # RN Supabase client with SecureStore
      auth/
        provider.tsx          # Auth context
        session.ts            # SecureStore session management
        biometric.ts          # Face ID / Touch ID
      offline/
        database.ts           # expo-sqlite setup
        sync.ts               # Background sync manager
        cache.ts              # Cache metadata with TTL
      push/
        register.ts           # Device token registration
        handler.ts            # Notification tap handlers
      payments/
        checkout.ts           # Stripe Checkout WebView helpers
      realtime/
        channels.ts           # Supabase Realtime subscriptions
    hooks/
      useAuth.ts
      useLeagues.ts
      useGames.ts
      useStats.ts
      usePlayerProfile.ts
      useRealtime.ts
      useOfflineSync.ts
      useTeamChat.ts
    theme/
      colors.ts               # Gold/neutral palette from BHL brand kit
      typography.ts
```

---

## New Shared Package: `packages/data/`

Extract query logic from `apps/league-sites/src/lib/data.ts` into a shared package usable by both web and mobile:

```
packages/data/src/
  queries/
    leagues.ts       # getLeague, getLeaguesByPlayer, getLeagueTheme
    teams.ts         # getTeam, getTeamRoster, getTeamStandings
    games.ts         # getGames, getUpcomingGames, getGamePreview
    stats.ts         # getPlayerStats, getLeaderboards, getGameLog
    players.ts       # getPlayerProfile, getPlayerBadges
    payments.ts      # getPaymentStatus, getOutstandingBalance
    notifications.ts # getNotifications, markRead
  hooks/
    useLeague.ts
    usePlayerProfile.ts
    useGames.ts
    useStats.ts
  types.ts           # Re-export from league-sites types
  index.ts
```

---

## Phased Implementation

### Phase 1: Foundation (Weeks 1-3)
**Goal**: Working app with auth, home feed, and single-league view.

- [ ] Expo project scaffold in `apps/mobile/`
- [ ] Turborepo workspace integration (`pnpm-workspace.yaml`, `turbo.json`)
- [ ] NativeWind styling with brand colors (gold/neutral from `BHL-brand-kit.md`)
- [ ] Create `packages/data/` shared query layer (extract from `league-sites/src/lib/data.ts`)
- [ ] Supabase client for React Native with SecureStore token persistence
- [ ] Auth screens (login, forgot password)
- [ ] Tab navigation (5 tabs)
- [ ] Home tab: next game countdown, recent results
- [ ] Leagues tab: list player's leagues with logos
- [ ] League detail: standings, teams, schedule (read-only)
- [ ] Image loading with `expo-image` (team logos, player avatars from Supabase Storage)
- [ ] Profile tab: view/edit profile, avatar upload

### Phase 2: Full Feature Parity (Weeks 4-6)
**Goal**: Everything visible on the website is replicated.

- [ ] Game detail screen (game preview, stats comparison)
- [ ] Player profiles (badges, career stats, game log)
- [ ] Team pages with full rosters and team stats
- [ ] Scores page, news/articles, gallery
- [ ] Stats tab: season stats, game log, trend chart
- [ ] Game check-in (RSVP: In/Maybe/Out)
- [ ] Team join requests
- [ ] Payment outstanding banners + Stripe Checkout via WebView
- [ ] Payment history screen
- [ ] Offline caching with expo-sqlite (port IndexedDB patterns from player-companion)
- [ ] Calendar export (share .ics file)
- [ ] Background sync (expo-background-fetch, refresh every 15 min)

### Phase 3: Brodie League Features (Weeks 7-9)
**Goal**: Social, gamification, and notification polish.

- [ ] Push notification setup (APNs + FCM via EAS)
- [ ] Database migration for `push_device_tokens` table
- [ ] Supabase Edge Functions for push sending
- [ ] Device token registration
- [ ] Live score updates via Supabase Realtime
- [ ] Game reminder scheduling (local notifications 24h/2h before)
- [ ] Notification preferences screen
- [ ] Team chat (using `team_messages` table + Supabase Realtime)
- [ ] Social feed (game results as shareable story-style cards)
- [ ] Native share sheet (share to Instagram/Twitter/etc.)
- [ ] Badges & achievements display (using `player_badges` table)
- [ ] Career-high detection + push notification
- [ ] Leaderboard views (global/league/division)
- [ ] Achievement unlock animations (Framer Motion / Reanimated)
- [ ] Biometric login (Face ID / Touch ID)

### Phase 4: Launch (Week 10+)
**Goal**: App Store & Play Store submission and beta testing.

- [ ] App Store screenshots, description, metadata
- [ ] Performance optimization (list virtualization, image caching tuning)
- [ ] Accessibility audit
- [ ] EAS Build for iOS + Android
- [ ] TestFlight (iOS) / Internal Testing track (Android) beta distribution
- [ ] Bug fixes from beta testing
- [ ] App Store & Play Store submission (EAS Submit)
- [ ] OTA update pipeline via EAS Update
- [ ] Analytics integration (Mixpanel or Amplitude)

---

## Critical Files Reference

### Files to extract/port from:
- `apps/league-sites/src/lib/data.ts` — 40+ query functions (main extraction target for `packages/data/`)
- `apps/league-sites/src/lib/types.ts` — all domain type definitions
- `apps/league-sites/src/hooks/usePlayerProfile.ts` — canonical Supabase data-fetching pattern
- `apps/player-companion/src/lib/offline/db.ts` — IndexedDB cache-first architecture (port to expo-sqlite)
- `apps/player-companion/src/lib/push/notifications.ts` — notification type definitions
- `apps/player-companion/src/components/nav/BottomNav.tsx` — nav structure reference

### Files to import directly:
- `packages/database/src/types.ts` — 260KB auto-generated Supabase types (source of truth)

### Files to modify:
- `pnpm-workspace.yaml` — add `apps/mobile` workspace member (already includes `apps/*`)
- `turbo.json` — add mobile build/dev tasks

### Component patterns to port (league-sites):
- `components/shared/TeamLogo.tsx` — team logo with initial fallback
- `components/shared/ProgressBar.tsx` — stats comparison bars
- `components/ScoreTicker.tsx` — horizontal scrolling recent games
- `components/schedule/ScheduleTable.tsx` — schedule display
- `components/schedule/WeekPicker.tsx` — week navigation
- `components/game/GamePreviewHeader.tsx` — game detail header
- `components/StandingsTable.tsx` — standings display

---

## Verification / Testing Plan

1. **Auth flow**: Login with existing Supabase credentials, verify JWT persistence via SecureStore, test biometric unlock
2. **Data loading**: Verify all league/team/player/game data loads correctly against production Supabase
3. **Images**: Confirm team logos and player avatars load from Supabase Storage with caching
4. **Offline**: Toggle airplane mode, verify cached data displays, verify sync on reconnect
5. **Push**: Send test notification via Edge Function, verify delivery on both iOS and Android
6. **Payments**: Complete Stripe Checkout flow via WebView, verify deep link redirect back to app
7. **Real-time**: Start a game in league-builder, verify live score update on mobile
8. **Team chat**: Send message from web, verify real-time delivery on mobile
9. **Share**: Generate shareable game result card, test native share sheet
10. **Build**: EAS Build for iOS simulator + Android emulator, then TestFlight/Internal track

---

## Brodie League Features Checklist (Parity Target)

- [x] Player profiles with stats tracking — covered in Phase 1-2
- [x] Schedules and game info — covered in Phase 1
- [x] League standings — covered in Phase 1
- [x] Team rosters — covered in Phase 1-2
- [x] In-app registration/payments — covered in Phase 2
- [x] Push notifications — covered in Phase 3
- [x] Direct messaging / team chat — covered in Phase 3
- [x] Social feed — covered in Phase 3
- [x] Badges and achievements — covered in Phase 3
- [x] Leaderboards — covered in Phase 3
- [x] Shareable content — covered in Phase 3
- [x] Story-style game result notifications — covered in Phase 3
- [ ] Highlight sharing (video) — future enhancement
- [ ] Spotify integration — future enhancement (low priority)
- [ ] Player archetypes — future enhancement
