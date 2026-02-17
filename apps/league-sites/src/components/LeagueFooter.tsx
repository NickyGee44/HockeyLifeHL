'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import type { League } from '@/lib/types';
import { SocialLinks } from './SocialLinks';

interface LeagueFooterProps {
  league: League;
  leagueSlug: string;
}

export function LeagueFooter({ league, leagueSlug }: LeagueFooterProps) {
  // Hydration-safe: use empty string on server, set year after mount
  const [currentYear, setCurrentYear] = useState('');
  useEffect(() => { setCurrentYear(String(new Date().getFullYear())); }, []);

  return (
    <footer className="relative border-t border-[var(--color-border)] bg-[var(--color-background)] overflow-hidden">
      {/* Gradient top border using league colors */}
      <div
        className="absolute top-0 left-0 right-0 h-[3px]"
        style={{
          background: `linear-gradient(90deg, var(--league-secondary), var(--league-primary), var(--league-secondary))`,
        }}
      />

      {/* Subtle background pattern */}
      <div
        className="absolute inset-0 opacity-[0.02] pointer-events-none"
        style={{
          backgroundImage: `
            radial-gradient(circle at 25% 25%, var(--league-primary) 1px, transparent 1px),
            radial-gradient(circle at 75% 75%, var(--league-primary) 1px, transparent 1px)
          `,
          backgroundSize: '60px 60px',
        }}
      />

      {/* Gradient glow effect at top */}
      <div
        className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[200px] opacity-10 blur-3xl pointer-events-none"
        style={{
          background: `radial-gradient(ellipse, var(--league-primary), transparent)`,
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
                className="group inline-flex items-center gap-2 text-[var(--league-primary)] hover:text-[var(--league-primary)] transition-all duration-300"
              >
                <span className="relative">
                  {league.contact_email}
                  <span className="absolute bottom-0 left-0 w-0 h-[1px] bg-[var(--league-primary)] transition-all duration-300 group-hover:w-full" />
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
              <FooterLink href={`/${leagueSlug}/venues`}>Venues</FooterLink>
              <FooterLink href={`/${leagueSlug}/history`}>History</FooterLink>
              <FooterLink href={`/${leagueSlug}/suspensions`}>Suspensions</FooterLink>
              <FooterLink href={`/${leagueSlug}/about`}>About</FooterLink>
              <FooterLink href={`/${leagueSlug}/contact`}>Contact</FooterLink>
            </nav>
          </div>

          {/* Contact */}
          <div>
            <h4 className="font-semibold mb-4 text-[var(--color-text-primary)]">Contact</h4>
            <address className="text-[var(--color-text-secondary)] not-italic space-y-2">
              {league.address && (
                <p className="flex items-start gap-2">
                  <span className="w-1 h-1 rounded-full bg-[var(--league-primary)] mt-2 flex-shrink-0" />
                  {league.address}
                </p>
              )}
              {(league.city || league.state || league.zip_code) && (
                <p className="flex items-start gap-2">
                  <span className="w-1 h-1 rounded-full bg-[var(--league-primary)] mt-2 flex-shrink-0" />
                  {league.city && `${league.city}, `}
                  {league.state} {league.zip_code}
                </p>
              )}
              {league.contact_phone && (
                <p className="flex items-start gap-2">
                  <span className="w-1 h-1 rounded-full bg-[var(--league-primary)] mt-2 flex-shrink-0" />
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
              className="group relative inline-flex items-center text-[var(--league-primary)] hover:text-[var(--league-primary)] transition-all duration-300"
            >
              <span className="relative">
                Beer League Hockey
                <span className="absolute bottom-0 left-0 w-0 h-[1px] bg-[var(--league-primary)] transition-all duration-300 group-hover:w-full" />
              </span>
              {/* Subtle glow on hover */}
              <span
                className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 blur-lg -z-10"
                style={{ background: 'var(--league-primary)' }}
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
      className="group relative inline-flex items-center gap-2 text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-all duration-300 w-fit"
    >
      {/* Animated dot */}
      <span
        className="w-1.5 h-1.5 rounded-full bg-[var(--league-primary)] scale-0 group-hover:scale-100 transition-transform duration-300"
      />
      <span className="relative">
        {children}
        {/* Animated underline */}
        <span className="absolute bottom-0 left-0 w-0 h-[1px] bg-[var(--league-primary)] transition-all duration-300 group-hover:w-full" />
      </span>
    </Link>
  );
}
