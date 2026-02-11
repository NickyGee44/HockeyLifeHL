'use client';

import { useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Calendar, Trophy, Users, TrendingUp, ArrowRight, MapPin, ShieldCheck } from 'lucide-react';
import type { League, LeagueStats, ThemePreset } from '@/lib/types';
import { usePreviewMode } from './PreviewModeProvider';

interface HeroSectionProps {
  league: League;
  stats: LeagueStats;
  leagueSlug: string;
}

function getTemplateVariant(league: League): ThemePreset {
  const preset = league.settings?.website?.themePreset;
  if (preset === 'light' || preset === 'custom') {
    return preset;
  }
  return 'dark';
}

export function HeroSection({ league, stats, leagueSlug }: HeroSectionProps) {
  const [isLoaded, setIsLoaded] = useState(false);
  const { isPreviewMode, theme } = usePreviewMode();

  const logoUrl = isPreviewMode && theme?.logoUrl !== undefined ? theme.logoUrl : league.logo_url;
  const bannerUrl = isPreviewMode && theme?.bannerUrl !== undefined ? theme.bannerUrl : league.banner_url;
  const previewTagline = isPreviewMode && theme?.tagline !== undefined ? theme.tagline : null;
  const previewDescription = isPreviewMode && theme?.description !== undefined ? theme.description : null;

  const variant = useMemo(() => getTemplateVariant(league), [league]);
  const location = [league.city, league.state].filter(Boolean).join(', ');
  const description = previewDescription || league.description;
  const tagline = previewTagline || location || 'Built for league owners who want a polished player experience.';

  useEffect(() => {
    const timer = setTimeout(() => setIsLoaded(true), 40);
    return () => clearTimeout(timer);
  }, []);

  const backgroundStyle = `radial-gradient(circle at 18% 12%, color-mix(in srgb, var(--league-primary) 24%, transparent), transparent 50%),
           radial-gradient(circle at 84% -8%, color-mix(in srgb, var(--league-accent) 18%, transparent), transparent 44%),
           linear-gradient(135deg, var(--color-background) 0%, var(--color-background-elevated) 45%, var(--color-background-sunken) 100%)`;

  const panelClass =
    'bg-[color-mix(in_srgb,var(--color-surface)_var(--glass-opacity),transparent)] border-[var(--color-border)] shadow-[0_25px_60px_rgba(0,0,0,0.14)]';

  const ctaPrimaryText = variant === 'light' ? 'Explore Schedule' : 'View Schedule';
  const sectionBadge =
    variant === 'custom' ? 'Signature Experience' : variant === 'light' ? 'Community Hub' : 'League Central';

  return (
    <section className="relative isolate overflow-hidden border-b border-[var(--color-border)]" data-testid="hero-section">
      <div className="absolute inset-0" style={{ background: backgroundStyle }} />

      {bannerUrl && (
        <div className="absolute inset-0">
          <div
            className="absolute inset-0 opacity-20"
            style={{
              backgroundImage: `url(${bannerUrl})`,
              backgroundRepeat: 'repeat',
              backgroundSize: '25%',
            }}
          />
          <div
            className="absolute inset-0"
            style={{
              background:
                'linear-gradient(160deg, color-mix(in srgb, var(--color-background) 78%, transparent) 0%, color-mix(in srgb, var(--color-background) 94%, transparent) 100%)',
            }}
          />
        </div>
      )}

      <div
        className="pointer-events-none absolute inset-0 opacity-25"
        style={{
          background:
            'repeating-linear-gradient(125deg, color-mix(in srgb, var(--league-primary) 8%, transparent) 0px, color-mix(in srgb, var(--league-primary) 8%, transparent) 1px, transparent 1px, transparent 28px)',
        }}
      />
      <div className="pointer-events-none absolute -left-20 top-16 h-56 w-56 rounded-full bg-[var(--league-primary)]/20 blur-3xl" />
      <div className="pointer-events-none absolute -right-24 bottom-10 h-72 w-72 rounded-full bg-[var(--league-accent)]/20 blur-3xl" />

      <div className="relative container mx-auto px-4 py-6 md:py-8 lg:py-10">
        <div className="mx-auto max-w-6xl">
          <div
            className={`rounded-3xl border p-5 backdrop-blur-xl transition-all duration-700 md:p-6 lg:p-8 ${panelClass} ${
              isLoaded ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'
            }`}
          >
            <span className="inline-flex items-center rounded-full border border-[var(--league-primary)]/30 bg-[var(--league-primary)]/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-[var(--league-primary)]">
              {sectionBadge}
            </span>

            <div className="mt-3 flex items-center gap-4 md:gap-5">
              {logoUrl ? (
                <Image
                  src={logoUrl}
                  alt={`${league.name} logo`}
                  width={176}
                  height={176}
                  className="h-28 w-28 rounded-2xl object-contain sm:h-32 sm:w-32 md:h-40 md:w-40 lg:h-44 lg:w-44"
                  priority
                />
              ) : (
                <div className="flex h-28 w-28 items-center justify-center rounded-2xl bg-[var(--league-primary)] text-4xl font-black text-[var(--color-accent-text)] sm:h-32 sm:w-32 sm:text-5xl md:h-40 md:w-40 lg:h-44 lg:w-44">
                  {league.name.charAt(0)}
                </div>
              )}

              <div className="min-w-0">
                <p className="text-xs font-medium uppercase tracking-[0.15em] text-[var(--color-text-secondary)] sm:text-sm">
                  {tagline}
                </p>
                {location && (
                  <p className="mt-1.5 inline-flex items-center gap-1 rounded-full bg-[var(--color-surface-hover)] px-2.5 py-1 text-xs text-[var(--color-text-secondary)]">
                    <MapPin className="h-3.5 w-3.5 text-[var(--league-primary)]" />
                    {location}
                  </p>
                )}
              </div>
            </div>

            <h1 className="mt-4 text-3xl font-black leading-[0.92] tracking-tight text-[var(--color-text-primary)] text-balance sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl">
              {league.name}
            </h1>

            {description && (
              <p className="mt-3 max-w-2xl text-sm leading-relaxed text-[var(--color-text-secondary)] md:text-base lg:text-lg">
                {description}
              </p>
            )}

            <div className="mt-4 flex flex-wrap gap-2">
              <span className="inline-flex items-center gap-1 rounded-full border border-[var(--color-border)] bg-[var(--color-surface)]/70 px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-[var(--color-text-secondary)]">
                <ShieldCheck className="h-3.5 w-3.5 text-[var(--league-primary)]" />
                Verified League
              </span>
              <span className="inline-flex items-center gap-1 rounded-full border border-[var(--color-border)] bg-[var(--color-surface)]/70 px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-[var(--color-text-secondary)]">
                <Users className="h-3.5 w-3.5 text-[var(--league-primary)]" />
                {stats.totalTeams} Teams
              </span>
              <span className="inline-flex items-center gap-1 rounded-full border border-[var(--color-border)] bg-[var(--color-surface)]/70 px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-[var(--color-text-secondary)]">
                <Calendar className="h-3.5 w-3.5 text-[var(--league-primary)]" />
                {stats.upcomingGames} Upcoming
              </span>
            </div>

            <div className="mt-5 flex flex-wrap gap-2.5 md:gap-3">
              <Link
                href={`/${leagueSlug}/schedule`}
                className="inline-flex items-center gap-2 rounded-xl bg-[var(--league-primary)] px-5 py-2.5 text-sm font-bold text-[var(--color-accent-text)] shadow-lg shadow-[var(--league-glow-color)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-[var(--league-glow-color)] md:px-6 md:py-3"
              >
                <Calendar className="h-4 w-4" />
                {ctaPrimaryText}
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href={`/${leagueSlug}/standings`}
                className="inline-flex items-center gap-2 rounded-xl border border-[var(--color-border-emphasis)] bg-[color-mix(in_srgb,var(--color-surface)_65%,transparent)] px-5 py-2.5 text-sm font-bold text-[var(--color-text-primary)] backdrop-blur-sm transition-all duration-200 hover:bg-[var(--color-surface-hover)] hover:border-[var(--league-primary)] md:px-6 md:py-3"
              >
                <Trophy className="h-4 w-4 text-[var(--league-primary)]" />
                Standings
              </Link>
              <Link
                href={`/${leagueSlug}/scores`}
                className="inline-flex items-center gap-2 rounded-xl border border-[var(--color-border)] bg-transparent px-5 py-2.5 text-sm font-semibold text-[var(--color-text-secondary)] transition-all duration-200 hover:border-[var(--color-border-emphasis)] hover:text-[var(--color-text-primary)] md:px-6 md:py-3"
              >
                <TrendingUp className="h-4 w-4 text-[var(--league-primary)]" />
                Latest Scores
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export default HeroSection;
