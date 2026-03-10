import type { Metadata } from 'next';
import { Barlow_Condensed, IBM_Plex_Mono } from 'next/font/google';
import { Navbar } from '@/components/marketing/navbar';
import { Hero } from '@/components/marketing/hero';
import { ProofStrip } from '@/components/marketing/proof-strip';
import { Features } from '@/components/marketing/features';
import { Philosophy } from '@/components/marketing/philosophy';
import { AudienceSplit } from '@/components/marketing/audience-split';
import { BuyerPaths } from '@/components/marketing/buyer-paths';
import { CallToAction } from '@/components/marketing/cta';
import { Footer } from '@/components/marketing/footer';

export const metadata: Metadata = {
  title: 'The operating system for beer league hockey | BeerLeagueHockey.ca',
  description:
    'BLH gives commissioners one place to run registrations, payments, schedules, standings, stats, and public league websites without spreadsheets, payment chasing, or admin chaos.',
};

const barlowCondensed = Barlow_Condensed({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-heading',
});

const mono = IBM_Plex_Mono({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-mono',
});

export default function HomePage() {
  return (
    <main className={`${barlowCondensed.variable} ${mono.variable} font-sans relative min-h-screen bg-background text-foreground overflow-x-hidden pt-24 md:pt-0`}>
      {/* Global CSS Noise Overlay */}
      <div className="noise-overlay" aria-hidden="true">
        <svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" preserveAspectRatio="none">
          <filter id="noiseFilter">
            <feTurbulence type="fractalNoise" baseFrequency="0.65" numOctaves="3" stitchTiles="stitch" />
          </filter>
          <rect width="100%" height="100%" filter="url(#noiseFilter)" opacity="0.4" />
        </svg>
      </div>

      <Navbar />
      <Hero />
      <ProofStrip />
      <Philosophy />
      <Features />
      <AudienceSplit />
      <BuyerPaths />
      <CallToAction />
      <Footer />
    </main>
  );
}
