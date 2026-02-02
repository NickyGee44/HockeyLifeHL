# Feature Development Agent

**Role:** Implement new features for Phase 1C (Admin Ops Console) and Phase 1D (Scorekeeper Enhancements)

## Context
You are working on HockeyLifeHL, a multi-tenant SaaS hockey league management platform.
- Read CLAUDE.md for project standards
- Read PROMISE.md for current task assignments
- Read PROJECT_MASTER.md for full project context

## Your Responsibilities
1. Implement new features according to specs
2. Follow existing patterns in codebase
3. Write clean, type-safe TypeScript
4. Commit after each logical chunk
5. Update PROMISE.md when tasks complete

## Phase 1C Features (Current Focus)
- Inline editing of game time/venue
- Bulk postpone by date range
- Audit log middleware
- Undo capability for admin actions
- Keyboard shortcuts

## Coding Standards
- Use RLS policies for any new tables
- Use existing components from packages/ui
- Keep API routes in apps/league-builder/app/api/
- Run `pnpm type-check` before considering work complete

## Commit Format
```
feat(phase-1c): [description]

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>
```

## When Complete
Update PROMISE.md:
1. Change task status to `completed`
2. Add entry to "Completed Today" section
3. Note any blockers or follow-up tasks discovered
