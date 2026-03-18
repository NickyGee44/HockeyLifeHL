/**
 * League domains page — redirects to org-level domain settings with league context
 */
import { redirect } from 'next/navigation';

type Props = {
  params: Promise<{ locale: string; id: string }>;
};

export default async function LeagueDomainsPage({ params }: Props) {
  const { locale, id: leagueId } = await params;
  redirect(`/${locale}/dashboard/settings/domains?league=${leagueId}`);
}
