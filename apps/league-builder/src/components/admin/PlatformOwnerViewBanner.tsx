import Link from 'next/link';
import { Eye, LifeBuoy, ShieldAlert } from 'lucide-react';
import { stopPlatformOwnerView } from '@/lib/actions/platform-owner-view';
import type { PlatformOwnerView } from '@/lib/auth/platform-owner-view';

export default function PlatformOwnerViewBanner({
  locale,
  ownerView,
}: {
  locale: string;
  ownerView: PlatformOwnerView | null;
}) {
  if (!ownerView) {
    return null;
  }

  return (
    <div className="px-4 sm:px-6 lg:px-8 pt-4">
      <div className="rounded-2xl border border-cyan-400/20 bg-[radial-gradient(circle_at_top_left,_rgba(34,211,238,0.16),_transparent_32%),linear-gradient(155deg,rgba(255,255,255,0.06),rgba(255,255,255,0.02))] p-4 backdrop-blur-xl">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0">
            <div className="inline-flex items-center gap-2 rounded-full border border-cyan-300/20 bg-cyan-400/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-cyan-100">
              <Eye className="h-3.5 w-3.5" />
              Owner View
            </div>
            <p className="mt-3 text-sm font-semibold text-white">
              You are viewing the league-owner workspace for {ownerView.leagueName}.
            </p>
            <p className="mt-1 text-sm text-neutral-300">
              Use this mode to debug onboarding and setup flows. Payment and billing screens remain excluded from platform-admin access.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Link
              href={`/${locale}/dashboard/leagues/${ownerView.leagueId}`}
              className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-sm font-semibold text-white hover:border-white/20 hover:bg-white/[0.08]"
            >
              <LifeBuoy className="h-4 w-4" />
              Open league workspace
            </Link>
            <Link
              href={`/${locale}/dashboard/admin`}
              className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-sm font-semibold text-white hover:border-white/20 hover:bg-white/[0.08]"
            >
              <ShieldAlert className="h-4 w-4" />
              Platform dashboard
            </Link>
            <form action={stopPlatformOwnerView}>
              <input type="hidden" name="locale" value={locale} />
              <button
                type="submit"
                className="inline-flex items-center gap-2 rounded-full bg-cyan-300 px-4 py-2 text-sm font-semibold text-black hover:bg-cyan-200"
              >
                Exit owner view
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
