import { createClient } from '@/lib/supabase/server';
import { hasPlatformSubscription } from '@/lib/utils/addon-helpers';
import { SubscriptionGate } from '@/components/dashboard/SubscriptionGate';

type Props = {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
};

export default async function LeagueLayout({ children, params }: Props) {
  const { id: leagueId } = await params;

  // Look up the league's organization
  const supabase = await createClient();
  const { data: league } = await supabase
    .from('leagues')
    .select('organization_id')
    .eq('id', leagueId)
    .single();

  const orgId = league?.organization_id;
  const isSubscribed = orgId ? await hasPlatformSubscription(orgId) : false;

  return (
    <SubscriptionGate isSubscribed={isSubscribed}>
      {children}
    </SubscriptionGate>
  );
}
