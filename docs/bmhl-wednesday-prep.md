# BMHL Wednesday Meeting — Prep Doc
**Date:** Wednesday March 12, 2026
**Attendees:** Nick Grossi (you), Nick (BMHL), Rob Redden (maybe)
**Goal:** Close the deal. Sign them up. Get historical data export. Set migration timeline.

---

## Pre-Meeting Action Items (Do Before Wednesday)

### 🔴 Critical
- [ ] **Verify Stripe Connect fee flow** — confirm in code/dashboard that processing fee is player-facing at checkout, not deducted from league payout. Have exact % ready: "Players pay X%, you receive 100% of registration minus standard Stripe payout fee (~0.25% + 25¢)"
- [ ] **QuickBooks path** — Stripe has native QB sync via Stripe App Marketplace. Confirm it exists, takes 2 min to connect. Have the answer: "Yes, Stripe connects to QuickBooks natively — you authorize it in one click."
- [ ] **Ask BMHL Nick what format their historical data is in** — text him before Wednesday. Don't be surprised in the meeting. You need: teams, players, seasons, game history ideally.
- [ ] **Confirm game sheet / scorekeeper flow is demo-ready** — Rob called it out specifically. Run through it yourself before Wednesday so there are no hiccups live.

### 🟡 Should Do
- [ ] **Set up a BMHL demo league** — populate with fake Barrie teams so it looks familiar to them. Shows initiative.
- [ ] **Referee scheduling demo** — migrations are live, portal is built. Show them it exists even as a "coming soon" feature. That was their ask.
- [ ] **Confirm data export works** — walk through the export tab in league owner dashboard yourself so you can demo it cold.

---

## Meeting Structure (Rob's Suggestion — Use It)

| Time | Owner | Content |
|------|-------|---------|
| 0:00–0:30 | Rob/Nick | How they currently administer the league — **you listen and take notes** |
| 0:30–1:00 | BMHL Nick | How he manages the site/code side — **learn their pain points** |
| 1:00–1:30 | You | Demo BLH features that match what they just showed you |
| 1:30–2:00 | Everyone | Next steps, data migration plan, contract/terms, timeline |

**Key: Don't jump into demo mode early. Let them talk first. You'll demo better knowing exactly what they hate about their current setup.**

---

## Demo Flow (Your 30 Minutes)

Run this order — matches what Rob mentioned:

1. **Game sheet / Scorekeeper portal** — token-based, phone-friendly, live scoring. This is what their scorekeepers want.
2. **Schedule management** — weather cancellation, venue-based cancellation, reschedule from existing ice slots. Nick already told them you built this.
3. **Player registration + payment** — show checkout flow, processing fee line item, confirmation email.
4. **Data export + org control** — show the export tab, deletion option. Address the "what if you go under" question before they ask it.
5. **Referee scheduling** (brief) — "We just built this specifically because you asked. Here's where it's heading."
6. **QuickBooks** — "Yes, Stripe connects natively. You can set it up in 5 minutes."

---

## Objection Responses

| Objection | Response |
|-----------|----------|
| "We're mid-development with someone else" | Rob already answered this himself: "I can just walk away from that." Don't re-open it. |
| "What if you stop doing the software?" | "Full data export any time, one click. Your data, your CSV, you own it. It's in the terms of service." |
| "The processing fee is too high" | "Players pay it, not you. It's the cost of convenience — card on file, no cash, no cheques, no chargebacks on your end." |
| "We need QuickBooks" | "Stripe → QuickBooks native integration. One click to connect." |
| "We need referee scheduling" | "Already built. Just deployed it this week." |
| "We need time to decide" | "Rob said if we don't get it done now it won't get done for winter. The window is now." |

---

## Closing the Room

End your demo with:

> "Here's what I need from you to get started: an export of whatever historical data you have — teams, players, past seasons. I'll import it so when you open BLH it looks like home, not like starting over. From there you create the new season, send team captain invites, and registration opens. That's it."

Then stop talking. Let them respond.

---

## Pricing (Already Anchored)

Rob said *"750 isn't unfair"* unprompted. He anchored it. Don't undercut yourself.
- Setup: **$750**
- Monthly: **$299/mo**
- Processing: **Player-facing, ~3.5%**

If they push on monthly: "That's less than one hour of developer time per month. You're getting a full league OS."

---

## Post-Meeting Checklist

- [ ] Get commitment on timeline (start before summer registration opens)
- [ ] Get historical data export or agree on format
- [ ] Send follow-up email same day summarizing what was agreed
- [ ] Add BMHL to Stripe as a connected account
- [ ] Set migration date


---

## QuickBooks Integration (Updated)

**Stripe's native QB connector is weak — don't promise it.**

**Best answer for Wednesday:**
> "Stripe doesn't have a reliable native QuickBooks connector anymore. The best path is a tool called Synder (~$65/month) — it auto-syncs every Stripe transaction into QB with full fee and payout breakdown, fully automated. Alternatively, your accountant can pull Stripe's monthly CSV export and import it into QB manually, which most leagues our size do and costs nothing extra."

**Options ranked:**
1. **Synder** (~$65/mo) — set and forget, most popular, accountant-friendly
2. **PayTraQer** — similar, slightly cheaper
3. **Stripe CSV → QB manual import** — free, works fine for monthly reconciliation
4. **Zapier** — custom setup, free tier may cover it

**Do NOT commit to building a custom QB integration** — it's not worth the scope for one client.

