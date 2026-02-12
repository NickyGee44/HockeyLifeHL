# League Setup Wizard Context

> **Use when:** working on the league creation wizard, modifying wizard steps, or debugging wizard flow
> **Don't use when:** working on league-sites public pages (use `/sites`) or general feature work
> **Outputs:** context for wizard development — no automated checks

---

Location: `apps/league-builder/src/components/league-wizard/`

## Steps
1. League Info - name, location, branding (colors, logo)
2. Season Settings - dates, registration type, game settings
3. Teams - optional team creation
4. Registration Fees - enable/disable paid registration, early bird, late fees
5. Payment Setup - Stripe Connect integration (if fees enabled)
6. Website & Branding - visibility, theme, social links
7. Review & Launch - summary, warnings, create button

## Key Files
- `wizard-container.tsx` - Main container, state management, 7-step navigation
- `steps/step-{1-7}-*.tsx` - Individual step components
- `wizard-success.tsx` - Post-creation success screen with next steps
- `lib/schemas/league-wizard.ts` - Zod validation schemas
- `lib/actions/league-wizard.ts` - Server actions (saveDraft, createLeague)

## Patterns
- Each step is a separate component receiving shared state from wizard-container
- Validation schemas in league-wizard.ts are per-step (step1Schema, step2Schema, etc.)
- Server actions handle draft saving (auto-save) and final league creation
- Payment Setup step (5) is conditionally shown only when registration fees are enabled in step 4
