# BLH Bug Reporter — Full Spec

## Why This Matters

At CARHA scale (500+ leagues), you can't rely on "hey Nick my schedule looks weird" texts. You need structured, context-rich bug reports that tell you exactly what happened without a back-and-forth. This turns every player into a QA tester without them knowing it.

---

## Architecture

### What Gets Captured (Automatically, On Click)

**Environment Context:**
- Browser + version (Chrome 120, Safari 18, etc.)
- Device type + OS (iPhone 15 / iOS 18, Galaxy S24 / Android 15)
- Screen resolution + viewport size
- Current URL + route parameters
- League slug, season, team context (from app state)
- User role (player, captain, goalie, scorekeeper, anonymous)
- Auth status (logged in / anonymous / expired session)
- Timestamp + timezone

**Error State:**
- Last 50 console log entries (errors, warnings, info)
- Any unhandled JS exceptions in the session
- Failed network requests (URL, status code, response body preview — last 20)
- Performance entries (slow API calls > 2s)
- Current React error boundary state if in error UI

**Visual Context:**
- Screenshot of current viewport (html2canvas or native Canvas API)
- Highlighted element if user clicks "point to the problem"
- Current scroll position
- Active modal/dialog state

**User Journey:**
- Last 10 page navigations (breadcrumb trail)
- Last 5 user interactions (clicks, form submissions)
- Time on current page
- Referrer

### What the User Provides

Simple modal with 3 fields:
1. **What happened?** (required, free text, 500 char max)
2. **What did you expect?** (optional, free text)
3. **Category** (dropdown: Something broke / Looks wrong / Confusing / Suggestion / Other)

That's it. No email, no name, no account creation. We already know who they are from auth context.

---

## Database

```sql
CREATE TABLE bug_reports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  league_id UUID NOT NULL REFERENCES leagues(id) ON DELETE CASCADE,
  season_id UUID REFERENCES seasons(id),
  team_id UUID REFERENCES teams(id),
  reporter_id UUID REFERENCES profiles(id),  -- NULL if anonymous
  
  -- User input
  description TEXT NOT NULL,
  expected_behavior TEXT,
  category TEXT NOT NULL DEFAULT 'bug',  -- bug, visual, confusing, suggestion, other
  
  -- Auto-captured context
  url TEXT NOT NULL,
  route_params JSONB DEFAULT '{}',
  user_role TEXT,  -- player, captain, goalie, scorekeeper, owner, anonymous
  browser_info JSONB NOT NULL,  -- { name, version, os, device, screen, viewport }
  console_logs JSONB DEFAULT '[]',  -- last 50 entries
  network_errors JSONB DEFAULT '[]',  -- failed requests
  navigation_history JSONB DEFAULT '[]',  -- last 10 pages
  user_interactions JSONB DEFAULT '[]',  -- last 5 clicks/submits
  performance_data JSONB DEFAULT '{}',  -- slow calls, page load time
  error_state JSONB,  -- unhandled exceptions, error boundary info
  screenshot_url TEXT,  -- Supabase Storage path
  app_state JSONB DEFAULT '{}',  -- relevant React state snapshot
  
  -- Metadata
  severity TEXT DEFAULT 'medium',  -- critical, high, medium, low
  status TEXT DEFAULT 'new',  -- new, investigating, fix_deployed, closed, duplicate, wont_fix
  resolution_notes TEXT,
  resolved_at TIMESTAMPTZ,
  resolved_by UUID REFERENCES profiles(id),
  github_issue_url TEXT,  -- auto-created issue link
  
  -- Auto-classification
  error_signature TEXT,  -- hash of primary error for dedup
  duplicate_of UUID REFERENCES bug_reports(id),
  report_count INTEGER DEFAULT 1,  -- incremented when duplicates found
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_bug_reports_league ON bug_reports(league_id, status);
CREATE INDEX idx_bug_reports_severity ON bug_reports(severity, status);
CREATE INDEX idx_bug_reports_error_sig ON bug_reports(error_signature);
CREATE INDEX idx_bug_reports_created ON bug_reports(created_at DESC);

-- RLS
ALTER TABLE bug_reports ENABLE ROW LEVEL SECURITY;

-- Anyone can submit (including anonymous via league site)
CREATE POLICY "Anyone can create bug reports" ON bug_reports
  FOR INSERT WITH CHECK (true);

-- League owners see their league's reports
CREATE POLICY "League owners view reports" ON bug_reports
  FOR SELECT USING (
    league_id IN (SELECT id FROM leagues WHERE owner_id = auth.uid())
  );

-- Platform admins see all (Nick)
CREATE POLICY "Platform admins view all" ON bug_reports
  FOR SELECT USING (
    auth.uid() IN (SELECT user_id FROM platform_admins)
  );

-- Only owners/admins can update status
CREATE POLICY "Owners manage reports" ON bug_reports
  FOR UPDATE USING (
    league_id IN (SELECT id FROM leagues WHERE owner_id = auth.uid())
    OR auth.uid() IN (SELECT user_id FROM platform_admins)
  );
```

---

## Client-Side Collector

### `BugReportCollector` (singleton service)

Runs silently in the background on every league-sites page:

```
- Captures console.log/warn/error (monkey-patches console, keeps ring buffer of 50)
- Intercepts fetch/XHR failures (monkey-patches fetch, logs failed requests)
- Tracks navigation history (Next.js router events)
- Records user interactions (click/submit event listeners on document)
- Catches unhandled errors (window.onerror + unhandledrejection)
- Monitors performance (PerformanceObserver for slow resources)
```

**Memory budget:** Max 100KB of buffered data. Ring buffers auto-evict oldest entries.

**Privacy:** No form field values captured. No passwords. No personal data beyond what's in the app state. Console logs are sanitized to strip any string that looks like a token or key.

### Screenshot Capture

Use `html2canvas` (already common in Next.js apps) or the native `HTMLCanvasElement.toBlob()` approach:
- Capture on button click, before modal opens
- Compress to JPEG at 60% quality (keeps size under 200KB)
- Upload to Supabase Storage bucket `bug-report-screenshots`
- Signed URL stored in `screenshot_url`

---

## UI Components

### Floating Bug Report Button (`BugReportButton.tsx`)

- Fixed position, bottom-right corner
- Small beetle/bug icon (🐛) 
- Subtle, doesn't interfere with gameplay
- Expands on hover to show "Report a Bug" text
- Click opens the report modal
- Shows a small red dot if there's an active error boundary or console error

### Report Modal (`BugReportModal.tsx`)

- Clean, minimal overlay
- "What happened?" textarea (required)
- "What did you expect?" textarea (optional)
- Category dropdown
- "Point to the problem" toggle — lets user click an element to highlight it
- Submit button
- "Sending..." state with progress
- "Thanks! We'll look into this." confirmation
- Auto-closes after 3 seconds

### League Owner Bug Dashboard (`BugReportsDashboard.tsx`)

New page in league-builder: `/dashboard/leagues/[id]/bugs`

- **Summary cards:** Open bugs, Critical, This week, Resolved
- **Table view:** All reports, sortable by date/severity/status/category
- **Filters:** Status, severity, category, date range
- **Click to expand:** Full context view with screenshot, console logs, navigation trail
- **Quick actions:** Mark as investigating, close, mark duplicate, create GitHub issue
- **Duplicate detection:** Reports with matching error_signature grouped together with count

### Platform Admin View (Nick's view)

Global bugs page: `/dashboard/admin/bugs`
- Cross-league view of all reports
- Trending errors (same error_signature across multiple leagues = platform bug)
- Auto-severity: if 5+ reports with same signature in 24h → auto-escalate to critical

---

## Auto-Classification & Dedup

### Error Signature

Generated from:
- Primary console error message (normalized — strip dynamic IDs, timestamps)
- URL path pattern (replace UUIDs with `:id`)
- Browser category (Chrome/Safari/Firefox)

Two reports with the same signature = same bug. Increment `report_count` on the original, link the new one as `duplicate_of`.

### Auto-Severity

- **Critical:** Unhandled exception + error boundary triggered
- **High:** API 500 error or console error present
- **Medium:** Default for user-reported issues
- **Low:** Category is "suggestion" or "confusing"

### Auto-Fix Pipeline (Phase 2)

When a critical/high bug hits 3+ reports:
1. Nova gets notified via iMessage
2. Nova reviews the error context (console logs, stack trace, URL)
3. If it's a clear code bug, spin up a Codex agent with the error context
4. Agent creates a fix PR on a `bugfix/` branch
5. Nova reviews, merges if clean, deploys
6. Auto-updates bug report status to `fix_deployed`
7. Could even notify the original reporter: "We fixed the issue you reported!"

This closes the loop from user report → auto-fix → user notification. Full cycle.

---

## Integration Points

- **Supabase Storage:** Screenshot uploads to `bug-report-screenshots` bucket
- **GitHub Issues:** Optional auto-create via `gh` CLI for platform-level bugs
- **Email/Notification:** Notify league owner when critical bug reported in their league
- **Analytics:** Track bug report volume as product health metric
- **Command Center:** Bug report feed in Nova's ops dashboard

---

## Implementation Order

1. **Database migration** — `bug_reports` table + RLS + indexes
2. **BugReportCollector** — client-side silent data collection service
3. **BugReportButton + Modal** — floating button on league-sites
4. **Server action** — submit report + screenshot upload
5. **League Owner Dashboard** — view/manage reports
6. **Dedup + auto-classification** — error signatures, severity
7. **Platform Admin View** — cross-league trending bugs
8. **Auto-fix pipeline** — Nova + Codex integration (Phase 2)

---

## What Makes This Different

Most bug report tools (Sentry, BugSnag) are developer tools. This is a **player-facing** bug report that:
- Requires zero technical knowledge from the reporter
- Captures everything a developer needs without asking for it
- Deduplicates automatically so you see 1 bug with 47 reports, not 47 tickets
- Ties directly into the league context (which league, which team, which page)
- Can auto-fix common issues without human intervention

At CARHA scale with thousands of users across hundreds of leagues, this is the difference between drowning in support emails and having a self-healing platform.
