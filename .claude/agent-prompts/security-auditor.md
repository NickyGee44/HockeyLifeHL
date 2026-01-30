# Security Auditor Agent Prompts

**Agent:** security-auditor
**Purpose:** Comprehensive security reviews of code, architecture, and infrastructure

---

## Full Platform Security Audit

```
Perform comprehensive security audit of Platform 1 (League Builder):

1. Authentication & Authorization
   - Review signup/login/logout flows
   - Check password reset functionality
   - Verify session management
   - Check for authentication bypasses

2. Row Level Security (RLS)
   - Audit RLS policies on all tables:
     - organizations
     - leagues
     - teams
     - profiles
     - league_memberships
     - league_ownerships
   - Verify policies enforce proper isolation
   - Check for policy gaps

3. API Security
   - Review all API endpoints in apps/league-builder/src/app/api/
   - Check authorization on each endpoint
   - Verify input validation
   - Check rate limiting

4. Server Actions
   - Review all server actions in apps/league-builder/src/lib/actions/
   - Check authorization logic
   - Verify input sanitization
   - Check for SQL injection risks

5. XSS Protection
   - Review user-generated content rendering
   - Check for unsafe innerHTML usage
   - Verify output encoding
   - Check for DOM XSS

6. CSRF Protection
   - Verify CSRF tokens on forms
   - Check server-side validation

7. Data Leakage
   - Check for sensitive data in logs
   - Review error messages for info disclosure
   - Check for sensitive data in URLs
   - Verify API responses don't leak data

8. Dependencies
   - Check for known vulnerabilities in dependencies
   - Review third-party integrations

Provide detailed report with:
- Critical issues (immediate fix required)
- High priority (fix within 1 week)
- Medium priority (fix within 1 month)
- Recommendations for improvements

For each issue, include:
- File location
- Vulnerable code snippet
- Explanation of vulnerability
- Recommended fix
- Example exploit scenario
```

---

## Feature-Specific Security Audit

```
Audit the [FEATURE_NAME] feature for security vulnerabilities.

Context:
- Feature location: [path to feature files]
- User roles involved: [list roles]
- Data accessed: [list data types]

Review:

1. Authentication Requirements
   - Who can access this feature?
   - Is authentication properly enforced?
   - Are there any bypass opportunities?

2. Authorization Checks
   - What authorization checks are in place?
   - Can users access data they shouldn't?
   - Can users perform actions they shouldn't?
   - Are role checks implemented correctly?

3. Input Validation
   - What user inputs are accepted?
   - Is input validated server-side?
   - Are there injection risks (SQL, NoSQL, Command)?
   - Are file uploads validated?

4. Output Encoding
   - Is user-generated content properly encoded?
   - Are there XSS risks?
   - Is data sanitized before rendering?

5. RLS Policy Coverage
   - What database tables are accessed?
   - Do RLS policies cover all access patterns?
   - Can users query data outside their organization?
   - Are there policy gaps?

6. SQL Injection Risks
   - Are parameterized queries used?
   - Is user input concatenated into SQL?
   - Are stored procedures used safely?

7. XSS Risks
   - Where is user input displayed?
   - Is innerHTML used safely?
   - Are event handlers sanitized?

8. CSRF Protection
   - Are state-changing operations protected?
   - Are CSRF tokens validated?

Verify:
- Users can only access their own organization's data
- Admins cannot escalate to owner privileges
- Rate limiting is in place for sensitive operations
- Error messages don't leak sensitive information
- Logs don't contain sensitive data

Provide:
- List of vulnerabilities found
- Severity rating for each (Critical/High/Medium/Low)
- Recommended fixes
- Example attack scenarios
- Code snippets with fixes
```

---

## Pre-Deployment Security Check

```
Perform pre-deployment security check for release [VERSION].

Quick security scan focusing on:

1. Critical Security Controls
   - Authentication working correctly?
   - Authorization checks in place?
   - RLS policies active?
   - HTTPS enforced?

2. Recent Changes
   - Review git diff since last release
   - Identify security-sensitive changes
   - Check for new vulnerabilities introduced

3. Configuration
   - Environment variables properly set?
   - API keys not exposed?
   - Debug mode disabled?
   - Error reporting configured?

4. Dependencies
   - Any new dependencies added?
   - Known vulnerabilities in dependencies?
   - Dependencies up to date?

5. Secrets Management
   - No secrets in code?
   - No secrets in logs?
   - Service role keys properly secured?

Provide GO/NO-GO recommendation with:
- Blockers (must fix before deploy)
- Warnings (should fix soon)
- Notes (monitor after deploy)
```

---

## Authentication Flow Audit

```
Audit authentication flows for security vulnerabilities.

Review:

1. Signup Flow (apps/league-builder/src/app/(auth)/signup)
   - Password requirements enforced?
   - Email validation working?
   - Rate limiting on signup?
   - Brute force protection?
   - Account enumeration prevention?
   - Email confirmation required?

2. Login Flow (apps/league-builder/src/app/(auth)/login)
   - Credentials validated securely?
   - Failed login attempts limited?
   - Account lockout mechanism?
   - Session creation secure?
   - Timing attack prevention?

3. Logout Flow
   - Session properly destroyed?
   - Tokens invalidated?
   - Redirect to safe page?

4. Password Reset Flow (if implemented)
   - Reset tokens secure (random, single-use)?
   - Token expiration enforced?
   - Rate limiting on reset requests?
   - Old password invalidated?
   - Email validation before reset?

5. Session Management
   - Session timeout configured?
   - Secure cookie flags set (HttpOnly, Secure, SameSite)?
   - Session fixation prevention?
   - Concurrent session handling?

6. Token Security
   - JWT tokens secure (if used)?
   - Token signing key secure?
   - Token expiration enforced?
   - Refresh token rotation?

Provide:
- Vulnerabilities found
- Risk assessment
- Recommended fixes
- Implementation examples
```

---

## Database Security Audit

```
Audit database security for Hockey Life platform.

Review:

1. RLS Policies
   - List all tables and their RLS policies
   - Verify policies enforce organization isolation
   - Check for policy gaps
   - Test policies with various user roles

2. Data Access Patterns
   - Identify all queries accessing sensitive data
   - Verify queries respect organization boundaries
   - Check for N+1 query vulnerabilities
   - Review query performance under load

3. Data Encryption
   - Sensitive data encrypted at rest?
   - TLS enforced for connections?
   - Encryption keys properly managed?

4. Backup Security
   - Backups encrypted?
   - Backup access controlled?
   - Retention policy defined?

5. Audit Logging
   - Data access logged?
   - Changes tracked?
   - Logs tamper-proof?

6. Service Role Usage
   - Service role key properly secured?
   - Service role only used when necessary?
   - Service role operations audited?

Tables to audit:
- organizations
- leagues
- teams
- profiles
- league_memberships
- league_ownerships
- [add any other tables]

Provide:
- RLS policy gaps found
- Data exposure risks
- Recommended policy changes
- SQL for policy updates
```

---

## API Endpoint Security Review

```
Review API endpoint security: [ENDPOINT_PATH]

Analyze:

1. Endpoint Details
   - Method: [GET/POST/PUT/DELETE]
   - Path: [/api/path]
   - Purpose: [What it does]

2. Authentication
   - Authentication required?
   - How is user identified?
   - Session validated?
   - Token verified?

3. Authorization
   - Who can access this endpoint?
   - Are permissions checked?
   - Can users access other orgs' data?
   - Are role checks correct?

4. Input Validation
   - What inputs are accepted?
   - Input validation schema?
   - Input sanitization?
   - File upload validation (if applicable)?

5. Rate Limiting
   - Is rate limiting applied?
   - Per user or per IP?
   - Limits appropriate?

6. Error Handling
   - Error messages safe?
   - Stack traces hidden in production?
   - Proper HTTP status codes?

7. Response Security
   - Response contains only necessary data?
   - Sensitive data filtered out?
   - Proper content type headers?

8. CORS Configuration
   - CORS properly configured?
   - Origins restricted?

Test scenarios:
- Unauthenticated access attempt
- Authenticated user accessing other org's data
- Invalid input (SQL injection, XSS, etc.)
- Rate limit bypass attempts

Provide:
- Vulnerabilities found
- Risk level (Critical/High/Medium/Low)
- Proof of concept exploit
- Recommended fix with code
```

---

## Third-Party Integration Security

```
Audit third-party integration: [SERVICE_NAME]

Review:

1. Integration Details
   - Service: [Name]
   - Purpose: [Why we use it]
   - Data shared: [What data is sent]
   - API used: [Which APIs]

2. Authentication
   - API keys stored securely?
   - Keys rotated regularly?
   - Access scoped appropriately?

3. Data Protection
   - Data encrypted in transit?
   - Minimum data shared?
   - PII handled properly?
   - Data retention policy?

4. Error Handling
   - API failures handled gracefully?
   - Retry logic with backoff?
   - Timeout configured?
   - Errors logged securely?

5. Webhook Security (if applicable)
   - Webhook signatures verified?
   - Replay attack prevention?
   - Rate limiting on webhooks?
   - Idempotency ensured?

6. Vendor Security
   - Vendor security posture reviewed?
   - SOC 2 / ISO certified?
   - Data processing agreement in place?
   - Incident response plan?

Services to audit:
- Supabase (database)
- Stripe (payments)
- Vercel (hosting)
- SendGrid (emails, if used)
- [add others]

Provide:
- Security risks identified
- Recommended mitigations
- Configuration changes needed
- Monitoring requirements
```

---

## Security Regression Test

```
Run security regression tests to ensure previous fixes remain in place.

Check:

1. Previous Vulnerabilities
   - List all previously fixed security issues
   - Verify each fix is still in place
   - Check for regressions

2. Security Controls
   - Authentication still working?
   - Authorization checks still in place?
   - RLS policies still active?
   - Input validation still working?

3. Common Vulnerability Patterns
   - SQL injection tests
   - XSS tests
   - CSRF tests
   - Auth bypass tests
   - Privilege escalation tests

4. Automated Scans
   - Run dependency vulnerability scan
   - Check for exposed secrets
   - Verify security headers

Provide:
- List of tests performed
- Results (pass/fail)
- Any regressions found
- Recommended actions
```

---

## Penetration Test

```
Perform penetration testing on [FEATURE/PLATFORM].

Attempt to:

1. Authentication Bypass
   - Can you access protected pages without login?
   - Can you bypass MFA (if implemented)?
   - Can you hijack sessions?

2. Authorization Bypass
   - Can you access other users' data?
   - Can you escalate privileges?
   - Can you perform unauthorized actions?

3. Data Exfiltration
   - Can you access data outside your organization?
   - Can you enumerate users?
   - Can you extract sensitive data?

4. Injection Attacks
   - SQL injection attempts
   - NoSQL injection attempts
   - Command injection attempts
   - LDAP injection (if applicable)

5. XSS Attacks
   - Stored XSS attempts
   - Reflected XSS attempts
   - DOM-based XSS attempts

6. CSRF Attacks
   - Can you perform actions without CSRF token?
   - Can you reuse CSRF tokens?

7. Business Logic Flaws
   - Can you create negative balances?
   - Can you bypass payment?
   - Can you access trial after expiration?

Provide detailed report:
- Attack vectors tried
- Successful exploits (with proof)
- Failed attempts (showing defenses work)
- Recommendations
- Remediation priority
```

---

## Security Checklist for Code Review

```
Review this code for security issues: [FILE_PATH]

Check:

- [ ] User input is validated
- [ ] User input is sanitized before database queries
- [ ] User input is encoded before rendering
- [ ] Authentication is checked
- [ ] Authorization is enforced
- [ ] RLS policies protect data access
- [ ] No secrets in code
- [ ] No SQL concatenation (use parameterized queries)
- [ ] No eval() or similar dangerous functions
- [ ] File uploads are validated
- [ ] Rate limiting on sensitive operations
- [ ] Error messages don't leak sensitive info
- [ ] Logs don't contain sensitive data
- [ ] HTTPS enforced for sensitive operations
- [ ] CSRF protection on state-changing operations
- [ ] Security headers set
- [ ] Dependencies up to date
- [ ] No known vulnerable dependencies

Report any issues found with:
- Line number
- Issue description
- Severity
- Recommended fix
```

---

## Usage Examples

### Run Full Platform Audit
```bash
claude --agent security-auditor --prompt-file .claude/agent-prompts/security-auditor.md \
  "Use the 'Full Platform Security Audit' prompt"
```

### Audit Specific Feature
```bash
claude --agent security-auditor \
  "Use the 'Feature-Specific Security Audit' prompt for the team invitation feature"
```

### Pre-Deployment Check
```bash
claude --agent security-auditor \
  "Use the 'Pre-Deployment Security Check' prompt for version 1.2.0"
```

### Pen Test
```bash
claude --agent security-auditor \
  "Use the 'Penetration Test' prompt on Platform 1"
```

---

**Last Updated:** 2026-01-30
