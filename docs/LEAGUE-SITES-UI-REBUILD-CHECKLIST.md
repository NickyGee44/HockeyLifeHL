# League Sites UI Rebuild Checklist

<!-- GENERATED from apps/league-sites/src/rebuild/route-manifest.json. Do not edit route rows by hand. -->

- Manifest version: `1.1.0`
- Production baseline: `940f79d6ea4b5d5c55fdafe61d477547ea1680ff`
- Page routes: **56**
- Preserved route handlers: **11**

## Route counts

| Category | Count |
| --- | ---: |
| Public league content (`public-league`) | 24 |
| Player account (`player-account`) | 6 |
| Captain tools (`captain`) | 7 |
| Goalie flows (`goalie`) | 3 |
| Scorekeeper and game verification (`scorekeeper`) | 5 |
| Referee portal (`referee`) | 2 |
| Registration (`registration`) | 2 |
| Platform and legal (`legal-platform`) | 7 |
| **Total** | **56** |

## Statuses

- `not-started` — Inventory captured; visual and interaction rebuild has not started.
- `in-progress` — Actively being rebuilt on this branch.
- `review` — Implementation complete and awaiting visual, functional, and responsive acceptance.
- `complete` — Acceptance criteria verified and evidence recorded.
- `blocked` — Cannot proceed until the documented dependency or decision is resolved.

## Global TODO contracts

### [ ] `ROUTE-COMPATIBILITY` — Route compatibility

- **Status:** `review`
- **Contract:** Keep all 56 page paths, dynamic parameter names, deep links, redirects, and custom-domain/subdomain behavior compatible.
- **Evidence:** Implementation is complete; status is pending final integrated build, independent review, and preview/browser acceptance.

### [ ] `TENANT-SCOPE` — Tenant data isolation

- **Status:** `review`
- **Contract:** Every league-derived read/write remains scoped to the resolved league and existing RLS/server authorization.
- **Evidence:** Implementation is complete; status is pending final integrated build, independent review, and preview/browser acceptance.

### [ ] `SUPABASE-AUTH` — Authentication recovery and sessions

- **Status:** `review`
- **Contract:** Preserve login, signup, recovery, callback, session refresh, and safe redirect behavior.
- **Evidence:** Implementation is complete; status is pending final integrated build, independent review, and preview/browser acceptance.

### [ ] `ROLE-AUTHORIZATION` — Role authorization

- **Status:** `review`
- **Contract:** Player, captain, scorekeeper, and referee views enforce server-authoritative role and assignment boundaries.
- **Evidence:** Implementation is complete; status is pending final integrated build, independent review, and preview/browser acceptance.

### [ ] `TOKEN-SESSION` — Token portals

- **Status:** `review`
- **Contract:** Token validation, expiry, rate limiting, cookie/session scope, replay protection, and noindex metadata remain intact.
- **Evidence:** Implementation is complete; status is pending final integrated build, independent review, and preview/browser acceptance.

### [ ] `LEAGUE-THEME` — League theming

- **Status:** `review`
- **Contract:** Brand colours, logos, banners, template variants, light/dark behavior, and safe fallbacks remain configurable per league.
- **Evidence:** Implementation is complete; status is pending final integrated build, independent review, and preview/browser acceptance.

### [ ] `WEBSITE-EDITOR-VISIBILITY` — Website editor compatibility

- **Status:** `review`
- **Contract:** Visible pages, custom navigation, preview postMessage updates, registration CTAs, ticker, sponsors, and custom content honor editor settings.
- **Evidence:** Implementation is complete; status is pending final integrated build, independent review, and preview/browser acceptance.

### [ ] `PAYMENT-AND-WAIVER-INTEGRITY` — Payments and waivers

- **Status:** `review`
- **Contract:** Server-calculated prices, Stripe states, signed waiver versions, idempotency, and ownership checks remain authoritative.
- **Evidence:** Implementation is complete; status is pending final integrated build, independent review, and preview/browser acceptance.

## Shared/global requirements

- [ ] `GLOBAL-SHELL` — **League shell:** Header, desktop/mobile navigation, season/division context, score ticker, sponsors, footer/dock, account entry, announcements, and registration CTA are redesigned consistently. (`review`)
  - **Evidence:** Implementation is complete; status is pending final integrated build, independent review, and preview/browser acceptance.
- [ ] `RESPONSIVE` — **Responsive behavior:** Phone, tablet, and desktop layouts support dense hockey data without clipped controls or inaccessible hover-only actions. (`review`)
  - **Evidence:** Implementation is complete; status is pending final integrated build, independent review, and preview/browser acceptance.
- [ ] `A11Y` — **Accessibility:** Keyboard navigation, focus order, labels, contrast, reduced motion, semantic tables, dialogs, and status announcements meet WCAG-oriented acceptance. (`review`)
  - **Evidence:** Implementation is complete; status is pending final integrated build, independent review, and preview/browser acceptance.
- [ ] `SYSTEM-STATES` — **System states:** Every route deliberately covers loading, empty, partial, error, offline where applicable, unauthenticated, unauthorized, expired, subscription, and success states. (`review`)
  - **Evidence:** Implementation is complete; status is pending final integrated build, independent review, and preview/browser acceptance.
- [ ] `SEO-PWA` — **SEO and PWA:** League-aware metadata, canonical/social images, structured data, sitemap/robots rules, manifest/install flows, and private-route noindex behavior are preserved. (`review`)
  - **Evidence:** Implementation is complete; status is pending final integrated build, independent review, and preview/browser acceptance.
- [ ] `OBSERVABILITY` — **Analytics and diagnostics:** Consent-gated analytics, league attribution, Sentry capture, and bug-report context return without leaking personal or tenant data. (`review`)
  - **Evidence:** Implementation is complete; status is pending final integrated build, independent review, and preview/browser acceptance.
- [ ] `TIMEZONE-LOCALE` — **Timezone and locale:** Dates and game times use each league timezone and copy remains ready for English/French requirements. (`review`)
  - **Evidence:** Implementation is complete; status is pending final integrated build, independent review, and preview/browser acceptance.
- [ ] `PERFORMANCE` — **Performance:** Images, live updates, tables, fonts, and animations are responsive and avoid unnecessary tenant-wide data loads. (`review`)
  - **Evidence:** Implementation is complete; status is pending final integrated build, independent review, and preview/browser acceptance.

## Public league content (24)

<a id="ls-leagueslug-about"></a>
### [ ] `LS-LEAGUESLUG-ABOUT` — About the League

- **Route:** `/[leagueSlug]/about`
- **Source page:** `src/app/[leagueSlug]/about/page.tsx`
- **Audience:** Public league visitors, players, teams, families, and fans
- **Status:** `review`
- **Required visible sections:**
  - League identity and description
  - Staff/contact details
  - Rules and social links
- **Interactions:**
  - Open contact/social links
  - Expand or navigate rules
- **Features to preserve:**
  - Website-editor content
  - Safe rich content and visibility settings
- **Required states:**
  - **loading:** Use a stable skeleton or progress state that preserves layout and blocks duplicate actions.
  - **empty:** Explain why no records are available and provide the next valid action without fabricating data.
  - **error:** Show a recoverable message with retry/back navigation; never expose internal or tenant data.
  - **auth:** Remain usable for guests; authenticated enhancements must not hide public content.
  - **subscription:** Preserve existing premium/add-on gates and upsell boundaries; never unlock by presentation state alone.
  - **mobile:** Support narrow screens, touch targets of at least 44px, no horizontal clipping, and readable dense data.
  - **accessibility:** Provide semantic headings, labelled controls, keyboard operation, visible focus, and announced status/errors.
  - **seo:** Provide league-aware canonical metadata, social previews, and structured content where present.
- **TODO contracts:** `ROUTE-COMPATIBILITY`, `TENANT-SCOPE`, `WEBSITE-EDITOR-VISIBILITY`, `LEAGUE-THEME`
- **Source-contract test:** `node --test apps/league-sites/scripts/__tests__/public-editorial-glass.test.mjs`
- **Acceptance evidence:** Implementation is complete; status is pending final integrated build, independent review, and preview/browser acceptance.

<a id="ls-leagueslug-contact"></a>
### [ ] `LS-LEAGUESLUG-CONTACT` — Contact the League

- **Route:** `/[leagueSlug]/contact`
- **Source page:** `src/app/[leagueSlug]/contact/page.tsx`
- **Audience:** Public league visitors, players, teams, families, and fans
- **Status:** `review`
- **Required visible sections:**
  - League contact details
  - Contact form
  - Submission confirmation
- **Interactions:**
  - Validate and submit inquiry
  - Use published contact links
- **Features to preserve:**
  - Spam-safe submission
  - League inbox routing
- **Required states:**
  - **loading:** Use a stable skeleton or progress state that preserves layout and blocks duplicate actions.
  - **empty:** Explain why no records are available and provide the next valid action without fabricating data.
  - **error:** Show a recoverable message with retry/back navigation; never expose internal or tenant data.
  - **auth:** Remain usable for guests; authenticated enhancements must not hide public content.
  - **subscription:** Preserve existing premium/add-on gates and upsell boundaries; never unlock by presentation state alone.
  - **mobile:** Support narrow screens, touch targets of at least 44px, no horizontal clipping, and readable dense data.
  - **accessibility:** Provide semantic headings, labelled controls, keyboard operation, visible focus, and announced status/errors.
  - **seo:** Provide league-aware canonical metadata, social previews, and structured content where present.
- **TODO contracts:** `ROUTE-COMPATIBILITY`, `TENANT-SCOPE`, `WEBSITE-EDITOR-VISIBILITY`, `LEAGUE-THEME`
- **Source-contract test:** `node --test apps/league-sites/scripts/__tests__/public-editorial-glass.test.mjs`
- **Acceptance evidence:** Implementation is complete; status is pending final integrated build, independent review, and preview/browser acceptance.

<a id="ls-leagueslug-events"></a>
### [ ] `LS-LEAGUESLUG-EVENTS` — League Events

- **Route:** `/[leagueSlug]/events`
- **Source page:** `src/app/[leagueSlug]/events/page.tsx`
- **Audience:** Public league visitors, players, teams, families, and fans
- **Status:** `review`
- **Required visible sections:**
  - Event calendar/list
  - Event cards and details
  - Date/status filters
- **Interactions:**
  - Change date/view
  - Open event details
- **Features to preserve:**
  - League timezone
  - Past/upcoming/cancelled states
- **Required states:**
  - **loading:** Use a stable skeleton or progress state that preserves layout and blocks duplicate actions.
  - **empty:** Explain why no records are available and provide the next valid action without fabricating data.
  - **error:** Show a recoverable message with retry/back navigation; never expose internal or tenant data.
  - **auth:** Remain usable for guests; authenticated enhancements must not hide public content.
  - **subscription:** Preserve existing premium/add-on gates and upsell boundaries; never unlock by presentation state alone.
  - **mobile:** Support narrow screens, touch targets of at least 44px, no horizontal clipping, and readable dense data.
  - **accessibility:** Provide semantic headings, labelled controls, keyboard operation, visible focus, and announced status/errors.
  - **seo:** Provide league-aware canonical metadata, social previews, and structured content where present.
- **TODO contracts:** `ROUTE-COMPATIBILITY`, `TENANT-SCOPE`, `WEBSITE-EDITOR-VISIBILITY`, `LEAGUE-THEME`
- **Source-contract test:** `node --test apps/league-sites/scripts/__tests__/public-editorial-glass.test.mjs`
- **Acceptance evidence:** Implementation is complete; status is pending final integrated build, independent review, and preview/browser acceptance.

<a id="ls-leagueslug-gallery-albumid"></a>
### [ ] `LS-LEAGUESLUG-GALLERY-ALBUMID` — Gallery Album

- **Route:** `/[leagueSlug]/gallery/[albumId]`
- **Source page:** `src/app/[leagueSlug]/gallery/[albumId]/page.tsx`
- **Audience:** Public league visitors, players, teams, families, and fans
- **Status:** `review`
- **Required visible sections:**
  - Album title/details
  - Responsive photo grid
  - Accessible lightbox
- **Interactions:**
  - Open/close/navigate lightbox
  - Return to gallery
- **Features to preserve:**
  - Published-photo visibility
  - Keyboard and swipe navigation
- **Required states:**
  - **loading:** Use a stable skeleton or progress state that preserves layout and blocks duplicate actions.
  - **empty:** Explain why no records are available and provide the next valid action without fabricating data.
  - **error:** Show a recoverable message with retry/back navigation; never expose internal or tenant data.
  - **auth:** Remain usable for guests; authenticated enhancements must not hide public content.
  - **subscription:** Preserve existing premium/add-on gates and upsell boundaries; never unlock by presentation state alone.
  - **mobile:** Support narrow screens, touch targets of at least 44px, no horizontal clipping, and readable dense data.
  - **accessibility:** Provide semantic headings, labelled controls, keyboard operation, visible focus, and announced status/errors.
  - **seo:** Provide league-aware canonical metadata, social previews, and structured content where present.
- **TODO contracts:** `ROUTE-COMPATIBILITY`, `TENANT-SCOPE`, `WEBSITE-EDITOR-VISIBILITY`, `LEAGUE-THEME`
- **Source-contract test:** `node --test apps/league-sites/scripts/__tests__/public-editorial-glass.test.mjs`
- **Acceptance evidence:** Implementation is complete; status is pending final integrated build, independent review, and preview/browser acceptance.

<a id="ls-leagueslug-gallery"></a>
### [ ] `LS-LEAGUESLUG-GALLERY` — Photo Gallery

- **Route:** `/[leagueSlug]/gallery`
- **Source page:** `src/app/[leagueSlug]/gallery/page.tsx`
- **Audience:** Public league visitors, players, teams, families, and fans
- **Status:** `review`
- **Required visible sections:**
  - Featured/recent photos
  - Album grid
  - Empty-gallery guidance
- **Interactions:**
  - Open an album
  - Browse photos
- **Features to preserve:**
  - Published album visibility
  - Responsive image loading
- **Required states:**
  - **loading:** Use a stable skeleton or progress state that preserves layout and blocks duplicate actions.
  - **empty:** Explain why no records are available and provide the next valid action without fabricating data.
  - **error:** Show a recoverable message with retry/back navigation; never expose internal or tenant data.
  - **auth:** Remain usable for guests; authenticated enhancements must not hide public content.
  - **subscription:** Preserve existing premium/add-on gates and upsell boundaries; never unlock by presentation state alone.
  - **mobile:** Support narrow screens, touch targets of at least 44px, no horizontal clipping, and readable dense data.
  - **accessibility:** Provide semantic headings, labelled controls, keyboard operation, visible focus, and announced status/errors.
  - **seo:** Provide league-aware canonical metadata, social previews, and structured content where present.
- **TODO contracts:** `ROUTE-COMPATIBILITY`, `TENANT-SCOPE`, `WEBSITE-EDITOR-VISIBILITY`, `LEAGUE-THEME`
- **Source-contract test:** `node --test apps/league-sites/scripts/__tests__/public-editorial-glass.test.mjs`
- **Acceptance evidence:** Implementation is complete; status is pending final integrated build, independent review, and preview/browser acceptance.

<a id="ls-leagueslug-games-gameid"></a>
### [ ] `LS-LEAGUESLUG-GAMES-GAMEID` — Game Centre

- **Route:** `/[leagueSlug]/games/[gameId]`
- **Source page:** `src/app/[leagueSlug]/games/[gameId]/page.tsx`
- **Audience:** Public league visitors, players, teams, families, and fans
- **Status:** `review`
- **Required visible sections:**
  - Game preview/live/final header
  - Box score and event timeline
  - Lineups and team/player comparisons
  - Recap and season-series context
- **Interactions:**
  - Follow live state
  - Open players/teams
  - Navigate series and related games
- **Features to preserve:**
  - Scheduled/live/final state matrix
  - League timezone
  - Grounded recap and official-stat accuracy
- **Required states:**
  - **loading:** Use a stable skeleton or progress state that preserves layout and blocks duplicate actions.
  - **empty:** Explain why no records are available and provide the next valid action without fabricating data.
  - **error:** Show a recoverable message with retry/back navigation; never expose internal or tenant data.
  - **auth:** Remain usable for guests; authenticated enhancements must not hide public content.
  - **subscription:** Preserve existing premium/add-on gates and upsell boundaries; never unlock by presentation state alone.
  - **mobile:** Support narrow screens, touch targets of at least 44px, no horizontal clipping, and readable dense data.
  - **accessibility:** Provide semantic headings, labelled controls, keyboard operation, visible focus, and announced status/errors.
  - **seo:** Provide league-aware canonical metadata, social previews, and structured content where present.
- **TODO contracts:** `ROUTE-COMPATIBILITY`, `TENANT-SCOPE`, `WEBSITE-EDITOR-VISIBILITY`, `LEAGUE-THEME`
- **Source-contract test:** `node --test apps/league-sites/scripts/__tests__/public-data-glass.test.mjs`
- **Acceptance evidence:** Implementation is complete; status is pending final integrated build, independent review, and preview/browser acceptance.

<a id="ls-leagueslug-history"></a>
### [ ] `LS-LEAGUESLUG-HISTORY` — League History

- **Route:** `/[leagueSlug]/history`
- **Source page:** `src/app/[leagueSlug]/history/page.tsx`
- **Audience:** Public league visitors, players, teams, families, and fans
- **Status:** `review`
- **Required visible sections:**
  - Champions timeline
  - Historical leaders
  - Season archive context
- **Interactions:**
  - Expand leaderboards
  - Change historical season
- **Features to preserve:**
  - Legacy/imported records
  - Stable player/team identity
- **Required states:**
  - **loading:** Use a stable skeleton or progress state that preserves layout and blocks duplicate actions.
  - **empty:** Explain why no records are available and provide the next valid action without fabricating data.
  - **error:** Show a recoverable message with retry/back navigation; never expose internal or tenant data.
  - **auth:** Remain usable for guests; authenticated enhancements must not hide public content.
  - **subscription:** Preserve existing premium/add-on gates and upsell boundaries; never unlock by presentation state alone.
  - **mobile:** Support narrow screens, touch targets of at least 44px, no horizontal clipping, and readable dense data.
  - **accessibility:** Provide semantic headings, labelled controls, keyboard operation, visible focus, and announced status/errors.
  - **seo:** Provide league-aware canonical metadata, social previews, and structured content where present.
- **TODO contracts:** `ROUTE-COMPATIBILITY`, `TENANT-SCOPE`, `WEBSITE-EDITOR-VISIBILITY`, `LEAGUE-THEME`
- **Source-contract test:** `node --test apps/league-sites/scripts/__tests__/public-editorial-glass.test.mjs`
- **Acceptance evidence:** Implementation is complete; status is pending final integrated build, independent review, and preview/browser acceptance.

<a id="ls-leagueslug-news-slug"></a>
### [ ] `LS-LEAGUESLUG-NEWS-SLUG` — News Article

- **Route:** `/[leagueSlug]/news/[slug]`
- **Source page:** `src/app/[leagueSlug]/news/[slug]/page.tsx`
- **Audience:** Public league visitors, players, teams, families, and fans
- **Status:** `review`
- **Required visible sections:**
  - Article header and metadata
  - Sanitized rich article body
  - Related/back navigation
- **Interactions:**
  - Follow safe links
  - Return to league news
- **Features to preserve:**
  - Published slug resolution
  - Safe rich-text rendering and share metadata
- **Required states:**
  - **loading:** Use a stable skeleton or progress state that preserves layout and blocks duplicate actions.
  - **empty:** Explain why no records are available and provide the next valid action without fabricating data.
  - **error:** Show a recoverable message with retry/back navigation; never expose internal or tenant data.
  - **auth:** Remain usable for guests; authenticated enhancements must not hide public content.
  - **subscription:** Preserve existing premium/add-on gates and upsell boundaries; never unlock by presentation state alone.
  - **mobile:** Support narrow screens, touch targets of at least 44px, no horizontal clipping, and readable dense data.
  - **accessibility:** Provide semantic headings, labelled controls, keyboard operation, visible focus, and announced status/errors.
  - **seo:** Provide league-aware canonical metadata, social previews, and structured content where present.
- **TODO contracts:** `ROUTE-COMPATIBILITY`, `TENANT-SCOPE`, `WEBSITE-EDITOR-VISIBILITY`, `LEAGUE-THEME`
- **Source-contract test:** `node --test apps/league-sites/scripts/__tests__/public-editorial-glass.test.mjs`
- **Acceptance evidence:** Implementation is complete; status is pending final integrated build, independent review, and preview/browser acceptance.

<a id="ls-leagueslug-news"></a>
### [ ] `LS-LEAGUESLUG-NEWS` — League News

- **Route:** `/[leagueSlug]/news`
- **Source page:** `src/app/[leagueSlug]/news/page.tsx`
- **Audience:** Public league visitors, players, teams, families, and fans
- **Status:** `review`
- **Required visible sections:**
  - Featured story
  - News feed/cards
  - Pagination or archive controls
- **Interactions:**
  - Open articles
  - Load/filter archive
- **Features to preserve:**
  - Published-only visibility
  - Fallback artwork and author/date metadata
- **Required states:**
  - **loading:** Use a stable skeleton or progress state that preserves layout and blocks duplicate actions.
  - **empty:** Explain why no records are available and provide the next valid action without fabricating data.
  - **error:** Show a recoverable message with retry/back navigation; never expose internal or tenant data.
  - **auth:** Remain usable for guests; authenticated enhancements must not hide public content.
  - **subscription:** Preserve existing premium/add-on gates and upsell boundaries; never unlock by presentation state alone.
  - **mobile:** Support narrow screens, touch targets of at least 44px, no horizontal clipping, and readable dense data.
  - **accessibility:** Provide semantic headings, labelled controls, keyboard operation, visible focus, and announced status/errors.
  - **seo:** Provide league-aware canonical metadata, social previews, and structured content where present.
- **TODO contracts:** `ROUTE-COMPATIBILITY`, `TENANT-SCOPE`, `WEBSITE-EDITOR-VISIBILITY`, `LEAGUE-THEME`
- **Source-contract test:** `node --test apps/league-sites/scripts/__tests__/public-editorial-glass.test.mjs`
- **Acceptance evidence:** Implementation is complete; status is pending final integrated build, independent review, and preview/browser acceptance.

<a id="ls-leagueslug-p-pageslug"></a>
### [ ] `LS-LEAGUESLUG-P-PAGESLUG` — Custom League Page

- **Route:** `/[leagueSlug]/p/[pageSlug]`
- **Source page:** `src/app/[leagueSlug]/p/[pageSlug]/page.tsx`
- **Audience:** Public league visitors, players, teams, families, and fans
- **Status:** `review`
- **Required visible sections:**
  - Custom page title
  - Sanitized page content
  - League navigation context
- **Interactions:**
  - Follow configured links
  - Return to league home
- **Features to preserve:**
  - Website-editor page visibility
  - Safe rich content and stable slug
- **Required states:**
  - **loading:** Use a stable skeleton or progress state that preserves layout and blocks duplicate actions.
  - **empty:** Explain why no records are available and provide the next valid action without fabricating data.
  - **error:** Show a recoverable message with retry/back navigation; never expose internal or tenant data.
  - **auth:** Remain usable for guests; authenticated enhancements must not hide public content.
  - **subscription:** Preserve existing premium/add-on gates and upsell boundaries; never unlock by presentation state alone.
  - **mobile:** Support narrow screens, touch targets of at least 44px, no horizontal clipping, and readable dense data.
  - **accessibility:** Provide semantic headings, labelled controls, keyboard operation, visible focus, and announced status/errors.
  - **seo:** Provide league-aware canonical metadata, social previews, and structured content where present.
- **TODO contracts:** `ROUTE-COMPATIBILITY`, `TENANT-SCOPE`, `WEBSITE-EDITOR-VISIBILITY`, `LEAGUE-THEME`
- **Source-contract test:** `node --test apps/league-sites/scripts/__tests__/public-editorial-glass.test.mjs`
- **Acceptance evidence:** Implementation is complete; status is pending final integrated build, independent review, and preview/browser acceptance.

<a id="ls-leagueslug"></a>
### [ ] `LS-LEAGUESLUG` — League Home

- **Route:** `/[leagueSlug]`
- **Source page:** `src/app/[leagueSlug]/page.tsx`
- **Audience:** Public league visitors, players, teams, families, and fans
- **Status:** `review`
- **Required visible sections:**
  - Branded hero and registration CTA
  - Announcements and upcoming/recent games
  - Standings and statistical leaders
  - News, sponsors, and league highlights
- **Interactions:**
  - Change season/division context
  - Open game, team, player, news, or registration detail
- **Features to preserve:**
  - Website-editor visibility settings
  - League theming and premium content gates
  - Structured league metadata
- **Required states:**
  - **loading:** Use a stable skeleton or progress state that preserves layout and blocks duplicate actions.
  - **empty:** Explain why no records are available and provide the next valid action without fabricating data.
  - **error:** Show a recoverable message with retry/back navigation; never expose internal or tenant data.
  - **auth:** Remain usable for guests; authenticated enhancements must not hide public content.
  - **subscription:** Preserve existing premium/add-on gates and upsell boundaries; never unlock by presentation state alone.
  - **mobile:** Support narrow screens, touch targets of at least 44px, no horizontal clipping, and readable dense data.
  - **accessibility:** Provide semantic headings, labelled controls, keyboard operation, visible focus, and announced status/errors.
  - **seo:** Provide league-aware canonical metadata, social previews, and structured content where present.
- **TODO contracts:** `ROUTE-COMPATIBILITY`, `TENANT-SCOPE`, `WEBSITE-EDITOR-VISIBILITY`, `LEAGUE-THEME`
- **Source-contract test:** `node --test apps/league-sites/scripts/__tests__/public-editorial-glass.test.mjs`
- **Acceptance evidence:** Implementation is complete; status is pending final integrated build, independent review, and preview/browser acceptance.

<a id="ls-leagueslug-players-playerid"></a>
### [ ] `LS-LEAGUESLUG-PLAYERS-PLAYERID` — Player Profile

- **Route:** `/[leagueSlug]/players/[playerId]`
- **Source page:** `src/app/[leagueSlug]/players/[playerId]/page.tsx`
- **Audience:** Public league visitors, players, teams, families, and fans
- **Status:** `review`
- **Required visible sections:**
  - Player identity and current team
  - Season and career stat cards
  - Game log, matchups, badges, and articles
- **Interactions:**
  - Change season
  - Open games/teams/articles
- **Features to preserve:**
  - Career identity merging
  - Photo fallback and privacy
  - Advanced-stat entitlement
- **Required states:**
  - **loading:** Use a stable skeleton or progress state that preserves layout and blocks duplicate actions.
  - **empty:** Explain why no records are available and provide the next valid action without fabricating data.
  - **error:** Show a recoverable message with retry/back navigation; never expose internal or tenant data.
  - **auth:** Remain usable for guests; authenticated enhancements must not hide public content.
  - **subscription:** Preserve existing premium/add-on gates and upsell boundaries; never unlock by presentation state alone.
  - **mobile:** Support narrow screens, touch targets of at least 44px, no horizontal clipping, and readable dense data.
  - **accessibility:** Provide semantic headings, labelled controls, keyboard operation, visible focus, and announced status/errors.
  - **seo:** Provide league-aware canonical metadata, social previews, and structured content where present.
- **TODO contracts:** `ROUTE-COMPATIBILITY`, `TENANT-SCOPE`, `WEBSITE-EDITOR-VISIBILITY`, `LEAGUE-THEME`
- **Source-contract test:** `node --test apps/league-sites/scripts/__tests__/public-data-glass.test.mjs`
- **Acceptance evidence:** Implementation is complete; status is pending final integrated build, independent review, and preview/browser acceptance.

<a id="ls-leagueslug-players"></a>
### [ ] `LS-LEAGUESLUG-PLAYERS` — Player Directory

- **Route:** `/[leagueSlug]/players`
- **Source page:** `src/app/[leagueSlug]/players/page.tsx`
- **Audience:** Public league visitors, players, teams, families, and fans
- **Status:** `review`
- **Required visible sections:**
  - Player search and filters
  - Responsive player grid/list
  - Season/division/team context
- **Interactions:**
  - Search/filter players
  - Open player profiles
- **Features to preserve:**
  - Public-profile visibility
  - Photo fallback and team identity
- **Required states:**
  - **loading:** Use a stable skeleton or progress state that preserves layout and blocks duplicate actions.
  - **empty:** Explain why no records are available and provide the next valid action without fabricating data.
  - **error:** Show a recoverable message with retry/back navigation; never expose internal or tenant data.
  - **auth:** Remain usable for guests; authenticated enhancements must not hide public content.
  - **subscription:** Preserve existing premium/add-on gates and upsell boundaries; never unlock by presentation state alone.
  - **mobile:** Support narrow screens, touch targets of at least 44px, no horizontal clipping, and readable dense data.
  - **accessibility:** Provide semantic headings, labelled controls, keyboard operation, visible focus, and announced status/errors.
  - **seo:** Provide league-aware canonical metadata, social previews, and structured content where present.
- **TODO contracts:** `ROUTE-COMPATIBILITY`, `TENANT-SCOPE`, `WEBSITE-EDITOR-VISIBILITY`, `LEAGUE-THEME`
- **Source-contract test:** `node --test apps/league-sites/scripts/__tests__/public-data-glass.test.mjs`
- **Acceptance evidence:** Implementation is complete; status is pending final integrated build, independent review, and preview/browser acceptance.

<a id="ls-leagueslug-playoffs"></a>
### [ ] `LS-LEAGUESLUG-PLAYOFFS` — Playoffs

- **Route:** `/[leagueSlug]/playoffs`
- **Source page:** `src/app/[leagueSlug]/playoffs/page.tsx`
- **Audience:** Public league visitors, players, teams, families, and fans
- **Status:** `review`
- **Required visible sections:**
  - Playoff bracket
  - Standings and qualification
  - Preview/odds context
- **Interactions:**
  - Navigate rounds/games/teams
  - Change season/division
- **Features to preserve:**
  - Bracket progression
  - No-playoff and unseeded states
  - Premium preview gates
- **Required states:**
  - **loading:** Use a stable skeleton or progress state that preserves layout and blocks duplicate actions.
  - **empty:** Explain why no records are available and provide the next valid action without fabricating data.
  - **error:** Show a recoverable message with retry/back navigation; never expose internal or tenant data.
  - **auth:** Remain usable for guests; authenticated enhancements must not hide public content.
  - **subscription:** Preserve existing premium/add-on gates and upsell boundaries; never unlock by presentation state alone.
  - **mobile:** Support narrow screens, touch targets of at least 44px, no horizontal clipping, and readable dense data.
  - **accessibility:** Provide semantic headings, labelled controls, keyboard operation, visible focus, and announced status/errors.
  - **seo:** Provide league-aware canonical metadata, social previews, and structured content where present.
- **TODO contracts:** `ROUTE-COMPATIBILITY`, `TENANT-SCOPE`, `WEBSITE-EDITOR-VISIBILITY`, `LEAGUE-THEME`
- **Source-contract test:** `node --test apps/league-sites/scripts/__tests__/public-data-glass.test.mjs`
- **Acceptance evidence:** Implementation is complete; status is pending final integrated build, independent review, and preview/browser acceptance.

<a id="ls-leagueslug-schedule"></a>
### [ ] `LS-LEAGUESLUG-SCHEDULE` — Schedule

- **Route:** `/[leagueSlug]/schedule`
- **Source page:** `src/app/[leagueSlug]/schedule/page.tsx`
- **Audience:** Public league visitors, players, teams, families, and fans
- **Status:** `review`
- **Required visible sections:**
  - Season/week navigation
  - Division/team/date filters
  - Upcoming game table/list
- **Interactions:**
  - Filter and change week
  - Open game or team details
  - Export/share schedule where available
- **Features to preserve:**
  - League timezone formatting
  - Postponed/cancelled status display
- **Required states:**
  - **loading:** Use a stable skeleton or progress state that preserves layout and blocks duplicate actions.
  - **empty:** Explain why no records are available and provide the next valid action without fabricating data.
  - **error:** Show a recoverable message with retry/back navigation; never expose internal or tenant data.
  - **auth:** Remain usable for guests; authenticated enhancements must not hide public content.
  - **subscription:** Preserve existing premium/add-on gates and upsell boundaries; never unlock by presentation state alone.
  - **mobile:** Support narrow screens, touch targets of at least 44px, no horizontal clipping, and readable dense data.
  - **accessibility:** Provide semantic headings, labelled controls, keyboard operation, visible focus, and announced status/errors.
  - **seo:** Provide league-aware canonical metadata, social previews, and structured content where present.
- **TODO contracts:** `ROUTE-COMPATIBILITY`, `TENANT-SCOPE`, `WEBSITE-EDITOR-VISIBILITY`, `LEAGUE-THEME`
- **Source-contract test:** `node --test apps/league-sites/scripts/__tests__/public-data-glass.test.mjs`
- **Acceptance evidence:** Implementation is complete; status is pending final integrated build, independent review, and preview/browser acceptance.

<a id="ls-leagueslug-scores"></a>
### [ ] `LS-LEAGUESLUG-SCORES` — Scores

- **Route:** `/[leagueSlug]/scores`
- **Source page:** `src/app/[leagueSlug]/scores/page.tsx`
- **Audience:** Public league visitors, players, teams, families, and fans
- **Status:** `review`
- **Required visible sections:**
  - Season/division filters
  - Completed-game score cards
  - Pagination or date grouping
- **Interactions:**
  - Filter results
  - Open game recap/box score
- **Features to preserve:**
  - Final score and status accuracy
  - Team identity and winner treatment
- **Required states:**
  - **loading:** Use a stable skeleton or progress state that preserves layout and blocks duplicate actions.
  - **empty:** Explain why no records are available and provide the next valid action without fabricating data.
  - **error:** Show a recoverable message with retry/back navigation; never expose internal or tenant data.
  - **auth:** Remain usable for guests; authenticated enhancements must not hide public content.
  - **subscription:** Preserve existing premium/add-on gates and upsell boundaries; never unlock by presentation state alone.
  - **mobile:** Support narrow screens, touch targets of at least 44px, no horizontal clipping, and readable dense data.
  - **accessibility:** Provide semantic headings, labelled controls, keyboard operation, visible focus, and announced status/errors.
  - **seo:** Provide league-aware canonical metadata, social previews, and structured content where present.
- **TODO contracts:** `ROUTE-COMPATIBILITY`, `TENANT-SCOPE`, `WEBSITE-EDITOR-VISIBILITY`, `LEAGUE-THEME`
- **Source-contract test:** `node --test apps/league-sites/scripts/__tests__/public-data-glass.test.mjs`
- **Acceptance evidence:** Implementation is complete; status is pending final integrated build, independent review, and preview/browser acceptance.

<a id="ls-leagueslug-standings"></a>
### [ ] `LS-LEAGUESLUG-STANDINGS` — Standings

- **Route:** `/[leagueSlug]/standings`
- **Source page:** `src/app/[leagueSlug]/standings/page.tsx`
- **Audience:** Public league visitors, players, teams, families, and fans
- **Status:** `review`
- **Required visible sections:**
  - Season/division selector
  - Searchable standings table
  - Playoff qualification/tiebreak context
- **Interactions:**
  - Search and filter teams
  - Open team details
- **Features to preserve:**
  - Points/tiebreak ordering
  - Playoff and division visibility
- **Required states:**
  - **loading:** Use a stable skeleton or progress state that preserves layout and blocks duplicate actions.
  - **empty:** Explain why no records are available and provide the next valid action without fabricating data.
  - **error:** Show a recoverable message with retry/back navigation; never expose internal or tenant data.
  - **auth:** Remain usable for guests; authenticated enhancements must not hide public content.
  - **subscription:** Preserve existing premium/add-on gates and upsell boundaries; never unlock by presentation state alone.
  - **mobile:** Support narrow screens, touch targets of at least 44px, no horizontal clipping, and readable dense data.
  - **accessibility:** Provide semantic headings, labelled controls, keyboard operation, visible focus, and announced status/errors.
  - **seo:** Provide league-aware canonical metadata, social previews, and structured content where present.
- **TODO contracts:** `ROUTE-COMPATIBILITY`, `TENANT-SCOPE`, `WEBSITE-EDITOR-VISIBILITY`, `LEAGUE-THEME`
- **Source-contract test:** `node --test apps/league-sites/scripts/__tests__/public-data-glass.test.mjs`
- **Acceptance evidence:** Implementation is complete; status is pending final integrated build, independent review, and preview/browser acceptance.

<a id="ls-leagueslug-stats-goalies"></a>
### [ ] `LS-LEAGUESLUG-STATS-GOALIES` — Goalie Statistics

- **Route:** `/[leagueSlug]/stats/goalies`
- **Source page:** `src/app/[leagueSlug]/stats/goalies/page.tsx`
- **Audience:** Public league visitors, players, teams, families, and fans
- **Status:** `review`
- **Required visible sections:**
  - Season/division filters
  - Goalie leaderboard/table
  - Minimum-appearance context
- **Interactions:**
  - Sort/filter goalie statistics
  - Open goalie/player profiles
- **Features to preserve:**
  - Save percentage/GAA/shutout accuracy
  - Current/all-time view parity
- **Required states:**
  - **loading:** Use a stable skeleton or progress state that preserves layout and blocks duplicate actions.
  - **empty:** Explain why no records are available and provide the next valid action without fabricating data.
  - **error:** Show a recoverable message with retry/back navigation; never expose internal or tenant data.
  - **auth:** Remain usable for guests; authenticated enhancements must not hide public content.
  - **subscription:** Preserve existing premium/add-on gates and upsell boundaries; never unlock by presentation state alone.
  - **mobile:** Support narrow screens, touch targets of at least 44px, no horizontal clipping, and readable dense data.
  - **accessibility:** Provide semantic headings, labelled controls, keyboard operation, visible focus, and announced status/errors.
  - **seo:** Provide league-aware canonical metadata, social previews, and structured content where present.
- **TODO contracts:** `ROUTE-COMPATIBILITY`, `TENANT-SCOPE`, `WEBSITE-EDITOR-VISIBILITY`, `LEAGUE-THEME`
- **Source-contract test:** `node --test apps/league-sites/scripts/__tests__/public-data-glass.test.mjs`
- **Acceptance evidence:** Implementation is complete; status is pending final integrated build, independent review, and preview/browser acceptance.

<a id="ls-leagueslug-stats"></a>
### [ ] `LS-LEAGUESLUG-STATS` — Player Statistics

- **Route:** `/[leagueSlug]/stats`
- **Source page:** `src/app/[leagueSlug]/stats/page.tsx`
- **Audience:** Public league visitors, players, teams, families, and fans
- **Status:** `review`
- **Required visible sections:**
  - Season/division/stat filters
  - Skater leaders and full table
  - Special-teams and goalie navigation
- **Interactions:**
  - Sort/filter statistics
  - Open player profiles
  - Switch statistical views
- **Features to preserve:**
  - Current and all-time aggregates
  - Premium advanced-stat gates
- **Required states:**
  - **loading:** Use a stable skeleton or progress state that preserves layout and blocks duplicate actions.
  - **empty:** Explain why no records are available and provide the next valid action without fabricating data.
  - **error:** Show a recoverable message with retry/back navigation; never expose internal or tenant data.
  - **auth:** Remain usable for guests; authenticated enhancements must not hide public content.
  - **subscription:** Preserve existing premium/add-on gates and upsell boundaries; never unlock by presentation state alone.
  - **mobile:** Support narrow screens, touch targets of at least 44px, no horizontal clipping, and readable dense data.
  - **accessibility:** Provide semantic headings, labelled controls, keyboard operation, visible focus, and announced status/errors.
  - **seo:** Provide league-aware canonical metadata, social previews, and structured content where present.
- **TODO contracts:** `ROUTE-COMPATIBILITY`, `TENANT-SCOPE`, `WEBSITE-EDITOR-VISIBILITY`, `LEAGUE-THEME`
- **Source-contract test:** `node --test apps/league-sites/scripts/__tests__/public-data-glass.test.mjs`
- **Acceptance evidence:** Implementation is complete; status is pending final integrated build, independent review, and preview/browser acceptance.

<a id="ls-leagueslug-suspensions"></a>
### [ ] `LS-LEAGUESLUG-SUSPENSIONS` — Suspensions

- **Route:** `/[leagueSlug]/suspensions`
- **Source page:** `src/app/[leagueSlug]/suspensions/page.tsx`
- **Audience:** Public league visitors, players, teams, families, and fans
- **Status:** `review`
- **Required visible sections:**
  - Active/upcoming suspension list
  - Player/team and discipline details
  - Status/filter context
- **Interactions:**
  - Filter or inspect suspensions
  - Open linked player/team
- **Features to preserve:**
  - Public visibility rules
  - Pending/active/served/appealed states
- **Required states:**
  - **loading:** Use a stable skeleton or progress state that preserves layout and blocks duplicate actions.
  - **empty:** Explain why no records are available and provide the next valid action without fabricating data.
  - **error:** Show a recoverable message with retry/back navigation; never expose internal or tenant data.
  - **auth:** Remain usable for guests; authenticated enhancements must not hide public content.
  - **subscription:** Preserve existing premium/add-on gates and upsell boundaries; never unlock by presentation state alone.
  - **mobile:** Support narrow screens, touch targets of at least 44px, no horizontal clipping, and readable dense data.
  - **accessibility:** Provide semantic headings, labelled controls, keyboard operation, visible focus, and announced status/errors.
  - **seo:** Provide league-aware canonical metadata, social previews, and structured content where present.
- **TODO contracts:** `ROUTE-COMPATIBILITY`, `TENANT-SCOPE`, `WEBSITE-EDITOR-VISIBILITY`, `LEAGUE-THEME`
- **Source-contract test:** `node --test apps/league-sites/scripts/__tests__/public-editorial-glass.test.mjs`
- **Acceptance evidence:** Implementation is complete; status is pending final integrated build, independent review, and preview/browser acceptance.

<a id="ls-leagueslug-teams-teamslug"></a>
### [ ] `LS-LEAGUESLUG-TEAMS-TEAMSLUG` — Team Page

- **Route:** `/[leagueSlug]/teams/[teamSlug]`
- **Source page:** `src/app/[leagueSlug]/teams/[teamSlug]/page.tsx`
- **Audience:** Public league visitors, players, teams, families, and fans
- **Status:** `review`
- **Required visible sections:**
  - Team identity, record, and next game
  - Roster and leadership
  - Schedule/results and leaders
  - Lineup, rivals, and check-in context
- **Interactions:**
  - Switch season/roster view
  - Open player/game details
  - Use eligible check-in or captain actions
- **Features to preserve:**
  - Slug/ID canonical team resolution
  - Division and season scoping
  - Roster privacy rules
- **Required states:**
  - **loading:** Use a stable skeleton or progress state that preserves layout and blocks duplicate actions.
  - **empty:** Explain why no records are available and provide the next valid action without fabricating data.
  - **error:** Show a recoverable message with retry/back navigation; never expose internal or tenant data.
  - **auth:** Remain usable for guests; authenticated enhancements must not hide public content.
  - **subscription:** Preserve existing premium/add-on gates and upsell boundaries; never unlock by presentation state alone.
  - **mobile:** Support narrow screens, touch targets of at least 44px, no horizontal clipping, and readable dense data.
  - **accessibility:** Provide semantic headings, labelled controls, keyboard operation, visible focus, and announced status/errors.
  - **seo:** Provide league-aware canonical metadata, social previews, and structured content where present.
- **TODO contracts:** `ROUTE-COMPATIBILITY`, `TENANT-SCOPE`, `WEBSITE-EDITOR-VISIBILITY`, `LEAGUE-THEME`
- **Source-contract test:** `node --test apps/league-sites/scripts/__tests__/public-data-glass.test.mjs`
- **Acceptance evidence:** Implementation is complete; status is pending final integrated build, independent review, and preview/browser acceptance.

<a id="ls-leagueslug-teams-id-teamid"></a>
### [ ] `LS-LEAGUESLUG-TEAMS-ID-TEAMID` — Team Page by ID

- **Route:** `/[leagueSlug]/teams/id/[teamId]`
- **Source page:** `src/app/[leagueSlug]/teams/id/[teamId]/page.tsx`
- **Audience:** Public league visitors, players, teams, families, and fans
- **Status:** `review`
- **Required visible sections:**
  - Team identity, record, and next game
  - Roster and leadership
  - Schedule/results and leaders
  - Lineup, rivals, and check-in context
- **Interactions:**
  - Switch season/roster view
  - Open player/game details
  - Use eligible check-in or captain actions
- **Features to preserve:**
  - Slug/ID canonical team resolution
  - Division and season scoping
  - Roster privacy rules
- **Required states:**
  - **loading:** Use a stable skeleton or progress state that preserves layout and blocks duplicate actions.
  - **empty:** Explain why no records are available and provide the next valid action without fabricating data.
  - **error:** Show a recoverable message with retry/back navigation; never expose internal or tenant data.
  - **auth:** Remain usable for guests; authenticated enhancements must not hide public content.
  - **subscription:** Preserve existing premium/add-on gates and upsell boundaries; never unlock by presentation state alone.
  - **mobile:** Support narrow screens, touch targets of at least 44px, no horizontal clipping, and readable dense data.
  - **accessibility:** Provide semantic headings, labelled controls, keyboard operation, visible focus, and announced status/errors.
  - **seo:** Provide league-aware canonical metadata, social previews, and structured content where present.
- **TODO contracts:** `ROUTE-COMPATIBILITY`, `TENANT-SCOPE`, `WEBSITE-EDITOR-VISIBILITY`, `LEAGUE-THEME`
- **Source-contract test:** `node --test apps/league-sites/scripts/__tests__/public-data-glass.test.mjs`
- **Acceptance evidence:** Implementation is complete; status is pending final integrated build, independent review, and preview/browser acceptance.

<a id="ls-leagueslug-teams"></a>
### [ ] `LS-LEAGUESLUG-TEAMS` — Team Directory

- **Route:** `/[leagueSlug]/teams`
- **Source page:** `src/app/[leagueSlug]/teams/page.tsx`
- **Audience:** Public league visitors, players, teams, families, and fans
- **Status:** `review`
- **Required visible sections:**
  - Division selector
  - Team cards with identity and record
  - Directory navigation
- **Interactions:**
  - Filter teams
  - Open team pages
- **Features to preserve:**
  - Season participation filtering
  - Stable slug and ID links
- **Required states:**
  - **loading:** Use a stable skeleton or progress state that preserves layout and blocks duplicate actions.
  - **empty:** Explain why no records are available and provide the next valid action without fabricating data.
  - **error:** Show a recoverable message with retry/back navigation; never expose internal or tenant data.
  - **auth:** Remain usable for guests; authenticated enhancements must not hide public content.
  - **subscription:** Preserve existing premium/add-on gates and upsell boundaries; never unlock by presentation state alone.
  - **mobile:** Support narrow screens, touch targets of at least 44px, no horizontal clipping, and readable dense data.
  - **accessibility:** Provide semantic headings, labelled controls, keyboard operation, visible focus, and announced status/errors.
  - **seo:** Provide league-aware canonical metadata, social previews, and structured content where present.
- **TODO contracts:** `ROUTE-COMPATIBILITY`, `TENANT-SCOPE`, `WEBSITE-EDITOR-VISIBILITY`, `LEAGUE-THEME`
- **Source-contract test:** `node --test apps/league-sites/scripts/__tests__/public-data-glass.test.mjs`
- **Acceptance evidence:** Implementation is complete; status is pending final integrated build, independent review, and preview/browser acceptance.

<a id="ls-leagueslug-venues"></a>
### [ ] `LS-LEAGUESLUG-VENUES` — Venues

- **Route:** `/[leagueSlug]/venues`
- **Source page:** `src/app/[leagueSlug]/venues/page.tsx`
- **Audience:** Public league visitors, players, teams, families, and fans
- **Status:** `review`
- **Required visible sections:**
  - Venue cards
  - Address/rink details
  - Map/directions actions
- **Interactions:**
  - Open directions
  - Filter or inspect venues
- **Features to preserve:**
  - Published venue visibility
  - Accessible address formatting
- **Required states:**
  - **loading:** Use a stable skeleton or progress state that preserves layout and blocks duplicate actions.
  - **empty:** Explain why no records are available and provide the next valid action without fabricating data.
  - **error:** Show a recoverable message with retry/back navigation; never expose internal or tenant data.
  - **auth:** Remain usable for guests; authenticated enhancements must not hide public content.
  - **subscription:** Preserve existing premium/add-on gates and upsell boundaries; never unlock by presentation state alone.
  - **mobile:** Support narrow screens, touch targets of at least 44px, no horizontal clipping, and readable dense data.
  - **accessibility:** Provide semantic headings, labelled controls, keyboard operation, visible focus, and announced status/errors.
  - **seo:** Provide league-aware canonical metadata, social previews, and structured content where present.
- **TODO contracts:** `ROUTE-COMPATIBILITY`, `TENANT-SCOPE`, `WEBSITE-EDITOR-VISIBILITY`, `LEAGUE-THEME`
- **Source-contract test:** `node --test apps/league-sites/scripts/__tests__/public-editorial-glass.test.mjs`
- **Acceptance evidence:** Implementation is complete; status is pending final integrated build, independent review, and preview/browser acceptance.

## Player account (6)

<a id="ls-leagueslug-checkin"></a>
### [ ] `LS-LEAGUESLUG-CHECKIN` — Player Game Check-in

- **Route:** `/[leagueSlug]/checkin`
- **Source page:** `src/app/[leagueSlug]/checkin/page.tsx`
- **Audience:** Authenticated players; check-in links may start from guest traffic
- **Status:** `review`
- **Required visible sections:**
  - Authenticated player/game context
  - Availability choice and roster
  - Share/reminder confirmation
- **Interactions:**
  - Set or change availability
  - Share reminder
- **Features to preserve:**
  - Current player identity
  - Game cutoff/status rules
  - Optimistic and conflict-safe updates
- **Required states:**
  - **loading:** Use a stable skeleton or progress state that preserves layout and blocks duplicate actions.
  - **empty:** Explain why no records are available and provide the next valid action without fabricating data.
  - **error:** Show a recoverable message with retry/back navigation; never expose internal or tenant data.
  - **auth:** Preserve authenticated/role authorization and safe sign-in redirect behavior.
  - **subscription:** Preserve existing premium/add-on gates and upsell boundaries; never unlock by presentation state alone.
  - **mobile:** Support narrow screens, touch targets of at least 44px, no horizontal clipping, and readable dense data.
  - **accessibility:** Provide semantic headings, labelled controls, keyboard operation, visible focus, and announced status/errors.
  - **seo:** Use accurate metadata and noindex for private, token, transactional, or portal views.
- **TODO contracts:** `ROUTE-COMPATIBILITY`, `TENANT-SCOPE`, `SUPABASE-AUTH`, `ROLE-AUTHORIZATION`
- **Source-contract test:** `node --test apps/league-sites/scripts/__tests__/player-registration-glass.test.mjs`
- **Acceptance evidence:** Implementation is complete; status is pending final integrated build, independent review, and preview/browser acceptance.

<a id="ls-leagueslug-me-notifications"></a>
### [ ] `LS-LEAGUESLUG-ME-NOTIFICATIONS` — Notification Settings

- **Route:** `/[leagueSlug]/me/notifications`
- **Source page:** `src/app/[leagueSlug]/me/notifications/page.tsx`
- **Audience:** Authenticated players; check-in links may start from guest traffic
- **Status:** `review`
- **Required visible sections:**
  - Channel preferences
  - Team/game notification toggles
  - Push subscription status
- **Interactions:**
  - Enable/disable notifications
  - Save preference changes
- **Features to preserve:**
  - Authenticated ownership
  - Browser permission and unsupported-device states
- **Required states:**
  - **loading:** Use a stable skeleton or progress state that preserves layout and blocks duplicate actions.
  - **empty:** Explain why no records are available and provide the next valid action without fabricating data.
  - **error:** Show a recoverable message with retry/back navigation; never expose internal or tenant data.
  - **auth:** Preserve authenticated/role authorization and safe sign-in redirect behavior.
  - **subscription:** Preserve existing premium/add-on gates and upsell boundaries; never unlock by presentation state alone.
  - **mobile:** Support narrow screens, touch targets of at least 44px, no horizontal clipping, and readable dense data.
  - **accessibility:** Provide semantic headings, labelled controls, keyboard operation, visible focus, and announced status/errors.
  - **seo:** Use accurate metadata and noindex for private, token, transactional, or portal views.
- **TODO contracts:** `ROUTE-COMPATIBILITY`, `TENANT-SCOPE`, `SUPABASE-AUTH`, `ROLE-AUTHORIZATION`
- **Source-contract test:** `node --test apps/league-sites/scripts/__tests__/player-registration-glass.test.mjs`
- **Acceptance evidence:** Implementation is complete; status is pending final integrated build, independent review, and preview/browser acceptance.

<a id="ls-leagueslug-me"></a>
### [ ] `LS-LEAGUESLUG-ME` — Player Dashboard

- **Route:** `/[leagueSlug]/me`
- **Source page:** `src/app/[leagueSlug]/me/page.tsx`
- **Audience:** Authenticated players; check-in links may start from guest traffic
- **Status:** `review`
- **Required visible sections:**
  - Player/team summary
  - Upcoming games and recent results
  - Personal stats, invitations, and quick actions
- **Interactions:**
  - Respond to invitations
  - Open profile/team/game/payment/waiver views
- **Features to preserve:**
  - Authenticated player routing
  - Cross-team/season context
- **Required states:**
  - **loading:** Use a stable skeleton or progress state that preserves layout and blocks duplicate actions.
  - **empty:** Explain why no records are available and provide the next valid action without fabricating data.
  - **error:** Show a recoverable message with retry/back navigation; never expose internal or tenant data.
  - **auth:** Preserve authenticated/role authorization and safe sign-in redirect behavior.
  - **subscription:** Preserve existing premium/add-on gates and upsell boundaries; never unlock by presentation state alone.
  - **mobile:** Support narrow screens, touch targets of at least 44px, no horizontal clipping, and readable dense data.
  - **accessibility:** Provide semantic headings, labelled controls, keyboard operation, visible focus, and announced status/errors.
  - **seo:** Use accurate metadata and noindex for private, token, transactional, or portal views.
- **TODO contracts:** `ROUTE-COMPATIBILITY`, `TENANT-SCOPE`, `SUPABASE-AUTH`, `ROLE-AUTHORIZATION`
- **Source-contract test:** `node --test apps/league-sites/scripts/__tests__/player-registration-glass.test.mjs`
- **Acceptance evidence:** Implementation is complete; status is pending final integrated build, independent review, and preview/browser acceptance.

<a id="ls-leagueslug-me-payments"></a>
### [ ] `LS-LEAGUESLUG-ME-PAYMENTS` — Player Payments

- **Route:** `/[leagueSlug]/me/payments`
- **Source page:** `src/app/[leagueSlug]/me/payments/page.tsx`
- **Audience:** Authenticated players; check-in links may start from guest traffic
- **Status:** `review`
- **Required visible sections:**
  - Balance and payment status
  - Payment items/history
  - Checkout/receipt actions
- **Interactions:**
  - Open checkout
  - Review payment status
- **Features to preserve:**
  - Authenticated ownership
  - Stripe pending/succeeded/failed/refunded states
- **Required states:**
  - **loading:** Use a stable skeleton or progress state that preserves layout and blocks duplicate actions.
  - **empty:** Explain why no records are available and provide the next valid action without fabricating data.
  - **error:** Show a recoverable message with retry/back navigation; never expose internal or tenant data.
  - **auth:** Preserve authenticated/role authorization and safe sign-in redirect behavior.
  - **subscription:** Preserve existing premium/add-on gates and upsell boundaries; never unlock by presentation state alone.
  - **mobile:** Support narrow screens, touch targets of at least 44px, no horizontal clipping, and readable dense data.
  - **accessibility:** Provide semantic headings, labelled controls, keyboard operation, visible focus, and announced status/errors.
  - **seo:** Use accurate metadata and noindex for private, token, transactional, or portal views.
- **TODO contracts:** `ROUTE-COMPATIBILITY`, `TENANT-SCOPE`, `SUPABASE-AUTH`, `ROLE-AUTHORIZATION`, `PAYMENT-AND-WAIVER-INTEGRITY`
- **Source-contract test:** `node --test apps/league-sites/scripts/__tests__/player-registration-glass.test.mjs`
- **Acceptance evidence:** Implementation is complete; status is pending final integrated build, independent review, and preview/browser acceptance.

<a id="ls-leagueslug-me-profile"></a>
### [ ] `LS-LEAGUESLUG-ME-PROFILE` — Edit Player Profile

- **Route:** `/[leagueSlug]/me/profile`
- **Source page:** `src/app/[leagueSlug]/me/profile/page.tsx`
- **Audience:** Authenticated players; check-in links may start from guest traffic
- **Status:** `review`
- **Required visible sections:**
  - Identity/contact form
  - Player photo upload
  - Position and profile fields
- **Interactions:**
  - Validate/save profile
  - Upload/remove photo
- **Features to preserve:**
  - Authenticated ownership
  - Storage validation and photo fallback
- **Required states:**
  - **loading:** Use a stable skeleton or progress state that preserves layout and blocks duplicate actions.
  - **empty:** Explain why no records are available and provide the next valid action without fabricating data.
  - **error:** Show a recoverable message with retry/back navigation; never expose internal or tenant data.
  - **auth:** Preserve authenticated/role authorization and safe sign-in redirect behavior.
  - **subscription:** Preserve existing premium/add-on gates and upsell boundaries; never unlock by presentation state alone.
  - **mobile:** Support narrow screens, touch targets of at least 44px, no horizontal clipping, and readable dense data.
  - **accessibility:** Provide semantic headings, labelled controls, keyboard operation, visible focus, and announced status/errors.
  - **seo:** Use accurate metadata and noindex for private, token, transactional, or portal views.
- **TODO contracts:** `ROUTE-COMPATIBILITY`, `TENANT-SCOPE`, `SUPABASE-AUTH`, `ROLE-AUTHORIZATION`
- **Source-contract test:** `node --test apps/league-sites/scripts/__tests__/player-registration-glass.test.mjs`
- **Acceptance evidence:** Implementation is complete; status is pending final integrated build, independent review, and preview/browser acceptance.

<a id="ls-leagueslug-me-waivers"></a>
### [ ] `LS-LEAGUESLUG-ME-WAIVERS` — Player Waivers

- **Route:** `/[leagueSlug]/me/waivers`
- **Source page:** `src/app/[leagueSlug]/me/waivers/page.tsx`
- **Audience:** Authenticated players; check-in links may start from guest traffic
- **Status:** `review`
- **Required visible sections:**
  - Required/signed waiver list
  - Waiver document viewer
  - Signature/status actions
- **Interactions:**
  - Open and sign required waiver
  - Review signed records
- **Features to preserve:**
  - Authenticated ownership
  - Versioned waiver and signature audit trail
- **Required states:**
  - **loading:** Use a stable skeleton or progress state that preserves layout and blocks duplicate actions.
  - **empty:** Explain why no records are available and provide the next valid action without fabricating data.
  - **error:** Show a recoverable message with retry/back navigation; never expose internal or tenant data.
  - **auth:** Preserve authenticated/role authorization and safe sign-in redirect behavior.
  - **subscription:** Preserve existing premium/add-on gates and upsell boundaries; never unlock by presentation state alone.
  - **mobile:** Support narrow screens, touch targets of at least 44px, no horizontal clipping, and readable dense data.
  - **accessibility:** Provide semantic headings, labelled controls, keyboard operation, visible focus, and announced status/errors.
  - **seo:** Use accurate metadata and noindex for private, token, transactional, or portal views.
- **TODO contracts:** `ROUTE-COMPATIBILITY`, `TENANT-SCOPE`, `SUPABASE-AUTH`, `ROLE-AUTHORIZATION`
- **Source-contract test:** `node --test apps/league-sites/scripts/__tests__/player-registration-glass.test.mjs`
- **Acceptance evidence:** Implementation is complete; status is pending final integrated build, independent review, and preview/browser acceptance.

## Captain tools (7)

<a id="ls-leagueslug-captain-duties"></a>
### [ ] `LS-LEAGUESLUG-CAPTAIN-DUTIES` — Captain Duties

- **Route:** `/[leagueSlug]/captain/duties`
- **Source page:** `src/app/[leagueSlug]/captain/duties/page.tsx`
- **Audience:** Authenticated team captains and designated team managers
- **Status:** `review`
- **Required visible sections:**
  - Assigned duty list
  - Completion/status controls
  - Schedule/team context
- **Interactions:**
  - Mark duties complete
  - Navigate related game/team
- **Features to preserve:**
  - Captain authorization
  - Season and assignment accuracy
- **Required states:**
  - **loading:** Use a stable skeleton or progress state that preserves layout and blocks duplicate actions.
  - **empty:** Explain why no records are available and provide the next valid action without fabricating data.
  - **error:** Show a recoverable message with retry/back navigation; never expose internal or tenant data.
  - **auth:** Preserve authenticated/role authorization and safe sign-in redirect behavior.
  - **subscription:** Preserve existing premium/add-on gates and upsell boundaries; never unlock by presentation state alone.
  - **mobile:** Support narrow screens, touch targets of at least 44px, no horizontal clipping, and readable dense data.
  - **accessibility:** Provide semantic headings, labelled controls, keyboard operation, visible focus, and announced status/errors.
  - **seo:** Use accurate metadata and noindex for private, token, transactional, or portal views.
- **TODO contracts:** `ROUTE-COMPATIBILITY`, `TENANT-SCOPE`, `SUPABASE-AUTH`, `ROLE-AUTHORIZATION`
- **Source-contract test:** `node --test apps/league-sites/scripts/__tests__/official-operations-glass.test.mjs`
- **Acceptance evidence:** Implementation is complete; status is pending final integrated build, independent review, and preview/browser acceptance.

<a id="ls-leagueslug-captain-fees"></a>
### [ ] `LS-LEAGUESLUG-CAPTAIN-FEES` — Team Fee Collection

- **Route:** `/[leagueSlug]/captain/fees`
- **Source page:** `src/app/[leagueSlug]/captain/fees/page.tsx`
- **Audience:** Authenticated team captains and designated team managers
- **Status:** `review`
- **Required visible sections:**
  - Team fee summary
  - Player balances
  - Reminder and collection actions
- **Interactions:**
  - Send reminders
  - Record/open payment flows
- **Features to preserve:**
  - Captain authorization
  - Currency/payment-state accuracy
- **Required states:**
  - **loading:** Use a stable skeleton or progress state that preserves layout and blocks duplicate actions.
  - **empty:** Explain why no records are available and provide the next valid action without fabricating data.
  - **error:** Show a recoverable message with retry/back navigation; never expose internal or tenant data.
  - **auth:** Preserve authenticated/role authorization and safe sign-in redirect behavior.
  - **subscription:** Preserve existing premium/add-on gates and upsell boundaries; never unlock by presentation state alone.
  - **mobile:** Support narrow screens, touch targets of at least 44px, no horizontal clipping, and readable dense data.
  - **accessibility:** Provide semantic headings, labelled controls, keyboard operation, visible focus, and announced status/errors.
  - **seo:** Use accurate metadata and noindex for private, token, transactional, or portal views.
- **TODO contracts:** `ROUTE-COMPATIBILITY`, `TENANT-SCOPE`, `SUPABASE-AUTH`, `ROLE-AUTHORIZATION`, `PAYMENT-AND-WAIVER-INTEGRITY`
- **Source-contract test:** `node --test apps/league-sites/scripts/__tests__/official-operations-glass.test.mjs`
- **Acceptance evidence:** Implementation is complete; status is pending final integrated build, independent review, and preview/browser acceptance.

<a id="ls-leagueslug-captain-goalies"></a>
### [ ] `LS-LEAGUESLUG-CAPTAIN-GOALIES` — Goalie Requests

- **Route:** `/[leagueSlug]/captain/goalies`
- **Source page:** `src/app/[leagueSlug]/captain/goalies/page.tsx`
- **Audience:** Authenticated team captains and designated team managers
- **Status:** `review`
- **Required visible sections:**
  - Game and goalie need context
  - Eligible goalie candidates
  - Request status/history
- **Interactions:**
  - Request/cancel/replace goalie
  - Contact or inspect goalie
- **Features to preserve:**
  - Captain authorization
  - Availability and duplicate-request rules
- **Required states:**
  - **loading:** Use a stable skeleton or progress state that preserves layout and blocks duplicate actions.
  - **empty:** Explain why no records are available and provide the next valid action without fabricating data.
  - **error:** Show a recoverable message with retry/back navigation; never expose internal or tenant data.
  - **auth:** Preserve authenticated/role authorization and safe sign-in redirect behavior.
  - **subscription:** Preserve existing premium/add-on gates and upsell boundaries; never unlock by presentation state alone.
  - **mobile:** Support narrow screens, touch targets of at least 44px, no horizontal clipping, and readable dense data.
  - **accessibility:** Provide semantic headings, labelled controls, keyboard operation, visible focus, and announced status/errors.
  - **seo:** Use accurate metadata and noindex for private, token, transactional, or portal views.
- **TODO contracts:** `ROUTE-COMPATIBILITY`, `TENANT-SCOPE`, `SUPABASE-AUTH`, `ROLE-AUTHORIZATION`
- **Source-contract test:** `node --test apps/league-sites/scripts/__tests__/official-operations-glass.test.mjs`
- **Acceptance evidence:** Implementation is complete; status is pending final integrated build, independent review, and preview/browser acceptance.

<a id="ls-leagueslug-captain-lineups-gameid"></a>
### [ ] `LS-LEAGUESLUG-CAPTAIN-LINEUPS-GAMEID` — Game-day Lineup

- **Route:** `/[leagueSlug]/captain/lineups/[gameId]`
- **Source page:** `src/app/[leagueSlug]/captain/lineups/[gameId]/page.tsx`
- **Audience:** Authenticated team captains and designated team managers
- **Status:** `review`
- **Required visible sections:**
  - Game/attendance context
  - Rink lineup editor
  - Share/submit controls
- **Interactions:**
  - Assign and reorder lineup slots
  - Save/share lineup
- **Features to preserve:**
  - Captain authorization
  - Roster eligibility and concurrent-save handling
- **Required states:**
  - **loading:** Use a stable skeleton or progress state that preserves layout and blocks duplicate actions.
  - **empty:** Explain why no records are available and provide the next valid action without fabricating data.
  - **error:** Show a recoverable message with retry/back navigation; never expose internal or tenant data.
  - **auth:** Preserve authenticated/role authorization and safe sign-in redirect behavior.
  - **subscription:** Preserve existing premium/add-on gates and upsell boundaries; never unlock by presentation state alone.
  - **mobile:** Support narrow screens, touch targets of at least 44px, no horizontal clipping, and readable dense data.
  - **accessibility:** Provide semantic headings, labelled controls, keyboard operation, visible focus, and announced status/errors.
  - **seo:** Use accurate metadata and noindex for private, token, transactional, or portal views.
- **TODO contracts:** `ROUTE-COMPATIBILITY`, `TENANT-SCOPE`, `SUPABASE-AUTH`, `ROLE-AUTHORIZATION`
- **Source-contract test:** `node --test apps/league-sites/scripts/__tests__/official-operations-glass.test.mjs`
- **Acceptance evidence:** Implementation is complete; status is pending final integrated build, independent review, and preview/browser acceptance.

<a id="ls-leagueslug-captain"></a>
### [ ] `LS-LEAGUESLUG-CAPTAIN` — Captain Dashboard

- **Route:** `/[leagueSlug]/captain`
- **Source page:** `src/app/[leagueSlug]/captain/page.tsx`
- **Audience:** Authenticated team captains and designated team managers
- **Status:** `review`
- **Required visible sections:**
  - Team summary and permissions
  - Roster/join requests
  - Upcoming game attendance and quick actions
- **Interactions:**
  - Manage roster and invitations
  - Open fees, goalies, duties, lineups, and return flows
- **Features to preserve:**
  - Captain authorization
  - Team/season scoping
- **Required states:**
  - **loading:** Use a stable skeleton or progress state that preserves layout and blocks duplicate actions.
  - **empty:** Explain why no records are available and provide the next valid action without fabricating data.
  - **error:** Show a recoverable message with retry/back navigation; never expose internal or tenant data.
  - **auth:** Preserve authenticated/role authorization and safe sign-in redirect behavior.
  - **subscription:** Preserve existing premium/add-on gates and upsell boundaries; never unlock by presentation state alone.
  - **mobile:** Support narrow screens, touch targets of at least 44px, no horizontal clipping, and readable dense data.
  - **accessibility:** Provide semantic headings, labelled controls, keyboard operation, visible focus, and announced status/errors.
  - **seo:** Use accurate metadata and noindex for private, token, transactional, or portal views.
- **TODO contracts:** `ROUTE-COMPATIBILITY`, `TENANT-SCOPE`, `SUPABASE-AUTH`, `ROLE-AUTHORIZATION`
- **Source-contract test:** `node --test apps/league-sites/scripts/__tests__/official-operations-glass.test.mjs`
- **Acceptance evidence:** Implementation is complete; status is pending final integrated build, independent review, and preview/browser acceptance.

<a id="ls-leagueslug-captain-player-payments"></a>
### [ ] `LS-LEAGUESLUG-CAPTAIN-PLAYER-PAYMENTS` — Player Payment Tracking

- **Route:** `/[leagueSlug]/captain/player-payments`
- **Source page:** `src/app/[leagueSlug]/captain/player-payments/page.tsx`
- **Audience:** Authenticated team captains and designated team managers
- **Status:** `review`
- **Required visible sections:**
  - Player payment ledger
  - Status/filter summary
  - Reminder/detail actions
- **Interactions:**
  - Filter payment status
  - Send reminder or open detail
- **Features to preserve:**
  - Captain authorization
  - Server-authoritative payment totals
- **Required states:**
  - **loading:** Use a stable skeleton or progress state that preserves layout and blocks duplicate actions.
  - **empty:** Explain why no records are available and provide the next valid action without fabricating data.
  - **error:** Show a recoverable message with retry/back navigation; never expose internal or tenant data.
  - **auth:** Preserve authenticated/role authorization and safe sign-in redirect behavior.
  - **subscription:** Preserve existing premium/add-on gates and upsell boundaries; never unlock by presentation state alone.
  - **mobile:** Support narrow screens, touch targets of at least 44px, no horizontal clipping, and readable dense data.
  - **accessibility:** Provide semantic headings, labelled controls, keyboard operation, visible focus, and announced status/errors.
  - **seo:** Use accurate metadata and noindex for private, token, transactional, or portal views.
- **TODO contracts:** `ROUTE-COMPATIBILITY`, `TENANT-SCOPE`, `SUPABASE-AUTH`, `ROLE-AUTHORIZATION`, `PAYMENT-AND-WAIVER-INTEGRITY`
- **Source-contract test:** `node --test apps/league-sites/scripts/__tests__/official-operations-glass.test.mjs`
- **Acceptance evidence:** Implementation is complete; status is pending final integrated build, independent review, and preview/browser acceptance.

<a id="ls-leagueslug-captain-team-return"></a>
### [ ] `LS-LEAGUESLUG-CAPTAIN-TEAM-RETURN` — Team Return

- **Route:** `/[leagueSlug]/captain/team-return`
- **Source page:** `src/app/[leagueSlug]/captain/team-return/page.tsx`
- **Audience:** Authenticated team captains and designated team managers
- **Status:** `review`
- **Required visible sections:**
  - Return intent and season offer
  - Roster/team confirmation
  - Submission result
- **Interactions:**
  - Accept/decline team return
  - Confirm roster/contact data
- **Features to preserve:**
  - Captain authorization
  - Single-response and deadline rules
- **Required states:**
  - **loading:** Use a stable skeleton or progress state that preserves layout and blocks duplicate actions.
  - **empty:** Explain why no records are available and provide the next valid action without fabricating data.
  - **error:** Show a recoverable message with retry/back navigation; never expose internal or tenant data.
  - **auth:** Preserve authenticated/role authorization and safe sign-in redirect behavior.
  - **subscription:** Preserve existing premium/add-on gates and upsell boundaries; never unlock by presentation state alone.
  - **mobile:** Support narrow screens, touch targets of at least 44px, no horizontal clipping, and readable dense data.
  - **accessibility:** Provide semantic headings, labelled controls, keyboard operation, visible focus, and announced status/errors.
  - **seo:** Use accurate metadata and noindex for private, token, transactional, or portal views.
- **TODO contracts:** `ROUTE-COMPATIBILITY`, `TENANT-SCOPE`, `SUPABASE-AUTH`, `ROLE-AUTHORIZATION`
- **Source-contract test:** `node --test apps/league-sites/scripts/__tests__/official-operations-glass.test.mjs`
- **Acceptance evidence:** Implementation is complete; status is pending final integrated build, independent review, and preview/browser acceptance.

## Goalie flows (3)

<a id="ls-leagueslug-goalies-accept-token"></a>
### [ ] `LS-LEAGUESLUG-GOALIES-ACCEPT-TOKEN` — Goalie Assignment Response

- **Route:** `/[leagueSlug]/goalies/accept/[token]`
- **Source page:** `src/app/[leagueSlug]/goalies/accept/[token]/page.tsx`
- **Audience:** Goalies using public registration or secure assignment links
- **Status:** `review`
- **Required visible sections:**
  - Assignment/game summary
  - Accept/decline controls
  - Result and expiry status
- **Interactions:**
  - Validate token
  - Accept or decline assignment
- **Features to preserve:**
  - Token secrecy/expiry
  - Single-response and game-status rules
- **Required states:**
  - **loading:** Use a stable skeleton or progress state that preserves layout and blocks duplicate actions.
  - **empty:** Explain why no records are available and provide the next valid action without fabricating data.
  - **error:** Show a recoverable message with retry/back navigation; never expose internal or tenant data.
  - **auth:** Validate secure token, expiry, and replay rules before showing private data.
  - **subscription:** Preserve existing premium/add-on gates and upsell boundaries; never unlock by presentation state alone.
  - **mobile:** Support narrow screens, touch targets of at least 44px, no horizontal clipping, and readable dense data.
  - **accessibility:** Provide semantic headings, labelled controls, keyboard operation, visible focus, and announced status/errors.
  - **seo:** Use accurate metadata and noindex for private, token, transactional, or portal views.
- **TODO contracts:** `ROUTE-COMPATIBILITY`, `TENANT-SCOPE`, `TOKEN-SESSION`
- **Source-contract test:** `node --test apps/league-sites/scripts/__tests__/player-registration-glass.test.mjs`
- **Acceptance evidence:** Implementation is complete; status is pending final integrated build, independent review, and preview/browser acceptance.

<a id="ls-leagueslug-goalies-register-confirmation"></a>
### [ ] `LS-LEAGUESLUG-GOALIES-REGISTER-CONFIRMATION` — Goalie Registration Confirmation

- **Route:** `/[leagueSlug]/goalies/register/confirmation`
- **Source page:** `src/app/[leagueSlug]/goalies/register/confirmation/page.tsx`
- **Audience:** Goalies using public registration or secure assignment links
- **Status:** `review`
- **Required visible sections:**
  - Success state
  - Next-step expectations
  - League navigation
- **Interactions:**
  - Return to league
  - Review next steps
- **Features to preserve:**
  - Safe direct-visit behavior
  - No duplicate submission
- **Required states:**
  - **loading:** Use a stable skeleton or progress state that preserves layout and blocks duplicate actions.
  - **empty:** Explain why no records are available and provide the next valid action without fabricating data.
  - **error:** Show a recoverable message with retry/back navigation; never expose internal or tenant data.
  - **auth:** Remain usable for guests; authenticated enhancements must not hide public content.
  - **subscription:** Preserve existing premium/add-on gates and upsell boundaries; never unlock by presentation state alone.
  - **mobile:** Support narrow screens, touch targets of at least 44px, no horizontal clipping, and readable dense data.
  - **accessibility:** Provide semantic headings, labelled controls, keyboard operation, visible focus, and announced status/errors.
  - **seo:** Use accurate metadata and noindex for private, token, transactional, or portal views.
- **TODO contracts:** `ROUTE-COMPATIBILITY`, `TENANT-SCOPE`
- **Source-contract test:** `node --test apps/league-sites/scripts/__tests__/player-registration-glass.test.mjs`
- **Acceptance evidence:** Implementation is complete; status is pending final integrated build, independent review, and preview/browser acceptance.

<a id="ls-leagueslug-goalies-register"></a>
### [ ] `LS-LEAGUESLUG-GOALIES-REGISTER` — Goalie Pool Registration

- **Route:** `/[leagueSlug]/goalies/register`
- **Source page:** `src/app/[leagueSlug]/goalies/register/page.tsx`
- **Audience:** Goalies using public registration or secure assignment links
- **Status:** `review`
- **Required visible sections:**
  - Goalie identity/contact form
  - Availability and level preferences
  - Consent and confirmation
- **Interactions:**
  - Validate and submit goalie registration
  - Authenticate if required
- **Features to preserve:**
  - League scoping
  - Duplicate registration and privacy rules
- **Required states:**
  - **loading:** Use a stable skeleton or progress state that preserves layout and blocks duplicate actions.
  - **empty:** Explain why no records are available and provide the next valid action without fabricating data.
  - **error:** Show a recoverable message with retry/back navigation; never expose internal or tenant data.
  - **auth:** Remain usable for guests; authenticated enhancements must not hide public content.
  - **subscription:** Preserve existing premium/add-on gates and upsell boundaries; never unlock by presentation state alone.
  - **mobile:** Support narrow screens, touch targets of at least 44px, no horizontal clipping, and readable dense data.
  - **accessibility:** Provide semantic headings, labelled controls, keyboard operation, visible focus, and announced status/errors.
  - **seo:** Use accurate metadata and noindex for private, token, transactional, or portal views.
- **TODO contracts:** `ROUTE-COMPATIBILITY`, `TENANT-SCOPE`
- **Source-contract test:** `node --test apps/league-sites/scripts/__tests__/player-registration-glass.test.mjs`
- **Acceptance evidence:** Implementation is complete; status is pending final integrated build, independent review, and preview/browser acceptance.

## Scorekeeper and game verification (5)

<a id="ls-leagueslug-scorekeeper-dashboard"></a>
### [ ] `LS-LEAGUESLUG-SCOREKEEPER-DASHBOARD` — Scorekeeper Dashboard

- **Route:** `/[leagueSlug]/scorekeeper/dashboard`
- **Source page:** `src/app/[leagueSlug]/scorekeeper/dashboard/page.tsx`
- **Audience:** Token-authenticated scorekeepers and captains verifying submitted games
- **Status:** `review`
- **Required visible sections:**
  - Assigned/upcoming games
  - Completed/history summary
  - Swap and navigation actions
- **Interactions:**
  - Open a game
  - Request/respond to swap
  - Sign out
- **Features to preserve:**
  - Scorekeeper session
  - Assignment and league scoping
- **Required states:**
  - **loading:** Use a stable skeleton or progress state that preserves layout and blocks duplicate actions.
  - **empty:** Explain why no records are available and provide the next valid action without fabricating data.
  - **error:** Show a recoverable message with retry/back navigation; never expose internal or tenant data.
  - **auth:** Preserve authenticated/role authorization and safe sign-in redirect behavior.
  - **subscription:** Preserve existing premium/add-on gates and upsell boundaries; never unlock by presentation state alone.
  - **mobile:** Support narrow screens, touch targets of at least 44px, no horizontal clipping, and readable dense data.
  - **accessibility:** Provide semantic headings, labelled controls, keyboard operation, visible focus, and announced status/errors.
  - **seo:** Use accurate metadata and noindex for private, token, transactional, or portal views.
- **TODO contracts:** `ROUTE-COMPATIBILITY`, `TENANT-SCOPE`, `TOKEN-SESSION`
- **Source-contract test:** `node --test apps/league-sites/scripts/__tests__/official-operations-glass.test.mjs`
- **Acceptance evidence:** Implementation is complete; status is pending final integrated build, independent review, and preview/browser acceptance.

<a id="ls-leagueslug-scorekeeper-game-gameid"></a>
### [ ] `LS-LEAGUESLUG-SCOREKEEPER-GAME-GAMEID` — Live Scoring Console

- **Route:** `/[leagueSlug]/scorekeeper/game/[gameId]`
- **Source page:** `src/app/[leagueSlug]/scorekeeper/game/[gameId]/page.tsx`
- **Audience:** Token-authenticated scorekeepers and captains verifying submitted games
- **Status:** `review`
- **Required visible sections:**
  - Pre-game check-in and rosters
  - Live clock, score, shots, goals, penalties, and events
  - Offline sync and correction controls
  - Game completion and captain signature/verification
- **Interactions:**
  - Start/pause clock and record events
  - Edit/replay events and resolve sync
  - Submit/finalize game
- **Features to preserve:**
  - Scorekeeper session and game assignment
  - Offline-first event log
  - Idempotent finalization and captain verification
- **Required states:**
  - **loading:** Use a stable skeleton or progress state that preserves layout and blocks duplicate actions.
  - **empty:** Explain why no records are available and provide the next valid action without fabricating data.
  - **error:** Show a recoverable message with retry/back navigation; never expose internal or tenant data.
  - **auth:** Preserve authenticated/role authorization and safe sign-in redirect behavior.
  - **subscription:** Preserve existing premium/add-on gates and upsell boundaries; never unlock by presentation state alone.
  - **mobile:** Support narrow screens, touch targets of at least 44px, no horizontal clipping, and readable dense data.
  - **accessibility:** Provide semantic headings, labelled controls, keyboard operation, visible focus, and announced status/errors.
  - **seo:** Use accurate metadata and noindex for private, token, transactional, or portal views.
- **TODO contracts:** `ROUTE-COMPATIBILITY`, `TENANT-SCOPE`, `TOKEN-SESSION`
- **Source-contract test:** `node --test apps/league-sites/scripts/__tests__/official-operations-glass.test.mjs`
- **Acceptance evidence:** Implementation is complete; status is pending final integrated build, independent review, and preview/browser acceptance.

<a id="ls-leagueslug-scorekeeper"></a>
### [ ] `LS-LEAGUESLUG-SCOREKEEPER` — Scorekeeper Sign-in

- **Route:** `/[leagueSlug]/scorekeeper`
- **Source page:** `src/app/[leagueSlug]/scorekeeper/page.tsx`
- **Audience:** Token-authenticated scorekeepers and captains verifying submitted games
- **Status:** `review`
- **Required visible sections:**
  - Token entry
  - Validation/expiry guidance
  - Portal routing status
- **Interactions:**
  - Submit token
  - Resume valid session
- **Features to preserve:**
  - Rate-limited token session
  - Single-game versus multi-game routing
- **Required states:**
  - **loading:** Use a stable skeleton or progress state that preserves layout and blocks duplicate actions.
  - **empty:** Explain why no records are available and provide the next valid action without fabricating data.
  - **error:** Show a recoverable message with retry/back navigation; never expose internal or tenant data.
  - **auth:** Preserve authenticated/role authorization and safe sign-in redirect behavior.
  - **subscription:** Preserve existing premium/add-on gates and upsell boundaries; never unlock by presentation state alone.
  - **mobile:** Support narrow screens, touch targets of at least 44px, no horizontal clipping, and readable dense data.
  - **accessibility:** Provide semantic headings, labelled controls, keyboard operation, visible focus, and announced status/errors.
  - **seo:** Use accurate metadata and noindex for private, token, transactional, or portal views.
- **TODO contracts:** `ROUTE-COMPATIBILITY`, `TENANT-SCOPE`, `TOKEN-SESSION`
- **Source-contract test:** `node --test apps/league-sites/scripts/__tests__/official-operations-glass.test.mjs`
- **Acceptance evidence:** Implementation is complete; status is pending final integrated build, independent review, and preview/browser acceptance.

<a id="ls-leagueslug-scorekeeper-schedule"></a>
### [ ] `LS-LEAGUESLUG-SCOREKEEPER-SCHEDULE` — Scorekeeper Schedule

- **Route:** `/[leagueSlug]/scorekeeper/schedule`
- **Source page:** `src/app/[leagueSlug]/scorekeeper/schedule/page.tsx`
- **Audience:** Token-authenticated scorekeepers and captains verifying submitted games
- **Status:** `review`
- **Required visible sections:**
  - Assigned schedule
  - Date/status filters
  - Swap/request context
- **Interactions:**
  - Filter/open assignments
  - Request a swap
- **Features to preserve:**
  - Scorekeeper session
  - League timezone and assignment state
- **Required states:**
  - **loading:** Use a stable skeleton or progress state that preserves layout and blocks duplicate actions.
  - **empty:** Explain why no records are available and provide the next valid action without fabricating data.
  - **error:** Show a recoverable message with retry/back navigation; never expose internal or tenant data.
  - **auth:** Preserve authenticated/role authorization and safe sign-in redirect behavior.
  - **subscription:** Preserve existing premium/add-on gates and upsell boundaries; never unlock by presentation state alone.
  - **mobile:** Support narrow screens, touch targets of at least 44px, no horizontal clipping, and readable dense data.
  - **accessibility:** Provide semantic headings, labelled controls, keyboard operation, visible focus, and announced status/errors.
  - **seo:** Use accurate metadata and noindex for private, token, transactional, or portal views.
- **TODO contracts:** `ROUTE-COMPATIBILITY`, `TENANT-SCOPE`, `TOKEN-SESSION`
- **Source-contract test:** `node --test apps/league-sites/scripts/__tests__/official-operations-glass.test.mjs`
- **Acceptance evidence:** Implementation is complete; status is pending final integrated build, independent review, and preview/browser acceptance.

<a id="ls-leagueslug-verify-token"></a>
### [ ] `LS-LEAGUESLUG-VERIFY-TOKEN` — Captain Game Verification

- **Route:** `/[leagueSlug]/verify/[token]`
- **Source page:** `src/app/[leagueSlug]/verify/[token]/page.tsx`
- **Audience:** Token-authenticated scorekeepers and captains verifying submitted games
- **Status:** `review`
- **Required visible sections:**
  - Game summary and submitted statistics
  - Accept/dispute controls
  - Result and expiry status
- **Interactions:**
  - Validate token
  - Accept or contest submitted stats
- **Features to preserve:**
  - Captain verification token
  - Single-response audit trail and correction workflow
- **Required states:**
  - **loading:** Use a stable skeleton or progress state that preserves layout and blocks duplicate actions.
  - **empty:** Explain why no records are available and provide the next valid action without fabricating data.
  - **error:** Show a recoverable message with retry/back navigation; never expose internal or tenant data.
  - **auth:** Preserve authenticated/role authorization and safe sign-in redirect behavior.
  - **subscription:** Preserve existing premium/add-on gates and upsell boundaries; never unlock by presentation state alone.
  - **mobile:** Support narrow screens, touch targets of at least 44px, no horizontal clipping, and readable dense data.
  - **accessibility:** Provide semantic headings, labelled controls, keyboard operation, visible focus, and announced status/errors.
  - **seo:** Use accurate metadata and noindex for private, token, transactional, or portal views.
- **TODO contracts:** `ROUTE-COMPATIBILITY`, `TENANT-SCOPE`, `TOKEN-SESSION`
- **Source-contract test:** `node --test apps/league-sites/scripts/__tests__/official-operations-glass.test.mjs`
- **Acceptance evidence:** Implementation is complete; status is pending final integrated build, independent review, and preview/browser acceptance.

## Referee portal (2)

<a id="ls-leagueslug-referee-dashboard"></a>
### [ ] `LS-LEAGUESLUG-REFEREE-DASHBOARD` — Referee Dashboard

- **Route:** `/[leagueSlug]/referee/dashboard`
- **Source page:** `src/app/[leagueSlug]/referee/dashboard/page.tsx`
- **Audience:** Token-authenticated referees
- **Status:** `review`
- **Required visible sections:**
  - Upcoming assignments
  - Completed games and summary stats
  - Availability/navigation controls
- **Interactions:**
  - Open assignment
  - Update availability or sign out
- **Features to preserve:**
  - Referee session
  - Assignment and league scoping
- **Required states:**
  - **loading:** Use a stable skeleton or progress state that preserves layout and blocks duplicate actions.
  - **empty:** Explain why no records are available and provide the next valid action without fabricating data.
  - **error:** Show a recoverable message with retry/back navigation; never expose internal or tenant data.
  - **auth:** Preserve authenticated/role authorization and safe sign-in redirect behavior.
  - **subscription:** Preserve existing premium/add-on gates and upsell boundaries; never unlock by presentation state alone.
  - **mobile:** Support narrow screens, touch targets of at least 44px, no horizontal clipping, and readable dense data.
  - **accessibility:** Provide semantic headings, labelled controls, keyboard operation, visible focus, and announced status/errors.
  - **seo:** Use accurate metadata and noindex for private, token, transactional, or portal views.
- **TODO contracts:** `ROUTE-COMPATIBILITY`, `TENANT-SCOPE`, `TOKEN-SESSION`
- **Source-contract test:** `node --test apps/league-sites/scripts/__tests__/official-operations-glass.test.mjs`
- **Acceptance evidence:** Implementation is complete; status is pending final integrated build, independent review, and preview/browser acceptance.

<a id="ls-leagueslug-referee"></a>
### [ ] `LS-LEAGUESLUG-REFEREE` — Referee Sign-in

- **Route:** `/[leagueSlug]/referee`
- **Source page:** `src/app/[leagueSlug]/referee/page.tsx`
- **Audience:** Token-authenticated referees
- **Status:** `review`
- **Required visible sections:**
  - Token entry
  - Validation/expiry guidance
  - Portal routing status
- **Interactions:**
  - Submit token
  - Resume valid session
- **Features to preserve:**
  - Rate-limited referee session
  - League-scoped routing
- **Required states:**
  - **loading:** Use a stable skeleton or progress state that preserves layout and blocks duplicate actions.
  - **empty:** Explain why no records are available and provide the next valid action without fabricating data.
  - **error:** Show a recoverable message with retry/back navigation; never expose internal or tenant data.
  - **auth:** Preserve authenticated/role authorization and safe sign-in redirect behavior.
  - **subscription:** Preserve existing premium/add-on gates and upsell boundaries; never unlock by presentation state alone.
  - **mobile:** Support narrow screens, touch targets of at least 44px, no horizontal clipping, and readable dense data.
  - **accessibility:** Provide semantic headings, labelled controls, keyboard operation, visible focus, and announced status/errors.
  - **seo:** Use accurate metadata and noindex for private, token, transactional, or portal views.
- **TODO contracts:** `ROUTE-COMPATIBILITY`, `TENANT-SCOPE`, `TOKEN-SESSION`
- **Source-contract test:** `node --test apps/league-sites/scripts/__tests__/official-operations-glass.test.mjs`
- **Acceptance evidence:** Implementation is complete; status is pending final integrated build, independent review, and preview/browser acceptance.

## Registration (2)

<a id="ls-leagueslug-register"></a>
### [ ] `LS-LEAGUESLUG-REGISTER` — Player Registration

- **Route:** `/[leagueSlug]/register`
- **Source page:** `src/app/[leagueSlug]/register/page.tsx`
- **Audience:** Prospective players, captains, and teams registering with a league
- **Status:** `review`
- **Required visible sections:**
  - League/season and fee summary
  - Personal, skill, preference, waiver, and payment steps
  - Confirmation
- **Interactions:**
  - Navigate/validate steps
  - Authenticate or create account
  - Sign waiver and pay when required
- **Features to preserve:**
  - Registration-open selection
  - Pricing/waiver/payment accuracy
  - Captain invite intent
- **Required states:**
  - **loading:** Use a stable skeleton or progress state that preserves layout and blocks duplicate actions.
  - **empty:** Explain why no records are available and provide the next valid action without fabricating data.
  - **error:** Show a recoverable message with retry/back navigation; never expose internal or tenant data.
  - **auth:** Remain usable for guests; authenticated enhancements must not hide public content.
  - **subscription:** Preserve existing premium/add-on gates and upsell boundaries; never unlock by presentation state alone.
  - **mobile:** Support narrow screens, touch targets of at least 44px, no horizontal clipping, and readable dense data.
  - **accessibility:** Provide semantic headings, labelled controls, keyboard operation, visible focus, and announced status/errors.
  - **seo:** Use accurate metadata and noindex for private, token, transactional, or portal views.
- **TODO contracts:** `ROUTE-COMPATIBILITY`, `TENANT-SCOPE`, `PAYMENT-AND-WAIVER-INTEGRITY`
- **Source-contract test:** `node --test apps/league-sites/scripts/__tests__/player-registration-glass.test.mjs`
- **Acceptance evidence:** Implementation is complete; status is pending final integrated build, independent review, and preview/browser acceptance.

<a id="ls-leagueslug-register-team"></a>
### [ ] `LS-LEAGUESLUG-REGISTER-TEAM` — Team Registration

- **Route:** `/[leagueSlug]/register/team`
- **Source page:** `src/app/[leagueSlug]/register/team/page.tsx`
- **Audience:** Prospective players, captains, and teams registering with a league
- **Status:** `review`
- **Required visible sections:**
  - League/season offer
  - Team and captain form
  - Fee/waiver confirmation
- **Interactions:**
  - Validate and submit team registration
  - Continue to payment when required
- **Features to preserve:**
  - Registration-open selection
  - Captain/team deduplication and payment accuracy
- **Required states:**
  - **loading:** Use a stable skeleton or progress state that preserves layout and blocks duplicate actions.
  - **empty:** Explain why no records are available and provide the next valid action without fabricating data.
  - **error:** Show a recoverable message with retry/back navigation; never expose internal or tenant data.
  - **auth:** Remain usable for guests; authenticated enhancements must not hide public content.
  - **subscription:** Preserve existing premium/add-on gates and upsell boundaries; never unlock by presentation state alone.
  - **mobile:** Support narrow screens, touch targets of at least 44px, no horizontal clipping, and readable dense data.
  - **accessibility:** Provide semantic headings, labelled controls, keyboard operation, visible focus, and announced status/errors.
  - **seo:** Use accurate metadata and noindex for private, token, transactional, or portal views.
- **TODO contracts:** `ROUTE-COMPATIBILITY`, `TENANT-SCOPE`, `PAYMENT-AND-WAIVER-INTEGRITY`
- **Source-contract test:** `node --test apps/league-sites/scripts/__tests__/player-registration-glass.test.mjs`
- **Acceptance evidence:** Implementation is complete; status is pending final integrated build, independent review, and preview/browser acceptance.

## Platform and legal (7)

<a id="ls-leagueslug-privacy"></a>
### [ ] `LS-LEAGUESLUG-PRIVACY` — League Privacy Policy

- **Route:** `/[leagueSlug]/privacy`
- **Source page:** `src/app/[leagueSlug]/privacy/page.tsx`
- **Audience:** Public visitors, account holders, and recovery-flow users
- **Status:** `review`
- **Required visible sections:**
  - Document title and effective date
  - Readable policy sections
  - Contact/back navigation
- **Interactions:**
  - Navigate policy headings
  - Return to the relevant site
- **Features to preserve:**
  - Legal copy hierarchy
  - League-aware branding where applicable
- **Required states:**
  - **loading:** Use a stable skeleton or progress state that preserves layout and blocks duplicate actions.
  - **empty:** Explain why no records are available and provide the next valid action without fabricating data.
  - **error:** Show a recoverable message with retry/back navigation; never expose internal or tenant data.
  - **auth:** Remain usable for guests; authenticated enhancements must not hide public content.
  - **subscription:** Preserve existing premium/add-on gates and upsell boundaries; never unlock by presentation state alone.
  - **mobile:** Support narrow screens, touch targets of at least 44px, no horizontal clipping, and readable dense data.
  - **accessibility:** Provide semantic headings, labelled controls, keyboard operation, visible focus, and announced status/errors.
  - **seo:** Use accurate metadata and noindex for private, token, transactional, or portal views.
- **TODO contracts:** `ROUTE-COMPATIBILITY`, `TENANT-SCOPE`
- **Source-contract test:** `node --test apps/league-sites/scripts/__tests__/platform-legal-glass.test.mjs`
- **Acceptance evidence:** Implementation is complete; status is pending final integrated build, independent review, and preview/browser acceptance.

<a id="ls-leagueslug-terms"></a>
### [ ] `LS-LEAGUESLUG-TERMS` — League Terms

- **Route:** `/[leagueSlug]/terms`
- **Source page:** `src/app/[leagueSlug]/terms/page.tsx`
- **Audience:** Public visitors, account holders, and recovery-flow users
- **Status:** `review`
- **Required visible sections:**
  - Document title and effective date
  - Readable policy sections
  - Contact/back navigation
- **Interactions:**
  - Navigate policy headings
  - Return to the relevant site
- **Features to preserve:**
  - Legal copy hierarchy
  - League-aware branding where applicable
- **Required states:**
  - **loading:** Use a stable skeleton or progress state that preserves layout and blocks duplicate actions.
  - **empty:** Explain why no records are available and provide the next valid action without fabricating data.
  - **error:** Show a recoverable message with retry/back navigation; never expose internal or tenant data.
  - **auth:** Remain usable for guests; authenticated enhancements must not hide public content.
  - **subscription:** Preserve existing premium/add-on gates and upsell boundaries; never unlock by presentation state alone.
  - **mobile:** Support narrow screens, touch targets of at least 44px, no horizontal clipping, and readable dense data.
  - **accessibility:** Provide semantic headings, labelled controls, keyboard operation, visible focus, and announced status/errors.
  - **seo:** Use accurate metadata and noindex for private, token, transactional, or portal views.
- **TODO contracts:** `ROUTE-COMPATIBILITY`, `TENANT-SCOPE`
- **Source-contract test:** `node --test apps/league-sites/scripts/__tests__/platform-legal-glass.test.mjs`
- **Acceptance evidence:** Implementation is complete; status is pending final integrated build, independent review, and preview/browser acceptance.

<a id="ls-discover"></a>
### [ ] `LS-DISCOVER` — Discover Leagues

- **Route:** `/discover`
- **Source page:** `src/app/discover/page.tsx`
- **Audience:** Public visitors, account holders, and recovery-flow users
- **Status:** `review`
- **Required visible sections:**
  - Search and location filters
  - Registration-status filters
  - League result cards and pagination
- **Interactions:**
  - Search/filter leagues
  - Open a league or registration flow
- **Features to preserve:**
  - Public league discovery
  - City and registration availability data
- **Required states:**
  - **loading:** Use a stable skeleton or progress state that preserves layout and blocks duplicate actions.
  - **empty:** Explain why no records are available and provide the next valid action without fabricating data.
  - **error:** Show a recoverable message with retry/back navigation; never expose internal or tenant data.
  - **auth:** Remain usable for guests; authenticated enhancements must not hide public content.
  - **subscription:** Preserve existing premium/add-on gates and upsell boundaries; never unlock by presentation state alone.
  - **mobile:** Support narrow screens, touch targets of at least 44px, no horizontal clipping, and readable dense data.
  - **accessibility:** Provide semantic headings, labelled controls, keyboard operation, visible focus, and announced status/errors.
  - **seo:** Provide league-aware canonical metadata, social previews, and structured content where present.
- **TODO contracts:** `ROUTE-COMPATIBILITY`, `TENANT-SCOPE`
- **Source-contract test:** `node --test apps/league-sites/scripts/__tests__/platform-legal-glass.test.mjs`
- **Acceptance evidence:** Implementation is complete; status is pending final integrated build, independent review, and preview/browser acceptance.

<a id="ls-root"></a>
### [ ] `LS-ROOT` — League Sites Entry

- **Route:** `/`
- **Source page:** `src/app/page.tsx`
- **Audience:** Public visitors, account holders, and recovery-flow users
- **Status:** `review`
- **Required visible sections:**
  - Platform identity and purpose
  - League-site entry guidance
  - Development/test league links
- **Interactions:**
  - Open a league site
  - Navigate to league discovery
- **Features to preserve:**
  - Base-domain behavior
  - Subdomain/custom-domain hand-off
- **Required states:**
  - **loading:** Use a stable skeleton or progress state that preserves layout and blocks duplicate actions.
  - **empty:** Explain why no records are available and provide the next valid action without fabricating data.
  - **error:** Show a recoverable message with retry/back navigation; never expose internal or tenant data.
  - **auth:** Remain usable for guests; authenticated enhancements must not hide public content.
  - **subscription:** Preserve existing premium/add-on gates and upsell boundaries; never unlock by presentation state alone.
  - **mobile:** Support narrow screens, touch targets of at least 44px, no horizontal clipping, and readable dense data.
  - **accessibility:** Provide semantic headings, labelled controls, keyboard operation, visible focus, and announced status/errors.
  - **seo:** Provide league-aware canonical metadata, social previews, and structured content where present.
- **TODO contracts:** `ROUTE-COMPATIBILITY`, `TENANT-SCOPE`
- **Source-contract test:** `node --test apps/league-sites/scripts/__tests__/platform-legal-glass.test.mjs`
- **Acceptance evidence:** Implementation is complete; status is pending final integrated build, independent review, and preview/browser acceptance.

<a id="ls-privacy-policy"></a>
### [ ] `LS-PRIVACY-POLICY` — Platform Privacy Policy

- **Route:** `/privacy-policy`
- **Source page:** `src/app/privacy-policy/page.tsx`
- **Audience:** Public visitors, account holders, and recovery-flow users
- **Status:** `review`
- **Required visible sections:**
  - Document title and effective date
  - Readable policy sections
  - Contact/back navigation
- **Interactions:**
  - Navigate policy headings
  - Return to the relevant site
- **Features to preserve:**
  - Legal copy hierarchy
  - League-aware branding where applicable
- **Required states:**
  - **loading:** Use a stable skeleton or progress state that preserves layout and blocks duplicate actions.
  - **empty:** Explain why no records are available and provide the next valid action without fabricating data.
  - **error:** Show a recoverable message with retry/back navigation; never expose internal or tenant data.
  - **auth:** Remain usable for guests; authenticated enhancements must not hide public content.
  - **subscription:** Preserve existing premium/add-on gates and upsell boundaries; never unlock by presentation state alone.
  - **mobile:** Support narrow screens, touch targets of at least 44px, no horizontal clipping, and readable dense data.
  - **accessibility:** Provide semantic headings, labelled controls, keyboard operation, visible focus, and announced status/errors.
  - **seo:** Use accurate metadata and noindex for private, token, transactional, or portal views.
- **TODO contracts:** `ROUTE-COMPATIBILITY`, `TENANT-SCOPE`
- **Source-contract test:** `node --test apps/league-sites/scripts/__tests__/platform-legal-glass.test.mjs`
- **Acceptance evidence:** Implementation is complete; status is pending final integrated build, independent review, and preview/browser acceptance.

<a id="ls-reset-password"></a>
### [ ] `LS-RESET-PASSWORD` — Reset Password

- **Route:** `/reset-password`
- **Source page:** `src/app/reset-password/page.tsx`
- **Audience:** Public visitors, account holders, and recovery-flow users
- **Status:** `review`
- **Required visible sections:**
  - Recovery-token status
  - New password and confirmation form
  - Success/error guidance
- **Interactions:**
  - Validate matching passwords
  - Submit password update
- **Features to preserve:**
  - Supabase recovery session
  - Safe post-reset navigation
- **Required states:**
  - **loading:** Use a stable skeleton or progress state that preserves layout and blocks duplicate actions.
  - **empty:** Explain why no records are available and provide the next valid action without fabricating data.
  - **error:** Show a recoverable message with retry/back navigation; never expose internal or tenant data.
  - **auth:** Remain usable for guests; authenticated enhancements must not hide public content.
  - **subscription:** Preserve existing premium/add-on gates and upsell boundaries; never unlock by presentation state alone.
  - **mobile:** Support narrow screens, touch targets of at least 44px, no horizontal clipping, and readable dense data.
  - **accessibility:** Provide semantic headings, labelled controls, keyboard operation, visible focus, and announced status/errors.
  - **seo:** Use accurate metadata and noindex for private, token, transactional, or portal views.
- **TODO contracts:** `ROUTE-COMPATIBILITY`, `TENANT-SCOPE`
- **Source-contract test:** `node --test apps/league-sites/scripts/__tests__/platform-legal-glass.test.mjs`
- **Acceptance evidence:** Implementation is complete; status is pending final integrated build, independent review, and preview/browser acceptance.

<a id="ls-tos"></a>
### [ ] `LS-TOS` — Platform Terms of Service

- **Route:** `/tos`
- **Source page:** `src/app/tos/page.tsx`
- **Audience:** Public visitors, account holders, and recovery-flow users
- **Status:** `review`
- **Required visible sections:**
  - Document title and effective date
  - Readable policy sections
  - Contact/back navigation
- **Interactions:**
  - Navigate policy headings
  - Return to the relevant site
- **Features to preserve:**
  - Legal copy hierarchy
  - League-aware branding where applicable
- **Required states:**
  - **loading:** Use a stable skeleton or progress state that preserves layout and blocks duplicate actions.
  - **empty:** Explain why no records are available and provide the next valid action without fabricating data.
  - **error:** Show a recoverable message with retry/back navigation; never expose internal or tenant data.
  - **auth:** Remain usable for guests; authenticated enhancements must not hide public content.
  - **subscription:** Preserve existing premium/add-on gates and upsell boundaries; never unlock by presentation state alone.
  - **mobile:** Support narrow screens, touch targets of at least 44px, no horizontal clipping, and readable dense data.
  - **accessibility:** Provide semantic headings, labelled controls, keyboard operation, visible focus, and announced status/errors.
  - **seo:** Use accurate metadata and noindex for private, token, transactional, or portal views.
- **TODO contracts:** `ROUTE-COMPATIBILITY`, `TENANT-SCOPE`
- **Source-contract test:** `node --test apps/league-sites/scripts/__tests__/platform-legal-glass.test.mjs`
- **Acceptance evidence:** Implementation is complete; status is pending final integrated build, independent review, and preview/browser acceptance.

## Workflow

1. Choose one route ID from this checklist and change only its manifest status to `in-progress` before implementation.
2. Rebuild the route against the listed sections, interactions, features, states, and contract IDs; reuse non-visual actions/data code only after confirming its authorization boundary.
3. Run `pnpm --filter @hockey-life/league-sites rebuild:test` and `pnpm --filter @hockey-life/league-sites rebuild:tracker` after any route/status change.
4. Move the route to `review`, capture desktop/mobile and state evidence, and run type-check, lint, and build.
5. Set `complete` only after visual, keyboard, responsive, error/empty/auth, and data-contract acceptance passes.

## Acceptance criteria

- [ ] All 56 page routes still exist and each wrapper references exactly one matching manifest ID.
- [ ] All 11 non-visual route handlers remain byte-for-byte untouched by the UI scaffold commit.
- [ ] No files under `src/lib`, `src/hooks`, `src/providers`, middleware, Supabase, shared packages, or other apps change in the scaffold commit.
- [ ] The route-coverage tests and live verifier pass and the generated checklist is current.
- [ ] League-sites type-check, lint, and production build pass or any pre-existing baseline blocker is documented with exact output.
- [ ] Each completed route has phone and desktop evidence plus loading, empty, error, auth/role, subscription, accessibility, and SEO review as applicable.
- [ ] No secrets or real environment values are added to source, documentation, commits, or logs.

## Exact preserved boundaries

- `apps/league-sites/src/lib/**`, `src/hooks/**`, `src/providers/**`, `src/middleware.ts`, instrumentation, Sentry config, robots, and sitemap remain the source contracts for later reconnection.
- `apps/league-sites/src/app/**/route.ts(x)` handlers remain operational code and are not UI placeholders.
- `apps/league-builder`, `apps/mobile`, `apps/player-companion`, shared packages, Supabase migrations, lockfiles, and production infrastructure are out of scope.
- The original production UI remains recoverable from `origin/production`, the pre-rebuild branch/tag, and the saved git bundle.

## Preserved non-visual route handlers

These handlers are inventory-only and must not be rewritten by the UI rebuild.

- `/[leagueSlug]/manifest.webmanifest` — `src/app/[leagueSlug]/manifest.webmanifest/route.ts` — Generate the league-branded PWA manifest.
- `/[leagueSlug]/register/invite-image` — `src/app/[leagueSlug]/register/invite-image/route.tsx` — Generate captain/player registration invite artwork.
- `/api/admin/game-lifecycle` — `src/app/api/admin/game-lifecycle/route.ts` — Server-to-server game finalize/reopen escape hatch.
- `/api/auth/callback` — `src/app/api/auth/callback/route.ts` — Complete Supabase authentication and safe redirects.
- `/api/cron/auto-finalize-games` — `src/app/api/cron/auto-finalize-games/route.ts` — Finalize eligible games from the scheduled job.
- `/api/cron/push-reminders` — `src/app/api/cron/push-reminders/route.ts` — Send scheduled push reminders.
- `/api/public/live-game` — `src/app/api/public/live-game/route.ts` — Expose tenant-scoped public live-game state.
- `/api/push/subscribe` — `src/app/api/push/subscribe/route.ts` — Create and manage web-push subscriptions.
- `/api/push/team-toggle` — `src/app/api/push/team-toggle/route.ts` — Toggle team-level push preferences.
- `/api/revalidate` — `src/app/api/revalidate/route.ts` — Securely invalidate league-site cache paths.
- `/api/scorekeeper/analyze-scoresheet` — `src/app/api/scorekeeper/analyze-scoresheet/route.ts` — Analyze uploaded scoresheets for assisted stat entry.
