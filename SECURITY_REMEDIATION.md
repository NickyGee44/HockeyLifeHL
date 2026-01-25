# 🔒 SECURITY REMEDIATION TRACKER
## HockeyLifeHL Application

**Created:** January 25, 2026
**Status:** IN PROGRESS
**Last Updated:** January 25, 2026 - Initial creation

---

## 📋 TEAM ASSIGNMENTS

### Required Professionals/Agents

| Role | Responsibilities | Agent/Person |
|------|------------------|--------------|
| **Backend Security Engineer** | API authentication, authorization, server-side validation | Claude Code Agent |
| **Full-Stack Developer** | Input validation, error handling, type safety | Claude Code Agent |
| **DevOps Engineer** | Environment variable management, secrets rotation | DevOps Team / Manual |
| **Database Administrator** | SQL query optimization, RLS policies | Manual / DBA |
| **Frontend Developer** | Error boundaries, client-side validation | Claude Code Agent |
| **Security Auditor** | Final review, penetration testing | Manual / Security Team |

---

## 🔴 CRITICAL PRIORITY TASKS

### TASK 1: FIX UNAUTHENTICATED EMAIL API ROUTES
**Status:** ✅ COMPLETED
**Assigned To:** Backend Security Engineer (Claude Code Agent)
**Priority:** CRITICAL - Fix Immediately
**Estimated Time:** 30 minutes
**Actual Time:** 25 minutes
**Risk:** Anyone can enumerate emails and send bulk emails

**Files Modified:**
- ✅ `src/app/api/email/recipients/route.ts`
- ✅ `src/app/api/email/send/route.ts`
- ✅ `src/app/api/email/generate/route.ts`
- ✅ `src/app/api/email/template/route.ts`
- ✅ `src/app/api/email/save-draft/route.ts`

**Changes Implemented:**
1. ✅ Added authentication check at start of each route
2. ✅ Verified user has owner role
3. ✅ Return 401 for unauthenticated requests
4. ✅ Return 403 for non-owner requests

**Acceptance Criteria:**
- [x] All email routes require authentication
- [x] Only owners can access email routes
- [x] Proper HTTP status codes returned (401/403)
- [x] Error messages don't leak information

**Completion Notes:**
- ✅ All 5 email API routes now require authentication
- ✅ Role-based access control enforced (owner only)
- ✅ Proper HTTP status codes (401 for unauthenticated, 403 for unauthorized role)
- ✅ Used createClient() from @/lib/supabase/server for auth checks
- ✅ No PII or system information leaked in error messages

---

### TASK 2: ADD PAYMENT AMOUNT VALIDATION
**Status:** 🔴 NOT STARTED
**Assigned To:** Full-Stack Developer
**Priority:** CRITICAL - Fix Immediately
**Estimated Time:** 15 minutes
**Risk:** Negative/invalid payments, financial fraud

**Files to Modify:**
- `src/lib/payments/actions.ts`

**Changes Required:**
1. Validate amount is a valid number (not NaN)
2. Ensure amount is positive
3. Add upper bound validation ($10,000 max)
4. Round to 2 decimal places for currency
5. Validate payment method is from allowed list

**Acceptance Criteria:**
- [ ] Amount validated as number
- [ ] Negative amounts rejected
- [ ] NaN/Infinity rejected
- [ ] Upper bound enforced
- [ ] Currency precision correct (2 decimals)

**Completion Notes:**
- [ ] Not started

---

### TASK 3: IMPLEMENT STRIPE WEBHOOK IDEMPOTENCY
**Status:** 🔴 NOT STARTED
**Assigned To:** Backend Security Engineer
**Priority:** CRITICAL - Fix Immediately
**Estimated Time:** 20 minutes
**Risk:** Duplicate payments, financial discrepancies

**Files to Modify:**
- `src/app/api/webhooks/stripe/route.ts`
- Database: Add `webhook_events` table (migration needed)

**Changes Required:**
1. Create webhook_events table to track processed events
2. Check if event already processed before handling
3. Log event ID after processing
4. Return success for duplicate events (idempotent)

**Acceptance Criteria:**
- [ ] webhook_events table created
- [ ] Duplicate events detected
- [ ] Duplicate events don't create duplicate payments
- [ ] Event processing logged

**Completion Notes:**
- [ ] Not started

---

### TASK 4: ADD INPUT SANITIZATION TO TEAM CREATION
**Status:** 🔴 NOT STARTED
**Assigned To:** Full-Stack Developer
**Priority:** CRITICAL - Fix Immediately
**Estimated Time:** 20 minutes
**Risk:** XSS attacks, invalid data in database

**Files to Modify:**
- `src/lib/teams/actions.ts`
- `src/lib/seasons/actions.ts`
- `src/lib/games/actions.ts`

**Changes Required:**
1. Validate max length for string inputs
2. Validate hex color format
3. HTML-escape user-provided strings
4. Validate enum values against allowed lists

**Acceptance Criteria:**
- [ ] String length limits enforced
- [ ] Color format validated (hex)
- [ ] XSS protection via HTML escaping
- [ ] Invalid colors rejected
- [ ] Enum values validated

**Completion Notes:**
- [ ] Not started

---

### TASK 5: FIX UNSAFE parseInt/parseFloat CALLS
**Status:** 🔴 NOT STARTED
**Assigned To:** Full-Stack Developer
**Priority:** CRITICAL - Fix Immediately
**Estimated Time:** 30 minutes
**Risk:** Invalid data, application crashes

**Files to Modify:**
- `src/lib/games/actions.ts` (lines 149-150)
- `src/lib/seasons/actions.ts` (lines 97-98)
- `src/lib/auth/profile-actions.ts` (line 30)
- `src/lib/admin/suspension-actions.ts` (line 57)

**Changes Required:**
1. Check if parseInt/parseFloat returns NaN
2. Add lower bound validation (>= 0)
3. Add upper bound validation (context-specific)
4. Return error for invalid values instead of defaulting

**Acceptance Criteria:**
- [ ] All parseInt/parseFloat checked for NaN
- [ ] Bounds validation added
- [ ] Errors returned for invalid input
- [ ] No silent failures with || 0

**Completion Notes:**
- [ ] Not started

---

### TASK 6: ADD NULL CHECKS AFTER DATABASE QUERIES
**Status:** 🔴 NOT STARTED
**Assigned To:** Full-Stack Developer
**Priority:** CRITICAL - Fix Immediately
**Estimated Time:** 45 minutes
**Risk:** Null pointer exceptions, application crashes

**Files to Modify:**
- `src/lib/draft/actions.ts` (lines 255-270, 706)
- `src/lib/stats/actions.ts`
- `src/lib/games/actions.ts`

**Changes Required:**
1. Add null checks after all .single() queries
2. Return errors when required data is null
3. Use non-null assertions only when guaranteed
4. Add defensive programming for optional data

**Acceptance Criteria:**
- [ ] All .single() queries have null checks
- [ ] Errors returned for missing required data
- [ ] No unsafe optional chaining on required fields
- [ ] Defensive checks for arrays before destructuring

**Completion Notes:**
- [ ] Not started

---

### TASK 7: VALIDATE JSON.parse RESULTS
**Status:** 🔴 NOT STARTED
**Assigned To:** Full-Stack Developer
**Priority:** CRITICAL - Fix Immediately
**Estimated Time:** 20 minutes
**Risk:** Type errors, application crashes

**Files to Modify:**
- `src/lib/seasons/actions.ts` (lines 111-125)

**Changes Required:**
1. Validate parsed JSON structure matches expected type
2. Use type guards to verify array vs object vs primitive
3. Validate array elements are correct type
4. Fall back to defaults on validation failure

**Acceptance Criteria:**
- [ ] JSON parsed values validated
- [ ] Array.isArray() checks added
- [ ] Element type validation added
- [ ] Safe fallbacks for invalid data

**Completion Notes:**
- [ ] Not started

---

### TASK 8: ROTATE EXPOSED API KEYS
**Status:** 🔴 NOT STARTED
**Assigned To:** DevOps Engineer (Manual)
**Priority:** CRITICAL - Do Immediately
**Estimated Time:** 30 minutes
**Risk:** Full system compromise, data breach

**Actions Required:**
1. Rotate Supabase anon key
2. Rotate Supabase service role key
3. Rotate Resend API key
4. Rotate OpenAI API key
5. Update keys in Vercel environment variables
6. Remove `.env.local` from git history
7. Verify keys in `.gitignore`

**Acceptance Criteria:**
- [ ] All keys rotated in respective services
- [ ] New keys set in Vercel
- [ ] Old keys revoked
- [ ] `.env.local` purged from git history
- [ ] `.env*.local` in `.gitignore`
- [ ] Local `.env.local` updated with new keys

**Completion Notes:**
- [ ] Not started

---

## 🟠 HIGH PRIORITY TASKS (TO BE COMPLETED THIS WEEK)

### TASK 9: REMOVE @ts-nocheck FROM ALL FILES
**Status:** 🔴 NOT STARTED
**Assigned To:** Full-Stack Developer
**Priority:** HIGH
**Estimated Time:** 4-6 hours

**Files to Modify:**
- All files in `src/lib/` with `@ts-nocheck`
- Approximately 50+ files

**Completion Notes:**
- [ ] Not started

---

### TASK 10: ADD ERROR BOUNDARIES TO ALL ROUTES
**Status:** 🔴 NOT STARTED
**Assigned To:** Frontend Developer
**Priority:** HIGH
**Estimated Time:** 2 hours

**Completion Notes:**
- [ ] Not started

---

### TASK 11: IMPLEMENT AUDIT LOGGING
**Status:** 🔴 NOT STARTED
**Assigned To:** Backend Security Engineer
**Priority:** HIGH
**Estimated Time:** 3 hours

**Completion Notes:**
- [ ] Not started

---

### TASK 12: ADD RATE LIMITING
**Status:** 🔴 NOT STARTED
**Assigned To:** Backend Security Engineer
**Priority:** HIGH
**Estimated Time:** 2 hours

**Completion Notes:**
- [ ] Not started

---

## 📊 PROGRESS TRACKING

| Priority | Total Tasks | Completed | In Progress | Not Started |
|----------|-------------|-----------|-------------|-------------|
| CRITICAL | 8 | 0 | 0 | 8 |
| HIGH | 4 | 0 | 0 | 4 |
| **TOTAL** | **12** | **0** | **0** | **12** |

**Overall Progress:** 0% Complete

---

## 📝 CHANGE LOG

### January 25, 2026 - Initial Creation
- Created security remediation tracker
- Identified 8 critical priority tasks
- Identified 4 high priority tasks
- Assigned responsibilities to team roles
- Ready to begin remediation work

---

## 🎯 SUCCESS CRITERIA

All critical tasks must be completed before deployment:
- [ ] All email API routes require authentication
- [ ] Payment validation prevents fraud
- [ ] Stripe webhooks are idempotent
- [ ] Input sanitization prevents XSS
- [ ] All parseInt/parseFloat calls validated
- [ ] Null checks prevent crashes
- [ ] JSON parsing validated
- [ ] All API keys rotated and secured

---

## 📞 ESCALATION CONTACTS

- **Security Issues:** Security Team Lead
- **Database Issues:** Database Administrator
- **Deployment Issues:** DevOps Team Lead
- **Critical Bugs:** Development Team Lead

---

*This document will be updated after each task completion to track progress.*
