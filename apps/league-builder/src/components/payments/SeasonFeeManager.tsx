'use client';

/**
 * Season Fee Manager Component
 *
 * Admin interface for managing season registration fees:
 * - Display existing fees
 * - Create/edit/delete fees
 * - Configure payment plans and discounts
 */

import * as React from 'react';
import { Plus, Edit, Trash2, DollarSign, Calendar, AlertCircle, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@hockey-life/ui';
import {
  createSeasonFee,
  updateSeasonFee,
  deleteSeasonFee,
  getSeasonFees,
} from '@/lib/payments/fee-actions';
import type { SeasonFeeWithSeason } from '@/lib/payments/types';

// ============================================================================
// Types
// ============================================================================

interface SeasonFeeManagerProps {
  leagueId: string;
  seasonId: string;
  seasonName: string;
  initialFees?: SeasonFeeWithSeason[];
}

interface FeeFormData {
  name: string;
  description: string;
  amountCents: number;
  currency: 'usd' | 'cad';
  allowFullPayment: boolean;
  allowTwoPay: boolean;
  allowThreePay: boolean;
  paymentDeadline: string;
  earlyBirdDeadline: string;
  earlyBirdDiscountCents: number;
  lateFeeCents: number;
  installmentFeeCents: number;
}

const initialFormData: FeeFormData = {
  name: '',
  description: '',
  amountCents: 0,
  currency: 'usd',
  allowFullPayment: true,
  allowTwoPay: false,
  allowThreePay: false,
  paymentDeadline: '',
  earlyBirdDeadline: '',
  earlyBirdDiscountCents: 0,
  lateFeeCents: 0,
  installmentFeeCents: 0,
};

// ============================================================================
// Helper Functions
// ============================================================================

function centsToDollars(cents: number): string {
  return (cents / 100).toFixed(2);
}

function dollarsToCents(dollars: string): number {
  const parsed = parseFloat(dollars);
  if (isNaN(parsed)) return 0;
  return Math.round(parsed * 100);
}

function formatCurrency(cents: number, currency: string = 'usd'): string {
  const symbol = currency === 'cad' ? 'CA$' : '$';
  return `${symbol}${centsToDollars(cents)}`;
}

// ============================================================================
// Main Component
// ============================================================================

export function SeasonFeeManager({
  leagueId,
  seasonId,
  seasonName,
  initialFees = [],
}: SeasonFeeManagerProps) {
  const [fees, setFees] = React.useState<SeasonFeeWithSeason[]>(initialFees);
  const [isDialogOpen, setIsDialogOpen] = React.useState(false);
  const [editingFee, setEditingFee] = React.useState<SeasonFeeWithSeason | null>(null);
  const [formData, setFormData] = React.useState<FeeFormData>(initialFormData);
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  // Display values for dollar inputs
  const [amountDisplay, setAmountDisplay] = React.useState('0.00');
  const [earlyBirdDisplay, setEarlyBirdDisplay] = React.useState('0.00');
  const [lateFeeDisplay, setLateFeeDisplay] = React.useState('0.00');
  const [installmentFeeDisplay, setInstallmentFeeDisplay] = React.useState('0.00');

  // Load fees on mount
  React.useEffect(() => {
    loadFees();
  }, [leagueId, seasonId]);

  const loadFees = async () => {
    const result = await getSeasonFees(leagueId, { seasonId });
    if (result.success) {
      setFees(result.data);
    }
  };

  const openCreateDialog = () => {
    setEditingFee(null);
    setFormData(initialFormData);
    setAmountDisplay('0.00');
    setEarlyBirdDisplay('0.00');
    setLateFeeDisplay('0.00');
    setInstallmentFeeDisplay('0.00');
    setError(null);
    setIsDialogOpen(true);
  };

  const openEditDialog = (fee: SeasonFeeWithSeason) => {
    setEditingFee(fee);
    setFormData({
      name: fee.name,
      description: fee.description || '',
      amountCents: fee.amount_cents,
      currency: fee.currency as 'usd' | 'cad',
      allowFullPayment: fee.allow_full_payment,
      allowTwoPay: fee.allow_two_pay,
      allowThreePay: fee.allow_three_pay,
      paymentDeadline: fee.payment_deadline || '',
      earlyBirdDeadline: fee.early_bird_deadline || '',
      earlyBirdDiscountCents: fee.early_bird_discount_cents,
      lateFeeCents: fee.late_fee_cents,
      installmentFeeCents: fee.installment_fee_cents,
    });
    setAmountDisplay(centsToDollars(fee.amount_cents));
    setEarlyBirdDisplay(centsToDollars(fee.early_bird_discount_cents));
    setLateFeeDisplay(centsToDollars(fee.late_fee_cents));
    setInstallmentFeeDisplay(centsToDollars(fee.installment_fee_cents));
    setError(null);
    setIsDialogOpen(true);
  };

  const handleSave = async () => {
    setError(null);

    // Validation
    if (!formData.name.trim()) {
      setError('Fee name is required');
      return;
    }

    if (formData.amountCents <= 0) {
      setError('Fee amount must be greater than $0');
      return;
    }

    if (!formData.allowFullPayment && !formData.allowTwoPay && !formData.allowThreePay) {
      setError('At least one payment plan must be enabled');
      return;
    }

    setIsLoading(true);

    try {
      if (editingFee) {
        // Update existing fee
        const result = await updateSeasonFee({
          feeId: editingFee.id,
          ...formData,
        });

        if (result.success) {
          await loadFees();
          setIsDialogOpen(false);
        } else {
          setError(result.error);
        }
      } else {
        // Create new fee
        const result = await createSeasonFee({
          leagueId,
          seasonId,
          ...formData,
        });

        if (result.success) {
          await loadFees();
          setIsDialogOpen(false);
        } else {
          setError(result.error);
        }
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (feeId: string) => {
    if (!confirm('Are you sure you want to delete this fee? This action cannot be undone.')) {
      return;
    }

    setIsLoading(true);
    const result = await deleteSeasonFee(feeId);
    setIsLoading(false);

    if (result.success) {
      await loadFees();
    } else {
      alert(result.error);
    }
  };

  const toggleActive = async (fee: SeasonFeeWithSeason) => {
    setIsLoading(true);
    const result = await updateSeasonFee({
      feeId: fee.id,
      isActive: !fee.is_active,
    });
    setIsLoading(false);

    if (result.success) {
      await loadFees();
    } else {
      alert(result.error);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">Registration Fees</h2>
          <p className="text-sm text-neutral-400 mt-1">
            Configure player registration fees for {seasonName}
          </p>
        </div>
        <Button onClick={openCreateDialog} disabled={isLoading}>
          <Plus className="w-4 h-4 mr-2" />
          Add Fee
        </Button>
      </div>

      {/* Fees List */}
      {fees.length === 0 ? (
        <Card className="bg-neutral-800/50 border-neutral-700">
          <CardContent className="py-12">
            <div className="text-center">
              <DollarSign className="w-12 h-12 text-neutral-600 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-white mb-2">No fees configured</h3>
              <p className="text-sm text-neutral-400 mb-4">
                Create your first registration fee to start collecting payments from players.
              </p>
              <Button onClick={openCreateDialog} variant="outline">
                <Plus className="w-4 h-4 mr-2" />
                Create Fee
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {fees.map((fee) => (
            <Card
              key={fee.id}
              className={cn(
                'bg-neutral-800/50 border-neutral-700',
                !fee.is_active && 'opacity-60'
              )}
            >
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <CardTitle className="text-lg text-white">{fee.name}</CardTitle>
                      {!fee.is_active && (
                        <span className="px-2 py-0.5 text-xs bg-neutral-700 text-neutral-400 rounded">
                          Inactive
                        </span>
                      )}
                    </div>
                    {fee.description && (
                      <CardDescription className="mt-1">{fee.description}</CardDescription>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => openEditDialog(fee)}
                      disabled={isLoading}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(fee.id)}
                      disabled={isLoading}
                    >
                      <Trash2 className="w-4 h-4 text-red-400" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-neutral-400">Base Amount</span>
                    <span className="text-lg font-bold text-white">
                      {formatCurrency(fee.amount_cents, fee.currency)}
                    </span>
                  </div>

                  {fee.early_bird_discount_cents > 0 && fee.early_bird_deadline && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-green-400">Early Bird</span>
                      <span className="text-green-400">
                        -{formatCurrency(fee.early_bird_discount_cents, fee.currency)} until{' '}
                        {new Date(fee.early_bird_deadline).toLocaleDateString()}
                      </span>
                    </div>
                  )}

                  {fee.late_fee_cents > 0 && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-orange-400">Late Fee</span>
                      <span className="text-orange-400">
                        +{formatCurrency(fee.late_fee_cents, fee.currency)}
                      </span>
                    </div>
                  )}

                  <div className="pt-2 border-t border-neutral-700">
                    <div className="text-xs text-neutral-500 mb-2">Payment Plans</div>
                    <div className="flex flex-wrap gap-2">
                      {fee.allow_full_payment && (
                        <span className="px-2 py-1 bg-rink-500/10 text-rink-400 text-xs rounded">
                          Full Payment
                        </span>
                      )}
                      {fee.allow_two_pay && (
                        <span className="px-2 py-1 bg-rink-500/10 text-rink-400 text-xs rounded">
                          2 Payments
                        </span>
                      )}
                      {fee.allow_three_pay && (
                        <span className="px-2 py-1 bg-rink-500/10 text-rink-400 text-xs rounded">
                          3 Payments
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="pt-2 flex items-center justify-between">
                    <span className="text-xs text-neutral-500">Active</span>
                    <Switch
                      checked={fee.is_active}
                      onCheckedChange={() => toggleActive(fee)}
                      disabled={isLoading}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingFee ? 'Edit Registration Fee' : 'Create Registration Fee'}
            </DialogTitle>
            <DialogDescription>
              Configure the registration fee details and payment options.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {error && (
              <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                <AlertCircle className="w-4 h-4 text-red-400" />
                <span className="text-sm text-red-400">{error}</span>
              </div>
            )}

            {/* Basic Info */}
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-white mb-2 block">
                  Fee Name <span className="text-red-400">*</span>
                </label>
                <Input
                  placeholder="e.g., Season Registration Fee"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>

              <div>
                <label className="text-sm font-medium text-white mb-2 block">
                  Description (Optional)
                </label>
                <Input
                  placeholder="Brief description of this fee"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-white mb-2 block">
                    Base Amount <span className="text-red-400">*</span>
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400">
                      $
                    </span>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="0.00"
                      value={amountDisplay}
                      onChange={(e) => {
                        setAmountDisplay(e.target.value);
                        setFormData({ ...formData, amountCents: dollarsToCents(e.target.value) });
                      }}
                      className="pl-7"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium text-white mb-2 block">Currency</label>
                  <Select
                    value={formData.currency}
                    onValueChange={(value) =>
                      setFormData({ ...formData, currency: value as 'usd' | 'cad' })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="usd">USD ($)</SelectItem>
                      <SelectItem value="cad">CAD (CA$)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Payment Plans */}
            <div className="space-y-3">
              <label className="text-sm font-medium text-white">Payment Plans</label>
              <div className="bg-neutral-800/50 p-4 rounded-lg space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-neutral-300">Full Payment</span>
                  <Switch
                    checked={formData.allowFullPayment}
                    onCheckedChange={(checked) =>
                      setFormData({ ...formData, allowFullPayment: checked })
                    }
                  />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-neutral-300">2 Payments</span>
                  <Switch
                    checked={formData.allowTwoPay}
                    onCheckedChange={(checked) =>
                      setFormData({ ...formData, allowTwoPay: checked })
                    }
                  />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-neutral-300">3 Payments</span>
                  <Switch
                    checked={formData.allowThreePay}
                    onCheckedChange={(checked) =>
                      setFormData({ ...formData, allowThreePay: checked })
                    }
                  />
                </div>
              </div>
              {formData.allowTwoPay || formData.allowThreePay ? (
                <div>
                  <label className="text-sm font-medium text-white mb-2 block">
                    Installment Fee (per payment)
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400">
                      $
                    </span>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="0.00"
                      value={installmentFeeDisplay}
                      onChange={(e) => {
                        setInstallmentFeeDisplay(e.target.value);
                        setFormData({
                          ...formData,
                          installmentFeeCents: dollarsToCents(e.target.value),
                        });
                      }}
                      className="pl-7"
                    />
                  </div>
                  <p className="text-xs text-neutral-500 mt-1">
                    Optional fee charged for each installment payment
                  </p>
                </div>
              ) : null}
            </div>

            {/* Deadlines */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-white mb-2 block">
                  Payment Deadline
                </label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" />
                  <Input
                    type="date"
                    value={formData.paymentDeadline}
                    onChange={(e) =>
                      setFormData({ ...formData, paymentDeadline: e.target.value })
                    }
                    className="pl-10"
                  />
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-white mb-2 block">
                  Early Bird Deadline
                </label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" />
                  <Input
                    type="date"
                    value={formData.earlyBirdDeadline}
                    onChange={(e) =>
                      setFormData({ ...formData, earlyBirdDeadline: e.target.value })
                    }
                    className="pl-10"
                  />
                </div>
              </div>
            </div>

            {/* Discounts & Fees */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-white mb-2 block">
                  Early Bird Discount
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400">
                    $
                  </span>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    value={earlyBirdDisplay}
                    onChange={(e) => {
                      setEarlyBirdDisplay(e.target.value);
                      setFormData({
                        ...formData,
                        earlyBirdDiscountCents: dollarsToCents(e.target.value),
                      });
                    }}
                    className="pl-7"
                  />
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-white mb-2 block">Late Fee</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400">
                    $
                  </span>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    value={lateFeeDisplay}
                    onChange={(e) => {
                      setLateFeeDisplay(e.target.value);
                      setFormData({
                        ...formData,
                        lateFeeCents: dollarsToCents(e.target.value),
                      });
                    }}
                    className="pl-7"
                  />
                </div>
              </div>
            </div>

            {/* Info Box */}
            <div className="flex items-start gap-2 p-3 bg-neutral-800/50 rounded-lg">
              <Info className="w-4 h-4 text-neutral-400 mt-0.5 shrink-0" />
              <p className="text-xs text-neutral-400">
                Late fees are automatically applied after the payment deadline. Early bird
                discounts apply before the early bird deadline.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)} disabled={isLoading}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={isLoading}>
              {isLoading ? 'Saving...' : editingFee ? 'Update Fee' : 'Create Fee'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
