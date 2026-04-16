import type { ReactNode } from 'react';
import Link from 'next/link';
import { AlertCircle, ArrowLeft, Shield } from 'lucide-react';
import { CaptainGameDayPage } from '@/components/captain/CaptainGameDayPage';
import { createAuthClient, createServiceRoleClient } from '@/lib/supabase/server';

function RouteMessage({
  leagueSlug,
  title,
  body,
  icon,
}: {
  leagueSlug: string;
  title: string;
  body: string;
  icon: ReactNode;
}) {
  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <div className="rounded-[28px] border border-amber-400/20 bg-amber-400/10 p-6 text-center">
        {icon}
        <h1 className="mt-4 text-2xl font-black text-white">{title}</h1>
        <p className="mt-3 text-sm leading-6 text-amber-100/85">{body}</p>
        <Link
          href={`/${leagueSlug}/captain`}
          className="mt-6 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.06] px-4 py-2 text-sm font-semibold text-white"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to captain dashboard
        </Link>
      </div>
    </div>
  );
}

export default async function CaptainLineupPage({
  params,
}: {
  params: Promise<{ leagueSlug: string; gameId: string }>;
}) {
  const { leagueSlug, gameId } = await params;
  const auth = await createAuthClient();
  const {
    data: { user },
  } = await auth.auth.getUser();

  if (!user) {
    return (
      <RouteMessage
        leagueSlug={leagueSlug}
        title="Captain access required"
        body="Sign in to manage Game Day."
        icon={<Shield className="mx-auto h-10 w-10 text-amber-300" />}
      />
    );
  }

  const supabase = createServiceRoleClient();
  const { data: game, error: gameError } = await (supabase.from('games') as any)
    .select(`
      id,
      league_id,
      home_team_id,
      away_team_id,
      league:leagues!inner(slug)
    `)
    .eq('id', gameId)
    .maybeSingle();

  const gameLeague = Array.isArray(game?.league) ? game?.league[0] : game?.league;

  if (gameError || !game || gameLeague?.slug !== leagueSlug) {
    return (
      <RouteMessage
        leagueSlug={leagueSlug}
        title="Could not load Game Day"
        body={gameError?.message || 'Game not found.'}
        icon={<AlertCircle className="mx-auto h-10 w-10 text-amber-300" />}
      />
    );
  }

  const { data: memberships, error: membershipError } = await (supabase.from('team_rosters') as any)
    .select('team_id, leadership_role')
    .eq('player_id', user.id)
    .eq('status', 'active')
    .is('end_date', null)
    .in('team_id', [game.home_team_id, game.away_team_id])
    .in('leadership_role', ['captain', 'alternate_captain'])
    .limit(2);

  if (membershipError) {
    return (
      <RouteMessage
        leagueSlug={leagueSlug}
        title="Could not load Game Day"
        body={membershipError.message}
        icon={<AlertCircle className="mx-auto h-10 w-10 text-amber-300" />}
      />
    );
  }

  const matchedTeamId = memberships?.[0]?.team_id ?? null;

  if (!matchedTeamId) {
    return (
      <RouteMessage
        leagueSlug={leagueSlug}
        title="Captain access required"
        body="You need to be a captain or alternate on one of the teams in this game."
        icon={<Shield className="mx-auto h-10 w-10 text-amber-300" />}
      />
    );
  }

  return (
    <CaptainGameDayPage
      leagueSlug={leagueSlug}
      requestedGameId={gameId}
      teamId={matchedTeamId}
      canManage
    />
  );
}
