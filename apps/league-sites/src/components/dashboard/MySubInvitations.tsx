'use client';

import { useState, useEffect, useTransition } from 'react';
import {
  UserPlus,
  Calendar,
  Clock,
  Check,
  X,
  Loader2,
} from 'lucide-react';
import {
  getMySubInvitations,
  respondToSubInvite,
  type SubInvitation,
} from '@/lib/actions/sub-invitations';

interface MySubInvitationsProps {
  leagueId: string;
}

export function MySubInvitations({ leagueId }: MySubInvitationsProps) {
  const [invitations, setInvitations] = useState<SubInvitation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isPending, startTransition] = useTransition();
  const [respondingId, setRespondingId] = useState<string | null>(null);

  useEffect(() => {
    const fetchInvitations = async () => {
      const result = await getMySubInvitations(leagueId);
      if (result.success && result.data) {
        setInvitations(result.data);
      }
      setIsLoading(false);
    };

    fetchInvitations();
  }, [leagueId]);

  const handleRespond = (invitationId: string, accept: boolean) => {
    setRespondingId(invitationId);
    startTransition(async () => {
      const result = await respondToSubInvite(invitationId, accept);
      if (result.success) {
        setInvitations((prev) => prev.filter((inv) => inv.id !== invitationId));
      }
      setRespondingId(null);
    });
  };

  if (isLoading) {
    return null; // Don't show anything while loading
  }

  if (invitations.length === 0) {
    return null; // Don't show widget if no invitations
  }

  return (
    <div className="bg-[var(--color-surface)] border border-amber-500/30 rounded-xl overflow-hidden">
      <div className="p-4 border-b border-[var(--color-border)] bg-amber-500/5">
        <h3 className="font-semibold text-[var(--color-text-primary)] flex items-center gap-2">
          <UserPlus className="w-5 h-5 text-amber-400" />
          Sub Invitations
          <span className="ml-1 px-2 py-0.5 bg-amber-500/20 text-amber-400 rounded-full text-xs font-medium">
            {invitations.length}
          </span>
        </h3>
      </div>

      <div className="divide-y divide-[var(--color-border)]">
        {invitations.map((inv) => {
          const isResponding = respondingId === inv.id;
          const gameDate = inv.game?.scheduled_at
            ? new Date(inv.game.scheduled_at)
            : null;

          return (
            <div key={inv.id} className="p-4">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center flex-shrink-0">
                  <UserPlus className="w-5 h-5 text-amber-400" />
                </div>

                <div className="flex-1 min-w-0">
                  <p className="font-medium text-[var(--color-text-primary)]">
                    {inv.team?.name || 'A team'} needs a sub
                  </p>
                  {inv.game && (
                    <div className="flex items-center gap-3 text-sm text-[var(--color-text-secondary)] mt-1">
                      {gameDate && (
                        <>
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3.5 h-3.5" />
                            {gameDate.toLocaleDateString('en-US', {
                              weekday: 'short',
                              month: 'short',
                              day: 'numeric',
                            })}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5" />
                            {gameDate.toLocaleTimeString('en-US', {
                              hour: 'numeric',
                              minute: '2-digit',
                            })}
                          </span>
                        </>
                      )}
                    </div>
                  )}
                  {inv.game?.home_team && inv.game?.away_team && (
                    <p className="text-xs text-[var(--color-text-muted)] mt-1">
                      {inv.game.home_team.name} vs {inv.game.away_team.name}
                    </p>
                  )}
                  {inv.message && (
                    <p className="text-sm text-[var(--color-text-muted)] italic mt-1">
                      &quot;{inv.message}&quot;
                    </p>
                  )}
                  {inv.invited_by_profile?.full_name && (
                    <p className="text-xs text-[var(--color-text-muted)] mt-1">
                      Invited by {inv.invited_by_profile.full_name}
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                  {isResponding ? (
                    <Loader2 className="w-5 h-5 animate-spin text-[var(--color-text-secondary)]" />
                  ) : (
                    <>
                      <button
                        onClick={() => handleRespond(inv.id, true)}
                        disabled={isPending}
                        className="inline-flex items-center gap-1 px-3 py-1.5 bg-green-500/10 text-green-400 rounded-lg text-xs font-medium hover:bg-green-500/20 transition-colors disabled:opacity-50"
                      >
                        <Check className="w-3.5 h-3.5" />
                        Accept
                      </button>
                      <button
                        onClick={() => handleRespond(inv.id, false)}
                        disabled={isPending}
                        className="inline-flex items-center gap-1 px-3 py-1.5 bg-red-500/10 text-red-400 rounded-lg text-xs font-medium hover:bg-red-500/20 transition-colors disabled:opacity-50"
                      >
                        <X className="w-3.5 h-3.5" />
                        Decline
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
