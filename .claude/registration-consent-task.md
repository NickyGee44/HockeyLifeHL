# Task: Registration Consent — TOS Checkbox + Email Marketing Opt-In

## Context
Next.js 14+ monorepo. The player registration flow on league-sites has a waiver step and confirmation step, but is missing explicit TOS agreement checkbox and email marketing opt-in. This is a CASL (Canadian Anti-Spam Law) compliance requirement.

## Key Files to Read First
- `apps/league-sites/src/components/registration/StepConfirmation.tsx` — confirmation step (needs TOS checkbox + email opt-in)
- `apps/league-sites/src/components/registration/StepWaiver.tsx` — existing waiver pattern to follow
- `apps/league-builder/src/lib/actions/player-registration.ts` — backend action that stores consents (around line 820)
- `packages/database/src/types.ts` — search for `user_consents` to see schema
- `apps/league-sites/src/components/registration/` — all registration step components for data flow pattern

## What to Build

### 1. Update StepConfirmation.tsx

Replace the passive "By submitting..." text block with explicit checkboxes:

**Required checkbox (TOS):**
```
☐ I have read and agree to the Terms of Service and Privacy Policy (links open in new tab)
```
- Must be checked before submit button is enabled
- Links to `/terms` and `/privacy` (new pages, see below)
- Bold the links, open in new tab

**Optional checkbox (Email Marketing):**
```
☐ I'd like to receive league updates, news, and promotions via email
```
- MUST be unchecked by default (CASL requires explicit opt-in)
- Clearly separate from the required TOS checkbox
- Smaller/lighter text to visually distinguish from required consent

Both checkboxes should update the registration form data so the values flow to the server action.

### 2. Update Registration Form Data Type

Find the registration form data type/interface (likely in the registration components or a shared types file). Add:
- `tos_accepted: boolean` (default false)
- `email_marketing_opt_in: boolean` (default false)

### 3. Update player-registration.ts Server Action

Find the consents array (around line 820-830) and add:

```typescript
const consents = [
  { user_id: user.id, consent_type: 'registration_terms_v1', granted: true },
  { user_id: user.id, consent_type: 'registration_privacy_v1', granted: true },
  { user_id: user.id, consent_type: 'registration_data_processing_v1', granted: true },
  // ADD THESE:
  { user_id: user.id, consent_type: 'terms_of_service_v1', granted: formData.tos_accepted },
  { user_id: user.id, consent_type: 'email_marketing_v1', granted: formData.email_marketing_opt_in || false },
];
```

Also add validation: reject registration if `tos_accepted` is not true.

### 4. Create TOS and Privacy Policy Pages (league-sites)

Create two new pages:

**`apps/league-sites/src/app/[leagueSlug]/terms/page.tsx`**
- Clean, readable layout
- Title: "Terms of Service"
- Content: placeholder text for now with sections for:
  - Acceptance of Terms
  - User Accounts & Registration
  - League Participation
  - Payments & Refunds
  - Code of Conduct
  - Liability & Waivers
  - Data Collection & Use
  - Termination
  - Changes to Terms
  - Contact Information
- Each section should have a heading and placeholder paragraph
- Footer note: "Last updated: February 2026"

**`apps/league-sites/src/app/[leagueSlug]/privacy/page.tsx`**
- Clean, readable layout
- Title: "Privacy Policy"
- Content: placeholder text with sections for:
  - Information We Collect
  - How We Use Your Information
  - Email Communications (reference CASL compliance)
  - Data Sharing
  - Data Retention
  - Your Rights (access, deletion, opt-out)
  - Cookies & Analytics
  - Children's Privacy
  - Changes to This Policy
  - Contact Information
- Footer note: "Last updated: February 2026"

Both pages should use the league site's theme/layout and be accessible without login.

### 5. i18n

Add translations to both `apps/league-builder/src/messages/en.json` and `fr.json`:
- TOS checkbox label
- Email marketing checkbox label
- Terms of Service page title and section headers
- Privacy Policy page title and section headers

Also check if league-sites has its own i18n setup — if so, add translations there too.

### 6. Disable Submit Until TOS Accepted

In the registration flow's submit button logic, ensure the submit/register button is disabled until `tos_accepted` is true. The email marketing checkbox should NOT block submission.

## IMPORTANT NOTES
- Email marketing checkbox MUST default to unchecked (CASL compliance — explicit opt-in only)
- TOS checkbox is REQUIRED, email marketing is OPTIONAL
- Don't break the existing waiver flow — this is additive
- Follow existing component styling patterns (Tailwind, CSS variables)
- Use `as any` on Supabase `.from()` calls if needed
- No database migration needed — `user_consents` table already exists with flexible `consent_type` text field

## When Done
Run: `openclaw system event --text "Registration consent flow complete — TOS checkbox, email marketing opt-in, terms/privacy pages" --mode now`
