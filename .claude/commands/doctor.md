# Environment Health Check

Check the development environment health and report any issues:

1. **Dependencies**
   - Run `pnpm --version` to verify pnpm is installed
   - Run `node --version` to verify Node.js version
   - Check if `node_modules` exists and run `pnpm install` if needed

2. **Build Health**
   - Run `pnpm type-check` to verify TypeScript compilation
   - Run `pnpm lint` to check for linting errors

3. **Git Status**
   - Run `git status` to check for uncommitted changes
   - Run `git worktree list` to show active worktrees
   - Check for stale branches

4. **Services**
   - Check if Supabase connection is configured (verify .env files exist)
   - Verify Stripe keys are set (check .env.local exists)

5. **Summary**
   - Output a health report table with status for each check
   - List any issues that need attention
   - Provide suggested fixes for any problems found
