'use client';

import { useState, useTransition, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';

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

  function handleSubmit() {
    if (!token.trim()) {
      setError('Please enter a token');
      return;
    }

    setError(null);
    startTransition(async () => {
      // TODO: Wire up validateRefereeToken server action
      // For now, redirect to dashboard on any non-empty token
      // This will be replaced with actual token validation in Phase 1 task #8
      try {
        // Placeholder — validate against referee_sessions table
        router.push(`/${leagueSlug}/referee/dashboard`);
      } catch {
        setError('Invalid token');
      }
    });
  }

  return (
    <div className="flex items-center justify-center min-h-screen px-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-[var(--league-primary,#d4af37)]/10 mb-4">
            <svg className="w-8 h-8 text-[var(--league-primary,#d4af37)]" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 6v.75m0 3v.75m0 3v.75m0 3V18m-9-5.25h5.25M7.5 15h3M3.375 5.25c-.621 0-1.125.504-1.125 1.125v3.026a2.999 2.999 0 010 5.198v3.026c0 .621.504 1.125 1.125 1.125h17.25c.621 0 1.125-.504 1.125-1.125v-3.026a2.999 2.999 0 010-5.198V6.375c0-.621-.504-1.125-1.125-1.125H3.375z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">
            Referee Portal
          </h1>
          <p className="mt-2 text-sm text-[var(--color-text-secondary)]">
            Enter your referee token to access your schedule
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
                bg-[var(--color-surface)] border rounded-xl
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
                ? 'bg-[var(--color-surface)] text-[var(--color-text-secondary)] cursor-not-allowed'
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
              'Access Portal'
            )}
          </button>
        </div>

        {/* Help text */}
        <p className="mt-6 text-xs text-center text-[var(--color-text-secondary)]">
          Your token was provided by the league admin. Contact them if you need a new one.
        </p>
      </div>
    </div>
  );
}
