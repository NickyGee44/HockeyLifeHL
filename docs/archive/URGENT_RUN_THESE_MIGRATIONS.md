# 🚨 URGENT: Run These Migrations NOW

**Status:** Build is failing - Missing tables blocking Agent 2 and Agent 4
**Priority:** CRITICAL
**Time Estimate:** 5 minutes

---

## 📋 Quick Instructions

### Step 1: Run Migration for game_stats Table

**File:** `supabase/migrations/20260126_create_game_stats_table.sql`

1. Open file in VS Code
2. Copy ALL contents (Ctrl+A, Ctrl+C)
3. Go to: https://supabase.com/dashboard/project/ntplczcmhvfkijjxavdl/sql/new
4. Paste (Ctrl+V) and Click **"Run"** (Ctrl+Enter)

**Expected Output:**
```
✅ game_stats table created successfully
✅ Indexes created for optimal performance
✅ RLS policies enabled for multi-tenant isolation
✅ Validation trigger added for league_id consistency
```

---

### Step 2: Run Migration for player_approvals Table

**File:** `supabase/migrations/20260126_create_player_approvals_table.sql`

1. Open file in VS Code
2. Copy ALL contents (Ctrl+A, Ctrl+C)
3. Paste in Supabase SQL Editor (same window as Step 1, or new query)
4. Click **"Run"** (Ctrl+Enter)

**Expected Output:**
```
✅ player_approvals table created successfully
✅ Indexes created for optimal performance
✅ RLS policies enabled (only admins/owners can manage)
✅ Helper functions created: is_player_approved(), get_player_approval_status()
```

---

### Step 3: Regenerate TypeScript Types

**In your terminal (VS Code terminal or PowerShell):**

```bash
cd D:\B3\dev\HockeyLeague\HockeyLifeHL

npx supabase gen types typescript --project-id ntplczcmhvfkijjxavdl --schema public > src/types/database.ts
```

**Expected Output:**
```
Connecting to remote database...
Generating types...
```

**Result:** `src/types/database.ts` will be updated with new table types

---

### Step 4: Verify Build

```bash
npm run build
```

**Expected:** Build should now succeed without TypeScript errors for missing tables

---

## 📊 What These Tables Do

### `game_stats` Table
- Tracks individual player stats during games (goals, assists, saves, PIMs)
- Multi-tenant: Has `league_id` for isolation
- RLS: Users can only see stats from games in their leagues
- Used by: Scorekeeper system (Agent 4), Stats API (Agent 2)

### `player_approvals` Table
- Tracks which players are approved to participate in each league
- Multi-tenant: Has `league_id` for isolation
- RLS: Only league admins/owners can manage approvals
- Used by: Player management (Agent 2), Admin dashboard (Agent 3)

---

## ✅ Verification

After completing all steps, verify:

1. **Tables exist:**
   ```sql
   SELECT table_name FROM information_schema.tables
   WHERE table_name IN ('game_stats', 'player_approvals');
   ```
   Should return 2 rows

2. **RLS is enabled:**
   ```sql
   SELECT tablename, rowsecurity
   FROM pg_tables
   WHERE tablename IN ('game_stats', 'player_approvals');
   ```
   Both should have `rowsecurity = true`

3. **Types updated:**
   Check `src/types/database.ts` contains `game_stats` and `player_approvals` interfaces

4. **Build succeeds:**
   `npm run build` completes without errors

---

## 🚨 If You Get Errors

### "relation already exists"
✅ **Good!** Table already exists - skip to next migration

### "permission denied"
❌ Make sure you're logged into Supabase dashboard

### "syntax error"
❌ Make sure you copied the ENTIRE file (check for closing statements)

---

## 📝 After Completion

Update `MULTI_TENANT_PROGRESS_TRACKER.md`:
- [x] game_stats table created
- [x] player_approvals table created
- [x] TypeScript types regenerated
- [x] Build passing

---

**Total Time:** ~5 minutes
**Next:** Agent 2 and Agent 4 can continue their work! 🚀
