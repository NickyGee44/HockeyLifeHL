'use client';

import { useParams } from 'next/navigation';
import { useState, useEffect, useTransition } from 'react';
import Image from 'next/image';
import { useUser } from '@/hooks/useUser';
import { usePlayerProfile } from '@/hooks/usePlayerProfile';
import { useLeague } from '@/hooks/useLeague';
import { MyTeamCard } from '@/components/dashboard/MyTeamCard';
import { MySubInvitations } from '@/components/dashboard/MySubInvitations';
import { MyStats } from '@/components/dashboard/MyStats';
import { QuickActions } from '@/components/dashboard/QuickActions';
import { ErrorCard } from '@/components/ui/ErrorCard';
import {
  Loader2,
  User,
  Users,
  Send,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  UserPlus,
  X,
  CreditCard,
} from 'lucide-react';
import {
  getMyJoinRequests,
  getTeamsForJoin,
  submitJoinRequest,
  cancelJoinRequest,
  type TeamJoinRequest,
  type TeamForJoin,
} from '@/lib/actions/team-join';
import { getOutstandingBalance } from '@/lib/actions/registration-payments';

/**
 * Player Dashboard - personalized landing page for authenticated players
 * Shows join request UI if not on a team, otherwise shows their team dashboard
 */
export default function PlayerDashboard() {
  const params = useParams();
  const leagueSlug = params.leagueSlug as string;
  const [isRetrying, setIsRetrying] = useState(false);
  const [outstandingBalance, setOutstandingBalance] = useState<{
    hasBalance: boolean;
    amountCents: number;
    registrationId: string | null;
  } | null>(null);

  const { session } = useUser();

  // First get the league to know which league we're in
  const { league, isLoading: leagueLoading } = useLeague();

  // Then get player profile filtered by this league
  const { profile, currentTeam, isLoading, error, refetch } = usePlayerProfile(
    league?.id,
    league?.current_season_id
  );

  // Fetch outstanding balance
  useEffect(() => {
    if (leagueSlug) {
      getOutstandingBalance(leagueSlug, session?.access_token).then(setOutstandingBalance);
    }
  }, [leagueSlug, session?.access_token]);

  const handleRetry = async () => {
    setIsRetrying(true);
    try {
      await refetch();
    } finally {
      setIsRetrying(false);
    }
  };

  if (isLoading || leagueLoading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="w-8 h-8 animate-spin mx-auto text-[var(--league-primary)]" />
          <p className="text-[var(--color-text-secondary)]">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <ErrorCard
          title="Unable to Load Dashboard"
          message={error.message || 'There was a problem loading your profile. Please check your connection and try again.'}
          onRetry={handleRetry}
          isRetrying={isRetrying}
          size="lg"
        />
      </div>
    );
  }

  // If player is NOT on a team in this league, show join request UI
  if (!currentTeam || !currentTeam.team) {
    return (
      <JoinTeamView
        leagueSlug={leagueSlug}
        leagueId={league?.id || ''}
        seasonId={league?.current_season_id || ''}
        playerName={profile?.full_name || 'Player'}
        avatarUrl={profile?.avatar_url}
      />
    );
  }

  // Player is on a team - show full dashboard
  const playerName = profile?.full_name || 'Player';
  const firstName = profile?.full_name?.split(' ')[0] || 'Player';

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Welcome Header */}
      <div className="mb-8">
        <div className="flex items-center gap-4 mb-2">
          {profile?.avatar_url ? (
            <img
              src={profile.avatar_url}
              alt={playerName}
              className="w-16 h-16 rounded-full object-cover border-2 border-[var(--league-primary)]"
            />
          ) : (
            <div className="w-16 h-16 rounded-full bg-[var(--color-surface-hover)] flex items-center justify-center border-2 border-[var(--league-primary)]">
              <User className="w-8 h-8 text-[var(--color-text-secondary)]" />
            </div>
          )}
          <div>
            <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">
              Welcome back, {firstName}!
            </h1>
            <p className="text-[var(--color-text-secondary)]">
              {currentTeam?.team ? `${currentTeam.team.name} #${currentTeam.jersey_number ?? '-'}` : 'Free Agent'}
            </p>
          </div>
        </div>
      </div>

      {/* Payment Due Banner */}
      {outstandingBalance?.hasBalance && (
        <div className="mb-6 p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <CreditCard className="w-5 h-5 text-amber-400 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-amber-400">Registration Fee Due</p>
              <p className="text-sm text-[var(--color-text-secondary)]">
                {new Intl.NumberFormat('en-CA', { style: 'currency', currency: 'CAD' }).format(outstandingBalance.amountCents / 100)}
              </p>
            </div>
          </div>
          <a
            href={`/${leagueSlug}/me/payments`}
            className="px-4 py-2 rounded-lg bg-amber-500 text-black text-sm font-semibold hover:bg-amber-400 transition-colors flex-shrink-0"
          >
            Pay Online
          </a>
        </div>
      )}

      {/* Sub Invitations (only shown if there are pending invites) */}
      {league?.id && (
        <div className="mb-6">
          <MySubInvitations leagueId={league.id} />
        </div>
      )}

      {/* Main Dashboard Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-6">
          <MyTeamCard
            team={currentTeam}
            leagueSlug={leagueSlug}
            seasonId={league?.current_season_id}
          />
          <QuickActions
            leagueSlug={leagueSlug}
            hasOutstandingPayment={outstandingBalance?.hasBalance}
          />
        </div>

        <div>
          <MyStats
            playerId={profile?.id}
            seasonId={league?.current_season_id}
            leagueSlug={leagueSlug}
          />
        </div>
      </div>
    </div>
  );
}

/**
 * Join Team View - shown when player is not on a team in this league
 */
function JoinTeamView({
  leagueId,
  seasonId,
  playerName,
  avatarUrl,
}: {
  leagueSlug: string;
  leagueId: string;
  seasonId: string;
  playerName: string;
  avatarUrl?: string | null;
}) {
  const [teams, setTeams] = useState<TeamForJoin[]>([]);
  const [requests, setRequests] = useState<TeamJoinRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isPending, startTransition] = useTransition();
  const [selectedTeam, setSelectedTeam] = useState<string>('');
  const [message, setMessage] = useState('');
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      if (!leagueId) {
        setIsLoading(false);
        return;
      }

      const [teamsData, requestsData] = await Promise.all([
        getTeamsForJoin(leagueId, seasonId),
        getMyJoinRequests(leagueId, seasonId),
      ]);

      setTeams(teamsData);
      setRequests(requestsData);
      setIsLoading(false);
    };

    fetchData();
  }, [leagueId, seasonId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTeam || !leagueId || !seasonId) return;

    setSubmitError(null);
    setSubmitSuccess(false);

    startTransition(async () => {
      const result = await submitJoinRequest(selectedTeam, leagueId, seasonId, message);
      if (result.success) {
        setSubmitSuccess(true);
        setSelectedTeam('');
        setMessage('');
        // Refresh requests
        const updatedRequests = await getMyJoinRequests(leagueId, seasonId);
        setRequests(updatedRequests);
      } else {
        setSubmitError(result.error || 'Failed to submit request');
      }
    });
  };

  const handleCancel = async (requestId: string) => {
    startTransition(async () => {
      const result = await cancelJoinRequest(requestId);
      if (result.success) {
        const updatedRequests = await getMyJoinRequests(leagueId, seasonId);
        setRequests(updatedRequests);
      }
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-amber-500/20 text-amber-400 rounded-full text-xs font-medium">
            <Clock className="w-3 h-3" />
            Pending
          </span>
        );
      case 'accepted':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-green-500/20 text-green-400 rounded-full text-xs font-medium">
            <CheckCircle2 className="w-3 h-3" />
            Accepted
          </span>
        );
      case 'accepted_sub':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-blue-500/20 text-blue-400 rounded-full text-xs font-medium">
            <CheckCircle2 className="w-3 h-3" />
            Accepted as Sub
          </span>
        );
      case 'rejected':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-red-500/20 text-red-400 rounded-full text-xs font-medium">
            <XCircle className="w-3 h-3" />
            Declined
          </span>
        );
      case 'waitlist':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-purple-500/20 text-purple-400 rounded-full text-xs font-medium">
            <Clock className="w-3 h-3" />
            Waitlisted
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-[var(--color-surface-hover)] text-[var(--color-text-secondary)] rounded-full text-xs font-medium">
            {status}
          </span>
        );
    }
  };

  const firstName = playerName.split(' ')[0];

  // Filter out teams the player already has pending requests for
  const pendingTeamIds = requests.filter((r) => r.status === 'pending').map((r) => r.team_id);
  const availableTeams = teams.filter((t) => !pendingTeamIds.includes(t.id));

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8 text-center">
        <div className="flex justify-center mb-4">
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt={playerName}
              className="w-20 h-20 rounded-full object-cover border-2 border-[var(--league-primary)]"
            />
          ) : (
            <div className="w-20 h-20 rounded-full bg-[var(--color-surface-hover)] flex items-center justify-center border-2 border-[var(--league-primary)]">
              <User className="w-10 h-10 text-[var(--color-text-secondary)]" />
            </div>
          )}
        </div>
        <h1 className="text-2xl font-bold text-[var(--color-text-primary)] mb-2">
          Welcome, {firstName}!
        </h1>
        <p className="text-[var(--color-text-secondary)]">
          You&apos;re not on a team in this league yet. Request to join a team below.
        </p>
      </div>

      <div className="max-w-2xl mx-auto space-y-6">
        {/* Existing Requests */}
        {requests.length > 0 && (
          <div className="glass-card rounded-xl overflow-hidden">
            <div className="p-4 border-b border-[var(--color-border)]">
              <h2 className="font-semibold text-[var(--color-text-primary)] flex items-center gap-2">
                <Clock className="w-5 h-5 text-[var(--league-primary)]" />
                Your Requests
              </h2>
            </div>
            <div className="divide-y divide-[var(--color-border)]">
              {requests.map((request) => (
                <div key={request.id} className="p-4 flex items-center gap-4">
                  <Image
                    src={request.team?.logo_url || '/blank_team.png'}
                    alt={request.team?.name || 'Team'}
                    width={48}
                    height={48}
                    className="rounded-lg object-cover"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-[var(--color-text-primary)]">
                      {request.team?.name || 'Unknown Team'}
                    </p>
                    <p className="text-xs text-[var(--color-text-muted)]">
                      Requested {new Date(request.requested_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    {getStatusBadge(request.status)}
                    {request.status === 'pending' && (
                      <button
                        onClick={() => handleCancel(request.id)}
                        disabled={isPending}
                        className="p-2 text-[var(--color-text-muted)] hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                        title="Cancel request"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Join Request Form */}
        <div className="glass-card rounded-xl overflow-hidden">
          <div className="p-4 border-b border-[var(--color-border)]">
            <h2 className="font-semibold text-[var(--color-text-primary)] flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-[var(--league-primary)]" />
              Request to Join a Team
            </h2>
          </div>

          {isLoading ? (
            <div className="p-8 flex justify-center">
              <Loader2 className="w-6 h-6 animate-spin text-[var(--league-primary)]" />
            </div>
          ) : availableTeams.length === 0 ? (
            <div className="p-8 text-center">
              <Users className="w-12 h-12 mx-auto text-[var(--color-text-muted)] mb-3" />
              <p className="text-[var(--color-text-secondary)]">
                {teams.length === 0
                  ? 'No teams available in this league yet.'
                  : 'You have pending requests to all available teams.'}
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="p-4 space-y-4">
              {submitSuccess && (
                <div className="p-3 bg-green-500/10 border border-green-500/20 rounded-lg text-green-400 text-sm flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4" />
                  Request submitted successfully!
                </div>
              )}

              {submitError && (
                <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm flex items-center gap-2">
                  <AlertCircle className="w-4 h-4" />
                  {submitError}
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-2">
                  Select Team
                </label>
                <select
                  value={selectedTeam}
                  onChange={(e) => setSelectedTeam(e.target.value)}
                  className="w-full px-4 py-3 bg-[var(--color-surface-hover)] border border-[var(--color-border)] rounded-lg text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--league-primary)] focus:border-transparent"
                  required
                >
                  <option value="">Choose a team...</option>
                  {availableTeams.map((team) => (
                    <option key={team.id} value={team.id}>
                      {team.name}
                      {team.division_name ? ` (${team.division_name})` : ''}
                      {` - ${team.roster_count} players`}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-2">
                  Message (optional)
                </label>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Introduce yourself, mention your experience, position preference..."
                  rows={3}
                  className="w-full px-4 py-3 bg-[var(--color-surface-hover)] border border-[var(--color-border)] rounded-lg text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--league-primary)] focus:border-transparent resize-none"
                />
              </div>

              <button
                type="submit"
                disabled={!selectedTeam || isPending}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-[var(--league-primary)] text-[var(--color-accent-text)] rounded-lg font-medium hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isPending ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Send className="w-5 h-5" />
                )}
                Submit Request
              </button>
            </form>
          )}
        </div>

        {/* Info Card */}
        <div className="bg-blue-500/5 border border-blue-500/20 rounded-xl p-4">
          <div className="flex gap-3">
            <AlertCircle className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-[var(--color-text-secondary)]">
              <p className="font-medium text-blue-400 mb-1">How it works</p>
              <ul className="space-y-1 text-[var(--color-text-muted)]">
                <li>1. Select a team and submit your request</li>
                <li>2. The team captain will review your request</li>
                <li>3. You&apos;ll be notified when they respond</li>
                <li>4. Once accepted, you&apos;ll have full access to your team dashboard</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
