'use client';

/**
 * Fee Configuration Form Component
 *
 * Form for league admins to create and edit season fee configurations.
 * Includes payment plan options, deadlines, and discount settings.
 */

import { useState, useEffect } from 'react';
import {
  DollarSign,
  Calendar,
  CreditCard,
  Gift,
  Clock,
  Info,
  Loader2,
  Save,
  X,
} from 'lucide-react';
import { createSeasonFee, updateSeasonFee } from '@/lib/payments/fee-actions';
import type { SeasonFee, CreateSeasonFeeParams, UpdateSeasonFeeParams } from '@/lib/payments/types';

interface FeeConfigurationFormProps {
  leagueId: string;
  seasonId: string;
  existingFee?: SeasonFee;
  onSuccess?: (fee: SeasonFee) => void;
  onCancel?: () => void;
}

interface FormData {
  name: string;
  description: string;
  amountDollars: string;
  allowFullPayment: boolean;
  allowTwoPay: boolean;
  allowThreePay: boolean;
  paymentDeadline: string;
  earlyBirdDeadline: string;
  earlyBirdDiscountDollars: string;
  lateFeeDollars: string;
  installmentFeeDollars: string;
}

const dollarsToCents = (dollars: string): number => {
  const parsed = parseFloat(dollars);
  return isNaN(parsed) ? 0 : Math.round(parsed * 100);
};

const centsToDollars = (cents: number): string => {
  return (cents / 100).toFixed(2);
};

export function FeeConfigurationForm({
  leagueId,
  seasonId,
  existingFee,
  onSuccess,
  onCancel,
}: FeeConfigurationFormProps) {
  const isEditing = !!existingFee;

  const [formData, setFormData] = useState<FormData>({
    name: '',
    description: '',
    amountDollars: '',
    allowFullPayment: true,
    allowTwoPay: false,
    allowThreePay: false,
    paymentDeadline: '',
    earlyBirdDeadline: '',
    earlyBirdDiscountDollars: '',
    lateFeeDollars: '',
    installmentFeeDollars: '',
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize form data from existing fee
  useEffect(() => {
    if (existingFee) {
      setFormData({
        name: existingFee.name,
        description: existingFee.description || '',
        amountDollars: centsToDollars(existingFee.amount_cents),
        allowFullPayment: existingFee.allow_full_payment,
        allowTwoPay: existingFee.allow_two_pay,
        allowThreePay: existingFee.allow_three_pay,
        paymentDeadline: existingFee.payment_deadline || '',
        earlyBirdDeadline: existingFee.early_bird_deadline || '',
        earlyBirdDiscountDollars: existingFee.early_bird_discount_cents
          ? centsToDollars(existingFee.early_bird_discount_cents)
          : '',
        lateFeeDollars: existingFee.late_fee_cents
          ? centsToDollars(existingFee.late_fee_cents)
          : '',
        installmentFeeDollars: existingFee.installment_fee_cents
          ? centsToDollars(existingFee.installment_fee_cents)
          : '',
      });
    }
  }, [existingFee]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value, type } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value,
    }));
  };

  const handleCheckboxChange = (name: keyof FormData) => {
    setFormData((prev) => ({
      ...prev,
      [name]: !prev[name],
    }));
  };

  const validateForm = (): string | null => {
    if (!formData.name.trim()) {
      return 'Fee name is required.';
    }
    if (!formData.amountDollars || dollarsToCents(formData.amountDollars) <= 0) {
      return 'Please enter a valid fee amount greater than $0.';
    }
    if (!formData.allowFullPayment && !formData.allowTwoPay && !formData.allowThreePay) {
      return 'At least one payment plan must be enabled.';
    }
    if (formData.earlyBirdDeadline && !formData.earlyBirdDiscountDollars) {
      return 'Early bird discount amount is required when deadline is set.';
    }
    if (formData.earlyBirdDiscountDollars && !formData.earlyBirdDeadline) {
      return 'Early bird deadline is required when discount is set.';
    }
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);

    try {
      if (isEditing && existingFee) {
        const params: UpdateSeasonFeeParams = {
          feeId: existingFee.id,
          name: formData.name,
          description: formData.description || undefined,
          amountCents: dollarsToCents(formData.amountDollars),
          allowFullPayment: formData.allowFullPayment,
          allowTwoPay: formData.allowTwoPay,
          allowThreePay: formData.allowThreePay,
          paymentDeadline: formData.paymentDeadline || undefined,
          earlyBirdDeadline: formData.earlyBirdDeadline || undefined,
          earlyBirdDiscountCents: dollarsToCents(formData.earlyBirdDiscountDollars) || undefined,
          lateFeeCents: dollarsToCents(formData.lateFeeDollars) || undefined,
          installmentFeeCents: dollarsToCents(formData.installmentFeeDollars) || undefined,
        };

        const result = await updateSeasonFee(params);

        if (result.success) {
          onSuccess?.(result.data);
        } else {
          setError(result.error);
        }
      } else {
        const params: CreateSeasonFeeParams = {
          leagueId,
          seasonId,
          name: formData.name,
          description: formData.description || undefined,
          amountCents: dollarsToCents(formData.amountDollars),
          allowFullPayment: formData.allowFullPayment,
          allowTwoPay: formData.allowTwoPay,
          allowThreePay: formData.allowThreePay,
          paymentDeadline: formData.paymentDeadline || undefined,
          earlyBirdDeadline: formData.earlyBirdDeadline || undefined,
          earlyBirdDiscountCents: dollarsToCents(formData.earlyBirdDiscountDollars) || undefined,
          lateFeeCents: dollarsToCents(formData.lateFeeDollars) || undefined,
          installmentFeeCents: dollarsToCents(formData.installmentFeeDollars) || undefined,
        };

        const result = await createSeasonFee(params);

        if (result.success) {
          onSuccess?.(result.data);
        } else {
          setError(result.error);
        }
      }
    } catch (err) {
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Calculate preview amounts
  const baseAmount = dollarsToCents(formData.amountDollars);
  const earlyBirdDiscount = dollarsToCents(formData.earlyBirdDiscountDollars);
  const lateFee = dollarsToCents(formData.lateFeeDollars);
  const installmentFee = dollarsToCents(formData.installmentFeeDollars);

  return (
    <div className="bg-neutral-800 border border-gold-500/20 rounded-2xl shadow-xl">
      {/* Header */}
      <div className="flex items-center justify-between p-6 border-b border-neutral-700">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gold-500/10 rounded-full flex items-center justify-center">
            <DollarSign className="h-5 w-5 text-gold-500" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-neutral-100">
              {isEditing ? 'Edit Season Fee' : 'Create Season Fee'}
            </h2>
            <p className="text-sm text-neutral-400">
              Configure payment options for players
            </p>
          </div>
        </div>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="p-2 text-neutral-400 hover:text-white hover:bg-neutral-700 rounded-lg transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        )}
      </div>

      <form onSubmit={handleSubmit} className="p-6 space-y-6">
        {/* Basic Info */}
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-neutral-300 uppercase tracking-wider flex items-center gap-2">
            <Info className="h-4 w-4" />
            Basic Information
          </h3>

          <div>
            <label htmlFor="name" className="block text-sm font-medium text-neutral-300 mb-2">
              Fee Name *
            </label>
            <input
              type="text"
              id="name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              required
              placeholder="e.g., Registration Fee, Tournament Fee"
              className="w-full px-4 py-3 bg-black/50 border border-gold-500/30 rounded-xl text-white placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-gold-500/50 focus:border-transparent transition-all"
            />
          </div>

          <div>
            <label htmlFor="description" className="block text-sm font-medium text-neutral-300 mb-2">
              Description
            </label>
            <textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleChange}
              rows={2}
              placeholder="Optional description of what this fee covers..."
              className="w-full px-4 py-3 bg-black/50 border border-gold-500/30 rounded-xl text-white placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-gold-500/50 focus:border-transparent transition-all resize-none"
            />
          </div>

          <div>
            <label htmlFor="amountDollars" className="block text-sm font-medium text-neutral-300 mb-2">
              Fee Amount *
            </label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400">$</span>
              <input
                type="number"
                id="amountDollars"
                name="amountDollars"
                value={formData.amountDollars}
                onChange={handleChange}
                required
                min="0.01"
                step="0.01"
                placeholder="0.00"
                className="w-full pl-8 pr-4 py-3 bg-black/50 border border-gold-500/30 rounded-xl text-white placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-gold-500/50 focus:border-transparent transition-all"
              />
            </div>
          </div>
        </div>

        {/* Payment Plans */}
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-neutral-300 uppercase tracking-wider flex items-center gap-2">
            <CreditCard className="h-4 w-4" />
            Payment Plans
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <button
              type="button"
              onClick={() => handleCheckboxChange('allowFullPayment')}
              className={`p-4 rounded-xl border text-left transition-all ${
                formData.allowFullPayment
                  ? 'bg-gold-500/10 border-gold-500/50'
                  : 'bg-neutral-900/50 border-neutral-700 hover:border-gold-500/30'
              }`}
            >
              <div className="flex items-center gap-3">
                <div
                  className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                    formData.allowFullPayment
                      ? 'bg-gold-500 border-gold-500'
                      : 'border-neutral-500'
                  }`}
                >
                  {formData.allowFullPayment && (
                    <svg className="w-3 h-3 text-black" fill="currentColor" viewBox="0 0 12 12">
                      <path d="M10.28 2.28L3.989 8.575 1.695 6.28A1 1 0 00.28 7.695l3 3a1 1 0 001.414 0l7-7A1 1 0 0010.28 2.28z" />
                    </svg>
                  )}
                </div>
                <div>
                  <p className={`font-medium ${formData.allowFullPayment ? 'text-gold-500' : 'text-neutral-300'}`}>
                    Full Payment
                  </p>
                  <p className="text-xs text-neutral-500">Pay in one installment</p>
                </div>
              </div>
            </button>

            <button
              type="button"
              onClick={() => handleCheckboxChange('allowTwoPay')}
              className={`p-4 rounded-xl border text-left transition-all ${
                formData.allowTwoPay
                  ? 'bg-gold-500/10 border-gold-500/50'
                  : 'bg-neutral-900/50 border-neutral-700 hover:border-gold-500/30'
              }`}
            >
              <div className="flex items-center gap-3">
                <div
                  className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                    formData.allowTwoPay
                      ? 'bg-gold-500 border-gold-500'
                      : 'border-neutral-500'
                  }`}
                >
                  {formData.allowTwoPay && (
                    <svg className="w-3 h-3 text-black" fill="currentColor" viewBox="0 0 12 12">
                      <path d="M10.28 2.28L3.989 8.575 1.695 6.28A1 1 0 00.28 7.695l3 3a1 1 0 001.414 0l7-7A1 1 0 0010.28 2.28z" />
                    </svg>
                  )}
                </div>
                <div>
                  <p className={`font-medium ${formData.allowTwoPay ? 'text-gold-500' : 'text-neutral-300'}`}>
                    2-Pay Plan
                  </p>
                  <p className="text-xs text-neutral-500">Split into 2 payments</p>
                </div>
              </div>
            </button>

            <button
              type="button"
              onClick={() => handleCheckboxChange('allowThreePay')}
              className={`p-4 rounded-xl border text-left transition-all ${
                formData.allowThreePay
                  ? 'bg-gold-500/10 border-gold-500/50'
                  : 'bg-neutral-900/50 border-neutral-700 hover:border-gold-500/30'
              }`}
            >
              <div className="flex items-center gap-3">
                <div
                  className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                    formData.allowThreePay
                      ? 'bg-gold-500 border-gold-500'
                      : 'border-neutral-500'
                  }`}
                >
                  {formData.allowThreePay && (
                    <svg className="w-3 h-3 text-black" fill="currentColor" viewBox="0 0 12 12">
                      <path d="M10.28 2.28L3.989 8.575 1.695 6.28A1 1 0 00.28 7.695l3 3a1 1 0 001.414 0l7-7A1 1 0 0010.28 2.28z" />
                    </svg>
                  )}
                </div>
                <div>
                  <p className={`font-medium ${formData.allowThreePay ? 'text-gold-500' : 'text-neutral-300'}`}>
                    3-Pay Plan
                  </p>
                  <p className="text-xs text-neutral-500">Split into 3 payments</p>
                </div>
              </div>
            </button>
          </div>

          {(formData.allowTwoPay || formData.allowThreePay) && (
            <div>
              <label htmlFor="installmentFeeDollars" className="block text-sm font-medium text-neutral-300 mb-2">
                Installment Fee (per payment plan)
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400">$</span>
                <input
                  type="number"
                  id="installmentFeeDollars"
                  name="installmentFeeDollars"
                  value={formData.installmentFeeDollars}
                  onChange={handleChange}
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  className="w-full pl-8 pr-4 py-3 bg-black/50 border border-gold-500/30 rounded-xl text-white placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-gold-500/50 focus:border-transparent transition-all"
                />
              </div>
              <p className="mt-1 text-xs text-neutral-500">
                Extra fee added when player chooses payment plan instead of paying in full
              </p>
            </div>
          )}
        </div>

        {/* Deadlines */}
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-neutral-300 uppercase tracking-wider flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Deadlines
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="paymentDeadline" className="block text-sm font-medium text-neutral-300 mb-2">
                Payment Deadline
              </label>
              <input
                type="date"
                id="paymentDeadline"
                name="paymentDeadline"
                value={formData.paymentDeadline}
                onChange={handleChange}
                className="w-full px-4 py-3 bg-black/50 border border-gold-500/30 rounded-xl text-white placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-gold-500/50 focus:border-transparent transition-all"
              />
              <p className="mt-1 text-xs text-neutral-500">
                After this date, late fees apply
              </p>
            </div>

            <div>
              <label htmlFor="lateFeeDollars" className="block text-sm font-medium text-neutral-300 mb-2">
                Late Fee
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400">$</span>
                <input
                  type="number"
                  id="lateFeeDollars"
                  name="lateFeeDollars"
                  value={formData.lateFeeDollars}
                  onChange={handleChange}
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  className="w-full pl-8 pr-4 py-3 bg-black/50 border border-gold-500/30 rounded-xl text-white placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-gold-500/50 focus:border-transparent transition-all"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Early Bird */}
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-neutral-300 uppercase tracking-wider flex items-center gap-2">
            <Gift className="h-4 w-4" />
            Early Bird Discount
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="earlyBirdDeadline" className="block text-sm font-medium text-neutral-300 mb-2">
                Early Bird Deadline
              </label>
              <input
                type="date"
                id="earlyBirdDeadline"
                name="earlyBirdDeadline"
                value={formData.earlyBirdDeadline}
                onChange={handleChange}
                className="w-full px-4 py-3 bg-black/50 border border-gold-500/30 rounded-xl text-white placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-gold-500/50 focus:border-transparent transition-all"
              />
              <p className="mt-1 text-xs text-neutral-500">
                Pay before this date for discount
              </p>
            </div>

            <div>
              <label htmlFor="earlyBirdDiscountDollars" className="block text-sm font-medium text-neutral-300 mb-2">
                Discount Amount
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400">$</span>
                <input
                  type="number"
                  id="earlyBirdDiscountDollars"
                  name="earlyBirdDiscountDollars"
                  value={formData.earlyBirdDiscountDollars}
                  onChange={handleChange}
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  className="w-full pl-8 pr-4 py-3 bg-black/50 border border-gold-500/30 rounded-xl text-white placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-gold-500/50 focus:border-transparent transition-all"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Preview */}
        {baseAmount > 0 && (
          <div className="bg-neutral-900/50 border border-neutral-700 rounded-xl p-4">
            <h4 className="text-sm font-medium text-neutral-300 mb-3 flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Payment Preview
            </h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-neutral-400">Base Fee</span>
                <span className="text-white">${(baseAmount / 100).toFixed(2)}</span>
              </div>
              {earlyBirdDiscount > 0 && (
                <div className="flex justify-between text-green-400">
                  <span>Early Bird Discount</span>
                  <span>-${(earlyBirdDiscount / 100).toFixed(2)}</span>
                </div>
              )}
              {lateFee > 0 && (
                <div className="flex justify-between text-red-400">
                  <span>Late Fee (after deadline)</span>
                  <span>+${(lateFee / 100).toFixed(2)}</span>
                </div>
              )}
              {installmentFee > 0 && (formData.allowTwoPay || formData.allowThreePay) && (
                <div className="flex justify-between text-amber-400">
                  <span>Installment Plan Fee</span>
                  <span>+${(installmentFee / 100).toFixed(2)}</span>
                </div>
              )}
              <div className="border-t border-neutral-700 pt-2 mt-2">
                <div className="flex justify-between font-semibold">
                  <span className="text-neutral-300">Standard Total</span>
                  <span className="text-gold-500">${(baseAmount / 100).toFixed(2)}</span>
                </div>
                {earlyBirdDiscount > 0 && (
                  <div className="flex justify-between text-xs">
                    <span className="text-neutral-500">Early Bird Total</span>
                    <span className="text-green-400">
                      ${((baseAmount - earlyBirdDiscount) / 100).toFixed(2)}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-3">
            <p className="text-sm text-red-400">{error}</p>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3 pt-2">
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              disabled={loading}
              className="flex-1 py-3 px-6 border border-neutral-600 text-neutral-300 font-medium rounded-xl hover:bg-neutral-700/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
          )}
          <button
            type="submit"
            disabled={loading}
            className="flex-1 py-3 px-6 bg-gradient-to-r from-gold-500 to-gold-600 text-black font-semibold rounded-xl hover:shadow-[0_0_40px_rgba(212,175,55,0.2)] hover:scale-[1.02] transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                {isEditing ? 'Updating...' : 'Creating...'}
              </>
            ) : (
              <>
                <Save className="w-5 h-5" />
                {isEditing ? 'Update Fee' : 'Create Fee'}
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}

export default FeeConfigurationForm;
