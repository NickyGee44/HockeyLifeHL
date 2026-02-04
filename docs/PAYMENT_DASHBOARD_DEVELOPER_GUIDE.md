# Payment Dashboard - Developer Guide

**For developers maintaining or extending the payment tracking dashboard**

## Quick Reference

### File Locations

```
apps/league-builder/src/
├── app/[locale]/dashboard/leagues/[id]/
│   ├── page.tsx                    # League detail (updated with nav link)
│   └── payments/
│       ├── page.tsx                # Payment dashboard server component
│       └── PaymentDashboard.tsx    # Payment dashboard client component
├── components/payments/
│   ├── PaymentStatusTable.tsx      # Payment table with filtering/sorting
│   ├── RefundModal.tsx            # Refund processing modal
│   └── PaymentReportExport.tsx    # Export functionality
├── lib/
│   ├── payments/
│   │   ├── payment-actions.ts     # All server actions
│   │   └── types.ts               # TypeScript type definitions
│   └── email/
│       └── payment-emails.ts      # Email templates
```

---

## Architecture Overview

### Server vs Client Components

**Server Components** (page.tsx):
- Fetch data on server side
- Verify authentication and authorization
- Calculate initial state
- Pass props to client component

**Client Components** (PaymentDashboard.tsx):
- Handle user interactions
- Manage local state
- Call server actions
- Update UI after actions

### Data Flow

```
User Action
    ↓
Client Component (PaymentDashboard.tsx)
    ↓
Server Action (payment-actions.ts)
    ↓
Supabase Database (with RLS)
    ↓
Stripe API (if payment/refund)
    ↓
Email Service (if reminder)
    ↓
Response back to Client
    ↓
Router Refresh (fetch fresh data)
    ↓
UI Updates
```

---

## Key Components

### 1. Payment Dashboard Page (Server Component)

**File**: `app/[locale]/dashboard/leagues/[id]/payments/page.tsx`

**Responsibilities**:
- Verify user authentication
- Check league admin access
- Fetch league and season data
- Get payment records with pagination
- Calculate payment summary
- Pass data to client component

**Props Passed to Client**:
```typescript
{
  locale: string;              // Current locale (en, fr)
  leagueId: string;           // League ID
  leagueName: string;         // League name
  seasons: Season[];          // All seasons for selector
  selectedSeason: Season;     // Currently selected season
  payments: PlayerPaymentWithDetails[];  // Payment records
  summary: PaymentSummary;    // Summary statistics
  total: number;              // Total payment count
  currentPage: number;        // Current page number
  limit: number;              // Records per page
  statusFilter?: string;      // Applied status filter
  hasStripeConnected: boolean; // Stripe setup status
}
```

**Key Code Snippets**:

```typescript
// Verify admin access
const { data: membership } = await supabase
  .from('league_memberships')
  .select('role, status')
  .eq('league_id', leagueId)
  .eq('user_id', userData.id)
  .single();

if (!['owner', 'admin'].includes(membership.role)) {
  // Show access denied
}

// Fetch payments with pagination
const paymentsResult = await getLeaguePlayerPayments(leagueId, {
  seasonId: activeSeason.id,
  status: statusFilter,
  limit,
  offset,
});

// Get summary statistics
const summaryResult = await getPaymentSummary(leagueId, activeSeason.id);
```

### 2. Payment Dashboard Client Component

**File**: `app/[locale]/dashboard/leagues/[id]/payments/PaymentDashboard.tsx`

**Responsibilities**:
- Display summary cards
- Render payment table
- Handle season switching
- Send payment reminders
- Open refund modal
- Export reports
- Manage pagination

**State Management**:
```typescript
const [payments, setPayments] = useState(initialPayments);
const [selectedPayment, setSelectedPayment] = useState<PlayerPaymentWithDetails | null>(null);
const [isRefundModalOpen, setIsRefundModalOpen] = useState(false);
const [sendingReminder, setSendingReminder] = useState<string | null>(null);
```

**Key Functions**:

```typescript
// Handle season change
const handleSeasonChange = (seasonId: string) => {
  router.push(`/${locale}/dashboard/leagues/${leagueId}/payments?season=${seasonId}`);
};

// Send payment reminder
const handleSendReminder = async (payment: PlayerPaymentWithDetails) => {
  setSendingReminder(payment.id);
  const result = await sendPaymentReminder(payment.id);
  if (result.success) {
    alert('Reminder sent!');
    router.refresh();
  }
  setSendingReminder(null);
};

// Open refund modal
const handleRefundClick = (payment: PlayerPaymentWithDetails) => {
  setSelectedPayment(payment);
  setIsRefundModalOpen(true);
};

// Pagination
const handlePageChange = (page: number) => {
  const params = new URLSearchParams();
  if (selectedSeason) params.set('season', selectedSeason.id);
  if (statusFilter) params.set('status', statusFilter);
  if (page > 1) params.set('page', page.toString());
  router.push(`/${locale}/dashboard/leagues/${leagueId}/payments?${params.toString()}`);
};
```

### 3. Payment Status Table

**File**: `components/payments/PaymentStatusTable.tsx`

**Props**:
```typescript
interface PaymentStatusTableProps {
  payments: PlayerPaymentWithDetails[];
  onRefund?: (payment: PlayerPaymentWithDetails) => void;
  onSendReminder?: (payment: PlayerPaymentWithDetails) => void;
  onViewDetails?: (payment: PlayerPaymentWithDetails) => void;
  isLoading?: boolean;
}
```

**Features**:
- Search filtering (client-side)
- Status filtering (client-side)
- Column sorting (client-side)
- Action menu per payment
- Progress bars for installments
- Status badges with icons

**Implementation Notes**:
- Uses `useMemo` for filtering/sorting performance
- All filtering done client-side (server sends all records)
- Action menu uses portal for proper z-index

### 4. Refund Modal

**File**: `components/payments/RefundModal.tsx`

**Props**:
```typescript
interface RefundModalProps {
  payment: PlayerPaymentWithDetails;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (result: RefundResult) => void;
}
```

**State**:
```typescript
const [refundType, setRefundType] = useState<'full' | 'partial'>('full');
const [partialAmountDollars, setPartialAmountDollars] = useState('');
const [reason, setReason] = useState<RefundReason>('requested_by_customer');
const [notes, setNotes] = useState('');
const [loading, setLoading] = useState(false);
const [error, setError] = useState<string | null>(null);
```

**Refund Process**:
```typescript
const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();

  // Validate amount
  if (refundType === 'partial' && refundAmountCents > maxRefundCents) {
    setError('Amount too high');
    return;
  }

  // Process refund
  const result = await refundPlayerPayment({
    playerPaymentId: payment.id,
    amountCents: refundType === 'partial' ? refundAmountCents : undefined,
    reason,
    notes: notes || undefined,
  });

  if (result.success) {
    onSuccess?.(result.data);
    onClose();
  }
};
```

### 5. Payment Report Export

**File**: `components/payments/PaymentReportExport.tsx`

**Props**:
```typescript
interface PaymentReportExportProps {
  leagueId: string;
  seasonId: string;
  seasonName: string;
  className?: string;
}
```

**Export Formats**:
- **CSV**: Excel-compatible spreadsheet
- **JSON**: Machine-readable format

**CSV Generation**:
```typescript
const generateCSV = (data: PaymentReportRow[]): string => {
  const headers = [
    'Player Name', 'Email', 'Team', 'Fee Name', 'Payment Plan',
    'Total Amount', 'Amount Paid', 'Amount Outstanding',
    'Status', 'Current Installment', 'Total Installments',
    'Next Payment Date', 'Created Date', 'Paid Date'
  ];

  const rows = data.map(row => [
    row.playerName,
    row.playerEmail,
    row.teamName || '',
    // ... etc
  ]);

  return [headers, ...rows]
    .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    .join('\n');
};
```

**Download Process**:
```typescript
const downloadFile = (content: string, filename: string, mimeType: string) => {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};
```

---

## Server Actions Reference

All actions in: `lib/payments/payment-actions.ts`

### 1. Get League Payments

```typescript
export async function getLeaguePlayerPayments(
  leagueId: string,
  options?: {
    seasonId?: string;
    status?: string;
    limit?: number;
    offset?: number;
  }
): Promise<ActionResult<{ payments: PlayerPaymentWithDetails[]; total: number }>>
```

**Authorization**: League admin only
**Returns**: Paginated list of payments with player/team/fee details

### 2. Get Payment Summary

```typescript
export async function getPaymentSummary(
  leagueId: string,
  seasonId: string
): Promise<ActionResult<PaymentSummary>>
```

**Authorization**: League admin only
**Returns**: Aggregate statistics (total collected, pending, overdue, etc.)

### 3. Send Payment Reminder

```typescript
export async function sendPaymentReminder(
  paymentId: string
): Promise<ActionResult<{ remindersSent: number }>>
```

**Authorization**: League admin only
**Side Effects**:
- Sends email via Resend
- Increments reminder count
- Updates last reminder timestamp
- Logs to audit trail

### 4. Refund Player Payment

```typescript
export async function refundPlayerPayment(
  params: RefundPlayerPaymentParams
): Promise<ActionResult<RefundResult>>
```

**Params**:
```typescript
interface RefundPlayerPaymentParams {
  playerPaymentId: string;
  amountCents?: number; // Full refund if not specified
  reason: 'duplicate' | 'fraudulent' | 'requested_by_customer';
  notes?: string;
}
```

**Authorization**: League admin only
**Side Effects**:
- Processes Stripe refund
- Creates refund transaction record
- Updates payment status
- Logs to audit trail
- Refunds application fee proportionally

### 5. Export Payment Report

```typescript
export async function exportPaymentReport(
  leagueId: string,
  seasonId: string
): Promise<ActionResult<PaymentReportRow[]>>
```

**Authorization**: League admin only
**Returns**: Array of payment report rows with all details

---

## Type Definitions

### Key Types

```typescript
// Payment with related data
interface PlayerPaymentWithDetails extends PlayerPayment {
  player: {
    id: string;
    full_name: string;
    email: string;
    avatar_url: string | null;
  };
  season_fee: {
    id: string;
    name: string;
    amount_cents: number;
  };
  team: {
    id: string;
    name: string;
    short_name: string;
  } | null;
}

// Payment summary statistics
interface PaymentSummary {
  totalExpectedCents: number;
  totalCollectedCents: number;
  totalOutstandingCents: number;
  playersPaidFull: number;
  playersPartial: number;
  playersPending: number;
  playersOverdue: number;
}

// Payment statuses
type PlayerPaymentStatus =
  | 'pending'
  | 'processing'
  | 'paid'
  | 'partially_paid'
  | 'overdue'
  | 'refunded'
  | 'partially_refunded'
  | 'cancelled'
  | 'failed';

// Payment plans
type PaymentPlanType = 'full' | 'two_pay' | 'three_pay';
```

---

## Database Schema

### player_payments

```sql
CREATE TABLE player_payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  player_id UUID NOT NULL REFERENCES profiles(id),
  season_fee_id UUID NOT NULL REFERENCES season_fees(id),
  team_id UUID REFERENCES teams(id),
  league_id UUID NOT NULL REFERENCES leagues(id),
  season_id UUID NOT NULL REFERENCES seasons(id),

  -- Payment details
  payment_plan payment_plan_type NOT NULL DEFAULT 'full',
  base_amount_cents INTEGER NOT NULL,
  discount_cents INTEGER DEFAULT 0,
  late_fee_cents INTEGER DEFAULT 0,
  installment_fee_cents INTEGER DEFAULT 0,
  total_amount_cents INTEGER NOT NULL,
  amount_paid_cents INTEGER DEFAULT 0,
  currency VARCHAR(3) DEFAULT 'usd',

  -- Status
  status player_payment_status NOT NULL DEFAULT 'pending',

  -- Stripe
  stripe_customer_id VARCHAR(255),
  stripe_checkout_session_id VARCHAR(255),
  stripe_subscription_id VARCHAR(255),

  -- Installments
  total_installments INTEGER DEFAULT 1,
  current_installment INTEGER DEFAULT 0,
  next_payment_date DATE,

  -- Reminders
  reminder_sent_count INTEGER DEFAULT 0,
  last_reminder_sent_at TIMESTAMPTZ,

  -- Metadata
  notes TEXT,
  metadata JSONB DEFAULT '{}',

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  paid_at TIMESTAMPTZ
);
```

### payment_transactions

```sql
CREATE TABLE payment_transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  player_payment_id UUID NOT NULL REFERENCES player_payments(id),

  -- Transaction details
  transaction_type payment_transaction_type NOT NULL,
  amount_cents INTEGER NOT NULL,
  application_fee_cents INTEGER DEFAULT 0,
  currency VARCHAR(3) DEFAULT 'usd',

  -- Stripe
  stripe_payment_intent_id VARCHAR(255),
  stripe_charge_id VARCHAR(255),
  stripe_refund_id VARCHAR(255),

  -- Status
  status VARCHAR(50) NOT NULL DEFAULT 'pending',
  installment_number INTEGER,

  -- Metadata
  description TEXT,
  metadata JSONB DEFAULT '{}',
  idempotency_key VARCHAR(255),

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);
```

### player_payment_audit_log

```sql
CREATE TABLE player_payment_audit_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  player_payment_id UUID REFERENCES player_payments(id),
  league_id UUID NOT NULL REFERENCES leagues(id),

  -- Event details
  event_type VARCHAR(100) NOT NULL,
  stripe_event_id VARCHAR(255),
  payload JSONB DEFAULT '{}',

  -- Actor
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## RLS Policies

### player_payments

```sql
-- League admins can view/manage all payments
CREATE POLICY "League admins can view payments"
  ON player_payments FOR SELECT
  USING (
    league_id IN (
      SELECT league_id FROM league_memberships
      WHERE user_id = auth.uid()
        AND role IN ('owner', 'admin')
        AND status = 'active'
    )
  );

-- Players can view their own payments
CREATE POLICY "Players can view own payments"
  ON player_payments FOR SELECT
  USING (player_id = auth.uid());
```

---

## Adding New Features

### Example: Add Bulk Reminder Sending

**1. Update PaymentStatusTable Component**

Add checkbox selection:
```typescript
const [selectedPayments, setSelectedPayments] = useState<string[]>([]);

const handleSelectPayment = (paymentId: string, checked: boolean) => {
  setSelectedPayments(prev =>
    checked
      ? [...prev, paymentId]
      : prev.filter(id => id !== paymentId)
  );
};

const handleSelectAll = (checked: boolean) => {
  setSelectedPayments(checked ? payments.map(p => p.id) : []);
};
```

**2. Add Bulk Action Toolbar**

```typescript
{selectedPayments.length > 0 && (
  <div className="bg-rink-500/10 border border-rink-500/30 rounded-lg p-4">
    <div className="flex items-center justify-between">
      <span className="text-white">
        {selectedPayments.length} payment(s) selected
      </span>
      <button
        onClick={handleBulkReminder}
        className="px-4 py-2 bg-rink-500 text-black rounded-lg"
      >
        Send Reminders
      </button>
    </div>
  </div>
)}
```

**3. Create Bulk Server Action**

```typescript
export async function sendBulkPaymentReminders(
  paymentIds: string[]
): Promise<ActionResult<{ remindersSent: number }>> {
  const results = await Promise.allSettled(
    paymentIds.map(id => sendPaymentReminder(id))
  );

  const sent = results.filter(r => r.status === 'fulfilled').length;

  return { success: true, data: { remindersSent: sent } };
}
```

**4. Handle Bulk Action**

```typescript
const handleBulkReminder = async () => {
  setLoading(true);
  const result = await sendBulkPaymentReminders(selectedPayments);
  if (result.success) {
    alert(`${result.data.remindersSent} reminders sent!`);
    setSelectedPayments([]);
    router.refresh();
  }
  setLoading(false);
};
```

### Example: Add Payment Analytics Chart

**1. Create Analytics Server Action**

```typescript
export async function getPaymentAnalytics(
  leagueId: string,
  seasonId: string
): Promise<ActionResult<PaymentAnalytics>> {
  // Aggregate payments by week/month
  // Calculate trends
  // Return chart data
}
```

**2. Add Chart Component**

```typescript
import { LineChart } from '@/components/charts/LineChart';

function PaymentTrendsChart({ data }: { data: PaymentAnalytics }) {
  return (
    <div className="bg-white/[0.04] border border-white/10 rounded-xl p-6">
      <h3 className="text-lg font-bold text-white mb-4">Collection Trends</h3>
      <LineChart
        data={data.weeklyTotals}
        xKey="week"
        yKey="collected"
        color="#22D3EE"
      />
    </div>
  );
}
```

**3. Integrate into Dashboard**

```typescript
// In page.tsx
const analyticsResult = await getPaymentAnalytics(leagueId, activeSeason.id);

// Pass to client component
<PaymentDashboard
  analytics={analyticsResult.success ? analyticsResult.data : null}
  // ... other props
/>
```

---

## Testing

### Unit Tests

```typescript
// payment-actions.test.ts
describe('sendPaymentReminder', () => {
  it('sends email to player', async () => {
    const result = await sendPaymentReminder('payment-id');
    expect(result.success).toBe(true);
    expect(mockEmailSend).toHaveBeenCalled();
  });

  it('increments reminder count', async () => {
    await sendPaymentReminder('payment-id');
    const payment = await getPayment('payment-id');
    expect(payment.reminder_sent_count).toBe(1);
  });
});
```

### Integration Tests

```typescript
// payment-dashboard.test.tsx
describe('PaymentDashboard', () => {
  it('displays summary cards', () => {
    render(<PaymentDashboard {...mockProps} />);
    expect(screen.getByText('Total Collected')).toBeInTheDocument();
  });

  it('filters payments by status', () => {
    const { getByLabelText } = render(<PaymentDashboard {...mockProps} />);
    fireEvent.change(getByLabelText('Status Filter'), { target: { value: 'overdue' } });
    expect(mockRouter.push).toHaveBeenCalledWith(expect.stringContaining('status=overdue'));
  });
});
```

### E2E Tests

```typescript
// payment-dashboard.e2e.ts
test('league admin can send payment reminder', async ({ page }) => {
  await page.goto('/dashboard/leagues/test-league/payments');
  await page.click('[data-testid="payment-menu-button"]');
  await page.click('[data-testid="send-reminder-button"]');
  await expect(page.getByText('Reminder sent!')).toBeVisible();
});
```

---

## Performance Optimization

### Current Optimizations

1. **Server-side data fetching**: Initial load is fast
2. **Pagination**: Only 50 records loaded at a time
3. **Client-side filtering**: No server round-trip for filters
4. **useMemo for sorting**: Expensive operations cached
5. **Router cache**: Next.js caches pages automatically

### Future Optimizations

1. **Virtual scrolling**: For very long payment lists
2. **Lazy loading modals**: Import refund modal only when needed
3. **Debounced search**: Wait for user to stop typing
4. **Request deduplication**: Prevent double-clicks
5. **Optimistic updates**: Update UI before server confirms

---

## Debugging

### Common Issues

**1. "Access Denied" Error**

Check:
- User has league_memberships record
- Role is 'owner' or 'admin'
- Membership status is 'active'

Debug query:
```sql
SELECT * FROM league_memberships
WHERE league_id = 'xxx'
  AND user_id = 'yyy';
```

**2. Payments Not Loading**

Check:
- Season exists and has payments
- RLS policies allow access
- No errors in server logs

Debug:
```typescript
console.log('Payments result:', paymentsResult);
console.log('Summary result:', summaryResult);
```

**3. Reminder Email Not Sending**

Check:
- RESEND_API_KEY is set
- RESEND_FROM_EMAIL is configured
- Player has valid email address
- Email service is not rate-limited

Debug:
```typescript
console.log('Sending reminder to:', player.email);
console.log('Email result:', emailResult);
```

**4. Refund Failing**

Check:
- Payment has stripe_payment_intent_id
- Original transaction exists in Stripe
- Refund amount <= amount paid
- Stripe API key is correct

Debug in Stripe Dashboard:
- View payment intent
- Check if already refunded
- Verify account balance

### Logging

All actions log to console with prefix:
```
[Payments] Action description: details
```

Search logs:
```bash
grep "\[Payments\]" logs/app.log
```

---

## Deployment Checklist

### Before Deploying

- [ ] All tests passing
- [ ] Type checks pass (`pnpm type-check`)
- [ ] Linting passes (`pnpm lint`)
- [ ] Build succeeds (`pnpm build`)
- [ ] Environment variables set
- [ ] Database migrations applied
- [ ] RLS policies verified

### After Deploying

- [ ] Smoke test in production
- [ ] Verify Stripe webhooks work
- [ ] Test email sending
- [ ] Check error logs
- [ ] Monitor performance metrics

---

## Monitoring

### Key Metrics

- Payment dashboard page views
- Reminder emails sent (success/failure rate)
- Refunds processed (count and total amount)
- Export downloads
- Average time on page
- Error rate per action

### Alerts

Set up alerts for:
- High refund rate (>10% of payments)
- Email sending failures (>5% failure rate)
- Slow page load (>3 seconds)
- Database query timeouts
- Stripe API errors

---

## Resources

### Documentation
- [Stripe API Docs](https://stripe.com/docs/api)
- [Resend Email API](https://resend.com/docs)
- [Supabase RLS Guide](https://supabase.com/docs/guides/auth/row-level-security)
- [Next.js Server Actions](https://nextjs.org/docs/app/building-your-application/data-fetching/server-actions)

### Internal Docs
- `PAYMENT_DASHBOARD_IMPLEMENTATION.md` - Implementation summary
- `PAYMENT_DASHBOARD_USER_GUIDE.md` - User guide
- `STRIPE_SETUP_COMPLETE.md` - Stripe integration
- `DEVELOPMENT_WORKFLOW.md` - Development process

### Support
- Tech lead: @tech-lead
- Product manager: @product-manager
- #payments Slack channel

---

**Last Updated:** 2026-02-04
**Maintainer:** Development Team
