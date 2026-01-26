# Offline Sync Testing Guide

**Priority 4: Test Offline Sync**

**Date:** January 26, 2026
**Purpose:** Verify offline functionality works correctly in production-like conditions

---

## 🎯 Test Objectives

1. Verify stats queue correctly when offline
2. Confirm IndexedDB stores entries properly
3. Validate automatic sync on reconnection
4. Ensure no duplicate entries
5. Test error handling during sync

---

## 📋 Pre-Test Setup

### Environment Setup
- **Device:** iPad (primary) or Desktop browser
- **Browser:** Safari (iOS) or Chrome (Desktop)
- **Network:** WiFi connection that can be toggled
- **Tools:** Browser DevTools (Application tab)

### Test Data Preparation
1. Create test game with assignments
2. Ensure test teams have rosters
3. Verify scorekeeper has access
4. Note test player jersey numbers

---

## 🧪 Test Plan: Offline Sync

### Step 1: Open Scorekeeper Interface

**Actions:**
1. Open browser to scorekeeper dashboard
2. Navigate to live entry page for test game
3. Check in to game
4. Verify interface loads completely

**Expected Result:**
- ✅ Page loads successfully
- ✅ Online badge shows "Online" (green)
- ✅ Rosters loaded for both teams
- ✅ All stat buttons visible

**DevTools Check:**
```
Application → IndexedDB → scorekeeper-offline-queue → entries
- Should be empty initially
```

---

### Step 2: Disconnect WiFi

**Actions:**
1. **On iPad:**
   - Settings → WiFi → Toggle OFF
   - Return to browser
2. **On Desktop:**
   - Browser DevTools → Network tab → Select "Offline"

**Expected Result:**
- ✅ Badge changes from "Online" to "Offline" (red)
- ✅ Interface still functional
- ✅ No errors in console

**Screenshot:** Document the offline badge appearance

---

### Step 3: Enter 10 Stats While Offline

**Actions:**
Enter the following stats (use actual player jersey numbers):

1. **Goal** - Home Team #10
2. **Shot** - Home Team #10 (required before goal)
3. **Assist** - Home Team #15
4. **Goal** - Away Team #7
5. **Shot** - Away Team #7
6. **Penalty** - Home Team #5 (2 min)
7. **Shot** - Home Team #20
8. **Save** - Away Team Goalie #30
9. **Shot** - Away Team #12
10. **Assist** - Away Team #8

**After Each Entry:**
- ✅ Toast notification shows: "[Stat Type] queued (offline)"
- ✅ Toast description: "Will sync when online"
- ✅ Jersey number clears
- ✅ Player selection resets

**Expected Result:**
- ✅ All 10 stats entered successfully
- ✅ No errors or failures
- ✅ Local stats update (score shows 2-1)
- ✅ UI remains responsive

---

### Step 4: Verify IndexedDB Queue

**Actions:**
1. Open Browser DevTools → Application tab
2. Expand IndexedDB → scorekeeper-offline-queue → entries
3. Click on the entries object store

**Expected Result:**
- ✅ Exactly 10 entries in queue
- ✅ Each entry has:
  - `id` (unique)
  - `gameId`
  - `playerId`
  - `teamId`
  - `statType`
  - `period`
  - `timestamp`
  - `jerseyNumber`
  - `playerName`
  - `retryCount` = 0

**Screenshot:** Capture IndexedDB entries showing all 10 stats

**Verification Query (Console):**
```javascript
// Open IndexedDB and count entries
const request = indexedDB.open('scorekeeper-offline-queue', 1);
request.onsuccess = (event) => {
  const db = event.target.result;
  const transaction = db.transaction(['entries'], 'readonly');
  const objectStore = transaction.objectStore('entries');
  const countRequest = objectStore.count();
  countRequest.onsuccess = () => {
    console.log('Queue count:', countRequest.result);
  };
};
```

---

### Step 5: Reconnect WiFi

**Actions:**
1. **On iPad:**
   - Settings → WiFi → Toggle ON
   - Wait for connection
   - Return to browser
2. **On Desktop:**
   - DevTools → Network tab → Select "No throttling" or "Online"

**Expected Result:**
- ✅ Badge changes to "Online" (green)
- ✅ Automatic sync triggers within 2-3 seconds
- ✅ Toast notification shows: "Synced 10 offline entries"

**Network Tab:**
- ✅ 10 POST requests to `/api/scorekeepers/submit-stat`
- ✅ All requests return 200 OK status
- ✅ No 409 Conflict (duplicates)
- ✅ No 400 Bad Request (validation errors)

---

### Step 6: Verify Stats in Database

**Actions:**
1. Check StatSummary component updates
2. Query database for game stats

**Expected Result:**
- ✅ Score updates to 2-1 (or correct score)
- ✅ All 10 stats appear in real-time display
- ✅ Shots count correct
- ✅ PIM count correct

**Database Query (Supabase SQL Editor):**
```sql
SELECT
  id,
  stat_type,
  team_type,
  period,
  timestamp,
  entered_by,
  created_at
FROM game_stats
WHERE game_id = '[YOUR_GAME_ID]'
ORDER BY created_at ASC;
```

**Verification:**
- ✅ Exactly 10 new rows
- ✅ All stat types match
- ✅ Timestamps in chronological order
- ✅ `entered_by` = scorekeeper user ID

---

### Step 7: Check for Duplicates

**Actions:**
1. Review all synced stats
2. Check for duplicate entries (same player, stat, period, timestamp)

**Database Query:**
```sql
SELECT
  stat_type,
  player_id,
  period,
  COUNT(*) as count
FROM game_stats
WHERE game_id = '[YOUR_GAME_ID]'
GROUP BY stat_type, player_id, period
HAVING COUNT(*) > 1;
```

**Expected Result:**
- ✅ Query returns 0 rows (no duplicates)
- ✅ Each stat appears exactly once
- ✅ Duplicate detection working

---

### Step 8: Verify IndexedDB Cleanup

**Actions:**
1. Return to DevTools → Application → IndexedDB
2. Refresh the entries object store

**Expected Result:**
- ✅ Queue is now empty
- ✅ All entries removed after successful sync
- ✅ No orphaned data

**Console Verification:**
```javascript
const request = indexedDB.open('scorekeeper-offline-queue', 1);
request.onsuccess = (event) => {
  const db = event.target.result;
  const transaction = db.transaction(['entries'], 'readonly');
  const objectStore = transaction.objectStore('entries');
  const getAllRequest = objectStore.getAll();
  getAllRequest.onsuccess = () => {
    console.log('Remaining entries:', getAllRequest.result.length);
    // Should be 0
  };
};
```

---

## 🔬 Advanced Test Scenarios

### Scenario A: Network Interruption During Sync

**Setup:**
1. Queue 5 stats offline
2. Reconnect WiFi
3. Immediately disconnect after 2-3 stats sync

**Expected Result:**
- ✅ 2-3 stats sync successfully
- ✅ Remaining 2-3 stats stay in queue
- ✅ No errors in console
- ✅ Next reconnection syncs remaining stats

---

### Scenario B: Duplicate Prevention During Offline Sync

**Setup:**
1. Queue same stat twice (e.g., Goal for #10 in P1)
2. Reconnect WiFi

**Expected Result:**
- ✅ First entry syncs (200 OK)
- ✅ Second entry rejected (409 Conflict)
- ✅ Toast shows: "1 synced, 1 failed (duplicates)"
- ✅ Both entries removed from queue

---

### Scenario C: Validation Errors During Sync

**Setup:**
1. Queue invalid stat (e.g., 2nd goal without 2nd shot)
2. Reconnect WiFi

**Expected Result:**
- ✅ Valid stats sync successfully
- ✅ Invalid stat returns 400 Bad Request
- ✅ Error toast shows validation message
- ✅ Failed entry removed from queue

---

### Scenario D: Long Offline Period (Multiple Games)

**Setup:**
1. Disconnect WiFi
2. Complete entire game (50+ stats)
3. Reconnect after 1 hour

**Expected Result:**
- ✅ All stats sync in chronological order
- ✅ No timeouts
- ✅ No memory issues
- ✅ Queue clears completely

---

### Scenario E: Multiple Devices Syncing Simultaneously

**Setup:**
1. Open game on Device A (offline)
2. Open game on Device B (offline)
3. Enter different stats on each
4. Reconnect both devices

**Expected Result:**
- ✅ Both devices sync independently
- ✅ No conflicts between devices
- ✅ All stats appear in database
- ✅ Real-time updates show on both devices

---

## 📊 Test Results Template

### Environment
- **Date:** _____________
- **Tester:** _____________
- **Device:** _____________
- **Browser:** _____________
- **Connection:** _____________

### Test Results

| Step | Description | Pass/Fail | Notes |
|------|-------------|-----------|-------|
| 1 | Interface loads online | ☐ Pass ☐ Fail | |
| 2 | Offline detection works | ☐ Pass ☐ Fail | |
| 3 | Stats queue offline | ☐ Pass ☐ Fail | |
| 4 | IndexedDB stores correctly | ☐ Pass ☐ Fail | |
| 5 | Auto-sync on reconnect | ☐ Pass ☐ Fail | |
| 6 | Stats in database | ☐ Pass ☐ Fail | |
| 7 | No duplicates | ☐ Pass ☐ Fail | |
| 8 | Queue cleanup | ☐ Pass ☐ Fail | |

### Advanced Scenarios

| Scenario | Result | Notes |
|----------|--------|-------|
| A: Network interruption | ☐ Pass ☐ Fail | |
| B: Duplicate prevention | ☐ Pass ☐ Fail | |
| C: Validation errors | ☐ Pass ☐ Fail | |
| D: Long offline period | ☐ Pass ☐ Fail | |
| E: Multiple devices | ☐ Pass ☐ Fail | |

### Issues Found
```
[Document any issues, errors, or unexpected behavior]
```

### Performance Metrics
- Queue operation time: _____ ms
- Sync time (10 stats): _____ seconds
- Memory usage: _____ MB
- Battery impact: _____ %

---

## 🐛 Common Issues & Troubleshooting

### Issue: Stats Don't Queue Offline

**Symptoms:**
- Error toast appears
- Stats not saved
- Console errors

**Possible Causes:**
1. IndexedDB not initialized
2. Browser doesn't support IndexedDB
3. Storage quota exceeded

**Solutions:**
- Check browser console for errors
- Verify IndexedDB support: `window.indexedDB`
- Clear browser storage if quota exceeded

---

### Issue: Auto-Sync Doesn't Trigger

**Symptoms:**
- Stats remain in queue after reconnecting
- No sync toast notification

**Possible Causes:**
1. Service worker not active
2. Online event not detected
3. Background sync disabled

**Solutions:**
- Check service worker status in DevTools
- Manually trigger sync with "Sync Now" button
- Verify browser supports background sync

---

### Issue: Duplicate Stats in Database

**Symptoms:**
- Same stat appears twice
- Score incorrect
- Duplicate prevention failed

**Possible Causes:**
1. 30-second window expired between syncs
2. Different timestamps causing bypass
3. Rapid reconnect/disconnect

**Solutions:**
- Check timestamps of duplicates
- Verify 30-second duplicate detection window
- Manually delete duplicates from database

---

### Issue: Some Stats Fail to Sync

**Symptoms:**
- Partial sync (e.g., 7 of 10 stats)
- Error toasts
- Stats remain in queue

**Possible Causes:**
1. Validation errors (goals > shots)
2. Player not on roster
3. Invalid period/stat type

**Solutions:**
- Check error messages in toast
- Verify player roster
- Review validation rules

---

## ✅ Success Criteria

The offline sync system is considered **PASSING** if:

- ✅ All stats queue correctly when offline
- ✅ IndexedDB stores all entries
- ✅ Auto-sync triggers on reconnection
- ✅ All queued stats sync successfully
- ✅ No duplicate entries in database
- ✅ Queue clears after sync
- ✅ Validation errors handled gracefully
- ✅ Multiple offline sessions work
- ✅ Performance remains acceptable
- ✅ No data loss under any condition

---

## 📸 Required Screenshots

1. **Online state** - Badge showing "Online" (green)
2. **Offline state** - Badge showing "Offline" (red)
3. **Queued stat toast** - "[Stat] queued (offline)" notification
4. **IndexedDB with 10 entries** - DevTools showing queue
5. **Sync success toast** - "Synced 10 offline entries"
6. **Empty queue after sync** - IndexedDB empty
7. **Stats in database** - SQL query results
8. **Real-time update** - StatSummary showing correct score

---

## 🎓 Testing Tips

### Best Practices
1. **Test incrementally** - Start with 1 stat, then 10, then 50
2. **Document everything** - Screenshot each step
3. **Verify at each stage** - Don't wait until end to check
4. **Test edge cases** - Network interruption, validation errors, etc.
5. **Test on real device** - iPad at actual rink if possible

### What to Watch For
- Console errors or warnings
- Network tab showing failed requests
- Memory usage increasing
- Battery drain on mobile
- UI responsiveness
- Toast notification clarity

### When to Escalate
If you encounter:
- Data loss (stats not syncing)
- Duplicate entries persisting
- Browser crashes
- Unrecoverable errors
- Security issues

---

## 📝 Test Sign-Off

### Tester Certification

I certify that I have completed all test scenarios in this guide and the offline sync system meets all success criteria.

**Tester Name:** ___________________________
**Date:** ___________________________
**Signature:** ___________________________

**Result:**
- ☐ **PASS** - System ready for production
- ☐ **CONDITIONAL PASS** - Minor issues, documented above
- ☐ **FAIL** - Critical issues, do not deploy

---

**🏒 This comprehensive test ensures the offline sync system works reliably in real-world conditions at the rink!**
