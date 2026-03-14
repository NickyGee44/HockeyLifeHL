/**
 * League Website Editor — now under the league hierarchy.
 *
 * Redirects to the existing /website-editor page with the league query param.
 * This keeps the editor working while we eventually inline it here.
 */
import { redirect } from 'next/navigation';

type Props = {
  params: Promise<{ locale: string; id: string }>;
};

export default async function LeagueWebsitePage({ params }: Props) {
  const { locale, id: leagueId } = await params;
  redirect(`/${locale}/website-editor?league=${leagueId}`);
}
