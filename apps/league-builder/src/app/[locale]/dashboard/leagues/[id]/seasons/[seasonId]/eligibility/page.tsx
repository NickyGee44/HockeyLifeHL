/**
 * Season-scoped Eligibility page
 */
import { redirect } from 'next/navigation';

type Props = {
  params: Promise<{ locale: string; id: string; seasonId: string }>;
};

export default async function SeasonEligibilityPage({ params }: Props) {
  const { locale, seasonId } = await params;
  redirect(`/${locale}/dashboard/seasons/${seasonId}/eligibility`);
}
