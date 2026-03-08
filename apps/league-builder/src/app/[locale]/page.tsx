import { Barlow_Condensed, Cormorant_Garamond, IBM_Plex_Mono } from 'next/font/google';
import { Navbar } from '@/components/marketing/navbar';
import { Hero } from '@/components/marketing/hero';
import { Features } from '@/components/marketing/features';
import { Philosophy } from '@/components/marketing/philosophy';
import { Protocol } from '@/components/marketing/protocol';
import { AudienceSplit } from '@/components/marketing/audience-split';
import { CallToAction } from '@/components/marketing/cta';
import { Footer } from '@/components/marketing/footer';

const barlowCondensed = Barlow_Condensed({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-heading',
});

const cormorant = Cormorant_Garamond({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  style: ['normal', 'italic'],
  variable: '--font-drama',
});

const mono = IBM_Plex_Mono({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-mono',
});

export default function HomePage() {
  return (
    <main className={`${barlowCondensed.variable} ${cormorant.variable} ${mono.variable} font-sans relative min-h-screen bg-background text-foreground overflow-x-hidden pt-24 md:pt-0`}>
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
      <Features />
      <Philosophy />
      <Protocol />
      <AudienceSplit />
      <CallToAction />
      <Footer />
    </main>
  );
}
