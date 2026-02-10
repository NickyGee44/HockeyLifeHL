import { Metadata } from 'next';
import Image from 'next/image';
import { Info, Mail, Phone, MapPin, Globe, Calendar, Users, Trophy } from 'lucide-react';
import { getLeagueBySlug, getLeagueStats, getCurrentSeason, getLeagueStaff } from '@/lib/data';
import { SocialLinks } from '@/components/SocialLinks';
import { StaffGrid } from '@/components/about/StaffGrid';
import { RulesContent } from '@/components/about/RulesContent';
import type { League } from '@/lib/types';

interface AboutPageProps {
  params: Promise<{ leagueSlug: string }>;
}

export async function generateMetadata({ params }: AboutPageProps): Promise<Metadata> {
  const { leagueSlug } = await params;
  const league = await getLeagueBySlug(leagueSlug);

  return {
    title: league ? `About | ${league.name}` : 'About',
    description: league
      ? `League information, staff directory, and contact details for ${league.name}`
      : 'League information, staff directory, and contact details',
  };
}

export default async function AboutPage({ params }: AboutPageProps) {
  const { leagueSlug } = await params;
  const league = await getLeagueBySlug(leagueSlug);

  if (!league) return null;

  const [stats, season, staff] = await Promise.all([
    getLeagueStats(league.id),
    getCurrentSeason(league.id),
    getLeagueStaff(league.id),
  ]);

  const rulesContent = (league.settings as Record<string, unknown>)?.rules as string | undefined;

  return (
    <div className="container mx-auto px-4 py-12 animate-fade-in">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl md:text-4xl font-bold flex items-center gap-3 mb-4">
          <Info className="w-8 h-8 text-[var(--league-primary)]" />
          About {league.name}
        </h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-8">
          {/* About Section */}
          <section className="card p-8">
            <div className="flex items-start gap-6">
              {/* League Logo */}
              {league.logo_url ? (
                <Image
                  src={league.logo_url}
                  alt={league.name}
                  width={100}
                  height={100}
                  className="rounded-2xl"
                />
              ) : (
                <div
                  className="w-24 h-24 rounded-2xl flex items-center justify-center text-3xl font-bold flex-shrink-0"
                  style={{
                    backgroundColor: 'var(--league-primary)',
                    color: 'var(--color-background)',
                  }}
                >
                  {league.name.charAt(0)}
                </div>
              )}

              <div>
                <h2 className="text-2xl font-bold mb-4">{league.name}</h2>
                {league.description ? (
                  <p className="text-[var(--color-text-secondary)] whitespace-pre-line">
                    {league.description}
                  </p>
                ) : (
                  <p className="text-[var(--color-text-muted)] italic">
                    No description available.
                  </p>
                )}
              </div>
            </div>
          </section>

          {/* League Stats */}
          <section className="card p-8">
            <h3 className="text-xl font-bold mb-6">League Statistics</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              <StatBox
                icon={<Users className="w-6 h-6" />}
                value={stats.totalTeams}
                label="Teams"
              />
              <StatBox
                icon={<Users className="w-6 h-6" />}
                value={stats.totalPlayers}
                label="Players"
              />
              <StatBox
                icon={<Calendar className="w-6 h-6" />}
                value={stats.totalGames}
                label="Total Games"
              />
              <StatBox
                icon={<Trophy className="w-6 h-6" />}
                value={stats.gamesPlayed}
                label="Games Played"
              />
            </div>

            {season && (
              <div className="mt-6 pt-6 border-t border-[var(--color-border)]">
                <p className="text-[var(--color-text-secondary)]">
                  <strong>Current Season:</strong> {season.name}
                </p>
              </div>
            )}
          </section>

          {/* Staff Directory */}
          {staff.length > 0 && (
            <section>
              <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
                <Users className="w-6 h-6 text-[var(--league-primary)]" />
                Staff Directory
              </h2>
              <StaffGrid staff={staff} />
            </section>
          )}

          {/* League Rules */}
          {rulesContent && (
            <section className="card p-8">
              <h2 className="text-2xl font-bold mb-6">League Rules</h2>
              <RulesContent content={rulesContent} />
            </section>
          )}
        </div>

        {/* Sidebar - Contact Info */}
        <div className="space-y-6">
          {/* Contact Card */}
          <section className="card p-6">
            <h3 className="text-lg font-bold mb-4">Contact Information</h3>

            <div className="space-y-4">
              {/* Email */}
              {league.contact_email && (
                <ContactItem
                  icon={<Mail className="w-5 h-5" />}
                  label="Email"
                  value={league.contact_email}
                  href={`mailto:${league.contact_email}`}
                />
              )}

              {/* Phone */}
              {league.contact_phone && (
                <ContactItem
                  icon={<Phone className="w-5 h-5" />}
                  label="Phone"
                  value={league.contact_phone}
                  href={`tel:${league.contact_phone}`}
                />
              )}

              {/* Website */}
              {league.website_url && (
                <ContactItem
                  icon={<Globe className="w-5 h-5" />}
                  label="Website"
                  value={league.website_url.replace(/^https?:\/\//, '')}
                  href={league.website_url}
                  external
                />
              )}

              {/* Address */}
              {(league.address || league.city) && (
                <ContactItem
                  icon={<MapPin className="w-5 h-5" />}
                  label="Location"
                  value={formatAddress(league)}
                />
              )}

              {/* No contact info */}
              {!league.contact_email &&
                !league.contact_phone &&
                !league.website_url &&
                !league.address && (
                  <p className="text-[var(--color-text-muted)] text-sm italic">
                    No contact information available.
                  </p>
                )}
            </div>
          </section>

          {/* Social Links */}
          {league.settings?.website && (
            <section className="card p-6">
              <h3 className="text-lg font-bold mb-4">Follow Us</h3>
              <SocialLinks settings={league.settings.website} size="md" />
            </section>
          )}

          {/* Quick Links */}
          <section className="card p-6">
            <h3 className="text-lg font-bold mb-4">Quick Links</h3>
            <nav className="space-y-2">
              <QuickLink href={`/${leagueSlug}/schedule`} label="View Schedule" />
              <QuickLink href={`/${leagueSlug}/standings`} label="Check Standings" />
              <QuickLink href={`/${leagueSlug}/teams`} label="Browse Teams" />
              <QuickLink href={`/${leagueSlug}/stats`} label="Stats Leaders" />
            </nav>
          </section>

          {/* Powered By */}
          <div className="text-center py-4">
            <p className="text-sm text-[var(--color-text-muted)]">
              Powered by{' '}
              <a
                href="https://beerleaguehockey.ca"
                target="_blank"
                rel="noopener noreferrer"
                className="text-gold-500 hover:text-gold-400 font-medium"
              >
                Beer League Hockey
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatBox({
  icon,
  value,
  label,
}: {
  icon: React.ReactNode;
  value: number;
  label: string;
}) {
  return (
    <div className="text-center">
      <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-[var(--league-primary)]/10 text-[var(--league-primary)] mb-3">
        {icon}
      </div>
      <div className="text-2xl font-bold">{value}</div>
      <div className="text-sm text-[var(--color-text-secondary)]">{label}</div>
    </div>
  );
}

function ContactItem({
  icon,
  label,
  value,
  href,
  external,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  href?: string;
  external?: boolean;
}) {
  const content = (
    <div className="flex items-start gap-3">
      <span className="text-[var(--league-primary)] mt-0.5">{icon}</span>
      <div>
        <div className="text-xs text-[var(--color-text-muted)] uppercase tracking-wide">
          {label}
        </div>
        <div className="font-medium">{value}</div>
      </div>
    </div>
  );

  if (href) {
    return (
      <a
        href={href}
        target={external ? '_blank' : undefined}
        rel={external ? 'noopener noreferrer' : undefined}
        className="block hover:bg-[var(--color-surface-hover)] -mx-2 px-2 py-2 rounded-lg transition-colors"
      >
        {content}
      </a>
    );
  }

  return <div className="py-2">{content}</div>;
}

function QuickLink({ href, label }: { href: string; label: string }) {
  return (
    <a
      href={href}
      className="block px-3 py-2 rounded-lg text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-surface-hover)] transition-colors"
    >
      {label}
    </a>
  );
}

function formatAddress(league: Pick<League, 'address' | 'city' | 'state' | 'zip_code'>): string {
  const parts = [];
  if (league.address) parts.push(league.address);
  const cityState = [league.city, league.state].filter(Boolean).join(', ');
  if (cityState) parts.push(cityState);
  if (league.zip_code) parts.push(league.zip_code);
  return parts.join('\n') || 'Location not specified';
}
