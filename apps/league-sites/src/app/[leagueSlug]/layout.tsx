import { notFound } from 'next/navigation';
import { getLeagueBySlug, getLeagueTheme, getAllLeagueSlugs, getTickerGames, getDivisions, getSeasons, getLeagueSponsors } from '@/lib/data';
import { LeagueHeader } from '@/components/LeagueHeader';
import { LeagueFooter } from '@/components/LeagueFooter';
import { LeagueThemeProvider } from '@/components/LeagueThemeProvider';
import { PreviewModeProvider } from '@/components/PreviewModeProvider';
import { AuthProvider } from '@/components/auth';
import { ScoreTicker } from '@/components/ScoreTicker';
import { DivisionFilterProvider } from '@/components/DivisionFilterProvider';
import { SponsorFooterStrip } from '@/components/sponsors/SponsorFooterStrip';
import { BugReportProvider } from '@/components/bug-report/BugReportProvider';
import { BugReportButton } from '@/components/bug-report/BugReportButton';
import type { Metadata } from 'next';

/**
 * Revalidate every 60 seconds as a time-based fallback.
 * On-demand revalidation is handled via /api/revalidate endpoint.
 */
export const revalidate = 60;

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

  const iconUrl = (league as any).favicon_url || league.logo_url;

  return {
    title: {
      default: league.name,
      template: `%s | ${league.name}`,
    },
    description: league.description || `${league.name} - Powered by Beer League Hockey`,
    ...(iconUrl && {
      icons: {
        icon: [
          { url: iconUrl, sizes: '32x32' },
          { url: iconUrl, sizes: '16x16' },
        ],
        apple: iconUrl,
        shortcut: iconUrl,
      },
    }),
    manifest: `/${leagueSlug}/manifest.webmanifest`,
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

  const [theme, tickerGames, divisions, seasons, sponsors] = await Promise.all([
    Promise.resolve(getLeagueTheme(league)),
    getTickerGames(league.id),
    getDivisions(league.id),
    getSeasons(league.id),
    getLeagueSponsors(league.id),
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
  const activeSeasonId = (seasons.find((season) => (season as any).status === 'active') as any)?.id ?? null;

  return (
    <LeagueThemeProvider theme={theme}>
      <AuthProvider>
        <PreviewModeProvider>
          <BugReportProvider leagueId={league.id} seasonId={activeSeasonId}>
            <DivisionFilterProvider divisions={divisions} leagueId={league.id}>
              <div className={`relative z-[1] min-h-screen flex flex-col ${templateClass}`}>
                <ScoreTicker games={tickerGames} leagueSlug={leagueSlug} />
                <LeagueHeader
                  league={league}
                  leagueSlug={leagueSlug}
                  registrationOpen={registrationOpen}
                  visiblePages={(league as any).settings?.website?.visiblePages}
                />
                <main className="flex-1">{children}</main>
                <SponsorFooterStrip sponsors={sponsors} />
                <LeagueFooter league={league} leagueSlug={leagueSlug} />
                <BugReportButton />
              </div>
            </DivisionFilterProvider>
          </BugReportProvider>
        </PreviewModeProvider>
      </AuthProvider>
    </LeagueThemeProvider>
  );
}
