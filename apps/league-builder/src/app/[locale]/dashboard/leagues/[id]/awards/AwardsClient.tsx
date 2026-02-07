'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createAward, updateAward, deleteAward, type LeagueAwardWithDetails } from '@/lib/actions/awards';
import { cn } from '@hockey-life/ui';
import {
  Plus,
  Trophy,
  Trash2,
  Edit,
  X,
  Save,
} from 'lucide-react';

interface AwardsClientProps {
  leagueId: string;
  initialAwards: LeagueAwardWithDetails[];
  seasons: { id: string; name: string; status: string | null }[];
  teams: { id: string; name: string }[];
}

const CATEGORY_OPTIONS = [
  { value: 'mvp', label: 'Most Valuable Player' },
  { value: 'top_scorer', label: 'Top Scorer' },
  { value: 'best_goalie', label: 'Best Goalie' },
  { value: 'rookie', label: 'Rookie of the Year' },
  { value: 'sportsmanship', label: 'Sportsmanship' },
  { value: 'custom', label: 'Custom Award' },
];

function getCategoryLabel(value: string) {
  return CATEGORY_OPTIONS.find(c => c.value === value)?.label || value;
}

export function AwardsClient({ leagueId, initialAwards, seasons, teams }: AwardsClientProps) {
  const router = useRouter();
  const [awards, setAwards] = useState(initialAwards);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [awardName, setAwardName] = useState('');
  const [category, setCategory] = useState('mvp');
  const [seasonId, setSeasonId] = useState('');
  const [teamId, setTeamId] = useState('');
  const [playerName, setPlayerName] = useState('');
  const [description, setDescription] = useState('');

  function resetForm() {
    setAwardName('');
    setCategory('mvp');
    setSeasonId('');
    setTeamId('');
    setPlayerName('');
    setDescription('');
    setEditingId(null);
    setError(null);
  }

  function openNewForm() {
    resetForm();
    setShowForm(true);
  }

  function openEditForm(award: LeagueAwardWithDetails) {
    setAwardName(award.award_name);
    setCategory(award.category);
    setSeasonId(award.season_id || '');
    setTeamId(award.team_id || '');
    setPlayerName(award.player_name || '');
    setDescription(award.description || '');
    setEditingId(award.id);
    setShowForm(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!awardName.trim()) {
      setError('Award name is required');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      if (editingId) {
        const result = await updateAward(editingId, {
          awardName: awardName.trim(),
          category,
          seasonId: seasonId || null,
          teamId: teamId || null,
          description: description.trim() || null,
        });

        if (!result.success) {
          setError(result.error);
          setSaving(false);
          return;
        }
      } else {
        const result = await createAward({
          leagueId,
          awardName: awardName.trim(),
          category,
          seasonId: seasonId || undefined,
          teamId: teamId || undefined,
          description: description.trim() || undefined,
        });

        if (!result.success) {
          setError(result.error);
          setSaving(false);
          return;
        }
      }

      setShowForm(false);
      resetForm();
      router.refresh();
    } catch {
      setError('An unexpected error occurred');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(awardId: string) {
    if (!confirm('Are you sure you want to delete this award?')) return;

    const result = await deleteAward(awardId);
    if (result.success) {
      setAwards(awards.filter(a => a.id !== awardId));
      router.refresh();
    }
  }

  // Group awards by season
  const groupedAwards = new Map<string, LeagueAwardWithDetails[]>();
  awards.forEach(award => {
    const key = award.season_name || 'No Season';
    if (!groupedAwards.has(key)) {
      groupedAwards.set(key, []);
    }
    groupedAwards.get(key)!.push(award);
  });

  return (
    <div>
      {/* Add Award Button */}
      {!showForm && (
        <div className="mb-6">
          <button
            onClick={openNewForm}
            className={cn(
              'inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm',
              'bg-gradient-to-r from-rink-500 to-arena-500 text-black',
              'hover:shadow-lg hover:shadow-rink-500/20 transition-all'
            )}
          >
            <Plus className="w-4 h-4" />
            Add Award
          </button>
        </div>
      )}

      {/* Form */}
      {showForm && (
        <div className="bg-white/[0.04] border border-white/10 backdrop-blur-xl rounded-2xl p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-white">
              {editingId ? 'Edit Award' : 'Add Award'}
            </h2>
            <button
              onClick={() => { setShowForm(false); resetForm(); }}
              className="p-2 rounded-lg text-neutral-400 hover:text-white hover:bg-white/10 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-3 text-red-400 text-sm mb-4">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-neutral-300 mb-1.5">
                  Award Name *
                </label>
                <input
                  type="text"
                  value={awardName}
                  onChange={(e) => setAwardName(e.target.value)}
                  placeholder="e.g., League MVP"
                  className="w-full px-4 py-2.5 bg-neutral-900 border border-white/10 rounded-xl text-white placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-rink-500/50"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-300 mb-1.5">
                  Category
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-4 py-2.5 bg-neutral-900 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-rink-500/50"
                >
                  {CATEGORY_OPTIONS.map(c => (
                    <option key={c.value} value={c.value}>{c.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-300 mb-1.5">
                  Season
                </label>
                <select
                  value={seasonId}
                  onChange={(e) => setSeasonId(e.target.value)}
                  className="w-full px-4 py-2.5 bg-neutral-900 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-rink-500/50"
                >
                  <option value="">No season</option>
                  {seasons.map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-300 mb-1.5">
                  Team
                </label>
                <select
                  value={teamId}
                  onChange={(e) => setTeamId(e.target.value)}
                  className="w-full px-4 py-2.5 bg-neutral-900 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-rink-500/50"
                >
                  <option value="">No team</option>
                  {teams.map(t => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-neutral-300 mb-1.5">
                Description
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Award description or reason..."
                rows={2}
                className="w-full px-4 py-2.5 bg-neutral-900 border border-white/10 rounded-xl text-white placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-rink-500/50 resize-y"
              />
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => { setShowForm(false); resetForm(); }}
                className="px-4 py-2 rounded-xl text-sm text-neutral-400 hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className={cn(
                  'inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm',
                  'bg-gradient-to-r from-rink-500 to-arena-500 text-black',
                  'hover:shadow-lg hover:shadow-rink-500/20 transition-all',
                  'disabled:opacity-50'
                )}
              >
                <Save className="w-4 h-4" />
                {saving ? 'Saving...' : (editingId ? 'Update Award' : 'Add Award')}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Awards List - Grouped by Season */}
      {awards.length > 0 ? (
        <div className="space-y-8">
          {Array.from(groupedAwards.entries()).map(([seasonName, seasonAwards]) => (
            <div key={seasonName}>
              <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <Trophy className="w-5 h-5 text-rink-500" />
                {seasonName}
              </h2>
              <div className="grid gap-3 md:grid-cols-2">
                {seasonAwards.map((award) => (
                  <div
                    key={award.id}
                    className="bg-white/[0.04] border border-white/10 backdrop-blur-xl rounded-xl p-5 hover:border-white/20 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h3 className="font-semibold text-white">{award.award_name}</h3>
                        <p className="text-sm text-rink-500 font-medium">
                          {getCategoryLabel(award.category)}
                        </p>
                        {(award.player_name || award.team_name) && (
                          <p className="text-sm text-neutral-400 mt-1">
                            {award.player_name && <span>{award.player_name}</span>}
                            {award.player_name && award.team_name && <span> - </span>}
                            {award.team_name && <span>{award.team_name}</span>}
                          </p>
                        )}
                        {award.description && (
                          <p className="text-xs text-neutral-500 mt-1 line-clamp-2">{award.description}</p>
                        )}
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={() => openEditForm(award)}
                          className="p-2 rounded-lg text-neutral-400 hover:text-rink-500 hover:bg-rink-500/10 transition-colors"
                          title="Edit"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(award.id)}
                          className="p-2 rounded-lg text-neutral-400 hover:text-red-500 hover:bg-red-500/10 transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        !showForm && (
          <div className="bg-white/[0.04] border border-white/10 backdrop-blur-xl rounded-2xl p-12 text-center">
            <Trophy className="w-12 h-12 text-rink-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-white mb-2">No Awards Yet</h3>
            <p className="text-neutral-400 mb-6">
              Add your first award to recognize outstanding players and teams!
            </p>
            <button
              onClick={openNewForm}
              className={cn(
                'inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm',
                'bg-gradient-to-r from-rink-500 to-arena-500 text-black',
                'hover:shadow-lg hover:shadow-rink-500/20 transition-all'
              )}
            >
              <Plus className="w-4 h-4" />
              Add Award
            </button>
          </div>
        )
      )}
    </div>
  );
}
