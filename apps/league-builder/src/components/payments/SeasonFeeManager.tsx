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
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { Plus, Edit, Trash2, DollarSign, Calendar, AlertCircle, Info, Users } from 'lucide-react';
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
  updateSeasonFeeCollectionModel,
} from '@/lib/payments/fee-actions';
import type { FeeBasis, SeasonFeeWithSeason } from '@/lib/payments/types';

// ============================================================================
// Types
// ============================================================================

type FeeCollectionModel = 'individual' | 'team' | 'hybrid';

interface SeasonFeeManagerProps {
  leagueId: string;
  seasonId: string;
  seasonName: string;
  initialFees?: SeasonFeeWithSeason[];
  initialFeeCollectionModel?: FeeCollectionModel;
  billingHref?: string;
}

interface FeeFormData {
  name: string;
  description: string;
  amountCents: number;
  feeBasis: FeeBasis;
  defaultPlayerContributionCents: number;
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
  feeBasis: 'player',
  defaultPlayerContributionCents: 0,
  currency: 'cad',
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

function formatCurrency(cents: number, currency: string = 'cad'): string {
  const symbol = currency === 'cad' ? 'CA$' : '$';
  return `${symbol}${centsToDollars(cents)}`;
}

function getFeeAmountLabel(
  feeCollectionModel: FeeCollectionModel,
  feeBasis: FeeBasis
): string {
  if (feeCollectionModel === 'individual') {
    return 'Per-player registration fee';
  }

  return feeBasis === 'team' ? 'Flat team fee' : 'Per-player rate billed through team invoices';
}

// ============================================================================
// Main Component
// ============================================================================

export function SeasonFeeManager({
  leagueId,
  seasonId,
  seasonName,
  initialFees = [],
  initialFeeCollectionModel = 'individual',
  billingHref,
}: SeasonFeeManagerProps) {
  const t = useTranslations('payments.seasonFee');
  const [fees, setFees] = React.useState<SeasonFeeWithSeason[]>(initialFees);
  const [feeCollectionModel, setFeeCollectionModel] = React.useState<FeeCollectionModel>(initialFeeCollectionModel);
  const [isDialogOpen, setIsDialogOpen] = React.useState(false);
  const [editingFee, setEditingFee] = React.useState<SeasonFeeWithSeason | null>(null);
  const [formData, setFormData] = React.useState<FeeFormData>(initialFormData);
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  // Display values for dollar inputs
  const [amountDisplay, setAmountDisplay] = React.useState('0.00');
  const [defaultContributionDisplay, setDefaultContributionDisplay] =
    React.useState('0.00');
  const [earlyBirdDisplay, setEarlyBirdDisplay] = React.useState('0.00');
  const [lateFeeDisplay, setLateFeeDisplay] = React.useState('0.00');
  const [installmentFeeDisplay, setInstallmentFeeDisplay] = React.useState('0.00');

  // Load fees on mount
  React.useEffect(() => {
    loadFees();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- loadFees is a data-fetching function that depends on leagueId and seasonId; also called after CRUD operations
  }, [leagueId, seasonId]);

  React.useEffect(() => {
    if (feeCollectionModel === 'individual' && formData.feeBasis !== 'player') {
      setFormData((current) => ({ ...current, feeBasis: 'player' }));
    }
  }, [feeCollectionModel, formData.feeBasis]);

  React.useEffect(() => {
    if (
      formData.feeBasis === 'team' &&
      (!formData.allowFullPayment || formData.allowTwoPay || formData.allowThreePay)
    ) {
      setFormData((current) => ({
        ...current,
        allowFullPayment: true,
        allowTwoPay: false,
        allowThreePay: false,
        installmentFeeCents: 0,
      }));
      setInstallmentFeeDisplay('0.00');
    }
  }, [
    formData.allowFullPayment,
    formData.allowThreePay,
    formData.allowTwoPay,
    formData.feeBasis,
  ]);

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
    setDefaultContributionDisplay('0.00');
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
      feeBasis: fee.fee_basis || 'player',
      defaultPlayerContributionCents: fee.default_player_contribution_cents || 0,
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
    setDefaultContributionDisplay(
      centsToDollars(fee.default_player_contribution_cents || 0)
    );
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
      setError(t('feeNameRequired'));
      return;
    }

    if (formData.amountCents <= 0) {
      setError(t('baseAmountRequired'));
      return;
    }

    if (formData.feeBasis === 'team') {
      if (formData.defaultPlayerContributionCents < 0) {
        setError('Default player contribution cannot be negative.');
        return;
      }

      if (formData.defaultPlayerContributionCents > formData.amountCents) {
        setError('Default player contribution cannot exceed the flat team fee.');
        return;
      }
    }

    if (!formData.allowFullPayment && !formData.allowTwoPay && !formData.allowThreePay) {
      setError(t('atLeastOnePlan'));
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
    if (!confirm(t('deleteConfirm'))) {
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

  const handleFeeCollectionModelChange = async (value: string) => {
    const model = value as FeeCollectionModel;
    const previousModel = feeCollectionModel;
    setFeeCollectionModel(model);
    setIsLoading(true);
    try {
      const result = await updateSeasonFeeCollectionModel(leagueId, seasonId, model);

      if (!result.success) {
        // Revert on failure
        setFeeCollectionModel(previousModel);
        alert(result.error);
      }
    } catch {
      setFeeCollectionModel(previousModel);
      alert('Failed to update fee collection model.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Fee Collection Model */}
      <Card className="bg-neutral-800/50 border-neutral-700">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-rink-400" />
            <CardTitle className="text-lg text-white">
              Fee Collection Model
            </CardTitle>
          </div>
          <CardDescription>
            Choose how registration fees are collected for this season.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Select
            value={feeCollectionModel}
            onValueChange={handleFeeCollectionModelChange}
            disabled={isLoading}
          >
            <SelectTrigger className="w-full md:w-80">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="individual">Individual Players</SelectItem>
              <SelectItem value="team">Team Billing</SelectItem>
              <SelectItem value="hybrid">Hybrid (Team + Individual)</SelectItem>
            </SelectContent>
          </Select>

          {(feeCollectionModel === 'team' || feeCollectionModel === 'hybrid') && (
            <div className="flex items-start gap-2 p-3 mt-4 bg-rink-500/10 border border-rink-500/20 rounded-lg">
              <Info className="w-4 h-4 text-rink-400 mt-0.5 shrink-0" />
              <div className="space-y-2">
                <p className="text-sm text-rink-300">
                  Team billing is enabled. Generate team invoices from the league billing page.
                </p>
                {billingHref ? (
                  <Button asChild size="sm" variant="secondary" className="bg-white/10 text-white hover:bg-white/15">
                    <Link href={billingHref}>Open League Billing</Link>
                  </Button>
                ) : null}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">{t('title')}</h2>
          <p className="text-sm text-neutral-400 mt-1">
            {t('description', { seasonName })}
          </p>
        </div>
        <Button onClick={openCreateDialog} disabled={isLoading}>
          <Plus className="w-4 h-4 mr-2" />
          {t('addFee')}
        </Button>
      </div>

      {/* Fees List */}
      {fees.length === 0 ? (
        <Card className="bg-neutral-800/50 border-neutral-700">
          <CardContent className="py-12">
            <div className="text-center">
              <DollarSign className="w-12 h-12 text-neutral-600 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-white mb-2">{t('noFees')}</h3>
              <p className="text-sm text-neutral-400 mb-4">
                {t('noFeesDescription')}
              </p>
              <Button onClick={openCreateDialog} variant="outline">
                <Plus className="w-4 h-4 mr-2" />
                {t('createFee')}
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
                          {t('inactive')}
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
                        <span className="text-sm text-neutral-400">{t('baseAmount')}</span>
                    <span className="text-lg font-bold text-white text-right">
                      {formatCurrency(fee.amount_cents, fee.currency)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-sm">
                    <span className="text-neutral-500">Fee basis</span>
                    <span className="text-neutral-300">
                      {getFeeAmountLabel(feeCollectionModel, fee.fee_basis || 'player')}
                    </span>
                  </div>

                  {(fee.fee_basis || 'player') === 'team' && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-neutral-500">Default player contribution</span>
                      <span className="text-neutral-300">
                        {fee.default_player_contribution_cents > 0
                          ? formatCurrency(
                              fee.default_player_contribution_cents,
                              fee.currency
                            )
                          : 'No default target'}
                      </span>
                    </div>
                  )}

                  {fee.early_bird_discount_cents > 0 && fee.early_bird_deadline && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-green-400">{t('earlyBird')}</span>
                      <span className="text-green-400">
                        {t('earlyBirdUntil', { amount: formatCurrency(fee.early_bird_discount_cents, fee.currency), date: new Date(fee.early_bird_deadline).toLocaleDateString() })}
                      </span>
                    </div>
                  )}

                  {fee.late_fee_cents > 0 && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-orange-400">{t('lateFee')}</span>
                      <span className="text-orange-400">
                        +{formatCurrency(fee.late_fee_cents, fee.currency)}
                      </span>
                    </div>
                  )}

                  <div className="pt-2 border-t border-neutral-700">
                    <div className="text-xs text-neutral-500 mb-2">{t('paymentPlans')}</div>
                    <div className="flex flex-wrap gap-2">
                      {fee.allow_full_payment && (
                        <span className="px-2 py-1 bg-rink-500/10 text-rink-400 text-xs rounded">
                          {t('fullPayment')}
                        </span>
                      )}
                      {fee.allow_two_pay && (
                        <span className="px-2 py-1 bg-rink-500/10 text-rink-400 text-xs rounded">
                          {t('twoPayments')}
                        </span>
                      )}
                      {fee.allow_three_pay && (
                        <span className="px-2 py-1 bg-rink-500/10 text-rink-400 text-xs rounded">
                          {t('threePayments')}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="pt-2 flex items-center justify-between">
                    <span className="text-xs text-neutral-500">{t('active')}</span>
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
              {editingFee ? t('editFee') : t('createRegistrationFee')}
            </DialogTitle>
            <DialogDescription>
              {t('dialogDescription')}
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
                  {t('feeName')} <span className="text-red-400">*</span>
                </label>
                <Input
                  placeholder={t('feeNamePlaceholder')}
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>

              <div>
                <label className="text-sm font-medium text-white mb-2 block">
                  {t('descriptionOptional')}
                </label>
                <Input
                  placeholder={t('descriptionPlaceholder')}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-white mb-2 block">
                    {t('baseAmount')} <span className="text-red-400">*</span>
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
                  <p className="text-xs text-neutral-500 mt-1">
                    {getFeeAmountLabel(feeCollectionModel, formData.feeBasis)}
                  </p>
                </div>

                <div>
                  <label className="text-sm font-medium text-white mb-2 block">{t('currency')}</label>
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
                      <SelectItem value="cad">CAD (CA$)</SelectItem>
                      <SelectItem value="usd">USD ($)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {feeCollectionModel !== 'individual' && (
                <div>
                  <label className="text-sm font-medium text-white mb-2 block">
                    Fee basis
                  </label>
                  <Select
                    value={formData.feeBasis}
                    onValueChange={(value) =>
                      setFormData({ ...formData, feeBasis: value as FeeBasis })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="player">Per-player fee</SelectItem>
                      <SelectItem value="team">Flat team fee</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-neutral-500 mt-2">
                    Per-player fees let each team invoice grow with roster size. Flat team fees
                    create one invoice per team regardless of player count.
                  </p>
                  {feeCollectionModel === 'hybrid' && formData.feeBasis === 'team' && (
                    <p className="text-xs text-amber-400 mt-2">
                      Hybrid plus a flat team fee keeps one master team invoice while still
                      allowing player contributions to reduce that balance.
                    </p>
                  )}
                </div>
              )}

              {formData.feeBasis === 'team' && (
                <div>
                  <label className="text-sm font-medium text-white mb-2 block">
                    Default player contribution
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
                      value={defaultContributionDisplay}
                      onChange={(e) => {
                        setDefaultContributionDisplay(e.target.value);
                        setFormData({
                          ...formData,
                          defaultPlayerContributionCents: dollarsToCents(e.target.value),
                        });
                      }}
                      className="pl-7"
                    />
                  </div>
                  <p className="text-xs text-neutral-500 mt-1">
                    Assigned players start with this contribution target by default. Captains and
                    league admins can adjust it per player without changing the master team invoice.
                  </p>
                </div>
              )}
            </div>

            {/* Payment Plans */}
            <div className="space-y-3">
              <label className="text-sm font-medium text-white">{t('paymentPlans')}</label>
              {formData.feeBasis === 'team' ? (
                <div className="bg-neutral-800/50 p-4 rounded-lg">
                  <p className="text-sm text-neutral-300">
                    Flat team fees create one team invoice. Team chunk payments, player online
                    contributions, and offline EMT/cash/check entries all reduce the same balance.
                    Player installment plans do not apply to this setup.
                  </p>
                </div>
              ) : (
                <div className="bg-neutral-800/50 p-4 rounded-lg space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-neutral-300">{t('fullPayment')}</span>
                    <Switch
                      checked={formData.allowFullPayment}
                      onCheckedChange={(checked) =>
                        setFormData({ ...formData, allowFullPayment: checked })
                      }
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-neutral-300">{t('twoPayments')}</span>
                    <Switch
                      checked={formData.allowTwoPay}
                      onCheckedChange={(checked) =>
                        setFormData({ ...formData, allowTwoPay: checked })
                      }
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-neutral-300">{t('threePayments')}</span>
                    <Switch
                      checked={formData.allowThreePay}
                      onCheckedChange={(checked) =>
                        setFormData({ ...formData, allowThreePay: checked })
                      }
                    />
                  </div>
                </div>
              )}
              {formData.feeBasis !== 'team' && (formData.allowTwoPay || formData.allowThreePay) ? (
                <div>
                  <label className="text-sm font-medium text-white mb-2 block">
                    {t('installmentFee')}
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
                    {t('installmentFeeDescription')}
                  </p>
                </div>
              ) : null}
            </div>

            {/* Deadlines */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-white mb-2 block">
                  {t('paymentDeadline')}
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
                  {t('earlyBirdDeadline')}
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
                  {t('earlyBirdDiscount')}
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
                <label className="text-sm font-medium text-white mb-2 block">{t('lateFee')}</label>
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
                {t('lateFeesInfo')}
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)} disabled={isLoading}>
              {t('cancel')}
            </Button>
            <Button onClick={handleSave} disabled={isLoading}>
              {isLoading ? t('saving') : editingFee ? t('updateFee') : t('createFee')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
