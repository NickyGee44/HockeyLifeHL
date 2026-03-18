import { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, Calendar, Clock3, Swords, User } from 'lucide-react';
import { SubscriptionWall } from '@/components/shared';
import { LeagueNewsFallbackArtwork } from '@/components/news/LeagueNewsFallbackArtwork';
import { RichArticleContent } from '@/components/news/RichArticleContent';
import { buildArticleMentions } from '@/lib/articles/linkify';
import { getArticleLinkContext, getArticlePlayerTags, getGamePreview, getLeagueBySlug, getNewsArticleBySlug } from '@/lib/data';

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

  const [articleLinkContext, taggedPlayers, relatedGame] = await Promise.all([
    getArticleLinkContext(article.id, league.id, article.game_id),
    getArticlePlayerTags(article.id),
    article.game_id ? getGamePreview(article.game_id) : Promise.resolve(null),
  ]);
  const articleMentions = buildArticleMentions({
    leagueSlug,
    players: articleLinkContext.players,
    teams: articleLinkContext.teams,
    relatedGame: articleLinkContext.relatedGame,
  });

  const publishedDate = article.published_at || article.created_at;
  const formattedDate = new Date(publishedDate).toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <SubscriptionWall>
    <div className="container mx-auto px-4 py-8">
      <div className="mx-auto max-w-5xl">
        {/* Back Link */}
        <Link
          href={`/${leagueSlug}/news`}
          className="inline-flex items-center gap-2 text-sm text-[var(--color-text-secondary)] hover:text-[var(--league-primary)] transition-colors mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to News
        </Link>

        {/* Article */}
        <article className="league-reading-panel overflow-hidden rounded-[32px]">
          <div className="relative aspect-[16/7.2] min-h-[280px]">
            {article.image_url ? (
              <img
                src={article.image_url}
                alt={article.title}
                className="h-full w-full object-cover"
              />
            ) : (
              <LeagueNewsFallbackArtwork
                leagueName={league.name}
                leagueLogoUrl={league.logo_url}
                articleType={article.type}
                emphasis="hero"
              />
            )}
            <div className={`absolute inset-0 ${article.image_url ? 'bg-gradient-to-t from-black/92 via-black/40 to-transparent' : 'bg-gradient-to-t from-slate-950/88 via-slate-950/34 to-transparent'}`} />
            <div className="absolute inset-x-0 bottom-0 p-6 md:p-8">
              <div className="mb-4 inline-flex items-center rounded-full bg-[var(--league-primary)] px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-[var(--color-accent-text)]">
                {article.type === 'game_recap' ? 'Game recap' : article.type === 'weekly_wrap' ? 'Weekly wrap' : 'News'}
              </div>
              <h1 className="max-w-4xl text-3xl font-extrabold leading-tight text-white md:text-5xl">
                {article.title}
              </h1>
              {article.excerpt && (
                <p className="mt-3 max-w-2xl text-sm leading-6 text-white/78 md:text-base">
                  {article.excerpt}
                </p>
              )}
              <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-white/72">
                <div className="flex items-center gap-1.5">
                  <Calendar className="w-4 h-4" />
                  <time dateTime={publishedDate}>{formattedDate}</time>
                </div>
                {article.author && (
                  <div className="flex items-center gap-1.5">
                    <User className="w-4 h-4" />
                    {article.author_id ? (
                      <Link
                        href={`/${leagueSlug}/players/${article.author_id}`}
                        className="hover:text-white transition-colors"
                      >
                        {article.author.full_name}
                      </Link>
                    ) : (
                      <span>{article.author.full_name}</span>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="border-t border-[var(--color-border)] p-6 md:p-8">
            <section className="grid gap-4 border-b border-[var(--color-border)] pb-6 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--league-primary)]">
                  Story context
                </p>
                <h2 className="mt-2 text-xl font-black tracking-tight text-[var(--color-text-primary)]">
                  Linked players and matchup
                </h2>
                <p className="mt-2 text-sm text-[var(--color-text-secondary)]">
                  Use this area to verify which players and games are attached to the article.
                </p>
              </div>
              <div className="grid gap-3">
                {taggedPlayers.length > 0 ? (
                  <div>
                    <p className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-[var(--color-text-muted)]">
                      Tagged players
                    </p>
                    <div className="flex flex-wrap gap-2.5">
                      {taggedPlayers.map((tag) => (
                        <Link
                          key={tag.id}
                          href={`/${leagueSlug}/players/${tag.player?.id}`}
                          className="inline-flex items-center gap-2 rounded-full border border-[var(--color-border)] bg-[var(--color-surface)]/88 px-3 py-2 text-sm text-[var(--color-text-primary)] transition-colors hover:border-[var(--league-primary)]/35 hover:text-[var(--league-primary)]"
                        >
                          {tag.player?.avatar_url ? (
                            <img
                              src={tag.player.avatar_url}
                              alt={tag.player.full_name}
                              className="h-7 w-7 rounded-full object-cover"
                            />
                          ) : (
                            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[var(--league-primary)]/12 text-xs font-black text-[var(--league-primary)]">
                              {tag.player?.full_name.charAt(0)}
                            </span>
                          )}
                          <span>{tag.player?.full_name}</span>
                        </Link>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="rounded-2xl border border-dashed border-[var(--color-border)] bg-[var(--color-surface)]/65 px-4 py-3 text-sm text-[var(--color-text-secondary)]">
                    No player tags are attached to this story yet.
                  </div>
                )}

                {relatedGame ? (
                  <div className="rounded-3xl border border-[var(--color-border)] bg-[var(--color-surface)]/82 p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--color-text-muted)]">
                      Related game
                    </p>
                    <div className="mt-2 flex flex-wrap items-center gap-2 text-base font-black text-[var(--color-text-primary)]">
                      <Link href={`/${leagueSlug}/teams/${relatedGame.away_team?.slug}`} className="hover:text-[var(--league-primary)] transition-colors">
                        {relatedGame.away_team?.name || 'Away'}
                      </Link>
                      <span className="text-[var(--color-text-muted)]">vs</span>
                      <Link href={`/${leagueSlug}/teams/${relatedGame.home_team?.slug}`} className="hover:text-[var(--league-primary)] transition-colors">
                        {relatedGame.home_team?.name || 'Home'}
                      </Link>
                    </div>
                    <div className="mt-3 flex flex-wrap items-center gap-4 text-sm text-[var(--color-text-secondary)]">
                      <span className="inline-flex items-center gap-1.5">
                        <Clock3 className="h-4 w-4 text-[var(--league-primary)]" />
                        {new Date(relatedGame.scheduled_at).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </span>
                      <Link
                        href={`/${leagueSlug}/games/${relatedGame.id}`}
                        className="inline-flex items-center gap-1.5 font-semibold text-[var(--league-primary)]"
                      >
                        <Swords className="h-4 w-4" />
                        View game page
                      </Link>
                    </div>
                  </div>
                ) : article.game_id ? (
                  <Link
                    href={`/${leagueSlug}/games/${article.game_id}`}
                    className="inline-flex items-center gap-2 rounded-full border border-[var(--color-border)] bg-[var(--color-surface)]/82 px-4 py-2 text-sm font-semibold text-[var(--league-primary)]"
                  >
                    <Swords className="h-4 w-4" />
                    View related game
                  </Link>
                ) : (
                  <div className="rounded-2xl border border-dashed border-[var(--color-border)] bg-[var(--color-surface)]/65 px-4 py-3 text-sm text-[var(--color-text-secondary)]">
                    No game link is attached to this story yet.
                  </div>
                )}
              </div>
            </section>

            <div className="pt-6">
              <RichArticleContent content={article.content} mentions={articleMentions} />
            </div>
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
