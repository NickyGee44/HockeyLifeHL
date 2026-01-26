# Email System Analysis & Recommendations 🏒📧

## Current Email System Status

### **Current Implementation: NOT ACTIVE** ⚠️

The email system is **currently stubbed out** - all email functions prepare HTML templates and log to console, but **no actual emails are being sent**.

### Email Functions Currently Implemented (But Not Sending)

1. **Draft Notifications** (`src/lib/draft/email.ts`)
   - **Function**: `sendDraftNotificationEmail()`
   - **Trigger**: When a draft is started (`src/lib/draft/actions.ts`)
   - **Recipients**: All team captains
   - **Content**: Draft start notification, rules, draft link
   - **Status**: ✅ Template ready, ❌ Not sending emails

2. **Season Invites** (`src/lib/seasons/season-invite-actions.ts`)
   - **Function**: `sendSeasonInviteEmails()`
   - **Trigger**: When admin creates new season and chooses "Send email invites"
   - **Recipients**: All players from previous season
   - **Content**: New season announcement, opt-in link
   - **Status**: ✅ Template ready, ❌ Not sending emails

3. **Team Invites** (`src/lib/teams/roster-actions.ts`)
   - **Function**: `sendTeamInvite()`
   - **Trigger**: When captain invites a player to their team
   - **Recipients**: Invited player's email
   - **Content**: Team invitation with invite token
   - **Status**: ✅ Template ready, ❌ Not sending emails

### Current Email Infrastructure

- **No email service integrated** (no Resend, SendGrid, AWS SES, etc.)
- **No email API key configured** in environment variables
- **No email package installed** in `package.json`
- **All emails are logged to console** instead of being sent
- **HTML email templates are well-designed** with Canadian hockey branding

### Supabase Auth Emails

- **Auth emails** (signup confirmation, password reset) are handled by **Supabase's built-in email system**
- These work automatically via Supabase's email provider
- Can be customized in Supabase Dashboard → Authentication → Email Templates

---

## Recommended Email Service: Resend

### Why Resend?

1. **Developer-friendly API** - Simple, modern interface
2. **Great free tier** - 3,000 emails/month free, 100/day
3. **Excellent deliverability** - Built on top of AWS SES
4. **React Email support** - Can use React components for templates
5. **Easy setup** - Just need API key
6. **Canadian-friendly** - Works well for Canadian domains

### Setup Steps

1. **Sign up at [resend.com](https://resend.com)**
2. **Get API key** from dashboard
3. **Add to `.env.local`**:
   ```env
   RESEND_API_KEY=re_xxxxxxxxxxxxx
   ```
4. **Install package**:
   ```bash
   npm install resend
   ```
5. **Verify domain** (optional but recommended for production)

---

## Recommended Email Features for Admin/Captain Workflow

### 🔴 **CRITICAL - High Priority**

#### 1. **Game Reminders & Notifications**
**For Captains:**
- **24 hours before game**: "Your game is tomorrow at [time] vs [opponent]"
- **Game day morning**: "Game today at [time] - Don't forget!"
- **After game**: "Stats entry reminder - Enter stats for [game]"
- **Stats verification needed**: "Opponent captain needs to verify stats for [game]"

**For Players:**
- **24 hours before game**: "Your game is tomorrow - Check in now!"
- **Game day morning**: "Game today - Confirm your attendance"
- **Sub request**: "Your captain is requesting subs for [game]"

**Implementation:**
- Create scheduled job (cron) or use Supabase Edge Functions
- Query upcoming games and send batch emails
- Include game details, location, opponent, roster

#### 2. **Stat Entry & Verification Reminders**
**For Captains:**
- **48 hours after game**: "Don't forget to enter stats for [game]"
- **When opponent submits**: "Opponent has entered stats - Please verify"
- **When stats mismatch**: "Stats discrepancy detected - Please review"

**Implementation:**
- Trigger on game completion
- Check verification status after 24/48 hours
- Send reminder if not verified

#### 3. **Draft Notifications (Enhanced)**
**Current**: Basic draft start email
**Enhancements:**
- **"Your Turn to Pick"** - Real-time email when it's captain's turn
- **"Draft Starting Soon"** - 1 hour before scheduled draft time
- **"Draft Complete"** - Summary of all picks, team roster
- **"Draft Reminder"** - 24 hours before draft

**Implementation:**
- Hook into draft turn changes (real-time)
- Scheduled reminder before draft
- Post-draft summary email

#### 4. **Payment Reminders**
**For Admin:**
- **Weekly summary**: "X players still need to pay for [season]"
- **Individual reminders**: Send to unpaid players

**For Players:**
- **Payment due**: "Payment for [season] is due [date]"
- **Payment overdue**: "Your payment is overdue - Please pay now"
- **Payment received**: "Thank you - Payment received"

**Implementation:**
- Query `payments` table for unpaid players
- Send batch emails weekly
- Individual reminders based on due dates

### 🟡 **HIGH PRIORITY - Workflow Improvements**

#### 5. **Season Lifecycle Emails**
**For All Players:**
- **Season starting**: "Season [name] starts [date] - Get ready!"
- **Season ending**: "Season [name] complete - Final standings"
- **Playoffs starting**: "Playoffs begin [date] - Good luck!"

**For Admin:**
- **Opt-in summary**: "X players have opted in for [season]"
- **Draft readiness**: "All players opted in - Ready to start draft"

#### 6. **Team Management Emails**
**For Captains:**
- **Player added to roster**: "Player [name] has been added to your team"
- **Player removed**: "Player [name] has been removed from your team"
- **Sub request filled**: "Sub found for [game] - [player name]"

**For Players:**
- **Added to team**: "Welcome to [team name] for [season]!"
- **Removed from team**: "You've been removed from [team name]"
- **Team message**: When captain sends team-wide message

#### 7. **Stat Dispute & Resolution**
**For Captains:**
- **Dispute created**: "Stats dispute created for [game] - Please review"
- **Dispute resolved**: "Stats dispute resolved - Game is now verified"

**For Admin:**
- **Dispute escalated**: "Stats dispute needs admin review"

#### 8. **Suspension Notifications**
**For Players:**
- **Suspension issued**: "You've been suspended for [reason] - [X] games"
- **Suspension ending**: "Your suspension ends after [game]"

**For Captains:**
- **Player suspended**: "Player [name] is suspended - [X] games remaining"

**For Admin:**
- **Suspension summary**: Weekly report of active suspensions

### 🟢 **MEDIUM PRIORITY - Nice to Have**

#### 9. **Weekly Digest Emails**
**For All Players:**
- **Weekly summary**: Top performers, standings update, upcoming games
- **Personal stats**: "Your stats this week: X goals, Y assists"

**For Captains:**
- **Team performance**: Team stats, player attendance, upcoming games

#### 10. **AI Article Notifications**
**For All Players:**
- **New article published**: "New game recap: [game] vs [opponent]"
- **Draft grades available**: "Draft grades are in - Check them out!"

#### 11. **Availability & Check-In Reminders**
**For Players:**
- **Check-in reminder**: "Don't forget to check in for [game]"
- **Availability needed**: "Your captain needs to know if you're available"

#### 12. **Game Cancellation/Rescheduling**
**For All Players:**
- **Game cancelled**: "Game on [date] has been cancelled"
- **Game rescheduled**: "Game rescheduled to [new date/time]"

---

## Implementation Priority Roadmap

### Phase 1: Core Email Infrastructure (Week 1)
1. ✅ Set up Resend account and API key
2. ✅ Install `resend` package
3. ✅ Create shared email utility (`src/lib/email/client.ts`)
4. ✅ Create email template components
5. ✅ Update existing email functions to actually send

### Phase 2: Critical Notifications (Week 2)
1. ✅ Game reminders (24h before, game day)
2. ✅ Stat entry reminders
3. ✅ Draft "your turn" notifications
4. ✅ Payment reminders

### Phase 3: Workflow Emails (Week 3)
1. ✅ Season lifecycle emails
2. ✅ Team management notifications
3. ✅ Stat dispute emails
4. ✅ Suspension notifications

### Phase 4: Enhanced Features (Week 4)
1. ✅ Weekly digest emails
2. ✅ AI article notifications
3. ✅ Availability reminders
4. ✅ Game cancellation emails

---

## Email Template Structure Recommendation

### Create Reusable Email Components

```
src/lib/email/
├── client.ts              # Resend client setup
├── templates/
│   ├── base.tsx          # Base email template (header, footer)
│   ├── game-reminder.tsx # Game reminder template
│   ├── stat-reminder.tsx  # Stat entry reminder
│   ├── draft-notification.tsx
│   └── ...
├── senders/
│   ├── game-emails.ts     # All game-related emails
│   ├── draft-emails.ts    # All draft-related emails
│   ├── stat-emails.ts     # All stat-related emails
│   └── ...
└── types.ts               # Email type definitions
```

### Benefits:
- **Consistent branding** across all emails
- **Easy to update** templates in one place
- **Type-safe** email sending
- **Testable** components

---

## Email Preferences & Opt-Out

### Recommended Features:
1. **User email preferences** in profile settings
   - Game reminders: On/Off
   - Stat reminders: On/Off
   - Weekly digest: On/Off
   - Payment reminders: On/Off

2. **Unsubscribe links** in all emails
3. **Email frequency settings** (immediate, daily digest, weekly digest)

---

## Cost Estimation (Resend)

### Free Tier:
- **3,000 emails/month** free
- **100 emails/day** limit

### Paid Plans:
- **Pro**: $20/month - 50,000 emails
- **Business**: $80/month - 200,000 emails

### Estimated Usage:
- **7 teams × 13 players = 91 players**
- **Game reminders**: ~91 emails/week × 4 = 364/month
- **Stat reminders**: ~14 emails/week × 4 = 56/month
- **Draft notifications**: ~10 emails/draft × 2 drafts = 20/month
- **Season invites**: ~91 emails/season × 2 seasons = 182/month
- **Total**: ~622 emails/month (well within free tier!)

---

## Next Steps

1. **Decide on email service** (Resend recommended)
2. **Set up account and get API key**
3. **Install package and create email utility**
4. **Implement Phase 1** (core infrastructure)
5. **Test with one email type** (game reminders)
6. **Roll out Phase 2** (critical notifications)
7. **Add email preferences** to user profiles
8. **Monitor and iterate**

---

## Code Example: Resend Integration

```typescript
// src/lib/email/client.ts
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendEmail({
  to,
  subject,
  html,
  from = 'HockeyLifeHL <noreply@hockeylifehl.com>',
}: {
  to: string | string[];
  subject: string;
  html: string;
  from?: string;
}) {
  try {
    const { data, error } = await resend.emails.send({
      from,
      to: Array.isArray(to) ? to : [to],
      subject,
      html,
    });

    if (error) {
      console.error('Error sending email:', error);
      return { success: false, error };
    }

    return { success: true, data };
  } catch (error) {
    console.error('Error sending email:', error);
    return { success: false, error };
  }
}
```

---

*Last Updated: January 21, 2026*
