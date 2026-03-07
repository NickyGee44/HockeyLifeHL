'use client';

import Link from 'next/link';
import { use } from 'react';
import { AlertCircle, ArrowLeft, Loader2, Shield } from 'lucide-react';
import { useLeague } from '@/hooks/useLeague';
import { usePlayerProfile } from '@/hooks/usePlayerProfile';
import { CaptainLineupEditor } from '@/components/lineups/CaptainLineupEditor';

export default function CaptainLineupPage({
  params,
}: {
  params: Promise<{ leagueSlug: string; gameId: string }>;
}) {
  const { leagueSlug, gameId } = use(params);
  const { league } = useLeague();
  const { currentTeam, isLoading } = usePlayerProfile(league?.id);

  const canManage = !!(currentTeam?.is_captain || currentTeam?.is_alternate);

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="space-y-4 text-center">
          <Loader2 className="mx-auto h-8 w-8 animate-spin text-[var(--league-primary)]" />
          <p className="text-[var(--color-text-secondary)]">Loading lineup studio...</p>
        </div>
      </div>
    );
  }

  if (!currentTeam?.team) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-10">
        <div className="rounded-[28px] border border-amber-400/20 bg-amber-400/10 p-6 text-center">
          <AlertCircle className="mx-auto h-10 w-10 text-amber-300" />
          <h1 className="mt-4 text-2xl font-black text-white">No team found</h1>
          <p className="mt-3 text-sm leading-6 text-amber-100/85">You need an active team before you can build a game-day lineup.</p>
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

  if (!canManage) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-10">
        <div className="rounded-[28px] border border-amber-400/20 bg-amber-400/10 p-6 text-center">
          <Shield className="mx-auto h-10 w-10 text-amber-300" />
          <h1 className="mt-4 text-2xl font-black text-white">Captain access required</h1>
          <p className="mt-3 text-sm leading-6 text-amber-100/85">Only captains and alternate captains can manage game-day lineups.</p>
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

  return (
    <CaptainLineupEditor
      leagueSlug={leagueSlug}
      gameId={gameId}
      teamId={currentTeam.team_id}
      canManage={canManage}
    />
  );
}
