# Season Fee Configuration UI - Implementation Summary

## Overview
Built a comprehensive UI for league owners to configure player registration fees with full CRUD operations, payment plans, discounts, and late fees.

## Components Created

### 1. SeasonFeeManager Component
**Location:** `apps/league-builder/src/components/payments/SeasonFeeManager.tsx`

**Features:**
- Display all season fees in a grid layout
- Create/Edit/Delete fee configurations
- Toggle fee active/inactive status
- Form validation with error handling
- Dollar to cents conversion for accurate monetary calculations
- Support for multiple payment plans (full, 2-pay, 3-pay)
- Early bird discounts with deadline
- Late fees with automatic application
- Installment fee configuration
- Currency selection (USD/CAD)

**Props:**
```typescript
interface SeasonFeeManagerProps {
  leagueId: string;
  seasonId: string;
  seasonName: string;
  initialFees?: SeasonFeeWithSeason[];
}
```

**Key Functions:**
- `loadFees()` - Fetches fees from backend
- `openCreateDialog()` - Opens create fee form
- `openEditDialog(fee)` - Opens edit fee form with existing data
- `handleSave()` - Validates and saves fee (create or update)
- `handleDelete(feeId)` - Soft deletes fee if has payments, hard deletes otherwise
- `toggleActive(fee)` - Toggles fee active status

### 2. FeeBreakdown Component
**Location:** `apps/league-builder/src/components/payments/FeeBreakdown.tsx`

**Features:**
- Player-facing fee display
- Real-time discount/late fee calculation based on current date
- Shows early bird savings if applicable
- Shows late fee warnings if deadline passed
- Payment plan selector with per-payment amounts
- Calculates installment fees for multi-payment plans
- Timeline display showing discount/standard/late periods

**Props:**
```typescript
interface FeeBreakdownProps {
  fee: SeasonFee;
  showPaymentPlans?: boolean;
  selectedPlan?: 'full' | 'two_pay' | 'three_pay';
  onPlanSelect?: (plan) => void;
  className?: string;
}
```

**Key Functions:**
- `calculateFeeAmount(fee)` - Calculates total with discounts/late fees based on date
- `calculateInstallmentAmount(total, installments, fee)` - Calculates per-payment amount
- Auto-detects if early bird period is active
- Auto-detects if late fee should apply

## Integration Points

### 3. Season Detail Page Integration
**Location:** `apps/league-builder/src/app/[locale]/dashboard/leagues/[id]/seasons/[seasonId]/page.tsx`

**Changes:**
- Added import for `SeasonFeeManager` component
- Added import for `getSeasonFees` action
- Fetches season fees on page load
- Displays `SeasonFeeManager` component with season data
- Shows fee count in season stats

**Added Code:**
```typescript
// Get season fees
const feesResult = await getSeasonFees(leagueId, { seasonId });
const seasonFees = feesResult.success ? feesResult.data : [];
const activeFees = seasonFees.filter((f) => f.is_active);
const feeCount = activeFees.length;

// In JSX
<div className="mb-8">
  <SeasonFeeManager
    leagueId={leagueId}
    seasonId={seasonId}
    seasonName={season.name}
    initialFees={seasonFees}
  />
</div>
```

### 4. League Wizard Integration
**Location:** `apps/league-builder/src/lib/actions/league-wizard.ts`

**Changes:**
Added automatic season fee creation when league wizard completes if paid registration is enabled.

**Added Code (after season creation):**
```typescript
// Step 3b: Create season fee if paid registration is enabled
if (data.enablePaidRegistration && data.registrationFee > 0) {
  const earlyBirdDiscountCents = data.earlyBirdDiscount?.enabled
    ? data.earlyBirdDiscount.isPercentage
      ? Math.round((data.registrationFee * data.earlyBirdDiscount.amount) / 100)
      : data.earlyBirdDiscount.amount
    : 0;

  await serviceSupabase.from('season_fees').insert({
    league_id: league.id,
    season_id: season.id,
    name: 'Registration Fee',
    description: 'Season registration fee',
    amount_cents: data.registrationFee,
    currency: 'usd',
    allow_full_payment: true,
    payment_deadline: data.registration_closes || null,
    early_bird_deadline: data.earlyBirdDiscount?.deadline || null,
    early_bird_discount_cents: earlyBirdDiscountCents,
    late_fee_cents: data.lateRegistrationFee?.enabled ? data.lateRegistrationFee.amount : 0,
    // ... more fields
  });
}
```

## Backend Actions Used

All backend actions already existed in `apps/league-builder/src/lib/payments/fee-actions.ts`:

1. **getSeasonFees(leagueId, options)** - Fetch fees for a league/season
2. **getSeasonFee(feeId)** - Get single fee by ID
3. **createSeasonFee(params)** - Create new fee
4. **updateSeasonFee(params)** - Update existing fee
5. **deleteSeasonFee(feeId)** - Delete/deactivate fee
6. **getAvailableFeesForPlayer(leagueId, seasonId, playerId)** - Get fees player can pay

## Database Schema

Uses existing `season_fees` table from migration `20260201_player_fee_collection.sql`:

```sql
CREATE TABLE season_fees (
  id UUID PRIMARY KEY,
  league_id UUID NOT NULL REFERENCES leagues(id),
  season_id UUID NOT NULL REFERENCES seasons(id),
  name TEXT NOT NULL,
  description TEXT,
  amount_cents INTEGER NOT NULL CHECK (amount_cents > 0),
  currency TEXT NOT NULL DEFAULT 'usd',

  -- Payment plans
  allow_full_payment BOOLEAN NOT NULL DEFAULT true,
  allow_two_pay BOOLEAN NOT NULL DEFAULT false,
  allow_three_pay BOOLEAN NOT NULL DEFAULT false,

  -- Deadlines
  payment_deadline DATE,
  early_bird_deadline DATE,

  -- Pricing adjustments
  early_bird_discount_cents INTEGER NOT NULL DEFAULT 0,
  late_fee_cents INTEGER NOT NULL DEFAULT 0,
  installment_fee_cents INTEGER NOT NULL DEFAULT 0,

  -- Status
  is_active BOOLEAN NOT NULL DEFAULT true,

  -- Audit
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);
```

## Testing Checklist

### Manual Testing Steps

#### 1. Create Fee via Season Detail Page
1. Navigate to a season detail page: `/dashboard/leagues/[id]/seasons/[seasonId]`
2. Scroll to "Registration Fees" section
3. Click "Add Fee" button
4. Fill out form:
   - Fee Name: "Spring 2024 Registration"
   - Description: "Season registration fee"
   - Base Amount: $150.00
   - Currency: USD
   - Enable all payment plans
   - Set installment fee: $5.00
   - Payment Deadline: Select date 2 months in future
   - Early Bird Deadline: Select date 1 month in future
   - Early Bird Discount: $25.00
   - Late Fee: $25.00
5. Click "Create Fee"
6. Verify fee appears in list

#### 2. Edit Fee
1. Click edit button on a fee card
2. Change base amount to $175.00
3. Disable "3 Payments" option
4. Change early bird discount to $30.00
5. Click "Update Fee"
6. Verify changes saved correctly

#### 3. Delete Fee
1. Click delete button on a fee
2. Confirm deletion
3. Verify fee removed from list
4. Check database - should be hard deleted if no payments exist

#### 4. Toggle Fee Active/Inactive
1. Toggle the active switch on a fee card
2. Verify fee becomes grayed out when inactive
3. Toggle back to active
4. Verify fee styling returns to normal

#### 5. Test Fee Calculations (Early Bird)
1. Create fee with:
   - Amount: $200.00
   - Early bird deadline: Tomorrow
   - Early bird discount: $30.00
2. Open FeeBreakdown (would be shown to players)
3. Verify displays:
   - Base: $200.00
   - Early Bird Discount: -$30.00
   - Total: $170.00
   - Green banner showing "Register by [date] to save $30.00"

#### 6. Test Fee Calculations (Late Fee)
1. Create fee with:
   - Amount: $200.00
   - Payment deadline: Yesterday
   - Late fee: $25.00
2. Open FeeBreakdown
3. Verify displays:
   - Base: $200.00
   - Late Registration Fee: +$25.00
   - Total: $225.00
   - Orange banner showing late fee applied

#### 7. Test Payment Plans
1. Create fee with:
   - Amount: $150.00
   - Enable 2-pay and 3-pay
   - Installment fee: $5.00
2. Open FeeBreakdown with `showPaymentPlans={true}`
3. Verify displays:
   - Full Payment: $150.00
   - 2 Payments: $160.00 total ($80.00 per payment) [+$10.00 fees]
   - 3 Payments: $165.00 total ($55.00 per payment) [+$15.00 fees]

#### 8. Test League Wizard Integration
1. Start new league wizard
2. Complete steps 1-3
3. On Step 4 (Registration Fees):
   - Enable "Paid Registration"
   - Set fee: $125.00
   - Enable early bird: $20.00 discount
   - Set deadlines
4. Complete steps 5-7 and create league
5. Navigate to season detail page
6. Verify "Registration Fee" was auto-created in fees list

#### 9. Test Validation
1. Try to create fee with:
   - Empty name → Should show "Fee name is required"
   - Amount $0.00 → Should show "Fee amount must be greater than $0"
   - All payment plans disabled → Should show "At least one payment plan must be enabled"

#### 10. Test Currency Display
1. Create fee with currency CAD
2. Verify displays "CA$" prefix instead of "$"
3. Verify all amounts show correct currency symbol

### Expected Behavior

**Success Criteria:**
✅ League owners can create season fees
✅ All fee options are configurable
✅ Early bird discounts calculate correctly based on date
✅ Late fees apply at the right time
✅ Payment plans show correct installment amounts
✅ Changes save successfully
✅ Fees display properly in UI
✅ Wizard creates initial fee when configured
✅ Validation prevents invalid configurations
✅ Currency symbols display correctly

**Edge Cases Handled:**
- Soft delete fees with existing payments (deactivate instead of delete)
- Hard delete fees with no payments
- Percentage-based early bird discounts (from wizard)
- Fixed-amount early bird discounts (from manager)
- Multiple payment plans per fee
- Installment fees calculated correctly for 2-pay and 3-pay
- Date-based discount/late fee logic

## Fee Calculation Logic

### Early Bird Discount
```typescript
const today = new Date();
if (fee.early_bird_deadline && fee.early_bird_discount_cents > 0) {
  const earlyBirdDate = new Date(fee.early_bird_deadline);
  if (today <= earlyBirdDate) {
    discount = fee.early_bird_discount_cents;
  }
}
```

### Late Fee
```typescript
if (fee.payment_deadline && fee.late_fee_cents > 0) {
  const deadlineDate = new Date(fee.payment_deadline);
  if (today > deadlineDate) {
    lateFee = fee.late_fee_cents;
  }
}
```

### Installment Amount
```typescript
function calculateInstallmentAmount(
  total: number,
  installments: number,
  installmentFeeCents: number
): { perPayment: number; totalWithFees: number } {
  const totalWithFees = total + installmentFeeCents * installments;
  const perPayment = Math.ceil(totalWithFees / installments);
  return { perPayment, totalWithFees };
}
```

## Security

All operations protected by:
1. **Authentication** - Must be logged in user
2. **Authorization** - Must be league owner or admin (verified in backend actions)
3. **RLS Policies** - Database-level row security on season_fees table
4. **Validation** - Schema validation on all inputs

## Future Enhancements

Potential improvements (not implemented):
1. Bulk fee operations (create fee for multiple seasons)
2. Fee templates (save and reuse configurations)
3. Proration for mid-season registrations
4. Sibling/multi-player discounts
5. Coupon codes
6. Refund management UI
7. Payment history and reporting
8. Email notifications for payment deadlines
9. Automatic late fee application
10. Integration with player registration flow

## Files Modified

**New Files Created:**
- `apps/league-builder/src/components/payments/SeasonFeeManager.tsx`
- `apps/league-builder/src/components/payments/FeeBreakdown.tsx`
- `SEASON_FEE_IMPLEMENTATION.md` (this file)

**Existing Files Modified:**
- `apps/league-builder/src/app/[locale]/dashboard/leagues/[id]/seasons/[seasonId]/page.tsx`
- `apps/league-builder/src/lib/actions/league-wizard.ts`

**Files Used (No Changes):**
- `apps/league-builder/src/lib/payments/fee-actions.ts` (backend actions)
- `apps/league-builder/src/lib/payments/types.ts` (TypeScript types)
- `apps/league-builder/src/components/league-wizard/steps/step-4-registration-fees.tsx` (wizard step)
- `supabase/migrations/20260201_player_fee_collection.sql` (database schema)

## Notes

- All monetary values stored in cents to avoid floating-point precision issues
- Dollar display values converted via `centsToDollars()` and `dollarsToCents()` helpers
- Early bird discount in wizard supports percentage OR fixed amount
- Early bird discount in manager only supports fixed amount (simpler UX)
- Fee calculation is date-aware and happens at render time
- Multiple fees can exist per season (e.g., registration fee, late registration fee, tryout fee)
- Only active fees are shown to players
- Inactive fees still visible to admins for record-keeping
