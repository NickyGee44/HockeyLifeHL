# Scorekeeper Assignment - Quick Start Guide

**For Developers:** Get up and running with the scorekeeper assignment feature in 5 minutes.

## What Is This?

A feature that allows league owners to assign scorekeepers to games by:
1. Clicking a button on any game
2. Entering scorekeeper email
3. Getting a 6-character token
4. Sending an email automatically

## Using the Feature

### As a League Owner

```typescript
// 1. Navigate to games list
/dashboard/leagues/[id]/games

// 2. Click the UserPlus icon on any scheduled/in-progress game

// 3. Fill the form:
- Scorekeeper Name: "John Doe" (optional)
- Scorekeeper Email: "john@example.com" (required)

// 4. Click "Assign & Send Email"

// 5. Copy the token or use the direct link to share with scorekeeper
```

### As a Developer

**Import the modal:**
```tsx
import { AssignScorekeeperModal } from '@/components/games';

function MyComponent() {
  const [game, setGame] = useState<Game | null>(null);

  return (
    <>
      <button onClick={() => setGame(selectedGame)}>
        Assign Scorekeeper
      </button>

      {game && (
        <AssignScorekeeperModal
          game={game}
          open={!!game}
          onOpenChange={(open) => !open && setGame(null)}
          onSuccess={() => {
            // Refresh games list or show confirmation
            console.log('Scorekeeper assigned!');
          }}
        />
      )}
    </>
  );
}
```

**Call the server action directly:**
```typescript
import { assignScorekeeperToGame } from '@/lib/actions/scorekeeper-admin';

async function assignScorekeeper() {
  const result = await assignScorekeeperToGame({
    gameId: 'game-uuid',
    scorekeeperEmail: 'scorekeeper@example.com',
    scorekeeperName: 'John Doe', // optional
    sendEmail: true,
  });

  if (result.success) {
    console.log('Token:', result.token);
    console.log('Link:', result.accessLink);
  } else {
    console.error('Error:', result.error);
  }
}
```

**Get existing assignment:**
```typescript
import { getGameScorekeeperAssignment } from '@/lib/actions/scorekeeper-admin';

async function checkAssignment(gameId: string) {
  const result = await getGameScorekeeperAssignment(gameId);

  if (result.success && result.assignment) {
    console.log('Token:', result.assignment.token);
    console.log('Expires:', result.assignment.expiresAt);
    console.log('Access count:', result.assignment.accessCount);
  }
}
```

**Display assignment badge:**
```tsx
import { ScorekeeperBadge } from '@/components/games';

function GameCard({ game, assignment }) {
  return (
    <div>
      <h3>{game.home_team.name} vs {game.away_team.name}</h3>

      {assignment && (
        <ScorekeeperBadge
          assigned={true}
          expiresAt={assignment.expiresAt}
          accessCount={assignment.accessCount}
        />
      )}
    </div>
  );
}
```

## Key Files

### Frontend
```
components/games/
  ├── assign-scorekeeper-modal.tsx  → Main modal component
  ├── scorekeeper-badge.tsx         → Status badges
  ├── game-card.tsx                 → Updated with button
  └── games-list-client.tsx         → Integration

lib/actions/
  └── scorekeeper-admin.ts          → Server actions

lib/email/
  └── scorekeeper-emails.ts         → Email sending

lib/notifications/templates/
  └── scorekeeper-assignment.ts     → Email template
```

### Backend
```
Database:
  scorekeeper_sessions table

RPCs:
  create_scorekeeper_session(game_id, league_id, expires_at)
  validate_scorekeeper_token(token)
```

## Environment Variables

Required for email delivery:

```bash
# .env.local
RESEND_API_KEY=re_xxxxxxxxxxxxxxx
RESEND_FROM_EMAIL=noreply@beerleaguehockey.ca
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

## Testing Locally

### 1. Start the dev server
```bash
pnpm dev
```

### 2. Login as a league owner
```
/login
```

### 3. Navigate to games
```
/dashboard/leagues/[id]/games
```

### 4. Click UserPlus icon on a game

### 5. Fill the form and submit

### 6. Check console for email log
```
[Email Service] Would send email: {
  to: 's***@e***.com',
  subject: 'Scorekeeper Assignment: ...',
  htmlLength: 12345
}
```

### 7. Check the token in success screen

### 8. Use token on scorekeeper page
```
/scorekeeper?token=ABC123
```

## Common Tasks

### Add Assignment Button to Custom Component

```tsx
import { UserPlus } from 'lucide-react';
import { AssignScorekeeperModal } from '@/components/games';

function CustomGameCard({ game }) {
  const [showModal, setShowModal] = useState(false);

  return (
    <>
      <button onClick={() => setShowModal(true)}>
        <UserPlus className="w-4 h-4" />
        Assign Scorekeeper
      </button>

      <AssignScorekeeperModal
        game={game}
        open={showModal}
        onOpenChange={setShowModal}
      />
    </>
  );
}
```

### Check if Game Has Scorekeeper

```typescript
import { getGameScorekeeperAssignment } from '@/lib/actions/scorekeeper-admin';

async function hasScorekeeper(gameId: string): Promise<boolean> {
  const result = await getGameScorekeeperAssignment(gameId);
  return result.success && !!result.assignment;
}
```

### Deactivate Assignment

```typescript
import { deactivateScorekeeperSession } from '@/lib/actions/scorekeeper-admin';

async function revokeAccess(sessionId: string) {
  const result = await deactivateScorekeeperSession(sessionId);

  if (result.success) {
    console.log('Session deactivated');
  }
}
```

### List All Assignments for League

```typescript
import { getScorekeeperAssignments } from '@/lib/actions/scorekeeper-admin';

async function listAssignments(leagueId: string) {
  const result = await getScorekeeperAssignments(leagueId);

  if (result.success) {
    result.assignments?.forEach(assignment => {
      console.log(`Game: ${assignment.homeTeamName} vs ${assignment.awayTeamName}`);
      console.log(`Token: ${assignment.token}`);
      console.log(`Expires: ${assignment.expiresAt}`);
      console.log(`Active: ${assignment.isActive}`);
      console.log('---');
    });
  }
}
```

### Customize Email Template

```typescript
// lib/notifications/templates/scorekeeper-assignment.ts

// Modify the content variable:
const content = `
  <p>Hi ${scorekeeperName},</p>

  <!-- Add your custom content here -->
  <div style="background: #1a1a1a; padding: 20px; border-radius: 8px;">
    <p>Custom message here</p>
  </div>

  ${createDetailsList(details)}
  <!-- ... rest of template -->
`;
```

## Troubleshooting

### Email Not Sending

**Check:**
1. `RESEND_API_KEY` set correctly
2. Resend account active
3. From email verified in Resend
4. Console logs for errors

**Workaround:**
- Assignment still succeeds even if email fails
- Share token manually from success screen

### Token Not Validating

**Check:**
1. Token entered correctly (case-sensitive)
2. Token not expired (24hr validity)
3. Token not deactivated
4. Database: `SELECT * FROM scorekeeper_sessions WHERE token = 'ABC123'`

**Fix:**
- Create new assignment
- Use direct access link instead

### Permission Denied

**Check:**
1. User is logged in
2. User is league owner or admin
3. Membership status is active
4. Game belongs to the league

**Query:**
```sql
SELECT * FROM league_memberships
WHERE league_id = '[LEAGUE_ID]'
AND user_id = '[USER_ID]';
```

### Modal Not Opening

**Check:**
1. Game status is scheduled or in_progress
2. Button visible (only shows for valid game states)
3. Console for errors
4. Component imported correctly

## Database Queries

### View All Sessions
```sql
SELECT
  s.token,
  s.expires_at,
  s.is_active,
  s.access_count,
  g.scheduled_at,
  ht.name as home_team,
  at.name as away_team
FROM scorekeeper_sessions s
JOIN games g ON s.game_id = g.id
JOIN teams ht ON g.home_team_id = ht.id
JOIN teams at ON g.away_team_id = at.id
WHERE s.league_id = '[LEAGUE_ID]'
ORDER BY s.created_at DESC;
```

### Find Expired Sessions
```sql
SELECT token, expires_at, game_id
FROM scorekeeper_sessions
WHERE expires_at < NOW()
AND is_active = true;
```

### Count Active Sessions
```sql
SELECT COUNT(*) as active_sessions
FROM scorekeeper_sessions
WHERE league_id = '[LEAGUE_ID]'
AND is_active = true
AND expires_at > NOW();
```

## API Reference

### `assignScorekeeperToGame`

**Parameters:**
```typescript
{
  gameId: string;           // Required
  scorekeeperEmail: string; // Required
  scorekeeperName?: string; // Optional
  sendEmail?: boolean;      // Default: true
}
```

**Returns:**
```typescript
{
  success: boolean;
  token?: string;          // 6-char token
  accessLink?: string;     // Full URL
  sessionId?: string;      // Database ID
  error?: string;          // If failed
}
```

### `getScorekeeperAssignments`

**Parameters:**
```typescript
leagueId: string
```

**Returns:**
```typescript
{
  success: boolean;
  assignments?: Array<{
    id: string;
    gameId: string;
    token: string;
    expiresAt: string;
    isActive: boolean;
    accessCount: number;
    lastAccessedAt: string | null;
    createdAt: string;
    homeTeamName: string;
    awayTeamName: string;
    scheduledAt: string;
  }>;
  error?: string;
}
```

### `getGameScorekeeperAssignment`

**Parameters:**
```typescript
gameId: string
```

**Returns:**
```typescript
{
  success: boolean;
  assignment?: {
    id: string;
    token: string;
    expiresAt: string;
    isActive: boolean;
    accessCount: number;
    lastAccessedAt: string | null;
    createdAt: string;
  };
  error?: string;
}
```

### `deactivateScorekeeperSession`

**Parameters:**
```typescript
sessionId: string
```

**Returns:**
```typescript
{
  success: boolean;
  error?: string;
}
```

## Props Reference

### `AssignScorekeeperModal`

```typescript
interface AssignScorekeeperModalProps {
  game: Game;                        // Game object from games action
  open: boolean;                     // Modal visibility
  onOpenChange: (open: boolean) => void;  // Close handler
  onSuccess?: () => void;            // Success callback
}
```

### `ScorekeeperBadge`

```typescript
interface ScorekeeperBadgeProps {
  assigned: boolean;                 // Show badge
  expiresAt?: string;                // ISO date string
  accessCount?: number;              // Usage count
  className?: string;                // Custom styles
}
```

### `ScorekeeperAssignmentInfo`

```typescript
interface Props {
  token: string;                     // 6-char token
  expiresAt: string;                 // ISO date string
  accessCount: number;               // Usage count
  lastAccessedAt: string | null;     // Last access time
  className?: string;                // Custom styles
}
```

## Next Steps

1. **Test the feature** - Follow testing steps above
2. **Read full docs** - See `SCOREKEEPER_ASSIGNMENT_FEATURE.md`
3. **Review implementation** - See `SCOREKEEPER_ASSIGNMENT_IMPLEMENTATION_SUMMARY.md`
4. **Customize as needed** - Extend for your use case

## Support

**Issues?** Check:
- Full documentation: `SCOREKEEPER_ASSIGNMENT_FEATURE.md`
- Implementation details: `SCOREKEEPER_ASSIGNMENT_IMPLEMENTATION_SUMMARY.md`
- Development workflow: `DEVELOPMENT_WORKFLOW.md`

**Questions?**
- Check console logs for errors
- Verify environment variables
- Review database state
- Test with different users/roles

---

**Quick Start Complete!** 🎉

You now know how to use and integrate the scorekeeper assignment feature.
