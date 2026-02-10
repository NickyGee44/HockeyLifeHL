import { notFound } from 'next/navigation';
import { getLeagueBySlug, getLeagueTheme, getAllLeagueSlugs, getTickerGames, getDivisions, getSeasons } from '@/lib/data';
import { LeagueHeader } from '@/components/LeagueHeader';
import { LeagueFooter } from '@/components/LeagueFooter';
import { LeagueThemeProvider } from '@/components/LeagueThemeProvider';
import { PreviewModeProvider } from '@/components/PreviewModeProvider';
import { AuthProvider } from '@/components/auth';
import { ScoreTicker } from '@/components/ScoreTicker';
import { DivisionFilterProvider } from '@/components/DivisionFilterProvider';
import type { Metadata } from 'next';

/**
 * Force dynamic rendering so branding/theme changes reflect immediately.
 * The Supabase client uses cache: 'no-store' for fresh data on every request.
 */
export const dynamic = 'force-dynamic';

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

  const [theme, tickerGames, divisions, seasons] = await Promise.all([
    Promise.resolve(getLeagueTheme(league)),
    getTickerGames(league.id),
    getDivisions(league.id),
    getSeasons(league.id),
  ]);
  const templateClass = `league-template-${theme.templateVariant}`;

  // Check if any season has open registration
  const now = new Date();
  const registrationOpen = seasons.some((season) => {
    const s = season as any;
    if (s.registration_opens_at && s.registration_closes_at) {
      return now >= new Date(s.registration_opens_at) && now <= new Date(s.registration_closes_at);
    }
    return false;
  });

  return (
    <LeagueThemeProvider theme={theme}>
      <AuthProvider>
        <PreviewModeProvider>
          <DivisionFilterProvider divisions={divisions} leagueId={league.id}>
            <div className={`min-h-screen flex flex-col ${templateClass}`}>
              <ScoreTicker games={tickerGames} leagueSlug={leagueSlug} />
              <LeagueHeader
                league={league}
                leagueSlug={leagueSlug}
                registrationOpen={registrationOpen}
                visiblePages={(league as any).settings?.website?.visiblePages}
              />
              <main className="flex-1">{children}</main>
              <LeagueFooter league={league} leagueSlug={leagueSlug} />
            </div>
          </DivisionFilterProvider>
        </PreviewModeProvider>
      </AuthProvider>
    </LeagueThemeProvider>
  );
}
