'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  createAward,
  updateAward,
  deleteAward,
  setAwardWinner,
  getLeaguePlayersForSeason,
  type LeagueAwardWithDetails,
  type LeaguePlayer,
} from '@/lib/actions/awards';
import { cn } from '@hockey-life/ui';
import {
  Plus,
  Trophy,
  Trash2,
  Edit,
  X,
  Save,
  Star,
  Target,
  Shield,
  Zap,
  Heart,
  Award,
  Loader2,
  CheckCircle2,
  Crown,
  Users,
  ChevronDown,
  ChevronUp,
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

/** Category-specific colors and icons */
const CATEGORY_STYLES: Record<string, { icon: typeof Star; color: string; bg: string; badge: string }> = {
  mvp: { icon: Star, color: 'text-amber-500', bg: 'bg-amber-500/10', badge: 'bg-amber-500/20 text-amber-400 border-amber-500/30' },
  top_scorer: { icon: Target, color: 'text-rink-500', bg: 'bg-rink-500/10', badge: 'bg-rink-500/20 text-rink-400 border-rink-500/30' },
  best_goalie: { icon: Shield, color: 'text-blue-500', bg: 'bg-blue-500/10', badge: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
  rookie: { icon: Zap, color: 'text-green-500', bg: 'bg-green-500/10', badge: 'bg-green-500/20 text-green-400 border-green-500/30' },
  sportsmanship: { icon: Heart, color: 'text-pink-500', bg: 'bg-pink-500/10', badge: 'bg-pink-500/20 text-pink-400 border-pink-500/30' },
  custom: { icon: Award, color: 'text-purple-500', bg: 'bg-purple-500/10', badge: 'bg-purple-500/20 text-purple-400 border-purple-500/30' },
};

function getCategoryStyle(category: string) {
  return CATEGORY_STYLES[category] || CATEGORY_STYLES.custom;
}

/** Default awards that every league can start with */
const DEFAULT_AWARDS = [
  {
    name: 'Most Valuable Player',
    category: 'mvp',
    description: 'Awarded to the player who demonstrates exceptional skill, leadership, and impact on the league.',
    icon: Star,
    color: 'text-amber-500',
    bg: 'bg-amber-500/10',
  },
  {
    name: 'Top Scorer',
    category: 'top_scorer',
    description: 'Given to the player with the most points (goals + assists) during the season.',
    icon: Target,
    color: 'text-rink-500',
    bg: 'bg-rink-500/10',
  },
  {
    name: 'Best Goalie',
    category: 'best_goalie',
    description: 'Awarded to the goaltender with the best save percentage and overall performance.',
    icon: Shield,
    color: 'text-blue-500',
    bg: 'bg-blue-500/10',
  },
  {
    name: 'Rookie of the Year',
    category: 'rookie',
    description: 'Recognizes the top first-year player in the league.',
    icon: Zap,
    color: 'text-green-500',
    bg: 'bg-green-500/10',
  },
  {
    name: 'Sportsmanship Award',
    category: 'sportsmanship',
    description: 'Honors the player who best exemplifies fair play, respect, and positive attitude.',
    icon: Heart,
    color: 'text-pink-500',
    bg: 'bg-pink-500/10',
  },
  {
    name: 'Best Defenseman',
    category: 'custom',
    description: 'Awarded to the defenseman who excels in both defensive play and offensive contribution.',
    icon: Award,
    color: 'text-purple-500',
    bg: 'bg-purple-500/10',
  },
];

function getCategoryLabel(value: string) {
  return CATEGORY_OPTIONS.find(c => c.value === value)?.label || value;
}

// =============================================================================
// Winner Selection Inline Component
// =============================================================================

function WinnerSelector({
  award,
  seasonId,
  leagueId,
  onWinnerSet,
}: {
  award: LeagueAwardWithDetails;
  seasonId: string;
  leagueId: string;
  onWinnerSet: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [players, setPlayers] = useState<LeaguePlayer[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const loadPlayers = useCallback(async () => {
    if (!seasonId || players.length > 0) return;
    setLoading(true);
    const result = await getLeaguePlayersForSeason(leagueId, seasonId);
    if (result.success) {
      setPlayers(result.data);
    }
    setLoading(false);
  }, [seasonId, leagueId, players.length]);

  useEffect(() => {
    if (open) {
      loadPlayers();
    }
  }, [open, loadPlayers]);

  async function handleSelectWinner(player: LeaguePlayer) {
    setSaving(true);
    const result = await setAwardWinner(award.id, player.player_id, player.team_id);
    if (result.success) {
      onWinnerSet();
    }
    setSaving(false);
    setOpen(false);
  }

  const filteredPlayers = searchTerm
    ? players.filter(p =>
        p.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.team_name.toLowerCase().includes(searchTerm.toLowerCase())
      )
    : players;

  if (!seasonId) return null;

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className={cn(
          'inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg',
          'text-amber-400 hover:text-amber-300 bg-amber-500/10 hover:bg-amber-500/15',
          'transition-colors'
        )}
      >
        <Crown className="w-3.5 h-3.5" />
        Select Winner
        {open ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
      </button>

      {open && (
        <div className="absolute z-50 mt-2 w-80 bg-neutral-900 border border-white/10 rounded-xl shadow-2xl overflow-hidden">
          <div className="p-3 border-b border-white/10">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search players..."
              className="w-full px-3 py-2 bg-neutral-800 border border-white/10 rounded-lg text-sm text-white placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-rink-500/50"
              autoFocus
            />
          </div>

          <div className="max-h-60 overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center py-6">
                <Loader2 className="w-5 h-5 animate-spin text-neutral-400" />
              </div>
            ) : filteredPlayers.length === 0 ? (
              <div className="py-6 text-center text-sm text-neutral-500">
                {players.length === 0 ? 'No players found in this season' : 'No matching players'}
              </div>
            ) : (
              filteredPlayers.map((player) => (
                <button
                  key={player.player_id}
                  onClick={() => handleSelectWinner(player)}
                  disabled={saving}
                  className="w-full px-4 py-3 flex items-center gap-3 hover:bg-white/[0.06] transition-colors text-left disabled:opacity-50"
                >
                  <div className="w-8 h-8 rounded-full bg-rink-500/20 flex items-center justify-center text-rink-400 text-xs font-bold shrink-0">
                    {player.full_name.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-white truncate">{player.full_name}</p>
                    <p className="text-xs text-neutral-500 truncate">{player.team_name}</p>
                  </div>
                </button>
              ))
            )}
          </div>

          <div className="p-2 border-t border-white/10">
            <button
              onClick={() => { setOpen(false); setSearchTerm(''); }}
              className="w-full px-3 py-1.5 text-xs text-neutral-400 hover:text-white text-center transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// =============================================================================
// Past Winners View
// =============================================================================

function PastWinnersView({ awards }: { awards: LeagueAwardWithDetails[] }) {
  // Only show awards that have a winner (player_id set) and season
  const winnersWithSeason = awards.filter(a => a.player_id && a.season_name);

  if (winnersWithSeason.length === 0) return null;

  // Group by season
  const bySeason = new Map<string, LeagueAwardWithDetails[]>();
  winnersWithSeason.forEach(award => {
    const key = award.season_name || 'Unknown';
    if (!bySeason.has(key)) {
      bySeason.set(key, []);
    }
    bySeason.get(key)!.push(award);
  });

  return (
    <div className="mb-8">
      <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
        <Crown className="w-5 h-5 text-amber-500" />
        Past Winners
      </h2>

      <div className="space-y-6">
        {Array.from(bySeason.entries()).map(([seasonName, seasonAwards]) => (
          <div key={seasonName}>
            <h3 className="text-sm font-semibold text-neutral-300 mb-3 uppercase tracking-wider">
              {seasonName}
            </h3>
            <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3">
              {seasonAwards.map((award) => {
                const style = getCategoryStyle(award.category);
                const Icon = style.icon;

                return (
                  <div
                    key={award.id}
                    className={cn(
                      'flex items-center gap-3 rounded-xl border p-4',
                      'bg-white/[0.02] border-white/[0.06]'
                    )}
                  >
                    <div className={cn('p-2 rounded-lg shrink-0', style.bg)}>
                      <Icon className={cn('w-4 h-4', style.color)} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-white truncate">{award.player_name}</p>
                      <p className="text-xs text-neutral-500 truncate">
                        {award.award_name}
                        {award.team_name && <span> &middot; {award.team_name}</span>}
                      </p>
                    </div>
                    <div className={cn('ml-auto shrink-0 px-2 py-0.5 rounded-full border text-[10px] font-bold uppercase', style.badge)}>
                      {award.category === 'custom' ? 'Award' : getCategoryLabel(award.category).split(' ')[0]}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// =============================================================================
// Main Component
// =============================================================================

export function AwardsClient({ leagueId, initialAwards, seasons, teams }: AwardsClientProps) {
  const router = useRouter();
  const [awards, setAwards] = useState(initialAwards);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [addingDefaults, setAddingDefaults] = useState(false);
  const [addedDefaults, setAddedDefaults] = useState<Set<string>>(
    // Pre-mark defaults that already exist (by category match)
    new Set(initialAwards.map(a => a.category))
  );
  const [addingCategory, setAddingCategory] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'manage' | 'winners'>('manage');

  // Form state
  const [awardName, setAwardName] = useState('');
  const [category, setCategory] = useState('mvp');
  const [seasonId, setSeasonId] = useState('');
  const [teamId, setTeamId] = useState('');
  const [, setPlayerName] = useState('');
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

  async function handleAddDefaultAward(defaultAward: typeof DEFAULT_AWARDS[0]) {
    setAddingCategory(defaultAward.category);

    try {
      const result = await createAward({
        leagueId,
        awardName: defaultAward.name,
        category: defaultAward.category,
        description: defaultAward.description,
      });

      if (result.success) {
        setAddedDefaults(prev => new Set([...prev, defaultAward.category]));
        router.refresh();
      }
    } catch {
      // Silently fail — user can retry
    } finally {
      setAddingCategory(null);
    }
  }

  async function handleAddAllDefaults() {
    setAddingDefaults(true);

    const toAdd = DEFAULT_AWARDS.filter(d => !addedDefaults.has(d.category));

    for (const defaultAward of toAdd) {
      try {
        const result = await createAward({
          leagueId,
          awardName: defaultAward.name,
          category: defaultAward.category,
          description: defaultAward.description,
        });

        if (result.success) {
          setAddedDefaults(prev => new Set([...prev, defaultAward.category]));
        }
      } catch {
        // Continue with remaining
      }
    }

    setAddingDefaults(false);
    router.refresh();
  }

  async function handleClearWinner(awardId: string) {
    const result = await updateAward(awardId, {
      playerId: null,
      teamId: null,
    });
    if (result.success) {
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

  const hasUnadded = DEFAULT_AWARDS.some(d => !addedDefaults.has(d.category));
  const hasWinners = awards.some(a => a.player_id);

  return (
    <div>
      {/* Tabs */}
      {hasWinners && (
        <div className="flex gap-1 mb-6 bg-white/[0.04] p-1 rounded-xl w-fit">
          <button
            onClick={() => setActiveTab('manage')}
            className={cn(
              'px-4 py-2 rounded-lg text-sm font-medium transition-colors',
              activeTab === 'manage'
                ? 'bg-rink-500/20 text-rink-400'
                : 'text-neutral-400 hover:text-white'
            )}
          >
            <span className="flex items-center gap-2">
              <Trophy className="w-4 h-4" />
              Manage Awards
            </span>
          </button>
          <button
            onClick={() => setActiveTab('winners')}
            className={cn(
              'px-4 py-2 rounded-lg text-sm font-medium transition-colors',
              activeTab === 'winners'
                ? 'bg-amber-500/20 text-amber-400'
                : 'text-neutral-400 hover:text-white'
            )}
          >
            <span className="flex items-center gap-2">
              <Crown className="w-4 h-4" />
              Past Winners
            </span>
          </button>
        </div>
      )}

      {/* Past Winners Tab */}
      {activeTab === 'winners' && <PastWinnersView awards={awards} />}

      {/* Manage Tab */}
      {activeTab === 'manage' && (
        <>
          {/* Add Award Button */}
          {!showForm && (
            <div className="mb-6 flex items-center gap-3">
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

          {/* Default Awards Section — always show when there are unadded defaults */}
          {hasUnadded && (
            <div className="mb-8">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-lg font-bold text-white flex items-center gap-2">
                    <Trophy className="w-5 h-5 text-arena-400" />
                    Default Awards
                  </h2>
                  <p className="text-sm text-neutral-500 mt-1">
                    Standard awards included with every league. Add them individually or all at once.
                  </p>
                </div>
                <button
                  onClick={handleAddAllDefaults}
                  disabled={addingDefaults}
                  className={cn(
                    'inline-flex items-center gap-2 px-4 py-2 rounded-xl font-medium text-sm',
                    'border border-white/10 text-neutral-300 hover:text-white hover:bg-white/[0.06]',
                    'transition-all disabled:opacity-50'
                  )}
                >
                  {addingDefaults ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Plus className="w-4 h-4" />
                  )}
                  {addingDefaults ? 'Adding...' : 'Add All'}
                </button>
              </div>

              <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                {DEFAULT_AWARDS.map((defaultAward) => {
                  const isAdded = addedDefaults.has(defaultAward.category);
                  const isAdding = addingCategory === defaultAward.category;
                  const Icon = defaultAward.icon;

                  return (
                    <div
                      key={defaultAward.category}
                      className={cn(
                        'relative rounded-xl border p-5 transition-all',
                        isAdded
                          ? 'bg-emerald-500/5 border-emerald-500/20'
                          : 'bg-white/[0.02] border-white/[0.06] hover:border-white/15'
                      )}
                    >
                      <div className="flex items-start gap-3">
                        <div className={cn('p-2.5 rounded-lg', defaultAward.bg)}>
                          <Icon className={cn('w-5 h-5', defaultAward.color)} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-white text-sm">{defaultAward.name}</h3>
                          <p className="text-xs text-neutral-500 mt-1 line-clamp-2">
                            {defaultAward.description}
                          </p>
                        </div>
                      </div>
                      <div className="mt-3">
                        {isAdded ? (
                          <span className="inline-flex items-center gap-1.5 text-xs text-emerald-400 font-medium">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            Added
                          </span>
                        ) : (
                          <button
                            onClick={() => handleAddDefaultAward(defaultAward)}
                            disabled={isAdding || addingDefaults}
                            className={cn(
                              'inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg',
                              'text-rink-400 hover:text-rink-300 bg-rink-500/10 hover:bg-rink-500/15',
                              'transition-colors disabled:opacity-50'
                            )}
                          >
                            {isAdding ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <Plus className="w-3.5 h-3.5" />
                            )}
                            Add to League
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
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
                    {seasonAwards.map((award) => {
                      const style = getCategoryStyle(award.category);
                      const CategoryIcon = style.icon;

                      return (
                        <div
                          key={award.id}
                          className={cn(
                            'bg-white/[0.04] border backdrop-blur-xl rounded-xl p-5 transition-colors',
                            award.player_id
                              ? 'border-amber-500/20 hover:border-amber-500/30'
                              : 'border-white/10 hover:border-white/20'
                          )}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-start gap-3 min-w-0">
                              <div className={cn('p-2 rounded-lg shrink-0', style.bg)}>
                                <CategoryIcon className={cn('w-4 h-4', style.color)} />
                              </div>
                              <div className="min-w-0">
                                <h3 className="font-semibold text-white">{award.award_name}</h3>
                                <p className="text-sm text-rink-500 font-medium">
                                  {getCategoryLabel(award.category)}
                                </p>

                                {/* Winner display */}
                                {award.player_id && award.player_name ? (
                                  <div className="mt-2 flex items-center gap-2">
                                    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-500/10 border border-amber-500/20">
                                      <Crown className="w-3.5 h-3.5 text-amber-500" />
                                      <span className="text-sm font-medium text-amber-400">
                                        {award.player_name}
                                      </span>
                                      {award.team_name && (
                                        <span className="text-xs text-neutral-500 ml-1">
                                          ({award.team_name})
                                        </span>
                                      )}
                                    </div>
                                    <button
                                      onClick={() => handleClearWinner(award.id)}
                                      className="p-1 rounded text-neutral-500 hover:text-red-400 transition-colors"
                                      title="Clear winner"
                                    >
                                      <X className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                ) : (
                                  <>
                                    {(award.team_name) && (
                                      <p className="text-sm text-neutral-400 mt-1">
                                        {award.team_name}
                                      </p>
                                    )}
                                  </>
                                )}

                                {award.description && (
                                  <p className="text-xs text-neutral-500 mt-1 line-clamp-2">{award.description}</p>
                                )}
                              </div>
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

                          {/* Select Winner button (only if season is set and no winner yet) */}
                          {award.season_id && !award.player_id && (
                            <div className="mt-3 pt-3 border-t border-white/[0.06]">
                              <WinnerSelector
                                award={award}
                                seasonId={award.season_id}
                                leagueId={leagueId}
                                onWinnerSet={() => router.refresh()}
                              />
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            !showForm && !hasUnadded && (
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
        </>
      )}
    </div>
  );
}
