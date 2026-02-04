'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  getGameSummary,
  submitGameForVerification,
  type GameData,
  type GameEventData,
} from '@/lib/actions/scorekeeper';

interface GameSummaryModalProps {
  gameId: string;
  game: GameData;
  events: GameEventData[];
  onClose: () => void;
}

/**
 * Game Summary Modal
 * Shows complete game summary and allows submission for captain verification
 */
export function GameSummaryModal({
  gameId,
  game,
  events,
  onClose,
}: GameSummaryModalProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [verificationLinks, setVerificationLinks] = useState<{
    homeToken: string;
    awayToken: string;
  } | null>(null);
  const [summary, setSummary] = useState<{
    homeGoals: number;
    awayGoals: number;
    homePenaltyMinutes: number;
    awayPenaltyMinutes: number;
    homeSaves: number;
    awaySaves: number;
    homeShots: number;
    awayShots: number;
    periods: Array<{ period: number; homeGoals: number; awayGoals: number }>;
    scorers: Array<{
      playerId: string;
      playerName: string;
      teamType: 'home' | 'away';
      goals: number;
      assists: number;
    }>;
    goalies: Array<{
      playerId: string;
      playerName: string;
      teamType: 'home' | 'away';
      saves: number;
      goalsAgainst: number;
    }>;
  } | null>(null);

  useEffect(() => {
    async function loadSummary() {
      const result = await getGameSummary(gameId);
      if (result.success && result.summary) {
        setSummary(result.summary);
      }
      setIsLoading(false);
    }
    loadSummary();
  }, [gameId]);

  const handleSubmitForVerification = async () => {
    setIsSubmitting(true);

    const result = await submitGameForVerification(gameId);

    if (result.success && result.homeToken && result.awayToken) {
      setVerificationLinks({
        homeToken: result.homeToken,
        awayToken: result.awayToken,
      });
      setSubmitted(true);
    }

    setIsSubmitting(false);
  };

  const getBaseUrl = () => {
    if (typeof window !== 'undefined') {
      return window.location.origin;
    }
    return '';
  };

  if (isLoading) {
    return (
      <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center">
        <div className="bg-neutral-900 w-full md:max-w-2xl md:rounded-2xl p-8">
          <div className="flex items-center justify-center">
            <div className="w-12 h-12 border-4 border-white/10 border-t-rink-500 rounded-full animate-spin" />
          </div>
          <p className="text-neutral-400 text-center mt-4">Loading summary...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-end md:items-center justify-center overflow-auto">
      <div className="bg-neutral-900 w-full md:max-w-2xl md:rounded-2xl border-t md:border border-white/10 max-h-[95vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-neutral-800 sticky top-0 bg-neutral-900 z-10">
          <div>
            <h2 className="text-lg font-bold text-white">Game Summary</h2>
            <p className="text-sm text-neutral-400">
              Review and submit for verification
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-neutral-400 hover:text-white transition-colors touch-manipulation"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-4 space-y-6">
          {/* Final Score */}
          <div className="bg-neutral-800 rounded-2xl p-6">
            <h3 className="text-xs text-neutral-500 uppercase tracking-wider text-center mb-4">
              Final Score
            </h3>
            <div className="flex items-center justify-between">
              <div className="flex-1 text-center">
                <p className="text-sm text-neutral-400 mb-1">{game.homeTeam.name}</p>
                <p
                  className="text-5xl font-black"
                  style={{ color: game.homeTeam.primaryColor || '#22D3EE' }}
                >
                  {summary?.homeGoals ?? 0}
                </p>
              </div>
              <div className="px-4">
                <span className="text-rink-500 font-bold">-</span>
              </div>
              <div className="flex-1 text-center">
                <p className="text-sm text-neutral-400 mb-1">{game.awayTeam.name}</p>
                <p
                  className="text-5xl font-black"
                  style={{ color: game.awayTeam.primaryColor || '#A3A3A3' }}
                >
                  {summary?.awayGoals ?? 0}
                </p>
              </div>
            </div>
          </div>

          {/* Period Breakdown */}
          <div className="bg-neutral-800 rounded-xl p-4">
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

          {/* Stats Grid */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-neutral-800 rounded-xl p-4">
              <h3 className="text-sm font-medium text-neutral-300 mb-3">Shots</h3>
              <div className="flex justify-between">
                <div className="text-center">
                  <p className="text-2xl font-bold text-white">{summary?.homeShots ?? 0}</p>
                  <p className="text-xs text-neutral-500">{game.homeTeam.shortName || 'Home'}</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-white">{summary?.awayShots ?? 0}</p>
                  <p className="text-xs text-neutral-500">{game.awayTeam.shortName || 'Away'}</p>
                </div>
              </div>
            </div>

            <div className="bg-neutral-800 rounded-xl p-4">
              <h3 className="text-sm font-medium text-neutral-300 mb-3">Penalty Minutes</h3>
              <div className="flex justify-between">
                <div className="text-center">
                  <p className="text-2xl font-bold text-white">{summary?.homePenaltyMinutes ?? 0}</p>
                  <p className="text-xs text-neutral-500">{game.homeTeam.shortName || 'Home'}</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-white">{summary?.awayPenaltyMinutes ?? 0}</p>
                  <p className="text-xs text-neutral-500">{game.awayTeam.shortName || 'Away'}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Top Scorers */}
          {summary && summary.scorers.length > 0 && (
            <div className="bg-neutral-800 rounded-xl p-4">
              <h3 className="text-sm font-medium text-neutral-300 mb-3">Scoring Summary</h3>
              <div className="space-y-2">
                {summary.scorers.slice(0, 10).map((scorer) => (
                  <div
                    key={scorer.playerId}
                    className="flex items-center justify-between py-2 border-b border-neutral-700 last:border-0"
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className="text-xs px-2 py-0.5 rounded font-medium"
                        style={{
                          backgroundColor: scorer.teamType === 'home'
                            ? `${game.homeTeam.primaryColor || '#22D3EE'}20`
                            : `${game.awayTeam.primaryColor || '#A3A3A3'}20`,
                          color: scorer.teamType === 'home'
                            ? game.homeTeam.primaryColor || '#22D3EE'
                            : game.awayTeam.primaryColor || '#A3A3A3',
                        }}
                      >
                        {scorer.teamType === 'home' ? game.homeTeam.shortName || 'H' : game.awayTeam.shortName || 'A'}
                      </span>
                      <span className="text-white font-medium">{scorer.playerName}</span>
                    </div>
                    <div className="flex items-center gap-3 text-sm">
                      {scorer.goals > 0 && (
                        <span className="text-emerald-400">{scorer.goals}G</span>
                      )}
                      {scorer.assists > 0 && (
                        <span className="text-blue-400">{scorer.assists}A</span>
                      )}
                      <span className="text-rink-400 font-bold">{scorer.goals + scorer.assists}P</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Goalie Stats */}
          {summary && summary.goalies.length > 0 && (
            <div className="bg-neutral-800 rounded-xl p-4">
              <h3 className="text-sm font-medium text-neutral-300 mb-3">Goalie Summary</h3>
              <div className="space-y-2">
                {summary.goalies.map((goalie) => {
                  const shots = goalie.saves + goalie.goalsAgainst;
                  const savePercentage = shots > 0 ? ((goalie.saves / shots) * 100).toFixed(1) : '0.0';

                  return (
                    <div
                      key={goalie.playerId}
                      className="flex items-center justify-between py-2 border-b border-neutral-700 last:border-0"
                    >
                      <div className="flex items-center gap-2">
                        <span
                          className="text-xs px-2 py-0.5 rounded font-medium"
                          style={{
                            backgroundColor: goalie.teamType === 'home'
                              ? `${game.homeTeam.primaryColor || '#22D3EE'}20`
                              : `${game.awayTeam.primaryColor || '#A3A3A3'}20`,
                            color: goalie.teamType === 'home'
                              ? game.homeTeam.primaryColor || '#22D3EE'
                              : game.awayTeam.primaryColor || '#A3A3A3',
                          }}
                        >
                          {goalie.teamType === 'home' ? game.homeTeam.shortName || 'H' : game.awayTeam.shortName || 'A'}
                        </span>
                        <span className="text-white font-medium">{goalie.playerName}</span>
                      </div>
                      <div className="flex items-center gap-3 text-sm">
                        <span className="text-blue-400">{goalie.saves} SV</span>
                        <span className="text-red-400">{goalie.goalsAgainst} GA</span>
                        <span className="text-rink-400 font-bold">{savePercentage}%</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Verification Status */}
          {submitted && verificationLinks && (
            <div className="bg-rink-500/10 border border-rink-500/30 rounded-xl p-4 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-rink-500/20 flex items-center justify-center">
                  <svg className="w-6 h-6 text-rink-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </div>
                <div>
                  <p className="text-rink-400 font-semibold">Submitted for Verification</p>
                  <p className="text-sm text-neutral-400">
                    Share verification links with team captains
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                <div className="bg-neutral-900/50 rounded-lg p-3">
                  <p className="text-xs text-neutral-500 mb-1">Home Captain Link</p>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 text-sm text-white bg-neutral-950 px-3 py-2 rounded break-all">
                      {getBaseUrl()}/verify/{verificationLinks.homeToken}
                    </code>
                    <button
                      onClick={() => navigator.clipboard.writeText(`${getBaseUrl()}/verify/${verificationLinks.homeToken}`)}
                      className="p-2 text-rink-400 hover:text-rink-300 transition-colors touch-manipulation"
                    >
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                    </button>
                  </div>
                </div>

                <div className="bg-neutral-900/50 rounded-lg p-3">
                  <p className="text-xs text-neutral-500 mb-1">Away Captain Link</p>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 text-sm text-white bg-neutral-950 px-3 py-2 rounded break-all">
                      {getBaseUrl()}/verify/{verificationLinks.awayToken}
                    </code>
                    <button
                      onClick={() => navigator.clipboard.writeText(`${getBaseUrl()}/verify/${verificationLinks.awayToken}`)}
                      className="p-2 text-rink-400 hover:text-rink-300 transition-colors touch-manipulation"
                    >
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Verification Status Badges */}
          <div className="bg-neutral-800 rounded-xl p-4">
            <h3 className="text-sm font-medium text-neutral-300 mb-3">Verification Status</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className={`p-3 rounded-lg border ${game.homeVerifiedAt ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-neutral-900 border-neutral-700'}`}>
                <div className="flex items-center gap-2 mb-1">
                  {game.homeVerifiedAt ? (
                    <svg className="w-5 h-5 text-emerald-400" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5 text-neutral-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  )}
                  <span className={game.homeVerifiedAt ? 'text-emerald-400' : 'text-neutral-400'}>
                    {game.homeTeam.shortName || 'Home'} Captain
                  </span>
                </div>
                <p className="text-xs text-neutral-500">
                  {game.homeVerifiedAt ? 'Verified' : 'Pending verification'}
                </p>
              </div>

              <div className={`p-3 rounded-lg border ${game.awayVerifiedAt ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-neutral-900 border-neutral-700'}`}>
                <div className="flex items-center gap-2 mb-1">
                  {game.awayVerifiedAt ? (
                    <svg className="w-5 h-5 text-emerald-400" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5 text-neutral-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  )}
                  <span className={game.awayVerifiedAt ? 'text-emerald-400' : 'text-neutral-400'}>
                    {game.awayTeam.shortName || 'Away'} Captain
                  </span>
                </div>
                <p className="text-xs text-neutral-500">
                  {game.awayVerifiedAt ? 'Verified' : 'Pending verification'}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-neutral-800 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-4 px-6 bg-neutral-800 text-white font-semibold rounded-xl
              hover:bg-neutral-700 transition-colors touch-manipulation min-h-[56px]"
          >
            {submitted ? 'Close' : 'Continue Editing'}
          </button>
          {!submitted && !game.statsLockedAt && (
            <button
              onClick={handleSubmitForVerification}
              disabled={isSubmitting}
              className="flex-1 py-4 px-6 bg-gradient-to-r from-rink-500 to-arena-500 text-black font-semibold rounded-xl
                hover:shadow-lg hover:shadow-rink-500/20 disabled:opacity-50 disabled:cursor-not-allowed
                transition-all touch-manipulation min-h-[56px]"
            >
              {isSubmitting ? 'Submitting...' : 'Submit for Verification'}
            </button>
          )}
          {game.statsLockedAt && (
            <div className="flex-1 py-4 px-6 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-semibold rounded-xl text-center min-h-[56px] flex items-center justify-center">
              Stats Locked & Verified
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
