import type { NewsArticle } from '@/lib/types';
import { NewsCard } from './NewsCard';

interface NewsListProps {
  articles: NewsArticle[];
  leagueSlug: string;
  leagueName: string;
  leagueLogoUrl?: string | null;
}

export function NewsList({ articles, leagueSlug, leagueName, leagueLogoUrl }: NewsListProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {articles.map((article) => (
        <NewsCard
          key={article.id}
          article={article}
          leagueSlug={leagueSlug}
          leagueName={leagueName}
          leagueLogoUrl={leagueLogoUrl}
        />
      ))}
    </div>
  );
}
