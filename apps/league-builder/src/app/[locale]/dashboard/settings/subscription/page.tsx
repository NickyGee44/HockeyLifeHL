/**
 * Org Subscription Settings — Redirect
 *
 * Redirects to the league settings page (organization tab).
 */

import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getCurrentUser } from '@/lib/actions/auth';

export const dynamic = 'force-dynamic';

type Props = {
  params: Promise<{ locale: string }>;
};

export default async function SubscriptionPage({ params }: Props) {
  const { locale } = await params;

  const userData = await getCurrentUser();
  if (!userData) {
    redirect(`/${locale}/login`);
  }

  const supabase = await createClient();
  const { data: membership } = await supabase
    .from('league_memberships')
    .select('league_id')
    .eq('user_id', userData.user.id)
    .limit(1)
    .single();

  if (membership?.league_id) {
    redirect(`/${locale}/dashboard/leagues/${membership.league_id}/settings?tab=organization`);
  }

  redirect(`/${locale}/dashboard`);
}
