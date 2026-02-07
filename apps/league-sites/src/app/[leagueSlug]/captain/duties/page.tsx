'use client';

import { useState, useEffect, use, useTransition } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePlayerProfile } from '@/hooks/usePlayerProfile';
import { createClient } from '@/lib/supabase/client';
import {
  ArrowLeft,
  Loader2,
  Shield,
  AlertCircle,
  Calendar,
  Circle,
  Clipboard,
  Droplet,
  RefreshCw,
  Check,
  Settings,
  ChevronDown,
  User,
} from 'lucide-react';
import {
  getDutyTypes,
  getGameDuties,
  assignDuty,
  getRotationSettings,
  updateRotationSettings,
  autoAssignNextDuty,
  type DutyType,
  type GameDuty,
  type RotationSettings,
} from '@/lib/actions/duties';

interface CaptainDutiesPageProps {
  params: Promise<{ leagueSlug: string }>;
}

interface UpcomingGame {
  id: string;
  scheduled_at: string;
  venue: string | null;
  home_team_id: string;
  away_team_id: string;
  opponent: {
    id: string;
    name: string;
    logo_url: string | null;
  } | null;
  isHome: boolean;
}

interface RosterPlayer {
  player_id: string;
  full_name: string | null;
  avatar_url: string | null;
  position: string | null;
  jersey_number: number | null;
}

const DUTY_ICONS: Record<string, React.ReactNode> = {
  circle: <Circle className="w-4 h-4" />,
  clipboard: <Clipboard className="w-4 h-4" />,
  droplet: <Droplet className="w-4 h-4" />,
};

export default function CaptainDutiesPage({ params }: CaptainDutiesPageProps) {
  const { leagueSlug } = use(params);
  const { currentTeam, isLoading: profileLoading } = usePlayerProfile();
  const [dutyTypes, setDutyTypes] = useState<DutyType[]>([]);
  const [upcomingGames, setUpcomingGames] = useState<UpcomingGame[]>([]);
  const [gameDuties, setGameDuties] = useState<Record<string, GameDuty[]>>({});
  const [roster, setRoster] = useState<RosterPlayer[]>([]);
  const [rotationSettings, setRotationSettings] = useState<RotationSettings[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isPending, startTransition] = useTransition();
  const [selectedGame, setSelectedGame] = useState<string | null>(null);
  const [showRotationModal, setShowRotationModal] = useState(false);
  const [selectedDutyType, setSelectedDutyType] = useState<DutyType | null>(null);

  const isCaptain = currentTeam?.is_captain || currentTeam?.is_alternate;

  useEffect(() => {
    const fetchData = async () => {
      if (!currentTeam?.team || !isCaptain) {
        setIsLoading(false);
        return;
      }

      const teamId = currentTeam.team_id;
      const supabase = createClient();

      // Fetch duty types
      const types = await getDutyTypes(teamId);
      setDutyTypes(types);

      // Fetch rotation settings
      const settings = await getRotationSettings(teamId);
      setRotationSettings(settings);

      // Fetch upcoming games
      const { data: gamesData } = await supabase
        .from('games')
        .select(`
          id,
          scheduled_at,
          venue,
          home_team_id,
          away_team_id,
          home_team:teams!games_home_team_id_fkey(id, name, logo_url),
          away_team:teams!games_away_team_id_fkey(id, name, logo_url)
        `)
        .or(`home_team_id.eq.${teamId},away_team_id.eq.${teamId}`)
        .in('status', ['scheduled'])
        .gte('scheduled_at', new Date().toISOString())
        .order('scheduled_at', { ascending: true })
        .limit(10);

      if (gamesData) {
        const games: UpcomingGame[] = gamesData.map((game: any) => {
          const isHome = game.home_team_id === teamId;
          const rawOpponent = isHome
            ? Array.isArray(game.away_team) ? game.away_team[0] : game.away_team
            : Array.isArray(game.home_team) ? game.home_team[0] : game.home_team;
          return {
            id: game.id,
            scheduled_at: game.scheduled_at,
            venue: game.venue,
            home_team_id: game.home_team_id,
            away_team_id: game.away_team_id,
            isHome,
            opponent: rawOpponent,
          };
        });
        setUpcomingGames(games);

        // Fetch duties for each game
        const dutiesMap: Record<string, GameDuty[]> = {};
        for (const game of games) {
          const duties = await getGameDuties(game.id, teamId);
          dutiesMap[game.id] = duties;
        }
        setGameDuties(dutiesMap);

        // Select first game by default
        if (games.length > 0) {
          setSelectedGame(games[0].id);
        }
      }

      // Fetch roster
      const { data: rosterData } = await supabase
        .from('team_rosters')
        .select(`
          player_id,
          position,
          jersey_number,
          profile:profiles(full_name, avatar_url)
        `)
        .eq('team_id', teamId)
        .eq('status', 'active');

      if (rosterData) {
        const players: RosterPlayer[] = rosterData.map((p: any) => {
          const profile = Array.isArray(p.profile) ? p.profile[0] : p.profile;
          return {
            player_id: p.player_id,
            full_name: profile?.full_name || null,
            avatar_url: profile?.avatar_url || null,
            position: p.position,
            jersey_number: p.jersey_number,
          };
        });
        setRoster(players);
      }

      setIsLoading(false);
    };

    if (!profileLoading) {
      fetchData();
    }
  }, [currentTeam, isCaptain, profileLoading]);

  const handleAssignDuty = async (gameId: string, dutyTypeId: string, playerId: string | null) => {
    if (!currentTeam?.team_id) return;

    startTransition(async () => {
      const result = await assignDuty(gameId, dutyTypeId, currentTeam.team_id, playerId);
      if (result.success) {
        // Refresh duties for this game
        const duties = await getGameDuties(gameId, currentTeam.team_id);
        setGameDuties((prev) => ({ ...prev, [gameId]: duties }));
      }
    });
  };

  const handleAutoAssign = async (gameId: string, dutyTypeId: string) => {
    if (!currentTeam?.team_id) return;

    startTransition(async () => {
      const result = await autoAssignNextDuty(gameId, dutyTypeId, currentTeam.team_id);
      if (result.success) {
        // Refresh duties for this game
        const duties = await getGameDuties(gameId, currentTeam.team_id);
        setGameDuties((prev) => ({ ...prev, [gameId]: duties }));
      }
    });
  };

  const handleSaveRotation = async (dutyTypeId: string, enabled: boolean, playerOrder: string[], skipGoalies: boolean) => {
    if (!currentTeam?.team_id) return;

    startTransition(async () => {
      const result = await updateRotationSettings(currentTeam.team_id, dutyTypeId, {
        rotation_enabled: enabled,
        player_order: playerOrder,
        skip_goalies: skipGoalies,
      });
      if (result.success) {
        const settings = await getRotationSettings(currentTeam.team_id);
        setRotationSettings(settings);
        setShowRotationModal(false);
      }
    });
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  if (profileLoading || isLoading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="w-8 h-8 animate-spin mx-auto text-[var(--league-primary)]" />
          <p className="text-[var(--color-text-secondary)]">Loading duties...</p>
        </div>
      </div>
    );
  }

  if (!currentTeam?.team || !isCaptain) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-6 text-center">
          <Shield className="w-12 h-12 mx-auto text-amber-400 mb-4" />
          <h2 className="text-lg font-semibold text-[var(--color-text-primary)] mb-2">
            Captain Access Required
          </h2>
          <p className="text-[var(--color-text-secondary)] mb-4">
            Only team captains and alternates can manage duties.
          </p>
          <Link
            href={`/${leagueSlug}/me`}
            className="inline-flex items-center gap-2 px-4 py-2 bg-[var(--color-surface-hover)] text-[var(--color-text-primary)] rounded-lg font-medium"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  const selectedGameData = upcomingGames.find((g) => g.id === selectedGame);
  const selectedGameDuties = selectedGame ? gameDuties[selectedGame] || [] : [];

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <Link
          href={`/${leagueSlug}/captain`}
          className="p-2 rounded-lg hover:bg-[var(--color-surface-hover)] transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-[var(--color-text-secondary)]" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">
            Game Duties
          </h1>
          <p className="text-[var(--color-text-secondary)]">
            Assign duties per game or set up auto-rotation
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Games List */}
        <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl overflow-hidden">
          <div className="p-4 border-b border-[var(--color-border)]">
            <h2 className="font-semibold text-[var(--color-text-primary)] flex items-center gap-2">
              <Calendar className="w-5 h-5 text-[var(--league-primary)]" />
              Upcoming Games
            </h2>
          </div>
          <div className="divide-y divide-[var(--color-border)] max-h-[500px] overflow-y-auto">
            {upcomingGames.length === 0 ? (
              <div className="p-6 text-center text-[var(--color-text-secondary)]">
                No upcoming games
              </div>
            ) : (
              upcomingGames.map((game) => {
                const isSelected = selectedGame === game.id;
                const duties = gameDuties[game.id] || [];
                const assignedCount = duties.filter((d) => d.assigned_player_id).length;

                return (
                  <button
                    key={game.id}
                    onClick={() => setSelectedGame(game.id)}
                    className={`w-full p-4 text-left transition-colors ${
                      isSelected
                        ? 'bg-[var(--league-primary)]/10'
                        : 'hover:bg-[var(--color-surface-hover)]'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      {game.opponent?.logo_url ? (
                        <Image
                          src={game.opponent.logo_url}
                          alt={game.opponent.name}
                          width={36}
                          height={36}
                          className="rounded"
                        />
                      ) : (
                        <div className="w-9 h-9 bg-[var(--color-surface-hover)] rounded flex items-center justify-center text-sm font-bold">
                          {game.opponent?.name?.charAt(0) || '?'}
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-[var(--color-text-primary)] truncate">
                          {game.isHome ? 'vs' : '@'} {game.opponent?.name || 'TBD'}
                        </p>
                        <p className="text-xs text-[var(--color-text-secondary)]">
                          {formatDate(game.scheduled_at)} at {formatTime(game.scheduled_at)}
                        </p>
                      </div>
                      <div className="text-right">
                        <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${
                          assignedCount === dutyTypes.length
                            ? 'bg-green-500/20 text-green-400'
                            : 'bg-amber-500/20 text-amber-400'
                        }`}>
                          {assignedCount}/{dutyTypes.length}
                        </span>
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Duty Assignments */}
        <div className="lg:col-span-2">
          {selectedGameData ? (
            <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl overflow-hidden">
              <div className="p-4 border-b border-[var(--color-border)]">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="font-semibold text-[var(--color-text-primary)]">
                      {selectedGameData.isHome ? 'vs' : '@'} {selectedGameData.opponent?.name}
                    </h2>
                    <p className="text-sm text-[var(--color-text-secondary)]">
                      {formatDate(selectedGameData.scheduled_at)} at {formatTime(selectedGameData.scheduled_at)}
                      {selectedGameData.venue && ` - ${selectedGameData.venue}`}
                    </p>
                  </div>
                </div>
              </div>

              <div className="p-4 space-y-4">
                {dutyTypes.map((dutyType) => {
                  const duty = selectedGameDuties.find((d) => d.duty_type_id === dutyType.id);
                  const assignedPlayer = duty?.assigned_player;
                  const rotation = rotationSettings.find((r) => r.duty_type_id === dutyType.id);

                  return (
                    <div
                      key={dutyType.id}
                      className="flex items-center gap-4 p-4 bg-[var(--color-surface-hover)] rounded-xl"
                    >
                      <div className="w-10 h-10 rounded-lg bg-[var(--color-surface)] flex items-center justify-center text-[var(--league-primary)]">
                        {DUTY_ICONS[dutyType.icon || 'circle'] || <Circle className="w-4 h-4" />}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-[var(--color-text-primary)]">
                            {dutyType.name}
                          </p>
                          {rotation?.rotation_enabled && (
                            <span className="px-1.5 py-0.5 bg-blue-500/20 text-blue-400 text-xs rounded">
                              Auto
                            </span>
                          )}
                        </div>
                        {dutyType.description && (
                          <p className="text-xs text-[var(--color-text-muted)]">
                            {dutyType.description}
                          </p>
                        )}
                      </div>

                      {/* Player Selector */}
                      <div className="flex items-center gap-2">
                        {assignedPlayer ? (
                          <div className="flex items-center gap-2 px-3 py-1.5 bg-green-500/10 text-green-400 rounded-lg">
                            {assignedPlayer.avatar_url ? (
                              <Image
                                src={assignedPlayer.avatar_url}
                                alt=""
                                width={20}
                                height={20}
                                className="rounded-full"
                              />
                            ) : (
                              <User className="w-4 h-4" />
                            )}
                            <span className="text-sm font-medium">
                              {assignedPlayer.full_name || 'Unknown'}
                            </span>
                          </div>
                        ) : (
                          <span className="text-sm text-[var(--color-text-muted)]">
                            Unassigned
                          </span>
                        )}

                        <div className="relative group">
                          <button className="p-2 rounded-lg hover:bg-[var(--color-surface)] transition-colors">
                            <ChevronDown className="w-4 h-4 text-[var(--color-text-secondary)]" />
                          </button>
                          <div className="absolute right-0 top-full mt-1 w-48 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg shadow-xl z-10 hidden group-hover:block">
                            <div className="py-1 max-h-48 overflow-y-auto">
                              <button
                                onClick={() => handleAssignDuty(selectedGame!, dutyType.id, null)}
                                className="w-full px-3 py-2 text-left text-sm text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-hover)]"
                              >
                                Unassign
                              </button>
                              {rotation?.rotation_enabled && (
                                <button
                                  onClick={() => handleAutoAssign(selectedGame!, dutyType.id)}
                                  className="w-full px-3 py-2 text-left text-sm text-blue-400 hover:bg-[var(--color-surface-hover)] flex items-center gap-2"
                                >
                                  <RefreshCw className="w-3 h-3" />
                                  Auto-assign next
                                </button>
                              )}
                              <div className="border-t border-[var(--color-border)] my-1" />
                              {roster.map((player) => (
                                <button
                                  key={player.player_id}
                                  onClick={() => handleAssignDuty(selectedGame!, dutyType.id, player.player_id)}
                                  className="w-full px-3 py-2 text-left text-sm text-[var(--color-text-primary)] hover:bg-[var(--color-surface-hover)] flex items-center gap-2"
                                >
                                  {player.avatar_url ? (
                                    <Image
                                      src={player.avatar_url}
                                      alt=""
                                      width={20}
                                      height={20}
                                      className="rounded-full"
                                    />
                                  ) : (
                                    <User className="w-4 h-4 text-[var(--color-text-muted)]" />
                                  )}
                                  <span className="truncate">
                                    {player.full_name || `#${player.jersey_number || '?'}`}
                                  </span>
                                  {player.player_id === assignedPlayer?.id && (
                                    <Check className="w-3 h-3 text-green-400 ml-auto" />
                                  )}
                                </button>
                              ))}
                            </div>
                          </div>
                        </div>

                        <button
                          onClick={() => {
                            setSelectedDutyType(dutyType);
                            setShowRotationModal(true);
                          }}
                          className="p-2 rounded-lg hover:bg-[var(--color-surface)] transition-colors"
                          title="Rotation settings"
                        >
                          <Settings className="w-4 h-4 text-[var(--color-text-muted)]" />
                        </button>
                      </div>
                    </div>
                  );
                })}

                {dutyTypes.length === 0 && (
                  <div className="text-center py-8 text-[var(--color-text-secondary)]">
                    <AlertCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p>No duty types configured</p>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-8 text-center">
              <Calendar className="w-12 h-12 mx-auto text-[var(--color-text-muted)] mb-4" />
              <p className="text-[var(--color-text-secondary)]">
                Select a game to manage duties
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Rotation Settings Modal */}
      {showRotationModal && selectedDutyType && (
        <RotationModal
          dutyType={selectedDutyType}
          roster={roster}
          settings={rotationSettings.find((r) => r.duty_type_id === selectedDutyType.id)}
          onSave={(enabled, order, skipGoalies) =>
            handleSaveRotation(selectedDutyType.id, enabled, order, skipGoalies)
          }
          onClose={() => {
            setShowRotationModal(false);
            setSelectedDutyType(null);
          }}
          isPending={isPending}
        />
      )}
    </div>
  );
}

function RotationModal({
  dutyType,
  roster,
  settings,
  onSave,
  onClose,
  isPending,
}: {
  dutyType: DutyType;
  roster: RosterPlayer[];
  settings?: RotationSettings;
  onSave: (enabled: boolean, playerOrder: string[], skipGoalies: boolean) => void;
  onClose: () => void;
  isPending: boolean;
}) {
  const [enabled, setEnabled] = useState(settings?.rotation_enabled ?? false);
  const [skipGoalies, setSkipGoalies] = useState(settings?.skip_goalies ?? true);
  const [playerOrder, setPlayerOrder] = useState<string[]>(
    settings?.player_order || roster.map((p) => p.player_id)
  );

  const movePlayer = (index: number, direction: 'up' | 'down') => {
    const newOrder = [...playerOrder];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= newOrder.length) return;
    [newOrder[index], newOrder[targetIndex]] = [newOrder[targetIndex], newOrder[index]];
    setPlayerOrder(newOrder);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl w-full max-w-md max-h-[80vh] overflow-hidden">
        <div className="p-4 border-b border-[var(--color-border)]">
          <h3 className="font-semibold text-[var(--color-text-primary)]">
            Rotation Settings: {dutyType.name}
          </h3>
        </div>

        <div className="p-4 space-y-4 max-h-[50vh] overflow-y-auto">
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={enabled}
              onChange={(e) => setEnabled(e.target.checked)}
              className="w-4 h-4 rounded border-[var(--color-border)] bg-[var(--color-surface-hover)] text-[var(--league-primary)] focus:ring-[var(--league-primary)]"
            />
            <span className="text-[var(--color-text-primary)]">Enable auto-rotation</span>
          </label>

          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={skipGoalies}
              onChange={(e) => setSkipGoalies(e.target.checked)}
              className="w-4 h-4 rounded border-[var(--color-border)] bg-[var(--color-surface-hover)] text-[var(--league-primary)] focus:ring-[var(--league-primary)]"
            />
            <span className="text-[var(--color-text-primary)]">Skip goalies in rotation</span>
          </label>

          {enabled && (
            <div>
              <p className="text-sm text-[var(--color-text-secondary)] mb-2">
                Rotation order (drag to reorder):
              </p>
              <div className="space-y-1">
                {playerOrder.map((playerId, index) => {
                  const player = roster.find((p) => p.player_id === playerId);
                  if (!player) return null;

                  const isGoalie = player.position === 'Goalie' || player.position === 'G';

                  return (
                    <div
                      key={playerId}
                      className={`flex items-center gap-2 p-2 bg-[var(--color-surface-hover)] rounded-lg ${
                        isGoalie && skipGoalies ? 'opacity-50' : ''
                      }`}
                    >
                      <span className="w-6 text-center text-sm text-[var(--color-text-muted)]">
                        {index + 1}
                      </span>
                      {player.avatar_url ? (
                        <Image
                          src={player.avatar_url}
                          alt=""
                          width={24}
                          height={24}
                          className="rounded-full"
                        />
                      ) : (
                        <User className="w-5 h-5 text-[var(--color-text-muted)]" />
                      )}
                      <span className="flex-1 text-sm text-[var(--color-text-primary)]">
                        {player.full_name || `#${player.jersey_number || '?'}`}
                      </span>
                      {isGoalie && skipGoalies && (
                        <span className="text-xs text-[var(--color-text-muted)]">Skipped</span>
                      )}
                      <div className="flex gap-1">
                        <button
                          onClick={() => movePlayer(index, 'up')}
                          disabled={index === 0}
                          className="p-1 hover:bg-[var(--color-surface)] rounded disabled:opacity-30"
                        >
                          <ChevronDown className="w-3 h-3 rotate-180" />
                        </button>
                        <button
                          onClick={() => movePlayer(index, 'down')}
                          disabled={index === playerOrder.length - 1}
                          className="p-1 hover:bg-[var(--color-surface)] rounded disabled:opacity-30"
                        >
                          <ChevronDown className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        <div className="p-4 border-t border-[var(--color-border)] flex gap-3 justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-hover)] rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => onSave(enabled, playerOrder, skipGoalies)}
            disabled={isPending}
            className="px-4 py-2 bg-[var(--league-primary)] text-[var(--color-accent-text)] rounded-lg font-medium hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center gap-2"
          >
            {isPending && <Loader2 className="w-4 h-4 animate-spin" />}
            Save Settings
          </button>
        </div>
      </div>
    </div>
  );
}
