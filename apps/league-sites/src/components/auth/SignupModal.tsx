'use client';

import { useState } from 'react';
import { X, Mail, Lock, User, AlertCircle, Loader2, Check } from 'lucide-react';
import { signUp } from '@/lib/supabase/auth';
import { OAuthProviderButton } from './OAuthProviderButton';

interface SignupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginClick: () => void;
  onSuccess?: () => void;
}

export function SignupModal({ isOpen, onClose, onLoginClick }: SignupModalProps) {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validate passwords match
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    // Validate password length
    if (formData.password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    setIsLoading(true);

    try {
      const { error } = await signUp(formData.email, formData.password, {
        first_name: formData.firstName,
        last_name: formData.lastName,
      });

      if (error) {
        setError(error.message);
      } else {
        setIsSuccess(true);
      }
    } catch {
      setError('An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--blh-night)]/75 p-4 backdrop-blur-sm"
      onClick={handleBackdropClick}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Create Account"
        className="glass-card-strong relative max-h-[calc(100dvh-2rem)] w-full max-w-md overflow-y-auto"
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="glass-control absolute right-3 top-3 z-10 flex min-h-11 min-w-11 items-center justify-center rounded-xl border border-transparent text-[var(--color-text-muted)] transition-colors hover:border-[var(--blh-glass-border)] hover:text-[var(--color-text-primary)]"
          aria-label="Close account creation"
        >
          <X className="w-5 h-5 text-[var(--color-text-muted)]" />
        </button>

        <div className="p-8">
          {isSuccess ? (
            // Success State
            <div className="text-center py-8">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full border border-emerald-400/25 bg-emerald-500/15">
                <Check className="h-8 w-8 text-emerald-400" aria-hidden="true" />
              </div>
              <h2 className="text-2xl font-bold mb-2">Check Your Email</h2>
              <p className="text-[var(--color-text-secondary)] mb-6">
                We&apos;ve sent a confirmation link to <strong>{formData.email}</strong>
              </p>
              <p className="text-sm text-[var(--color-text-muted)] mb-6">
                Click the link in your email to activate your account.
              </p>
              <button
                onClick={() => {
                  setIsSuccess(false);
                  onLoginClick();
                }}
                className="inline-flex min-h-11 items-center rounded-lg px-3 font-medium text-[var(--league-primary)] hover:bg-[var(--color-surface-hover)]"
              >
                Back to login
              </button>
            </div>
          ) : (
            // Signup Form
            <>
              <h2 className="text-2xl font-bold mb-2">Create Account</h2>
              <p className="text-[var(--color-text-secondary)] mb-6">
                Join the league community
              </p>

              {/* OAuth Providers */}
              <div className="space-y-3">
                <OAuthProviderButton
                  provider="google"
                  label="Sign up with Google"
                />
                <OAuthProviderButton
                  provider="apple"
                  label="Sign up with Apple"
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

                {/* Name Fields */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label htmlFor="firstName" className="block text-sm font-medium mb-1.5">
                      First Name
                    </label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--color-text-muted)]" />
                      <input
                        type="text"
                        id="firstName"
                        name="firstName"
                        required
                        value={formData.firstName}
                        onChange={handleChange}
                        className="
                          glass-control min-h-11 w-full rounded-xl border border-[var(--blh-glass-border)] py-3 pl-11 pr-4
                          text-[var(--color-text-primary)]
                          focus:outline-none focus:ring-2 focus:ring-[var(--league-primary)]/50 focus:border-[var(--league-primary)]
                          transition-all duration-200
                        "
                        placeholder="John"
                      />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="lastName" className="block text-sm font-medium mb-1.5">
                      Last Name
                    </label>
                    <input
                      type="text"
                      id="lastName"
                      name="lastName"
                      required
                      value={formData.lastName}
                      onChange={handleChange}
                      className="
                        glass-control min-h-11 w-full rounded-xl border border-[var(--blh-glass-border)] px-4 py-3
                        text-[var(--color-text-primary)]
                        focus:outline-none focus:ring-2 focus:ring-[var(--league-primary)]/50 focus:border-[var(--league-primary)]
                        transition-all duration-200
                      "
                      placeholder="Doe"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="email" className="block text-sm font-medium mb-1.5">
                    Email Address
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--color-text-muted)]" />
                    <input
                      type="email"
                      id="email"
                      name="email"
                      required
                      value={formData.email}
                      onChange={handleChange}
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
                      name="password"
                      required
                      minLength={8}
                      value={formData.password}
                      onChange={handleChange}
                      className="
                        glass-control min-h-11 w-full rounded-xl border border-[var(--blh-glass-border)] py-3 pl-11 pr-4
                        text-[var(--color-text-primary)]
                        focus:outline-none focus:ring-2 focus:ring-[var(--league-primary)]/50 focus:border-[var(--league-primary)]
                        transition-all duration-200
                      "
                      placeholder="Min. 8 characters"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="confirmPassword" className="block text-sm font-medium mb-1.5">
                    Confirm Password
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--color-text-muted)]" />
                    <input
                      type="password"
                      id="confirmPassword"
                      name="confirmPassword"
                      required
                      value={formData.confirmPassword}
                      onChange={handleChange}
                      className="
                        glass-control min-h-11 w-full rounded-xl border border-[var(--blh-glass-border)] py-3 pl-11 pr-4
                        text-[var(--color-text-primary)]
                        focus:outline-none focus:ring-2 focus:ring-[var(--league-primary)]/50 focus:border-[var(--league-primary)]
                        transition-all duration-200
                      "
                      placeholder="Confirm your password"
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
                      Creating account...
                    </>
                  ) : (
                    'Create Account'
                  )}
                </button>

                <p className="text-xs text-[var(--color-text-muted)] text-center">
                  By signing up, you agree to our Terms of Service and Privacy Policy.
                </p>
              </form>

              <div className="mt-6 text-center">
                <span className="text-[var(--color-text-secondary)]">Already have an account? </span>
                <button
                  onClick={onLoginClick}
                  className="inline-flex min-h-11 items-center rounded-lg px-2 font-medium text-[var(--league-primary)] hover:bg-[var(--color-surface-hover)]"
                >
                  Sign in
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
