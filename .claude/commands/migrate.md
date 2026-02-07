# Database Migration Workflow

Run a structured database migration workflow with safety checks:

1. **Check Current State**
   - Run `mcp__supabase__list_migrations` to see existing migrations
   - Run `mcp__supabase__list_tables` with schemas `["public"]` to see current tables
   - Note the latest migration version

2. **Review Pending Changes**
   - Check for any SQL files in `supabase/migrations/` that haven't been applied
   - If the user has described schema changes, draft the migration SQL
   - Always include `IF NOT EXISTS` / `IF EXISTS` guards for safety

3. **RLS Policy Validation**
   - For ANY new table, verify RLS is enabled:
     ```sql
     SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public';
     ```
   - Draft RLS policies for new tables following existing patterns
   - Check that `auth.uid()` is used properly in policies
   - Verify tenant isolation (org_id or league_id scoping)

4. **Apply Migration**
   - Use `mcp__supabase__apply_migration` with a descriptive snake_case name
   - Never hardcode generated IDs in data migrations

5. **Regenerate Types**
   - Run `mcp__supabase__generate_typescript_types` to update TypeScript types
   - Check if `packages/database/src/types.ts` needs updating
   - Verify `packages/auth/node_modules/@hockey-life/database/src/types.ts` stays in sync

6. **Validate**
   - Run `pnpm type-check` to catch any type mismatches from schema changes
   - Report any files that need updating due to new/changed columns

7. **Report**
   - Output migration summary: tables created/altered, RLS status, type generation status
   - List any manual follow-up needed (e.g., seed data, backfills)
