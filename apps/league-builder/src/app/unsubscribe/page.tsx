/**
 * Unsubscribe Page
 *
 * Confirmation page for email unsubscription
 */

import { CheckCircle, XCircle, Mail, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

interface UnsubscribePageProps {
  searchParams: Promise<{
    success?: string;
    error?: string;
    type?: string;
  }>;
}

const TYPE_LABELS: Record<string, string> = {
  game_updates: 'game update',
  registration: 'registration',
  draft: 'draft',
  billing: 'billing',
  marketing: 'marketing',
  all: 'all',
};

export default async function UnsubscribePage({ searchParams }: UnsubscribePageProps) {
  const params = await searchParams;
  const success = params.success === 'true';
  const error = params.error;
  const type = params.type || 'all';

  const typeLabel = TYPE_LABELS[type] || type;

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <div className="bg-[#1a1a1a] border border-[rgba(212,175,55,0.2)] rounded-2xl p-8 text-center">
          {success ? (
            <>
              <div className="w-16 h-16 mx-auto mb-6 bg-[rgba(34,197,94,0.1)] rounded-full flex items-center justify-center">
                <CheckCircle className="h-8 w-8 text-[#22c55e]" />
              </div>
              <h1 className="text-2xl font-bold text-white mb-2">
                Unsubscribed Successfully
              </h1>
              <p className="text-[#a3a3a3] mb-6">
                You have been unsubscribed from {typeLabel} notifications.
                You will no longer receive these emails.
              </p>
              <div className="bg-[rgba(212,175,55,0.1)] border border-[rgba(212,175,55,0.2)] rounded-lg p-4 mb-6">
                <p className="text-sm text-[#a3a3a3]">
                  <strong className="text-[#D4AF37]">Changed your mind?</strong>
                  <br />
                  You can re-enable notifications anytime from your account settings.
                </p>
              </div>
            </>
          ) : error ? (
            <>
              <div className="w-16 h-16 mx-auto mb-6 bg-[rgba(239,68,68,0.1)] rounded-full flex items-center justify-center">
                <XCircle className="h-8 w-8 text-[#ef4444]" />
              </div>
              <h1 className="text-2xl font-bold text-white mb-2">
                Unsubscribe Failed
              </h1>
              <p className="text-[#a3a3a3] mb-6">
                {error === 'missing_token'
                  ? 'The unsubscribe link is invalid or missing.'
                  : error === 'invalid_token'
                  ? 'This unsubscribe link has expired or is invalid.'
                  : 'Something went wrong. Please try again.'}
              </p>
            </>
          ) : (
            <>
              <div className="w-16 h-16 mx-auto mb-6 bg-[rgba(212,175,55,0.1)] rounded-full flex items-center justify-center">
                <Mail className="h-8 w-8 text-[#D4AF37]" />
              </div>
              <h1 className="text-2xl font-bold text-white mb-2">
                Email Preferences
              </h1>
              <p className="text-[#a3a3a3] mb-6">
                Manage your email notification preferences from your account settings.
              </p>
            </>
          )}

          <div className="space-y-3">
            <Link
              href="/dashboard/settings/notifications"
              className="flex items-center justify-center gap-2 w-full px-6 py-3 bg-gradient-to-r from-[#D4AF37] to-[#9A7B00] text-black font-semibold rounded-lg hover:shadow-[0_0_20px_rgba(212,175,55,0.4)] transition-all"
            >
              Manage Preferences
            </Link>
            <Link
              href="/dashboard"
              className="flex items-center justify-center gap-2 w-full px-6 py-3 border border-[rgba(212,175,55,0.3)] text-[#D4AF37] font-medium rounded-lg hover:bg-[rgba(212,175,55,0.1)] transition-all"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Dashboard
            </Link>
          </div>
        </div>

        <p className="text-center text-xs text-[#525252] mt-4">
          HockeyLifeHL - Hockey League Management
        </p>
      </div>
    </div>
  );
}
