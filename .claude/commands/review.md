# Self-Review Before Commit

Run a structured code review on current uncommitted changes:

1. **Diff Analysis**
   - Run `git diff --stat` to see scope of changes
   - Run `git diff` to see full changes (staged + unstaged)
   - Run `git diff --cached` to see what's already staged
   - Categorize changes: new features, bug fixes, refactors, config changes

2. **Auth & Security Check**
   - For any new/modified server actions: verify `getServerSession` or auth check exists
   - For any new API routes: verify authentication middleware
   - For any new database queries: verify RLS or explicit org_id/league_id filtering
   - Check for any user input flowing into SQL or HTML without sanitization

3. **Error Handling Review**
   - Check that async operations have try/catch blocks
   - Verify error states are communicated to the UI (not silent failures)
   - Check that Supabase queries check for `.error` in the response
   - Verify redirect/revalidation happens after mutations

4. **Import & Type Check**
   - Look for unused imports in changed files
   - Check for `any` types introduced in changed code
   - Verify imports use the correct package aliases (@hockey-life/*)
   - Check for circular dependencies in new imports

5. **i18n Compliance**
   - If UI text was added/changed, verify it uses translation keys (not hardcoded strings)
   - If en.json was modified, check that fr.json has matching keys
   - Verify `useTranslations` hook is used in components with new text

6. **Breaking Changes**
   - Check for modified function signatures that other files depend on
   - Look for renamed exports that may break imports elsewhere
   - Verify database schema changes are backwards-compatible
   - Check for removed or renamed API routes

7. **Code Quality**
   - Check for leftover debug code (console.log, commented-out code, test data)
   - Verify new components follow existing patterns in the codebase
   - Check for proper TypeScript usage (no implicit any, proper null checks)
   - Verify React best practices (proper key props, no missing deps in hooks)

8. **Report**
   - Output a structured review with sections: MUST FIX, SHOULD FIX, CONSIDER
   - Provide file:line references for each finding
   - End with a commit readiness verdict: READY / NEEDS FIXES
