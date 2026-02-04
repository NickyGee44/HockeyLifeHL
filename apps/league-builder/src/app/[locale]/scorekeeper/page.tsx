'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { validateScorekeeperToken } from '@/lib/actions/scorekeeper';

/**
 * Scorekeeper Login Page
 * Entry point for scorekeepers using a game-specific token
 * Mobile-optimized with large touch targets and gold accent theme
 */
export default function ScorekeeperLoginPage() {
  const router = useRouter();
  const [token, setToken] = useState('');
  const [isValidating, setIsValidating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [gameInfo, setGameInfo] = useState<{
    homeTeam: string;
    awayTeam: string;
    scheduledAt: string;
  } | null>(null);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Split token into 4 groups of 4 characters for better UX
  const tokenParts = [
    token.slice(0, 4),
    token.slice(4, 8),
    token.slice(8, 12),
    token.slice(12, 16),
  ];

  const handleInputChange = (index: number, value: string) => {
    const cleaned = value.toUpperCase().replace(/[^A-Z0-9]/g, '');

    // Build new token
    const newParts = [...tokenParts];
    newParts[index] = cleaned.slice(0, 4);
    const newToken = newParts.join('');
    setToken(newToken);
    setError(null);

    // Auto-focus next input when current is full
    if (cleaned.length >= 4 && index < 3) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    // Handle backspace to go to previous input
    if (e.key === 'Backspace' && tokenParts[index] === '' && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 16);
    setToken(pasted);
    setError(null);

    // Focus appropriate input based on paste length
    const focusIndex = Math.min(Math.floor(pasted.length / 4), 3);
    inputRefs.current[focusIndex]?.focus();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (token.length < 8) {
      setError('Please enter a valid token');
      return;
    }

    setIsValidating(true);
    setError(null);

    try {
      const result = await validateScorekeeperToken(token);

      if (result.success && result.session) {
        setGameInfo({
          homeTeam: result.session.homeTeamName,
          awayTeam: result.session.awayTeamName,
          scheduledAt: result.session.scheduledAt,
        });

        // Navigate to game entry page
        setTimeout(() => {
          router.push(`/scorekeeper/game/${result.session!.gameId}`);
        }, 1000);
      } else {
        setError(result.error || 'Invalid or expired token');
      }
    } catch {
      setError('Failed to validate token. Please try again.');
    } finally {
      setIsValidating(false);
    }
  };

  return (
    <div className="min-h-screen bg-neutral-950 flex flex-col items-center justify-center p-4">
      {/* Background pattern */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(212,175,55,0.03)_0%,transparent_70%)]" />

      <div className="relative z-10 w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-rink-500/10 border border-white/10 mb-4">
            <svg className="w-8 h-8 text-rink-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-white">Scorekeeper Access</h1>
          <p className="text-neutral-400 mt-2">Enter your game access token</p>
        </div>

        {/* Token Entry Card */}
        <div className="bg-white/[0.04] border border-white/10 backdrop-blur-xl rounded-2xl p-6 md:p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Token Input Grid */}
            <div>
              <label className="block text-sm font-medium text-neutral-300 mb-3">
                Access Token
              </label>
              <div className="flex gap-2 md:gap-3 justify-center">
                {[0, 1, 2, 3].map((index) => (
                  <input
                    key={index}
                    ref={(el) => { inputRefs.current[index] = el; }}
                    type="text"
                    inputMode="text"
                    autoCapitalize="characters"
                    autoComplete="off"
                    value={tokenParts[index]}
                    onChange={(e) => handleInputChange(index, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(index, e)}
                    onPaste={handlePaste}
                    maxLength={4}
                    className="w-16 md:w-20 h-14 md:h-16 text-center text-xl md:text-2xl font-mono font-bold
                      bg-neutral-950 border-2 border-rink-500/30 rounded-xl
                      text-white placeholder-neutral-600
                      focus:border-rink-500 focus:ring-2 focus:ring-rink-500/20 focus:outline-none
                      transition-all duration-200
                      touch-manipulation"
                    placeholder="····"
                  />
                ))}
              </div>
              <p className="text-xs text-neutral-500 text-center mt-2">
                Enter the 16-character code provided by your league
              </p>
            </div>

            {/* Error Message */}
            {error && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4">
                <p className="text-red-400 text-sm text-center">{error}</p>
              </div>
            )}

            {/* Game Info Preview */}
            {gameInfo && (
              <div className="bg-rink-500/10 border border-rink-500/30 rounded-xl p-4 animate-in fade-in duration-300">
                <div className="flex items-center justify-center gap-4 text-white">
                  <span className="font-semibold">{gameInfo.homeTeam}</span>
                  <span className="text-rink-500 font-bold">vs</span>
                  <span className="font-semibold">{gameInfo.awayTeam}</span>
                </div>
                <p className="text-neutral-400 text-sm text-center mt-2">
                  {new Date(gameInfo.scheduledAt).toLocaleDateString(undefined, {
                    weekday: 'long',
                    month: 'short',
                    day: 'numeric',
                    hour: 'numeric',
                    minute: '2-digit',
                  })}
                </p>
                <p className="text-rink-400 text-sm text-center mt-2 font-medium">
                  Redirecting to game...
                </p>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isValidating || token.length < 8 || !!gameInfo}
              className="w-full py-4 px-6 bg-gradient-to-r from-rink-500 to-arena-500
                text-black font-semibold text-lg rounded-xl
                hover:shadow-lg hover:shadow-rink-500/20 hover:scale-[1.02]
                disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100
                transition-all duration-300
                touch-manipulation min-h-[56px]"
            >
              {isValidating ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Validating...
                </span>
              ) : gameInfo ? (
                'Access Granted!'
              ) : (
                'Access Game'
              )}
            </button>
          </form>
        </div>

        {/* Help Text */}
        <div className="mt-6 text-center">
          <p className="text-neutral-500 text-sm">
            Don&apos;t have a token?{' '}
            <a href="/contact" className="text-rink-400 hover:text-rink-300 transition-colors">
              Contact your league administrator
            </a>
          </p>
        </div>

        {/* QR Scanner Option */}
        <div className="mt-4 text-center">
          <button
            type="button"
            className="inline-flex items-center gap-2 text-neutral-400 hover:text-white transition-colors"
            onClick={() => {
              // TODO: Implement QR scanner
              alert('QR Scanner coming soon!');
            }}
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
            </svg>
            Scan QR Code
          </button>
        </div>
      </div>
    </div>
  );
}
