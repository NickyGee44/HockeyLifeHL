'use client';

import * as React from 'react';
import { useFormContext } from 'react-hook-form';
import {
  CreditCard,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Loader2,
  Shield,
  Ban,
  Clock,
  Info,
} from 'lucide-react';
import { Button, Card, CardContent } from '@hockey-life/ui';
import { WizardStepContainer } from '../../ui/wizard/wizard-steps';
import type { WizardFormData } from '@/lib/schemas/league-wizard';

// Note: startConnectOnboarding and getConnectAccountStatus from '@/lib/actions/stripe-connect-payments'
// will be used when integrating with actual Stripe Connect OAuth flow post-league creation

// Platform fee percentage for display
const PLATFORM_FEE_PERCENT = 2.99;

// Check if we're in test/development mode
const isTestMode = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY?.startsWith('pk_test');

type StripeAccountStatus = 'not_connected' | 'pending' | 'active';

interface StatusDisplayConfig {
  icon: React.ReactNode;
  title: string;
  description: string;
  color: string;
}

const STATUS_CONFIG: Record<StripeAccountStatus, StatusDisplayConfig> = {
  not_connected: {
    icon: <Ban className="h-6 w-6" />,
    title: 'Not Connected',
    description: 'Connect your Stripe account to start accepting payments.',
    color: 'text-muted-foreground',
  },
  pending: {
    icon: <Clock className="h-6 w-6" />,
    title: 'Pending Verification',
    description: 'Your Stripe account is being verified. This usually takes 1-2 business days.',
    color: 'text-yellow-600',
  },
  active: {
    icon: <CheckCircle2 className="h-6 w-6" />,
    title: 'Connected',
    description: 'Your Stripe account is active and ready to accept payments.',
    color: 'text-green-600',
  },
};

export function Step5PaymentSetup() {
  const { setValue, watch } = useFormContext<WizardFormData>();

  // Watch form values
  const enablePaidRegistration = watch('enablePaidRegistration');
  const stripeAccountId = watch('stripeAccountId');
  const stripeAccountStatus = watch('stripeAccountStatus') as StripeAccountStatus;
  const skipPaymentSetup = watch('skipPaymentSetup');
  const registrationFee = watch('registrationFee');

  // Local state
  const [isConnecting, setIsConnecting] = React.useState(false);
  const [isCheckingStatus, setIsCheckingStatus] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  // Format fee for display
  const formatFee = (cents: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(cents / 100);
  };

  // Check Stripe account status
  const checkAccountStatus = React.useCallback(async () => {
    if (!stripeAccountId) return;

    setIsCheckingStatus(true);
    setError(null);

    try {
      // We need a league ID to check status, but in wizard we don't have one yet
      // For now, we'll rely on the webhook to update the status after redirect
      // This is a placeholder for future implementation
      console.log('Checking account status for:', stripeAccountId);
    } catch (err) {
      console.error('Failed to check account status:', err);
    } finally {
      setIsCheckingStatus(false);
    }
  }, [stripeAccountId]);

  // Check account status on mount if we have an account ID
  React.useEffect(() => {
    if (stripeAccountId && stripeAccountStatus !== 'active') {
      checkAccountStatus();
    }
  }, [stripeAccountId, stripeAccountStatus, checkAccountStatus]);

  // Handle Stripe Connect onboarding
  const handleConnectStripe = async () => {
    setIsConnecting(true);
    setError(null);

    try {
      // For the wizard, we create a temporary session-based flow
      // The actual account creation will happen when the league is created
      // The following URLs will be used post-league creation for Stripe OAuth:
      // - Return URL: `${window.location.origin}/wizard?step=5&stripe_connect=complete`
      // - Refresh URL: `${window.location.origin}/wizard?step=5&stripe_connect=refresh`

      // We need a league ID to start onboarding, but we don't have one in the wizard yet
      // Store intent to connect and handle it after league creation
      setValue('skipPaymentSetup', false);

      // Show a message that Stripe will be connected after league creation
      setError(
        'Stripe Connect will be set up after your league is created. ' +
        'Click "Create League" to continue, then complete Stripe onboarding.'
      );

      // Mark that user wants to connect Stripe (not skipping)
      setValue('stripeAccountStatus', 'pending');
    } catch (err) {
      console.error('Failed to start Stripe Connect:', err);
      setError('Failed to connect to Stripe. Please try again.');
    } finally {
      setIsConnecting(false);
    }
  };

  // Handle skip payment setup
  const handleSkipSetup = () => {
    setValue('skipPaymentSetup', true);
    setValue('stripeAccountStatus', 'not_connected');
  };

  // Handle undo skip
  const handleUndoSkip = () => {
    setValue('skipPaymentSetup', false);
  };

  // If fees are not enabled, show the free league confirmation
  if (!enablePaidRegistration) {
    return (
      <WizardStepContainer
        title="Payment Setup"
        description="Configure how you'll collect payments from players."
      >
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-8">
              <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
                <CheckCircle2 className="h-8 w-8 text-green-600" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Free League</h3>
              <p className="text-muted-foreground max-w-md mx-auto mb-6">
                You have chosen to run a free league. Players will be able to register
                without making any payment. You can always enable paid registration later
                in your league settings.
              </p>
              <div className="bg-muted/50 p-4 rounded-lg max-w-md mx-auto">
                <div className="flex items-start gap-2">
                  <Info className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
                  <p className="text-sm text-muted-foreground text-left">
                    No payment processing is required for free leagues. Simply continue
                    to the next step to complete your league setup.
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </WizardStepContainer>
    );
  }

  // If user has skipped payment setup
  if (skipPaymentSetup) {
    return (
      <WizardStepContainer
        title="Payment Setup"
        description="Configure how you'll collect payments from players."
      >
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-8">
              <div className="mx-auto w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mb-4">
                <AlertCircle className="h-8 w-8 text-yellow-600" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Payment Setup Skipped</h3>
              <p className="text-muted-foreground max-w-md mx-auto mb-6">
                You have chosen to skip Stripe Connect setup for now. You can complete
                this later in your league settings, but players will not be able to pay
                online until you do.
              </p>
              <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-lg max-w-md mx-auto mb-6">
                <div className="flex items-start gap-2">
                  <AlertCircle className="h-5 w-5 text-yellow-600 shrink-0 mt-0.5" />
                  <div className="text-sm text-yellow-800 text-left">
                    <p className="font-medium mb-1">Important</p>
                    <p>
                      Without Stripe Connect, you will need to collect payments manually
                      (cash, check, e-transfer, etc.) and track them yourself.
                    </p>
                  </div>
                </div>
              </div>
              <Button variant="outline" onClick={handleUndoSkip}>
                Connect Stripe Instead
              </Button>
            </div>
          </CardContent>
        </Card>
      </WizardStepContainer>
    );
  }

  // Main payment setup view (fees enabled, not skipped)
  const statusConfig = STATUS_CONFIG[stripeAccountStatus] || STATUS_CONFIG.not_connected;

  return (
    <WizardStepContainer
      title="Payment Setup"
      description="Connect your Stripe account to securely collect registration fees from players."
    >
      {/* Test Mode Banner */}
      {isTestMode && (
        <div className="bg-yellow-50 border border-yellow-200 p-3 rounded-lg flex items-center gap-2 mb-4">
          <AlertCircle className="h-5 w-5 text-yellow-600 shrink-0" />
          <p className="text-sm text-yellow-800">
            <strong>Test Mode:</strong> You are using Stripe test keys. No real charges will be made.
          </p>
        </div>
      )}

      {/* Fee Summary */}
      <Card className="mb-4">
        <CardContent className="pt-6">
          <div className="flex items-center gap-3 mb-4">
            <CreditCard className="h-5 w-5 text-primary" />
            <h3 className="font-semibold text-lg">Registration Fee Summary</h3>
          </div>
          <div className="bg-muted/50 p-4 rounded-lg">
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Base Registration Fee</span>
              <span className="font-semibold">{formatFee(registrationFee || 0)}</span>
            </div>
            <div className="flex justify-between items-center mt-2 text-sm">
              <span className="text-muted-foreground">Platform Fee ({PLATFORM_FEE_PERCENT}%)</span>
              <span className="text-muted-foreground">
                {formatFee(Math.round((registrationFee || 0) * (PLATFORM_FEE_PERCENT / 100)))}
              </span>
            </div>
            <div className="border-t mt-3 pt-3 flex justify-between items-center">
              <span className="font-medium">You Receive</span>
              <span className="font-semibold text-green-600">
                {formatFee((registrationFee || 0) - Math.round((registrationFee || 0) * (PLATFORM_FEE_PERCENT / 100)))}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stripe Connect Section */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-[#635BFF] rounded-lg flex items-center justify-center">
                <svg
                  viewBox="0 0 24 24"
                  className="w-6 h-6 text-white"
                  fill="currentColor"
                >
                  <path d="M13.976 9.15c-2.172-.806-3.356-1.426-3.356-2.409 0-.831.683-1.305 1.901-1.305 2.227 0 4.515.858 6.09 1.631l.89-5.494C18.252.975 15.697 0 12.165 0 9.667 0 7.589.654 6.104 1.872 4.56 3.147 3.757 4.992 3.757 7.218c0 4.039 2.467 5.76 6.476 7.219 2.585.92 3.445 1.574 3.445 2.583 0 .98-.84 1.545-2.354 1.545-1.875 0-4.965-.921-6.99-2.109l-.9 5.555C5.175 22.99 8.385 24 11.714 24c2.641 0 4.843-.624 6.328-1.813 1.664-1.305 2.525-3.236 2.525-5.732 0-4.128-2.524-5.851-6.591-7.305z" />
                </svg>
              </div>
              <div>
                <h3 className="font-semibold">Stripe Connect</h3>
                <p className="text-sm text-muted-foreground">
                  Secure payment processing
                </p>
              </div>
            </div>
            <div className={`flex items-center gap-2 ${statusConfig.color}`}>
              {statusConfig.icon}
              <span className="font-medium">{statusConfig.title}</span>
            </div>
          </div>

          {/* Status Description */}
          <div className="bg-muted/50 p-4 rounded-lg mb-6">
            <p className="text-sm text-muted-foreground">{statusConfig.description}</p>
          </div>

          {/* Error Display */}
          {error && (
            <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg mb-6">
              <div className="flex items-start gap-2">
                <Info className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
                <p className="text-sm text-blue-800">{error}</p>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3">
            {stripeAccountStatus === 'not_connected' && (
              <>
                <Button
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
                      Connect with Stripe
                    </>
                  )}
                </Button>
                <Button
                  variant="outline"
                  onClick={handleSkipSetup}
                  disabled={isConnecting}
                >
                  Skip for Now
                </Button>
              </>
            )}

            {stripeAccountStatus === 'pending' && (
              <>
                <Button
                  onClick={handleConnectStripe}
                  disabled={isConnecting}
                  className="flex-1"
                >
                  {isConnecting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Loading...
                    </>
                  ) : (
                    <>
                      <ExternalLink className="mr-2 h-4 w-4" />
                      Continue Setup
                    </>
                  )}
                </Button>
                <Button
                  variant="outline"
                  onClick={checkAccountStatus}
                  disabled={isCheckingStatus}
                >
                  {isCheckingStatus ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Checking...
                    </>
                  ) : (
                    'Refresh Status'
                  )}
                </Button>
              </>
            )}

            {stripeAccountStatus === 'active' && (
              <div className="flex items-center gap-2 text-green-600">
                <CheckCircle2 className="h-5 w-5" />
                <span className="font-medium">Ready to accept payments</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Security & Trust Section */}
      <Card className="mt-4">
        <CardContent className="pt-6">
          <div className="flex items-center gap-2 mb-4">
            <Shield className="h-5 w-5 text-primary" />
            <h3 className="font-semibold">Secure Payments</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="h-5 w-5 text-green-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-sm">PCI Compliant</p>
                <p className="text-xs text-muted-foreground">
                  Stripe handles all sensitive card data
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <CheckCircle2 className="h-5 w-5 text-green-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-sm">Encrypted Transactions</p>
                <p className="text-xs text-muted-foreground">
                  256-bit SSL encryption on all payments
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <CheckCircle2 className="h-5 w-5 text-green-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-sm">Direct Deposits</p>
                <p className="text-xs text-muted-foreground">
                  Funds deposited directly to your bank
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <CheckCircle2 className="h-5 w-5 text-green-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-sm">Fraud Protection</p>
                <p className="text-xs text-muted-foreground">
                  Built-in fraud detection and prevention
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Platform Fee Info */}
      <div className="bg-muted/50 p-4 rounded-lg mt-4">
        <div className="flex items-start gap-2">
          <Info className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
          <div className="text-sm text-muted-foreground">
            <p className="font-medium mb-1">About Platform Fees</p>
            <p>
              A {PLATFORM_FEE_PERCENT}% platform fee is applied to all transactions to cover
              payment processing and platform costs. This fee is automatically deducted
              from each payment before depositing to your account. Stripe also charges
              their standard processing fees (2.9% + $0.30 per transaction).
            </p>
          </div>
        </div>
      </div>
    </WizardStepContainer>
  );
}
