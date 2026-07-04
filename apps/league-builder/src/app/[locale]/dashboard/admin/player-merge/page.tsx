import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/actions/auth';
import { getUnlinkedLegacyProfiles, getMergeHistory } from '@/lib/actions/admin-legacy-merge';
import { PlayerMergeClient } from '@/components/admin/PlayerMergeClient';
import { ArrowLeft, GitMerge } from 'lucide-react';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

type Props = {
  params: Promise<{ locale: string }>;
};

export default async function PlayerMergePage({ params }: Props) {
  const { locale } = await params;
  const userData = await getCurrentUser();

  if (!userData?.profile?.is_platform_admin) {
    redirect(`/${locale}/dashboard`);
  }

  const [legacyResult, historyResult] = await Promise.all([
    getUnlinkedLegacyProfiles(),
    getMergeHistory(),
  ]);

  if (!legacyResult.success) {
    throw new Error(legacyResult.error);
  }

  if (!historyResult.success) {
    throw new Error(historyResult.error);
  }

  return (
    <div className="mx-auto max-w-[1500px] space-y-8 px-4 py-8 sm:px-6 lg:px-8">
      <div className="space-y-4">
        <Link
          href={`/${locale}/dashboard/admin`}
          className="inline-flex items-center gap-2 text-sm text-neutral-400 hover:text-cyan-200"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to platform overview
        </Link>

        <div className="rounded-[30px] border border-white/10 bg-[radial-gradient(circle_at_top_left,_rgba(34,211,238,0.18),_transparent_28%),linear-gradient(155deg,rgba(255,255,255,0.08),rgba(255,255,255,0.02))] p-6 backdrop-blur-xl sm:p-8">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-cyan-300/20 bg-cyan-400/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-cyan-100">
                <GitMerge className="h-3.5 w-3.5" />
                Internal Admin
              </div>
              <h1 className="mt-4 text-3xl font-black tracking-tight text-white sm:text-[2.7rem]">
                Player Merge
              </h1>
              <p className="mt-3 max-w-3xl text-sm leading-7 text-neutral-300">
                Link legacy imported profiles to real player accounts. When auto-matching fails due to
                name variations or email mismatches, use this tool to manually merge historical data
                (stats, rosters, game events, waivers) into the correct account.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-black/20 px-4 py-2 text-center">
                <p className="text-2xl font-black text-orange-400">{legacyResult.data.length}</p>
                <p className="text-[10px] uppercase tracking-[0.18em] text-neutral-500">Unlinked</p>
              </div>
              <div className="rounded-xl bg-black/20 px-4 py-2 text-center">
                <p className="text-2xl font-black text-emerald-400">{historyResult.data.length}</p>
                <p className="text-[10px] uppercase tracking-[0.18em] text-neutral-500">Merged</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <PlayerMergeClient
        legacyProfiles={legacyResult.data}
        mergeHistory={historyResult.data}
      />
    </div>
  );
}
