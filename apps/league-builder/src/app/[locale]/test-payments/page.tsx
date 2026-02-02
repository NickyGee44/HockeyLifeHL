'use client';

/**
 * Test Page for Player Fee Collection
 *
 * This page allows testing all payment components and functionality.
 * Remove this page before production deployment.
 */

import { useState, useEffect } from 'react';
import { FeeConfigurationForm } from '@/components/payments/FeeConfigurationForm';
import { PaymentStatusTable } from '@/components/payments/PaymentStatusTable';
import { RefundModal } from '@/components/payments/RefundModal';
import { CheckoutButton } from '@/components/payments/CheckoutButton';
import { PaymentHistoryCard } from '@/components/payments/PaymentHistoryCard';
import { PaymentReportExport } from '@/components/payments/PaymentReportExport';
// Import directly from action files to avoid server-only webhook-handler
import { getSeasonFees } from '@/lib/payments/fee-actions';
import { getLeaguePlayerPayments } from '@/lib/payments/payment-actions';
import type {
  SeasonFeeWithSeason,
  PlayerPaymentWithDetails,
  SeasonFee,
} from '@/lib/payments/types';

// Mock data for testing when no real data exists
const MOCK_PAYMENT: PlayerPaymentWithDetails = {
  id: 'mock-payment-1',
  player_id: 'mock-player-1',
  season_fee_id: 'mock-fee-1',
  team_id: null,
  league_id: 'mock-league-1',
  season_id: 'mock-season-1',
  payment_plan: 'two_pay',
  base_amount_cents: 50000,
  discount_cents: 0,
  late_fee_cents: 0,
  installment_fee_cents: 500,
  total_amount_cents: 50500,
  amount_paid_cents: 25250,
  currency: 'usd',
  status: 'partially_paid',
  stripe_customer_id: null,
  stripe_checkout_session_id: null,
  stripe_subscription_id: null,
  total_installments: 2,
  current_installment: 1,
  next_payment_date: '2026-03-01',
  reminder_sent_count: 0,
  last_reminder_sent_at: null,
  notes: null,
  metadata: {},
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  paid_at: null,
  player: {
    id: 'mock-player-1',
    full_name: 'John Doe',
    email: 'john@example.com',
    avatar_url: null,
  },
  season_fee: {
    id: 'mock-fee-1',
    name: 'Spring 2026 Registration',
    amount_cents: 50000,
  },
  team: {
    id: 'mock-team-1',
    name: 'Thunder Hawks',
    short_name: 'THK',
  },
};

const MOCK_FEE: SeasonFee = {
  id: 'mock-fee-1',
  league_id: 'mock-league-1',
  season_id: 'mock-season-1',
  name: 'Spring 2026 Registration',
  description: 'Full season registration fee',
  amount_cents: 50000,
  currency: 'usd',
  allow_full_payment: true,
  allow_two_pay: true,
  allow_three_pay: true,
  payment_deadline: '2026-03-15',
  early_bird_deadline: '2026-02-15',
  early_bird_discount_cents: 5000,
  late_fee_cents: 2500,
  installment_fee_cents: 500,
  is_active: true,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  created_by: null,
};

type TabType = 'fees' | 'payments' | 'checkout' | 'history' | 'export';

export default function TestPaymentsPage() {
  const [activeTab, setActiveTab] = useState<TabType>('fees');
  const [leagueId, setLeagueId] = useState('');
  const [seasonId, setSeasonId] = useState('');
  const [fees, setFees] = useState<SeasonFeeWithSeason[]>([]);
  const [payments, setPayments] = useState<PlayerPaymentWithDetails[]>([]);
  const [selectedPayment, setSelectedPayment] = useState<PlayerPaymentWithDetails | null>(null);
  const [showRefundModal, setShowRefundModal] = useState(false);
  const [useMockData, setUseMockData] = useState(true);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Load real data when IDs are provided
  const loadData = async () => {
    if (!leagueId) return;

    setLoading(true);
    setMessage(null);

    try {
      // Load fees
      const feesResult = await getSeasonFees(leagueId, { seasonId: seasonId || undefined });
      if (feesResult.success) {
        setFees(feesResult.data);
      } else {
        setMessage({ type: 'error', text: feesResult.error });
      }

      // Load payments
      const paymentsResult = await getLeaguePlayerPayments(leagueId, {
        seasonId: seasonId || undefined,
      });
      if (paymentsResult.success) {
        setPayments(paymentsResult.data.payments);
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to load data' });
    } finally {
      setLoading(false);
    }
  };

  // Display data (mock or real)
  const displayPayments = useMockData ? [MOCK_PAYMENT] : payments;
  const displayFee = useMockData ? MOCK_FEE : (fees[0] as SeasonFee | undefined);

  const tabs: { id: TabType; label: string }[] = [
    { id: 'fees', label: 'Fee Configuration' },
    { id: 'payments', label: 'Payment Status' },
    { id: 'checkout', label: 'Checkout Button' },
    { id: 'history', label: 'Payment History' },
    { id: 'export', label: 'Export Report' },
  ];

  return (
    <div className="min-h-screen bg-neutral-900 text-white p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gold-500 mb-2">
            Payment System Test Page
          </h1>
          <p className="text-neutral-400">
            Test all player fee collection components. Remove before production.
          </p>
        </div>

        {/* Configuration */}
        <div className="bg-neutral-800 border border-neutral-700 rounded-xl p-6 mb-8">
          <h2 className="text-lg font-semibold mb-4">Test Configuration</h2>

          <div className="flex items-center gap-4 mb-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={useMockData}
                onChange={(e) => setUseMockData(e.target.checked)}
                className="w-4 h-4 rounded border-neutral-600 bg-neutral-700 text-gold-500 focus:ring-gold-500"
              />
              <span className="text-sm text-neutral-300">Use mock data</span>
            </label>
          </div>

          {!useMockData && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm text-neutral-400 mb-1">League ID</label>
                <input
                  type="text"
                  value={leagueId}
                  onChange={(e) => setLeagueId(e.target.value)}
                  placeholder="Enter league UUID"
                  className="w-full px-3 py-2 bg-neutral-900 border border-neutral-700 rounded-lg text-white placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-gold-500/50"
                />
              </div>
              <div>
                <label className="block text-sm text-neutral-400 mb-1">Season ID (optional)</label>
                <input
                  type="text"
                  value={seasonId}
                  onChange={(e) => setSeasonId(e.target.value)}
                  placeholder="Enter season UUID"
                  className="w-full px-3 py-2 bg-neutral-900 border border-neutral-700 rounded-lg text-white placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-gold-500/50"
                />
              </div>
              <div className="flex items-end">
                <button
                  onClick={loadData}
                  disabled={loading || !leagueId}
                  className="px-4 py-2 bg-gold-500 text-black font-medium rounded-lg hover:bg-gold-400 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Loading...' : 'Load Data'}
                </button>
              </div>
            </div>
          )}

          {message && (
            <div
              className={`mt-4 p-3 rounded-lg ${
                message.type === 'error'
                  ? 'bg-red-500/10 border border-red-500/30 text-red-400'
                  : 'bg-green-500/10 border border-green-500/30 text-green-400'
              }`}
            >
              {message.text}
            </div>
          )}
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 rounded-lg font-medium whitespace-nowrap transition-colors ${
                activeTab === tab.id
                  ? 'bg-gold-500 text-black'
                  : 'bg-neutral-800 text-neutral-300 hover:bg-neutral-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="space-y-6">
          {/* Fee Configuration Tab */}
          {activeTab === 'fees' && (
            <div>
              <h2 className="text-xl font-semibold mb-4">Fee Configuration Form</h2>
              <FeeConfigurationForm
                leagueId={leagueId || 'test-league-id'}
                seasonId={seasonId || 'test-season-id'}
                existingFee={useMockData ? undefined : (fees[0] as SeasonFee | undefined)}
                onSuccess={(fee) => {
                  setMessage({ type: 'success', text: `Fee "${fee.name}" saved successfully!` });
                  if (!useMockData) loadData();
                }}
                onCancel={() => setMessage({ type: 'error', text: 'Cancelled' })}
              />
            </div>
          )}

          {/* Payment Status Tab */}
          {activeTab === 'payments' && (
            <div>
              <h2 className="text-xl font-semibold mb-4">Payment Status Table</h2>
              <PaymentStatusTable
                payments={displayPayments}
                onRefund={(payment) => {
                  setSelectedPayment(payment);
                  setShowRefundModal(true);
                }}
                onSendReminder={(payment) => {
                  setMessage({
                    type: 'success',
                    text: `Reminder sent to ${payment.player.email}`,
                  });
                }}
                onViewDetails={(payment) => {
                  setMessage({
                    type: 'success',
                    text: `Viewing details for ${payment.player.full_name}`,
                  });
                }}
              />
            </div>
          )}

          {/* Checkout Button Tab */}
          {activeTab === 'checkout' && (
            <div>
              <h2 className="text-xl font-semibold mb-4">Checkout Button</h2>
              <div className="max-w-md">
                {displayFee && (
                  <CheckoutButton
                    playerPayment={MOCK_PAYMENT}
                    seasonFee={displayFee}
                    successUrl={`${typeof window !== 'undefined' ? window.location.origin : ''}/test-payments?success=true`}
                    cancelUrl={`${typeof window !== 'undefined' ? window.location.origin : ''}/test-payments?cancelled=true`}
                  />
                )}
              </div>
              <div className="mt-4 p-4 bg-neutral-800 border border-neutral-700 rounded-xl">
                <h3 className="font-medium mb-2">Test with Stripe CLI</h3>
                <p className="text-sm text-neutral-400 mb-2">
                  To test checkout, run in another terminal:
                </p>
                <code className="block p-2 bg-black rounded text-xs text-green-400 overflow-x-auto">
                  stripe listen --forward-to localhost:3000/api/webhooks/stripe/player-payments
                  --events checkout.session.completed,payment_intent.payment_failed,charge.refunded
                </code>
              </div>
            </div>
          )}

          {/* Payment History Tab */}
          {activeTab === 'history' && (
            <div>
              <h2 className="text-xl font-semibold mb-4">Payment History Card</h2>
              <div className="max-w-lg">
                <PaymentHistoryCard
                  payment={MOCK_PAYMENT}
                  transactions={[
                    {
                      id: 'txn-1',
                      player_payment_id: MOCK_PAYMENT.id,
                      transaction_type: 'payment',
                      amount_cents: 25250,
                      application_fee_cents: 1263,
                      currency: 'usd',
                      stripe_payment_intent_id: 'pi_test_123',
                      stripe_charge_id: null,
                      stripe_refund_id: null,
                      status: 'succeeded',
                      installment_number: 1,
                      description: 'First installment payment',
                      metadata: {},
                      created_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
                      completed_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
                      idempotency_key: 'checkout_cs_test_123',
                    },
                  ]}
                  feeName="Spring 2026 Registration"
                />
              </div>
            </div>
          )}

          {/* Export Report Tab */}
          {activeTab === 'export' && (
            <div>
              <h2 className="text-xl font-semibold mb-4">Payment Report Export</h2>
              <div className="max-w-md">
                <PaymentReportExport
                  leagueId={leagueId || 'test-league-id'}
                  seasonId={seasonId || 'test-season-id'}
                  seasonName="Spring 2026"
                />
              </div>
            </div>
          )}
        </div>

        {/* Refund Modal */}
        {selectedPayment && (
          <RefundModal
            payment={selectedPayment}
            isOpen={showRefundModal}
            onClose={() => {
              setShowRefundModal(false);
              setSelectedPayment(null);
            }}
            onSuccess={(result) => {
              setMessage({
                type: 'success',
                text: `Refund of $${(result.amountRefunded / 100).toFixed(2)} processed successfully!`,
              });
              if (!useMockData) loadData();
            }}
          />
        )}

        {/* Debug Info */}
        <div className="mt-12 p-4 bg-neutral-800/50 border border-neutral-700 rounded-xl">
          <h3 className="text-sm font-medium text-neutral-400 mb-2">Debug Info</h3>
          <div className="text-xs text-neutral-500 space-y-1">
            <p>Mode: {useMockData ? 'Mock Data' : 'Real Data'}</p>
            <p>League ID: {leagueId || '(not set)'}</p>
            <p>Season ID: {seasonId || '(not set)'}</p>
            <p>Fees loaded: {fees.length}</p>
            <p>Payments loaded: {payments.length}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
