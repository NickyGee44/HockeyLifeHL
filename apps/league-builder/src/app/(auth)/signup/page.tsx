'use client';

import { signUp } from '@/lib/actions/auth';
import Link from 'next/link';
import { useState } from 'react';

export default function SignUpPage() {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const formData = new FormData(e.currentTarget);

    try {
      const result = await signUp(formData);
      if (result?.error) {
        setError(result.error);
        setLoading(false);
        // Form data is preserved since we prevented default
      }
      // If no error, the server action will handle redirect
      // Don't setLoading(false) here as page will redirect
    } catch {
      setError('An unexpected error occurred');
      setLoading(false);
    }
  }

  return (
    <div className="bg-neutral-800 border border-gold-500/20 rounded-2xl shadow-xl p-8">
      <h2 className="text-2xl font-bold text-neutral-100 mb-6">
        Create Your Account
      </h2>

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
            className="w-full px-4 py-3 bg-black/50 border border-gold-500/30 rounded-xl text-white placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-gold-500/50 focus:border-transparent transition-all"
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
            className="w-full px-4 py-3 bg-black/50 border border-gold-500/30 rounded-xl text-white placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-gold-500/50 focus:border-transparent transition-all"
            placeholder="you@company.com"
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
            className="w-full px-4 py-3 bg-black/50 border border-gold-500/30 rounded-xl text-white placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-gold-500/50 focus:border-transparent transition-all"
            placeholder="••••••••"
          />
          <div className="text-xs text-neutral-400 mt-2 space-y-1">
            <p className="font-medium">Password must contain:</p>
            <ul className="list-disc list-inside space-y-0.5 ml-2">
              <li>At least 8 characters</li>
              <li>One uppercase letter (A-Z)</li>
              <li>One lowercase letter (a-z)</li>
              <li>One number (0-9)</li>
              <li>One special character (!@#$%^&*)</li>
            </ul>
          </div>
        </div>

        <div className="border-t border-gold-500/20 pt-4">
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
            className="w-full px-4 py-3 bg-black/50 border border-gold-500/30 rounded-xl text-white placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-gold-500/50 focus:border-transparent transition-all"
            placeholder="My Hockey League"
          />
          <p className="text-xs text-neutral-400 mt-1">
            This will be the name of your organization that manages leagues
          </p>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-3">
            <p className="text-sm text-red-400">{error}</p>
          </div>
        )}

        <div className="border-t border-gold-500/20 pt-4 space-y-3">
          <div className="space-y-3">
            <label className="flex items-start gap-3 cursor-pointer group">
              <input
                type="checkbox"
                id="acceptTerms"
                name="acceptTerms"
                value="true"
                required
                className="checkbox-gold mt-0.5"
              />
              <span className="text-sm text-neutral-300 group-hover:text-neutral-200">
                I accept the{' '}
                <Link href="/terms" target="_blank" className="text-gold-500 hover:text-gold-400 hover:underline" onClick={(e) => e.stopPropagation()}>
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
                required
                className="checkbox-gold mt-0.5"
              />
              <span className="text-sm text-neutral-300 group-hover:text-neutral-200">
                I accept the{' '}
                <Link href="/privacy" target="_blank" className="text-gold-500 hover:text-gold-400 hover:underline" onClick={(e) => e.stopPropagation()}>
                  Privacy Policy
                </Link>{' '}
                <span className="text-red-400">*</span>
              </span>
            </label>
          </div>

          <div className="border-t border-gold-500/20 pt-3 space-y-3">
            <p className="text-xs font-medium text-neutral-300">
              Optional Communications
            </p>

            <label className="flex items-start gap-3 cursor-pointer group">
              <input
                type="checkbox"
                id="marketingEmails"
                name="marketingEmails"
                value="true"
                className="checkbox-gold mt-0.5"
              />
              <span className="text-sm text-neutral-300 group-hover:text-neutral-200">
                I agree to receive marketing emails (you can unsubscribe anytime)
              </span>
            </label>

            <label className="flex items-start gap-3 cursor-pointer group">
              <input
                type="checkbox"
                id="analyticsTracking"
                name="analyticsTracking"
                value="true"
                defaultChecked
                className="checkbox-gold mt-0.5"
              />
              <span className="text-sm text-neutral-300 group-hover:text-neutral-200">
                I agree to analytics tracking to help improve the platform
              </span>
            </label>
          </div>

          <p className="text-xs text-neutral-400">
            <span className="text-red-400">*</span> Required to create an account
          </p>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 px-6 bg-gradient-to-r from-gold-500 to-gold-600 text-black font-semibold rounded-xl hover:shadow-[0_0_40px_rgba(212,175,55,0.2)] hover:scale-[1.02] transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
        >
          {loading ? 'Creating account...' : 'Create Account'}
        </button>
      </form>

      <div className="mt-6 text-center">
        <p className="text-sm text-neutral-400">
          Already have an account?{' '}
          <Link
            href="/login"
            className="text-gold-500 hover:text-gold-400 hover:underline font-medium transition-colors"
          >
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
