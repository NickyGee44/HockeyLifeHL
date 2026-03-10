import Link from 'next/link';
import { redirect } from 'next/navigation';
import { setRequestLocale } from 'next-intl/server';
import { ArrowLeft, CalendarClock } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { getMyStaffAvailabilityOverview } from '@/lib/actions/staffing-availability';
import { StaffAvailabilityClient } from '@/components/staffing/StaffAvailabilityClient';

type Props = {
  params: Promise<{ locale: string }>;
};

export const metadata = {
  title: 'Staff Availability',
  description: 'Set weekly referee and scorekeeper availability.',
};

export default async function StaffAvailabilityPage({ params }: Props) {
  const awaited = await params;
  const { locale } = awaited;
  setRequestLocale(locale);

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/${locale}/login?redirectTo=${encodeURIComponent(`/${locale}/dashboard/staffing/availability`)}`);
  }

  const overview = await getMyStaffAvailabilityOverview();

  return (
    <div className="min-h-screen bg-neutral-950">
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8">
          <Link
            href={`/${locale}/dashboard`}
            className="mb-4 inline-flex items-center gap-2 text-sm text-neutral-400 transition-colors hover:text-rink-500"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Dashboard
          </Link>

          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-rink-500/20">
              <CalendarClock className="h-6 w-6 text-rink-500" />
            </div>
            <div>
              <h1 className="text-2xl font-black tracking-tight text-white">Staff Availability</h1>
              <p className="text-neutral-400">
                Set your weekly working windows so leagues can assign games automatically.
              </p>
            </div>
          </div>
        </div>

        <StaffAvailabilityClient roles={overview.success ? overview.data || [] : []} />
      </div>
    </div>
  );
}

