# Season Fee Configuration - Code Examples

## 1. Using SeasonFeeManager Component

### Basic Usage (Server Component)
```typescript
// In a server component (e.g., season detail page)
import { SeasonFeeManager } from '@/components/payments/SeasonFeeManager';
import { getSeasonFees } from '@/lib/payments/fee-actions';

export default async function SeasonDetailPage({ params }) {
  const { leagueId, seasonId } = params;

  // Fetch fees
  const feesResult = await getSeasonFees(leagueId, { seasonId });
  const seasonFees = feesResult.success ? feesResult.data : [];

  return (
    <div>
      {/* Other season content */}

      <SeasonFeeManager
        leagueId={leagueId}
        seasonId={seasonId}
        seasonName="Spring 2024"
        initialFees={seasonFees}
      />
    </div>
  );
}
```

### With Error Handling
```typescript
export default async function SeasonDetailPage({ params }) {
  const { leagueId, seasonId } = params;

  // Fetch fees with error handling
  const feesResult = await getSeasonFees(leagueId, { seasonId });

  if (!feesResult.success) {
    return <div>Error loading fees: {feesResult.error}</div>;
  }

  return (
    <SeasonFeeManager
      leagueId={leagueId}
      seasonId={seasonId}
      seasonName="Spring 2024"
      initialFees={feesResult.data}
    />
  );
}
```

## 2. Using FeeBreakdown Component

### Basic Display
```typescript
'use client';

import { FeeBreakdown } from '@/components/payments/FeeBreakdown';
import type { SeasonFee } from '@/lib/payments/types';

export function RegistrationView({ fee }: { fee: SeasonFee }) {
  return (
    <div className="max-w-2xl mx-auto p-6">
      <FeeBreakdown fee={fee} showPaymentPlans={false} />
    </div>
  );
}
```

### With Payment Plan Selection
```typescript
'use client';

import { useState } from 'react';
import { FeeBreakdown } from '@/components/payments/FeeBreakdown';
import type { SeasonFee } from '@/lib/payments/types';

export function RegistrationForm({ fee }: { fee: SeasonFee }) {
  const [selectedPlan, setSelectedPlan] = useState<'full' | 'two_pay' | 'three_pay'>('full');

  return (
    <div className="max-w-2xl mx-auto p-6">
      <FeeBreakdown
        fee={fee}
        showPaymentPlans={true}
        selectedPlan={selectedPlan}
        onPlanSelect={setSelectedPlan}
      />

      <button
        onClick={() => {
          // Proceed to payment with selected plan
          console.log('Selected plan:', selectedPlan);
        }}
        className="mt-6 w-full py-3 bg-rink-500 text-white rounded-lg"
      >
        Proceed to Payment
      </button>
    </div>
  );
}
```

### Multiple Fees Display
```typescript
'use client';

import { useState } from 'react';
import { FeeBreakdown } from '@/components/payments/FeeBreakdown';
import type { SeasonFee } from '@/lib/payments/types';

export function MultiFeeSelector({ fees }: { fees: SeasonFee[] }) {
  const [selectedFeeId, setSelectedFeeId] = useState<string>(fees[0]?.id);
  const [selectedPlan, setSelectedPlan] = useState<'full' | 'two_pay' | 'three_pay'>('full');

  const selectedFee = fees.find(f => f.id === selectedFeeId);

  return (
    <div className="max-w-2xl mx-auto p-6">
      {/* Fee selector */}
      <div className="mb-6">
        <label className="block text-sm font-medium mb-2">Choose Registration Type</label>
        <select
          value={selectedFeeId}
          onChange={(e) => setSelectedFeeId(e.target.value)}
          className="w-full p-3 border rounded-lg"
        >
          {fees.map((fee) => (
            <option key={fee.id} value={fee.id}>
              {fee.name} - ${(fee.amount_cents / 100).toFixed(2)}
            </option>
          ))}
        </select>
      </div>

      {/* Show breakdown for selected fee */}
      {selectedFee && (
        <FeeBreakdown
          fee={selectedFee}
          showPaymentPlans={true}
          selectedPlan={selectedPlan}
          onPlanSelect={setSelectedPlan}
        />
      )}
    </div>
  );
}
```

## 3. Backend Action Usage

### Create a Fee
```typescript
import { createSeasonFee } from '@/lib/payments/fee-actions';

async function createRegistrationFee() {
  const result = await createSeasonFee({
    leagueId: 'league-uuid',
    seasonId: 'season-uuid',
    name: 'Spring 2024 Registration',
    description: 'Season registration fee',
    amountCents: 15000, // $150.00
    currency: 'usd',
    allowFullPayment: true,
    allowTwoPay: true,
    allowThreePay: true,
    paymentDeadline: '2024-05-31',
    earlyBirdDeadline: '2024-03-01',
    earlyBirdDiscountCents: 2500, // $25.00
    lateFeeCents: 2500, // $25.00
    installmentFeeCents: 500, // $5.00 per installment
  });

  if (result.success) {
    console.log('Fee created:', result.data);
  } else {
    console.error('Error:', result.error);
  }
}
```

### Update a Fee
```typescript
import { updateSeasonFee } from '@/lib/payments/fee-actions';

async function updateFeeAmount(feeId: string) {
  const result = await updateSeasonFee({
    feeId,
    amountCents: 17500, // Update to $175.00
    earlyBirdDiscountCents: 3000, // Update discount to $30.00
  });

  if (result.success) {
    console.log('Fee updated:', result.data);
  } else {
    console.error('Error:', result.error);
  }
}
```

### Get Fees for a Season
```typescript
import { getSeasonFees } from '@/lib/payments/fee-actions';

async function loadSeasonFees(leagueId: string, seasonId: string) {
  // Get all fees
  const allFees = await getSeasonFees(leagueId, { seasonId });

  // Get only active fees
  const activeFees = await getSeasonFees(leagueId, {
    seasonId,
    activeOnly: true
  });

  if (allFees.success) {
    console.log('All fees:', allFees.data);
  }

  if (activeFees.success) {
    console.log('Active fees:', activeFees.data);
  }
}
```

### Delete a Fee
```typescript
import { deleteSeasonFee } from '@/lib/payments/fee-actions';

async function removeFee(feeId: string) {
  const result = await deleteSeasonFee(feeId);

  if (result.success) {
    console.log('Fee deleted successfully');
  } else {
    console.error('Error:', result.error);
  }
}
```

### Get Available Fees for Player
```typescript
import { getAvailableFeesForPlayer } from '@/lib/payments/fee-actions';

async function showPlayerFees(leagueId: string, seasonId: string, playerId: string) {
  const result = await getAvailableFeesForPlayer(leagueId, seasonId, playerId);

  if (result.success) {
    // These are fees the player hasn't paid yet
    console.log('Available fees:', result.data);
  }
}
```

## 4. Fee Calculation Examples

### Calculate Total with Discounts/Late Fees
```typescript
function calculateTotal(fee: SeasonFee): number {
  const today = new Date();
  let total = fee.amount_cents;

  // Apply early bird discount
  if (fee.early_bird_deadline && fee.early_bird_discount_cents > 0) {
    const earlyBirdDate = new Date(fee.early_bird_deadline);
    if (today <= earlyBirdDate) {
      total -= fee.early_bird_discount_cents;
    }
  }

  // Apply late fee
  if (fee.payment_deadline && fee.late_fee_cents > 0) {
    const deadlineDate = new Date(fee.payment_deadline);
    if (today > deadlineDate) {
      total += fee.late_fee_cents;
    }
  }

  return total;
}
```

### Calculate Installment Amounts
```typescript
function calculateInstallments(
  baseCents: number,
  installments: number,
  feeCents: number
): { perPayment: number; total: number } {
  const totalWithFees = baseCents + (feeCents * installments);
  const perPayment = Math.ceil(totalWithFees / installments);

  return {
    perPayment,
    total: totalWithFees
  };
}

// Example usage:
const fee = {
  amount_cents: 15000, // $150
  installment_fee_cents: 500, // $5
};

// 2 payments
const twoPay = calculateInstallments(15000, 2, 500);
console.log(twoPay); // { perPayment: 8000, total: 16000 } = $80 per payment, $160 total

// 3 payments
const threePay = calculateInstallments(15000, 3, 500);
console.log(threePay); // { perPayment: 5500, total: 16500 } = $55 per payment, $165 total
```

### Format Currency Display
```typescript
function formatCurrency(cents: number, currency: string = 'usd'): string {
  const symbol = currency === 'cad' ? 'CA$' : '$';
  const dollars = (cents / 100).toFixed(2);
  return `${symbol}${dollars}`;
}

// Examples:
formatCurrency(15000, 'usd'); // "$150.00"
formatCurrency(15000, 'cad'); // "CA$150.00"
formatCurrency(2550, 'usd');  // "$25.50"
```

## 5. TypeScript Types

### Season Fee Type
```typescript
import type { SeasonFee, SeasonFeeWithSeason } from '@/lib/payments/types';

// Basic fee type
const fee: SeasonFee = {
  id: 'uuid',
  league_id: 'league-uuid',
  season_id: 'season-uuid',
  name: 'Registration Fee',
  description: 'Season registration',
  amount_cents: 15000,
  currency: 'usd',
  allow_full_payment: true,
  allow_two_pay: true,
  allow_three_pay: false,
  payment_deadline: '2024-05-31',
  early_bird_deadline: '2024-03-01',
  early_bird_discount_cents: 2500,
  late_fee_cents: 2500,
  installment_fee_cents: 500,
  is_active: true,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
  created_by: 'user-uuid',
};

// Fee with season info
const feeWithSeason: SeasonFeeWithSeason = {
  ...fee,
  seasons: {
    id: 'season-uuid',
    name: 'Spring 2024',
    start_date: '2024-03-01',
    end_date: '2024-06-30',
  },
};
```

### Create/Update Params
```typescript
import type {
  CreateSeasonFeeParams,
  UpdateSeasonFeeParams
} from '@/lib/payments/types';

// Create params
const createParams: CreateSeasonFeeParams = {
  leagueId: 'league-uuid',
  seasonId: 'season-uuid',
  name: 'Registration Fee',
  amountCents: 15000,
  // Optional fields
  description: 'Season fee',
  currency: 'usd',
  allowFullPayment: true,
  allowTwoPay: true,
  allowThreePay: false,
  paymentDeadline: '2024-05-31',
  earlyBirdDeadline: '2024-03-01',
  earlyBirdDiscountCents: 2500,
  lateFeeCents: 2500,
  installmentFeeCents: 500,
};

// Update params (all optional except feeId)
const updateParams: UpdateSeasonFeeParams = {
  feeId: 'fee-uuid',
  amountCents: 17500, // Only update amount
  isActive: false, // Deactivate fee
};
```

## 6. Integration with Stripe Checkout

### Create Payment Intent with Fee
```typescript
// This would be in your payment creation logic
async function createPaymentForFee(
  feeId: string,
  playerId: string,
  paymentPlan: 'full' | 'two_pay' | 'three_pay'
) {
  // Get fee details
  const feeResult = await getSeasonFee(feeId);
  if (!feeResult.success) throw new Error('Fee not found');

  const fee = feeResult.data;

  // Calculate amount based on plan
  let amount = calculateTotal(fee);
  let installments = 1;

  if (paymentPlan === 'two_pay' && fee.allow_two_pay) {
    amount = amount + (fee.installment_fee_cents * 2);
    installments = 2;
  } else if (paymentPlan === 'three_pay' && fee.allow_three_pay) {
    amount = amount + (fee.installment_fee_cents * 3);
    installments = 3;
  }

  // Create player payment record
  const paymentResult = await createPlayerPayment({
    playerId,
    seasonFeeId: feeId,
    paymentPlan,
  });

  if (!paymentResult.success) throw new Error('Failed to create payment');

  // Create Stripe checkout session...
  // (implementation depends on your Stripe setup)
}
```

## 7. Testing Examples

### Unit Test - Fee Calculation
```typescript
import { describe, it, expect } from 'vitest';

describe('Fee Calculations', () => {
  it('should apply early bird discount when before deadline', () => {
    const fee: SeasonFee = {
      amount_cents: 15000,
      early_bird_deadline: new Date(Date.now() + 86400000).toISOString(), // Tomorrow
      early_bird_discount_cents: 2500,
      // ... other fields
    };

    const total = calculateTotal(fee);
    expect(total).toBe(12500); // $150 - $25 = $125
  });

  it('should apply late fee when after deadline', () => {
    const fee: SeasonFee = {
      amount_cents: 15000,
      payment_deadline: new Date(Date.now() - 86400000).toISOString(), // Yesterday
      late_fee_cents: 2500,
      // ... other fields
    };

    const total = calculateTotal(fee);
    expect(total).toBe(17500); // $150 + $25 = $175
  });

  it('should calculate installment amounts correctly', () => {
    const result = calculateInstallments(15000, 2, 500);
    expect(result.total).toBe(16000); // $150 + $5*2 = $160
    expect(result.perPayment).toBe(8000); // $80 per payment
  });
});
```

### Integration Test - Create Fee
```typescript
import { describe, it, expect } from 'vitest';
import { createSeasonFee } from '@/lib/payments/fee-actions';

describe('Fee Actions', () => {
  it('should create a fee successfully', async () => {
    const result = await createSeasonFee({
      leagueId: 'test-league',
      seasonId: 'test-season',
      name: 'Test Fee',
      amountCents: 10000,
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.amount_cents).toBe(10000);
      expect(result.data.name).toBe('Test Fee');
    }
  });

  it('should validate required fields', async () => {
    const result = await createSeasonFee({
      leagueId: 'test-league',
      seasonId: 'test-season',
      name: '',
      amountCents: 0,
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain('required');
    }
  });
});
```

## 8. Error Handling Patterns

### Graceful Degradation
```typescript
export function SeasonFeesSection({ leagueId, seasonId }: Props) {
  const [fees, setFees] = useState<SeasonFeeWithSeason[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadFees();
  }, [leagueId, seasonId]);

  async function loadFees() {
    try {
      setIsLoading(true);
      const result = await getSeasonFees(leagueId, { seasonId });

      if (result.success) {
        setFees(result.data);
        setError(null);
      } else {
        setError(result.error);
      }
    } catch (err) {
      setError('An unexpected error occurred');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }

  if (isLoading) {
    return <div>Loading fees...</div>;
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 text-red-700 rounded">
        Error: {error}
        <button onClick={loadFees} className="ml-4 underline">
          Retry
        </button>
      </div>
    );
  }

  return <SeasonFeeManager /* ... */ />;
}
```

This comprehensive set of code examples should help developers understand how to use and integrate the season fee configuration system.
