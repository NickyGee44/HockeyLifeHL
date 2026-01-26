# Scorekeeper System - Manual Testing Checklist

**Date:** January 26, 2026
**Agent:** Agent 4 - Scorekeeper System
**Purpose:** Comprehensive manual testing before production release

---

## 📋 How to Use This Checklist

1. **Before Testing:** Set up test environment with test data
2. **During Testing:** Check each box when test passes
3. **If Test Fails:** Document issue in "Issues Found" section
4. **After Testing:** Review all failures and create bug tickets

**Testing Environment:**
- Browser: Chrome/Safari/Firefox/Edge
- Device: Desktop, iPad, iPhone, Android
- Network: Online, Offline, Slow 3G

---

## 🎯 Pre-Testing Setup

### Test Data Setup
- [ ] Create test league with sample teams
- [ ] Create test scorekeepers (minimum 2 users)
- [ ] Create test games (upcoming and in-progress)
- [ ] Create test rosters (home and away teams, 15+ players each)
- [ ] Assign scorekeepers to test games
- [ ] Identify at least one goalie on each roster (position = 'G')

### Environment Setup
- [ ] Clear browser cache and storage
- [ ] Install PWA on test device (iOS/Android)
- [ ] Set up test email account for notifications
- [ ] Enable browser DevTools for debugging
- [ ] Verify service worker registration

---

## 1️⃣ Authentication & Authorization

### Login Flow
- [ ] Scorekeeper can log in with valid credentials
- [ ] Invalid credentials show appropriate error
- [ ] "Forgot password" link works
- [ ] Session persists across page refresh
- [ ] Logout button works correctly

### Authorization
- [ ] Scorekeeper can only see their assigned games
- [ ] Cannot access games not assigned to them
- [ ] Dashboard shows only scorekeeper-specific data
- [ ] Non-scorekeepers cannot access `/scorekeeper/*` routes

**Issues Found:**
```
[Document any issues here]
```

---

## 2️⃣ Dashboard

### Dashboard Load
- [ ] Dashboard loads within 2 seconds
- [ ] Shows correct number of upcoming assignments
- [ ] Shows hours worked this month
- [ ] Shows pending payments
- [ ] Shows total earnings
- [ ] "View All Assignments" link works

### Stats Cards
- [ ] Games This Week card shows correct count
- [ ] Hours Worked card shows correct hours
- [ ] Pending Payments card shows correct amount
- [ ] Total Earned card shows correct total

### Live Games Section
- [ ] Shows in-progress games (checked in, not completed)
- [ ] "Continue" button navigates to live-entry page
- [ ] Empty state shows when no live games

### Upcoming Assignments
- [ ] Shows games scheduled in the future
- [ ] Displays team names, date/time correctly
- [ ] Payment amount displayed correctly
- [ ] "Start Game" button navigates to live-entry page

**Issues Found:**
```
[Document any issues here]
```

---

## 3️⃣ Live Stat Entry Interface

### Page Load
- [ ] Live entry page loads within 2 seconds
- [ ] Game details displayed correctly (teams, date/time)
- [ ] Rosters loaded for both teams
- [ ] All components render properly
- [ ] No console errors on page load

### iPad Optimization
- [ ] Page forces landscape orientation (iPad)
- [ ] No zoom on input focus
- [ ] All buttons at least 60px height
- [ ] Touch targets easy to tap (even with gloves)
- [ ] No accidental button presses

### Game Clock
- [ ] "Check In" button appears before check-in
- [ ] Clicking "Check In" starts timer
- [ ] Timer shows elapsed time (MM:SS format)
- [ ] "Complete Game" button appears after check-in
- [ ] Clicking "Complete Game" stops timer and records duration
- [ ] Check-in time recorded in database
- [ ] Completion time recorded in database

**Issues Found:**
```
[Document any issues here]
```

---

## 4️⃣ Stat Entry Workflow

### Team Selection
- [ ] Home team button highlights when selected
- [ ] Away team button highlights when selected
- [ ] Switching teams clears jersey number input
- [ ] Switching teams deselects current player
- [ ] Team name displayed correctly

### Period Selection
- [ ] P1, P2, P3, OT buttons all work
- [ ] Selected period highlights correctly
- [ ] Can switch periods during game
- [ ] Period number stored correctly in database

### Jersey Number Input
- [ ] Can type jersey number with keyboard
- [ ] Auto-selects player when valid number entered
- [ ] Clears selection when number cleared
- [ ] Shows player name when matched
- [ ] Shows player position badge
- [ ] Debounce prevents excessive lookups (150ms)
- [ ] Input autofocuses on page load

### Player Autocomplete
- [ ] Jersey #10 autocompletes to correct player
- [ ] Invalid jersey number shows no match
- [ ] Player lookup is fast (<100ms)
- [ ] Player name and position display correctly
- [ ] Green checkmark appears when player selected

### Player List Selection
- [ ] "Select player from list" expands
- [ ] All roster players displayed
- [ ] Clicking player selects them
- [ ] Jersey number auto-fills when player selected from list
- [ ] Scroll works smoothly with 20+ players

**Issues Found:**
```
[Document any issues here]
```

---

## 5️⃣ Stat Type Buttons

### Goal Button
- [ ] Large button (60px+ height)
- [ ] Green color (#16a34a)
- [ ] Target icon visible
- [ ] Records goal correctly
- [ ] Toast confirmation appears
- [ ] Goal increments in StatSummary
- [ ] Disabled when no player selected

### Assist Button
- [ ] Large button (60px+ height)
- [ ] Blue color
- [ ] User icon visible
- [ ] Records assist correctly
- [ ] Toast confirmation appears
- [ ] Disabled when no player selected

### Penalty Button
- [ ] Large button (60px+ height)
- [ ] Red color
- [ ] X icon visible
- [ ] Records penalty correctly (defaults to 2 min)
- [ ] Toast confirmation appears
- [ ] PIM increments in StatSummary
- [ ] Disabled when no player selected

### Shot Button
- [ ] Large button (60px+ height)
- [ ] Purple color
- [ ] Target icon visible
- [ ] Records shot correctly
- [ ] Toast confirmation appears
- [ ] Shots increment in StatSummary
- [ ] Disabled when no player selected

### Save Button (Goalie Only)
- [ ] Large button (60px+ height)
- [ ] Orange color
- [ ] Shield icon visible
- [ ] Enabled only when goalie selected
- [ ] Records save correctly
- [ ] Toast confirmation appears
- [ ] Disabled for non-goalies

### Goal Against Button (Goalie Only)
- [ ] Large button (60px+ height)
- [ ] Gray color
- [ ] Shield icon visible
- [ ] Enabled only when goalie selected
- [ ] Records goal against correctly
- [ ] Toast confirmation appears
- [ ] Disabled for non-goalies

**Issues Found:**
```
[Document any issues here]
```

---

## 6️⃣ Validation Rules

### Goals vs Shots Validation
- [ ] Can record 1 shot
- [ ] Can record 1 goal (after 1 shot)
- [ ] Cannot record 2nd goal without 2nd shot
- [ ] Error toast shows: "Cannot have more goals (2) than shots (1)"
- [ ] Recording shot unblocks goal entry
- [ ] Validation works for both home and away teams

### PIM Value Validation
- [ ] Default penalty is 2 minutes
- [ ] Can record 2, 4, 5, 10, 20 minute penalties
- [ ] PIM total increments correctly
- [ ] (Future: Invalid PIM values rejected)

### Goalie Stat Validation
- [ ] Non-goalies cannot record Save
- [ ] Non-goalies cannot record Goal Against
- [ ] Goalies can record Save
- [ ] Goalies can record Goal Against
- [ ] Goalies can record Goal (rare but valid - console warning)

### Period Validation
- [ ] Can record stats in Period 1
- [ ] Can record stats in Period 2
- [ ] Can record stats in Period 3
- [ ] Can record stats in Period 4 (OT)
- [ ] Period number 0 or 5+ rejected (server-side)

### Rate Limiting
- [ ] Can record first stat immediately
- [ ] Cannot record second stat within 1 second
- [ ] Error toast shows: "Please wait 1s before entering another stat"
- [ ] After 1 second, can record next stat
- [ ] Rate limit prevents accidental double-taps

**Issues Found:**
```
[Document any issues here]
```

---

## 7️⃣ Offline Functionality

### Offline Detection
- [ ] "Online" badge shows when connected
- [ ] "Offline" badge shows when disconnected
- [ ] Badge color changes (green → red)
- [ ] Browser DevTools → Network → Offline mode works

### Offline Queue
- [ ] Can enter stat while offline
- [ ] Toast shows: "Goal queued (offline)"
- [ ] Toast shows: "Will sync when online"
- [ ] Stat stored in IndexedDB
- [ ] Jersey number clears after queued entry
- [ ] Can queue multiple stats while offline

### Offline Sync
- [ ] Going online triggers automatic sync
- [ ] Toast shows: "Synced X offline entries"
- [ ] Stats appear in StatSummary after sync
- [ ] IndexedDB queue emptied after sync
- [ ] Duplicate detection prevents double-submission

### Manual Sync
- [ ] "Sync Now" button appears when offline entries exist
- [ ] Clicking "Sync Now" syncs queue immediately
- [ ] Progress indicator shows during sync
- [ ] Success message after manual sync

### Offline Edge Cases
- [ ] Can switch teams while offline
- [ ] Can switch periods while offline
- [ ] Can select different players while offline
- [ ] Offline stats sync in chronological order
- [ ] Service worker caches pages for offline use

**Issues Found:**
```
[Document any issues here]
```

---

## 8️⃣ Real-Time Updates

### StatSummary Component
- [ ] Shows current score (home - away)
- [ ] Shows shots on goal
- [ ] Shows penalty minutes
- [ ] Updates immediately after stat entry
- [ ] Large font size for readability

### Real-Time Sync
- [ ] Open game on Device A
- [ ] Open same game on Device B
- [ ] Record goal on Device A
- [ ] Score updates on Device B within 2 seconds
- [ ] No page refresh required

### Supabase Realtime
- [ ] Subscription establishes on page load
- [ ] INSERT events trigger stat refresh
- [ ] No "channel already exists" errors
- [ ] Channel properly unsubscribed on unmount
- [ ] Multiple users can watch game simultaneously

**Issues Found:**
```
[Document any issues here]
```

---

## 9️⃣ Undo Functionality

### Undo Button
- [ ] Undo button appears after stat entry
- [ ] Undo button hidden when no recent entry
- [ ] Undo button disabled when offline
- [ ] Tooltip shows "Must be online to undo" when offline
- [ ] Undo button shows Undo2 icon

### Undo Action
- [ ] Clicking "Undo" deletes last stat
- [ ] Toast shows: "Last entry undone"
- [ ] Stat removed from database
- [ ] Score decrements in StatSummary
- [ ] Undo button disappears after undo
- [ ] Cannot undo same entry twice

### Undo Limitations
- [ ] Can only undo last entry
- [ ] Cannot undo after switching games
- [ ] Cannot undo offline entries until synced
- [ ] Stat ID properly tracked for undo

**Issues Found:**
```
[Document any issues here]
```

---

## 🔟 Performance

### Page Load Times
- [ ] Dashboard loads in <2 seconds
- [ ] Live entry page loads in <2 seconds
- [ ] Roster loads in <1 second
- [ ] No spinners for >3 seconds

### Stat Entry Speed
- [ ] Stat entry response <100ms (online)
- [ ] Stat entry response <50ms (offline)
- [ ] No lag when tapping buttons rapidly
- [ ] Toast notifications appear immediately
- [ ] UI remains responsive during stat entry

### Memory Usage
- [ ] No memory leaks after 50+ stat entries
- [ ] Browser DevTools → Memory → No unbounded growth
- [ ] Service worker doesn't consume excessive memory

### Network Efficiency
- [ ] API calls batched where possible
- [ ] No redundant requests
- [ ] Images optimized and cached
- [ ] Minimal data transfer per stat entry

**Issues Found:**
```
[Document any issues here]
```

---

## 1️⃣1️⃣ PWA Installation

### iOS Installation (Safari)
- [ ] Open app in Safari on iPhone/iPad
- [ ] Tap Share button
- [ ] Tap "Add to Home Screen"
- [ ] App icon appears on home screen
- [ ] App opens in standalone mode (no Safari UI)
- [ ] Landscape orientation locked
- [ ] Service worker registers successfully

### Android Installation (Chrome)
- [ ] Open app in Chrome on Android
- [ ] Install prompt appears
- [ ] Tap "Install" button
- [ ] App icon appears on home screen
- [ ] App opens in standalone mode
- [ ] Landscape orientation preference works
- [ ] Service worker registers successfully

### Desktop Installation
- [ ] Install icon appears in Chrome address bar
- [ ] Click install icon
- [ ] App opens in standalone window
- [ ] App icon on desktop/taskbar
- [ ] Can uninstall via Chrome settings

### PWA Manifest
- [ ] manifest.json serves correctly
- [ ] Icons all load (72px - 512px)
- [ ] Maskable icon displays correctly
- [ ] Theme color applied (#E31837)
- [ ] App name displayed correctly
- [ ] Start URL navigates correctly

**Issues Found:**
```
[Document any issues here]
```

---

## 1️⃣2️⃣ Service Worker

### Service Worker Registration
- [ ] Service worker registers on page load
- [ ] Registration shows in DevTools → Application → Service Workers
- [ ] Status shows "activated and is running"
- [ ] Scope is "/" (root)

### Caching Strategy
- [ ] Static assets cached (CSS, JS, images)
- [ ] Scorekeeper pages cached
- [ ] API endpoints use network-first strategy
- [ ] Cache version increments on update

### Background Sync
- [ ] Background sync event triggers on online
- [ ] Offline queue synced automatically
- [ ] Sync completes successfully
- [ ] No errors in service worker console

### Service Worker Updates
- [ ] New service worker version detected
- [ ] Update prompt appears
- [ ] Skip waiting works correctly
- [ ] Page reloads with new version

**Issues Found:**
```
[Document any issues here]
```

---

## 1️⃣3️⃣ Mobile Responsiveness

### iPhone (Portrait)
- [ ] Layout adapts to portrait mode (though discouraged)
- [ ] All buttons accessible
- [ ] Text readable without zoom
- [ ] No horizontal scroll

### iPhone (Landscape)
- [ ] Layout optimized for landscape
- [ ] Buttons full width
- [ ] No wasted space
- [ ] Keyboard doesn't obscure content

### iPad (Portrait)
- [ ] Layout works in portrait
- [ ] Buttons large and tappable
- [ ] Stats visible without scroll

### iPad (Landscape) - PRIMARY
- [ ] Layout perfect in landscape
- [ ] All controls accessible
- [ ] Buttons 60px+ height
- [ ] No need to scroll for main functions
- [ ] Jersey number input large and visible
- [ ] Period buttons easy to tap

### Android Tablet
- [ ] Layout adapts correctly
- [ ] Touch targets appropriately sized
- [ ] No rendering issues

**Issues Found:**
```
[Document any issues here]
```

---

## 1️⃣4️⃣ Error Handling

### Network Errors
- [ ] Lost connection during stat entry
- [ ] Stat queued automatically
- [ ] Error toast shown
- [ ] No data loss

### API Errors
- [ ] 401 Unauthorized handled gracefully
- [ ] 403 Forbidden shows appropriate message
- [ ] 404 Not Found handled
- [ ] 500 Server Error handled
- [ ] Timeout handled (>10 seconds)

### Validation Errors
- [ ] Clear error messages shown
- [ ] Toast notifications user-friendly
- [ ] No cryptic error codes
- [ ] User knows how to fix issue

### Edge Cases
- [ ] Empty roster handled
- [ ] Game with no teams
- [ ] Invalid game ID
- [ ] Expired session
- [ ] Database connection lost

**Issues Found:**
```
[Document any issues here]
```

---

## 1️⃣5️⃣ Data Integrity

### Database Verification
- [ ] Stats appear in `game_stats` table
- [ ] All required fields populated
- [ ] league_id set correctly
- [ ] entered_by = scorekeeper user ID
- [ ] team_type = 'home' or 'away'
- [ ] timestamp accurate

### Audit Logging
- [ ] Entry logged in `game_stat_entry_log`
- [ ] Action = 'create'
- [ ] scorekeeper_id correct
- [ ] stat_type correct
- [ ] player_id correct
- [ ] Undo logged as 'delete'

### Duplicate Prevention
- [ ] Cannot submit same stat twice (30s window)
- [ ] Duplicate detection works
- [ ] 409 Conflict status returned
- [ ] No duplicate rows in database

### Data Consistency
- [ ] Goals never exceed shots (team level)
- [ ] PIM values are valid (2, 4, 5, 10, 20)
- [ ] Goalie stats only for goalies
- [ ] Period number 1-4 only

**Issues Found:**
```
[Document any issues here]
```

---

## 1️⃣6️⃣ Payment Tracking

### Payment Calculation
- [ ] Check-in time recorded
- [ ] Completion time recorded
- [ ] Game duration calculated correctly
- [ ] Payment amount = (duration in hours) × hourly rate
- [ ] Payment status = 'pending' after completion

### Dashboard Display
- [ ] Pending payments shown correctly
- [ ] Total earnings calculated correctly
- [ ] Hours worked this month accurate
- [ ] Payment details link works

**Issues Found:**
```
[Document any issues here]
```

---

## 1️⃣7️⃣ Accessibility

### Keyboard Navigation
- [ ] Tab order logical
- [ ] Can navigate with keyboard only
- [ ] Enter key submits forms
- [ ] Escape key closes modals

### Screen Reader
- [ ] ARIA labels present
- [ ] Button labels descriptive
- [ ] Form inputs labeled
- [ ] Status messages announced

### Color Contrast
- [ ] Text readable on all backgrounds
- [ ] WCAG AA compliant
- [ ] Color not sole indicator
- [ ] High contrast mode works

### Focus Indicators
- [ ] Visible focus rings
- [ ] Focus doesn't get trapped
- [ ] Focus order makes sense

**Issues Found:**
```
[Document any issues here]
```

---

## 1️⃣8️⃣ Browser Compatibility

### Chrome
- [ ] All features work
- [ ] No console errors
- [ ] PWA installable
- [ ] Service worker works

### Safari (iOS)
- [ ] All features work
- [ ] No console errors
- [ ] Add to Home Screen works
- [ ] Service worker works

### Firefox
- [ ] All features work
- [ ] No console errors
- [ ] PWA support
- [ ] Service worker works

### Edge
- [ ] All features work
- [ ] No console errors
- [ ] PWA installable
- [ ] Service worker works

**Issues Found:**
```
[Document any issues here]
```

---

## 1️⃣9️⃣ Security

### Authentication
- [ ] Cannot access without login
- [ ] Session expires after timeout
- [ ] Logout clears session
- [ ] No token in URL

### Authorization
- [ ] Cannot access other scorekeepers' games
- [ ] Cannot modify stats for unassigned games
- [ ] RLS policies enforce permissions
- [ ] Server-side validation present

### Data Protection
- [ ] No sensitive data in console logs
- [ ] No API keys in client code
- [ ] HTTPS enforced
- [ ] CSRF protection

**Issues Found:**
```
[Document any issues here]
```

---

## 2️⃣0️⃣ User Experience

### Visual Polish
- [ ] Consistent colors throughout
- [ ] Smooth animations
- [ ] Loading states clear
- [ ] Success states rewarding
- [ ] Error states helpful

### Feedback
- [ ] Every action has feedback
- [ ] Toast notifications clear
- [ ] Button states obvious (enabled/disabled)
- [ ] Progress indicators when needed

### Ease of Use
- [ ] Can enter stat in <5 seconds
- [ ] Minimal taps required
- [ ] No unnecessary steps
- [ ] Intuitive flow
- [ ] No training needed for basic use

**Issues Found:**
```
[Document any issues here]
```

---

## ✅ Sign-Off

### Tester Information
- **Name:** ___________________________
- **Date:** ___________________________
- **Role:** ___________________________
- **Device(s) Used:** ___________________________

### Test Results
- **Total Tests:** _____ / _____
- **Tests Passed:** _____
- **Tests Failed:** _____
- **Pass Rate:** _____%

### Recommendation
- [ ] **PASS** - Ready for production
- [ ] **CONDITIONAL PASS** - Minor issues, can launch with known limitations
- [ ] **FAIL** - Critical issues, do not launch

### Critical Issues (Blockers)
```
1. [Issue description]
2. [Issue description]
3. [Issue description]
```

### Minor Issues (Can Fix Later)
```
1. [Issue description]
2. [Issue description]
3. [Issue description]
```

### Notes & Observations
```
[Additional notes, suggestions, or observations]
```

---

## 📊 Test Coverage Summary

| Category | Total Tests | Passed | Failed | Pass Rate |
|----------|-------------|--------|--------|-----------|
| Authentication & Authorization | 9 | | | |
| Dashboard | 13 | | | |
| Live Stat Entry Interface | 11 | | | |
| Stat Entry Workflow | 20 | | | |
| Stat Type Buttons | 28 | | | |
| Validation Rules | 21 | | | |
| Offline Functionality | 15 | | | |
| Real-Time Updates | 9 | | | |
| Undo Functionality | 11 | | | |
| Performance | 11 | | | |
| PWA Installation | 13 | | | |
| Service Worker | 10 | | | |
| Mobile Responsiveness | 15 | | | |
| Error Handling | 15 | | | |
| Data Integrity | 13 | | | |
| Payment Tracking | 6 | | | |
| Accessibility | 12 | | | |
| Browser Compatibility | 16 | | | |
| Security | 9 | | | |
| User Experience | 11 | | | |
| **TOTAL** | **268** | | | |

---

**🏒 This checklist ensures the scorekeeper system is production-ready and meets all quality standards.**

**Next Steps After Testing:**
1. Document all issues found
2. Prioritize issues (critical vs minor)
3. Create bug tickets in tracking system
4. Fix critical issues before launch
5. Schedule minor issues for future sprints
6. Conduct final regression testing
7. Obtain stakeholder sign-off
8. Deploy to production
