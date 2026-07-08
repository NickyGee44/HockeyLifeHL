import type { NewsArticle } from '@/lib/types';
import { NewsCard } from './NewsCard';

interface NewsListProps {
  articles: NewsArticle[];
  leagueSlug: string;
  leagueName: string;
  leagueLogoUrl?: string | null;
}

export function NewsList({ articles, leagueSlug, leagueName, leagueLogoUrl }: NewsListProps) {
  const [leadArticle, ...remainingArticles] = articles;

  return (
    <>
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:hidden">
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

      <div className="hidden lg:grid lg:grid-cols-12 lg:gap-6">
        {leadArticle ? (
          <div className="lg:col-span-7 xl:col-span-8">
            <NewsCard
              article={leadArticle}
              leagueSlug={leagueSlug}
              leagueName={leagueName}
              leagueLogoUrl={leagueLogoUrl}
            />
          </div>
        ) : null}
        <div className="grid gap-5 lg:col-span-5 xl:col-span-4">
          {remainingArticles.slice(0, 4).map((article) => (
            <NewsCard
              key={article.id}
              article={article}
              leagueSlug={leagueSlug}
              leagueName={leagueName}
              leagueLogoUrl={leagueLogoUrl}
            />
          ))}
        </div>
        {remainingArticles.length > 4 ? (
          <div className="grid gap-5 lg:col-span-12 lg:grid-cols-3">
            {remainingArticles.slice(4).map((article) => (
              <NewsCard
                key={article.id}
                article={article}
                leagueSlug={leagueSlug}
                leagueName={leagueName}
                leagueLogoUrl={leagueLogoUrl}
              />
            ))}
          </div>
        ) : null}
      </div>
    </>
  );
}
