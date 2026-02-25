# Task: Bug Reporter System

## Context
This is a Next.js 14+ monorepo (Turborepo). Read the full feature spec at `blh-features/bug-reporter.md` for detailed architecture. Key points summarized below.

**Monorepo structure:**
- `apps/league-builder` — admin dashboard (league owners)
- `apps/league-sites` — public-facing league sites (players, goalies, fans)
- `packages/database` — shared types
- `packages/ui` — shared components

**Existing patterns to follow:**
- Supabase client: `apps/league-builder/src/lib/supabase/server.ts` and `apps/league-sites/src/lib/supabase/`
- Server actions: `apps/league-builder/src/lib/actions/`
- i18n: `apps/league-builder/src/messages/en.json` and `fr.json`
- New tables use `as any` type cast on `.from()` calls since Supabase types haven't been regenerated

## What to Build

### 1. Database Migration (`supabase/migrations/20260225_bug_reporter.sql`)

Create `bug_reports` table with these columns:
- `id` UUID PK
- `league_id` UUID NOT NULL references leagues
- `season_id` UUID references seasons (nullable)
- `team_id` UUID references teams (nullable)
- `reporter_id` UUID references profiles (nullable — anonymous allowed)
- `description` TEXT NOT NULL
- `expected_behavior` TEXT
- `category` TEXT NOT NULL DEFAULT 'bug' — enum: bug, visual, confusing, suggestion, other
- `url` TEXT NOT NULL
- `route_params` JSONB DEFAULT '{}'
- `user_role` TEXT
- `browser_info` JSONB NOT NULL
- `console_logs` JSONB DEFAULT '[]'
- `network_errors` JSONB DEFAULT '[]'
- `navigation_history` JSONB DEFAULT '[]'
- `user_interactions` JSONB DEFAULT '[]'
- `performance_data` JSONB DEFAULT '{}'
- `error_state` JSONB
- `screenshot_url` TEXT
- `app_state` JSONB DEFAULT '{}'
- `severity` TEXT DEFAULT 'medium' — critical, high, medium, low
- `status` TEXT DEFAULT 'new' — new, investigating, fix_deployed, closed, duplicate, wont_fix
- `resolution_notes` TEXT
- `resolved_at` TIMESTAMPTZ
- `resolved_by` UUID references profiles
- `github_issue_url` TEXT
- `error_signature` TEXT (hash for dedup)
- `duplicate_of` UUID self-reference
- `report_count` INTEGER DEFAULT 1
- `created_at` TIMESTAMPTZ DEFAULT NOW()
- `updated_at` TIMESTAMPTZ DEFAULT NOW()

RLS policies:
- Anyone can INSERT (including anonymous)
- League owners can SELECT their league's reports
- Platform admins can SELECT all
- Owners + admins can UPDATE

Indexes on: league_id+status, severity+status, error_signature, created_at DESC

Also create a Supabase Storage bucket policy for `bug-report-screenshots` (or just store base64 in the screenshot_url field as a data URI to keep it simple — max 500KB).

### 2. Client-Side Collector (`apps/league-sites/src/lib/bug-report-collector.ts`)

Singleton service that runs silently on every page:

```typescript
class BugReportCollector {
  private consoleLogs: LogEntry[] = []; // ring buffer, max 50
  private networkErrors: NetworkError[] = []; // ring buffer, max 20
  private navigationHistory: string[] = []; // max 10
  private userInteractions: Interaction[] = []; // max 5
  private unhandledErrors: ErrorInfo[] = [];
  
  init() {
    // Monkey-patch console.log/warn/error to capture entries
    // Monkey-patch fetch to capture failed requests (status >= 400)
    // Listen to Next.js router events for navigation history
    // Add click/submit event listeners for interaction tracking
    // window.onerror + unhandledrejection for errors
  }
  
  getReport(): CollectedData {
    // Return all captured data
    // Sanitize: strip anything that looks like a token/key from logs
  }
  
  captureScreenshot(): Promise<string> {
    // Use html2canvas to capture viewport
    // Compress to JPEG 60% quality
    // Return as base64 data URI
    // If html2canvas not available, skip gracefully
  }
}
```

**Privacy rules:**
- Never capture form field values
- Sanitize console logs: strip strings matching JWT/token/key/password patterns
- Max 100KB total buffered data

### 3. Bug Report UI Components (league-sites)

#### `BugReportButton.tsx` (`apps/league-sites/src/components/bug-report/BugReportButton.tsx`)
- Fixed position bottom-right corner
- Small bug icon (use 🐛 emoji or Lucide `Bug` icon)
- Subtle, semi-transparent until hover
- Click opens BugReportModal
- Shows small red dot if there's been a console error in this session

#### `BugReportModal.tsx` (`apps/league-sites/src/components/bug-report/BugReportModal.tsx`)

**IMPORTANT: Double confirmation flow.**

**Step 1 — Report Form:**
- "What happened?" textarea (required, 500 char max)
- "What did you expect?" textarea (optional)
- Category dropdown: Something broke / Looks wrong / Confusing / Suggestion / Other
- "Next" button (NOT submit)

**Step 2 — Confirmation:**
- Shows a summary: "You're about to submit a bug report"
- Shows their description back to them
- Shows the category they picked
- Shows what data will be included: "We'll include a screenshot, your browser info, and error logs to help us fix this faster"
- Two buttons: "Go Back" (returns to step 1) and "Submit Report"
- Submit button requires a brief pause (1.5 second delay before it becomes clickable) to force them to read

**Step 3 — Success:**
- "Thanks! We'll look into this." message
- Auto-closes after 3 seconds

#### `BugReportProvider.tsx` (`apps/league-sites/src/components/bug-report/BugReportProvider.tsx`)
- React context that initializes BugReportCollector on mount
- Wraps the app layout
- Provides collector instance to BugReportButton/Modal via context

### 4. Server Action (`apps/league-sites/src/lib/actions/bug-report.ts`)

`submitBugReport(data)`:
- Receives form data + collected context
- Generates error_signature from: primary error message (normalized) + URL path pattern (UUIDs replaced with :id) + browser category
- Checks for existing reports with same error_signature in last 7 days → if found, increment report_count on original and set duplicate_of
- Auto-classify severity:
  - Critical: unhandled exception + error boundary
  - High: API 500 or console error present
  - Medium: default
  - Low: category is suggestion or confusing
- Insert into bug_reports
- Return success

### 5. League Owner Dashboard (`apps/league-builder/src/app/[locale]/dashboard/leagues/[id]/bugs/page.tsx`)

**Summary cards at top:**
- Open bugs count
- Critical bugs count
- Reports this week
- Resolved this month

**Table view:**
- Columns: Date, Description (truncated), Category, Severity, Status, Reports (count), Actions
- Sortable by any column
- Filters: status, severity, category, date range
- Click row → expands inline detail view

**Detail view shows:**
- Full description + expected behavior
- Screenshot (if captured)
- Browser info (formatted nicely)
- Console errors (code block, scrollable)
- Failed network requests
- Navigation breadcrumb trail
- User interactions
- Quick action buttons: Set status (investigating/closed/wont_fix/duplicate), Add resolution notes

**Add "Bug Reports" to league sidebar nav** (use Lucide `Bug` icon)

### 6. Integration into Layout

Add `BugReportProvider` + `BugReportButton` to the league-sites root layout:
- `apps/league-sites/src/app/[leagueSlug]/layout.tsx` — wrap children with BugReportProvider, add BugReportButton at the bottom

### 7. i18n

Add translations to both en.json and fr.json for:
- Bug report button label
- Modal titles, field labels, confirmation text
- Dashboard labels
- Status/severity/category labels

## Dependencies

You may need `html2canvas` — check if it's already in the monorepo. If not, add it to `apps/league-sites/package.json`. If adding a dependency is problematic, make the screenshot feature optional (graceful fallback to no screenshot).

## IMPORTANT NOTES

- Use `as any` type casts on `.from('bug_reports')` Supabase calls since types haven't been regenerated
- Do NOT use `CREATE POLICY IF NOT EXISTS` — use `DROP POLICY IF EXISTS` then `CREATE POLICY`
- The double confirmation is critical — Step 1 (form) → Step 2 (review + confirm with delay) → Step 3 (success)
- Follow existing component patterns in the codebase
- All new files should be TypeScript (.ts/.tsx)
- Check existing layout files before modifying to understand current structure

## When Done

Run: `openclaw system event --text "Bug Reporter system complete — collector, UI, dashboard, migration" --mode now`
