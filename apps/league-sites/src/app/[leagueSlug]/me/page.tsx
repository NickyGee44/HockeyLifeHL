'use client';

import { useParams } from 'next/navigation';
import { usePlayerProfile } from '@/hooks/usePlayerProfile';
import { MyTeamCard } from '@/components/dashboard/MyTeamCard';
import { MyUpcomingGames } from '@/components/dashboard/MyUpcomingGames';
import { MyRecentResults } from '@/components/dashboard/MyRecentResults';
import { MyStats } from '@/components/dashboard/MyStats';
import { QuickActions } from '@/components/dashboard/QuickActions';
import { ErrorCard } from '@/components/ui/ErrorCard';
import { Loader2, User, RefreshCw } from 'lucide-react';
import { useState } from 'react';

/**
 * Player Dashboard - personalized landing page for authenticated players
 * Shows their team, upcoming games, recent results, and stats
 */
export default function PlayerDashboard() {
  const params = useParams();
  const leagueSlug = params.leagueSlug as string;
  const [isRetrying, setIsRetrying] = useState(false);

  // We need the league ID to filter team membership, but for now we'll use slug
  const { profile, currentTeam, isLoading, error, refetch } = usePlayerProfile();

  const handleRetry = async () => {
    setIsRetrying(true);
    try {
      await refetch();
    } finally {
      setIsRetrying(false);
    }
  };

  if (isLoading) {
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
              {currentTeam ? `${currentTeam.team.name} #${currentTeam.jersey_number ?? '-'}` : 'Free Agent'}
            </p>
          </div>
        </div>
      </div>

      {/* Main Dashboard Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Team Card + Quick Actions */}
        <div className="space-y-6">
          <MyTeamCard team={currentTeam} leagueSlug={leagueSlug} />
          <QuickActions leagueSlug={leagueSlug} />
        </div>

        {/* Middle Column - Upcoming Games */}
        <div>
          <MyUpcomingGames
            teamId={currentTeam?.team_id}
            leagueSlug={leagueSlug}
          />
        </div>

        {/* Right Column - Recent Results + Stats */}
        <div className="space-y-6">
          <MyRecentResults
            teamId={currentTeam?.team_id}
            leagueSlug={leagueSlug}
          />
          <MyStats
            playerId={currentTeam?.id}
            leagueSlug={leagueSlug}
          />
        </div>
      </div>
    </div>
  );
}
