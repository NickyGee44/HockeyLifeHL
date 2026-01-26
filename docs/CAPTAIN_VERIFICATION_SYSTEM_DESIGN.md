# Captain Verification System - Design Document

**Date:** January 26, 2026
**Agent:** Agent 4 - Scorekeeper System
**Status:** Design Phase

---

## 📋 Overview

The Captain Verification System allows team captains to review and approve game statistics entered by scorekeepers after a game is completed. This ensures data accuracy and provides accountability for both teams.

---

## 🎯 Goals

### Primary Goals:
1. Allow team captains to review all stats for their team
2. Provide a mechanism for contesting/correcting stats
3. Lock stats after both captains approve
4. Create an audit trail of verifications
5. Send notifications to captains when verification is needed

### Secondary Goals:
1. Make verification mobile-friendly (captains verify on phone)
2. Allow quick approval for routine games
3. Highlight unusual stats for review
4. Provide comparison view (team A vs team B stats)
5. Enable stat editing before lock

---

## 👥 User Roles

### Team Captain
- Views stats for their team
- Approves or contests stats
- Can request corrections
- Cannot modify stats directly
- Receives email notification when verification needed

### Scorekeeper
- Notified of contested stats
- Can make corrections if captains disagree
- Cannot modify after both captains approve

### League Admin
- Can override locks in exceptional cases
- Resolves disputes between captains
- Views verification history

---

## 🗂️ Database Schema

### New Table: `game_verifications`

```sql
CREATE TABLE game_verifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  game_id UUID NOT NULL REFERENCES games(id),
  team_id UUID NOT NULL REFERENCES teams(id),
  captain_id UUID NOT NULL REFERENCES profiles(id),

  -- Verification status
  status TEXT NOT NULL CHECK (status IN ('pending', 'approved', 'contested', 'corrected')),
  verified_at TIMESTAMPTZ,

  -- Contest details
  contested_reason TEXT,
  contested_stats JSONB, -- Array of stat IDs that were contested

  -- Correction tracking
  correction_requested_at TIMESTAMPTZ,
  correction_completed_at TIMESTAMPTZ,
  corrected_by UUID REFERENCES profiles(id),

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Unique constraint: one verification per team per game
  UNIQUE(game_id, team_id)
);

-- Indexes
CREATE INDEX idx_game_verifications_game_id ON game_verifications(game_id);
CREATE INDEX idx_game_verifications_captain_id ON game_verifications(captain_id);
CREATE INDEX idx_game_verifications_status ON game_verifications(status);

-- RLS Policies
ALTER TABLE game_verifications ENABLE ROW LEVEL SECURITY;

-- Captains can view/update their own team's verifications
CREATE POLICY "Captains can manage their team verifications"
  ON game_verifications
  FOR ALL
  USING (
    captain_id = auth.uid()
    OR
    team_id IN (
      SELECT team_id FROM team_rosters
      WHERE player_id = (SELECT id FROM profiles WHERE id = auth.uid())
      AND is_captain = true
    )
  );

-- League admins can view all verifications
CREATE POLICY "League admins can view all verifications"
  ON game_verifications
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM league_memberships
      WHERE user_id = auth.uid()
      AND role IN ('owner', 'admin')
    )
  );
```

### Update Table: `game_stats`

Add a `locked` field to prevent modification after captain approval:

```sql
ALTER TABLE game_stats
ADD COLUMN locked BOOLEAN DEFAULT FALSE,
ADD COLUMN locked_at TIMESTAMPTZ,
ADD COLUMN locked_by UUID REFERENCES profiles(id);

CREATE INDEX idx_game_stats_locked ON game_stats(game_id, locked);
```

### Update Table: `team_rosters`

Add `is_captain` field to identify team captains:

```sql
ALTER TABLE team_rosters
ADD COLUMN is_captain BOOLEAN DEFAULT FALSE;

CREATE INDEX idx_team_rosters_captain ON team_rosters(team_id, is_captain);
```

---

## 🔄 Workflow

### Step 1: Game Completion

```
Scorekeeper completes game
    ↓
System creates game_verifications records
    - One for home team captain
    - One for away team captain
    - Status: 'pending'
    ↓
Send email notifications to both captains
    - Subject: "Verify stats for [Team] vs [Opponent]"
    - Link: /captain/verify/[gameId]
```

### Step 2: Captain Reviews Stats

```
Captain clicks verification link
    ↓
Sees stats summary:
    - Goals: 3 (Player A, Player B, Player C)
    - Assists: 4 (...)
    - Penalties: 2 (...)
    - Shots: 15
    - Unusual: "Player X had 0 goals but 2 assists" (highlight)
    ↓
Captain chooses:
    A) Approve (everything looks correct)
    B) Contest (some stats are wrong)
```

### Step 3A: Captain Approves

```
Captain clicks "Approve Stats"
    ↓
Update game_verifications:
    - status = 'approved'
    - verified_at = NOW()
    ↓
Check if other team also approved:
    - If YES: Lock all stats for this game
    - If NO: Wait for other captain
    ↓
Send confirmation email to captain
```

### Step 3B: Captain Contests

```
Captain clicks "Contest Stats"
    ↓
Captain marks specific stats:
    - "Player A did not score 2nd goal" [checkbox]
    - "Penalty on Player B was 5 min, not 2 min" [checkbox]
    ↓
Captain writes reason:
    - "The second goal was scored by Player C, not Player A"
    ↓
Update game_verifications:
    - status = 'contested'
    - contested_reason = "..."
    - contested_stats = [stat_id_1, stat_id_2]
    ↓
Notify scorekeeper:
    - Email: "Captain contested stats for Game #123"
    - Dashboard alert
    ↓
Scorekeeper reviews and makes corrections
    ↓
Update game_verifications:
    - status = 'corrected'
    - correction_completed_at = NOW()
    ↓
Notify captain to re-verify:
    - Email: "Stats have been corrected, please re-verify"
```

### Step 4: Stat Locking

```
Both captains approved?
    ↓
Lock all stats for this game:
    - UPDATE game_stats SET locked = TRUE WHERE game_id = ?
    - locked_at = NOW()
    - locked_by = scorekeeper_id
    ↓
Notify scorekeeper:
    - "Stats verified and locked for Game #123"
    ↓
Stats now immutable (cannot be edited or deleted)
```

---

## 🎨 UI Design

### Captain Verification Page

**URL:** `/captain/verify/[gameId]`

**Layout:**

```
┌─────────────────────────────────────────────────┐
│  Hockey Stats - Captain Verification            │
│  [Hockey Logo]                                   │
└─────────────────────────────────────────────────┘

Game: Maple Leafs vs Bruins
Date: January 25, 2026 7:00 PM
Your Team: Maple Leafs
Scorekeeper: John Smith

┌─────────────────────────────────────────────────┐
│  Verification Status                             │
│                                                  │
│  ✅ Maple Leafs (You) - Approved                 │
│  ⏳ Bruins - Pending                             │
│                                                  │
│  Stats will be locked when both teams approve   │
└─────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────┐
│  Final Score                                     │
│                                                  │
│  Maple Leafs  4  -  2  Bruins                    │
│                                                  │
│  Shots: 25 - 18                                  │
│  PIM: 6 - 10                                     │
└─────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────┐
│  Maple Leafs Stats (Your Team)                   │
│                                                  │
│  Goals (4):                                      │
│  ☐ #10 John Doe (P1, 12:30) - Assists: #15, #7  │
│  ☐ #15 Jane Smith (P2, 5:45) - Assists: #10     │
│  ☐ #7 Mike Jones (P2, 18:20) - Assists: #10     │
│  ☐ #10 John Doe (P3, 10:15) - Assists: #15      │
│                                                  │
│  Assists (6):                                    │
│  #15 Jane Smith (2), #10 John Doe (2), #7 (2)   │
│                                                  │
│  Penalties (3):                                  │
│  ☐ #5 Bob Brown (P1, 8:00) - 2 min Tripping     │
│  ☐ #12 Tom White (P2, 14:30) - 2 min Hooking    │
│  ☐ #10 John Doe (P3, 5:00) - 2 min Slashing     │
│                                                  │
│  Shots on Goal: 25                               │
│  Goalie Saves: #30 - 16 saves on 18 shots        │
│                                                  │
│  [Select stats to contest using checkboxes]     │
└─────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────┐
│  Opponent Stats (Bruins)                         │
│  [View only - cannot contest opponent stats]     │
│                                                  │
│  Goals: 2                                        │
│  Assists: 3                                      │
│  Penalties: 5 (10 PIM)                           │
│  Shots: 18                                       │
└─────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────┐
│  Unusual Stats (Review Carefully)                │
│                                                  │
│  ⚠️ #10 John Doe - 2 goals, 2 assists (4 pts)    │
│     (Unusual: High point total for one player)   │
│                                                  │
│  ⚠️ #5 Bob Brown - 0 shots, 0 goals              │
│     (Unusual: Defenseman with no shots)          │
└─────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────┐
│  Actions                                         │
│                                                  │
│  [ ] I have reviewed all stats above             │
│                                                  │
│  [✓ Approve All Stats]  [Contest Selected Stats] │
│                                                  │
│  If you contest stats, explain what's wrong:     │
│  ┌───────────────────────────────────────────┐  │
│  │ [Text area for reason]                     │  │
│  │                                            │  │
│  └───────────────────────────────────────────┘  │
└─────────────────────────────────────────────────┘
```

### Scorekeeper Notification

**Location:** Dashboard and email

```
┌─────────────────────────────────────────────────┐
│  ⚠️ Stats Contested                              │
│                                                  │
│  Game: Maple Leafs vs Bruins (Jan 25, 2026)     │
│  Team: Maple Leafs                               │
│  Captain: John Doe (#10)                         │
│                                                  │
│  Contested Stats (2):                            │
│  - Goal by #10 at P2 5:45                        │
│  - Penalty on #12 at P2 14:30                    │
│                                                  │
│  Reason:                                         │
│  "The goal was scored by #15, not #10. Also     │
│   the penalty was 4 min, not 2 min."            │
│                                                  │
│  [View Game] [Make Corrections]                  │
└─────────────────────────────────────────────────┘
```

---

## 📧 Email Templates

### Template 1: Verification Request

**Subject:** Verify stats for [Team Name] vs [Opponent] - [Date]

**Body:**
```
Hi [Captain Name],

Your team's game has been completed and the stats are ready for verification.

Game Details:
- Teams: [Team Name] vs [Opponent]
- Date: [Date and Time]
- Final Score: [Score]
- Scorekeeper: [Scorekeeper Name]

As team captain, please review and verify the stats entered by the scorekeeper.

[Verify Stats Button] → Link to /captain/verify/[gameId]

Important:
- Stats will be locked after both team captains approve
- If you find errors, you can contest specific stats
- Please verify within 48 hours of game completion

Need help? Contact your league administrator.

Thanks,
Hockey Stats Team
```

### Template 2: Correction Needed

**Subject:** Stats contested for [Team Name] vs [Opponent]

**To:** Scorekeeper

**Body:**
```
Hi [Scorekeeper Name],

The captain of [Team Name] has contested some stats for the game on [Date].

Contested Stats:
- [List of contested stats]

Reason:
"[Captain's reason]"

Please review and make the necessary corrections, then notify the captain to re-verify.

[View Game] [Make Corrections]

Thanks,
Hockey Stats System
```

### Template 3: Verification Complete

**Subject:** Stats verified and locked for [Team Name] vs [Opponent]

**To:** Scorekeeper and Captains

**Body:**
```
Hi,

Both team captains have verified the stats for the game on [Date].

Final Score: [Team A] [Score] - [Score] [Team B]

Stats are now locked and cannot be modified.

View game stats: [Link to game stats page]

Thanks,
Hockey Stats System
```

---

## 🔐 Security & Permissions

### Who Can Verify?

**Team Captains:**
- Must have `is_captain = true` in team_rosters table
- Can only verify games where their team participated
- Cannot verify their own scorekeeping assignments (conflict of interest)

**Authorization Check:**
```sql
-- Check if user is captain of team in this game
SELECT 1 FROM team_rosters tr
JOIN games g ON (g.home_team_id = tr.team_id OR g.away_team_id = tr.team_id)
WHERE tr.player_id = [user_id]
  AND tr.is_captain = true
  AND g.id = [game_id]
```

### Who Can Edit After Lock?

**League Admins Only:**
- Special permission: `can_unlock_stats`
- Must provide reason for unlock
- Audit logged in game_stat_entry_log

**Unlock Workflow:**
```
Admin clicks "Unlock Stats"
    ↓
Modal: "Reason for unlocking?"
    ↓
Admin enters reason
    ↓
UPDATE game_stats SET locked = FALSE
    ↓
Log unlock in audit table
    ↓
Notify captains: "Stats have been unlocked by admin"
```

---

## 📊 API Endpoints

### GET /api/captain/verification/[gameId]

**Purpose:** Get verification status and game stats for captain

**Response:**
```json
{
  "game": {
    "id": "...",
    "homeTeam": { "id": "...", "name": "Maple Leafs" },
    "awayTeam": { "id": "...", "name": "Bruins" },
    "dateTime": "2026-01-25T19:00:00Z",
    "finalScore": { "home": 4, "away": 2 }
  },
  "verification": {
    "id": "...",
    "teamId": "...",
    "status": "pending",
    "verifiedAt": null,
    "contestedReason": null
  },
  "otherTeamVerification": {
    "status": "approved",
    "verifiedAt": "2026-01-25T21:30:00Z"
  },
  "stats": {
    "goals": [
      {
        "id": "...",
        "playerId": "...",
        "playerName": "John Doe",
        "jerseyNumber": 10,
        "period": 1,
        "timestamp": "12:30",
        "assists": ["#15", "#7"]
      }
    ],
    "assists": [...],
    "penalties": [...],
    "shots": 25,
    "goalieStats": {...}
  },
  "unusualStats": [
    {
      "type": "high_points",
      "playerId": "...",
      "playerName": "John Doe",
      "message": "2 goals, 2 assists (4 points)",
      "severity": "info"
    }
  ]
}
```

### POST /api/captain/verification/[gameId]/approve

**Purpose:** Approve stats for your team

**Request:**
```json
{
  "teamId": "...",
  "captainId": "..."
}
```

**Response:**
```json
{
  "success": true,
  "message": "Stats approved",
  "allApproved": false,
  "locked": false
}
```

### POST /api/captain/verification/[gameId]/contest

**Purpose:** Contest specific stats

**Request:**
```json
{
  "teamId": "...",
  "captainId": "...",
  "contestedStatIds": ["stat_id_1", "stat_id_2"],
  "reason": "The goal was scored by #15, not #10"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Stats contested. Scorekeeper has been notified.",
  "verificationId": "..."
}
```

### POST /api/admin/stats/unlock/[gameId]

**Purpose:** Admin unlocks stats (emergency only)

**Request:**
```json
{
  "reason": "Captain reported scorekeeper error after lock"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Stats unlocked",
  "unlockedAt": "2026-01-26T10:00:00Z"
}
```

---

## 🧪 Testing Scenarios

### Scenario 1: Happy Path (Both Approve)

1. Scorekeeper completes game
2. System creates verification records (status: pending)
3. Captain A receives email, clicks link
4. Captain A reviews stats, approves
5. Captain B receives email, clicks link
6. Captain B reviews stats, approves
7. System locks all stats
8. Both captains and scorekeeper receive confirmation

**Expected Result:** Stats locked, cannot be modified

### Scenario 2: One Captain Contests

1. Scorekeeper completes game
2. Captain A approves immediately
3. Captain B contests 2 stats with reason
4. Scorekeeper receives notification
5. Scorekeeper makes corrections
6. Captain B receives re-verification email
7. Captain B approves corrected stats
8. Stats locked

**Expected Result:** Stats corrected and locked

### Scenario 3: Both Captains Contest

1. Both captains contest different stats
2. Scorekeeper receives both notifications
3. Scorekeeper corrects all contested stats
4. Both captains re-verify and approve
5. Stats locked

**Expected Result:** All corrections made, stats locked

### Scenario 4: Captain Doesn't Verify (Timeout)

1. Captain A approves
2. Captain B doesn't respond for 7 days
3. System auto-approves on behalf of Captain B
4. Stats locked automatically
5. Notification sent to Captain B (missed verification)

**Expected Result:** Stats locked after timeout

### Scenario 5: Admin Override

1. Stats locked
2. Captain notices error after lock
3. Captain contacts admin
4. Admin unlocks stats with reason
5. Scorekeeper makes correction
6. Admin re-locks stats
7. Audit trail shows unlock/lock events

**Expected Result:** Stats corrected, audit trail complete

---

## 📈 Analytics & Reporting

### Metrics to Track:

1. **Verification Rate**
   - % of games verified within 24 hours
   - % of games verified within 48 hours
   - % of games auto-approved (timeout)

2. **Contest Rate**
   - % of games with contested stats
   - Average number of contested stats per game
   - Most commonly contested stat types

3. **Scorekeeper Accuracy**
   - Number of games completed
   - Number of games contested
   - Accuracy rate (100% - contest rate)

4. **Captain Engagement**
   - Average time to verification
   - Captains who never verify (need training)
   - Captains who always contest (possible issue)

### Dashboard for League Admin:

```
┌─────────────────────────────────────────────────┐
│  Verification Statistics                         │
│                                                  │
│  Pending Verifications: 5                        │
│  Verified this week: 23                          │
│  Contested this week: 2 (8.7%)                   │
│                                                  │
│  Average verification time: 18 hours             │
│  Auto-approved (timeout): 1                      │
└─────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────┐
│  Scorekeeper Accuracy                            │
│                                                  │
│  John Smith: 98.5% (1 contest in 15 games)       │
│  Jane Doe: 100% (0 contests in 10 games)         │
│  Bob Johnson: 92% (2 contests in 8 games) ⚠️     │
└─────────────────────────────────────────────────┘
```

---

## 🚀 Implementation Phases

### Phase 1: Database Setup (Week 1)
- [ ] Create game_verifications table
- [ ] Add locked field to game_stats
- [ ] Add is_captain to team_rosters
- [ ] Create RLS policies
- [ ] Write migration scripts

### Phase 2: API Endpoints (Week 2)
- [ ] GET verification status
- [ ] POST approve stats
- [ ] POST contest stats
- [ ] POST admin unlock
- [ ] Add authorization checks

### Phase 3: Captain UI (Week 3)
- [ ] Create verification page
- [ ] Stats display component
- [ ] Approve/contest form
- [ ] Unusual stats detection
- [ ] Mobile responsive design

### Phase 4: Notifications (Week 4)
- [ ] Email template setup
- [ ] Send verification requests
- [ ] Send contest notifications
- [ ] Send lock confirmations
- [ ] Reminder emails (24hr, 48hr)

### Phase 5: Scorekeeper Updates (Week 5)
- [ ] Contest notification in dashboard
- [ ] Correction workflow
- [ ] Re-notification to captains
- [ ] Prevent editing locked stats

### Phase 6: Admin Tools (Week 6)
- [ ] Unlock stats interface
- [ ] Verification dashboard
- [ ] Analytics reports
- [ ] Dispute resolution tools

### Phase 7: Testing & Launch (Week 7)
- [ ] Unit tests
- [ ] Integration tests
- [ ] UAT with real captains
- [ ] Documentation for captains
- [ ] Training materials
- [ ] Soft launch (beta)

---

## 🎓 Captain Training

### Quick Start Guide for Captains

**What is Captain Verification?**

After each game, you'll receive an email asking you to verify the stats. This ensures accuracy and gives you a chance to catch any errors.

**How to Verify:**

1. Click link in email
2. Review your team's stats
3. Click "Approve" if everything looks correct
4. Or click "Contest" if you see errors

**When to Contest:**

- Wrong player credited with goal/assist
- Penalty time incorrect (2 min vs 5 min)
- Missing stats
- Extra stats that didn't happen

**What Happens Next:**

- If you approve: Stats are saved
- If you contest: Scorekeeper is notified and will make corrections
- After both captains approve: Stats are locked and final

**Deadline:**

Please verify within 48 hours. After 7 days, stats are automatically approved.

---

## 🔮 Future Enhancements

### Video Integration
- Link to game video timestamps for contested stats
- Review video before approving
- Annotate video with stat markers

### AI Assistance
- Computer vision to auto-detect goals/shots from video
- Flag stats that don't match video
- Suggest corrections based on video analysis

### Mobile App
- Native iOS/Android app for verification
- Push notifications instead of email
- Faster approval process

### Blockchain Verification
- Immutable record of stats on blockchain
- Cryptographic proof of captain approval
- Public verification ledger

---

## 📝 Notes

- This system balances accuracy with ease of use
- Most games will be approved quickly (happy path)
- Contest workflow handles edge cases
- Admin override for emergencies only
- Focus on mobile-first design (captains verify on phone)

---

**Status:** Ready for implementation
**Next Step:** Create database migration for game_verifications table
**Estimated Development Time:** 6-7 weeks
**Priority:** Medium (Phase 4 feature)
