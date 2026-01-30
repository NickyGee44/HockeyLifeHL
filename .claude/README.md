# .claude Directory

This directory contains Claude Code workflow documentation, templates, and agent prompts for the Hockey Life project.

---

## Contents

### 📚 Documentation

**[DEVELOPMENT_WORKFLOW.md](./DEVELOPMENT_WORKFLOW.md)**
- Complete guide to using Claude Code, Ralph Loop, and Playgrounds
- Workflow patterns for feature development, bug fixes, migrations
- Best practices and troubleshooting
- Integration with Supabase, Stripe, Vercel, GitHub

### 📋 Templates

**[templates/FEATURE_TEMPLATE.md](./templates/FEATURE_TEMPLATE.md)**
- Comprehensive checklist for feature development
- Covers requirements, architecture, implementation, testing, security, deployment
- Use with Ralph Loop for automated feature development

### 🤖 Agent Prompts

**[agent-prompts/security-auditor.md](./agent-prompts/security-auditor.md)**
- Security audit prompts
- Authentication/authorization reviews
- Penetration testing templates
- Pre-deployment security checks

**[agent-prompts/backend-architect.md](./agent-prompts/backend-architect.md)**
- Database schema design prompts
- Migration review templates
- Performance optimization guides
- Multi-tenancy architecture reviews

**[agent-prompts/payments-billing-auditor.md](./agent-prompts/payments-billing-auditor.md)**
- Stripe integration audits
- PCI compliance checks
- Subscription flow reviews
- Payment security audits

---

## Quick Start

### 1. Read the Workflow Guide

Start with [DEVELOPMENT_WORKFLOW.md](./DEVELOPMENT_WORKFLOW.md) to understand how to use Claude Code effectively.

### 2. Use the Feature Template

When implementing a new feature with Ralph Loop:

```bash
claude --ralph --template .claude/templates/FEATURE_TEMPLATE.md \
  "implement [feature name]"
```

### 3. Run Security Audits

After implementing features, run security audits:

```bash
claude --agent security-auditor \
  "audit [feature name] using prompts in .claude/agent-prompts/security-auditor.md"
```

### 4. Review Database Changes

Before applying migrations:

```bash
claude --agent backend-architect \
  "review [migration name] using prompts in .claude/agent-prompts/backend-architect.md"
```

---

## Common Workflows

### Implement New Feature

```bash
# 1. Plan the feature
claude "help me plan the [feature name] feature"

# 2. Implement with Ralph Loop
claude --ralph --template .claude/templates/FEATURE_TEMPLATE.md \
  "implement [feature name]"

# 3. Run security audit
claude --agent security-auditor \
  "audit [feature name]"

# 4. Test in playground
claude playground create --name "[feature]-test"
claude playground exec "test [feature name]"

# 5. Create PR
claude "create PR for [feature name]"
```

### Fix Production Bug

```bash
# 1. Investigate
claude "investigate production error: [error description]"

# 2. Fix
claude "fix [issue description]"

# 3. Test
pnpm test

# 4. Deploy
claude "create hotfix PR for [issue]"
```

### Database Migration

```bash
# 1. Design schema
claude --agent backend-architect \
  "design schema for [feature]"

# 2. Implement migration
claude --ralph "implement [migration name] migration"

# 3. Review migration
claude --agent backend-architect \
  "review [migration name] migration"

# 4. Apply to dev branch
claude "apply migration to dev branch"

# 5. Test
claude "test [feature] with new schema"

# 6. Deploy to production
claude "merge dev branch to main"
```

### Weekly Security Audit

```bash
# Full security scan
claude --agent security-auditor \
  "perform comprehensive security audit of Platform 1"

# Check Supabase advisors
claude "check supabase security and performance advisors"

# Review dependencies
claude "check for security vulnerabilities in dependencies"
```

---

## Agent Prompt Library

Each agent has a collection of reusable prompts for common tasks.

### Security Auditor
- Full platform security audit
- Feature-specific audit
- Pre-deployment check
- Authentication flow audit
- Database security audit
- API endpoint review
- Penetration testing

### Backend Architect
- Database schema design
- Migration review
- Query performance optimization
- Multi-tenancy architecture review
- Backup & recovery strategy
- Concurrent modification handling
- Data archival strategy

### Payments Billing Auditor
- Full billing system audit
- Stripe webhook audit
- Subscription flow audit
- Payment method security
- PCI compliance check
- Refund process audit
- Failed payment recovery

---

## Best Practices

### 1. Always Use Templates

Templates ensure consistent quality and comprehensive coverage:

```bash
# Good
claude --ralph --template .claude/templates/FEATURE_TEMPLATE.md "implement X"

# Not recommended
claude --ralph "implement X"
```

### 2. Run Audits Proactively

Don't wait for issues - audit as you build:

```bash
# After any payment code
claude --agent payments-billing-auditor "audit [feature]"

# After database changes
claude --agent backend-architect "review [migration]"

# After new feature
claude --agent security-auditor "audit [feature]"
```

### 3. Break Down Large Tasks

Smaller tasks = better results:

```bash
# Instead of:
claude --ralph "migrate all admin pages"

# Do:
claude --ralph "migrate league management pages"
claude --ralph "migrate team management pages"
```

### 4. Document As You Go

Update documentation with each feature:

```bash
claude --ralph --update-docs "implement [feature]"
```

### 5. Test Before Deploying

Always test in staging first:

```bash
# 1. Deploy to staging
claude "deploy to staging"

# 2. Run smoke tests
pnpm test:e2e

# 3. Manual QA
# [Test features manually]

# 4. Deploy to production
claude "deploy to production"
```

---

## Troubleshooting

### Ralph Loop Issues

If Ralph Loop gets stuck:

```bash
# Check logs
tail -f ~/.claude/logs/ralph-loop.log

# Resume with more context
claude --ralph --resume --context "previous attempt failed at step X"

# Break down task
claude --ralph "implement step 1: database migration"
```

### Agent Not Available

If specialized agent unavailable:

```bash
# Use manual review
claude "review this code for security vulnerabilities"

# Create checklist
claude "create security audit checklist for this feature"
```

### Build Errors

If build fails:

```bash
# Check error logs
pnpm build 2>&1 | tee build.log

# Ask Claude to fix
claude "fix build error in build.log"
```

---

## Directory Structure

```
.claude/
├── README.md                           # This file
├── DEVELOPMENT_WORKFLOW.md             # Complete workflow guide
├── templates/
│   └── FEATURE_TEMPLATE.md            # Feature development checklist
└── agent-prompts/
    ├── security-auditor.md            # Security audit prompts
    ├── backend-architect.md           # Database & architecture prompts
    └── payments-billing-auditor.md    # Payment & billing prompts
```

---

## Contributing

When adding new workflows or templates:

1. Add documentation to DEVELOPMENT_WORKFLOW.md
2. Create template in templates/ if needed
3. Add agent prompts to agent-prompts/ if needed
4. Update this README
5. Test the workflow
6. Commit changes

---

## Resources

- **Claude Code Documentation:** https://docs.anthropic.com/claude-code
- **Ralph Loop Guide:** https://docs.anthropic.com/claude-code/ralph-loop
- **Playgrounds:** https://docs.anthropic.com/claude-code/playgrounds
- **Agent SDK:** https://docs.anthropic.com/agent-sdk

---

**Questions?**

Ask Claude:
```bash
claude "explain how to use the workflow documentation in .claude/"
```

---

**Last Updated:** 2026-01-30
**Version:** 1.0
