# Phase 1C: Admin Operations Console Specification

**Version:** 1.0
**Date:** 2026-02-02
**Status:** Design Complete

---

## Overview

Phase 1C enhances the admin experience for league management with inline editing, bulk operations, audit logging, undo capability, and keyboard shortcuts. This builds on the existing Phase 1A (Schedule Management) and Phase 1B (Notifications) infrastructure.

---

## Features

### 1. Inline Game Editing

**Goal:** Allow admins to edit game time and venue directly in the table without opening a modal.

**User Flow:**
1. Admin views games table
2. Clicks on a time or venue cell
3. Cell transforms into editable input
4. Admin makes change
5. Presses Enter to save or Escape to cancel
6. Conflict detection runs in background
7. Success/error toast shown

**UI Components:**

```
InlineEditCell
├── Display Mode (default)
│   └── Shows value with subtle edit icon on hover
├── Edit Mode (on click)
│   ├── Time: datetime-local input
│   └── Venue: text input with autocomplete
└── Saving Mode
    └── Shows spinner while saving
```

**Implementation:**

```typescript
// src/components/admin/InlineEditCell.tsx
interface InlineEditCellProps {
  value: string;
  type: 'datetime' | 'text' | 'select';
  onSave: (newValue: string) => Promise<{ success: boolean; error?: string }>;
  options?: { label: string; value: string }[]; // for select type
  venueAutocomplete?: boolean;
  disabled?: boolean;
}
```

**Behavior:**
- Click to enter edit mode
- Tab moves to next editable cell
- Enter saves, Escape cancels
- Auto-save after 2 second idle (optional, configurable)
- Optimistic UI update with rollback on error
- Conflict detection for time changes
- Shows warning badge if conflicts detected

**Editable Fields:**
| Field | Type | Validation |
|-------|------|------------|
| scheduled_at | datetime | Future date, no conflicts |
| location | text | Max 100 chars |

**Non-editable inline (use modal):**
- Teams (requires conflict check)
- Status (has side effects)
- Scores (needs validation)

---

### 2. Bulk Postpone by Date Range

**Goal:** Select a date range and postpone all scheduled games within that range.

**User Flow:**
1. Admin clicks "Bulk Actions" dropdown
2. Selects "Postpone by Date Range"
3. Date range picker appears
4. Admin selects start and end dates
5. Preview shows affected games count
6. Admin confirms with reason
7. All games in range are postponed
8. Notifications sent to affected captains

**UI Components:**

```
BulkPostponeDialog
├── DateRangePicker
│   ├── Start Date
│   └── End Date
├── Preview Panel
│   ├── Games count
│   ├── Teams affected
│   └── Conflict warnings
├── Reason Input
│   └── Dropdown + custom text
└── Action Buttons
    ├── Cancel
    └── Postpone X Games
```

**Implementation:**

```typescript
// src/components/schedule/BulkPostponeDialog.tsx
interface BulkPostponeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  seasonId: string;
  onSuccess: () => void;
}

// API endpoint
// POST /api/[tenant]/games/bulk-postpone
interface BulkPostponeRequest {
  startDate: string; // ISO date
  endDate: string;   // ISO date
  reason: string;
  notifyCaptains: boolean;
  seasonId?: string; // optional filter
}

interface BulkPostponeResponse {
  postponedCount: number;
  failedCount: number;
  games: { id: string; scheduledAt: string; error?: string }[];
}
```

**Predefined Reasons:**
- Weather/Ice conditions
- Arena maintenance
- Holiday break
- League decision
- Other (custom text)

---

### 3. Audit Log Middleware

**Goal:** Track all admin actions with before/after state for accountability and undo capability.

**Architecture:**

```
Admin Action → API Route → Audit Middleware → Database
                              ↓
                        audit_logs table
                              ↓
                        Undo Service
```

**Database Schema:**

```sql
-- supabase/migrations/20260202_create_audit_logs.sql
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  league_id UUID NOT NULL REFERENCES leagues(id),
  user_id UUID NOT NULL REFERENCES auth.users(id),

  -- Action metadata
  action TEXT NOT NULL, -- 'game.update', 'game.cancel', 'game.bulk_postpone', etc.
  entity_type TEXT NOT NULL, -- 'game', 'team', 'player', etc.
  entity_id UUID NOT NULL,

  -- State tracking
  before_state JSONB, -- snapshot before change
  after_state JSONB,  -- snapshot after change
  changes JSONB,      -- diff of changes

  -- Undo support
  is_undoable BOOLEAN DEFAULT true,
  undone_at TIMESTAMPTZ,
  undone_by UUID REFERENCES auth.users(id),

  -- Context
  reason TEXT,
  ip_address INET,
  user_agent TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_audit_logs_league_id ON audit_logs(league_id);
CREATE INDEX idx_audit_logs_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_created ON audit_logs(created_at DESC);
CREATE INDEX idx_audit_logs_undoable ON audit_logs(is_undoable, undone_at)
  WHERE is_undoable = true AND undone_at IS NULL;

-- RLS
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their league's audit logs"
  ON audit_logs FOR SELECT
  USING (league_id IN (
    SELECT league_id FROM league_members
    WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
  ));

CREATE POLICY "System can insert audit logs"
  ON audit_logs FOR INSERT
  WITH CHECK (true);
```

**Middleware Implementation:**

```typescript
// src/lib/audit/audit-service.ts
interface AuditEntry {
  action: string;
  entityType: string;
  entityId: string;
  beforeState?: Record<string, unknown>;
  afterState?: Record<string, unknown>;
  reason?: string;
}

class AuditService {
  async log(entry: AuditEntry): Promise<void>;
  async getHistory(entityType: string, entityId: string): Promise<AuditLog[]>;
  async getUndoable(leagueId: string, limit?: number): Promise<AuditLog[]>;
  async undo(auditLogId: string): Promise<{ success: boolean; error?: string }>;
}
```

**Actions to Audit:**
| Action | Entity | Undoable |
|--------|--------|----------|
| game.create | game | Yes (delete) |
| game.update | game | Yes |
| game.cancel | game | Yes (restore) |
| game.reschedule | game | Yes |
| game.bulk_postpone | game[] | Yes |
| game.delete | game | No |
| team.update | team | Yes |
| player.transfer | player | Yes |
| season.update | season | Yes |

---

### 4. Undo Capability

**Goal:** Allow admins to undo recent actions using audit log data.

**User Flow:**
1. Admin performs an action (e.g., reschedules game)
2. Toast shows "Game rescheduled" with "Undo" button
3. Admin clicks Undo within 30 seconds
4. System restores previous state
5. New audit log entry created for undo action

**UI Components:**

```
UndoToast (sonner custom component)
├── Action description
├── Timer indicator (30s countdown)
└── Undo button

UndoHistoryPanel (admin sidebar)
├── Recent actions list (last 24h)
├── Each item shows:
│   ├── Action description
│   ├── Timestamp
│   ├── User
│   └── Undo button (if undoable)
└── "View all" link to full audit log
```

**Implementation:**

```typescript
// src/lib/audit/undo-service.ts
interface UndoService {
  // Called after successful action
  showUndoToast(
    auditLogId: string,
    description: string,
    timeoutMs?: number
  ): void;

  // Performs the undo
  performUndo(auditLogId: string): Promise<{
    success: boolean;
    error?: string;
    restoredState?: Record<string, unknown>;
  }>;

  // Gets recent undoable actions
  getUndoableActions(leagueId: string): Promise<AuditLog[]>;
}

// Undo strategies per action type
const undoStrategies: Record<string, UndoStrategy> = {
  'game.update': async (log) => {
    // Restore beforeState to game
    await updateGame(log.entity_id, log.before_state);
  },
  'game.cancel': async (log) => {
    // Restore game status from beforeState
    await updateGame(log.entity_id, { status: log.before_state.status });
  },
  'game.bulk_postpone': async (log) => {
    // Restore each game's original scheduled_at
    for (const game of log.before_state.games) {
      await updateGame(game.id, {
        scheduled_at: game.scheduled_at,
        status: 'scheduled'
      });
    }
  },
};
```

**Undo Constraints:**
- 30-second window for toast undo
- 24-hour window for history panel undo
- Cannot undo if entity has been modified since
- Cannot undo deleted entities
- Cannot undo if downstream effects occurred (e.g., game was played)

---

### 5. Keyboard Shortcuts

**Goal:** Enable power users to navigate and perform actions quickly.

**Shortcut Map:**

| Shortcut | Action | Scope |
|----------|--------|-------|
| `j` / `k` | Navigate down/up in table | Games table |
| `Enter` | Edit selected row | Games table |
| `e` | Edit selected game time | Games table |
| `v` | Edit selected game venue | Games table |
| `c` | Cancel selected game | Games table |
| `r` | Reschedule selected game | Games table |
| `Escape` | Close dialog / Cancel edit | Global |
| `Ctrl+Z` | Undo last action | Global |
| `Ctrl+S` | Save current edit | Edit mode |
| `/` | Focus search/filter | Global |
| `?` | Show keyboard shortcuts help | Global |
| `g g` | Go to top of list | Games table |
| `G` | Go to bottom of list | Games table |
| `Space` | Toggle selection | Games table |
| `Ctrl+A` | Select all visible games | Games table |

**Implementation:**

```typescript
// src/hooks/use-keyboard-shortcuts.ts
interface ShortcutConfig {
  key: string;
  modifiers?: ('ctrl' | 'alt' | 'shift' | 'meta')[];
  action: () => void;
  scope?: string;
  description: string;
}

function useKeyboardShortcuts(shortcuts: ShortcutConfig[]): void;

// src/components/admin/KeyboardShortcutsHelp.tsx
// Modal showing all available shortcuts, triggered by '?'
```

**Focus Management:**
- Table rows are focusable with tabindex
- Current selection highlighted
- Arrow keys for navigation
- Visual indicator of keyboard mode

---

## API Endpoints

### New Endpoints

```typescript
// POST /api/[tenant]/games/bulk-postpone
// Postpone multiple games by date range

// GET /api/[tenant]/audit-logs
// List audit logs with filters

// POST /api/[tenant]/audit-logs/[id]/undo
// Undo a specific action

// GET /api/[tenant]/games/[id]/history
// Get change history for a game
```

---

## Database Migrations

```
supabase/migrations/
├── 20260202_create_audit_logs.sql
└── 20260202_add_game_version.sql (for optimistic locking)
```

---

## Components to Create

```
src/components/admin/
├── InlineEditCell.tsx         # Click-to-edit table cell
├── InlineEditDatetime.tsx     # Datetime picker cell
├── InlineEditVenue.tsx        # Venue input with autocomplete
├── KeyboardShortcutsHelp.tsx  # Help modal
└── UndoHistoryPanel.tsx       # Recent actions sidebar

src/components/schedule/
└── BulkPostponeDialog.tsx     # Date range postpone

src/hooks/
├── use-keyboard-shortcuts.ts  # Keyboard handling
├── use-inline-edit.ts         # Edit state management
└── use-table-navigation.ts    # Row selection/navigation

src/lib/audit/
├── audit-service.ts           # Core audit functionality
├── undo-service.ts            # Undo logic
└── types.ts                   # Audit types
```

---

## Implementation Order

1. **Audit Log Infrastructure** (Task #4)
   - Create audit_logs table migration
   - Build AuditService class
   - Add audit logging to existing game actions

2. **Inline Editing Components** (Task #3)
   - Build InlineEditCell base component
   - Add datetime and venue variants
   - Integrate with games table

3. **Bulk Postpone** (Task #5)
   - Build BulkPostponeDialog
   - Create bulk-postpone API endpoint
   - Add date range picker UI

4. **Undo Capability** (Task #6)
   - Build UndoService
   - Create undo API endpoint
   - Add undo toast and history panel

5. **Keyboard Shortcuts** (Task #7)
   - Create useKeyboardShortcuts hook
   - Add table navigation
   - Build shortcuts help modal

---

## Testing Strategy

### Unit Tests
- AuditService logging
- UndoService state restoration
- InlineEditCell state transitions
- Keyboard shortcut handlers

### Integration Tests
- Bulk postpone with notifications
- Undo after reschedule
- Inline edit with conflict detection

### E2E Tests
- Full admin workflow: view → edit → undo
- Bulk postpone date range
- Keyboard navigation through table

---

## Success Criteria

- [ ] Admin can click any time/venue cell to edit inline
- [ ] Inline edits save on Enter, cancel on Escape
- [ ] Bulk postpone shows preview of affected games
- [ ] All admin actions create audit log entries
- [ ] Undo toast appears for 30 seconds after actions
- [ ] Ctrl+Z undoes last action
- [ ] Keyboard shortcuts work for table navigation
- [ ] '?' shows shortcuts help modal

---

## Risks and Mitigations

| Risk | Mitigation |
|------|------------|
| Undo conflicts with concurrent edits | Check entity version before undo |
| Audit log size growth | Archive logs older than 90 days |
| Keyboard shortcuts conflict with browser | Use non-conflicting combinations |
| Inline edit UX on mobile | Show modal on touch devices |

---

## Dependencies

- Phase 1A: Schedule Management (complete)
- Phase 1B: Notifications (complete)
- sonner: Toast notifications
- date-fns: Date handling
- react-day-picker: Date range selection

---

**Document Version:** 1.0
**Next Review:** After implementation begins
