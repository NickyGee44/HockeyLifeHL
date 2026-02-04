'use client';

import { signUp } from '@/lib/actions/auth';
import Link from 'next/link';
import { useState } from 'react';
import { cn } from '@hockey-life/ui/lib/utils';
import { Loader2 } from 'lucide-react';

export default function SignUpPage() {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [acceptedPrivacy, setAcceptedPrivacy] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const formData = new FormData(e.currentTarget);

    try {
      const result = await signUp(formData);
      if (result?.error) {
        setError(result.error);
      } else {
        setSuccess(true);
      }
    } catch {
      setError('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <div className="bg-white/[0.04] border border-white/10 backdrop-blur-xl rounded-2xl p-8 text-center">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-green-500/10 flex items-center justify-center">
          <svg className="w-8 h-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h2 className="text-2xl font-bold text-white mb-2">
          Check your email
        </h2>
        <p className="text-sm text-neutral-400">
          We sent you a confirmation link. Please check your inbox to verify your account.
        </p>
      </div>
    );
  }

  const inputClasses = cn(
    'w-full px-4 py-3 rounded-xl',
    'bg-neutral-800 border border-neutral-700',
    'text-white placeholder:text-neutral-500',
    'focus:outline-none focus:ring-2 focus:ring-rink-500 focus:border-transparent',
    'transition-all'
  );

  return (
    <div className="bg-white/[0.04] border border-white/10 backdrop-blur-xl rounded-2xl p-8">
      <h2 className="text-2xl font-bold text-white mb-2">
        Create Your Account
      </h2>
      <p className="text-sm text-neutral-400 mb-6">
        Start managing your hockey league
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label
            htmlFor="fullName"
            className="block text-sm font-medium text-neutral-300 mb-2"
          >
            Full Name
          </label>
          <input
            type="text"
            id="fullName"
            name="fullName"
            required
            className={inputClasses}
            placeholder="John Doe"
          />
        </div>

        <div>
          <label
            htmlFor="email"
            className="block text-sm font-medium text-neutral-300 mb-2"
          >
            Email
          </label>
          <input
            type="email"
            id="email"
            name="email"
            required
            className={inputClasses}
            placeholder="you@example.com"
          />
        </div>

        <div>
          <label
            htmlFor="password"
            className="block text-sm font-medium text-neutral-300 mb-2"
          >
            Password
          </label>
          <input
            type="password"
            id="password"
            name="password"
            required
            minLength={8}
            className={inputClasses}
            placeholder="••••••••"
          />
          <div className="text-xs text-neutral-500 mt-1.5 space-y-0.5">
            <p className="font-medium text-neutral-400">Password must contain:</p>
            <ul className="list-disc list-inside ml-1 space-y-0.5">
              <li>At least 8 characters</li>
              <li>One uppercase letter (A-Z)</li>
              <li>One lowercase letter (a-z)</li>
              <li>One number (0-9)</li>
              <li>One special character (!@#$%^&*)</li>
            </ul>
          </div>
        </div>

        <div className="border-t border-white/[0.06] pt-4">
          <label
            htmlFor="organizationName"
            className="block text-sm font-medium text-neutral-300 mb-2"
          >
            Organization Name
          </label>
          <input
            type="text"
            id="organizationName"
            name="organizationName"
            required
            className={inputClasses}
            placeholder="My Hockey League"
          />
          <p className="text-xs text-neutral-500 mt-1">
            This will be the name of your organization that manages leagues
          </p>
        </div>

        <div className="border-t border-white/[0.06] pt-4 space-y-3">
          <label className="flex items-start gap-3 cursor-pointer group">
            <input
              type="checkbox"
              id="acceptTerms"
              name="acceptTerms"
              value="true"
              checked={acceptedTerms}
              onChange={(e) => setAcceptedTerms(e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-neutral-600 bg-neutral-800 text-rink-500 focus:ring-rink-500 focus:ring-offset-0 cursor-pointer"
            />
            <span className="text-sm text-neutral-300 group-hover:text-neutral-200">
              I accept the{' '}
              <Link href="/terms" target="_blank" className="text-rink-500 hover:text-rink-400 underline" onClick={(e) => e.stopPropagation()}>
                Terms of Service
              </Link>{' '}
              <span className="text-red-400">*</span>
            </span>
          </label>

          <label className="flex items-start gap-3 cursor-pointer group">
            <input
              type="checkbox"
              id="acceptPrivacy"
              name="acceptPrivacy"
              value="true"
              checked={acceptedPrivacy}
              onChange={(e) => setAcceptedPrivacy(e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-neutral-600 bg-neutral-800 text-rink-500 focus:ring-rink-500 focus:ring-offset-0 cursor-pointer"
            />
            <span className="text-sm text-neutral-300 group-hover:text-neutral-200">
              I accept the{' '}
              <Link href="/privacy" target="_blank" className="text-rink-500 hover:text-rink-400 underline" onClick={(e) => e.stopPropagation()}>
                Privacy Policy
              </Link>{' '}
              <span className="text-red-400">*</span>
            </span>
          </label>

          <p className="text-xs text-neutral-500">
            <span className="text-red-400">*</span> Required to create an account
          </p>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-3">
            <p className="text-sm text-red-400">{error}</p>
          </div>
        )}

        <button
          type="submit"
          disabled={loading || !acceptedTerms || !acceptedPrivacy}
          className={cn(
            'w-full py-3 px-4 rounded-xl font-semibold text-sm',
            'bg-gradient-to-r from-rink-500 to-arena-500 text-black',
            'hover:shadow-lg hover:shadow-rink-500/20',
            'disabled:opacity-50 disabled:cursor-not-allowed',
            'transition-all flex items-center justify-center gap-2'
          )}
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Creating account...
            </>
          ) : (
            'Create Account'
          )}
        </button>
      </form>

      <div className="mt-6 text-center">
        <p className="text-sm text-neutral-400">
          Already have an account?{' '}
          <Link
            href="/login"
            className="text-rink-500 hover:text-rink-400 font-medium"
          >
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
