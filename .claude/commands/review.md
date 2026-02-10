# Self-Review Before Commit

Run a structured code review on current uncommitted changes:

1. **SECRETS SCAN (MANDATORY — BLOCKING)**
   - Run `git diff --cached` and `git diff` to see ALL changes
   - GREP the full diff output for: `eyJ`, `sk_live_`, `sk_test_`, `whsec_`, `sbp_`, `service_role`, `supabase_service`, `SUPABASE_SERVICE_ROLE_KEY=`, `STRIPE_SECRET`, `password`, `secret`, `.env`
   - Check for ANY hardcoded API keys, JWTs, connection strings, tokens, or credentials
   - Check that NO `.env`, `.env.local`, `.env.production` files are staged
   - Check that NO file contains real secret values (not placeholder text like `your-key-here`)
   - **If ANY secret is found: STOP IMMEDIATELY, unstage the file, and report to the user. DO NOT proceed with the commit.**
   - This step is NON-NEGOTIABLE and must pass before any other review steps

2. **Diff Analysis**
   - Run `git diff --stat` to see scope of changes
   - Run `git diff` to see full changes (staged + unstaged)
   - Run `git diff --cached` to see what's already staged
   - Categorize changes: new features, bug fixes, refactors, config changes

3. **Auth & Security Check**
   - For any new/modified server actions: verify `getServerSession` or auth check exists
   - For any new API routes: verify authentication middleware
   - For any new database queries: verify RLS or explicit org_id/league_id filtering
   - Check for any user input flowing into SQL or HTML without sanitization

4. **Error Handling Review**
   - Check that async operations have try/catch blocks
   - Verify error states are communicated to the UI (not silent failures)
   - Check that Supabase queries check for `.error` in the response
   - Verify redirect/revalidation happens after mutations

5. **Import & Type Check**
   - Look for unused imports in changed files
   - Check for `any` types introduced in changed code
   - Verify imports use the correct package aliases (@hockey-life/*)
   - Check for circular dependencies in new imports

6. **i18n Compliance**
   - If UI text was added/changed, verify it uses translation keys (not hardcoded strings)
   - If en.json was modified, check that fr.json has matching keys
   - Verify `useTranslations` hook is used in components with new text

7. **Breaking Changes**
   - Check for modified function signatures that other files depend on
   - Look for renamed exports that may break imports elsewhere
   - Verify database schema changes are backwards-compatible
   - Check for removed or renamed API routes

8. **Code Quality**
   - Check for leftover debug code (console.log, commented-out code, test data)
   - Verify new components follow existing patterns in the codebase
   - Check for proper TypeScript usage (no implicit any, proper null checks)
   - Verify React best practices (proper key props, no missing deps in hooks)

9. **Report**
   - Output a structured review with sections: MUST FIX, SHOULD FIX, CONSIDER
   - Provide file:line references for each finding
   - End with a commit readiness verdict: READY / NEEDS FIXES
