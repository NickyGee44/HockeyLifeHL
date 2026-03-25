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
        <section className="league-reading-panel mb-8 rounded-[32px] p-6 md:p-8">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--league-primary)]">
                League coverage
              </p>
              <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-[var(--color-text-primary)] md:text-4xl">
                {league.name} news
              </h1>
              <p className="mt-3 max-w-2xl text-sm text-[var(--color-text-secondary)] md:text-base">
                Recaps, announcements, and league stories in a readable, image-led feed.
              </p>
            </div>
            <div className="inline-flex items-center gap-2 rounded-full border border-[var(--color-border)] bg-[var(--color-surface)]/85 px-4 py-2 text-sm font-semibold text-[var(--color-text-primary)]">
              <Newspaper className="h-4 w-4 text-[var(--league-primary)]" />
              {articles.length} {articles.length === 1 ? 'story' : 'stories'}
            </div>
          </div>
        </section>

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
