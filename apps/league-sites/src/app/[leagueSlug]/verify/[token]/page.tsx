'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import {
  verifyCaptainStats,
  lookupCaptainVerificationToken,
  getGameDataForVerification,
  getGameSummaryForVerification,
  type GameData,
} from '@/lib/actions/scorekeeper';

/**
 * Captain Verification Page
 * Allows team captains to review and verify game statistics
 */
export default function CaptainVerificationPage() {
  const params = useParams();
  const token = params.token as string;

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [game, setGame] = useState<GameData | null>(null);
  const [teamType, setTeamType] = useState<'home' | 'away' | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [verified, setVerified] = useState(false);
  const [summary, setSummary] = useState<{
    homeGoals: number;
    awayGoals: number;
    homePenaltyMinutes: number;
    awayPenaltyMinutes: number;
    periods: Array<{ period: number; homeGoals: number; awayGoals: number }>;
    scorers: Array<{
      playerId: string;
      playerName: string;
      teamType: 'home' | 'away';
      goals: number;
      assists: number;
    }>;
  } | null>(null);

  useEffect(() => {
    async function loadVerificationData() {
      try {
        const tokenResult = await lookupCaptainVerificationToken(token);

        if (!tokenResult.success || !tokenResult.gameId) {
          setError('Invalid or expired verification link');
          setIsLoading(false);
          return;
        }

        const gameId = tokenResult.gameId;
        const detectedTeamType = tokenResult.teamType || 'home';
        setTeamType(detectedTeamType);

        const [gameResult, summaryResult] = await Promise.all([
          getGameDataForVerification(gameId, token),
          getGameSummaryForVerification(gameId, token),
        ]);

        if (gameResult.success && gameResult.game) {
          setGame(gameResult.game);

          const alreadyVerified = detectedTeamType === 'home'
            ? gameResult.game.homeVerifiedAt
            : gameResult.game.awayVerifiedAt;

          if (alreadyVerified) {
            setVerified(true);
          }
        }

        if (summaryResult.success && summaryResult.summary) {
          setSummary(summaryResult.summary);
        }
      } catch {
        setError('Failed to load verification data');
      } finally {
        setIsLoading(false);
      }
    }

    loadVerificationData();
  }, [token]);

  const handleVerify = async () => {
    setIsVerifying(true);

    const result = await verifyCaptainStats(token);

    if (result.success) {
      setVerified(true);
    } else {
      setError(result.error || 'Failed to verify');
    }

    setIsVerifying(false);
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="glass-card-strong rounded-[28px] p-8 text-center">
          <div className="w-16 h-16 border-4 border-white/10 border-t-primary rounded-full animate-spin mx-auto" />
          <p className="text-neutral-400 mt-4">Loading verification...</p>
        </div>
      </div>
    );
  }

  if (error || !game || !teamType) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="glass-card-strong max-w-md rounded-[28px] p-8 text-center">
          <div className="w-16 h-16 mx-auto rounded-full bg-red-500/10 flex items-center justify-center mb-4">
            <svg className="w-8 h-8 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-white mb-2">Verification Error</h2>
          <p className="text-neutral-400">{error || 'Unable to load game data'}</p>
        </div>
      </div>
    );
  }

  const myTeam = teamType === 'home' ? game.homeTeam : game.awayTeam;
  const oppTeam = teamType === 'home' ? game.awayTeam : game.homeTeam;

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="glass-control border-b border-white/10 px-4 py-6">
        <div className="max-w-lg mx-auto text-center">
          <div
            className="w-16 h-16 mx-auto rounded-2xl flex items-center justify-center mb-4"
            style={{ backgroundColor: `${myTeam.primaryColor || '#D4AF37'}20` }}
          >
            <span
              className="text-2xl font-black"
              style={{ color: myTeam.primaryColor || '#D4AF37' }}
            >
              {myTeam.shortName?.[0] || myTeam.name[0]}
            </span>
          </div>
          <h1 className="text-xl font-bold text-white">Captain Verification</h1>
          <p className="text-neutral-400 mt-1">{myTeam.name}</p>
        </div>
      </header>

      <div className="max-w-lg mx-auto p-4 space-y-6">
        {/* Already Verified */}
        {verified && (
          <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-2xl p-6 text-center">
            <div className="w-16 h-16 mx-auto rounded-full bg-emerald-500/20 flex items-center justify-center mb-4">
              <svg className="w-8 h-8 text-emerald-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-emerald-400">Stats Verified!</h2>
            <p className="text-neutral-400 mt-2">
              Thank you for verifying the game statistics.
            </p>
          </div>
        )}

        {/* Final Score */}
        <div className="glass-card-strong rounded-2xl p-6">
          <h3 className="text-xs text-neutral-500 uppercase tracking-wider text-center mb-4">
            Final Score
          </h3>
          <div className="flex items-center justify-between">
            <div className="flex-1 text-center">
              <p className="text-sm text-neutral-400 mb-1">{game.homeTeam.name}</p>
              <p
                className="text-4xl font-black"
                style={{ color: game.homeTeam.primaryColor || '#D4AF37' }}
              >
                {summary?.homeGoals ?? 0}
              </p>
            </div>
            <div className="px-4">
              <span className="text-neutral-600 font-bold">-</span>
            </div>
            <div className="flex-1 text-center">
              <p className="text-sm text-neutral-400 mb-1">{game.awayTeam.name}</p>
              <p
                className="text-4xl font-black"
                style={{ color: game.awayTeam.primaryColor || '#A3A3A3' }}
              >
                {summary?.awayGoals ?? 0}
              </p>
            </div>
          </div>
        </div>

        {/* Period Breakdown */}
        <div className="glass-card-strong rounded-xl p-4">
          <h3 className="text-sm font-medium text-neutral-300 mb-3">Score by Period</h3>
          <div className="grid grid-cols-4 gap-2 text-center">
            <div className="text-xs text-neutral-500">Team</div>
            {(summary?.periods || []).map((p) => (
              <div key={p.period} className="text-xs text-neutral-500">P{p.period}</div>
            ))}

            <div className="text-sm text-white font-medium truncate">{game.homeTeam.shortName || game.homeTeam.name}</div>
            {(summary?.periods || []).map((p) => (
              <div key={p.period} className="text-sm text-white">{p.homeGoals}</div>
            ))}

            <div className="text-sm text-white font-medium truncate">{game.awayTeam.shortName || game.awayTeam.name}</div>
            {(summary?.periods || []).map((p) => (
              <div key={p.period} className="text-sm text-white">{p.awayGoals}</div>
            ))}
          </div>
        </div>

        {/* Your Team's Scoring */}
        {summary && (
          <div className="glass-card-strong rounded-xl p-4">
            <h3 className="text-sm font-medium text-neutral-300 mb-3">
              {myTeam.name} Scoring
            </h3>
            {summary.scorers.filter(s => s.teamType === teamType).length === 0 ? (
              <p className="text-neutral-500 text-sm text-center py-4">No goals scored</p>
            ) : (
              <div className="space-y-2">
                {summary.scorers
                  .filter(s => s.teamType === teamType)
                  .map((scorer) => (
                    <div
                      key={scorer.playerId}
                      className="flex items-center justify-between py-2 border-b border-neutral-800 last:border-0"
                    >
                      <span className="text-white">{scorer.playerName}</span>
                      <div className="flex items-center gap-2 text-sm">
                        {scorer.goals > 0 && (
                          <span className="text-emerald-400">{scorer.goals}G</span>
                        )}
                        {scorer.assists > 0 && (
                          <span className="text-blue-400">{scorer.assists}A</span>
                        )}
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </div>
        )}

        {/* Penalty Minutes */}
        <div className="glass-card-strong rounded-xl p-4">
          <h3 className="text-sm font-medium text-neutral-300 mb-3">Penalty Minutes</h3>
          <div className="flex justify-between">
            <div className="text-center flex-1">
              <p className="text-2xl font-bold text-white">
                {teamType === 'home' ? summary?.homePenaltyMinutes ?? 0 : summary?.awayPenaltyMinutes ?? 0}
              </p>
              <p className="text-xs text-neutral-500">{myTeam.shortName || myTeam.name}</p>
            </div>
            <div className="text-center flex-1">
              <p className="text-2xl font-bold text-white">
                {teamType === 'home' ? summary?.awayPenaltyMinutes ?? 0 : summary?.homePenaltyMinutes ?? 0}
              </p>
              <p className="text-xs text-neutral-500">{oppTeam.shortName || oppTeam.name}</p>
            </div>
          </div>
        </div>

        {/* Verify Button */}
        {!verified && (
          <div className="space-y-4">
            <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4">
              <div className="flex items-start gap-3">
                <svg className="w-6 h-6 text-amber-400 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div>
                  <p className="text-amber-400 font-medium">Review Before Verifying</p>
                  <p className="text-sm text-neutral-400 mt-1">
                    Please review all statistics carefully. Once verified, stats will be locked
                    and added to the official record.
                  </p>
                </div>
              </div>
            </div>

            <button
              onClick={handleVerify}
              disabled={isVerifying}
              className="w-full min-h-11 py-4 px-6 bg-primary text-black font-semibold text-lg rounded-xl
                hover:shadow-lg hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed
                transition-all touch-manipulation min-h-[56px]"
            >
              {isVerifying ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Verifying...
                </span>
              ) : (
                'Verify Game Stats'
              )}
            </button>
          </div>
        )}

        {/* Contest Link */}
        {!verified && (
          <div className="text-center">
            <p className="text-neutral-500 text-sm">
              Notice an error?{' '}
              <a href="#" className="text-primary hover:brightness-110 transition-colors">
                Contest these stats
              </a>
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
