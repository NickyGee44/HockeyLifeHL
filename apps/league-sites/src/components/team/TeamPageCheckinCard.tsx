'use client';

import { useEffect, useMemo, useState, useTransition } from 'react';
import { Check, HelpCircle, Loader2, Send, X } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { usePlayerProfile } from '@/hooks/usePlayerProfile';
import { useUser } from '@/hooks/useUser';
import { updateGameCheckin, type CheckinStatus } from '@/lib/actions/checkins';
import {
  shareCheckinReminder,
  type ReminderCheckinStatus,
  type ReminderRosterPlayer,
} from '@/lib/checkins/share-reminder';

interface TeamPageCheckinCardProps {
  leagueId: string;
  leagueSlug: string;
  seasonId: string | null;
  timezone: string;
  teamId: string;
  teamName: string;
  teamLogoUrl: string | null;
  teamPrimaryColor: string | null;
  opponentName: string;
  opponentLogoUrl: string | null;
  opponentPrimaryColor: string | null;
  nextGame: {
    id: string;
    scheduledAt: string;
    venue: string | null;
  };
  seasonRecord: string;
  opponentRecord: string;
}

interface TeamRosterEntry {
  playerId: string;
  fullName: string;
  position: string | null;
}

export function TeamPageCheckinCard({
  leagueId,
  leagueSlug,
  seasonId,
  timezone,
  teamId,
  teamName,
  teamLogoUrl,
  teamPrimaryColor,
  opponentName,
  opponentLogoUrl,
  opponentPrimaryColor,
  nextGame,
  seasonRecord,
  opponentRecord,
}: TeamPageCheckinCardProps) {
  const { user } = useUser();
  const { currentTeam, isLoading: profileLoading } = usePlayerProfile(leagueId, seasonId);
  const [isLoading, setIsLoading] = useState(true);
  const [roster, setRoster] = useState<TeamRosterEntry[]>([]);
  const [statuses, setStatuses] = useState<Record<string, ReminderCheckinStatus>>({});
  const [shareState, setShareState] = useState<'idle' | 'sharing'>('idle');
  const [isPending, startTransition] = useTransition();

  const isOnThisTeam = currentTeam?.team_id === teamId;
  const canSend = Boolean(isOnThisTeam && (currentTeam?.is_captain || currentTeam?.is_alternate));
  const myStatus = user ? statuses[user.id] : undefined;

  useEffect(() => {
    if (!user || !isOnThisTeam) {
      setIsLoading(false);
      return;
    }

    const loadData = async () => {
      setIsLoading(true);
      const supabase = createClient();

      let rosterQuery = supabase
        .from('team_rosters')
        .select('player_id, position, profile:profiles(full_name)')
        .eq('team_id', teamId)
        .eq('status', 'active')
        .is('end_date', null);

      if (seasonId) {
        rosterQuery = rosterQuery.eq('season_id', seasonId);
      }

      const [{ data: rosterData }, { data: checkinData }] = await Promise.all([
        rosterQuery,
        supabase
          .from('game_checkins')
          .select('player_id, status')
          .eq('team_id', teamId)
          .eq('game_id', nextGame.id),
      ]);

      const nextRoster = (rosterData || []).map((row: any) => ({
        playerId: row.player_id,
        position: row.position || null,
        fullName: (Array.isArray(row.profile) ? row.profile[0]?.full_name : row.profile?.full_name) || 'Player',
      }));

      const nextStatuses: Record<string, ReminderCheckinStatus> = {};
      for (const row of checkinData || []) {
        nextStatuses[row.player_id] = mapCheckinStatus(row.status);
      }

      setRoster(nextRoster);
      setStatuses(nextStatuses);
      setIsLoading(false);
    };

    loadData();
  }, [isOnThisTeam, nextGame.id, seasonId, teamId, user]);

  const rosterForShare = useMemo<ReminderRosterPlayer[]>(() => {
    return roster.map((player) => ({
      fullName: player.fullName,
      position: player.position,
      status: statuses[player.playerId] || 'no_response',
    }));
  }, [roster, statuses]);

  if (profileLoading || !user || !isOnThisTeam) {
    return null;
  }

  const handleCheckin = (status: CheckinStatus) => {
    startTransition(async () => {
      const result = await updateGameCheckin(nextGame.id, teamId, status);
      if (!result.success || !user) {
        if (typeof window !== 'undefined') {
          window.alert(result.error || 'Could not save your check-in.');
        }
        return;
      }

      const nextStatus = mapCheckinStatus(status);
      setStatuses((prev) => ({ ...prev, [user.id]: nextStatus }));

      if (typeof window !== 'undefined') {
        window.dispatchEvent(
          new CustomEvent('team-checkin-updated', {
            detail: {
              gameId: nextGame.id,
              playerId: user.id,
              status: nextStatus,
            },
          })
        );
      }
    });
  };

  const handleShare = async () => {
    if (!canSend || rosterForShare.length === 0) return;

    try {
      setShareState('sharing');

      const scheduledDate = new Date(nextGame.scheduledAt);
      const puckDropLabel = new Intl.DateTimeFormat('en-CA', {
        timeZone: timezone,
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      }).format(scheduledDate);

      const shareUrl = `${window.location.origin}/${leagueSlug}/checkin`;
      const result = await shareCheckinReminder({
        teamName,
        opponentName,
        teamLogoUrl,
        opponentLogoUrl,
        teamPrimaryColor,
        opponentPrimaryColor,
        seasonRecord,
        opponentRecord,
        puckDropLabel,
        venue: nextGame.venue,
        roster: rosterForShare,
        fileName: `${slugify(teamName)}-vs-${slugify(opponentName)}-checkin.png`,
        shareTitle: `${teamName} vs ${opponentName}`,
        shareText: `Please check in for ${teamName}'s next game vs ${opponentName}.`,
        shareUrl,
      });

      if (result === 'downloaded' && typeof window !== 'undefined') {
        window.alert('Reminder card downloaded and check-in link copied.');
      }
    } catch (error) {
      if (typeof window !== 'undefined') {
        window.alert(error instanceof Error ? error.message : 'Could not open the share sheet.');
      }
    } finally {
      setShareState('idle');
    }
  };

  const tiles = [
    {
      key: 'confirmed',
      label: 'In',
      icon: Check,
      active: myStatus === 'confirmed',
      onClick: () => handleCheckin('confirmed'),
      accent: 'emerald',
    },
    {
      key: 'out',
      label: 'Out',
      icon: X,
      active: myStatus === 'out',
      onClick: () => handleCheckin('out'),
      accent: 'red',
    },
    {
      key: 'tentative',
      label: 'Unsure',
      icon: HelpCircle,
      active: myStatus === 'tentative',
      onClick: () => handleCheckin('tentative'),
      accent: 'amber',
    },
  ];

  if (canSend) {
    tiles.push({
      key: 'send',
      label: 'Send',
      icon: Send,
      active: false,
      onClick: handleShare,
      accent: 'blue',
    });
  }

  return (
    <div className={`grid gap-2 ${canSend ? 'grid-cols-4' : 'grid-cols-3'}`}>
      {tiles.map((tile) => {
        const Icon = tile.icon;
        const loading = tile.key === 'send' ? shareState === 'sharing' : isPending;
        return (
          <button
            key={tile.key}
            type="button"
            onClick={tile.onClick}
            disabled={loading || isLoading}
            className={buildTileClass(tile.accent, tile.active)}
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Icon className="h-4 w-4" />}
            <span className="text-[12px] font-semibold leading-none sm:text-sm">{tile.label}</span>
          </button>
        );
      })}
    </div>
  );
}

function mapCheckinStatus(status: string): ReminderCheckinStatus {
  if (status === 'confirmed') return 'confirmed';
  if (status === 'out') return 'out';
  if (status === 'tentative') return 'tentative';
  return 'no_response';
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

function buildTileClass(accent: string, active: boolean) {
  const accentMap: Record<string, string> = {
    emerald: active
      ? 'border-emerald-400/60 bg-emerald-500/12 text-emerald-300'
      : 'border-white/8 bg-[var(--color-surface-hover)] text-[var(--color-text-primary)] hover:border-emerald-400/35 hover:text-emerald-300',
    red: active
      ? 'border-red-400/60 bg-red-500/12 text-red-300'
      : 'border-white/8 bg-[var(--color-surface-hover)] text-[var(--color-text-primary)] hover:border-red-400/35 hover:text-red-300',
    amber: active
      ? 'border-amber-400/60 bg-amber-500/12 text-amber-300'
      : 'border-white/8 bg-[var(--color-surface-hover)] text-[var(--color-text-primary)] hover:border-amber-400/35 hover:text-amber-300',
    blue: 'border-white/8 bg-[var(--color-surface-hover)] text-[var(--color-text-primary)] hover:border-sky-400/35 hover:text-sky-300',
  };

  return `flex h-10 items-center justify-center gap-1.5 rounded-xl border px-3 text-center transition-all ${accentMap[accent]} disabled:cursor-not-allowed disabled:opacity-60`;
}
