'use client';

import { useState, useTransition, useEffect } from 'react';
import { Plus, Loader2, AlertTriangle, X } from 'lucide-react';
import { createSuspension, getRosteredPlayersForSuspension } from '@/lib/actions/suspensions';

interface CreateSuspensionModalProps {
  leagueId: string;
  teams: Array<{ id: string; name: string }>;
  seasons: Array<{ id: string; name: string }>;
  onSuccess: () => void;
}

interface PlayerOption {
  id: string;
  name: string;
}

export function CreateSuspensionModal({
  leagueId,
  teams,
  seasons,
  onSuccess,
}: CreateSuspensionModalProps) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Form state
  const [teamId, setTeamId] = useState('');
  const [playerId, setPlayerId] = useState('');
  const [seasonId, setSeasonId] = useState(seasons[0]?.id ?? '');
  const [reason, setReason] = useState('');
  const [suspensionType, setSuspensionType] = useState<'games' | 'date_range' | 'indefinite'>('games');
  const [severity, setSeverity] = useState<'standard' | 'minor' | 'major' | 'gross_misconduct' | 'match' | 'behavioral'>('standard');
  const [behaviorCategory, setBehaviorCategory] = useState('');
  const [internalNotes, setInternalNotes] = useState('');
  const [appealEligible, setAppealEligible] = useState(false);
  const [appealDeadline, setAppealDeadline] = useState('');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState('');
  const [gamesRemaining, setGamesRemaining] = useState(1);

  // Players loaded for the selected team
  const [players, setPlayers] = useState<PlayerOption[]>([]);
  const [loadingPlayers, setLoadingPlayers] = useState(false);

  // Load players when team changes — intentional synchronous reset when teamId dep changes
  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect */
    setPlayers([]);
    setPlayerId('');
    /* eslint-enable react-hooks/set-state-in-effect */

    if (!teamId) return;

    setLoadingPlayers(true);

    getRosteredPlayersForSuspension(teamId, leagueId).then((opts) => {
      setPlayers(opts);
      setLoadingPlayers(false);
    });
  }, [teamId, leagueId]);

  function reset() {
    setTeamId('');
    setPlayerId('');
    setSeasonId(seasons[0]?.id ?? '');
    setReason('');
    setSuspensionType('games');
    setSeverity('standard');
    setBehaviorCategory('');
    setInternalNotes('');
    setAppealEligible(false);
    setAppealDeadline('');
    setStartDate(new Date().toISOString().split('T')[0]);
    setEndDate('');
    setGamesRemaining(1);
    setError(null);
    setSuccess(false);
    setPlayers([]);
  }

  function handleClose() {
    setOpen(false);
    reset();
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!playerId || !teamId || !reason || !startDate || !seasonId) {
      setError('Please fill in all required fields.');
      return;
    }

    setError(null);
    startTransition(async () => {
      const result = await createSuspension({
        leagueId,
        playerId,
        teamId,
        seasonId,
        reason,
        startDate,
        endDate: endDate || undefined,
        gamesRemaining,
        suspensionType,
        severity,
        behaviorCategory: behaviorCategory || undefined,
        internalNotes: internalNotes || undefined,
        isIndefinite: suspensionType === 'indefinite',
        appealEligible,
        appealDeadline: appealEligible && appealDeadline ? appealDeadline : undefined,
      });

      if (result.success) {
        setSuccess(true);
        setTimeout(() => {
          handleClose();
          onSuccess();
        }, 1200);
      } else {
        setError(result.error ?? 'Failed to create suspension');
      }
    });
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 transition-colors"
      >
        <Plus className="w-4 h-4" />
        Submit Suspension
      </button>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={handleClose} />

      {/* Modal */}
      <div className="relative z-10 w-full max-w-lg bg-neutral-900 border border-white/10 rounded-2xl shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-white/10">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-red-400" />
            <h2 className="text-lg font-bold text-white">Submit Suspension Review</h2>
          </div>
          <button onClick={handleClose} className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {/* Season */}
          <div>
            <label className="block text-sm font-medium text-neutral-300 mb-1.5">Season *</label>
            <select
              value={seasonId}
              onChange={(e) => setSeasonId(e.target.value)}
              required
              className="w-full bg-neutral-800 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-1 focus:ring-rink-500"
            >
              {seasons.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>

          {/* Team */}
          <div>
            <label className="block text-sm font-medium text-neutral-300 mb-1.5">Team *</label>
            <select
              value={teamId}
              onChange={(e) => setTeamId(e.target.value)}
              required
              className="w-full bg-neutral-800 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-1 focus:ring-rink-500"
            >
              <option value="">Select a team…</option>
              {teams.map((t) => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          </div>

          {/* Player */}
          <div>
            <label className="block text-sm font-medium text-neutral-300 mb-1.5">Player *</label>
            {loadingPlayers ? (
              <div className="flex items-center gap-2 text-neutral-400 text-sm py-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                Loading players…
              </div>
            ) : (
              <select
                value={playerId}
                onChange={(e) => setPlayerId(e.target.value)}
                required
                disabled={!teamId || players.length === 0}
                className="w-full bg-neutral-800 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-1 focus:ring-rink-500 disabled:opacity-50"
              >
                <option value="">{teamId ? (players.length === 0 ? 'No rostered players' : 'Select a player…') : 'Select a team first'}</option>
                {players.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            )}
          </div>

          {/* Reason */}
          <div>
            <label className="block text-sm font-medium text-neutral-300 mb-1.5">Reason *</label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              required
              rows={3}
              placeholder="e.g. Match penalty — slashing, game misconduct — fighting"
              className="w-full bg-neutral-800 border border-white/10 rounded-lg px-3 py-2 text-white text-sm placeholder-neutral-500 focus:outline-none focus:ring-1 focus:ring-rink-500 resize-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-neutral-300 mb-1.5">Suspension Type *</label>
              <select
                value={suspensionType}
                onChange={(e) => setSuspensionType(e.target.value as 'games' | 'date_range' | 'indefinite')}
                className="w-full bg-neutral-800 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-1 focus:ring-rink-500"
              >
                <option value="games">Game-based</option>
                <option value="date_range">Date range</option>
                <option value="indefinite">Indefinite</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-neutral-300 mb-1.5">Severity *</label>
              <select
                value={severity}
                onChange={(e) => setSeverity(e.target.value as 'standard' | 'minor' | 'major' | 'gross_misconduct' | 'match' | 'behavioral')}
                className="w-full bg-neutral-800 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-1 focus:ring-rink-500"
              >
                <option value="standard">Standard review</option>
                <option value="minor">Minor</option>
                <option value="major">Major</option>
                <option value="gross_misconduct">Gross misconduct</option>
                <option value="match">Match penalty</option>
                <option value="behavioral">Behavioral tracking</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-neutral-300 mb-1.5">Behavior Category</label>
              <input
                value={behaviorCategory}
                onChange={(e) => setBehaviorCategory(e.target.value)}
                placeholder="e.g. Abuse of officials"
                className="w-full bg-neutral-800 border border-white/10 rounded-lg px-3 py-2 text-white text-sm placeholder-neutral-500 focus:outline-none focus:ring-1 focus:ring-rink-500"
              />
            </div>
            <div className="rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2">
              <label className="flex items-center gap-2 text-sm font-medium text-neutral-200">
                <input
                  type="checkbox"
                  checked={appealEligible}
                  onChange={(e) => setAppealEligible(e.target.checked)}
                  className="rounded border-white/10 bg-neutral-900 text-rink-500 focus:ring-rink-500"
                />
                Eligible for captain appeal
              </label>
              <p className="mt-1 text-xs text-neutral-500">
                Allow a captain or alternate to request an appeal on this case.
              </p>
            </div>
          </div>

          {/* Dates & Games */}
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-1">
              <label className="block text-sm font-medium text-neutral-300 mb-1.5">Games *</label>
              <input
                type="number"
                min={0}
                max={99}
                value={suspensionType === 'indefinite' ? 0 : gamesRemaining}
                onChange={(e) => setGamesRemaining(parseInt(e.target.value) || 1)}
                required
                disabled={suspensionType === 'indefinite'}
                className="w-full bg-neutral-800 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-1 focus:ring-rink-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-neutral-300 mb-1.5">Start Date *</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                required
                className="w-full bg-neutral-800 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-1 focus:ring-rink-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-neutral-300 mb-1.5">End Date</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                disabled={suspensionType === 'indefinite'}
                className="w-full bg-neutral-800 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-1 focus:ring-rink-500"
              />
            </div>
          </div>

          {appealEligible && (
            <div>
              <label className="block text-sm font-medium text-neutral-300 mb-1.5">Appeal Deadline</label>
              <input
                type="date"
                value={appealDeadline}
                onChange={(e) => setAppealDeadline(e.target.value)}
                className="w-full bg-neutral-800 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-1 focus:ring-rink-500"
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-neutral-300 mb-1.5">Internal Notes</label>
            <textarea
              value={internalNotes}
              onChange={(e) => setInternalNotes(e.target.value)}
              rows={3}
              placeholder="Visible to league operators only."
              className="w-full bg-neutral-800 border border-white/10 rounded-lg px-3 py-2 text-white text-sm placeholder-neutral-500 focus:outline-none focus:ring-1 focus:ring-rink-500 resize-none"
            />
          </div>

          {/* Error / Success */}
          {error && (
            <p className="text-sm text-red-400 bg-red-500/10 px-3 py-2 rounded-lg">{error}</p>
          )}
          {success && (
            <p className="text-sm text-green-400 bg-green-500/10 px-3 py-2 rounded-lg">
              Suspension submitted for review.
            </p>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-1">
            <button type="button" onClick={handleClose} className="px-4 py-2 rounded-lg text-sm font-medium text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors">
              Cancel
            </button>
            <button
              type="submit"
              disabled={isPending || success}
              className="inline-flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-bold bg-red-500 hover:bg-red-600 text-white transition-colors disabled:opacity-50"
            >
              {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <AlertTriangle className="w-4 h-4" />}
              Submit for Review
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
