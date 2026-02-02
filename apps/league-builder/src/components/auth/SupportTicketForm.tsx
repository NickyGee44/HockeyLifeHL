'use client';

/**
 * Support Ticket Form Component
 *
 * Form for submitting account recovery requests when self-service fails
 * Allows users to describe issues and request manual assistance
 * Uses BRAND-KIT gold/black theme
 */

import { useState } from 'react';
import Link from 'next/link';
import {
  HelpCircle,
  ArrowLeft,
  CheckCircle,
  Loader2,
  Lock,
  Mail,
  User,
  AlertCircle,
} from 'lucide-react';
import { submitRecoveryRequest } from '@/lib/actions/password-reset';

interface SupportTicketFormProps {
  /** Pre-fill email if known */
  defaultEmail?: string;
  /** Pre-select recovery type */
  defaultType?: string;
  /** Success callback */
  onSuccess?: (ticketId: string) => void;
}

const RECOVERY_TYPES = [
  {
    value: 'password_reset',
    label: "Can't Reset Password",
    description: "I'm not receiving password reset emails",
    icon: Lock,
  },
  {
    value: 'account_unlock',
    label: 'Account Locked',
    description: 'My account is locked and I need help',
    icon: Lock,
  },
  {
    value: 'email_change',
    label: 'Email Change',
    description: "I need to update my account email",
    icon: Mail,
  },
  {
    value: 'account_access',
    label: 'Account Access',
    description: "I can't access my account for other reasons",
    icon: User,
  },
];

export function SupportTicketForm({
  defaultEmail,
  defaultType,
  onSuccess,
}: SupportTicketFormProps) {
  const [email, setEmail] = useState(defaultEmail || '');
  const [recoveryType, setRecoveryType] = useState(defaultType || '');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [ticketId, setTicketId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!email || !recoveryType || !description) {
      setError('Please fill in all fields');
      return;
    }

    if (description.length < 10) {
      setError('Please provide more details about your issue');
      return;
    }

    setLoading(true);

    try {
      const formData = new FormData();
      formData.append('email', email);
      formData.append('recoveryType', recoveryType);
      formData.append('description', description);

      const result = await submitRecoveryRequest(formData);

      if (result.success && result.data) {
        setTicketId(result.data.ticketId);
        setSubmitted(true);
        onSuccess?.(result.data.ticketId);
      } else {
        setError(result.error || 'Failed to submit request. Please try again.');
      }
    } catch (err) {
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  // Success state
  if (submitted && ticketId) {
    return (
      <div className="bg-neutral-800 border border-gold-500/20 rounded-2xl shadow-xl p-8 text-center">
        <div className="w-16 h-16 mx-auto mb-6 bg-green-500/10 rounded-full flex items-center justify-center">
          <CheckCircle className="h-8 w-8 text-green-500" />
        </div>
        <h2 className="text-2xl font-bold text-neutral-100 mb-3">Request Submitted</h2>
        <p className="text-neutral-400 mb-4">
          Your account recovery request has been submitted successfully.
        </p>

        {/* Ticket ID */}
        <div className="bg-neutral-900/50 border border-gold-500/20 rounded-xl p-4 mb-6">
          <p className="text-xs text-neutral-500 mb-1">Reference Number</p>
          <p className="text-lg font-mono text-gold-500">{ticketId.substring(0, 8).toUpperCase()}</p>
        </div>

        <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4 mb-6 text-left">
          <h3 className="text-sm font-medium text-blue-300 mb-2">What happens next?</h3>
          <ul className="text-xs text-blue-200/70 space-y-1.5">
            <li>Our support team will review your request</li>
            <li>You'll receive an email update within 24-48 hours</li>
            <li>We may ask for additional verification</li>
          </ul>
        </div>

        <div className="space-y-3">
          <button
            onClick={() => {
              setSubmitted(false);
              setTicketId(null);
              setDescription('');
            }}
            className="w-full py-3 px-6 border border-gold-500/30 text-gold-500 font-medium rounded-xl hover:bg-gold-500/10 transition-all"
          >
            Submit Another Request
          </button>
          <Link
            href="/login"
            className="flex items-center justify-center gap-2 w-full py-3 px-6 text-neutral-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Login
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-neutral-800 border border-gold-500/20 rounded-2xl shadow-xl p-8">
      {/* Header */}
      <div className="text-center mb-6">
        <div className="w-12 h-12 mx-auto mb-4 bg-gold-500/10 rounded-full flex items-center justify-center">
          <HelpCircle className="h-6 w-6 text-gold-500" />
        </div>
        <h2 className="text-2xl font-bold text-neutral-100 mb-2">Account Recovery</h2>
        <p className="text-neutral-400 text-sm">
          Can't access your account? Tell us what's happening and we'll help.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Email */}
        <div>
          <label
            htmlFor="email"
            className="block text-sm font-medium text-neutral-300 mb-2"
          >
            Account Email
          </label>
          <input
            type="email"
            id="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
            className="w-full px-4 py-3 bg-black/50 border border-gold-500/30 rounded-xl text-white placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-gold-500/50 focus:border-transparent transition-all"
            placeholder="you@company.com"
          />
        </div>

        {/* Recovery Type Selection */}
        <div>
          <label className="block text-sm font-medium text-neutral-300 mb-3">
            What's the issue?
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {RECOVERY_TYPES.map((type) => (
              <button
                key={type.value}
                type="button"
                onClick={() => setRecoveryType(type.value)}
                className={`flex items-start gap-3 p-4 rounded-xl border text-left transition-all ${
                  recoveryType === type.value
                    ? 'bg-gold-500/10 border-gold-500/50'
                    : 'bg-neutral-900/50 border-neutral-700 hover:border-gold-500/30'
                }`}
              >
                <type.icon
                  className={`h-5 w-5 flex-shrink-0 mt-0.5 ${
                    recoveryType === type.value ? 'text-gold-500' : 'text-neutral-500'
                  }`}
                />
                <div>
                  <p
                    className={`text-sm font-medium ${
                      recoveryType === type.value ? 'text-gold-500' : 'text-neutral-300'
                    }`}
                  >
                    {type.label}
                  </p>
                  <p className="text-xs text-neutral-500">{type.description}</p>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Description */}
        <div>
          <label
            htmlFor="description"
            className="block text-sm font-medium text-neutral-300 mb-2"
          >
            Describe your issue
          </label>
          <textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            required
            rows={4}
            className="w-full px-4 py-3 bg-black/50 border border-gold-500/30 rounded-xl text-white placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-gold-500/50 focus:border-transparent transition-all resize-none"
            placeholder="Please describe what happened and any steps you've already tried..."
          />
          <p className="mt-1.5 text-xs text-neutral-500">
            {description.length}/500 characters (minimum 10)
          </p>
        </div>

        {/* Security Notice */}
        <div className="bg-neutral-900/50 border border-neutral-700 rounded-xl p-4">
          <div className="flex gap-3">
            <AlertCircle className="h-5 w-5 text-neutral-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-xs text-neutral-400">
                For your security, we may ask you to verify your identity before making changes to
                your account. This helps protect your data.
              </p>
            </div>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-3">
            <p className="text-sm text-red-400">{error}</p>
          </div>
        )}

        {/* Submit Button */}
        <button
          type="submit"
          disabled={loading || !email || !recoveryType || !description}
          className="w-full py-3 px-6 bg-gradient-to-r from-gold-500 to-gold-600 text-black font-semibold rounded-xl hover:shadow-[0_0_40px_rgba(212,175,55,0.2)] hover:scale-[1.02] transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Submitting...
            </>
          ) : (
            'Submit Request'
          )}
        </button>
      </form>

      {/* Back to Login */}
      <div className="mt-6">
        <Link
          href="/login"
          className="flex items-center justify-center gap-2 text-sm text-neutral-400 hover:text-gold-500 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Login
        </Link>
      </div>

      {/* Alternative Options */}
      <div className="mt-6 pt-6 border-t border-neutral-700">
        <p className="text-xs text-neutral-500 text-center">
          Remember your password?{' '}
          <Link href="/login" className="text-gold-500 hover:underline">
            Sign in
          </Link>
          {' | '}
          <Link href="/forgot-password" className="text-gold-500 hover:underline">
            Reset password
          </Link>
        </p>
      </div>
    </div>
  );
}

export default SupportTicketForm;
