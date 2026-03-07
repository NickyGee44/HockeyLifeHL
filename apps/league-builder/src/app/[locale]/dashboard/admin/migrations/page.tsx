import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/actions/auth';
import { getPlatformMigrationQueue } from '@/lib/actions/platform-migration-admin';
import { MigrationQueueClient } from '@/components/admin/MigrationQueueClient';
import { getPlatformOwnerView } from '@/lib/auth/platform-owner-view';
import { Database, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

type Props = {
  params: Promise<{ locale: string }>;
};

export default async function PlatformMigrationQueuePage({ params }: Props) {
  const { locale } = await params;
  const userData = await getCurrentUser();

  if (!userData?.profile?.is_platform_admin) {
    redirect(`/${locale}/dashboard`);
  }

  const [queueResult, ownerView] = await Promise.all([
    getPlatformMigrationQueue(),
    getPlatformOwnerView(),
  ]);

  if (!queueResult.success) {
    throw new Error(queueResult.error);
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
                <Database className="h-3.5 w-3.5" />
                Internal Admin
              </div>
              <h1 className="mt-4 text-3xl font-black tracking-tight text-white sm:text-[2.7rem]">
                Migration Queue
              </h1>
              <p className="mt-3 max-w-3xl text-sm leading-7 text-neutral-300">
                Review every historical migration request across the platform, move it through ops status, attach pricing, and keep the owner-facing migration center synchronized.
              </p>
            </div>
          </div>
        </div>
      </div>

      <MigrationQueueClient
        requests={queueResult.data.requests}
        activeOwnerViewLeagueId={ownerView?.leagueId ?? null}
      />
    </div>
  );
}
