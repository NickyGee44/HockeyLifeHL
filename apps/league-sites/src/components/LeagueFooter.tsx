'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import type { League } from '@/lib/types';
import { SocialLinks } from './SocialLinks';
import { shouldShowDefaultPublicNavPage } from '@/lib/publicSiteVisibility';

interface LeagueFooterProps {
  league: League;
  leagueSlug: string;
  visiblePages?: Record<string, boolean>;
}

export function LeagueFooter({ league, leagueSlug, visiblePages }: LeagueFooterProps) {
  // Hydration-safe: use empty string on server, set year after mount
  const [currentYear, setCurrentYear] = useState('');
  useEffect(() => {
    queueMicrotask(() => setCurrentYear(String(new Date().getFullYear())));
  }, []);

  const moreLinks = [
    { href: `/${leagueSlug}/venues`, label: 'Venues', pageKey: 'venues' },
    { href: `/${leagueSlug}/history`, label: 'History', pageKey: 'history' },
    { href: `/${leagueSlug}/suspensions`, label: 'Suspensions', pageKey: 'suspensions' },
    { href: `/${leagueSlug}/about`, label: 'About', pageKey: 'about' },
    { href: `/${leagueSlug}/contact`, label: 'Contact', pageKey: 'contact' },
  ].filter((item) => shouldShowDefaultPublicNavPage(item.pageKey, visiblePages));

  return (
    <footer className="relative border-t border-[var(--color-border)] bg-[var(--color-background)] overflow-hidden">
      {/* Gradient top border using league colors */}
      <div
        className="absolute top-0 left-0 right-0 h-[3px]"
        style={{
          background: `linear-gradient(90deg, var(--league-secondary-safe), var(--league-primary-strong), var(--league-secondary-safe))`,
        }}
      />

      {/* Subtle background pattern */}
      <div
        className="absolute inset-0 opacity-[0.02] pointer-events-none"
        style={{
          backgroundImage: `
            radial-gradient(circle at 25% 25%, var(--color-accent) 1px, transparent 1px),
            radial-gradient(circle at 75% 75%, var(--color-accent) 1px, transparent 1px)
          `,
          backgroundSize: '60px 60px',
        }}
      />

      {/* Gradient glow effect at top */}
      <div
        className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[200px] opacity-10 blur-3xl pointer-events-none"
        style={{
          background: `radial-gradient(ellipse, var(--league-primary-strong), transparent)`,
        }}
      />

      <div className="relative container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-8">
          {/* League Info */}
          <div className="md:col-span-2">
            <h3 className="font-bold text-lg mb-4 text-[var(--color-text-primary)]">
              {league.name}
            </h3>
            {league.description && (
              <p className="text-[var(--color-text-secondary)] mb-4 max-w-md leading-relaxed">
                {league.description}
              </p>
            )}
            {league.contact_email && (
              <a
                href={`mailto:${league.contact_email}`}
                className="group inline-flex items-center gap-2 text-[var(--color-accent)] transition-all duration-300 hover:text-[var(--color-accent)]"
              >
                <span className="relative">
                  {league.contact_email}
                  <span className="absolute bottom-0 left-0 h-[1px] w-0 bg-[var(--color-accent)] transition-all duration-300 group-hover:w-full" />
                </span>
              </a>
            )}
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="font-semibold mb-4 text-[var(--color-text-primary)]">Quick Links</h4>
            <nav className="flex flex-col gap-2">
              <FooterLink href={`/${leagueSlug}/scores`}>Scores</FooterLink>
              <FooterLink href={`/${leagueSlug}/schedule`}>Schedule</FooterLink>
              <FooterLink href={`/${leagueSlug}/standings`}>Standings</FooterLink>
              <FooterLink href={`/${leagueSlug}/teams`}>Teams</FooterLink>
              <FooterLink href={`/${leagueSlug}/stats`}>Stats</FooterLink>
              <FooterLink href={`/${leagueSlug}/goalies/register`}>🥅 Register as a Sub Goalie</FooterLink>
              <FooterLink href={`/${leagueSlug}/players`}>Players</FooterLink>
              <FooterLink href={`/${leagueSlug}/news`}>News</FooterLink>
              <FooterLink href={`/${leagueSlug}/events`}>Events</FooterLink>
              <FooterLink href={`/${leagueSlug}/gallery`}>Gallery</FooterLink>
            </nav>
          </div>

          {/* More Links */}
          <div>
            <h4 className="font-semibold mb-4 text-[var(--color-text-primary)]">More</h4>
            <nav className="flex flex-col gap-2">
              {moreLinks.map((item) => (
                <FooterLink key={item.href} href={item.href}>{item.label}</FooterLink>
              ))}
            </nav>
          </div>

          {/* Contact */}
          <div>
            <h4 className="font-semibold mb-4 text-[var(--color-text-primary)]">Contact</h4>
            <address className="text-[var(--color-text-secondary)] not-italic space-y-2">
              {league.address && (
                <p className="flex items-start gap-2">
                  <span className="mt-2 h-1 w-1 flex-shrink-0 rounded-full bg-[var(--color-accent)]" />
                  {league.address}
                </p>
              )}
              {(league.city || league.state || league.zip_code) && (
                <p className="flex items-start gap-2">
                  <span className="mt-2 h-1 w-1 flex-shrink-0 rounded-full bg-[var(--color-accent)]" />
                  {league.city && `${league.city}, `}
                  {league.state} {league.zip_code}
                </p>
              )}
              {league.contact_phone && (
                <p className="flex items-start gap-2">
                  <span className="mt-2 h-1 w-1 flex-shrink-0 rounded-full bg-[var(--color-accent)]" />
                  {league.contact_phone}
                </p>
              )}
            </address>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-12 pt-8 border-t border-[var(--color-border)] flex flex-col sm:flex-row justify-between items-center gap-4">
          <p className="text-sm text-[var(--color-text-muted)]">
            &copy; {currentYear} {league.name}. All rights reserved.
          </p>

          {/* Social Links */}
          {league.settings?.website && (
            <SocialLinks settings={league.settings.website} size="sm" />
          )}

          <p className="text-sm text-[var(--color-text-muted)]">
            Powered by{' '}
            <a
              href="https://beerleaguehockey.ca"
              target="_blank"
              rel="noopener noreferrer"
              className="group relative inline-flex items-center text-[var(--color-accent)] transition-all duration-300 hover:text-[var(--color-accent)]"
            >
              <span className="relative">
                Beer League Hockey
                <span className="absolute bottom-0 left-0 h-[1px] w-0 bg-[var(--color-accent)] transition-all duration-300 group-hover:w-full" />
              </span>
              {/* Subtle glow on hover */}
              <span
                className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 blur-lg -z-10"
                style={{ background: 'var(--league-primary-strong)' }}
              />
            </a>
          </p>
        </div>
      </div>
    </footer>
  );
}

function FooterLink({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
        className="group relative inline-flex w-fit items-center gap-2 text-[var(--color-text-secondary)] transition-all duration-300 hover:text-[var(--color-text-primary)]"
    >
      {/* Animated dot */}
      <span
        className="h-1.5 w-1.5 scale-0 rounded-full bg-[var(--color-accent)] transition-transform duration-300 group-hover:scale-100"
      />
      <span className="relative">
        {children}
        {/* Animated underline */}
        <span className="absolute bottom-0 left-0 h-[1px] w-0 bg-[var(--color-accent)] transition-all duration-300 group-hover:w-full" />
      </span>
    </Link>
  );
}
