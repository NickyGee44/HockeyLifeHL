'use client';

import { useState } from 'react';
import type { TeamData, PlayerData } from '@/lib/actions/scorekeeper';

interface SaveEntryModalProps {
  team: TeamData;
  teamType: 'home' | 'away';
  period: number;
  onSubmit: (data: {
    goalieId: string;
    gameTimeSeconds?: number;
  }) => Promise<void>;
  onCancel: () => void;
  isSubmitting: boolean;
}

/**
 * Save Entry Modal
 * Quick entry form for goalie saves
 */
export function SaveEntryModal({
  team,
  teamType,
  period,
  onSubmit,
  onCancel,
  isSubmitting,
}: SaveEntryModalProps) {
  // Filter to only show goalies
  const goalies = team.roster.filter(p => p.position === 'Goalie');
  const [goalieId, setGoalieId] = useState<string | null>(
    goalies.length === 1 ? goalies[0].id : null
  );
  const [saveCount, setSaveCount] = useState(1);

  const selectedGoalie = team.roster.find(p => p.id === goalieId);

  const handleSubmit = async () => {
    if (!goalieId) return;

    // Add multiple saves if count > 1
    for (let i = 0; i < saveCount; i++) {
      await onSubmit({ goalieId });
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-end md:items-center justify-center">
      <div className="bg-neutral-900 w-full md:max-w-md md:rounded-2xl border-t md:border border-blue-500/20 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-neutral-800">
          <div>
            <h2 className="text-lg font-bold text-white">Add Save</h2>
            <p className="text-sm text-neutral-400">
              {team.name} • Period {period}
            </p>
          </div>
          <button
            onClick={onCancel}
            className="p-2 text-neutral-400 hover:text-white transition-colors touch-manipulation"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-4 space-y-6">
          {/* Goalie Selection */}
          <div>
            <label className="block text-sm font-medium text-neutral-300 mb-3">
              Select Goalie
            </label>

            {goalies.length === 0 ? (
              <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 text-center">
                <p className="text-amber-400">No goalies on roster</p>
                <p className="text-sm text-neutral-400 mt-1">
                  Add goalies to the team roster to track saves
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {goalies.map((goalie) => (
                  <button
                    key={goalie.id}
                    onClick={() => setGoalieId(goalie.id)}
                    className={`w-full p-4 rounded-xl flex items-center gap-4 transition-all duration-200 touch-manipulation
                      ${goalieId === goalie.id
                        ? 'bg-blue-500/20 border-2 border-blue-500'
                        : 'bg-neutral-800 border border-neutral-700 hover:border-neutral-600'
                      }
                    `}
                  >
                    <div
                      className="w-14 h-14 rounded-lg flex items-center justify-center"
                      style={{ backgroundColor: `${team.primaryColor || '#22D3EE'}20` }}
                    >
                      <span
                        className="text-2xl font-bold"
                        style={{ color: team.primaryColor || '#22D3EE' }}
                      >
                        {goalie.jerseyNumber}
                      </span>
                    </div>
                    <div className="flex-1 text-left">
                      <p className={`font-semibold ${goalieId === goalie.id ? 'text-blue-400' : 'text-white'}`}>
                        {goalie.fullName}
                      </p>
                      <p className="text-sm text-neutral-400">Goalie</p>
                    </div>
                    {goalieId === goalie.id && (
                      <svg className="w-6 h-6 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Save Count - Quick multi-save entry */}
          {goalieId && (
            <div>
              <label className="block text-sm font-medium text-neutral-300 mb-3">
                Number of Saves
              </label>
              <div className="flex items-center justify-center gap-4">
                <button
                  onClick={() => setSaveCount(Math.max(1, saveCount - 1))}
                  className="w-14 h-14 rounded-xl bg-neutral-800 text-white font-bold text-2xl
                    hover:bg-neutral-700 active:scale-95 transition-all touch-manipulation"
                >
                  -
                </button>
                <div className="w-20 text-center">
                  <span className="text-4xl font-bold text-blue-400">{saveCount}</span>
                </div>
                <button
                  onClick={() => setSaveCount(saveCount + 1)}
                  className="w-14 h-14 rounded-xl bg-neutral-800 text-white font-bold text-2xl
                    hover:bg-neutral-700 active:scale-95 transition-all touch-manipulation"
                >
                  +
                </button>
              </div>
              <p className="text-center text-neutral-500 text-sm mt-2">
                Tap to add multiple saves at once
              </p>
            </div>
          )}

          {/* Quick Stats */}
          {selectedGoalie && (
            <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-blue-400 uppercase tracking-wider">Adding</p>
                  <p className="text-white font-semibold mt-1">
                    {saveCount} save{saveCount > 1 ? 's' : ''} for #{selectedGoalie.jerseyNumber} {selectedGoalie.fullName}
                  </p>
                </div>
                <div className="w-12 h-12 rounded-full bg-blue-500/20 flex items-center justify-center">
                  <svg className="w-6 h-6 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-neutral-800 flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 py-4 px-6 bg-neutral-800 text-white font-semibold rounded-xl
              hover:bg-neutral-700 transition-colors touch-manipulation min-h-[56px]"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={!goalieId || isSubmitting}
            className="flex-1 py-4 px-6 bg-blue-600 text-white font-semibold rounded-xl
              hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed
              transition-colors touch-manipulation min-h-[56px]"
          >
            {isSubmitting ? 'Saving...' : `Add ${saveCount} Save${saveCount > 1 ? 's' : ''}`}
          </button>
        </div>
      </div>
    </div>
  );
}
