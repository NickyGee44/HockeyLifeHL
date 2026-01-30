# Development Workflow: Agents, Ralph Loop & Playgrounds

**Last Updated:** 2026-01-30

This document describes how to use Claude Code's advanced features to automate development tasks and maintain high code quality throughout the Hockey Life multi-tenant SaaS platform.

---

## Overview

The Hockey Life project uses a **multi-agent workflow** approach that combines:

1. **Claude Code CLI** - Interactive development assistant
2. **Ralph Loop** - Autonomous task execution with iterative refinement
3. **Playgrounds** - Isolated testing and experimentation environments
4. **Specialized Agents** - Domain-specific expertise (security, payments, privacy, SRE)

This workflow enables rapid feature development while maintaining security, reliability, and code quality standards.

---

## Core Concepts

### 1. Claude Code CLI

**Purpose:** Interactive development, debugging, and code exploration

**Use Cases:**
- Quick bug fixes
- Code explanations
- Database queries
- Documentation updates
- Ad-hoc tasks

**Example:**
```bash
# Start interactive session
claude code

# Run specific command
claude "fix the signup validation logic"
```

### 2. Ralph Loop

**Purpose:** Autonomous execution of complex, multi-step tasks

**How It Works:**
1. You provide a high-level task description
2. Claude creates a detailed implementation plan
3. Ralph Loop executes the plan autonomously
4. Each step is verified before proceeding
5. Errors trigger automatic refinement and retry

**Use Cases:**
- Feature implementations
- Large-scale refactoring
- Migration tasks
- Multi-file changes

**Example Workflow:**
```bash
# Start Ralph Loop with task
claude --ralph "implement organization-scoped analytics dashboard"

# Ralph Loop will:
# 1. Explore codebase for analytics patterns
# 2. Create database migration for analytics tables
# 3. Build API endpoints with RLS policies
# 4. Create dashboard UI components
# 5. Write tests
# 6. Run security audit
# 7. Update documentation
```

### 3. Playgrounds

**Purpose:** Isolated environments for testing and experimentation

**Use Cases:**
- Testing new features without affecting main codebase
- Experimenting with different approaches
- Prototyping UI components
- Performance testing

**Example:**
```bash
# Create playground for feature experimentation
claude playground create --name "subscription-upgrade-flow"

# Work on feature in isolation
claude playground exec "implement subscription upgrade logic"

# Merge when ready
claude playground merge "subscription-upgrade-flow"
```

### 4. Specialized Agents

**Purpose:** Domain-specific expertise and automated audits

**Available Agents:**
- **backend-architect** - Database schema, data integrity, migrations
- **payments-billing-auditor** - Stripe integration, billing logic, PCI compliance
- **privacy-data-guardian** - GDPR compliance, PII handling, data retention
- **security-auditor** - Security vulnerabilities, authentication, RLS policies
- **sre-reliability-guardian** - SLOs, monitoring, error handling, performance

**Example:**
```bash
# Run security audit on new feature
claude --agent security-auditor "audit the new team invitation feature"

# Check payment logic
claude --agent payments-billing-auditor "verify subscription upgrade flow"
```

---

## Workflow Patterns

### Pattern 1: Feature Development (Full Cycle)

**Scenario:** Adding a new feature to Platform 1 (League Builder)

**Steps:**

1. **Planning Phase** (Manual)
   ```bash
   claude "help me plan the league creation wizard feature"
   ```
   - Define requirements
   - Identify affected files
   - Choose architecture approach

2. **Implementation Phase** (Ralph Loop)
   ```bash
   claude --ralph --template .claude/templates/FEATURE_TEMPLATE.md \
     "implement league creation wizard with multi-step form"
   ```
   - Ralph Loop creates implementation plan
   - Executes each step autonomously
   - Runs tests after each change
   - Commits progress incrementally

3. **Audit Phase** (Specialized Agents)
   ```bash
   # Security audit
   claude --agent security-auditor "audit league creation wizard"

   # Privacy audit
   claude --agent privacy-data-guardian "verify league creation data collection"

   # Backend audit
   claude --agent backend-architect "review league creation database operations"
   ```

4. **Testing Phase** (Playground)
   ```bash
   # Test in isolated environment
   claude playground create --name "league-wizard-test"
   claude playground exec "test league creation with various org tiers"
   ```

5. **Documentation Phase** (Manual)
   ```bash
   claude "document the league creation wizard in PLATFORM_1_COMPLETE.md"
   ```

6. **Deployment Phase** (Ralph Loop)
   ```bash
   claude --ralph "create PR for league creation wizard feature"
   ```

### Pattern 2: Bug Fix (Quick Iteration)

**Scenario:** Fixing a bug in existing code

**Steps:**

1. **Diagnosis** (Interactive)
   ```bash
   claude "investigate why organization creation fails for users with special characters in names"
   ```

2. **Fix** (Interactive or Ralph)
   ```bash
   # For simple fixes
   claude "fix the organization slug generation to handle special characters"

   # For complex fixes
   claude --ralph "fix organization slug generation edge cases"
   ```

3. **Verification** (Manual)
   - Test the fix locally
   - Run tests: `pnpm test`

4. **Commit** (Interactive)
   ```bash
   claude "commit the slug generation fix"
   ```

### Pattern 3: Database Migration (High-Risk)

**Scenario:** Changing database schema

**Steps:**

1. **Architecture Review** (Backend Architect Agent)
   ```bash
   claude --agent backend-architect \
     "design migration to add team_memberships table with proper RLS"
   ```

2. **Implementation** (Ralph Loop with Audits)
   ```bash
   claude --ralph "implement team_memberships migration per architect plan"
   ```
   - Ralph Loop creates migration
   - Applies migration to dev branch
   - Generates TypeScript types
   - Updates RLS policies
   - Runs security audit
   - Updates affected queries

3. **Validation** (Manual)
   ```bash
   # Check migration in Supabase UI
   # Verify RLS policies work correctly
   # Test with different user roles
   ```

4. **Production Deploy** (Manual)
   ```bash
   # Merge development branch to main
   claude "merge dev branch to production"
   ```

### Pattern 4: Security Audit (Continuous)

**Scenario:** Regular security checks

**Steps:**

1. **Automated Audit** (Security Agent)
   ```bash
   claude --agent security-auditor "full security audit of Platform 1"
   ```
   - Reviews authentication flows
   - Checks RLS policies
   - Identifies SQL injection risks
   - Reviews API endpoints
   - Checks for XSS vulnerabilities

2. **Fix Issues** (Ralph Loop)
   ```bash
   claude --ralph "fix all security issues from audit report"
   ```

3. **Re-audit** (Security Agent)
   ```bash
   claude --agent security-auditor "verify security fixes"
   ```

---

## Ralph Loop Best Practices

### 1. Use Templates

Always provide a template for complex tasks:

```bash
claude --ralph --template .claude/templates/FEATURE_TEMPLATE.md \
  "implement subscription upgrade flow"
```

### 2. Break Down Large Tasks

Instead of:
```bash
claude --ralph "migrate all admin pages to Platform 1"
```

Do:
```bash
claude --ralph "migrate league management pages to Platform 1"
claude --ralph "migrate team management pages to Platform 1"
claude --ralph "migrate analytics pages to Platform 1"
```

### 3. Specify Success Criteria

Include clear success criteria in your task description:

```bash
claude --ralph "implement user invitation system
  Success criteria:
  - Email invitations sent via SendGrid
  - Invitation links expire after 7 days
  - Users can accept/decline invitations
  - All operations have RLS policies
  - Tests cover happy path and edge cases"
```

### 4. Enable Incremental Commits

Ralph Loop should commit after each significant step:

```bash
claude --ralph --incremental-commits \
  "refactor authentication to use next-auth v5"
```

### 5. Run Audits Automatically

Configure Ralph Loop to run specialized agents automatically:

```bash
claude --ralph --audit-agents "security,payments,privacy" \
  "implement Stripe subscription management"
```

---

## Agent Prompt Library

See `.claude/agent-prompts/` for reusable prompts for each specialized agent.

### Security Auditor Prompts

**Full Platform Audit:**
```
Perform comprehensive security audit of Platform 1 (League Builder):
1. Review all authentication flows (signup, login, logout, password reset)
2. Audit RLS policies on all tables (organizations, leagues, teams, etc)
3. Check API endpoints for authorization bypasses
4. Review server actions for injection vulnerabilities
5. Check for XSS risks in user-generated content
6. Verify CSRF protection on forms
7. Check for sensitive data in logs
8. Review third-party dependencies for known vulnerabilities

Provide detailed report with:
- Critical issues (requires immediate fix)
- High priority issues (fix within 1 week)
- Medium priority issues (fix within 1 month)
- Recommendations for security improvements
```

**Feature-Specific Audit:**
```
Audit the [FEATURE_NAME] feature for security vulnerabilities:
1. Authentication requirements
2. Authorization checks
3. Input validation
4. Output encoding
5. RLS policy coverage
6. SQL injection risks
7. XSS risks
8. CSRF protection

Verify:
- Users can only access their own data
- Admins cannot escalate to owner privileges
- Rate limiting is in place for sensitive operations
- Error messages don't leak sensitive info
```

### Backend Architect Prompts

**Database Schema Design:**
```
Design database schema for [FEATURE_NAME] with:
1. Table structure with all columns and types
2. Primary keys and foreign keys
3. Indexes for performance
4. RLS policies for multi-tenancy
5. Migration SQL
6. Rollback SQL
7. Data integrity constraints
8. Performance considerations

Requirements:
- Must support organization-scoped access
- Must handle concurrent modifications
- Must be backwards compatible
- Must support future scaling to 10k+ organizations
```

**Migration Review:**
```
Review this database migration for:
1. Data integrity risks
2. Performance impact
3. Backwards compatibility
4. Rollback safety
5. RLS policy gaps
6. Index requirements
7. Constraint violations

Provide recommendations before applying to production.
```

### Payments Billing Auditor Prompts

**Stripe Integration Audit:**
```
Audit Stripe integration for [FEATURE_NAME]:
1. Webhook signature verification
2. Idempotency handling
3. Error handling and retries
4. Payment state consistency
5. Refund handling
6. Proration calculations
7. Trial period logic
8. Subscription upgrade/downgrade flows

Verify:
- No duplicate charges possible
- Failed payments handled gracefully
- Subscription status always in sync
- Audit trail for all billing events
- PCI compliance (no card data stored)
```

### Privacy Data Guardian Prompts

**PII Audit:**
```
Audit [FEATURE_NAME] for privacy compliance:
1. Identify all PII collected
2. Verify legal basis for collection
3. Check data minimization
4. Review retention periods
5. Verify deletion workflows
6. Check third-party sharing
7. Review consent mechanisms
8. Audit logging of PII

Ensure GDPR compliance:
- Right to access
- Right to deletion
- Right to rectification
- Right to data portability
- Right to object
```

### SRE Reliability Guardian Prompts

**Reliability Review:**
```
Review [FEATURE_NAME] for production readiness:
1. Define SLOs (availability, latency, error rate)
2. Review error handling and fallbacks
3. Check timeout configurations
4. Verify retry logic with exponential backoff
5. Review monitoring and alerting setup
6. Check circuit breaker patterns
7. Verify graceful degradation
8. Review incident response procedures

Provide:
- Recommended SLOs
- Key metrics to monitor
- Alerting thresholds
- Runbook for common failures
```

---

## Templates

### Feature Template

See `.claude/templates/FEATURE_TEMPLATE.md` for the complete feature development checklist.

**Quick Reference:**

1. **Requirements Gathering**
   - [ ] Define user stories
   - [ ] Identify acceptance criteria
   - [ ] List technical requirements
   - [ ] Define success metrics

2. **Architecture Design**
   - [ ] Database schema changes
   - [ ] API endpoints
   - [ ] UI components
   - [ ] State management

3. **Implementation**
   - [ ] Database migration
   - [ ] Backend logic
   - [ ] Frontend UI
   - [ ] Tests

4. **Testing**
   - [ ] Unit tests
   - [ ] Integration tests
   - [ ] E2E tests
   - [ ] Manual testing

5. **Security & Privacy**
   - [ ] Security audit
   - [ ] Privacy audit
   - [ ] Penetration testing

6. **Documentation**
   - [ ] Code comments
   - [ ] API documentation
   - [ ] User documentation
   - [ ] Architecture docs

7. **Deployment**
   - [ ] Deploy to staging
   - [ ] QA verification
   - [ ] Deploy to production
   - [ ] Monitor for errors

---

## Continuous Quality Checks

### Daily Checks (Automated)

```bash
# Security audit
claude --agent security-auditor "quick security scan"

# Check Supabase advisors
claude "check supabase security and performance advisors"
```

### Weekly Checks (Automated)

```bash
# Full security audit
claude --agent security-auditor "comprehensive security audit"

# Payment audit
claude --agent payments-billing-auditor "audit all payment flows"

# Privacy audit
claude --agent privacy-data-guardian "audit data collection and retention"

# Reliability review
claude --agent sre-reliability-guardian "review system reliability"
```

### Before Each Deploy (Manual)

```bash
# Run all tests
pnpm test

# Type check
pnpm type-check

# Build check
pnpm build

# Security audit
claude --agent security-auditor "pre-deploy security check"

# Generate changelog
claude "generate changelog for this release"
```

---

## Integration with Existing Tools

### Supabase MCP Integration

Claude has direct access to Supabase via MCP server. Use this for:

- Executing SQL queries
- Applying migrations
- Checking RLS policies
- Viewing logs
- Checking advisors

**Example:**
```bash
claude "show me all RLS policies on the organizations table"
claude "apply migration to add team_memberships table"
claude "check supabase logs for authentication errors"
```

### GitHub Integration

Use `gh` CLI for:

- Creating pull requests
- Reviewing code
- Managing issues
- Running workflows

**Example:**
```bash
claude "create PR for league creation feature"
claude "review PR #123"
```

### Stripe Integration

Claude can log into Stripe for:

- Checking webhook events
- Reviewing customer subscriptions
- Analyzing payment failures

**Example:**
```bash
claude "check stripe for failed payments in the last 24 hours"
```

### Vercel Integration

Claude can access Vercel for:

- Deployment status
- Environment variables
- Logs

**Example:**
```bash
claude "check vercel deployment status for Platform 1"
```

---

## Common Workflows

### 1. Implement Phase 1C: Admin Operations Console

```bash
# Step 1: Architecture design
claude --agent backend-architect \
  "design admin operations console with user management, audit logs, and system health dashboard"

# Step 2: Implementation with Ralph Loop
claude --ralph --template .claude/templates/FEATURE_TEMPLATE.md \
  "implement admin operations console per architect design"

# Step 3: Security audit
claude --agent security-auditor \
  "audit admin operations console for privilege escalation and unauthorized access"

# Step 4: Privacy audit
claude --agent privacy-data-guardian \
  "audit admin operations console for PII exposure in logs and dashboards"

# Step 5: Testing in playground
claude playground create --name "admin-ops-test"
claude playground exec "test admin operations console with various user roles"

# Step 6: Documentation
claude "document admin operations console in PLATFORM_1_COMPLETE.md"

# Step 7: Deploy
claude --ralph "create PR for admin operations console"
```

### 2. Fix Production Bug

```bash
# Step 1: Investigation
claude "investigate production error: 'organization not found' for user ID abc123"

# Step 2: Quick fix
claude "fix the organization lookup to handle edge cases"

# Step 3: Verify
pnpm test

# Step 4: Deploy hotfix
claude "create hotfix PR for organization lookup bug"
```

### 3. Weekly Maintenance

```bash
# Security scan
claude --agent security-auditor "weekly security scan"

# Check for advisor notices
claude "check supabase security and performance advisors"

# Update dependencies
claude "check for dependency updates and security patches"

# Review error logs
claude "analyze supabase error logs from the past week"

# Generate weekly report
claude "generate weekly system health report"
```

---

## Tips & Best Practices

### 1. Start with Planning

Always start complex tasks with planning:

```bash
# Bad
claude --ralph "add subscription management"

# Good
claude "help me plan the subscription management feature"
# Review the plan, then:
claude --ralph --template .claude/templates/FEATURE_TEMPLATE.md \
  "implement subscription management per the plan we discussed"
```

### 2. Use Incremental Development

Build features incrementally:

```bash
# Phase 1: Database
claude --ralph "implement subscription database schema"

# Phase 2: API
claude --ralph "implement subscription API endpoints"

# Phase 3: UI
claude --ralph "implement subscription UI components"

# Phase 4: Integration
claude --ralph "integrate subscription UI with API"
```

### 3. Automate Testing

Let Ralph Loop run tests automatically:

```bash
claude --ralph --run-tests \
  "refactor authentication logic"
```

### 4. Document As You Go

Update documentation with each feature:

```bash
claude --ralph --update-docs \
  "add team invitation feature and update PLATFORM_1_COMPLETE.md"
```

### 5. Use Specialized Agents Proactively

Don't wait for issues - run audits regularly:

```bash
# After implementing any payment feature
claude --agent payments-billing-auditor "audit new payment feature"

# After changing database schema
claude --agent backend-architect "review migration"

# After collecting new user data
claude --agent privacy-data-guardian "audit new data collection"
```

---

## Troubleshooting

### Ralph Loop Stuck

If Ralph Loop gets stuck or produces errors:

1. **Check logs:**
   ```bash
   tail -f ~/.claude/logs/ralph-loop.log
   ```

2. **Resume with more context:**
   ```bash
   claude --ralph --resume --context "the previous attempt failed at step 3 due to RLS policy error"
   ```

3. **Break down the task:**
   ```bash
   # Instead of one large task, break it down
   claude --ralph "implement step 1: database migration"
   claude --ralph "implement step 2: API endpoints"
   ```

### Agent Not Available

If a specialized agent is not available:

1. **Use manual review:**
   ```bash
   claude "review this code for security vulnerabilities"
   ```

2. **Create checklist:**
   ```bash
   claude "create security audit checklist for this feature"
   ```

### Playground Issues

If playground environment has issues:

1. **Reset playground:**
   ```bash
   claude playground reset "playground-name"
   ```

2. **Recreate playground:**
   ```bash
   claude playground delete "playground-name"
   claude playground create --name "playground-name"
   ```

---

## Next Steps

1. **Read the Feature Template:** `.claude/templates/FEATURE_TEMPLATE.md`
2. **Review Agent Prompts:** `.claude/agent-prompts/`
3. **Practice with Small Task:** Try using Ralph Loop for a simple feature
4. **Integrate into Daily Workflow:** Use specialized agents for audits
5. **Customize for Your Needs:** Add project-specific workflows and templates

---

## Resources

- **Claude Code Documentation:** https://docs.anthropic.com/claude-code
- **Ralph Loop Guide:** https://docs.anthropic.com/claude-code/ralph-loop
- **Playgrounds Guide:** https://docs.anthropic.com/claude-code/playgrounds
- **Agent SDK:** https://docs.anthropic.com/agent-sdk

---

**Questions?** Ask Claude:
```bash
claude "explain how to use Ralph Loop for database migrations"
```
