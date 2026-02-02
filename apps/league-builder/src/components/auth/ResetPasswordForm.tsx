'use client';

/**
 * Reset Password Form Component
 *
 * Form for setting new password after clicking reset link
 * Includes password strength meter and requirements
 * Uses BRAND-KIT gold/black theme
 */

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Eye, EyeOff, Lock, CheckCircle, Loader2, AlertCircle } from 'lucide-react';
import { updatePassword, validatePassword, type PasswordValidation } from '@/lib/actions/password-reset';
import { PasswordStrengthMeter } from './PasswordStrengthMeter';

interface ResetPasswordFormProps {
  /** Error message from URL params (e.g., expired token) */
  error?: string;
  /** Success callback */
  onSuccess?: () => void;
}

export function ResetPasswordForm({ error: initialError, onSuccess }: ResetPasswordFormProps) {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(initialError || null);
  const [validation, setValidation] = useState<PasswordValidation | null>(null);

  // Validate password on change
  async function handlePasswordChange(value: string) {
    setPassword(value);
    if (value.length > 0) {
      const result = await validatePassword(value);
      setValidation(result);
    } else {
      setValidation(null);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    // Check password match
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    // Check password strength
    if (validation && !validation.valid) {
      setError('Please meet all password requirements');
      return;
    }

    setLoading(true);

    try {
      const result = await updatePassword(password);

      if (result.success) {
        setSuccess(true);
        onSuccess?.();
        // Redirect to login after delay
        setTimeout(() => {
          router.push('/login');
        }, 3000);
      } else {
        setError(result.error || 'Failed to update password. Please try again.');
      }
    } catch (err) {
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  // Token error state
  if (initialError === 'Invalid or expired link') {
    return (
      <div className="bg-neutral-800 border border-gold-500/20 rounded-2xl shadow-xl p-8 text-center">
        <div className="w-16 h-16 mx-auto mb-6 bg-red-500/10 rounded-full flex items-center justify-center">
          <AlertCircle className="h-8 w-8 text-red-500" />
        </div>
        <h2 className="text-2xl font-bold text-neutral-100 mb-3">Link Expired</h2>
        <p className="text-neutral-400 mb-6">
          This password reset link has expired or is invalid. Please request a new one.
        </p>
        <Link
          href="/forgot-password"
          className="inline-block w-full py-3 px-6 bg-gradient-to-r from-gold-500 to-gold-600 text-black font-semibold rounded-xl hover:shadow-[0_0_40px_rgba(212,175,55,0.2)] hover:scale-[1.02] transition-all duration-300 text-center"
        >
          Request New Link
        </Link>
      </div>
    );
  }

  // Success state
  if (success) {
    return (
      <div className="bg-neutral-800 border border-gold-500/20 rounded-2xl shadow-xl p-8 text-center">
        <div className="w-16 h-16 mx-auto mb-6 bg-green-500/10 rounded-full flex items-center justify-center">
          <CheckCircle className="h-8 w-8 text-green-500" />
        </div>
        <h2 className="text-2xl font-bold text-neutral-100 mb-3">Password Updated!</h2>
        <p className="text-neutral-400 mb-6">
          Your password has been successfully updated. You'll be redirected to the login page
          shortly.
        </p>
        <div className="animate-pulse flex justify-center">
          <div className="h-1 w-24 bg-gold-500/30 rounded-full overflow-hidden">
            <div className="h-full bg-gold-500 animate-[loading_3s_ease-in-out]" />
          </div>
        </div>
        <Link
          href="/login"
          className="inline-block mt-6 text-gold-500 hover:text-gold-400 text-sm transition-colors"
        >
          Go to Login Now
        </Link>
      </div>
    );
  }

  return (
    <div className="bg-neutral-800 border border-gold-500/20 rounded-2xl shadow-xl p-8">
      <div className="text-center mb-6">
        <div className="w-12 h-12 mx-auto mb-4 bg-gold-500/10 rounded-full flex items-center justify-center">
          <Lock className="h-6 w-6 text-gold-500" />
        </div>
        <h2 className="text-2xl font-bold text-neutral-100 mb-2">Create New Password</h2>
        <p className="text-neutral-400 text-sm">
          Enter a strong password that you haven't used before.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* New Password */}
        <div>
          <label
            htmlFor="password"
            className="block text-sm font-medium text-neutral-300 mb-2"
          >
            New Password
          </label>
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              id="password"
              value={password}
              onChange={(e) => handlePasswordChange(e.target.value)}
              required
              autoComplete="new-password"
              autoFocus
              className="w-full px-4 py-3 pr-12 bg-black/50 border border-gold-500/30 rounded-xl text-white placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-gold-500/50 focus:border-transparent transition-all"
              placeholder="Enter new password"
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

        {/* Password Strength Meter */}
        <PasswordStrengthMeter password={password} />

        {/* Confirm Password */}
        <div>
          <label
            htmlFor="confirmPassword"
            className="block text-sm font-medium text-neutral-300 mb-2"
          >
            Confirm Password
          </label>
          <div className="relative">
            <input
              type={showConfirmPassword ? 'text' : 'password'}
              id="confirmPassword"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              autoComplete="new-password"
              className={`w-full px-4 py-3 pr-12 bg-black/50 border rounded-xl text-white placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:border-transparent transition-all ${
                confirmPassword.length > 0 && password !== confirmPassword
                  ? 'border-red-500/50 focus:ring-red-500/50'
                  : 'border-gold-500/30 focus:ring-gold-500/50'
              }`}
              placeholder="Confirm new password"
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-neutral-300 transition-colors"
            >
              {showConfirmPassword ? (
                <EyeOff className="w-5 h-5" />
              ) : (
                <Eye className="w-5 h-5" />
              )}
            </button>
          </div>
          {confirmPassword.length > 0 && password !== confirmPassword && (
            <p className="mt-1.5 text-xs text-red-400">Passwords do not match</p>
          )}
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
          disabled={
            loading ||
            !password ||
            !confirmPassword ||
            password !== confirmPassword ||
            (validation !== null && !validation.valid)
          }
          className="w-full py-3 px-6 bg-gradient-to-r from-gold-500 to-gold-600 text-black font-semibold rounded-xl hover:shadow-[0_0_40px_rgba(212,175,55,0.2)] hover:scale-[1.02] transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Updating...
            </>
          ) : (
            'Update Password'
          )}
        </button>
      </form>

      <div className="mt-6 pt-6 border-t border-neutral-700">
        <p className="text-xs text-neutral-500 text-center">
          Remember your password?{' '}
          <Link href="/login" className="text-gold-500 hover:underline">
            Back to Login
          </Link>
        </p>
      </div>
    </div>
  );
}

export default ResetPasswordForm;
