'use client';

import Link from 'next/link';
import Image from 'next/image';
import { cn } from '@hockey-life/ui';
import { Users, Settings, MoreVertical, Crown, Shield } from 'lucide-react';

interface TeamCardProps {
  team: {
    id: string;
    name: string;
    short_name: string;
    logo_url: string | null;
    primary_color: string | null;
    secondary_color: string | null;
    status: string | null;
    roster_count: number;
    max_roster_size: number | null;
    captain_name: string | null;
    division_name: string | null;
    league_name?: string | null;
  };
  leagueId?: string;
  showLeague?: boolean;
  onSettingsClick?: () => void;
}

export function TeamCard({ team, leagueId, showLeague = false, onSettingsClick }: TeamCardProps) {
  const maxRoster = team.max_roster_size ?? 23;
  const primaryColor = team.primary_color || '#22D3EE';
  const secondaryColor = team.secondary_color || '#0a0a0a';
  const rosterPercent = (team.roster_count / maxRoster) * 100;

  return (
    <div className="bg-white/[0.04] border border-white/10 backdrop-blur-xl rounded-2xl overflow-hidden hover:border-white/20 transition-all group">
      {/* Team Color Bar */}
      <div
        className="h-2"
        style={{
          background: `linear-gradient(to right, ${primaryColor}, ${secondaryColor})` }}
      />

      <div className="p-5">
        {/* Header Row */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            {/* Team Logo/Avatar */}
            {team.logo_url ? (
              <Image
                src={team.logo_url}
                alt={team.name}
                className="w-12 h-12 rounded-xl object-cover"
                width={48}
                height={48}
              />
            ) : (
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold text-lg"
                style={{ backgroundColor: primaryColor }}
              >
                {team.short_name.slice(0, 2).toUpperCase()}
              </div>
            )}
            <div>
              <h3 className="font-bold text-white group-hover:text-rink-500 transition-colors">
                {team.name}
              </h3>
              <div className="flex items-center gap-2">
                <span className="text-xs text-neutral-500">{team.short_name}</span>
                {team.division_name && (
                  <>
                    <span className="text-neutral-600">•</span>
                    <span className="text-xs text-neutral-500">{team.division_name}</span>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Status Badge */}
            <span
              className={cn(
                'px-2 py-1 text-xs font-semibold rounded-full',
                team.status === 'active'
                  ? 'bg-green-500/10 text-green-500 border border-green-500/30'
                  : team.status === 'pending'
                  ? 'bg-yellow-500/10 text-yellow-500 border border-yellow-500/30'
                  : 'bg-neutral-800 text-neutral-400 border border-neutral-700'
              )}
            >
              {team.status ? team.status.charAt(0).toUpperCase() + team.status.slice(1) : 'Unknown'}
            </span>

            {/* Settings Button */}
            {onSettingsClick && (
              <button
                onClick={(e) => {
                  e.preventDefault();
                  onSettingsClick();
                }}
                className="p-1.5 rounded-lg bg-neutral-800 text-neutral-400 hover:bg-neutral-700 hover:text-white transition-colors"
              >
                <MoreVertical className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Show League Name if applicable */}
        {showLeague && team.league_name && (
          <div className="mb-4 text-sm text-neutral-400">
            <Shield className="w-3.5 h-3.5 inline mr-1.5" />
            {team.league_name}
          </div>
        )}

        {/* Stats */}
        <div className="mb-4">
          {/* Roster Progress */}
          <div className="flex items-center justify-between text-sm mb-2">
            <div className="flex items-center gap-2 text-neutral-400">
              <Users className="w-4 h-4" />
              <span>Roster</span>
            </div>
            <span className="text-white font-medium">
              {team.roster_count}/{maxRoster}
            </span>
          </div>
          <div className="h-1.5 bg-neutral-800 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all"
              style={{
                width: `${Math.min(rosterPercent, 100)}%`,
                backgroundColor: rosterPercent >= 90 ? '#ef4444' : primaryColor }}
            />
          </div>
        </div>

        {/* Captain */}
        {team.captain_name && (
          <div className="flex items-center gap-2 mb-4 text-sm">
            <div className="flex items-center gap-1.5 text-rink-500">
              <Crown className="w-4 h-4" />
              <span className="font-medium">Captain:</span>
            </div>
            <span className="text-white">{team.captain_name}</span>
          </div>
        )}

        {/* Color Swatches */}
        <div className="flex items-center gap-2 mb-4">
          <span className="text-xs text-neutral-500">Colors:</span>
          <div
            className="w-5 h-5 rounded-full border border-neutral-700"
            style={{ backgroundColor: primaryColor }}
            title="Primary"
          />
          <div
            className="w-5 h-5 rounded-full border border-neutral-700"
            style={{ backgroundColor: secondaryColor }}
            title="Secondary"
          />
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 pt-4 border-t border-white/[0.06]">
          <Link
            href={leagueId ? `/dashboard/leagues/${leagueId}/teams/${team.id}` : `/dashboard/teams/${team.id}`}
            className={cn(
              'flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl',
              'bg-rink-500/10 text-rink-500 border border-rink-500/30',
              'hover:bg-rink-500/20 transition-colors font-medium text-sm'
            )}
          >
            Manage Team
          </Link>
          <Link
            href={leagueId ? `/dashboard/leagues/${leagueId}/teams/${team.id}/settings` : `/dashboard/teams/${team.id}/settings`}
            className={cn(
              'inline-flex items-center justify-center p-2.5 rounded-xl',
              'bg-neutral-800 text-neutral-400',
              'hover:bg-neutral-700 hover:text-white transition-colors'
            )}
            title="Team Settings"
          >
            <Settings className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </div>
  );
}

export default TeamCard;
