'use client';

import { Suspense } from 'react';
import {
  HeroSection,
  TrustIndicators,
  ThreePillars,
  ProductModules,
  PricingValueProp,
  FinalCTA,
  Footer,
} from '@/components/home';

// Loading fallback for below-fold sections
function SectionSkeleton() {
  return (
    <div className="py-24 px-6">
      <div className="max-w-6xl mx-auto">
        <div className="h-8 w-64 bg-neutral-800 rounded animate-pulse mx-auto mb-8" />
        <div className="grid md:grid-cols-3 gap-8">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-64 bg-neutral-800/50 rounded-2xl animate-pulse" />
          ))}
        </div>
      </div>
    </div>
  );
}

export default function HomePage() {
  return (
    <div className="min-h-screen bg-neutral-950">
      {/* Hero - Always loaded first */}
      <HeroSection />

      {/* Trust Indicators */}
      <TrustIndicators />

      {/* Three Pillars */}
      <Suspense fallback={<SectionSkeleton />}>
        <ThreePillars />
      </Suspense>

      {/* Product Modules */}
      <Suspense fallback={<SectionSkeleton />}>
        <ProductModules />
      </Suspense>

      {/* Pricing Value Prop */}
      <Suspense fallback={<SectionSkeleton />}>
        <PricingValueProp />
      </Suspense>

      {/* Final CTA */}
      <FinalCTA />

      {/* Footer */}
      <Footer />
    </div>
  );
}
