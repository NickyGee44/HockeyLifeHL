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
  CheckCircle2,
  ExternalLink,
  Loader2,
  Shield,
  ArrowRight,
} from 'lucide-react';
import {
  Input,
  Textarea,
  FormField,
  Card,
  CardContent,
  Button,
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

// Check if we're in test/development mode
const isTestMode = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY?.startsWith('pk_test');

type StripeAccountStatus = 'not_connected' | 'pending' | 'active';

interface Step7RegistrationPaymentsProps {
  platformFeePercent?: number;
}

export function Step7RegistrationPayments({ platformFeePercent = 2.99 }: Step7RegistrationPaymentsProps) {
  const PLATFORM_FEE_PERCENT = platformFeePercent;
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
  const stripeAccountStatus = watch('stripeAccountStatus') as StripeAccountStatus;
  const skipPaymentSetup = watch('skipPaymentSetup');

  // Local state for dollar input display
  const [feeDisplay, setFeeDisplay] = React.useState(
    centsToDollars(registrationFee)
  );
  const [earlyBirdDisplay, setEarlyBirdDisplay] = React.useState(
    earlyBirdDiscount.isPercentage
      ? earlyBirdDiscount.amount.toString()
      : centsToDollars(earlyBirdDiscount.amount)
  );
  const [lateFeeDisplay, setLateFeeDisplay] = React.useState(
    centsToDollars(lateRegistrationFee.amount)
  );
  const [isConnecting, setIsConnecting] = React.useState(false);
  const [stripeError, setStripeError] = React.useState<string | null>(null);

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

  // Format fee for display
  const formatFee = (cents: number) => {
    return new Intl.NumberFormat('en-CA', {
      style: 'currency',
      currency: 'CAD',
    }).format(cents / 100);
  };

  // Handle Stripe Connect onboarding
  const handleConnectStripe = async () => {
    setIsConnecting(true);
    setStripeError(null);
    try {
      setValue('skipPaymentSetup', false);
      setStripeError('Stripe Connect will be configured after your league is created. You can proceed to the next step.');
      setValue('stripeAccountStatus', 'pending');
    } catch (err) {
      console.error('Failed to start Stripe Connect:', err);
      setStripeError('Failed to connect to Stripe. Please try again.');
    } finally {
      setIsConnecting(false);
    }
  };

  const handleSkipSetup = () => {
    setValue('skipPaymentSetup', true);
    setValue('stripeAccountStatus', 'not_connected');
  };

  const handleUndoSkip = () => {
    setValue('skipPaymentSetup', false);
  };

  return (
    <WizardStepContainer
      title="Registration & Payments"
      description="Configure registration fees and payment processing for your league."
    >
      <div className="space-y-6">
        {/* Enable Paid Registration Toggle */}
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
            <div className="space-y-4">
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
            <div className="space-y-4">
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
                      Offer a discount to players who register early.
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
            <div className="space-y-4">
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
                          value={lateFeeDisplay}
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
            <div className="space-y-4">
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
                  rows={3}
                  error={!!errors.paymentInstructions}
                />
              </FormField>
            </div>

            {/* Fee Structure Preview */}
            <Card className="bg-neutral-800/50 border-white/10">
              <CardContent className="pt-6">
                <h3 className="text-lg font-semibold mb-4">Fee Structure Preview</h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between py-2 border-b border-neutral-700">
                    <span className="text-muted-foreground">Base Registration Fee</span>
                    <span className="font-semibold text-lg">
                      ${centsToDollars(registrationFee)}
                    </span>
                  </div>

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
                      </div>
                    </div>
                  )}

                  {/* Platform fee */}
                  <div className="flex items-center justify-between py-2 border-b border-neutral-700 text-sm">
                    <span className="text-muted-foreground">Platform fee ({PLATFORM_FEE_PERCENT}%)</span>
                    <span className="text-muted-foreground">
                      {formatFee(Math.round(registrationFee * (PLATFORM_FEE_PERCENT / 100)))}
                    </span>
                  </div>

                  <div className="flex items-center justify-between py-2">
                    <span className="font-medium">You receive per registration</span>
                    <span className="font-semibold text-green-500">
                      {formatFee(registrationFee - Math.round(registrationFee * (PLATFORM_FEE_PERCENT / 100)))}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Stripe Connect Section */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                Payment Processing
              </h3>

              {/* Test Mode Banner */}
              {isTestMode && (
                <div className="bg-yellow-50 border border-yellow-200 p-3 rounded-lg flex items-center gap-2">
                  <Info className="h-5 w-5 text-yellow-600 shrink-0" />
                  <p className="text-sm text-yellow-800">
                    <strong>Test Mode:</strong> Using Stripe test keys. No real charges will be made.
                  </p>
                </div>
              )}

              {skipPaymentSetup ? (
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-center py-6">
                      <div className="mx-auto w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mb-3">
                        <Clock className="h-6 w-6 text-blue-600" />
                      </div>
                      <h4 className="font-semibold mb-2">Payment Setup Deferred</h4>
                      <p className="text-sm text-muted-foreground max-w-md mx-auto mb-4">
                        You can set up Stripe Connect after your league is created from the dashboard.
                      </p>
                      <Button variant="outline" size="sm" onClick={handleUndoSkip}>
                        Connect Stripe Instead
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-[#635BFF] rounded-lg flex items-center justify-center">
                          <svg viewBox="0 0 24 24" className="w-6 h-6 text-white" fill="currentColor">
                            <path d="M13.976 9.15c-2.172-.806-3.356-1.426-3.356-2.409 0-.831.683-1.305 1.901-1.305 2.227 0 4.515.858 6.09 1.631l.89-5.494C18.252.975 15.697 0 12.165 0 9.667 0 7.589.654 6.104 1.872 4.56 3.147 3.757 4.992 3.757 7.218c0 4.039 2.467 5.76 6.476 7.219 2.585.92 3.445 1.574 3.445 2.583 0 .98-.84 1.545-2.354 1.545-1.875 0-4.965-.921-6.99-2.109l-.9 5.555C5.175 22.99 8.385 24 11.714 24c2.641 0 4.843-.624 6.328-1.813 1.664-1.305 2.525-3.236 2.525-5.732 0-4.128-2.524-5.851-6.591-7.305z" />
                          </svg>
                        </div>
                        <div>
                          <h4 className="font-semibold">Stripe Connect</h4>
                          <p className="text-sm text-muted-foreground">Secure payment processing</p>
                        </div>
                      </div>
                      <div className={`flex items-center gap-2 ${
                        stripeAccountStatus === 'active' ? 'text-green-600' :
                        stripeAccountStatus === 'pending' ? 'text-blue-600' : 'text-muted-foreground'
                      }`}>
                        {stripeAccountStatus === 'active' ? <CheckCircle2 className="h-5 w-5" /> :
                         stripeAccountStatus === 'pending' ? <Clock className="h-5 w-5" /> :
                         <ArrowRight className="h-5 w-5" />}
                        <span className="font-medium text-sm">
                          {stripeAccountStatus === 'active' ? 'Connected' :
                           stripeAccountStatus === 'pending' ? 'Pending' : 'Not connected'}
                        </span>
                      </div>
                    </div>

                    {stripeError && (
                      <div className="bg-blue-50 border border-blue-200 p-3 rounded-lg mb-4">
                        <div className="flex items-start gap-2">
                          <Info className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
                          <p className="text-sm text-blue-800">{stripeError}</p>
                        </div>
                      </div>
                    )}

                    <div className="flex flex-col sm:flex-row gap-3">
                      {stripeAccountStatus !== 'active' && (
                        <>
                          <Button
                            type="button"
                            onClick={handleConnectStripe}
                            disabled={isConnecting}
                            className="flex-1"
                          >
                            {isConnecting ? (
                              <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Connecting...
                              </>
                            ) : (
                              <>
                                <CreditCard className="mr-2 h-4 w-4" />
                                {stripeAccountStatus === 'pending' ? 'Continue Setup' : 'Connect Stripe'}
                              </>
                            )}
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            onClick={handleSkipSetup}
                            disabled={isConnecting}
                          >
                            Skip for Now
                          </Button>
                        </>
                      )}
                      {stripeAccountStatus === 'active' && (
                        <div className="flex items-center gap-2 text-green-600">
                          <CheckCircle2 className="h-5 w-5" />
                          <span className="font-medium">Connected and ready to accept payments</span>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Security badges */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                  { label: 'PCI Compliant', desc: 'Level 1 certified' },
                  { label: 'Encrypted', desc: '256-bit SSL' },
                  { label: 'Direct Deposits', desc: 'To your bank' },
                  { label: 'Fraud Protection', desc: 'AI-powered' },
                ].map((badge) => (
                  <div key={badge.label} className="flex items-start gap-2 p-2">
                    <Shield className="h-4 w-4 text-green-500 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs font-medium">{badge.label}</p>
                      <p className="text-xs text-muted-foreground">{badge.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
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
