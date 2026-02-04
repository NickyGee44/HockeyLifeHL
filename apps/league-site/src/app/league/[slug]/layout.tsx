import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getLeagueBySlug, getTopLeagues } from '@/lib/data/league';
import { LeagueProvider } from '@/components/league-provider';
import { SiteHeader } from '@/components/site-header';
import { SiteFooter } from '@/components/site-footer';

type Props = {
  params: Promise<{ slug: string }>;
  children: React.ReactNode;
};

// Generate static params for top 100 leagues for performance
export async function generateStaticParams() {
  const leagues = await getTopLeagues(100);
  return leagues.map((league) => ({
    slug: league.slug,
  }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const league = await getLeagueBySlug(slug);

  if (!league) {
    return {
      title: 'League Not Found',
    };
  }

  return {
    title: {
      template: `%s | ${league.name}`,
      default: league.name,
    },
    description: league.tagline || league.description || `Welcome to ${league.name}`,
    openGraph: {
      title: league.name,
      description: league.tagline || league.description || undefined,
      images: league.bannerUrl ? [{ url: league.bannerUrl }] : undefined,
    },
    icons: league.faviconUrl ? { icon: league.faviconUrl } : undefined,
  };
}

export default async function LeagueLayout({ params, children }: Props) {
  const { slug } = await params;
  const league = await getLeagueBySlug(slug);

  if (!league) {
    notFound();
  }

  // Generate CSS variables for league branding
  const leagueCssVars = {
    '--league-primary': league.primaryColor,
    '--league-secondary': league.secondaryColor,
    '--league-accent': league.accentColor || league.primaryColor,
  } as React.CSSProperties;

  return (
    <LeagueProvider league={league}>
      <div style={leagueCssVars} className="min-h-screen flex flex-col">
        {/* Custom CSS injection */}
        {league.customCss && (
          <style dangerouslySetInnerHTML={{ __html: league.customCss }} />
        )}

        <SiteHeader />
        <main className="flex-1">{children}</main>
        <SiteFooter />
      </div>
    </LeagueProvider>
  );
}
