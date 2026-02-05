import { notFound } from 'next/navigation';
import { getLeagueBySlug, getLeagueTheme, getAllLeagueSlugs, getTickerGames } from '@/lib/data';
import { LeagueHeader } from '@/components/LeagueHeader';
import { LeagueFooter } from '@/components/LeagueFooter';
import { LeagueThemeProvider } from '@/components/LeagueThemeProvider';
import { PreviewModeProvider } from '@/components/PreviewModeProvider';
import { ScoreTicker } from '@/components/ScoreTicker';
import type { Metadata } from 'next';

interface LeagueLayoutProps {
  children: React.ReactNode;
  params: Promise<{ leagueSlug: string }>;
}

/**
 * Generate metadata for the league
 */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ leagueSlug: string }>;
}): Promise<Metadata> {
  const { leagueSlug } = await params;
  const league = await getLeagueBySlug(leagueSlug);

  if (!league) {
    return {
      title: 'League Not Found',
    };
  }

  return {
    title: {
      default: league.name,
      template: `%s | ${league.name}`,
    },
    description: league.description || `${league.name} - Powered by Beer League Hockey`,
    openGraph: {
      title: league.name,
      description: league.description || `${league.name} - Powered by Beer League Hockey`,
      images: league.banner_url ? [{ url: league.banner_url }] : [],
    },
  };
}

/**
 * Generate static params for top leagues
 * Enables ISR for faster initial loads
 */
export async function generateStaticParams() {
  const slugs = await getAllLeagueSlugs();
  return slugs.map((slug) => ({ leagueSlug: slug }));
}

/**
 * League layout with header, footer, and theme provider
 */
export default async function LeagueLayout({ children, params }: LeagueLayoutProps) {
  const { leagueSlug } = await params;
  const league = await getLeagueBySlug(leagueSlug);

  if (!league) {
    notFound();
  }

  const [theme, tickerGames] = await Promise.all([
    Promise.resolve(getLeagueTheme(league)),
    getTickerGames(league.id),
  ]);

  return (
    <LeagueThemeProvider theme={theme}>
      <PreviewModeProvider>
        <div className="min-h-screen flex flex-col">
          <ScoreTicker games={tickerGames} leagueSlug={leagueSlug} />
          <LeagueHeader league={league} leagueSlug={leagueSlug} />
          <main className="flex-1">{children}</main>
          <LeagueFooter league={league} leagueSlug={leagueSlug} />
        </div>
      </PreviewModeProvider>
    </LeagueThemeProvider>
  );
}
