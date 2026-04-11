'use client';

import { useEffect, useMemo, useState, useTransition } from 'react';
import { Check, HelpCircle, Loader2, Send, Users, X } from 'lucide-react';
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
  opponentName: string;
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
  opponentName,
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
  const [feedback, setFeedback] = useState<string | null>(null);
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

  const attendanceSummary = useMemo(() => {
    const summary = { confirmed: 0, tentative: 0, out: 0, no_response: 0 };
    for (const player of roster) {
      const status = statuses[player.playerId] || 'no_response';
      summary[status] += 1;
    }
    return summary;
  }, [roster, statuses]);

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
    setFeedback(null);
    startTransition(async () => {
      const result = await updateGameCheckin(nextGame.id, teamId, status);
      if (!result.success || !user) {
        setFeedback(result.error || 'Could not save your check-in.');
        return;
      }

      setStatuses((prev) => ({ ...prev, [user.id]: mapCheckinStatus(status) }));
      setFeedback(
        status === 'confirmed'
          ? 'You’re in.'
          : status === 'out'
            ? 'Marked out.'
            : 'Marked unsure.'
      );
    });
  };

  const handleShare = async () => {
    if (!canSend || rosterForShare.length === 0) return;

    try {
      setShareState('sharing');
      setFeedback(null);

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

      if (result === 'shared') {
        setFeedback('Opened your share sheet.');
      } else if (result === 'shared-text') {
        setFeedback('Opened your share sheet with the reminder link.');
      } else {
        setFeedback('Downloaded the reminder card and copied the check-in link.');
      }
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : 'Could not open the share sheet.');
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
    <section className="league-reading-panel rounded-[28px] p-5 md:p-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[var(--color-text-muted)]">
            Game check-in
          </p>
          <h2 className="mt-2 text-2xl font-black tracking-tight text-[var(--color-text-primary)]">
            Let your team know early.
          </h2>
        </div>

        <div className="flex flex-wrap items-center gap-3 text-sm text-[var(--color-text-secondary)]">
          <span className="inline-flex items-center gap-2 rounded-full bg-[var(--color-surface-hover)] px-3 py-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" /> {attendanceSummary.confirmed} in
          </span>
          <span className="inline-flex items-center gap-2 rounded-full bg-[var(--color-surface-hover)] px-3 py-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-red-400" /> {attendanceSummary.out} out
          </span>
          <span className="inline-flex items-center gap-2 rounded-full bg-[var(--color-surface-hover)] px-3 py-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-amber-400" /> {attendanceSummary.tentative} unsure
          </span>
          <span className="inline-flex items-center gap-2 rounded-full bg-[var(--color-surface-hover)] px-3 py-1.5">
            <Users className="h-3.5 w-3.5" /> {attendanceSummary.no_response} waiting
          </span>
        </div>
      </div>

      <div className={`mt-5 grid gap-3 ${canSend ? 'grid-cols-2 md:grid-cols-4' : 'grid-cols-3'}`}>
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
              <div className="flex items-center justify-center">
                {loading ? <Loader2 className="h-6 w-6 animate-spin" /> : <Icon className="h-6 w-6" />}
              </div>
              <span className="mt-3 text-base font-bold">{tile.label}</span>
            </button>
          );
        })}
      </div>

      {feedback ? (
        <p className="mt-4 text-sm font-medium text-[var(--color-text-secondary)]">{feedback}</p>
      ) : null}
    </section>
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

  return `rounded-[22px] border px-4 py-5 text-center transition-all ${accentMap[accent]} disabled:cursor-not-allowed disabled:opacity-60`;
}
