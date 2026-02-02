'use client';

/**
 * Points Config Modal
 *
 * Modal for editing the points system configuration.
 */

import { useState } from 'react';
import { cn } from '@hockey-life/ui/lib/utils';
import { X, Save, RotateCcw } from 'lucide-react';
import type { StandingsConfig } from '@/lib/standings/types';

// ============================================================================
// TYPES
// ============================================================================

interface PointsConfigModalProps {
  config: StandingsConfig | null;
  onSave: (config: Partial<StandingsConfig>) => Promise<void>;
  onClose: () => void;
}

// ============================================================================
// COMPONENT
// ============================================================================

export function PointsConfigModal({ config, onSave, onClose }: PointsConfigModalProps) {
  const [pointsWin, setPointsWin] = useState(config?.pointsWin ?? 2);
  const [pointsLoss, setPointsLoss] = useState(config?.pointsLoss ?? 0);
  const [pointsTie, setPointsTie] = useState(config?.pointsTie ?? 1);
  const [playoffTeams, setPlayoffTeams] = useState(config?.playoffTeamsTotal ?? 8);
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSave({
        pointsWin,
        pointsLoss,
        pointsTie,
        playoffTeamsTotal: playoffTeams,
      });
      onClose();
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = () => {
    setPointsWin(2);
    setPointsLoss(0);
    setPointsTie(1);
    setPlayoffTeams(8);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
      <div className="bg-neutral-900 rounded-xl border border-neutral-800 w-full max-w-md">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-neutral-800">
          <h2 className="text-lg font-bold text-white">Points System</h2>
          <button
            onClick={onClose}
            className="p-2 text-neutral-400 hover:text-white hover:bg-neutral-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4">
          <p className="text-sm text-neutral-400">
            Configure how many points teams earn for wins, losses, and ties.
          </p>

          {/* Points for Win */}
          <div>
            <label className="block text-sm font-medium text-neutral-300 mb-1">
              Points for Win
            </label>
            <input
              type="number"
              min={0}
              max={10}
              value={pointsWin}
              onChange={(e) => setPointsWin(parseInt(e.target.value) || 0)}
              className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-gold-500"
            />
          </div>

          {/* Points for Loss */}
          <div>
            <label className="block text-sm font-medium text-neutral-300 mb-1">
              Points for Loss
            </label>
            <input
              type="number"
              min={0}
              max={10}
              value={pointsLoss}
              onChange={(e) => setPointsLoss(parseInt(e.target.value) || 0)}
              className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-gold-500"
            />
          </div>

          {/* Points for Tie */}
          <div>
            <label className="block text-sm font-medium text-neutral-300 mb-1">
              Points for Tie
            </label>
            <input
              type="number"
              min={0}
              max={10}
              value={pointsTie}
              onChange={(e) => setPointsTie(parseInt(e.target.value) || 0)}
              className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-gold-500"
            />
          </div>

          {/* Playoff Teams */}
          <div>
            <label className="block text-sm font-medium text-neutral-300 mb-1">
              Playoff Teams (Total)
            </label>
            <input
              type="number"
              min={0}
              max={32}
              value={playoffTeams}
              onChange={(e) => setPlayoffTeams(parseInt(e.target.value) || 0)}
              className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-gold-500"
            />
            <p className="text-xs text-neutral-500 mt-1">
              Teams in the top {playoffTeams} will be highlighted as playoff teams.
            </p>
          </div>

          {/* Preview */}
          <div className="bg-neutral-800/50 rounded-lg p-4">
            <h4 className="text-sm font-medium text-neutral-300 mb-2">Preview</h4>
            <div className="grid grid-cols-3 gap-2 text-center text-sm">
              <div>
                <div className="text-2xl font-bold text-green-400">{pointsWin}</div>
                <div className="text-xs text-neutral-500">Win</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-red-400">{pointsLoss}</div>
                <div className="text-xs text-neutral-500">Loss</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-yellow-400">{pointsTie}</div>
                <div className="text-xs text-neutral-500">Tie</div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-4 border-t border-neutral-800">
          <button
            onClick={handleReset}
            className="flex items-center gap-2 px-4 py-2 text-sm text-neutral-400 hover:text-white transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
            Reset to Default
          </button>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm text-neutral-300 bg-neutral-800 rounded-lg hover:bg-neutral-700 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-black bg-gold-500 rounded-lg hover:bg-gold-600 transition-colors disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              {isSaving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
