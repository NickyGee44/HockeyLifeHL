import { Metadata } from 'next';
import { Newspaper } from 'lucide-react';
import { notFound } from 'next/navigation';
import { SubscriptionWall } from '@/components/shared';
import { getLeagueBySlug, getAllArticles } from '@/lib/data';
import { NewsFeedClient } from '@/components/news/NewsFeedClient';

interface NewsPageProps {
  params: Promise<{ leagueSlug: string }>;
}

export async function generateMetadata({ params }: NewsPageProps): Promise<Metadata> {
  const { leagueSlug } = await params;
  const league = await getLeagueBySlug(leagueSlug);

  return {
    title: league ? `News - ${league.name}` : 'News',
    description: league
      ? `Latest news and announcements from ${league.name}`
      : 'League news and announcements',
  };
}

export default async function NewsPage({ params }: NewsPageProps) {
  const { leagueSlug } = await params;

  const league = await getLeagueBySlug(leagueSlug);
  if (!league) notFound();

  const articles = await getAllArticles(league.id);

  return (
    <SubscriptionWall>
    <div className="container mx-auto px-4 py-8">
      <div className="mx-auto max-w-6xl">
        <div className="mb-6 flex items-center gap-3 text-[var(--color-text-primary)]">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)]/85 text-[var(--league-primary)]">
            <Newspaper className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <h1 className="text-2xl font-extrabold tracking-tight md:text-3xl">
              {league.name} News
            </h1>
          </div>
        </div>

        {/* Articles */}
        {articles.length > 0 ? (
          <NewsFeedClient
            articles={articles}
            leagueSlug={leagueSlug}
            leagueName={league.name}
            leagueLogoUrl={league.logo_url}
          />
        ) : (
          <div className="league-reading-panel rounded-[28px] p-12 text-center">
            <Newspaper className="w-12 h-12 text-[var(--color-text-muted)] mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-[var(--color-text-primary)] mb-2">
              No News Yet
            </h3>
            <p className="text-[var(--color-text-secondary)]">
              Check back later for the latest league news and announcements.
            </p>
          </div>
        )}
      </div>
    </div>
    </SubscriptionWall>
  );
}
