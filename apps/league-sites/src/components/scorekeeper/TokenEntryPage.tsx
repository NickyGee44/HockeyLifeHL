'use client';

import { useState, useTransition, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { validateScorekeeperToken, requestTokenByEmail } from '@/lib/actions/scorekeeper';

interface TokenEntryPageProps {
  leagueSlug: string;
  initialToken?: string;
}

export function TokenEntryPage({ leagueSlug, initialToken }: TokenEntryPageProps) {
  const [token, setToken] = useState(initialToken || '');
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);

  // Email request state
  const [showEmailForm, setShowEmailForm] = useState(false);
  const [email, setEmail] = useState('');
  const [emailSending, setEmailSending] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [emailCooldown, setEmailCooldown] = useState(0);

  // Auto-submit if token is provided via URL
  useEffect(() => {
    if (initialToken) {
      handleSubmit();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Cooldown timer
  useEffect(() => {
    if (emailCooldown <= 0) return;
    const timer = setInterval(() => {
      setEmailCooldown(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [emailCooldown]);

  function handleSubmit() {
    if (!token.trim()) {
      setError('Please enter a token');
      return;
    }

    setError(null);
    startTransition(async () => {
      const result = await validateScorekeeperToken(token.trim());

      if (result.success && result.session) {
        if (result.session.sessionType === 'multi') {
          router.push(`/${leagueSlug}/scorekeeper/dashboard`);
        } else {
          router.push(`/${leagueSlug}/scorekeeper/game/${result.session.gameId}`);
        }
      } else {
        setError(result.error || 'Invalid token');
      }
    });
  }

  async function handleEmailRequest() {
    if (!email.trim() || emailCooldown > 0) return;

    setEmailSending(true);
    try {
      await requestTokenByEmail(leagueSlug, email.trim());
      setEmailSent(true);
      setEmailCooldown(30);
    } catch {
      // Still show success to prevent enumeration
      setEmailSent(true);
      setEmailCooldown(30);
    } finally {
      setEmailSending(false);
    }
  }

  return (
    <div className="flex items-center justify-center min-h-screen px-4">
      <div className="glass-card-strong w-full max-w-md rounded-[28px] p-6 sm:p-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-[var(--league-primary,#d4af37)]/10 mb-4">
            <svg className="w-8 h-8 text-[var(--league-primary,#d4af37)]" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 6v.75m0 3v.75m0 3v.75m0 3V18m-9-5.25h5.25M7.5 15h3M3.375 5.25c-.621 0-1.125.504-1.125 1.125v3.026a2.999 2.999 0 010 5.198v3.026c0 .621.504 1.125 1.125 1.125h17.25c.621 0 1.125-.504 1.125-1.125v-3.026a2.999 2.999 0 010-5.198V6.375c0-.621-.504-1.125-1.125-1.125H3.375z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">
            Scorekeeper Access
          </h1>
          <p className="mt-2 text-sm text-[var(--color-text-secondary)]">
            Enter your scorekeeper token to begin
          </p>
        </div>

        {/* Token Input */}
        <div className="space-y-4">
          <div>
            <input
              ref={inputRef}
              type="text"
              value={token}
              onChange={e => {
                setToken(e.target.value.toUpperCase());
                setError(null);
              }}
              onKeyDown={e => {
                if (e.key === 'Enter') handleSubmit();
              }}
              placeholder="Enter token (e.g. ABC123XYZ)"
              maxLength={20}
              className={`
                w-full px-4 py-4 text-center text-xl font-mono tracking-[0.3em]
                glass-control border rounded-xl
                text-[var(--color-text-primary)]
                placeholder:text-[var(--color-text-secondary)]/40
                placeholder:tracking-normal placeholder:text-base placeholder:font-sans
                focus:outline-none focus:ring-2 focus:ring-[var(--league-primary,#d4af37)] focus:border-transparent
                transition-all duration-200
                ${error ? 'border-red-500' : 'border-[var(--color-border)]'}
              `}
              autoComplete="off"
              spellCheck={false}
              disabled={isPending}
            />
            {error && (
              <p className="mt-2 text-sm text-red-500 text-center">{error}</p>
            )}
          </div>

          <button
            onClick={handleSubmit}
            disabled={isPending || !token.trim()}
            className={`
              w-full py-4 rounded-xl font-semibold text-base
              transition-all duration-200
              focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2
              ${isPending || !token.trim()
                ? 'glass-control text-[var(--color-text-secondary)] cursor-not-allowed'
                : 'bg-[var(--league-primary,#d4af37)] text-[var(--color-accent-text,#000)] hover:opacity-90 active:scale-[0.98]'
              }
            `}
          >
            {isPending ? (
              <span className="inline-flex items-center gap-2">
                <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Validating...
              </span>
            ) : (
              'Start Scoring'
            )}
          </button>
        </div>

        {/* Help text */}
        <p className="mt-6 text-xs text-center text-[var(--color-text-secondary)]">
          Your token was provided by the league admin. Contact them if you need a new one.
        </p>

        {/* Divider */}
        <div className="flex items-center gap-3 mt-6">
          <div className="flex-1 h-px bg-[var(--color-border)]" />
          <span className="text-xs text-[var(--color-text-secondary)]">or</span>
          <div className="flex-1 h-px bg-[var(--color-border)]" />
        </div>

        {/* Email token request */}
        <div className="mt-4">
          {!showEmailForm ? (
            <button
              onClick={() => setShowEmailForm(true)}
              className="min-h-11 w-full text-sm text-[var(--color-text-secondary)] transition-colors hover:text-[var(--color-text-primary)]"
            >
              Lost your token? Get it by email
            </button>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-[var(--color-text-secondary)] text-center">
                Enter the email address your league admin assigned to you.
              </p>
              {emailSent ? (
                <div className="rounded-xl bg-green-500/10 border border-green-500/20 p-4">
                  <p className="text-sm text-green-600 dark:text-green-400 text-center">
                    If you have an active assignment, you&apos;ll receive an email shortly.
                  </p>
                </div>
              ) : (
                <div className="flex gap-2">
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') handleEmailRequest();
                    }}
                    placeholder="you@example.com"
                    className="
                      flex-1 px-4 py-3 text-sm
                      glass-control border border-[var(--color-border)] rounded-xl
                      text-[var(--color-text-primary)]
                      placeholder:text-[var(--color-text-secondary)]/40
                      focus:outline-none focus:ring-2 focus:ring-[var(--league-primary,#d4af37)] focus:border-transparent
                      transition-all duration-200
                    "
                    disabled={emailSending}
                    autoComplete="email"
                  />
                  <button
                    onClick={handleEmailRequest}
                    disabled={emailSending || !email.trim() || emailCooldown > 0}
                    className={`
                      px-5 py-3 rounded-xl font-medium text-sm whitespace-nowrap
                      transition-all duration-200
                      focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2
                      ${emailSending || !email.trim() || emailCooldown > 0
                        ? 'glass-control text-[var(--color-text-secondary)] cursor-not-allowed'
                        : 'bg-[var(--league-primary,#d4af37)] text-[var(--color-accent-text,#000)] hover:opacity-90 active:scale-[0.98]'
                      }
                    `}
                  >
                    {emailSending ? (
                      <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                    ) : emailCooldown > 0 ? (
                      `${emailCooldown}s`
                    ) : (
                      'Send'
                    )}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
