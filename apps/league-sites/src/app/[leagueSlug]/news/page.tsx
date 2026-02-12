import { Metadata } from 'next';
import { Newspaper } from 'lucide-react';
import { notFound } from 'next/navigation';
import { getLeagueBySlug, getAllArticles } from '@/lib/data';
import { NewsList } from '@/components/news/NewsList';

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
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-extrabold text-[var(--color-text-primary)]">
            News
          </h1>
          <Newspaper className="w-7 h-7 text-[var(--league-primary)]" />
        </div>

        {/* Articles */}
        {articles.length > 0 ? (
          <NewsList articles={articles} leagueSlug={leagueSlug} />
        ) : (
          <div className="bg-[var(--color-background-elevated)] border border-[var(--color-border)] rounded-2xl p-12 text-center">
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
  );
}
