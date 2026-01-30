# Feature Development Template

**Feature Name:** [Name of feature]
**Target Platform:** [ ] Platform 1 (League Builder) [ ] Platform 2 (League Website) [ ] Both
**Priority:** [ ] Critical [ ] High [ ] Medium [ ] Low
**Estimated Complexity:** [ ] Small (< 1 day) [ ] Medium (1-3 days) [ ] Large (3-5 days) [ ] XL (> 5 days)
**Developer:** [Name]
**Date Started:** [YYYY-MM-DD]
**Target Completion:** [YYYY-MM-DD]

---

## 1. Requirements

### 1.1 User Stories

**As a [user type], I want to [action] so that [benefit].**

- [ ] User story 1
- [ ] User story 2
- [ ] User story 3

### 1.2 Acceptance Criteria

**What defines "done" for this feature?**

- [ ] Criteria 1
- [ ] Criteria 2
- [ ] Criteria 3

### 1.3 Technical Requirements

- [ ] Requirement 1
- [ ] Requirement 2
- [ ] Requirement 3

### 1.4 Success Metrics

**How will we measure success?**

- [ ] Metric 1 (e.g., 90% of users complete flow)
- [ ] Metric 2 (e.g., < 2s page load time)
- [ ] Metric 3 (e.g., 0 critical security vulnerabilities)

---

## 2. Architecture Design

### 2.1 Database Changes

**Tables to create/modify:**

- [ ] Table: `table_name`
  - [ ] Columns: list columns and types
  - [ ] Indexes: list indexes
  - [ ] RLS policies: list policies
  - [ ] Foreign keys: list relationships

**Migration file:** `supabase/migrations/YYYYMMDDHHMMSS_description.sql`

### 2.2 API Endpoints

**Endpoints to create/modify:**

- [ ] `POST /api/endpoint`
  - Purpose: What it does
  - Request body: Schema
  - Response: Schema
  - Authorization: Who can access
  - Rate limit: Limit if applicable

### 2.3 UI Components

**Components to create/modify:**

- [ ] Component: `ComponentName`
  - Location: `apps/[app]/src/components/[path]`
  - Purpose: What it does
  - Props: List props
  - State: Local state or shared

### 2.4 State Management

**State to add/modify:**

- [ ] State: `stateName`
  - Type: Context / Redux / Local
  - Purpose: What it manages
  - Location: Where it lives

### 2.5 Third-Party Integrations

**External services to integrate:**

- [ ] Service: [Service name]
  - Purpose: Why we need it
  - API keys: Where stored
  - Rate limits: Limits if applicable
  - Error handling: How failures handled

---

## 3. Implementation Checklist

### 3.1 Database

- [ ] Write migration SQL
- [ ] Add RLS policies
- [ ] Add indexes for performance
- [ ] Test migration on dev branch
- [ ] Generate TypeScript types (`pnpm db:generate-types`)
- [ ] Update `@hockey-life/database` package

### 3.2 Backend

- [ ] Create/update API routes
- [ ] Add server actions if needed
- [ ] Add input validation (Zod schemas)
- [ ] Add error handling
- [ ] Add logging
- [ ] Add rate limiting if needed
- [ ] Test API endpoints manually
- [ ] Write API integration tests

### 3.3 Frontend

- [ ] Create UI components
- [ ] Add form validation
- [ ] Add loading states
- [ ] Add error states
- [ ] Add success feedback
- [ ] Add responsive design
- [ ] Add accessibility (ARIA labels, keyboard nav)
- [ ] Test UI manually in browser
- [ ] Write component tests

### 3.4 Integration

- [ ] Connect frontend to backend
- [ ] Test end-to-end flow
- [ ] Add optimistic updates if applicable
- [ ] Add caching if applicable
- [ ] Test error scenarios
- [ ] Test edge cases

---

## 4. Testing

### 4.1 Unit Tests

- [ ] Backend unit tests
  - [ ] Test validation logic
  - [ ] Test business logic
  - [ ] Test error handling

- [ ] Frontend unit tests
  - [ ] Test component rendering
  - [ ] Test user interactions
  - [ ] Test error states

### 4.2 Integration Tests

- [ ] API integration tests
  - [ ] Test happy path
  - [ ] Test error cases
  - [ ] Test edge cases

- [ ] Database integration tests
  - [ ] Test RLS policies
  - [ ] Test data integrity
  - [ ] Test concurrent access

### 4.3 End-to-End Tests

- [ ] User flow 1
- [ ] User flow 2
- [ ] Error recovery flow

### 4.4 Manual Testing

**Test scenarios:**

- [ ] Scenario 1: [Description]
  - Steps: [List steps]
  - Expected result: [What should happen]

- [ ] Scenario 2: [Description]
  - Steps: [List steps]
  - Expected result: [What should happen]

**Test with different user roles:**

- [ ] Test as owner
- [ ] Test as admin
- [ ] Test as editor
- [ ] Test as viewer
- [ ] Test as unauthenticated user

**Test edge cases:**

- [ ] Empty state (no data)
- [ ] Large dataset (1000+ items)
- [ ] Special characters in input
- [ ] Concurrent modifications
- [ ] Network errors
- [ ] Slow network (throttle in DevTools)

---

## 5. Security & Privacy Audits

### 5.1 Security Audit

**Run security audit:**
```bash
claude --agent security-auditor "audit [feature name] feature"
```

**Security checklist:**

- [ ] Authentication required where needed
- [ ] Authorization checks in place
- [ ] Input validation on all user input
- [ ] Output encoding to prevent XSS
- [ ] SQL injection prevention (use parameterized queries)
- [ ] CSRF protection on forms
- [ ] RLS policies cover all access patterns
- [ ] Rate limiting on sensitive operations
- [ ] Error messages don't leak sensitive info
- [ ] Sensitive data not logged

**Security issues found:**

| Issue | Severity | Status | Fix |
|-------|----------|--------|-----|
|       |          |        |     |

### 5.2 Privacy Audit

**Run privacy audit:**
```bash
claude --agent privacy-data-guardian "audit [feature name] feature"
```

**Privacy checklist:**

- [ ] Only collect necessary PII
- [ ] Clear legal basis for collection
- [ ] User consent obtained if required
- [ ] Retention period defined
- [ ] Deletion workflow exists
- [ ] Third-party sharing disclosed
- [ ] Data encryption in transit (HTTPS)
- [ ] Data encryption at rest if sensitive
- [ ] Audit logging for data access
- [ ] GDPR rights supported (access, deletion, rectification)

**PII collected:**

| Data Field | Purpose | Legal Basis | Retention | Deletion |
|------------|---------|-------------|-----------|----------|
|            |         |             |           |          |

### 5.3 Payments Audit (if applicable)

**Run payments audit:**
```bash
claude --agent payments-billing-auditor "audit [feature name] feature"
```

**Payments checklist:**

- [ ] Webhook signature verification
- [ ] Idempotency keys used
- [ ] Error handling and retries
- [ ] Payment state consistency
- [ ] Refund handling
- [ ] Proration calculations correct
- [ ] No duplicate charges possible
- [ ] Audit trail for all transactions
- [ ] PCI compliance (no card data stored)
- [ ] Stripe test mode in development

### 5.4 Backend Architecture Review (if database changes)

**Run backend audit:**
```bash
claude --agent backend-architect "review [feature name] migration"
```

**Backend checklist:**

- [ ] Database schema is normalized
- [ ] Indexes added for performance
- [ ] Foreign keys enforce referential integrity
- [ ] RLS policies enforce multi-tenancy
- [ ] Migration is backwards compatible
- [ ] Rollback SQL provided
- [ ] Handles concurrent modifications
- [ ] Scales to 10k+ organizations

---

## 6. Performance

### 6.1 Performance Requirements

**Define performance targets:**

- [ ] Page load time: < X seconds
- [ ] API response time: < Y ms
- [ ] Database query time: < Z ms
- [ ] Time to interactive: < X seconds

### 6.2 Performance Testing

- [ ] Test with large dataset
- [ ] Test with slow network
- [ ] Test with concurrent users
- [ ] Measure actual performance
- [ ] Optimize slow queries
- [ ] Add caching if needed
- [ ] Add pagination if needed

### 6.3 Performance Optimizations

**Optimizations applied:**

- [ ] Optimization 1: [Description]
- [ ] Optimization 2: [Description]

---

## 7. Accessibility

### 7.1 Accessibility Checklist

- [ ] Keyboard navigation works
- [ ] Focus indicators visible
- [ ] ARIA labels on interactive elements
- [ ] Alt text on images
- [ ] Color contrast meets WCAG AA
- [ ] Screen reader tested
- [ ] Forms have proper labels
- [ ] Error messages are descriptive
- [ ] No flash/animation that could trigger seizures

---

## 8. Documentation

### 8.1 Code Documentation

- [ ] Add JSDoc comments to functions
- [ ] Add comments for complex logic
- [ ] Update component documentation
- [ ] Document API endpoints

### 8.2 User Documentation

- [ ] Add feature to user guide
- [ ] Create tutorial/walkthrough
- [ ] Add tooltips in UI
- [ ] Create FAQ entries

### 8.3 Developer Documentation

- [ ] Update ARCHITECTURE.md
- [ ] Update API_PATTERNS.md
- [ ] Update PLATFORM_1_COMPLETE.md or PLATFORM_2_COMPLETE.md
- [ ] Update README.md if needed

### 8.4 Architecture Documentation

**Update these files:**

- [ ] ARCHITECTURE.md - Overall system design
- [ ] MULTI_TENANCY.md - Multi-tenancy patterns
- [ ] API_PATTERNS.md - API design patterns
- [ ] TESTING_STRATEGY.md - Testing approach

---

## 9. Reliability (SRE)

### 9.1 SLO Definition

**Run reliability review:**
```bash
claude --agent sre-reliability-guardian "define SLOs for [feature name]"
```

**Service Level Objectives:**

- [ ] Availability: X% uptime
- [ ] Latency: Y% of requests < Z ms
- [ ] Error rate: < X% errors

### 9.2 Error Handling

- [ ] All errors caught and logged
- [ ] User-friendly error messages
- [ ] Retry logic with exponential backoff
- [ ] Circuit breaker for external services
- [ ] Graceful degradation if service unavailable
- [ ] Timeouts configured

### 9.3 Monitoring

- [ ] Add metrics for key operations
- [ ] Add alerting for failures
- [ ] Add logging for debugging
- [ ] Add tracing for performance
- [ ] Dashboard created for monitoring

### 9.4 Incident Response

**Runbook for common failures:**

| Failure | Symptoms | Diagnosis | Fix |
|---------|----------|-----------|-----|
|         |          |           |     |

---

## 10. Deployment

### 10.1 Pre-Deployment Checklist

- [ ] All tests passing
- [ ] Security audit complete
- [ ] Privacy audit complete
- [ ] Performance tested
- [ ] Documentation updated
- [ ] Code reviewed
- [ ] QA tested
- [ ] Stakeholder approval

### 10.2 Deployment Steps

**Staging:**

- [ ] Deploy to staging environment
- [ ] Run smoke tests
- [ ] Manual QA verification
- [ ] Performance testing

**Production:**

- [ ] Create deployment PR
- [ ] Get PR approval
- [ ] Deploy to production
- [ ] Run smoke tests
- [ ] Monitor error rates
- [ ] Monitor performance metrics
- [ ] Verify feature works

### 10.3 Rollback Plan

**If deployment fails:**

1. [ ] Revert deployment
2. [ ] Roll back database migration if needed
3. [ ] Notify stakeholders
4. [ ] Investigate root cause
5. [ ] Fix issues
6. [ ] Re-deploy

### 10.4 Post-Deployment

- [ ] Monitor for 24 hours
- [ ] Check error logs
- [ ] Verify metrics match expectations
- [ ] Gather user feedback
- [ ] Address any issues

---

## 11. Known Issues & Technical Debt

### 11.1 Known Limitations

**Document any limitations:**

- Limitation 1: [Description]
  - Impact: [Who is affected]
  - Workaround: [How to work around it]
  - Future fix: [Plan to fix]

### 11.2 Technical Debt

**Document any shortcuts taken:**

- Debt 1: [Description]
  - Reason: [Why we took the shortcut]
  - Impact: [Consequences]
  - Plan to pay down: [Future plan]

---

## 12. Future Enhancements

### 12.1 Nice-to-Have Features

**Features we didn't implement but would be good to add:**

- [ ] Enhancement 1: [Description]
  - Priority: [High/Medium/Low]
  - Complexity: [Small/Medium/Large]

---

## 13. Sign-Off

### 13.1 Approvals

- [ ] Developer: [Name] - [Date]
- [ ] Code Review: [Name] - [Date]
- [ ] QA: [Name] - [Date]
- [ ] Security: [Name] - [Date]
- [ ] Product Owner: [Name] - [Date]

### 13.2 Deployment Sign-Off

- [ ] Ready for staging: [Date]
- [ ] Staging verified: [Date]
- [ ] Ready for production: [Date]
- [ ] Production deployed: [Date]
- [ ] Production verified: [Date]

---

## 14. Retrospective

**After deployment, reflect on what went well and what could be improved:**

### 14.1 What Went Well

-

### 14.2 What Could Be Improved

-

### 14.3 Lessons Learned

-

### 14.4 Action Items

- [ ] Action 1: [Description]
- [ ] Action 2: [Description]

---

## Notes

**Add any additional notes or context:**

-

---

**Template Version:** 1.0
**Last Updated:** 2026-01-30
