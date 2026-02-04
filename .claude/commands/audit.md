# Quick Security Audit

Run a quick security audit on the most recently changed files:

1. **Find Recent Changes**
   - Run `git diff --name-only HEAD~5` to find files changed in last 5 commits
   - Focus on: API routes, server actions, database queries, middleware

2. **RLS Policy Check**
   - For any new/modified Supabase tables, verify RLS policies exist
   - Use `mcp__supabase__execute_sql` to query pg_policies if needed

3. **Credentials Scan**
   - Search changed files for hardcoded API keys, secrets, or credentials
   - Check for patterns like: `sk_`, `pk_`, `password=`, `secret=`, `apikey=`
   - Verify no .env files are staged for commit

4. **SQL Injection Review**
   - Check any raw SQL queries for proper parameterization
   - Look for string concatenation in queries
   - Verify Supabase client is used properly

5. **Auth Check**
   - Verify new API routes have proper authentication
   - Check for `getServerSession` or auth middleware usage
   - Verify protected routes are actually protected

6. **Report**
   - Output findings in a security report format
   - Mark severity: CRITICAL, HIGH, MEDIUM, LOW
   - Provide specific file:line references for issues
