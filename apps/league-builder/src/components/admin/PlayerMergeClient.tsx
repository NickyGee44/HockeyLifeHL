'use client';

import { useState, useTransition, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Input } from '@/components/ui/input';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from '@/components/ui/dialog';
import {
  searchPlayerAccounts,
  executeAdminMerge,
  type UnlinkedLegacyProfile,
  type PlayerSearchResult,
  type MergeHistoryEntry,
} from '@/lib/actions/admin-legacy-merge';
import {
  ArrowRight,
  CheckCircle2,
  Clock,
  GitMerge,
  Loader2,
  Search,
  Shield,
  Trophy,
  UserPlus,
  Users,
  XCircle,
} from 'lucide-react';

// ============================================================================
// PROPS
// ============================================================================

type Props = {
  legacyProfiles: UnlinkedLegacyProfile[];
  mergeHistory: MergeHistoryEntry[];
};

// ============================================================================
// HELPERS
// ============================================================================

function formatDate(iso: string | null | undefined) {
  if (!iso) return '--';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '--';
  return d.toLocaleDateString('en-CA', { month: 'short', day: 'numeric', year: 'numeric' });
}

function truncateId(id: string) {
  return id.slice(0, 8);
}

// ============================================================================
// COMPONENT
// ============================================================================

export function PlayerMergeClient({ legacyProfiles, mergeHistory }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // Legacy profile list filter
  const [legacyFilter, setLegacyFilter] = useState('');

  // Selected legacy profile for merge
  const [selectedLegacy, setSelectedLegacy] = useState<UnlinkedLegacyProfile | null>(null);

  // Target account search
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<PlayerSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  // Selected target for merge
  const [selectedTarget, setSelectedTarget] = useState<PlayerSearchResult | null>(null);

  // Confirmation dialog
  const [showConfirm, setShowConfirm] = useState(false);
  const [isMerging, setIsMerging] = useState(false);

  // Tab state
  const [activeTab, setActiveTab] = useState<'unlinked' | 'history'>('unlinked');

  // Filter legacy profiles
  const filteredLegacy = legacyFilter.trim()
    ? legacyProfiles.filter(
        (p) =>
          p.fullName.toLowerCase().includes(legacyFilter.toLowerCase()) ||
          (p.email && p.email.toLowerCase().includes(legacyFilter.toLowerCase()))
      )
    : legacyProfiles;

  // Search handler (debounced manually)
  const handleSearch = useCallback(async (q: string) => {
    setSearchQuery(q);
    if (q.trim().length < 2) {
      setSearchResults([]);
      return;
    }
    setIsSearching(true);
    try {
      const result = await searchPlayerAccounts(q.trim());
      if (result.success) {
        setSearchResults(result.data);
      } else {
        toast.error(result.error);
      }
    } finally {
      setIsSearching(false);
    }
  }, []);

  // Merge handler
  const handleMerge = useCallback(async () => {
    if (!selectedLegacy || !selectedTarget) return;
    setIsMerging(true);
    try {
      const result = await executeAdminMerge(selectedTarget.id, selectedLegacy.id);
      if (result.success) {
        toast.success(
          `Merged "${selectedLegacy.fullName}" into "${selectedTarget.fullName}" — ${result.data.totalReassigned} records reassigned`
        );
        setSelectedLegacy(null);
        setSelectedTarget(null);
        setSearchQuery('');
        setSearchResults([]);
        setShowConfirm(false);
        startTransition(() => {
          router.refresh();
        });
      } else {
        toast.error(result.error);
      }
    } catch (err) {
      toast.error('An unexpected error occurred during merge');
    } finally {
      setIsMerging(false);
    }
  }, [selectedLegacy, selectedTarget, router]);

  return (
    <div className="space-y-6">
      {/* Tabs */}
      <div className="flex gap-1 rounded-xl bg-neutral-900 border border-white/[0.07] p-1 w-fit">
        <button
          onClick={() => setActiveTab('unlinked')}
          className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
            activeTab === 'unlinked'
              ? 'bg-white/10 text-white'
              : 'text-neutral-400 hover:text-neutral-200'
          }`}
        >
          <span className="flex items-center gap-2">
            <Users className="w-4 h-4" />
            Unlinked Profiles
            {legacyProfiles.length > 0 && (
              <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-orange-500/15 text-orange-400">
                {legacyProfiles.length}
              </span>
            )}
          </span>
        </button>
        <button
          onClick={() => setActiveTab('history')}
          className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
            activeTab === 'history'
              ? 'bg-white/10 text-white'
              : 'text-neutral-400 hover:text-neutral-200'
          }`}
        >
          <span className="flex items-center gap-2">
            <Clock className="w-4 h-4" />
            Merge History
          </span>
        </button>
      </div>

      {activeTab === 'unlinked' && (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          {/* LEFT: Legacy profile list */}
          <div className="space-y-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-neutral-500 mb-3">
                Step 1: Select Legacy Profile
              </p>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
                <Input
                  placeholder="Filter legacy profiles by name or email..."
                  value={legacyFilter}
                  onChange={(e) => setLegacyFilter(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <div className="bg-neutral-900 border border-white/[0.07] rounded-2xl overflow-hidden max-h-[600px] overflow-y-auto">
              {filteredLegacy.length === 0 ? (
                <div className="px-5 py-8 text-center">
                  <CheckCircle2 className="w-6 h-6 text-green-500/50 mx-auto mb-2" />
                  <p className="text-sm text-neutral-500">
                    {legacyProfiles.length === 0
                      ? 'No unlinked legacy profiles'
                      : 'No profiles match your filter'}
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-white/[0.04]">
                  {filteredLegacy.map((profile) => {
                    const isSelected = selectedLegacy?.id === profile.id;
                    return (
                      <button
                        key={profile.id}
                        onClick={() => {
                          setSelectedLegacy(isSelected ? null : profile);
                          if (!isSelected) {
                            setSelectedTarget(null);
                          }
                        }}
                        className={`w-full text-left px-4 py-3 transition-colors ${
                          isSelected
                            ? 'bg-cyan-400/10 border-l-2 border-l-cyan-400'
                            : 'hover:bg-white/[0.02]'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-white truncate">
                              {profile.fullName}
                            </p>
                            {profile.email && (
                              <p className="text-xs text-neutral-500 truncate">{profile.email}</p>
                            )}
                          </div>
                          <span className="text-[10px] text-neutral-600 flex-shrink-0 font-mono">
                            {truncateId(profile.id)}
                          </span>
                        </div>
                        {/* Inline stats */}
                        <div className="mt-2 flex flex-wrap gap-2">
                          {profile.teams.length > 0 && (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-blue-500/15 text-blue-400">
                              <Trophy className="w-3 h-3" />
                              {profile.teams.length} team{profile.teams.length !== 1 ? 's' : ''}
                            </span>
                          )}
                          {profile.stats.gamesPlayed > 0 && (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-rink-500/15 text-rink-400">
                              <Shield className="w-3 h-3" />
                              {profile.stats.gamesPlayed}GP {profile.stats.goals}G {profile.stats.assists}A {profile.stats.points}P
                            </span>
                          )}
                        </div>
                        {profile.teams.length > 0 && (
                          <div className="mt-1.5 space-y-0.5">
                            {profile.teams.slice(0, 3).map((t, i) => (
                              <p key={i} className="text-[10px] text-neutral-600 truncate">
                                {t.teamName} ({t.seasonName})
                              </p>
                            ))}
                            {profile.teams.length > 3 && (
                              <p className="text-[10px] text-neutral-600">
                                +{profile.teams.length - 3} more
                              </p>
                            )}
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* RIGHT: Target account search + merge action */}
          <div className="space-y-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-neutral-500 mb-3">
                Step 2: Find Target Account
              </p>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
                <Input
                  placeholder="Search real accounts by name or email..."
                  value={searchQuery}
                  onChange={(e) => handleSearch(e.target.value)}
                  disabled={!selectedLegacy}
                  className="pl-10"
                />
                {isSearching && (
                  <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500 animate-spin" />
                )}
              </div>
              {!selectedLegacy && (
                <p className="text-xs text-neutral-600 mt-2">
                  Select a legacy profile first
                </p>
              )}
            </div>

            {/* Search results */}
            <div className="bg-neutral-900 border border-white/[0.07] rounded-2xl overflow-hidden max-h-[300px] overflow-y-auto">
              {searchResults.length === 0 ? (
                <div className="px-5 py-8 text-center">
                  <UserPlus className="w-6 h-6 text-neutral-700 mx-auto mb-2" />
                  <p className="text-sm text-neutral-600">
                    {searchQuery.trim().length >= 2
                      ? 'No matching accounts found'
                      : 'Type at least 2 characters to search'}
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-white/[0.04]">
                  {searchResults.map((player) => {
                    const isSelected = selectedTarget?.id === player.id;
                    return (
                      <button
                        key={player.id}
                        onClick={() => setSelectedTarget(isSelected ? null : player)}
                        className={`w-full text-left px-4 py-3 transition-colors ${
                          isSelected
                            ? 'bg-emerald-400/10 border-l-2 border-l-emerald-400'
                            : 'hover:bg-white/[0.02]'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-white truncate">
                              {player.fullName}
                            </p>
                            {player.email && (
                              <p className="text-xs text-neutral-500 truncate">{player.email}</p>
                            )}
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <span className="text-[10px] text-neutral-600 font-mono">
                              {truncateId(player.id)}
                            </span>
                            {isSelected && (
                              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                            )}
                          </div>
                        </div>
                        <p className="text-[10px] text-neutral-600 mt-1">
                          Joined {formatDate(player.createdAt)}
                        </p>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Merge preview + action */}
            {selectedLegacy && selectedTarget && (
              <div className="bg-neutral-900 border border-cyan-400/20 rounded-2xl p-5 space-y-4">
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-cyan-100/80">
                  Step 3: Review & Merge
                </p>

                <div className="flex items-center gap-3">
                  <div className="flex-1 rounded-xl bg-orange-500/10 border border-orange-400/20 p-3">
                    <p className="text-[10px] uppercase tracking-wider text-orange-400 font-semibold">
                      Legacy Profile
                    </p>
                    <p className="text-sm font-bold text-white mt-1 truncate">
                      {selectedLegacy.fullName}
                    </p>
                    {selectedLegacy.email && (
                      <p className="text-xs text-neutral-500 truncate">{selectedLegacy.email}</p>
                    )}
                  </div>

                  <ArrowRight className="w-5 h-5 text-cyan-400 flex-shrink-0" />

                  <div className="flex-1 rounded-xl bg-emerald-500/10 border border-emerald-400/20 p-3">
                    <p className="text-[10px] uppercase tracking-wider text-emerald-400 font-semibold">
                      Target Account
                    </p>
                    <p className="text-sm font-bold text-white mt-1 truncate">
                      {selectedTarget.fullName}
                    </p>
                    {selectedTarget.email && (
                      <p className="text-xs text-neutral-500 truncate">{selectedTarget.email}</p>
                    )}
                  </div>
                </div>

                {/* Data to transfer */}
                <div className="rounded-xl bg-black/20 p-3 space-y-2">
                  <p className="text-[10px] uppercase tracking-wider text-neutral-500 font-semibold">
                    Data to Transfer
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="text-center p-2 rounded-lg bg-neutral-800/60">
                      <p className="text-lg font-black text-white">{selectedLegacy.teams.length}</p>
                      <p className="text-[10px] text-neutral-500">Team Rosters</p>
                    </div>
                    <div className="text-center p-2 rounded-lg bg-neutral-800/60">
                      <p className="text-lg font-black text-white">{selectedLegacy.stats.gamesPlayed}</p>
                      <p className="text-[10px] text-neutral-500">Games Played</p>
                    </div>
                    <div className="text-center p-2 rounded-lg bg-neutral-800/60">
                      <p className="text-lg font-black text-white">
                        {selectedLegacy.stats.goals}G {selectedLegacy.stats.assists}A
                      </p>
                      <p className="text-[10px] text-neutral-500">Goals / Assists</p>
                    </div>
                    <div className="text-center p-2 rounded-lg bg-neutral-800/60">
                      <p className="text-lg font-black text-white">{selectedLegacy.stats.points}</p>
                      <p className="text-[10px] text-neutral-500">Points</p>
                    </div>
                  </div>
                  {selectedLegacy.teams.length > 0 && (
                    <div className="mt-2 space-y-1">
                      {selectedLegacy.teams.map((t, i) => (
                        <p key={i} className="text-[10px] text-neutral-500">
                          {t.teamName} -- {t.seasonName}
                        </p>
                      ))}
                    </div>
                  )}
                </div>

                <button
                  onClick={() => setShowConfirm(true)}
                  className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-rink-500 px-4 py-3 text-sm font-bold text-black hover:opacity-90 transition-opacity"
                >
                  <GitMerge className="w-4 h-4" />
                  Merge Profiles
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'history' && (
        <div className="bg-neutral-900 border border-white/[0.07] rounded-2xl overflow-hidden">
          <div className="px-5 py-3 border-b border-white/[0.05]">
            <p className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">
              Completed Merges
            </p>
          </div>
          {mergeHistory.length === 0 ? (
            <div className="px-5 py-8 text-center">
              <GitMerge className="w-6 h-6 text-neutral-700 mx-auto mb-2" />
              <p className="text-sm text-neutral-600">No merges completed yet</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/[0.04]">
                  {['Legacy Profile', 'Merged Into', 'Date'].map((h) => (
                    <th
                      key={h}
                      className="text-left px-4 py-2 text-[10px] font-semibold text-neutral-600 uppercase tracking-wider whitespace-nowrap"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.03]">
                {mergeHistory.map((entry) => (
                  <tr key={entry.legacyProfileId} className="hover:bg-white/[0.02]">
                    <td className="px-4 py-2.5">
                      <p className="font-semibold text-neutral-300 text-xs">{entry.legacyName}</p>
                      <p className="text-[10px] text-neutral-600 font-mono">
                        {truncateId(entry.legacyProfileId)}
                      </p>
                    </td>
                    <td className="px-4 py-2.5">
                      <p className="font-semibold text-white text-xs">{entry.targetName}</p>
                      {entry.targetEmail && (
                        <p className="text-[10px] text-neutral-500">{entry.targetEmail}</p>
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-xs text-neutral-400 whitespace-nowrap">
                      {formatDate(entry.mergedAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Confirmation dialog */}
      <AlertDialog open={showConfirm} onOpenChange={setShowConfirm}>
        <AlertDialogContent className="bg-neutral-900 border-white/10">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">Confirm Player Merge</AlertDialogTitle>
            <AlertDialogDescription className="text-neutral-400">
              This will permanently transfer all historical data (stats, rosters, game events,
              waivers) from{' '}
              <span className="font-semibold text-orange-400">
                {selectedLegacy?.fullName}
              </span>{' '}
              into{' '}
              <span className="font-semibold text-emerald-400">
                {selectedTarget?.fullName}
              </span>
              . This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              disabled={isMerging}
              className="bg-neutral-800 border-neutral-700 text-neutral-300 hover:bg-neutral-700 hover:text-white"
            >
              Cancel
            </AlertDialogCancel>
            <button
              onClick={handleMerge}
              disabled={isMerging}
              className="inline-flex items-center justify-center gap-2 rounded-md bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-500 disabled:opacity-50 disabled:pointer-events-none transition-colors"
            >
              {isMerging ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Merging...
                </>
              ) : (
                <>
                  <GitMerge className="w-4 h-4" />
                  Confirm Merge
                </>
              )}
            </button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
