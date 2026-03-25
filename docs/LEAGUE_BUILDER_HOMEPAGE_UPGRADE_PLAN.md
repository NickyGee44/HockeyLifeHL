# League Builder Homepage Upgrade Plan

## Goal

Turn the public League Builder homepage into a product-led marketing page that:

- explains the full platform in one pass
- shows real product depth instead of generic feature cards
- aligns pricing, proof, and brand direction
- gives commissioners a clear path to sign up or request a demo

## Current State Summary

The current homepage is a lightweight stack of hero, trust, feature, pricing, CTA, and footer sections in `apps/league-builder/src/app/[locale]/page.tsx`.

Key issues:

- The page is entirely client-rendered and wraps directly imported sections in `Suspense`, which adds complexity without much loading benefit.
- The hero depends on an autoplay video and logo-first composition in `apps/league-builder/src/components/home/HeroSection.tsx`, but does not show enough of the product itself.
- The trust section uses placeholder league names, generic metrics, a placeholder testimonial, and currently has a text encoding bug in the citation line in `apps/league-builder/src/components/home/TrustIndicators.tsx`.
- The footer links to `/help`, `/contact`, and `/blog`, but those pages do not exist yet.
- The homepage pricing story is still a simple `$0/mo + 3.5%` pitch, while the product already contains a tiered pricing component and calculator in `apps/league-builder/src/components/subscription/subscription-plans.tsx`.
- Branding is inconsistent across the repo. The homepage and global theme use the current cyan/blue "night rink" system, while `docs/BRAND-KIT.md` still documents a premium black-and-gold direction. Naming also varies between "Beer League Hockey" and "HockeyLifeHL".

## Positioning Recommendation

Primary audience:

- hockey league commissioners
- league admins
- organization owners running one or more leagues

Secondary audience:

- captains and players evaluating whether the platform feels modern and trustworthy

Core message:

"One platform for league operations, public league websites, game-day scoring, and player experience."

Guardrails:

- Market shipped and clearly available features first.
- Anything still in progress or not fully verified in production should be marked as beta or removed from the homepage.
- Do not put OCR scanning, a native player app, or AI-heavy promises above the fold until product status is confirmed.

## Homepage Structure

### 1. Hero with product proof

Purpose:

- explain what the platform does in one sentence
- show the product immediately
- move users into signup or demo

Recommended content:

- a sharper headline focused on outcomes, not just vibe
- two CTAs: `Start your league` and `Book a demo` or `See a live league`
- a product collage using real assets:
  - `marketing/promo-dashboard.jpg`
  - `marketing/promo-scoresheet.jpg`
  - `marketing/promo-team.jpg`
  - real league-site screenshots or template previews
- proof chips under the hero:
  - league websites
  - registrations and payments
  - schedules and scorekeeping
  - stats and player profiles
  - bilingual support
  - custom domains

### 2. Social proof that is actually credible

Purpose:

- replace placeholder trust with real trust

Recommended content:

- real league logos or names
- 1 to 3 verified testimonials
- 3 to 4 real metrics if available
- optional Canada map or league marquee if you have enough real customers

If real proof is not ready:

- reduce the section and avoid inflated placeholders

### 3. Platform overview: three surfaces

Purpose:

- show that this is a full operating system, not a single admin dashboard

Recommended layout:

- tabbed or card-based overview for:
  - Commissioner dashboard
  - Public league website
  - Game-day scoring and player tools

This aligns well with the actual product split in the repo:

- `apps/league-builder`
- `apps/league-sites`
- `apps/player-companion`

### 4. Commissioner workflow section

Purpose:

- show the admin value in the order commissioners actually think

Recommended subsections:

- launch your league
- manage seasons, teams, and divisions
- build schedules and assign venues
- run drafts and manage staff
- track scorekeepers, games, and standings
- review analytics and league activity

Relevant product areas already exist across:

- dashboard league routes under `apps/league-builder/src/app/[locale]/dashboard/leagues/[id]/`
- wizard steps under `apps/league-builder/src/components/league-wizard/steps/`

### 5. Registration and payments section

Purpose:

- connect the platform to revenue and operational payoff

Recommended content:

- player registration
- team registration
- waiver collection
- Stripe Connect onboarding
- payment tracking
- flexible fee collection
- optional manual-payment fallback

This should show outcomes like:

- fewer manual reminders
- fewer spreadsheet reconciliations
- faster registration launch

### 6. League website and content engine section

Purpose:

- showcase the public-facing value of the platform

Recommended content:

- website editor
- themes and template previews
- branding and social links
- SEO settings
- custom pages
- news
- gallery
- sponsors
- awards
- events
- custom domains

Strong candidate for an interactive section:

- template/theme switcher using assets in `public/templates/`

Note:

`public/templates/README.md` says the current preview JPGs are still placeholders, so better screenshots are a prerequisite if this becomes a flagship section.

### 7. Player and captain experience section

Purpose:

- show why leagues keep players engaged after registration

Recommended content:

- standings
- stats
- player profiles
- schedule access
- notifications
- captain duties
- roster management
- playoff eligibility
- payments and waivers

This is backed by existing route and component surface area in `apps/league-sites`.

### 8. Migration and launch support section

Purpose:

- remove the "switching sounds painful" objection

Recommended content:

- guided setup wizard
- historic data import
- custom domain support
- onboarding support
- bilingual launch path

Nice format:

- a simple "Go live in 4 steps" timeline

### 9. Pricing section

Purpose:

- make the pricing story consistent and credible

Recommendation:

- reuse or adapt the tier cards and estimator already built in `apps/league-builder/src/components/subscription/subscription-plans.tsx`
- keep add-ons and premium services below the core tier comparison
- explicitly separate:
  - core platform pricing
  - payment processing model
  - add-ons like custom domains or historic imports

Do not maintain a second, contradictory pricing system on the homepage.

### 10. FAQ and objection handling

Recommended FAQ topics:

- Can we use our own domain?
- Can players register individually?
- Can teams register as a group?
- Can we collect payments online and offline?
- Can you migrate our old site or historic stats?
- Can we run drafts and score games from the platform?
- Is the site available in English and French?

### 11. Final CTA

Keep the final CTA simple:

- `Start your league`
- `Book a demo`

The page should end with a short summary of what happens next after signup.

## Feature Inventory To Market

### League operations

- multi-league administration
- setup wizard
- seasons
- teams and divisions
- venues
- schedules
- scorekeeper scheduling
- staff and referee management
- drafts
- analytics and league overview

### Registration and billing

- player registration
- team registration
- Stripe Connect onboarding
- player payments
- fee configuration
- waivers and confirmations
- goalie registration flows
- pricing tiers and billing setup

### Website and content

- public league websites
- website editor
- themes and templates
- navigation and SEO controls
- social links
- custom pages
- news
- gallery
- sponsors
- awards
- history pages
- custom domains

### Game day and stats

- scorekeeper interface
- game center pages
- standings
- player stats
- goalie stats
- score recaps
- suspensions and records

### Player and captain tools

- player dashboard
- player profile management
- notifications
- captain duties
- roster management
- payments view
- waiver access
- upcoming games and recent results

## Cool Homepage Elements Worth Adding

These are the strongest "show, do not tell" ideas for this homepage:

- An interactive template switcher that previews the website themes in `public/templates/`.
- A tier calculator lifted from `SubscriptionPlans` so leagues can estimate fit immediately.
- A workflow strip that shows how registration, payments, scorekeeping, and public-site updates connect together.
- A screenshot carousel showing admin dashboard, scorekeeper, and public league-site experiences side by side.
- A live or recorded score ticker styled after the `apps/league-sites` score components.
- A "replace spreadsheets and group texts" problem/solution section inspired by `marketing/social-copy.md`.
- A launch timeline based on the existing setup wizard steps.
- A "what updates automatically" section showing schedules, standings, stats, and news flow to the public site.

## Dependencies Before Build

### Product and brand alignment

- Decide whether the homepage should lead with "Beer League Hockey", "HockeyLifeHL", or a clearly defined relationship between the two.
- Lock the visual direction. The repo currently contains both a gold premium direction and the newer cyan/blue rink system.

### Pricing source of truth

- Confirm whether the homepage should follow the new tiered pricing model already reflected elsewhere in the codebase.
- Remove any older pricing copy that conflicts with the current billing direction.

### Social proof

- Collect real customer names, quotes, logos, and metrics.
- If those do not exist yet, keep the trust section smaller and more conservative.

### Asset quality

- Replace placeholder template previews if they are going to be shown prominently.
- Capture current product screenshots from real flows instead of relying only on a hero video.

### Feature status check

- Confirm whether player app, OCR scanning, AI news, and other high-interest items are shipped, beta, or roadmap.
- Homepage copy should tag anything not broadly available.

### Supporting routes

- Either add real marketing pages for help/contact/blog/demo/pricing, or remove dead links from the footer and nav.

## Implementation Phases

### Phase 0: Alignment

- lock homepage audience
- lock brand naming and palette
- lock pricing source of truth
- lock proof sources and CTA destination

### Phase 1: Content and wireframe

- write section-by-section copy
- define nav anchors and CTA labels
- choose screenshot and media inventory
- sketch desktop and mobile layout
- decide which sections are v1 vs later experiments

### Phase 2: Build the new homepage

- rebuild `apps/league-builder/src/app/[locale]/page.tsx` around the new information architecture
- replace thin generic sections with product-led sections
- reuse pricing calculator and tier cards where it makes sense
- add stronger product visuals and section-specific CTAs

### Phase 3: Supporting marketing cleanup

- create or remove broken footer destinations
- improve metadata in `apps/league-builder/src/app/[locale]/layout.tsx`
- add better page title, description, open graph, and schema support
- update both `en.json` and `fr.json`

### Phase 4: Polish and hardening

- reduce homepage JS where possible
- convert purely static sections to server components where it helps
- replace or optimize heavy video usage
- add reduced-motion handling
- validate mobile layout, accessibility, and loading behavior
- add analytics events for primary CTA clicks

## Likely Files To Touch

- `apps/league-builder/src/app/[locale]/page.tsx`
- `apps/league-builder/src/app/[locale]/layout.tsx`
- `apps/league-builder/src/components/home/*`
- `apps/league-builder/src/components/subscription/subscription-plans.tsx` or a homepage wrapper around it
- `apps/league-builder/src/messages/en.json`
- `apps/league-builder/src/messages/fr.json`
- new marketing support pages if kept in the footer

## Recommended First Sprint

If we want to start immediately, the first sprint should focus on:

1. Brand, pricing, and proof alignment.
2. Wireframe and copy for the new homepage.
3. New hero, platform overview, feature workflow, website showcase, and pricing sections.
4. Footer cleanup and metadata cleanup.

## Definition of Done

The homepage upgrade is complete when:

- a commissioner can understand the platform in under 5 seconds
- the page markets the real product breadth without overpromising
- pricing and branding are internally consistent
- social proof is real or intentionally minimal
- desktop and mobile both feel polished
- footer and navigation links all resolve
- English and French stay in sync
- performance and accessibility are not worse than the current page
