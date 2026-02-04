# Payment Tracking Dashboard - User Guide

**For League Owners and Admins**

## Overview

The Payment Tracking Dashboard provides league owners and admins with a comprehensive view of all player fee payments. Track collection progress, send reminders, process refunds, and export payment reports—all from one centralized dashboard.

---

## Accessing the Dashboard

1. Navigate to your league detail page
2. Click the **"Player Payments"** quick action card
3. You'll be taken to: `/dashboard/leagues/[your-league-id]/payments`

**Note:** Only league owners and admins can access the payment dashboard.

---

## Dashboard Overview

### Summary Cards (Top of Page)

Four key metrics at a glance:

1. **Total Collected**
   - Amount collected so far
   - Shows percentage of expected total
   - Green indicator for positive progress

2. **Pending Payments**
   - Outstanding balance remaining
   - Number of players with pending payments
   - Yellow indicator for attention needed

3. **Overdue Payments**
   - Count of players with overdue payments
   - Red indicator for urgent action
   - Click to filter table to overdue only

4. **Paid in Full**
   - Count of players who completed all payments
   - Shows partially paid players too
   - Cyan indicator for completed status

### Season Selector

- Located in top-right corner
- Switch between different seasons
- Automatically shows most recent active season
- All data updates when you change seasons

---

## Payment Status Table

### Understanding the Table Columns

| Column | Description |
|--------|-------------|
| **Player** | Player name, email, and avatar |
| **Team** | Team name (if assigned) |
| **Amount** | Total amount and amount paid |
| **Progress** | Visual progress bar with installment info |
| **Status** | Current payment status badge |
| **Plan** | Payment plan (Full, 2-Pay, 3-Pay) |
| **Actions** | Menu with available actions |

### Payment Status Badges

- 🟡 **Pending**: Payment not yet started
- 🔵 **Processing**: Payment in progress
- 🟢 **Paid**: Payment completed in full
- 🟠 **Partial**: Some payments received, more due
- 🔴 **Overdue**: Payment past due date
- 🟣 **Refunded**: Full refund issued
- 🟣 **Part. Refunded**: Partial refund issued
- ⚫ **Cancelled**: Payment cancelled
- 🔴 **Failed**: Payment attempt failed

### Filtering and Searching

**Search Box**
- Search by player name
- Search by player email
- Search by team name
- Real-time filtering as you type

**Status Filter**
- Click the dropdown next to search
- Select specific status to filter
- Choose "All Status" to see everything

**Sorting**
- Click any column header to sort
- Click again to reverse sort order
- Sort by: Player, Team, Amount, Progress, Status, Date

---

## Sending Payment Reminders

### When to Send Reminders
Reminders can be sent for payments with these statuses:
- Pending
- Partially Paid
- Overdue

### How to Send a Reminder

1. Find the payment in the table
2. Click the **"..."** menu button
3. Select **"Send Reminder"**
4. Confirmation alert appears
5. Player receives email reminder

### Reminder Email Contents
The reminder email includes:
- Player name and league name
- Fee name and amount due
- Due date (if applicable)
- "Pay Now" button linking to payment page
- Reminder number (escalates after 3rd reminder)

### Tracking Reminders
- System tracks how many reminders sent
- Records timestamp of last reminder
- Email marked urgent after 3rd reminder

---

## Processing Refunds

### When to Issue Refunds
Refunds can be processed for payments with:
- Status: Paid or Partially Paid
- Amount paid > $0

### How to Process a Refund

1. Click **"..."** menu on payment
2. Select **"Issue Refund"**
3. Refund modal opens

### Refund Modal Steps

#### 1. Review Payment Info
- Player name and email
- Fee name
- Amount paid

#### 2. Select Refund Type
- **Full Refund**: Refund entire amount paid
- **Partial Refund**: Refund custom amount
  - Enter amount in dollars
  - Maximum = amount paid
  - Must be at least $0.01

#### 3. Choose Reason
- **Requested by Player**: Player dropped out or requested refund
- **Duplicate Payment**: Player charged twice by mistake
- **Fraudulent**: Suspected fraudulent transaction

#### 4. Add Notes (Optional)
- Additional context for the refund
- Saved to payment record for future reference

#### 5. Review Summary
- Confirm refund amount
- Platform fee also refunded proportionally

#### 6. Process Refund
- Click **"Process Refund"** button
- Refund sent to Stripe immediately
- Cannot be undone

### After Refund Processing
- Payment status updates automatically
- Refund appears in player's original payment method
- Takes 5-10 business days to show in bank
- Player receives email notification
- Audit log records the refund

---

## Exporting Payment Reports

### Export Card Location
Located above the payment table, shows:
- Season name
- Export format options
- Status filter

### Export Process

1. **Select Format**
   - **CSV**: Excel-compatible spreadsheet
   - **JSON**: Machine-readable data format

2. **Filter by Status** (optional)
   - All Status
   - Paid
   - Partially Paid
   - Pending
   - Overdue
   - Refunded
   - Cancelled

3. **Click Download Button**
   - File generates and downloads automatically
   - Filename includes season name and date
   - Example: `payments-fall-2024-2026-02-04.csv`

### Export Contents

Each row includes:
- Player Name
- Email
- Team
- Fee Name
- Payment Plan
- Total Amount
- Amount Paid
- Amount Outstanding
- Status
- Current Installment
- Total Installments
- Next Payment Date
- Created Date
- Paid Date

### Use Cases for Exports
- **Accounting**: Import to QuickBooks or accounting software
- **Reports**: Share with board members or stakeholders
- **Analysis**: Analyze payment trends in Excel
- **Records**: Archive for tax or legal purposes

---

## Pagination

For leagues with many payments:

- **50 payments per page** (default)
- Use **Previous/Next buttons** to navigate
- Page counter shows current page number
- Total count shows number of payments

Example: "Showing 1 to 50 of 127 payments"

---

## Common Workflows

### Weekly Payment Check

1. Open Payment Dashboard
2. Review summary cards for overview
3. Check "Overdue" count
4. Filter table by "Overdue" status
5. Send reminders to overdue players
6. Export report for accounting

### Processing Bulk Reminders

**Current Process** (individual):
1. Sort table by "Status"
2. Send reminder to first pending player
3. Continue down the list
4. Track progress manually

**Future Enhancement**: Bulk select and send reminders to all at once

### End-of-Season Reconciliation

1. Select completed season
2. Export full payment report (CSV)
3. Review any outstanding balances
4. Send final reminders to pending players
5. Archive export for records

### Handling Player Dropout

1. Find player's payment in table
2. Check amount paid
3. If payment received, process refund:
   - Full or partial based on policy
   - Reason: "Requested by Player"
   - Notes: "Player dropped out on [date]"
4. Player receives refund automatically

---

## Troubleshooting

### "Stripe Connect Not Set Up" Message

**Problem**: Dashboard shows warning about Stripe not being set up.

**Solution**:
1. Click "Set Up Payments" button
2. Follow Stripe Connect onboarding
3. Complete account verification
4. Return to Payment Dashboard

### "No Seasons Found" Message

**Problem**: Dashboard shows no seasons available.

**Solution**:
1. Click "Create Season" button
2. Set up your first season
3. Add season fees
4. Return to Payment Dashboard

### Reminder Email Not Sending

**Possible Causes**:
- Player has no email address
- Email bounced previously
- Resend API not configured

**Solution**:
1. Check player profile has valid email
2. Verify email is not on bounce list
3. Contact support if issue persists

### Refund Not Processing

**Possible Causes**:
- Stripe API issue
- Payment already fully refunded
- Original transaction too old

**Solution**:
1. Check error message for details
2. Verify payment status is "Paid" or "Partially Paid"
3. Check Stripe dashboard for transaction
4. Contact support if needed

### Export Has No Data

**Problem**: Export downloads but file is empty.

**Cause**: Status filter has no matching payments.

**Solution**:
1. Change status filter to "All Status"
2. Verify season has payments
3. Try exporting again

---

## Best Practices

### Regular Monitoring
- Check dashboard weekly during season
- Review overdue payments daily
- Send reminders promptly
- Export monthly reports

### Reminder Timing
- Send first reminder at 3 days overdue
- Send second reminder at 7 days overdue
- Send third reminder at 14 days overdue
- Follow up personally after 3 reminders

### Refund Policy
- Document refund policy clearly
- Be consistent with refund decisions
- Always add notes to refund records
- Communicate refund timeline to players

### Record Keeping
- Export reports monthly
- Archive exports for tax purposes
- Keep refund records for 7 years
- Document all policy decisions

### Communication
- Be proactive with reminders
- Use friendly, professional tone
- Provide multiple payment options
- Follow up on failed payments

---

## Keyboard Shortcuts

Currently not available, but planned for future:
- `Cmd/Ctrl + K`: Focus search box
- `Cmd/Ctrl + F`: Open filter menu
- `Cmd/Ctrl + E`: Export report
- Arrow keys: Navigate table

---

## Mobile Access

The Payment Dashboard is fully responsive:
- Summary cards stack vertically
- Table scrolls horizontally
- Action menus are touch-friendly
- Export works on mobile devices

**Best Experience**: Desktop or tablet for managing many payments

---

## Privacy and Security

### Data Protection
- Only league admins can access dashboard
- All actions are logged to audit trail
- Refunds require reason and are irreversible
- Player emails are never exposed in exports

### Audit Trail
Every action is logged with:
- Who performed the action
- What action was taken
- When it occurred
- Details of the action

**View Audit Log**: Coming soon in League Settings

---

## FAQ

### Can players access this dashboard?
No, only league owners and admins have access. Players see their own payment status in their personal dashboard.

### Can I customize email reminder templates?
Not yet. Custom email templates are planned for a future release.

### How do I set up payment plans?
Payment plans are configured when creating season fees. Go to Season → Settings → Fees to set up payment options.

### What happens if a payment fails?
Failed payments are marked in the table. Send a reminder to the player to retry with a different payment method.

### Can I delete a payment record?
No, payment records cannot be deleted for audit purposes. You can cancel a payment or issue a refund instead.

### How do I bulk send reminders?
Bulk actions are not yet available. You need to send reminders individually. Bulk functionality is planned for future release.

### Can I see payment history over time?
Currently, only current season data is shown. Historical analysis is planned for future release.

### What if a player paid outside the system?
Create a manual payment record or adjust the payment status using admin tools (coming soon).

---

## Getting Help

### Support Channels
- **Email**: support@beerleaguehockey.ca
- **Discord**: Join our community server
- **Documentation**: Check the knowledge base
- **Video Tutorials**: Watch on YouTube channel

### Reporting Issues
When reporting a problem, include:
- League ID
- Season ID
- Player payment ID (if applicable)
- Screenshot of error message
- Steps to reproduce

---

## Future Enhancements

Coming soon:
- Bulk reminder sending
- Automatic scheduled reminders
- Custom email templates
- SMS reminders
- Advanced analytics and charts
- Payment plan suggestions
- Late fee automation
- QuickBooks integration

Stay tuned for updates!

---

**Last Updated:** 2026-02-04
**Version:** 1.0.0
