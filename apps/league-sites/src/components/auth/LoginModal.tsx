'use client';

import { useState } from 'react';
import { X, Mail, Lock, AlertCircle, Loader2 } from 'lucide-react';
import { signInWithPassword, resetPassword } from '@/lib/supabase/auth';
import { OAuthProviderButton } from './OAuthProviderButton';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSignupClick: () => void;
  onSuccess?: () => void;
}

export function LoginModal({ isOpen, onClose, onSignupClick, onSuccess }: LoginModalProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [resetEmailSent, setResetEmailSent] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const { error } = await signInWithPassword(email, password);

      if (error) {
        setError(error.message);
      } else {
        onSuccess?.();
        onClose();
      }
    } catch {
      setError('An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const normalizedEmail = email.trim().toLowerCase();
      const { error } = await resetPassword(normalizedEmail);

      if (error) {
        setError(error.message);
      } else {
        setEmail(normalizedEmail);
        setResetEmailSent(true);
      }
    } catch {
      setError('Failed to send reset email');
    } finally {
      setIsLoading(false);
    }
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--blh-night)]/75 p-4 backdrop-blur-sm"
      onClick={handleBackdropClick}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={showForgotPassword ? 'Reset Password' : 'Sign In'}
        className="glass-card-strong relative max-h-[calc(100dvh-2rem)] w-full max-w-md overflow-y-auto"
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="glass-control absolute right-3 top-3 z-10 flex min-h-11 min-w-11 items-center justify-center rounded-xl border border-transparent text-[var(--color-text-muted)] transition-colors hover:border-[var(--blh-glass-border)] hover:text-[var(--color-text-primary)]"
          aria-label="Close sign in"
        >
          <X className="w-5 h-5 text-[var(--color-text-muted)]" />
        </button>

        <div className="p-8">
          {showForgotPassword ? (
            // Forgot Password Form
            <>
              <h2 className="text-2xl font-bold mb-2">Reset Password</h2>
              <p className="text-[var(--color-text-secondary)] mb-6">
                Enter your email and we&apos;ll send you a reset link.
              </p>

              {resetEmailSent ? (
                <div className="text-center py-8">
                  <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full border border-emerald-400/25 bg-emerald-500/15">
                    <Mail className="h-8 w-8 text-emerald-400" aria-hidden="true" />
                  </div>
                  <h3 className="text-lg font-semibold mb-2">Check Your Email</h3>
                  <p className="text-[var(--color-text-secondary)] mb-4">
                    If an account exists for {email}, a password reset link has been sent.
                  </p>
                  <button
                    onClick={() => {
                      setShowForgotPassword(false);
                      setResetEmailSent(false);
                    }}
                    className="inline-flex min-h-11 items-center rounded-lg px-3 font-medium text-[var(--league-primary)] hover:bg-[var(--color-surface-hover)]"
                  >
                    Back to login
                  </button>
                </div>
              ) : (
                <form onSubmit={handleForgotPassword} className="space-y-4">
                  {error && (
                    <div role="alert" className="glass-control flex items-center gap-2 rounded-xl border border-red-400/25 p-3 text-sm text-red-300">
                      <AlertCircle className="w-4 h-4 flex-shrink-0" />
                      <span>{error}</span>
                    </div>
                  )}

                  <div>
                    <label htmlFor="reset-email" className="block text-sm font-medium mb-1.5">
                      Email Address
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--color-text-muted)]" />
                      <input
                        type="email"
                        id="reset-email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="
                          glass-control min-h-11 w-full rounded-xl border border-[var(--blh-glass-border)] py-3 pl-11 pr-4
                          text-[var(--color-text-primary)]
                          focus:outline-none focus:ring-2 focus:ring-[var(--league-primary)]/50 focus:border-[var(--league-primary)]
                          transition-all duration-200
                        "
                        placeholder="you@example.com"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading}
                    className="
                      flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-[var(--league-primary-border)] px-6 py-3
                      bg-[var(--league-primary-strong)] text-[var(--league-on-primary)] font-semibold
                      hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed
                      transition-all duration-200
                    "
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        Sending...
                      </>
                    ) : (
                      'Send Reset Link'
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowForgotPassword(false)}
                    className="inline-flex min-h-11 w-full items-center justify-center rounded-lg px-3 text-center text-sm text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-text-primary)]"
                  >
                    Back to login
                  </button>
                </form>
              )}
            </>
          ) : (
            // Login Form
            <>
              <h2 className="text-2xl font-bold mb-2">Welcome Back</h2>
              <p className="text-[var(--color-text-secondary)] mb-6">
                Sign in to access your dashboard
              </p>

              {/* OAuth Providers */}
              <div className="space-y-3">
                <OAuthProviderButton
                  provider="google"
                  label="Continue with Google"
                />
                <OAuthProviderButton
                  provider="apple"
                  label="Continue with Apple"
                />
              </div>

              {/* Divider */}
              <div className="relative my-5">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-[var(--color-border)]" />
                </div>
                <div className="relative flex justify-center text-xs">
                  <span className="glass-control rounded-full px-3 text-[var(--color-text-muted)]">
                    or continue with email
                  </span>
                </div>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                {error && (
                  <div role="alert" className="glass-control flex items-center gap-2 rounded-xl border border-red-400/25 p-3 text-sm text-red-300">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    <span>{error}</span>
                  </div>
                )}

                <div>
                  <label htmlFor="email" className="block text-sm font-medium mb-1.5">
                    Email Address
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--color-text-muted)]" />
                    <input
                      type="email"
                      id="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="
                        glass-control min-h-11 w-full rounded-xl border border-[var(--blh-glass-border)] py-3 pl-11 pr-4
                        text-[var(--color-text-primary)]
                        focus:outline-none focus:ring-2 focus:ring-[var(--league-primary)]/50 focus:border-[var(--league-primary)]
                        transition-all duration-200
                      "
                      placeholder="you@example.com"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="password" className="block text-sm font-medium mb-1.5">
                    Password
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--color-text-muted)]" />
                    <input
                      type="password"
                      id="password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="
                        glass-control min-h-11 w-full rounded-xl border border-[var(--blh-glass-border)] py-3 pl-11 pr-4
                        text-[var(--color-text-primary)]
                        focus:outline-none focus:ring-2 focus:ring-[var(--league-primary)]/50 focus:border-[var(--league-primary)]
                        transition-all duration-200
                      "
                      placeholder="Enter your password"
                    />
                  </div>
                </div>

                <div className="text-right">
                  <button
                    type="button"
                    onClick={() => setShowForgotPassword(true)}
                    className="inline-flex min-h-11 items-center rounded-lg px-2 text-sm font-medium text-[var(--league-primary)] hover:bg-[var(--color-surface-hover)]"
                  >
                    Forgot password?
                  </button>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="
                    flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-[var(--league-primary-border)] px-6 py-3
                    bg-[var(--league-primary-strong)] text-[var(--league-on-primary)] font-semibold
                    hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed
                    transition-all duration-200
                  "
                >
                  {isLoading ? (
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
                <span className="text-[var(--color-text-secondary)]">Don&apos;t have an account? </span>
                <button
                  onClick={onSignupClick}
                  className="inline-flex min-h-11 items-center rounded-lg px-2 font-medium text-[var(--league-primary)] hover:bg-[var(--color-surface-hover)]"
                >
                  Sign up
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
