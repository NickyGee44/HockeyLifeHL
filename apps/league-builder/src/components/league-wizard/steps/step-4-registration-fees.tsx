'use client';

import * as React from 'react';
import { useFormContext } from 'react-hook-form';
import {
  DollarSign,
  Calendar,
  Clock,
  Info,
  Percent,
  CreditCard,
  Gift,
  AlertTriangle,
} from 'lucide-react';
import {
  Input,
  Textarea,
  FormField,
  Card,
  CardContent,
} from '@hockey-life/ui';
import { Switch } from '@/components/ui/switch';
import { WizardStepContainer } from '../../ui/wizard/wizard-steps';
import type { WizardFormData } from '@/lib/schemas/league-wizard';

// Helper function to convert cents to dollars for display
function centsToDollars(cents: number): string {
  return (cents / 100).toFixed(2);
}

// Helper function to convert dollars to cents for storage
function dollarsToCents(dollars: string): number {
  const parsed = parseFloat(dollars);
  if (isNaN(parsed)) return 0;
  return Math.round(parsed * 100);
}

export function Step4RegistrationFees() {
  const {
    register,
    formState: { errors },
    setValue,
    watch,
  } = useFormContext<WizardFormData>();

  // Watch all relevant fields
  const enablePaidRegistration = watch('enablePaidRegistration');
  const registrationFee = watch('registrationFee') || 0;
  const earlyBirdDiscount = watch('earlyBirdDiscount') || {
    enabled: false,
    amount: 0,
    isPercentage: false,
    deadline: '',
  };
  const lateRegistrationFee = watch('lateRegistrationFee') || {
    enabled: false,
    amount: 0,
    startsAt: '',
  };

  // Local state for dollar input display
  const [feeDisplay, setFeeDisplay] = React.useState(
    centsToDollars(registrationFee)
  );
  const [earlyBirdDisplay, setEarlyBirdDisplay] = React.useState(
    earlyBirdDiscount.isPercentage
      ? earlyBirdDiscount.amount.toString()
      : centsToDollars(earlyBirdDiscount.amount)
  );
  const [lateFeeDis, setLateFeeDisplay] = React.useState(
    centsToDollars(lateRegistrationFee.amount)
  );

  // Sync display values when form data changes
  React.useEffect(() => {
    setFeeDisplay(centsToDollars(registrationFee));
  }, [registrationFee]);

  React.useEffect(() => {
    if (earlyBirdDiscount.isPercentage) {
      setEarlyBirdDisplay(earlyBirdDiscount.amount.toString());
    } else {
      setEarlyBirdDisplay(centsToDollars(earlyBirdDiscount.amount));
    }
  }, [earlyBirdDiscount.amount, earlyBirdDiscount.isPercentage]);

  React.useEffect(() => {
    setLateFeeDisplay(centsToDollars(lateRegistrationFee.amount));
  }, [lateRegistrationFee.amount]);

  // Calculate preview values
  const calculateEarlyBirdPrice = (): number => {
    if (!earlyBirdDiscount.enabled || earlyBirdDiscount.amount <= 0) {
      return registrationFee;
    }
    if (earlyBirdDiscount.isPercentage) {
      return registrationFee - Math.round((registrationFee * earlyBirdDiscount.amount) / 100);
    }
    return Math.max(0, registrationFee - earlyBirdDiscount.amount);
  };

  const calculateLatePrice = (): number => {
    if (!lateRegistrationFee.enabled || lateRegistrationFee.amount <= 0) {
      return registrationFee;
    }
    return registrationFee + lateRegistrationFee.amount;
  };

  return (
    <WizardStepContainer
      title="Registration & Fees"
      description="Configure registration fees and payment options for your league. All fees are optional."
    >
      {/* Enable Paid Registration Toggle */}
      <div className="space-y-4">
        <Card className="bg-neutral-800/50 border-white/10">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="flex items-start gap-3">
                <div className="bg-rink-500/10 p-2 rounded-lg">
                  <CreditCard className="h-5 w-5 text-rink-500" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg">Enable Paid Registration</h3>
                  <p className="text-sm text-muted-foreground">
                    Collect registration fees from players when they sign up
                  </p>
                </div>
              </div>
              <Switch
                checked={enablePaidRegistration}
                onCheckedChange={(checked) =>
                  setValue('enablePaidRegistration', checked)
                }
                className="data-[state=checked]:bg-rink-500"
              />
            </div>
          </CardContent>
        </Card>

        {/* Paid Registration Fields */}
        {enablePaidRegistration && (
          <>
            {/* Base Registration Fee */}
            <div className="space-y-4 pt-4">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                Registration Fee
              </h3>

              <FormField
                label="Base Registration Fee"
                error={errors.registrationFee?.message}
                required
                htmlFor="registrationFee"
                hint="Enter the fee in dollars (e.g., 150.00)"
              >
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                    $
                  </span>
                  <Input
                    id="registrationFee"
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    value={feeDisplay}
                    onChange={(e) => {
                      setFeeDisplay(e.target.value);
                      setValue('registrationFee', dollarsToCents(e.target.value));
                    }}
                    className="pl-7"
                    error={!!errors.registrationFee}
                  />
                </div>
              </FormField>
            </div>

            {/* Early Bird Discount Section */}
            <div className="space-y-4 pt-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <Gift className="h-5 w-5 text-green-500" />
                  Early Bird Discount
                </h3>
                <Switch
                  checked={earlyBirdDiscount.enabled}
                  onCheckedChange={(checked) =>
                    setValue('earlyBirdDiscount', {
                      ...earlyBirdDiscount,
                      enabled: checked,
                    })
                  }
                />
              </div>

              {earlyBirdDiscount.enabled && (
                <div className="pl-7 space-y-4 border-l-2 border-green-500/20">
                  <div className="bg-muted/50 p-4 rounded-lg flex items-start gap-2">
                    <Info className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
                    <p className="text-sm text-muted-foreground">
                      Offer a discount to players who register early. The discount
                      can be a fixed dollar amount or a percentage.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      label="Discount Type"
                      htmlFor="earlyBirdType"
                    >
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() =>
                            setValue('earlyBirdDiscount', {
                              ...earlyBirdDiscount,
                              isPercentage: false,
                              amount: 0,
                            })
                          }
                          className={`flex-1 px-4 py-2 rounded-lg border transition-colors ${
                            !earlyBirdDiscount.isPercentage
                              ? 'bg-rink-500/10 border-rink-500 text-rink-500'
                              : 'border-neutral-600 hover:border-neutral-500'
                          }`}
                        >
                          <DollarSign className="h-4 w-4 inline mr-1" />
                          Fixed Amount
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            setValue('earlyBirdDiscount', {
                              ...earlyBirdDiscount,
                              isPercentage: true,
                              amount: 0,
                            })
                          }
                          className={`flex-1 px-4 py-2 rounded-lg border transition-colors ${
                            earlyBirdDiscount.isPercentage
                              ? 'bg-rink-500/10 border-rink-500 text-rink-500'
                              : 'border-neutral-600 hover:border-neutral-500'
                          }`}
                        >
                          <Percent className="h-4 w-4 inline mr-1" />
                          Percentage
                        </button>
                      </div>
                    </FormField>

                    <FormField
                      label={earlyBirdDiscount.isPercentage ? 'Discount (%)' : 'Discount Amount'}
                      error={
                        errors.earlyBirdDiscount && 'amount' in errors.earlyBirdDiscount
                          ? (errors.earlyBirdDiscount.amount as { message?: string })?.message
                          : undefined
                      }
                      htmlFor="earlyBirdAmount"
                    >
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                          {earlyBirdDiscount.isPercentage ? '%' : '$'}
                        </span>
                        <Input
                          id="earlyBirdAmount"
                          type="number"
                          step={earlyBirdDiscount.isPercentage ? '1' : '0.01'}
                          min="0"
                          max={earlyBirdDiscount.isPercentage ? '100' : undefined}
                          placeholder="0"
                          value={earlyBirdDisplay}
                          onChange={(e) => {
                            setEarlyBirdDisplay(e.target.value);
                            const value = earlyBirdDiscount.isPercentage
                              ? parseInt(e.target.value, 10) || 0
                              : dollarsToCents(e.target.value);
                            setValue('earlyBirdDiscount', {
                              ...earlyBirdDiscount,
                              amount: value,
                            });
                          }}
                          className="pl-7"
                        />
                      </div>
                    </FormField>
                  </div>

                  <FormField
                    label="Early Bird Deadline"
                    error={
                      errors.earlyBirdDiscount && 'deadline' in errors.earlyBirdDiscount
                        ? (errors.earlyBirdDiscount.deadline as { message?: string })?.message
                        : undefined
                    }
                    htmlFor="earlyBirdDeadline"
                    hint="Last day to receive the early bird discount"
                  >
                    <div className="relative">
                      <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="earlyBirdDeadline"
                        type="date"
                        value={earlyBirdDiscount.deadline || ''}
                        onChange={(e) =>
                          setValue('earlyBirdDiscount', {
                            ...earlyBirdDiscount,
                            deadline: e.target.value,
                          })
                        }
                        className="pl-10"
                      />
                    </div>
                  </FormField>
                </div>
              )}
            </div>

            {/* Late Registration Fee Section */}
            <div className="space-y-4 pt-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-orange-500" />
                  Late Registration Fee
                </h3>
                <Switch
                  checked={lateRegistrationFee.enabled}
                  onCheckedChange={(checked) =>
                    setValue('lateRegistrationFee', {
                      ...lateRegistrationFee,
                      enabled: checked,
                    })
                  }
                />
              </div>

              {lateRegistrationFee.enabled && (
                <div className="pl-7 space-y-4 border-l-2 border-orange-500/20">
                  <div className="bg-muted/50 p-4 rounded-lg flex items-start gap-2">
                    <Info className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
                    <p className="text-sm text-muted-foreground">
                      Add an additional fee for players who register after a
                      certain date. This encourages early registration.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      label="Additional Late Fee"
                      error={
                        errors.lateRegistrationFee && 'amount' in errors.lateRegistrationFee
                          ? (errors.lateRegistrationFee.amount as { message?: string })?.message
                          : undefined
                      }
                      htmlFor="lateFeeAmount"
                    >
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                          $
                        </span>
                        <Input
                          id="lateFeeAmount"
                          type="number"
                          step="0.01"
                          min="0"
                          placeholder="0.00"
                          value={lateFeeDis}
                          onChange={(e) => {
                            setLateFeeDisplay(e.target.value);
                            setValue('lateRegistrationFee', {
                              ...lateRegistrationFee,
                              amount: dollarsToCents(e.target.value),
                            });
                          }}
                          className="pl-7"
                        />
                      </div>
                    </FormField>

                    <FormField
                      label="Late Fees Start"
                      error={
                        errors.lateRegistrationFee && 'startsAt' in errors.lateRegistrationFee
                          ? (errors.lateRegistrationFee.startsAt as { message?: string })?.message
                          : undefined
                      }
                      htmlFor="lateFeesStartAt"
                      hint="When late fees begin"
                    >
                      <div className="relative">
                        <Clock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="lateFeesStartAt"
                          type="date"
                          value={lateRegistrationFee.startsAt || ''}
                          onChange={(e) =>
                            setValue('lateRegistrationFee', {
                              ...lateRegistrationFee,
                              startsAt: e.target.value,
                            })
                          }
                          className="pl-10"
                        />
                      </div>
                    </FormField>
                  </div>
                </div>
              )}
            </div>

            {/* Payment Instructions */}
            <div className="space-y-4 pt-6">
              <h3 className="text-lg font-semibold">Payment Instructions (Optional)</h3>

              <FormField
                label="Instructions"
                error={errors.paymentInstructions?.message}
                htmlFor="paymentInstructions"
                hint="Additional instructions shown to players during registration"
              >
                <Textarea
                  {...register('paymentInstructions')}
                  id="paymentInstructions"
                  placeholder="Enter any special payment instructions, policies, or information for players..."
                  rows={4}
                  error={!!errors.paymentInstructions}
                />
              </FormField>
            </div>

            {/* Fee Structure Preview */}
            <div className="space-y-4 pt-6">
              <h3 className="text-lg font-semibold">Fee Structure Preview</h3>

              <Card className="bg-neutral-800/50 border-white/10">
                <CardContent className="pt-6">
                  <div className="space-y-4">
                    {/* Base Fee */}
                    <div className="flex items-center justify-between py-2 border-b border-neutral-700">
                      <span className="text-muted-foreground">Base Registration Fee</span>
                      <span className="font-semibold text-lg">
                        ${centsToDollars(registrationFee)}
                      </span>
                    </div>

                    {/* Early Bird */}
                    {earlyBirdDiscount.enabled && earlyBirdDiscount.amount > 0 && (
                      <div className="flex items-center justify-between py-2 border-b border-neutral-700">
                        <div>
                          <span className="text-green-500">Early Bird Price</span>
                          {earlyBirdDiscount.deadline && (
                            <p className="text-xs text-muted-foreground">
                              Before {new Date(earlyBirdDiscount.deadline).toLocaleDateString()}
                            </p>
                          )}
                        </div>
                        <div className="text-right">
                          <span className="font-semibold text-lg text-green-500">
                            ${centsToDollars(calculateEarlyBirdPrice())}
                          </span>
                          <p className="text-xs text-green-500/70">
                            Save{' '}
                            {earlyBirdDiscount.isPercentage
                              ? `${earlyBirdDiscount.amount}%`
                              : `$${centsToDollars(earlyBirdDiscount.amount)}`}
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Late Fee */}
                    {lateRegistrationFee.enabled && lateRegistrationFee.amount > 0 && (
                      <div className="flex items-center justify-between py-2 border-b border-neutral-700">
                        <div>
                          <span className="text-orange-500">Late Registration Price</span>
                          {lateRegistrationFee.startsAt && (
                            <p className="text-xs text-muted-foreground">
                              After {new Date(lateRegistrationFee.startsAt).toLocaleDateString()}
                            </p>
                          )}
                        </div>
                        <div className="text-right">
                          <span className="font-semibold text-lg text-orange-500">
                            ${centsToDollars(calculateLatePrice())}
                          </span>
                          <p className="text-xs text-orange-500/70">
                            +${centsToDollars(lateRegistrationFee.amount)} late fee
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Timeline */}
                    {(earlyBirdDiscount.enabled || lateRegistrationFee.enabled) && (
                      <div className="pt-2">
                        <p className="text-sm text-muted-foreground mb-2">Timeline:</p>
                        <div className="flex items-center gap-2 text-xs">
                          {earlyBirdDiscount.enabled && earlyBirdDiscount.deadline && (
                            <>
                              <span className="px-2 py-1 bg-green-500/10 text-green-500 rounded">
                                Early Bird
                              </span>
                              <span className="text-muted-foreground">
                                until {new Date(earlyBirdDiscount.deadline).toLocaleDateString()}
                              </span>
                              <span className="text-muted-foreground">|</span>
                            </>
                          )}
                          <span className="px-2 py-1 bg-neutral-600 rounded">
                            Standard
                          </span>
                          {lateRegistrationFee.enabled && lateRegistrationFee.startsAt && (
                            <>
                              <span className="text-muted-foreground">|</span>
                              <span className="px-2 py-1 bg-orange-500/10 text-orange-500 rounded">
                                Late
                              </span>
                              <span className="text-muted-foreground">
                                from {new Date(lateRegistrationFee.startsAt).toLocaleDateString()}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </>
        )}

        {/* No Fees Message */}
        {!enablePaidRegistration && (
          <div className="bg-muted/50 p-6 rounded-lg text-center">
            <DollarSign className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-50" />
            <h3 className="text-lg font-semibold mb-2">Free Registration</h3>
            <p className="text-sm text-muted-foreground">
              Registration will be free for all players. You can enable paid
              registration later from your league settings.
            </p>
          </div>
        )}
      </div>
    </WizardStepContainer>
  );
}
