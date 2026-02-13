'use client';

import { useState, useEffect } from 'react';
import { Button } from '@hockey-life/ui';
import {
  requestAccountDeletion,
  cancelAccountDeletion,
  getAccountDeletionStatus,
  type AccountDeletionRequest,
} from '@/lib/account/deletion-actions';
import { exportUserData, getUserDataSummary } from '@/lib/account/data-export-actions';

export default function PrivacySettingsPage() {
  const [deletionStatus, setDeletionStatus] = useState<{
    hasPendingDeletion: boolean;
    deletionRequest?: AccountDeletionRequest;
    daysRemaining?: number;
  } | null>(null);

  const [dataSummary, setDataSummary] = useState<{
    profileComplete: boolean;
    organizationCount: number;
    leagueCount: number;
    teamCount: number;
    consentCount: number;
    activeSessionCount: number;
  } | null>(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function loadData() {
    const [deletion, summary] = await Promise.all([
      getAccountDeletionStatus(),
      getUserDataSummary(),
    ]);

    setDeletionStatus(deletion);
    if (summary.success && summary.summary) {
      setDataSummary(summary.summary);
    }
  }

  useEffect(() => {
    let cancelled = false;

    async function fetchInitialData() {
      const [deletion, summary] = await Promise.all([
        getAccountDeletionStatus(),
        getUserDataSummary(),
      ]);

      if (!cancelled) {
        setDeletionStatus(deletion);
        if (summary.success && summary.summary) {
          setDataSummary(summary.summary);
        }
      }
    }

    fetchInitialData();

    return () => {
      cancelled = true;
    };
  }, []);

  async function handleExportData() {
    setLoading(true);
    setError(null);
    setSuccess(null);

    const result = await exportUserData();

    if (result.success && result.data && result.filename) {
      // Create download link
      const blob = new Blob([JSON.stringify(result.data, null, 2)], {
        type: 'application/json',
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = result.filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setSuccess('Your data has been exported successfully!');
    } else {
      setError(result.error || 'Failed to export data');
    }

    setLoading(false);
  }

  async function handleRequestDeletion() {
    if (!confirm('Are you sure you want to delete your account? This action cannot be undone after 30 days.')) {
      return;
    }

    const reason = prompt('Optional: Tell us why you\'re leaving (helps us improve):');

    setLoading(true);
    setError(null);
    setSuccess(null);

    const result = await requestAccountDeletion(reason || undefined);

    if (result.success) {
      setSuccess(`Account deletion scheduled. You have 30 days to cancel before permanent deletion.`);
      await loadData();
    } else {
      setError(result.error || 'Failed to request account deletion');
    }

    setLoading(false);
  }

  async function handleCancelDeletion() {
    if (!confirm('Cancel account deletion and restore your account?')) {
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    const result = await cancelAccountDeletion();

    if (result.success) {
      setSuccess('Account deletion cancelled! Your account has been restored.');
      await loadData();
    } else {
      setError(result.error || 'Failed to cancel deletion');
    }

    setLoading(false);
  }

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold text-neutral-100 mb-2">
        Privacy & Data
      </h1>
      <p className="text-neutral-400 mb-8">
        Manage your personal data, privacy preferences, and account deletion.
      </p>

      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 mb-6">
          <p className="text-sm text-red-400">{error}</p>
        </div>
      )}

      {success && (
        <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-4 mb-6">
          <p className="text-sm text-green-400">{success}</p>
        </div>
      )}

      {/* Pending Deletion Warning */}
      {deletionStatus?.hasPendingDeletion && (
        <div className="bg-yellow-500/10 border-l-4 border-yellow-500 p-6 mb-8 rounded-r-xl">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-yellow-500" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-lg font-medium text-yellow-400">
                Account Deletion Pending
              </h3>
              <div className="mt-2 text-sm text-yellow-300/80">
                <p>
                  Your account is scheduled for deletion on{' '}
                  <strong className="text-yellow-300">
                    {new Date(deletionStatus.deletionRequest!.scheduled_for).toLocaleDateString()}
                  </strong>
                  .
                </p>
                <p className="mt-1">
                  Days remaining: <strong className="text-yellow-300">{deletionStatus.daysRemaining}</strong>
                </p>
                {deletionStatus.deletionRequest?.deletion_reason && (
                  <p className="mt-2 italic">Reason: {deletionStatus.deletionRequest.deletion_reason}</p>
                )}
              </div>
              <div className="mt-4">
                <Button
                  onClick={handleCancelDeletion}
                  disabled={loading}
                  variant="outline"
                >
                  {loading ? 'Cancelling...' : 'Cancel Deletion & Restore Account'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Data Export Section */}
      <div className="bg-neutral-800/50 border border-white/10 rounded-2xl p-6 mb-6">
        <h2 className="text-xl font-semibold text-neutral-100 mb-4">
          Download Your Data
        </h2>
        <p className="text-neutral-400 mb-4">
          GDPR Article 15 & 20: Right to Access and Data Portability
        </p>

        {dataSummary && (
          <div className="bg-neutral-900/50 rounded-xl p-4 mb-4">
            <h3 className="text-sm font-medium text-neutral-300 mb-2">
              Your Data Summary
            </h3>
            <dl className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <dt className="text-neutral-500">Organizations</dt>
                <dd className="text-rink-500 font-medium">{dataSummary.organizationCount}</dd>
              </div>
              <div>
                <dt className="text-neutral-500">Leagues</dt>
                <dd className="text-rink-500 font-medium">{dataSummary.leagueCount}</dd>
              </div>
              <div>
                <dt className="text-neutral-500">Teams</dt>
                <dd className="text-rink-500 font-medium">{dataSummary.teamCount}</dd>
              </div>
              <div>
                <dt className="text-neutral-500">Active Sessions</dt>
                <dd className="text-rink-500 font-medium">{dataSummary.activeSessionCount}</dd>
              </div>
            </dl>
          </div>
        )}

        <p className="text-sm text-neutral-400 mb-4">
          Download all your personal data in machine-readable JSON format. This includes your profile,
          organizations, league memberships, team rosters, consents, and session history.
        </p>

        <Button
          onClick={handleExportData}
          disabled={loading}
          variant="outline"
        >
          {loading ? 'Exporting...' : 'Download My Data (JSON)'}
        </Button>
      </div>

      {/* Account Deletion Section */}
      {!deletionStatus?.hasPendingDeletion && (
        <div className="bg-neutral-800/50 border border-red-500/30 rounded-2xl p-6 border-l-4 border-l-red-500">
          <h2 className="text-xl font-semibold text-neutral-100 mb-4">
            Delete Account
          </h2>
          <p className="text-neutral-400 mb-4">
            GDPR Article 17: Right to Erasure
          </p>

          <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 mb-4">
            <h3 className="text-sm font-medium text-red-400 mb-2">
              What happens when you delete your account?
            </h3>
            <ul className="text-sm text-red-300/80 space-y-1 list-disc list-inside">
              <li>Your account will be scheduled for deletion in 30 days (grace period)</li>
              <li>You can cancel deletion during the 30-day grace period</li>
              <li>After 30 days, your data will be permanently deleted</li>
              <li>Your email, name, and personal information will be removed</li>
              <li>Game statistics will be anonymized (no personal data)</li>
              <li>Payment records will be retained for 7 years (tax law) but anonymized</li>
              <li>You will be immediately signed out from all devices</li>
            </ul>
          </div>

          <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4 mb-4">
            <h3 className="text-sm font-medium text-yellow-400 mb-2">
              Before you delete:
            </h3>
            <ul className="text-sm text-yellow-300/80 space-y-1 list-disc list-inside">
              <li>Download your data if you want to keep a copy</li>
              <li>Transfer ownership of any organizations you own</li>
              <li>Inform your league administrators</li>
            </ul>
          </div>

          <Button
            onClick={handleRequestDeletion}
            disabled={loading}
            variant="destructive"
          >
            {loading ? 'Processing...' : 'Delete My Account'}
          </Button>
        </div>
      )}

      {/* Legal Links */}
      <div className="mt-8 pt-6 border-t border-white/10">
        <h3 className="text-sm font-medium text-neutral-300 mb-2">
          More Information
        </h3>
        <div className="flex gap-4 text-sm">
          <a href="/privacy" target="_blank" className="text-rink-500 hover:text-rink-400 hover:underline transition-colors">
            Privacy Policy
          </a>
          <a href="/terms" target="_blank" className="text-rink-500 hover:text-rink-400 hover:underline transition-colors">
            Terms of Service
          </a>
          <a href="mailto:privacy@beerleaguehockey.ca" className="text-rink-500 hover:text-rink-400 hover:underline transition-colors">
            Contact Privacy Team
          </a>
        </div>
      </div>
    </div>
  );
}
