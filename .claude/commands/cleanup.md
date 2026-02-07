# Codebase Cleanup Scan

Scan for dead code, inconsistencies, and maintenance issues:

1. **i18n Consistency**
   - Read `apps/league-builder/src/messages/en.json` and `apps/league-builder/src/messages/fr.json`
   - Find keys that exist in one language file but not the other
   - Report any missing translations that need to be added

2. **Console Statement Scan**
   - Search all `apps/` directories for `console.log`, `console.warn`, `console.error`
   - Exclude test files and intentional error logging
   - Flag any debug logging that should be removed before production

3. **TODO/FIXME/HACK Audit**
   - Search for `TODO`, `FIXME`, `HACK`, `XXX`, `TEMP` comments across the codebase
   - Group by app and priority
   - Report any that reference completed work (stale TODOs)

4. **Unused Exports**
   - Check `packages/ui/` for components that aren't imported anywhere in `apps/`
   - Check `packages/database/` for exported functions not used by any app
   - Check for barrel exports (`index.ts`) that re-export unused items

5. **Duplicate Components**
   - Look for similarly named components across apps (e.g., same component in league-builder and league-sites)
   - Identify candidates that should be moved to `packages/ui/`

6. **Dead App Detection**
   - Check if `apps/blh/` and `apps/league-site/` are still active
   - Look at their package.json for last modification and dependency freshness
   - Report any apps that appear abandoned or superseded

7. **Dependency Health**
   - Check for duplicate dependencies across workspace packages
   - Flag any packages with significantly outdated versions
   - Look for dependencies that should be devDependencies or vice versa

8. **Report**
   - Output a cleanup summary organized by category
   - Prioritize items: quick wins first, then larger refactors
   - Estimate scope of each cleanup task (single file, multi-file, architectural)
