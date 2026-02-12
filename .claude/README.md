# .claude Directory

Configuration, skills, templates, and agent prompts for Claude Code on HockeyLifeHL.

---

## Skills (Slash Commands)

Run these in any Claude Code session:

| Command | Description |
|---------|-------------|
| `/audit` | Quick security audit on recent changes |
| `/doctor` | Environment health check (deps, build, git, services) |
| `/ship` | Pre-deployment checklist before merging to production |
| `/migrate` | Database migration workflow with RLS validation |
| `/sync-types` | Regenerate and sync Supabase TypeScript types |
| `/payments-check` | Stripe payment and billing audit |
| `/cleanup` | Dead code, i18n gaps, and consistency scan |
| `/review` | Self-review before commit |

---

## Directory Structure

```
.claude/
├── README.md                          # This file
├── settings.json                      # Agent definitions, hooks, env config
├── settings.local.json                # Local permissions whitelist
├── DEVELOPMENT_WORKFLOW.md            # Comprehensive workflow guide
├── orchestration.log                  # Session logs
├── ralph-loop.local.md                # Ralph Loop session state
├── commands/                          # Skill definitions (slash commands)
│   ├── audit.md                       # /audit
│   ├── doctor.md                      # /doctor
│   ├── ship.md                        # /ship
│   ├── migrate.md                     # /migrate
│   ├── sync-types.md                  # /sync-types
│   ├── payments-check.md              # /payments-check
│   ├── cleanup.md                     # /cleanup
│   └── review.md                      # /review
├── agents/                            # Agent spec files
│   ├── feature-dev.md
│   ├── bugfix.md
│   └── validator.md
├── agent-prompts/                     # Reusable agent prompt libraries
│   ├── security-auditor.md
│   ├── backend-architect.md
│   └── payments-billing-auditor.md
├── templates/
│   └── FEATURE_TEMPLATE.md           # Feature development checklist
└── promises/
    └── league-setup-wizard.md         # Completed feature promise
```

---

## Configuration

### settings.json
- **Agent teams**: Experimental feature enabled (`CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1`)
- **Hooks**: Session logging on start/stop, type-check before production push
- **Agents**: `feature-dev`, `bugfix`, `explorer`, `validator`

### settings.local.json
- Permissions whitelist for bash commands, git operations, and Supabase MCP tools
- Covers pnpm, git, Supabase, and system utilities

---

## Quick Start

### Run a skill
```
/doctor          # Check environment health
/review          # Review changes before committing
/ship            # Pre-deployment checks
```

### Database workflow
```
/migrate         # Run structured migration with RLS checks
/sync-types      # Regenerate TypeScript types after schema changes
```

### Audits
```
/audit           # Security scan on recent changes
/payments-check  # Stripe integration audit
/cleanup         # Find dead code and i18n gaps
```

### Agent teams (experimental)
Create teams through natural language after enabling:
```
Create a team: one agent for security review, one for performance, one for testing
```

---

## Related Docs

- **Project context**: `CLAUDE.md` (project root)
- **Design system**: `docs/BRAND-KIT.md`
- **Workflow guide**: `.claude/DEVELOPMENT_WORKFLOW.md`

---

**Last Updated:** 2026-11-02
**Version:** 2.1
