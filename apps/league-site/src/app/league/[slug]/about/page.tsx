import type { Metadata } from 'next';
import Image from 'next/image';
import { getLeagueBySlug } from '@/lib/data/league';
import { Info, Mail, Phone, MapPin, Globe, Calendar } from 'lucide-react';

type Props = {
  params: Promise<{ slug: string }>;
};

export const metadata: Metadata = {
  title: 'About & Contact',
};

export default async function AboutPage({ params }: Props) {
  const { slug } = await params;
  const league = await getLeagueBySlug(slug);

  if (!league) return null;

  const location = [league.address, league.city, league.stateProvince, league.country]
    .filter(Boolean)
    .join(', ');

  return (
    <div className="container mx-auto px-4 sm:px-6 py-12 animate-fade-up">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold flex items-center gap-3">
          <Info className="w-8 h-8 text-[var(--league-primary)]" />
          About & Contact
        </h1>
      </div>

      <div className="grid gap-8 lg:grid-cols-3">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-8">
          {/* League Info */}
          <section className="bg-[var(--color-surface)] rounded-2xl border border-[var(--color-border)] overflow-hidden">
            {/* Banner */}
            {league.bannerUrl ? (
              <div className="h-48 relative">
                <Image
                  src={league.bannerUrl}
                  alt={league.name}
                  fill
                  className="object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[var(--color-surface)] to-transparent" />
              </div>
            ) : (
              <div
                className="h-48"
                style={{
                  background: `linear-gradient(135deg, ${league.primaryColor}40 0%, ${league.secondaryColor} 100%)`,
                }}
              />
            )}

            <div className="p-6 -mt-16 relative">
              {/* Logo */}
              <div className="mb-6">
                {league.logoUrl ? (
                  <Image
                    src={league.logoUrl}
                    alt={league.name}
                    width={96}
                    height={96}
                    className="rounded-2xl border-4 border-[var(--color-surface)] shadow-lg"
                  />
                ) : (
                  <div
                    className="w-24 h-24 rounded-2xl border-4 border-[var(--color-surface)] shadow-lg flex items-center justify-center text-3xl font-black"
                    style={{
                      backgroundColor: league.primaryColor,
                      color: league.secondaryColor,
                    }}
                  >
                    {league.name.charAt(0)}
                  </div>
                )}
              </div>

              <h2 className="text-2xl font-bold mb-2">{league.name}</h2>
              {league.tagline && (
                <p className="text-lg text-[var(--league-primary)] mb-4">
                  {league.tagline}
                </p>
              )}

              {league.description && (
                <div className="prose prose-invert max-w-none">
                  <p className="text-[var(--color-text-secondary)] whitespace-pre-line">
                    {league.description}
                  </p>
                </div>
              )}
            </div>
          </section>

          {/* League Colors */}
          <section className="bg-[var(--color-surface)] rounded-2xl border border-[var(--color-border)] p-6">
            <h3 className="text-lg font-bold mb-4">League Colors</h3>
            <div className="flex gap-4">
              <div className="text-center">
                <div
                  className="w-16 h-16 rounded-xl border-2 border-[var(--color-border)] mb-2"
                  style={{ backgroundColor: league.primaryColor }}
                />
                <span className="text-xs text-[var(--color-text-secondary)]">
                  Primary
                </span>
                <div className="text-xs text-[var(--color-text-muted)] font-mono">
                  {league.primaryColor}
                </div>
              </div>
              <div className="text-center">
                <div
                  className="w-16 h-16 rounded-xl border-2 border-[var(--color-border)] mb-2"
                  style={{ backgroundColor: league.secondaryColor }}
                />
                <span className="text-xs text-[var(--color-text-secondary)]">
                  Secondary
                </span>
                <div className="text-xs text-[var(--color-text-muted)] font-mono">
                  {league.secondaryColor}
                </div>
              </div>
              {league.accentColor && (
                <div className="text-center">
                  <div
                    className="w-16 h-16 rounded-xl border-2 border-[var(--color-border)] mb-2"
                    style={{ backgroundColor: league.accentColor }}
                  />
                  <span className="text-xs text-[var(--color-text-secondary)]">
                    Accent
                  </span>
                  <div className="text-xs text-[var(--color-text-muted)] font-mono">
                    {league.accentColor}
                  </div>
                </div>
              )}
            </div>
          </section>
        </div>

        {/* Sidebar - Contact Info */}
        <div className="space-y-6">
          {/* Contact Card */}
          <section className="bg-[var(--color-surface)] rounded-2xl border border-[var(--color-border)] p-6">
            <h3 className="text-lg font-bold mb-4">Contact Information</h3>
            <div className="space-y-4">
              {league.contactEmail && (
                <a
                  href={`mailto:${league.contactEmail}`}
                  className="flex items-start gap-3 p-3 rounded-xl bg-[var(--color-background)] hover:bg-[var(--color-surface-hover)] transition-colors"
                >
                  <Mail className="w-5 h-5 text-[var(--league-primary)] mt-0.5" />
                  <div>
                    <div className="text-xs text-[var(--color-text-muted)] uppercase">
                      Email
                    </div>
                    <div className="text-sm break-all">{league.contactEmail}</div>
                  </div>
                </a>
              )}

              {league.contactPhone && (
                <a
                  href={`tel:${league.contactPhone}`}
                  className="flex items-start gap-3 p-3 rounded-xl bg-[var(--color-background)] hover:bg-[var(--color-surface-hover)] transition-colors"
                >
                  <Phone className="w-5 h-5 text-[var(--league-primary)] mt-0.5" />
                  <div>
                    <div className="text-xs text-[var(--color-text-muted)] uppercase">
                      Phone
                    </div>
                    <div className="text-sm">{league.contactPhone}</div>
                  </div>
                </a>
              )}

              {location && (
                <div className="flex items-start gap-3 p-3 rounded-xl bg-[var(--color-background)]">
                  <MapPin className="w-5 h-5 text-[var(--league-primary)] mt-0.5" />
                  <div>
                    <div className="text-xs text-[var(--color-text-muted)] uppercase">
                      Location
                    </div>
                    <div className="text-sm">{location}</div>
                  </div>
                </div>
              )}

              {league.customDomain && league.customDomainVerified && (
                <a
                  href={`https://${league.customDomain}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-start gap-3 p-3 rounded-xl bg-[var(--color-background)] hover:bg-[var(--color-surface-hover)] transition-colors"
                >
                  <Globe className="w-5 h-5 text-[var(--league-primary)] mt-0.5" />
                  <div>
                    <div className="text-xs text-[var(--color-text-muted)] uppercase">
                      Website
                    </div>
                    <div className="text-sm">{league.customDomain}</div>
                  </div>
                </a>
              )}
            </div>
          </section>

          {/* Quick Stats */}
          <section className="bg-[var(--color-surface)] rounded-2xl border border-[var(--color-border)] p-6">
            <h3 className="text-lg font-bold mb-4">League Info</h3>
            <div className="space-y-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-[var(--color-text-secondary)]">League ID</span>
                <span className="font-mono text-xs">{league.slug}</span>
              </div>
              {league.subdomain && (
                <div className="flex items-center justify-between">
                  <span className="text-[var(--color-text-secondary)]">Subdomain</span>
                  <span className="font-mono text-xs">{league.subdomain}</span>
                </div>
              )}
            </div>
          </section>

          {/* CTA */}
          <section className="bg-gradient-to-br from-[var(--league-primary)]/20 to-[var(--color-surface)] rounded-2xl border border-[var(--league-primary)]/30 p-6 text-center">
            <Calendar className="w-8 h-8 mx-auto text-[var(--league-primary)] mb-3" />
            <h3 className="font-bold mb-2">Want to Join?</h3>
            <p className="text-sm text-[var(--color-text-secondary)] mb-4">
              Contact the league to learn about registration and upcoming seasons.
            </p>
            {league.contactEmail && (
              <a
                href={`mailto:${league.contactEmail}?subject=Interest in Joining ${league.name}`}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[var(--league-primary)] text-black font-medium text-sm hover:opacity-90 transition-opacity"
              >
                <Mail className="w-4 h-4" />
                Get in Touch
              </a>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
