# 🏒 Season Lifecycle & Draft Synchronization Plan

**Date:** January 2026  
**Goal:** Create a smooth, automated workflow from season start → draft → games → scores → weeks with real-time synchronization

---

## 📋 EXECUTIVE SUMMARY

This plan outlines the complete season lifecycle management system, including:
- Real-time draft synchronization across all users
- Draft scheduling system
- Automatic week progression (every Monday)
- Season archiving workflow
- Data consistency across the entire application

---

## 🎯 CORE REQUIREMENTS

### 1. Real-Time Draft Synchronization
- All captains see the same draft state simultaneously
- Live updates when picks are made
- Turn indicators synchronized
- Progress bars update in real-time
- No page refresh needed

### 2. Draft Scheduling
- Set draft date/time before season can be activated
- Draft must be scheduled before season status can change to "active"
- Email reminders sent before draft
- Countdown timer on draft page

### 3. Season Lifecycle Management
- Draft → Active → Playoffs → Completed → Archived
- Cannot activate season without scheduled draft
- Automatic progression through states
- Archive old seasons after completion

### 4. Week/Cycle Management
- Automatic week progression every Monday
- Track current week/cycle
- Week-based game scheduling
- Week-based stat summaries

### 5. Data Consistency
- Single source of truth for all data
- Real-time updates across all pages
- Cache invalidation on data changes
- Optimistic UI updates

---

## 🏗️ ARCHITECTURE DESIGN

### Real-Time Synchronization Strategy

**Option 1: Supabase Realtime (Recommended)**
- Use Supabase's built-in realtime subscriptions
- Subscribe to `drafts` and `draft_picks` tables
- Automatic updates when data changes
- No additional infrastructure needed

**Option 2: Polling (Fallback)**
- Poll every 2-3 seconds during active draft
- Less efficient but simpler
- Good for backup if realtime fails

**Implementation:**
- Use Supabase Realtime for drafts, games, stats
- Client-side subscriptions in React hooks
- Server-side revalidation for critical updates

### Database Schema Updates Needed

1. **Seasons Table:**
   - Add `draft_scheduled_at TIMESTAMPTZ` - When draft is scheduled
   - Add `draft_started_at TIMESTAMPTZ` - When draft actually started
   - Add `current_week INTEGER` - Current week number
   - Add `week_start_date DATE` - Start date of current week
   - Add `archived_at TIMESTAMPTZ` - When season was archived
   - Add `archived BOOLEAN DEFAULT FALSE` - Archive flag

2. **Drafts Table:**
   - Add `scheduled_at TIMESTAMPTZ` - Scheduled start time
   - Add `started_at TIMESTAMPTZ` - Actual start time
   - Add `pick_time_limit INTEGER` - Seconds per pick (optional)

3. **Games Table:**
   - Add `week_number INTEGER` - Which week the game belongs to
   - Add `cycle_number INTEGER` - Which 13-game cycle

4. **New Table: `weeks`** (Optional - for better week management):
   ```sql
   CREATE TABLE weeks (
     id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
     season_id UUID NOT NULL REFERENCES seasons(id),
     week_number INTEGER NOT NULL,
     start_date DATE NOT NULL,
     end_date DATE NOT NULL,
     status TEXT DEFAULT 'upcoming', -- upcoming, active, completed
     created_at TIMESTAMPTZ DEFAULT NOW(),
     UNIQUE (season_id, week_number)
   );
   ```

---

## 📅 SEASON LIFECYCLE WORKFLOW

### Phase 1: Season Creation & Draft Scheduling
```
1. Owner creates new season
2. Owner MUST schedule draft date/time
3. Season status = "draft_scheduled" (new status)
4. Cannot activate season until draft is scheduled
5. Email notifications sent to all captains about draft
```

### Phase 2: Draft Execution
```
1. Draft scheduled time arrives
2. Owner clicks "Start Draft" (or auto-start if configured)
3. Season status = "draft"
4. Draft status = "in_progress"
5. Real-time updates to all captains
6. Captains make picks in order
7. Draft completes when all picks made
8. Owner clicks "Complete Draft" → assigns players to teams
9. Season status = "active"
```

### Phase 3: Active Season
```
1. Games scheduled and played
2. Stats entered and verified
3. Week progression every Monday (automatic)
4. Current week tracked
5. Standings updated in real-time
6. After 13 games → auto-trigger draft mode
```

### Phase 4: Season Completion
```
1. Owner ends season (or playoffs complete)
2. Season status = "completed"
3. All games must be: completed, voided, or rescheduled
4. All stats verified
5. Owner can archive season
6. Season status = "archived"
7. Archived seasons moved to separate view
```

---

## 🔄 WEEK MANAGEMENT SYSTEM

### Automatic Week Progression

**Every Monday at 12:00 AM:**
1. Check all active seasons
2. Increment `current_week` for each active season
3. Update `week_start_date` to current Monday
4. Mark previous week as "completed"
5. Send weekly summary emails (optional)
6. Generate weekly wrap article (optional)

**Week Calculation:**
- Week 1 starts on season start date
- Each week = 7 days
- Week number = floor((current_date - season_start_date) / 7) + 1

**Implementation:**
- Cron job or scheduled function (Vercel Cron, Supabase Edge Function)
- Or manual "Advance Week" button for owner
- Track week boundaries for game scheduling

---

## 🎯 DRAFT SYNCHRONIZATION IMPLEMENTATION

### Real-Time Draft Updates

**Client-Side Hook:**
```typescript
// src/hooks/useDraftRealtime.ts
- Subscribe to drafts table changes
- Subscribe to draft_picks table changes
- Auto-update local state
- Show notifications for new picks
- Update turn indicators
```

**Server Actions:**
- All draft actions revalidate paths
- Return updated draft state
- Trigger realtime broadcasts

**UI Updates:**
- Live draft board with real-time pick feed
- Turn indicator updates automatically
- Progress bar animates smoothly
- Player list updates when picks made

---

## 📧 EMAIL NOTIFICATION SYSTEM

### Draft Notifications

1. **Draft Scheduled:**
   - Sent to all captains when draft is scheduled
   - Includes date, time, rules, link to draft board
   - Reminder 24 hours before
   - Reminder 1 hour before

2. **Draft Started:**
   - Sent when draft actually begins
   - "It's time to draft!" message
   - Direct link to draft board

3. **Your Turn to Pick:**
   - Sent when it's a captain's turn
   - "You're up!" notification
   - Link to make pick

4. **Draft Completed:**
   - Sent when draft finishes
   - Summary of all picks
   - Link to draft grades article

### Week Notifications

1. **New Week Started:**
   - Sent every Monday
   - Upcoming games for the week
   - Current standings
   - Weekly wrap article link

---

## 🗄️ SEASON ARCHIVING SYSTEM

### Archive Criteria

A season can be archived when:
- ✅ Status = "completed"
- ✅ All games are: completed, voided, or rescheduled
- ✅ All stats are verified (or owner manually approves)
- ✅ No pending suspensions
- ✅ All payments recorded (if applicable)

### Archive Process

1. Owner clicks "Archive Season"
2. System validates all criteria
3. Season status = "archived"
4. `archived_at` timestamp set
5. Season moved to "Archived Seasons" view
6. All data preserved (read-only)
7. Can still view stats, standings, articles

### Archived Season Access

- View-only access
- Historical stats preserved
- Standings frozen
- Articles preserved
- Can export data (optional)

---

## 🔄 DATA CONSISTENCY STRATEGY

### Single Source of Truth

1. **Database as Source:**
   - All data stored in Supabase
   - No local state conflicts
   - Server actions update database first

2. **Revalidation Strategy:**
   - Revalidate paths after mutations
   - Use Next.js `revalidatePath()` and `revalidateTag()`
   - Cache tags for granular invalidation

3. **Optimistic Updates:**
   - Update UI immediately
   - Rollback on error
   - Confirm with server response

4. **Real-Time Subscriptions:**
   - Subscribe to critical tables
   - Auto-update UI when data changes
   - Show loading states during updates

### Cache Management

- Use Next.js cache tags
- Tag by resource type (seasons, games, drafts)
- Invalidate on mutations
- Revalidate on page load

---

## 📊 WEEK/CYCLE TRACKING

### Week System

**Week Definition:**
- Week starts Monday 12:00 AM
- Week ends Sunday 11:59 PM
- Week number = sequential from season start

**Week Tracking:**
- `current_week` in seasons table
- `week_number` in games table
- Weekly summaries and stats

**Week Progression:**
- Automatic every Monday
- Or manual "Advance Week" button
- Validates all games from previous week are complete

### Cycle System (13-Game Cycles)

**Cycle Definition:**
- Every 13 games = 1 cycle
- Tracked in `current_game_count`
- Auto-triggers draft when limit reached

**Cycle Tracking:**
- `cycle_number` in drafts table
- `cycle_number` in games table
- Cycle-based statistics

---

## 🛠️ IMPLEMENTATION TASKS

### Phase 1: Real-Time Draft Sync (Priority: HIGH)

**Task 1.1: Set up Supabase Realtime**
- Enable realtime on `drafts` table
- Enable realtime on `draft_picks` table
- Configure RLS policies for realtime

**Task 1.2: Create Real-Time Hook**
- `useDraftRealtime(draftId)` hook
- Subscribe to draft and picks changes
- Auto-update local state
- Handle connection errors

**Task 1.3: Update Draft UI**
- Remove polling, use realtime
- Show connection status
- Handle reconnection
- Smooth animations for updates

**Success Criteria:**
- All captains see picks instantly
- No page refresh needed
- Turn indicators update automatically
- Progress bars animate smoothly

---

### Phase 2: Draft Scheduling (Priority: HIGH)

**Task 2.1: Update Seasons Schema**
- Add `draft_scheduled_at` field
- Add validation: cannot activate without draft scheduled
- Update season creation form

**Task 2.2: Draft Scheduling UI**
- Date/time picker for draft
- Validation: must be in future
- Show countdown timer
- Email notification setup

**Task 2.3: Season Activation Validation**
- Check draft is scheduled before activation
- Show clear error if not scheduled
- Link to schedule draft

**Success Criteria:**
- Cannot activate season without scheduled draft
- Draft time visible to all
- Countdown timer works
- Email notifications sent

---

### Phase 3: Week Management (Priority: MEDIUM)

**Task 3.1: Add Week Fields to Schema**
- Add `current_week` to seasons
- Add `week_number` to games
- Add `week_start_date` to seasons

**Task 3.2: Week Progression Logic**
- Calculate week from dates
- Auto-increment on Mondays
- Manual "Advance Week" button
- Week validation (all games complete)

**Task 3.3: Week-Based UI**
- Show current week in dashboards
- Filter games by week
- Week-based stat summaries
- Weekly schedule view

**Success Criteria:**
- Weeks progress automatically
- Games assigned to correct weeks
- Week-based views work
- Manual advancement available

---

### Phase 4: Season Archiving (Priority: MEDIUM)

**Task 4.1: Archive Validation**
- Check all games are final
- Check all stats verified
- Check no pending items
- Validation function

**Task 4.2: Archive UI**
- "Archive Season" button
- Archive confirmation dialog
- Validation errors display
- Archived seasons view

**Task 4.3: Archive Data Access**
- Read-only archived seasons
- Historical stats preserved
- Standings frozen
- Articles preserved

**Success Criteria:**
- Can only archive when criteria met
- Archived seasons viewable
- All data preserved
- Clear archive status

---

### Phase 5: Data Consistency (Priority: HIGH)

**Task 5.1: Implement Cache Tags**
- Tag all queries by resource
- Invalidate on mutations
- Revalidate on page load

**Task 5.2: Optimistic Updates**
- Update UI immediately
- Rollback on error
- Show loading states

**Task 5.3: Real-Time Subscriptions**
- Subscribe to critical tables
- Auto-update UI
- Handle connection issues

**Success Criteria:**
- Data consistent across all pages
- Updates propagate instantly
- No stale data
- Smooth user experience

---

## 🔧 TECHNICAL IMPLEMENTATION DETAILS

### Supabase Realtime Setup

**Enable Realtime:**
```sql
-- Enable realtime for drafts
ALTER PUBLICATION supabase_realtime ADD TABLE drafts;
ALTER PUBLICATION supabase_realtime ADD TABLE draft_picks;
ALTER PUBLICATION supabase_realtime ADD TABLE games;
ALTER PUBLICATION supabase_realtime ADD TABLE player_stats;
```

**RLS Policies for Realtime:**
- Drafts: Viewable by all authenticated users
- Draft picks: Viewable by all, insertable by captains
- Games: Viewable by all
- Stats: Viewable by all

### Real-Time Hook Implementation

```typescript
// src/hooks/useDraftRealtime.ts
export function useDraftRealtime(draftId: string) {
  const [draft, setDraft] = useState(null);
  const [picks, setPicks] = useState([]);
  const supabase = createClient();

  useEffect(() => {
    // Subscribe to draft changes
    const draftChannel = supabase
      .channel(`draft:${draftId}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'drafts',
        filter: `id=eq.${draftId}`
      }, (payload) => {
        setDraft(payload.new);
      })
      .subscribe();

    // Subscribe to picks changes
    const picksChannel = supabase
      .channel(`draft-picks:${draftId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'draft_picks',
        filter: `draft_id=eq.${draftId}`
      }, (payload) => {
        setPicks(prev => [...prev, payload.new]);
      })
      .subscribe();

    return () => {
      draftChannel.unsubscribe();
      picksChannel.unsubscribe();
    };
  }, [draftId]);

  return { draft, picks };
}
```

### Week Progression Cron Job

**Option 1: Vercel Cron**
```typescript
// app/api/cron/week-progression/route.ts
export async function GET(request: Request) {
  // Verify cron secret
  if (request.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response('Unauthorized', { status: 401 });
  }

  // Advance weeks for all active seasons
  // Update current_week, week_start_date
  // Mark previous week as completed
}
```

**Option 2: Supabase Edge Function + pg_cron**
```sql
-- Schedule function to run every Monday
SELECT cron.schedule(
  'advance-weeks',
  '0 0 * * 1', -- Every Monday at midnight
  $$
  -- SQL to advance weeks
  $$
);
```

### Draft Scheduling Validation

```typescript
// In createSeason/updateSeason
if (status === "active") {
  if (!draft_scheduled_at) {
    return { error: "Cannot activate season without scheduled draft. Please schedule the draft first." };
  }
  if (new Date(draft_scheduled_at) > new Date()) {
    return { error: "Draft must be scheduled in the past to activate season." };
  }
}
```

---

## 📋 COMPLETE WORKFLOW EXAMPLE

### Season Start to Finish

**Week 0: Season Creation**
1. Owner creates "2025 Winter Season"
2. Owner schedules draft for "Jan 15, 2025 at 7:00 PM"
3. Season status = "draft_scheduled"
4. Email sent to all captains: "Draft scheduled for Jan 15"

**Week 0: Draft Day**
1. Jan 15, 7:00 PM arrives
2. Owner clicks "Start Draft"
3. Season status = "draft"
4. Draft status = "in_progress"
5. Email sent: "Draft has begun!"
6. All captains see live draft board
7. Real-time picks synchronized
8. Draft completes (all picks made)
9. Owner clicks "Complete Draft"
10. Players assigned to teams
11. Season status = "active"
12. Week 1 begins

**Week 1-13: Active Season**
1. Games scheduled for each week
2. Games played, stats entered
3. Every Monday: Week auto-advances
4. Standings update in real-time
5. After 13 games: Auto-trigger draft

**Week 14: Season End**
1. Owner ends season
2. Season status = "completed"
3. All games finalized
4. Owner archives season
5. Season status = "archived"
6. Historical data preserved

---

## 🎯 SUCCESS METRICS

### Draft Synchronization
- ✅ All users see picks within 1 second
- ✅ No page refresh needed
- ✅ Turn indicators accurate
- ✅ Progress bars update smoothly

### Season Lifecycle
- ✅ Cannot activate without draft scheduled
- ✅ Weeks progress automatically
- ✅ Seasons archive cleanly
- ✅ All data preserved

### Data Consistency
- ✅ No stale data across pages
- ✅ Updates propagate instantly
- ✅ Cache invalidation works
- ✅ Real-time subscriptions stable

---

## 🚨 EDGE CASES & ERROR HANDLING

### Draft Synchronization
- **Connection Lost:** Show reconnecting indicator
- **Pick Conflict:** Last write wins, show notification
- **Turn Skipped:** Owner can manually advance
- **Draft Paused:** Owner can pause/resume

### Week Progression
- **Games Incomplete:** Warn owner before advancing
- **Manual Override:** Owner can advance early
- **Week Calculation:** Handle timezone issues
- **Holiday Weeks:** Skip or adjust as needed

### Season Archiving
- **Incomplete Games:** List all incomplete games
- **Unverified Stats:** Show verification status
- **Pending Items:** List all pending items
- **Archive Rollback:** Cannot unarchive (data preserved)

---

## 📝 IMPLEMENTATION CHECKLIST

### Real-Time Draft Sync
- [ ] Enable Supabase Realtime on drafts/draft_picks
- [ ] Create useDraftRealtime hook
- [ ] Update captain draft page to use realtime
- [ ] Update admin draft page to use realtime
- [ ] Add connection status indicator
- [ ] Handle reconnection logic
- [ ] Test with multiple users simultaneously

### Draft Scheduling
- [ ] Add draft_scheduled_at to seasons table
- [ ] Update season creation form
- [ ] Add draft scheduling UI
- [ ] Add validation (cannot activate without draft)
- [ ] Add countdown timer
- [ ] Send email notifications
- [ ] Test draft scheduling flow

### Week Management
- [ ] Add current_week to seasons table
- [ ] Add week_number to games table
- [ ] Create week progression function
- [ ] Set up cron job (Vercel or Supabase)
- [ ] Add manual "Advance Week" button
- [ ] Add week validation
- [ ] Update UI to show current week
- [ ] Test week progression

### Season Archiving
- [ ] Add archived/archived_at to seasons table
- [ ] Create archive validation function
- [ ] Add "Archive Season" button
- [ ] Create archived seasons view
- [ ] Preserve all historical data
- [ ] Test archive workflow

### Data Consistency
- [ ] Implement cache tags
- [ ] Add optimistic updates
- [ ] Set up real-time subscriptions
- [ ] Test data consistency
- [ ] Monitor for stale data

---

## 🔄 MIGRATION PLAN

### Database Migrations Needed

1. **Add Draft Scheduling Fields:**
```sql
ALTER TABLE seasons 
ADD COLUMN draft_scheduled_at TIMESTAMPTZ,
ADD COLUMN draft_started_at TIMESTAMPTZ;
```

2. **Add Week Management Fields:**
```sql
ALTER TABLE seasons 
ADD COLUMN current_week INTEGER DEFAULT 1,
ADD COLUMN week_start_date DATE;

ALTER TABLE games 
ADD COLUMN week_number INTEGER,
ADD COLUMN cycle_number INTEGER;
```

3. **Add Archive Fields:**
```sql
ALTER TABLE seasons 
ADD COLUMN archived BOOLEAN DEFAULT FALSE,
ADD COLUMN archived_at TIMESTAMPTZ;
```

4. **Enable Realtime:**
```sql
ALTER PUBLICATION supabase_realtime ADD TABLE drafts;
ALTER PUBLICATION supabase_realtime ADD TABLE draft_picks;
ALTER PUBLICATION supabase_realtime ADD TABLE games;
ALTER PUBLICATION supabase_realtime ADD TABLE player_stats;
```

---

## 📊 PRIORITY ORDER

### Phase 1: Critical (Week 1)
1. Real-time draft synchronization
2. Draft scheduling system
3. Season activation validation

### Phase 2: Important (Week 2)
4. Week management system
5. Automatic week progression
6. Week-based game scheduling

### Phase 3: Polish (Week 3)
7. Season archiving system
8. Data consistency improvements
9. Error handling and edge cases

---

## 🎯 NEXT STEPS

1. **Review this plan** with user
2. **Prioritize features** based on needs
3. **Start implementation** with Phase 1
4. **Test thoroughly** with multiple users
5. **Iterate** based on feedback

---

**END OF PLAN**
