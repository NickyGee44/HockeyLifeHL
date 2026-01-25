# Git Workflow & Branch Strategy

## Branch Structure

This repository uses a dual-environment branching strategy:

### Branches

- **`main`** - Development/Preview Environment
  - For active development and testing
  - All new features and bug fixes are committed here first
  - Automatically deploys to preview environment on Vercel

- **`production`** - Production Environment
  - Live production environment
  - Only receives code via merge from `main`
  - Automatically deploys to production environment on Vercel

---

## Git Rules

### CRITICAL RULES - NEVER BREAK THESE

1. **NEVER push directly to the `production` branch**
   - All changes must go through `main` first
   - Production only receives code via merge from `main`

2. **NEVER force push to either branch**
   - No `git push --force` or `git push -f`
   - This can break deployment history and cause issues

3. **ALWAYS test changes in `main` before merging to `production`**
   - Deploy to preview environment first
   - Verify functionality works as expected
   - Check logs and monitor for errors

---

## Standard Workflow

### Making Changes (Development)

1. Ensure you're on the `main` branch:
   ```bash
   git checkout main
   ```

2. Pull latest changes:
   ```bash
   git pull origin main
   ```

3. Make your changes and commit:
   ```bash
   git add .
   git commit -m "Your descriptive commit message"
   ```

4. Push to `main`:
   ```bash
   git push origin main
   ```

5. Verify deployment in preview environment

---

## Deploying to Production

### When Changes Are Ready for Production

1. Ensure you're on `main` and it's up to date:
   ```bash
   git checkout main
   git pull origin main
   ```

2. Switch to `production` branch:
   ```bash
   git checkout production
   ```

3. Pull latest production changes:
   ```bash
   git pull origin production
   ```

4. Merge `main` into `production`:
   ```bash
   git merge main
   ```

5. Push to production:
   ```bash
   git push origin production
   ```

6. Monitor production deployment and verify functionality

---

## Emergency Rollback (Production)

If a production deployment causes issues:

1. Identify the last working commit hash:
   ```bash
   git log --oneline
   ```

2. Switch to production branch:
   ```bash
   git checkout production
   ```

3. Revert to the last working commit:
   ```bash
   git revert <commit-hash>
   ```

4. Push the revert:
   ```bash
   git push origin production
   ```

**Note:** DO NOT use `git reset --hard` as this requires force push

---

## Viewing Branch Status

Check which branches exist:
```bash
git branch -a
```

Check current branch:
```bash
git branch
```

Check remote tracking:
```bash
git remote show origin
```

---

## Vercel Configuration

**Production Branch:** `production`

This ensures:
- Commits to `production` → Production deployment
- Commits to `main` → Preview deployment
- All other branches → Preview deployments

---

## AI Assistant Guidelines

When working with this repository:

1. Always check current branch before making changes
2. Never suggest or execute direct pushes to `production`
3. Always follow the merge workflow for production deployments
4. When committing changes, use descriptive commit messages
5. Verify environment variables are set correctly for each environment
6. Test in preview before suggesting production deployment

---

## Quick Reference

| Action | Branch | Command |
|--------|--------|---------|
| Development work | `main` | `git checkout main && git pull && [make changes] && git push` |
| Deploy to production | `production` | `git checkout production && git pull && git merge main && git push` |
| Check status | Any | `git status` |
| View branches | Any | `git branch -a` |
| Emergency rollback | `production` | `git checkout production && git revert <hash> && git push` |

---

## Questions?

If you're unsure about any git operation:
1. Check current branch: `git status`
2. View recent commits: `git log --oneline -10`
3. Ask before executing destructive operations
4. When in doubt, create a backup branch first
