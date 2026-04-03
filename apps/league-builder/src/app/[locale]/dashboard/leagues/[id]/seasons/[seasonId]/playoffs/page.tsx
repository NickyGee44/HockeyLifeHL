import Link from 'next/link';
import { notFound } from 'next/navigation';
import { setRequestLocale } from 'next-intl/server';
import { ArrowLeft, Trophy } from 'lucide-react';
import { cn } from '@hockey-life/ui';
import { PlayoffBracketClient } from '@/components/playoffs';
import { requireLeagueDashboardAccess } from '@/lib/auth/league-dashboard-access';
import { getPlayoffBracket } from '@/lib/actions/playoff-bracket';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { buildSeasonWorkspaceHref } from '@/lib/dashboard/workspace-routes';
import { getSeasonStatusLabel } from '@/lib/seasons/status-display';

type Props = {
  params: Promise<{ locale: string; id: string; seasonId: string }>;
};

export default async function SeasonPlayoffsPage({ params }: Props) {
  const { locale, id: leagueId, seasonId } = await params;
  setRequestLocale(locale);

  const { supabase, access, userData } = await requireLeagueDashboardAccess({ leagueId, locale });
  const serviceClient = createServiceRoleClient();

  const { data: season } = await supabase
    .from('seasons')
    .select(
      `
      id,
      name,
      status,
      registration_type,
      league:leagues(
        id,
        name,
        primary_color
      )
    `
    )
    .eq('league_id', leagueId)
    .eq('id', seasonId)
    .maybeSingle();

  if (!season) {
    notFound();
  }

  const [{ data: membership }, venuesResult, bracketResult] = await Promise.all([
    supabase
      .from('league_memberships')
      .select('role')
      .eq('league_id', leagueId)
      .eq('user_id', userData.user.id)
      .maybeSingle(),
    serviceClient
      .from('venues')
      .select('id, name, address, number_of_rinks')
      .eq('league_id', leagueId)
      .order('name'),
    getPlayoffBracket(leagueId, seasonId),
  ]);

  const canEdit =
    access.accessType === 'platform_admin' ||
    access.accessType === 'org_owner' ||
    access.accessType === 'league_admin' ||
    membership?.role === 'owner' ||
    membership?.role === 'admin';

  const venues = (venuesResult.data ?? []).map((venue) => ({
    id: venue.id,
    name: venue.name,
    address: venue.address ?? null,
    numberOfRinks: venue.number_of_rinks ?? null,
  }));
  const initialBracket = bracketResult.success ? bracketResult.data : null;

  const statusColors: Record<string, string> = {
    active: 'border-emerald-400/20 bg-emerald-500/10 text-emerald-300',
    draft: 'border-amber-400/20 bg-amber-500/10 text-amber-200',
    completed: 'border-white/[0.10] bg-white/[0.05] text-neutral-300',
    playoffs: 'border-violet-400/20 bg-violet-500/10 text-violet-300',
  };

  return (
    <div className="min-h-screen bg-neutral-950">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-6">
          <Link
            href={buildSeasonWorkspaceHref(locale, leagueId, seasonId)}
            className="inline-flex items-center gap-2 text-sm text-neutral-400 transition-colors hover:text-rink-300"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to {season.name}
          </Link>
        </div>

        <section className="relative overflow-hidden rounded-[30px] border border-white/[0.08] bg-[radial-gradient(circle_at_top_left,rgba(168,85,247,0.18),transparent_32%),linear-gradient(145deg,rgba(255,255,255,0.05),rgba(255,255,255,0.02))] p-6 shadow-[0_24px_80px_rgba(0,0,0,0.48)] sm:p-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="flex items-start gap-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-violet-500/15 shadow-[0_0_24px_rgba(168,85,247,0.16)]">
                <Trophy className="h-8 w-8 text-violet-300" />
              </div>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-violet-300/80">
                  Season Workspace / More Tools
                </p>
                <h1 className="mt-3 text-3xl font-black tracking-tight text-white">
                  {season.name} playoffs
                </h1>
                <p className="mt-2 max-w-2xl text-sm leading-7 text-neutral-300">
                  Brackets, winners, and playoff scheduling now live in their own season tool so the
                  season home can stay focused on launch progress.
                </p>
              </div>
            </div>

            <span
              className={cn(
                'rounded-full border px-3 py-1.5 text-sm font-semibold',
                statusColors[season.status ?? 'draft'] || statusColors.draft
              )}
            >
              {getSeasonStatusLabel(season.status ?? 'draft', season.registration_type)}
            </span>
          </div>
        </section>

        <div className="mt-6">
          <PlayoffBracketClient
            leagueId={leagueId}
            seasonId={seasonId}
            initialBracket={initialBracket}
            venues={venues}
            canEdit={canEdit}
          />
        </div>
      </div>
    </div>
  );
}
