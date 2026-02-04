import { getCurrentUser } from '@/lib/actions/auth';
import { getTeam } from '@/lib/actions/teams';
import { redirect, notFound } from '@/i18n/navigation';
import { Link } from '@/i18n/navigation';
import { cn } from '@hockey-life/ui';
import {
  ArrowLeft,
  Settings,
  Users,
  Calendar,
  BarChart3,
  Crown,
  MapPin,
  Phone,
  Mail,
  Edit,
} from 'lucide-react';
import TeamDetailClient from './team-detail-client';
import { setRequestLocale } from 'next-intl/server';

type Props = {
  params: Promise<{ locale: string; teamId: string }>;
  searchParams: Promise<{ tab?: string }>;
};

export async function generateMetadata({ params }: { params: Promise<{ locale: string; teamId: string }> }) {
  const { teamId } = await params;
  const result = await getTeam(teamId);
  if (!result.data) {
    return { title: 'Team Not Found' };
  }
  return {
    title: `${result.data.name} | Beer League Hockey`,
    description: `Manage ${result.data.name} team`,
  };
}

export default async function TeamDetailPage({ params, searchParams }: Props) {
  const { locale, teamId } = await params;
  setRequestLocale(locale);

  const userData = await getCurrentUser();

  if (!userData) {
    redirect('/login');
  }

  const result = await getTeam(teamId);

  if (result.error || !result.data) {
    notFound();
  }

  const team = result.data;
  const resolvedSearchParams = await searchParams;
  const currentTab = resolvedSearchParams.tab || 'roster';

  return (
    <div className="min-h-screen bg-neutral-950">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <Link
            href="/dashboard/teams"
            className="inline-flex items-center gap-2 text-sm text-neutral-400 hover:text-rink-500 transition-colors mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Teams
          </Link>

          {/* Team Header Card */}
          <div className="bg-white/[0.04] border border-white/10 backdrop-blur-xl rounded-2xl overflow-hidden">
            {/* Color Bar */}
            <div
              className="h-2"
              style={{
                background: `linear-gradient(to right, ${team.primary_color || '#22D3EE'}, ${team.secondary_color || '#000000'})`,
              }}
            />

            <div className="p-6">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
                {/* Team Info */}
                <div className="flex items-center gap-4">
                  {team.logo_url ? (
                    <img
                      src={team.logo_url}
                      alt={team.name}
                      className="w-20 h-20 rounded-2xl object-cover"
                    />
                  ) : (
                    <div
                      className="w-20 h-20 rounded-2xl flex items-center justify-center text-2xl font-bold text-white"
                      style={{ backgroundColor: team.primary_color || '#22D3EE' }}
                    >
                      {team.short_name.slice(0, 2).toUpperCase()}
                    </div>
                  )}

                  <div>
                    <h1 className="text-2xl font-black text-white">{team.name}</h1>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-sm text-neutral-500">{team.short_name}</span>
                      {team.division_name && (
                        <>
                          <span className="text-neutral-600">•</span>
                          <span className="text-sm text-neutral-400">
                            {team.division_name}
                          </span>
                        </>
                      )}
                      <span
                        className={cn(
                          'px-2 py-0.5 text-xs font-semibold rounded-full',
                          (team.status ?? '') === 'active'
                            ? 'bg-green-500/10 text-green-500'
                            : (team.status ?? '') === 'pending'
                            ? 'bg-yellow-500/10 text-yellow-500'
                            : 'bg-neutral-800 text-neutral-400'
                        )}
                      >
                        {team.status ? team.status.charAt(0).toUpperCase() + team.status.slice(1) : 'Unknown'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Team Stats */}
                <div className="flex items-center gap-6">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-white">{team.roster_count}</div>
                    <div className="text-xs text-neutral-500">Players</div>
                  </div>
                  <div className="w-px h-10 bg-neutral-800" />
                  <div className="text-center">
                    <div className="text-2xl font-bold text-white">{team.max_roster_size}</div>
                    <div className="text-xs text-neutral-500">Max Roster</div>
                  </div>
                  <div className="w-px h-10 bg-neutral-800" />
                  <Link
                    href={`/dashboard/teams/${team.id}/settings`}
                    className={cn(
                      'inline-flex items-center gap-2 px-4 py-2.5 rounded-xl',
                      'bg-neutral-800 text-white hover:bg-neutral-700 transition-colors'
                    )}
                  >
                    <Settings className="w-4 h-4" />
                    Settings
                  </Link>
                </div>
              </div>

              {/* Team Details */}
              <div className="mt-6 pt-6 border-t border-white/[0.06] grid grid-cols-2 md:grid-cols-4 gap-4">
                {team.captain_name && (
                  <div className="flex items-center gap-2 text-sm">
                    <Crown className="w-4 h-4 text-rink-500" />
                    <span className="text-neutral-500">Captain:</span>
                    <span className="text-white">{team.captain_name}</span>
                  </div>
                )}
                {team.venue_name && (
                  <div className="flex items-center gap-2 text-sm">
                    <MapPin className="w-4 h-4 text-neutral-500" />
                    <span className="text-neutral-500">Home:</span>
                    <span className="text-white">{team.venue_name}</span>
                  </div>
                )}
                {team.contact_email && (
                  <div className="flex items-center gap-2 text-sm">
                    <Mail className="w-4 h-4 text-neutral-500" />
                    <span className="text-white truncate">{team.contact_email}</span>
                  </div>
                )}
                {team.contact_phone && (
                  <div className="flex items-center gap-2 text-sm">
                    <Phone className="w-4 h-4 text-neutral-500" />
                    <span className="text-white">{team.contact_phone}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Content with Tabs - Client Component */}
        <TeamDetailClient team={team} initialTab={currentTab} />
      </div>
    </div>
  );
}
