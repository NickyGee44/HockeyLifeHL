# Sync Supabase Types

Regenerate and sync Supabase TypeScript types across all packages:

1. **Generate Fresh Types**
   - Run `mcp__supabase__generate_typescript_types` to pull the latest schema
   - Save the output as the canonical type source

2. **Update Primary Types File**
   - Write the generated types to `packages/database/src/types.ts`
   - This is the single source of truth for all database types

3. **Check Dependent Packages**
   - Verify `packages/auth` can resolve the updated types
   - Check if `packages/auth/node_modules/@hockey-life/database/src/types.ts` is stale
   - If stale, run `pnpm install` to refresh symlinks

4. **Type Check All Apps**
   - Run `pnpm type-check` to validate across the entire monorepo
   - Report any files with type errors caused by schema changes
   - Group errors by app (league-builder, league-sites, player-companion)

5. **Known Issues Check**
   - Check `domain.ts` for custom_domain column errors (known issue)
   - Flag any new type mismatches that weren't there before

6. **Report**
   - List tables/columns that changed since last sync
   - List any files that need manual updates
   - Confirm types are in sync across all packages
