# BeerLeagueHockey.ca — Changelog

---

## v2.4.0 — February 24, 2026

### 🥅 Goalie Marketplace (NEW)

The #1 pain point in beer league hockey — solved. When your goalie bails, you need a replacement fast.

**For League Owners:**
- **Goalie Pool Management** — View and manage all registered substitute goalies in your league
- **Goalie Pool Settings** — New section in League Settings to configure marketplace preferences
- **Request Visibility** — See all open and filled goalie requests across your league

**For Team Captains:**
- **Request a Sub Goalie** — One-click "Request Goalie" button on any upcoming game page
- **Automatic Notifications** — All available goalies in the pool get notified instantly via email
- **First-Come, First-Serve** — First goalie to accept gets the gig. No back-and-forth.
- **Confirmation Alerts** — Get notified when your request is filled, with goalie contact info

**For Goalies:**
- **Self-Registration** — Public registration page on your league's site. No account needed, no password.
- **Magic Link Accept** — Accept game requests with one click from your email. Zero friction.
- **Post-Game Ratings** — Captains can rate goalies after the game to build reputation

**New Pages:**
- `/goalies/register` — Public goalie registration on any league site
- `/goalies/accept/[token]` — Token-based game acceptance (no login required)
- Goalie Pool tab in League Settings dashboard

---

### 📊 Player Rating System (NEW)

Smart, stats-based player ratings that go beyond self-assessment. Ratings are calculated from actual game performance, weighted by division difficulty.

**Rating Scale:** A+ through D- (13 tiers)

**For Skaters — Rated On:**
- Points per game
- Plus/minus differential
- Penalty minutes (negative factor)
- Games played & attendance rate

**For Goalies — Rated On:**
- Save percentage
- Goals against average
- Win percentage
- Games played & shutouts

**Division Weighting:**
- Tier 1 (top division): 1.0x weight, 60th percentile floor
- Tier 2: 0.85x weight, 40th percentile floor
- Tier 3: 0.75x weight, 25th percentile floor
- Tier 4 (lowest): 0.65x weight, 10th percentile floor

A "B" player in Division 1 is not the same as a "B" player in Division 4 — and the system knows it.

**Team Ratings:**
- Aggregate team grades based on roster composition
- Offense, defense, and goaltending sub-ratings
- Win/loss record factor

**Division Balance Dashboard:**
- Visual breakdown of team ratings per division
- Flags teams playing above or below their division level
- Promotion/relegation recommendations (suggestions only — league owner always decides)
- Balance improvement score

**Privacy:** Ratings are internal tools for league management only.
- League Owners: See everything
- Team Captains (draft leagues): See league-wide ratings
- Team Captains (regular): See own team only
- Players/Goalies: See nothing

**New Pages:**
- Player Ratings tab in league dashboard sidebar
- Player Directory with search, filter, and sort
- Team rating badges on roster and team views
- Division Balance Dashboard with recommendations
- Recalculate button for on-demand rating refresh

---

### 💳 Billing & Settings Updates

- Removed free tier — pricing standardized at **$299.99/month**
- Added **Financial Overview** to dashboard
- Added **Linked Accounts** settings (Google & Apple OAuth)
- Renamed "Teams" to "Leagues" in navigation for clarity
- **Feature Gating** for Advanced Stats and AI News addons

---

### 🔒 Security & Stability

- OAuth redirect validation hardened
- Service Worker security improvements
- Stripe CSP headers updated for CDN compatibility
- Webhook duplicate notification prevention
- Mobile sidebar fixes
- Full i18n coverage (English + French)

---

### 🧪 Testing & CI

- Unit test suite expanded: schedule, draft, OCR, registration, shared packages
- Redirect validation tests added
- CI pipeline now runs unit tests automatically
- Cross-workspace test coverage

---

### 🗄️ Database

- 6 new tables: `goalie_pool`, `goalie_requests`, `goalie_ratings`, `goalie_request_notifications`, `team_ratings`, `division_balance_snapshots`
- Full Row Level Security policies on all new tables
- Performance indexes for all new query patterns
- Minimum 5 games played before ratings appear

---

*Questions or feedback? Contact your league administrator or email support@beerleaguehockey.ca*
