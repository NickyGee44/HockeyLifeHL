'use client';

import { signIn } from '@/lib/actions/auth';
import Link from 'next/link';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff, Loader2, AlertTriangle } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [remainingAttempts, setRemainingAttempts] = useState<number | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const formData = new FormData();
      formData.append('email', email);
      formData.append('password', password);

      const result = await signIn(formData);

      if (result?.error) {
        // Check if account is locked
        if (result.locked && result.lockedUntil) {
          router.push(`/account-locked?until=${encodeURIComponent(result.lockedUntil)}&email=${encodeURIComponent(email)}`);
          return;
        }

        // Show remaining attempts warning
        if (result.remainingAttempts !== undefined) {
          setRemainingAttempts(result.remainingAttempts);
        }

        setError(result.error);
      }
    } catch (err) {
      setError('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="bg-neutral-800 border border-gold-500/20 rounded-2xl shadow-xl p-8">
      <h2 className="text-2xl font-bold text-neutral-100 mb-6">Sign In</h2>

      <form onSubmit={handleSubmit} className="space-y-4">
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
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
            className="w-full px-4 py-3 bg-black/50 border border-gold-500/30 rounded-xl text-white placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-gold-500/50 focus:border-transparent transition-all"
            placeholder="you@company.com"
          />
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <label
              htmlFor="password"
              className="block text-sm font-medium text-neutral-300"
            >
              Password
            </label>
            <Link
              href="/forgot-password"
              className="text-xs text-gold-500 hover:text-gold-400 transition-colors"
            >
              Forgot password?
            </Link>
          </div>
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              id="password"
              name="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
              className="w-full px-4 py-3 pr-12 bg-black/50 border border-gold-500/30 rounded-xl text-white placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-gold-500/50 focus:border-transparent transition-all"
              placeholder="Enter your password"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-neutral-300 transition-colors"
            >
              {showPassword ? (
                <EyeOff className="w-5 h-5" />
              ) : (
                <Eye className="w-5 h-5" />
              )}
            </button>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-3">
            <p className="text-sm text-red-400">{error}</p>
          </div>
        )}

        {/* Remaining Attempts Warning */}
        {remainingAttempts !== null && remainingAttempts <= 2 && remainingAttempts > 0 && (
          <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-3 flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-amber-400">
              Warning: {remainingAttempts} attempt{remainingAttempts !== 1 ? 's' : ''} remaining
              before your account is temporarily locked.
            </p>
          </div>
        )}

        <button
          type="submit"
          disabled={loading || !email || !password}
          className="w-full py-3 px-6 bg-gradient-to-r from-gold-500 to-gold-600 text-black font-semibold rounded-xl hover:shadow-[0_0_40px_rgba(212,175,55,0.2)] hover:scale-[1.02] transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Signing in...
            </>
          ) : (
            'Sign In'
          )}
        </button>
      </form>

      <div className="mt-6 text-center">
        <p className="text-sm text-neutral-400">
          Don't have an account?{' '}
          <Link
            href="/signup"
            className="text-gold-500 hover:text-gold-400 hover:underline font-medium transition-colors"
          >
            Create one
          </Link>
        </p>
      </div>

      <div className="mt-4 pt-4 border-t border-neutral-700 text-center">
        <p className="text-xs text-neutral-500">
          Having trouble?{' '}
          <Link href="/account-recovery" className="text-gold-500 hover:underline">
            Contact Support
          </Link>
        </p>
      </div>
    </div>
  );
}
