'use client';

import { Suspense } from 'react';
import { Navbar } from '@/components/marketing/navbar';
import { Hero } from '@/components/marketing/hero';
import { Features } from '@/components/marketing/features';
import { Philosophy } from '@/components/marketing/philosophy';
import { Protocol } from '@/components/marketing/protocol';
import { AudienceSplit } from '@/components/marketing/audience-split';
import { CallToAction } from '@/components/marketing/cta';
import { Footer } from '@/components/marketing/footer';

export default function MarketingHomePage() {
    return (
        <main className="relative min-h-screen bg-background text-foreground overflow-x-hidden pt-24 md:pt-0">
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
