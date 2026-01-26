# Email System Implementation 🏒📧

## Overview

Complete email notification system with:
- ✅ Resend integration for sending emails
- ✅ OpenAI-powered email content generation
- ✅ Admin preview/edit interface before sending
- ✅ Automated email notifications
- ✅ Manual email sending with AI assistance

## Setup

### 1. Environment Variables

Add to `.env.local`:

```env
# Resend API Key (get from https://resend.com)
RESEND_API_KEY=re_xxxxxxxxxxxxx

# OpenAI API Key (already configured)
OPENAI_API_KEY=sk-xxxxxxxxxxxxx

# Site URL (for email links)
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

### 2. Database Migration

Run the email drafts table migration:

```sql
-- Run: supabase/migrations/add_email_drafts_table.sql
```

Or apply via Supabase Dashboard → SQL Editor.

### 3. Resend Setup

1. Sign up at [resend.com](https://resend.com)
2. Get your API key from dashboard
3. (Optional) Verify your domain for production
4. Add API key to `.env.local`

## Features

### Admin Email Management (`/admin/emails`)

**Pre-Populated Templates:**
- Select email type → Template auto-loads immediately
- All templates are pre-branded with HockeyLifeHL styling
- Ready to edit and send - no generation required
- Optional AI enhancement available

**Email Templates Include:**
- Game reminders (with game details, check-in links)
- Stat reminders (with game info, stats entry links)
- Draft notifications (with draft rules, draft board links)
- Payment reminders (with payment status links)
- Season invites (with opt-in links)
- Team invites (with team details)
- And more...

**Email Types:**
- Custom
- Game Reminder
- Stat Reminder
- Draft Notification
- Payment Reminder
- Season Invite
- Team Invite

**Workflow:**
1. Select email type - **Template auto-loads immediately** (pre-branded and ready to edit)
2. (Optional) Fill in context fields (game details, season name, etc.)
3. (Optional) Check "Enhance template with AI" and click "Enhance with AI" to improve the template
4. Review and edit subject/content as needed
5. Add recipients using bulk selection or individual emails:
   - **Quick Groups**: All active season players, all captains, all admins, entire league
   - **Select Teams**: Choose specific teams (all players from those teams)
   - **Select Games**: Choose specific games (all players from those games)
   - **Individual**: Add specific email addresses
6. Send immediately or save as draft

**Key Features:**
- ✅ **Templates auto-populate** when you select an email type
- ✅ **Pre-branded** with HockeyLifeHL styling
- ✅ **Ready to edit** - no generation required
- ✅ **Optional AI enhancement** - can improve templates with AI if desired

**Recipient Selection Options:**
- ✅ All Active Season Players
- ✅ All Active Season Captains
- ✅ All Admins
- ✅ Entire League (all registered players)
- ✅ Specific Teams (multi-select)
- ✅ Specific Games (multi-select)
- ✅ Individual Email Addresses

### Automated Email Notifications

These are sent automatically (no preview required):

1. **Game Reminders** - 24h before and game day morning
2. **Stat Reminders** - After games need stats entered
3. **Draft Notifications** - When draft starts
4. **Payment Reminders** - For unpaid players
5. **Season Invites** - When new season is created

### Email Functions

**Location:** `src/lib/email/`

- `client.ts` - Resend email client
- `templates/base.tsx` - Base email template with branding
- `ai-generator.ts` - OpenAI email content generation
- `actions.ts` - Email draft management (generate, save, send)
- `notifications.ts` - Automated notification functions
- `types.ts` - TypeScript types

## Usage Examples

### Manual Email (Admin)

```typescript
import { generateEmailDraft, sendEmailDraft } from "@/lib/email/actions";

// Generate email with AI
const { draft, error } = await generateEmailDraft("game_reminder", {
  type: "game_reminder",
  recipientName: "John Doe",
  recipientRole: "player",
  gameDetails: {
    date: "January 25, 2026",
    time: "7:00 PM",
    opponent: "Maple Leafs",
    location: "Arena 1",
  },
  tone: "friendly",
});

// Send (will create draft for preview if not automated)
await sendEmailDraft(draft, false);
```

### Automated Email

```typescript
import { sendGameReminderEmail } from "@/lib/email/notifications";

// Send game reminder (automated, no preview)
await sendGameReminderEmail(gameId, playerIds);
```

## Email Templates

All emails use the base template with:
- HockeyLifeHL branding (red/blue gradient header)
- Responsive design
- Action buttons (when applicable)
- Footer with league info

## AI Email Generation

Uses GPT-4 to generate:
- Subject lines
- Email body content
- Appropriate tone (friendly, professional, casual, urgent)

**Context Provided:**
- Email type
- Recipient name and role
- Game/season/team details
- Custom context
- Tone preference

## Email Preferences

Future enhancement: Users can set email preferences in their profile:
- Game reminders: On/Off
- Stat reminders: On/Off
- Weekly digest: On/Off
- Payment reminders: On/Off

## Cost Estimation

**Resend Free Tier:**
- 3,000 emails/month free
- 100 emails/day limit

**Estimated Usage:**
- ~622 emails/month (well within free tier)
- Includes all automated and manual emails

## Testing

### Development Mode

If `RESEND_API_KEY` is not set, emails are logged to console instead of being sent.

### Production

1. Set `RESEND_API_KEY` in environment variables
2. Verify domain in Resend dashboard (optional but recommended)
3. Test with real email addresses
4. Monitor Resend dashboard for delivery status

## Troubleshooting

### Emails Not Sending

1. Check `RESEND_API_KEY` is set
2. Verify API key is valid in Resend dashboard
3. Check server logs for errors
4. Verify recipient emails are valid

### AI Generation Failing

1. Check `OPENAI_API_KEY` is set
2. Verify API key has credits
3. Check server logs for OpenAI errors

### Preview Not Working

1. Ensure database migration is applied
2. Check `email_drafts` table exists
3. Verify admin access (owner role required)

## Next Steps

1. ✅ Set up Resend account and API key
2. ✅ Run database migration
3. ✅ Test email generation
4. ✅ Test automated notifications
5. ⏳ Set up scheduled jobs for game reminders (cron/edge functions)
6. ⏳ Add email preferences to user profiles
7. ⏳ Add email analytics/delivery tracking

---

*Last Updated: January 21, 2026*
