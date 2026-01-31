import Link from 'next/link';
import type { League } from '@/lib/types';

interface LeagueFooterProps {
  league: League;
  leagueSlug: string;
}

export function LeagueFooter({ league, leagueSlug }: LeagueFooterProps) {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="border-t border-[var(--color-border)] bg-[var(--color-background)]">
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* League Info */}
          <div className="md:col-span-2">
            <h3 className="font-bold text-lg mb-4">{league.name}</h3>
            {league.description && (
              <p className="text-[var(--color-text-secondary)] mb-4 max-w-md">
                {league.description}
              </p>
            )}
            {league.contact_email && (
              <a
                href={`mailto:${league.contact_email}`}
                className="text-[var(--league-primary)] hover:underline"
              >
                {league.contact_email}
              </a>
            )}
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="font-semibold mb-4">Quick Links</h4>
            <nav className="flex flex-col gap-2">
              <Link
                href={`/${leagueSlug}/schedule`}
                className="text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors"
              >
                Schedule
              </Link>
              <Link
                href={`/${leagueSlug}/standings`}
                className="text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors"
              >
                Standings
              </Link>
              <Link
                href={`/${leagueSlug}/teams`}
                className="text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors"
              >
                Teams
              </Link>
              <Link
                href={`/${leagueSlug}/stats`}
                className="text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors"
              >
                Stats Leaders
              </Link>
            </nav>
          </div>

          {/* Contact */}
          <div>
            <h4 className="font-semibold mb-4">Contact</h4>
            <address className="text-[var(--color-text-secondary)] not-italic space-y-1">
              {league.address && <p>{league.address}</p>}
              {(league.city || league.state || league.zip_code) && (
                <p>
                  {league.city && `${league.city}, `}
                  {league.state} {league.zip_code}
                </p>
              )}
              {league.contact_phone && <p>{league.contact_phone}</p>}
            </address>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-12 pt-8 border-t border-[var(--color-border)] flex flex-col sm:flex-row justify-between items-center gap-4">
          <p className="text-sm text-[var(--color-text-muted)]">
            &copy; {currentYear} {league.name}. All rights reserved.
          </p>
          <p className="text-sm text-[var(--color-text-muted)]">
            Powered by{' '}
            <a
              href="https://hockeylifehl.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-gold-500 hover:text-gold-400 transition-colors"
            >
              HockeyLifeHL
            </a>
          </p>
        </div>
      </div>
    </footer>
  );
}
