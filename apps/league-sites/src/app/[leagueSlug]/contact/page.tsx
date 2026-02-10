import { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { MessageSquare, Mail, Phone, MapPin, Globe, Clock, ArrowLeft, ExternalLink } from 'lucide-react';
import { getLeagueBySlug } from '@/lib/data';
import { ContactForm } from '@/components/contact/ContactForm';
import type { League } from '@/lib/types';

interface ContactPageProps {
  params: Promise<{ leagueSlug: string }>;
}

export async function generateMetadata({ params }: ContactPageProps): Promise<Metadata> {
  const { leagueSlug } = await params;
  const league = await getLeagueBySlug(leagueSlug);

  return {
    title: league ? `Contact Us | ${league.name}` : 'Contact Us',
    description: league
      ? `Get in touch with ${league.name}`
      : 'Get in touch with the league',
  };
}

export default async function ContactPage({ params }: ContactPageProps) {
  const { leagueSlug } = await params;
  const league = await getLeagueBySlug(leagueSlug);

  if (!league) return null;

  const hasContactInfo =
    league.contact_email || league.contact_phone || league.website_url || league.address;

  return (
    <div className="container mx-auto px-4 py-8 animate-fade-in">
      {/* Back Link */}
      <Link
        href={`/${leagueSlug}/about`}
        className="inline-flex items-center gap-2 text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] mb-6 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to About
      </Link>

      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="bg-[var(--color-background-elevated)] border border-[var(--color-border)] rounded-2xl p-6 md:p-8 mb-8">
          <div className="flex flex-col sm:flex-row items-center gap-6">
            {/* League Logo */}
            {league.logo_url ? (
              <Image
                src={league.logo_url}
                alt={league.name}
                width={80}
                height={80}
                className="rounded-xl"
              />
            ) : (
              <div
                className="w-20 h-20 rounded-xl flex items-center justify-center text-2xl font-bold"
                style={{
                  backgroundColor: 'var(--league-primary)',
                  color: 'var(--color-background)',
                }}
              >
                {league.name.charAt(0)}
              </div>
            )}

            <div className="text-center sm:text-left">
              <h1 className="text-2xl md:text-3xl font-bold mb-1">Contact {league.name}</h1>
              <p className="text-[var(--color-text-secondary)]">
                Have questions? We&apos;re here to help.
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
          {/* Contact Information */}
          <div className="lg:col-span-2 space-y-6">
            {/* Contact Details Card */}
            <div className="bg-[var(--color-background-elevated)] border border-[var(--color-border)] rounded-xl p-6">
              <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-[var(--league-primary)]" />
                Contact Details
              </h2>

              {hasContactInfo ? (
                <div className="space-y-4">
                  {/* Email */}
                  {league.contact_email && (
                    <a
                      href={`mailto:${league.contact_email}`}
                      className="flex items-start gap-3 p-3 -mx-3 rounded-lg hover:bg-[var(--color-surface-hover)] transition-colors group"
                    >
                      <Mail className="w-5 h-5 text-[var(--league-primary)] mt-0.5" />
                      <div>
                        <div className="text-xs text-[var(--color-text-muted)] uppercase tracking-wide mb-1">
                          Email
                        </div>
                        <div className="font-medium group-hover:text-[var(--league-primary)] transition-colors">
                          {league.contact_email}
                        </div>
                      </div>
                    </a>
                  )}

                  {/* Phone */}
                  {league.contact_phone && (
                    <a
                      href={`tel:${league.contact_phone}`}
                      className="flex items-start gap-3 p-3 -mx-3 rounded-lg hover:bg-[var(--color-surface-hover)] transition-colors group"
                    >
                      <Phone className="w-5 h-5 text-[var(--league-primary)] mt-0.5" />
                      <div>
                        <div className="text-xs text-[var(--color-text-muted)] uppercase tracking-wide mb-1">
                          Phone
                        </div>
                        <div className="font-medium group-hover:text-[var(--league-primary)] transition-colors">
                          {league.contact_phone}
                        </div>
                      </div>
                    </a>
                  )}

                  {/* Website */}
                  {league.website_url && (
                    <a
                      href={league.website_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-start gap-3 p-3 -mx-3 rounded-lg hover:bg-[var(--color-surface-hover)] transition-colors group"
                    >
                      <Globe className="w-5 h-5 text-[var(--league-primary)] mt-0.5" />
                      <div className="flex-1">
                        <div className="text-xs text-[var(--color-text-muted)] uppercase tracking-wide mb-1">
                          Website
                        </div>
                        <div className="font-medium group-hover:text-[var(--league-primary)] transition-colors flex items-center gap-1">
                          {league.website_url.replace(/^https?:\/\//, '')}
                          <ExternalLink className="w-3 h-3" />
                        </div>
                      </div>
                    </a>
                  )}

                  {/* Address */}
                  {(league.address || league.city) && (
                    <div className="flex items-start gap-3 p-3 -mx-3">
                      <MapPin className="w-5 h-5 text-[var(--league-primary)] mt-0.5" />
                      <div>
                        <div className="text-xs text-[var(--color-text-muted)] uppercase tracking-wide mb-1">
                          Location
                        </div>
                        <div className="font-medium whitespace-pre-line">
                          {formatAddress(league)}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-[var(--color-text-muted)] text-sm">
                  Contact information not available.
                </p>
              )}
            </div>

            {/* Response Time */}
            <div className="bg-[var(--color-background-elevated)] border border-[var(--color-border)] rounded-xl p-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-[var(--league-primary)]/20 flex items-center justify-center">
                  <Clock className="w-5 h-5 text-[var(--league-primary)]" />
                </div>
                <div>
                  <div className="font-semibold">Response Time</div>
                  <div className="text-sm text-[var(--color-text-secondary)]">
                    Usually within 24-48 hours
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Contact Form */}
          <div className="lg:col-span-3">
            <div className="bg-[var(--color-background-elevated)] border border-[var(--color-border)] rounded-xl p-6">
              <h2 className="text-lg font-bold mb-4">Send a Message</h2>
              <ContactForm
                leagueId={league.id}
                leagueEmail={league.contact_email || undefined}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
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
