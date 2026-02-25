import { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, Calendar, User } from 'lucide-react';
import { SubscriptionWall } from '@/components/shared';
import { getLeagueBySlug, getNewsArticleBySlug } from '@/lib/data';

interface ArticlePageProps {
  params: Promise<{ leagueSlug: string; slug: string }>;
}

export async function generateMetadata({ params }: ArticlePageProps): Promise<Metadata> {
  const { leagueSlug, slug } = await params;
  const league = await getLeagueBySlug(leagueSlug);
  if (!league) return { title: 'Article Not Found' };

  const article = await getNewsArticleBySlug(league.id, slug);
  if (!article) return { title: 'Article Not Found' };

  return {
    title: `${article.title} - ${league.name}`,
    description: article.excerpt || `Read "${article.title}" on ${league.name}`,
    openGraph: {
      title: article.title,
      description: article.excerpt || undefined,
      images: article.image_url ? [article.image_url] : undefined,
    },
  };
}

export default async function ArticlePage({ params }: ArticlePageProps) {
  const { leagueSlug, slug } = await params;

  const league = await getLeagueBySlug(leagueSlug);
  if (!league) return notFound();

  const article = await getNewsArticleBySlug(league.id, slug);
  if (!article) return notFound();

  const formattedDate = new Date(article.created_at).toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <SubscriptionWall>
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-3xl mx-auto">
        {/* Back Link */}
        <Link
          href={`/${leagueSlug}/news`}
          className="inline-flex items-center gap-2 text-sm text-[var(--color-text-secondary)] hover:text-[var(--league-primary)] transition-colors mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to News
        </Link>

        {/* Article */}
        <article>
          {/* Header Image */}
          {article.image_url && (
            <div className="aspect-[2/1] rounded-2xl overflow-hidden mb-8">
              <img
                src={article.image_url}
                alt={article.title}
                className="w-full h-full object-cover"
              />
            </div>
          )}

          {/* Title */}
          <h1 className="text-3xl md:text-4xl font-extrabold text-[var(--color-text-primary)] leading-tight mb-4">
            {article.title}
          </h1>

          {/* Meta */}
          <div className="flex flex-wrap items-center gap-4 text-sm text-[var(--color-text-muted)] mb-8 pb-6 border-b border-[var(--color-border)]">
            <div className="flex items-center gap-1.5">
              <Calendar className="w-4 h-4" />
              <time dateTime={article.created_at}>{formattedDate}</time>
            </div>
            {article.author && (
              <div className="flex items-center gap-1.5">
                <User className="w-4 h-4" />
                <span>{article.author.full_name}</span>
              </div>
            )}
          </div>

          {/* Content */}
          <div className="prose prose-lg max-w-none text-[var(--color-text-primary)]">
            {article.content ? (
              article.content.split('\n').map((paragraph, index) => (
                paragraph.trim() ? (
                  <p
                    key={index}
                    className="text-[var(--color-text-secondary)] leading-relaxed mb-4"
                  >
                    {paragraph}
                  </p>
                ) : (
                  <br key={index} />
                )
              ))
            ) : (
              <p className="text-[var(--color-text-muted)] italic">
                No content available.
              </p>
            )}
          </div>
        </article>

        {/* Back to News */}
        <div className="mt-12 pt-6 border-t border-[var(--color-border)]">
          <Link
            href={`/${leagueSlug}/news`}
            className="inline-flex items-center gap-2 text-sm font-medium text-[var(--league-primary)] hover:underline"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to All News
          </Link>
        </div>
      </div>
    </div>
    </SubscriptionWall>
  );
}
