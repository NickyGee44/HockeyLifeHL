'use client';

import Link from 'next/link';
import { useLeague } from './league-provider';
import { Mail, Phone, MapPin } from 'lucide-react';

export function SiteFooter() {
  const league = useLeague();
  const basePath = `/league/${league.slug}`;

  const location = [league.city, league.stateProvince, league.country]
    .filter(Boolean)
    .join(', ');

  return (
    <footer className="bg-[var(--color-surface)] border-t border-[var(--color-border)]">
      <div className="container mx-auto px-4 sm:px-6 py-12">
        <div className="grid gap-8 md:grid-cols-3">
          {/* League Info */}
          <div>
            <h3 className="font-bold text-lg mb-4">{league.name}</h3>
            {league.tagline && (
              <p className="text-[var(--color-text-secondary)] text-sm mb-4">
                {league.tagline}
              </p>
            )}
            {league.description && (
              <p className="text-[var(--color-text-secondary)] text-sm line-clamp-3">
                {league.description}
              </p>
            )}
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="font-bold text-lg mb-4">Quick Links</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link
                  href={`${basePath}/schedule`}
                  className="text-[var(--color-text-secondary)] hover:text-[var(--league-primary)] transition-colors"
                >
                  Game Schedule
                </Link>
              </li>
              <li>
                <Link
                  href={`${basePath}/standings`}
                  className="text-[var(--color-text-secondary)] hover:text-[var(--league-primary)] transition-colors"
                >
                  Standings
                </Link>
              </li>
              <li>
                <Link
                  href={`${basePath}/teams`}
                  className="text-[var(--color-text-secondary)] hover:text-[var(--league-primary)] transition-colors"
                >
                  Teams
                </Link>
              </li>
              <li>
                <Link
                  href={`${basePath}/stats`}
                  className="text-[var(--color-text-secondary)] hover:text-[var(--league-primary)] transition-colors"
                >
                  Stats Leaders
                </Link>
              </li>
              <li>
                <Link
                  href={`${basePath}/about`}
                  className="text-[var(--color-text-secondary)] hover:text-[var(--league-primary)] transition-colors"
                >
                  About & Contact
                </Link>
              </li>
            </ul>
          </div>

          {/* Contact Info */}
          <div>
            <h3 className="font-bold text-lg mb-4">Contact</h3>
            <ul className="space-y-3 text-sm">
              {league.contactEmail && (
                <li className="flex items-center gap-2 text-[var(--color-text-secondary)]">
                  <Mail className="w-4 h-4 text-[var(--league-primary)]" />
                  <a
                    href={`mailto:${league.contactEmail}`}
                    className="hover:text-[var(--league-primary)] transition-colors"
                  >
                    {league.contactEmail}
                  </a>
                </li>
              )}
              {league.contactPhone && (
                <li className="flex items-center gap-2 text-[var(--color-text-secondary)]">
                  <Phone className="w-4 h-4 text-[var(--league-primary)]" />
                  <a
                    href={`tel:${league.contactPhone}`}
                    className="hover:text-[var(--league-primary)] transition-colors"
                  >
                    {league.contactPhone}
                  </a>
                </li>
              )}
              {location && (
                <li className="flex items-center gap-2 text-[var(--color-text-secondary)]">
                  <MapPin className="w-4 h-4 text-[var(--league-primary)]" />
                  <span>{location}</span>
                </li>
              )}
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-12 pt-8 border-t border-[var(--color-border)] flex flex-col sm:flex-row justify-between items-center gap-4">
          <p className="text-xs text-[var(--color-text-muted)]">
            &copy; {new Date().getFullYear()} {league.name}. All rights reserved.
          </p>
          <p className="text-xs text-[var(--color-text-muted)]">
            Powered by{' '}
            <a
              href="https://hockeylife.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[var(--color-accent)] hover:underline"
            >
              HockeyLifeHL
            </a>
          </p>
        </div>
      </div>
    </footer>
  );
}
