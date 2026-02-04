# Pre-Deployment Checklist

Run this before merging to production to verify the codebase is ready:

1. **Code Quality**
   - Run `pnpm type-check` - must pass with no errors
   - Run `pnpm lint` - must pass with no errors
   - Run `pnpm build` - must build successfully

2. **Git Status**
   - Run `git status` to check for uncommitted changes
   - All changes should be committed before shipping
   - Show current branch (should be `main`)

3. **Changes Summary**
   - Run `git log production..main --oneline` to show commits not yet in production
   - Provide a summary of what's being shipped

4. **Environment Check**
   - Verify no development-only code is being shipped
   - Check for console.log statements in production code
   - Verify environment variables are not hardcoded

5. **Pre-Ship Report**
   - Output a checklist with pass/fail status
   - If all checks pass: "Ready to ship!"
   - If any fail: List what needs to be fixed first

6. **Ship Instructions** (if all checks pass)
   ```bash
   git checkout production
   git pull origin production
   git merge main
   git push origin production
   ```
