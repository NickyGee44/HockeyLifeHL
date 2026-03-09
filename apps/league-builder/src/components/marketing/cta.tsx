'use client';

import { Link } from '@/i18n/navigation';

export function CallToAction() {
    return (
        <section id="pricing" className="relative w-full py-20 md:py-32 bg-background border-t border-white/5 overflow-hidden">
            {/* Background Lights */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-accent/10 blur-[120px] rounded-full pointer-events-none" />

            <div className="relative z-10 max-w-5xl mx-auto px-6 text-center">
                <h2 className="font-heading text-4xl sm:text-5xl md:text-7xl font-bold tracking-tight text-white uppercase mb-6">
                    Pricing that matches <br className="hidden md:block" />
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-ice to-steel">how your league actually operates.</span>
                </h2>

                <p className="text-lg md:text-xl text-neutral-400 font-medium mb-12 max-w-3xl mx-auto">
                    Pricing is based on league size, registration volume, and rollout scope. Setup and migration are quoted separately when needed.
                </p>

                <div className="mb-12 grid gap-4 md:grid-cols-3">
                    {[
                        {
                            title: 'League size',
                            body: 'The commercial model should reflect how many teams and divisions you actually run.',
                        },
                        {
                            title: 'Registration volume',
                            body: 'Fee structure should match how much player registration and payment activity moves through BLH.',
                        },
                        {
                            title: 'Rollout scope',
                            body: 'Setup, migration, and premium services are scoped separately when they are part of the launch.',
                        },
                    ].map((item) => (
                        <div
                            key={item.title}
                            className="rounded-[2rem] border border-white/10 bg-white/[0.03] px-6 py-6 text-left shadow-surface"
                        >
                            <p className="font-mono text-xs uppercase tracking-[0.2em] text-accent">{item.title}</p>
                            <p className="mt-4 text-sm leading-7 text-neutral-300">{item.body}</p>
                        </div>
                    ))}
                </div>

                <p className="text-sm md:text-base text-neutral-500 font-medium mb-10 max-w-3xl mx-auto">
                    If you&apos;re launching a new league or moving an existing one, BLH will recommend the right commercial model based on how your league actually operates.
                </p>

                <div className="flex flex-col items-stretch md:items-center justify-center gap-4 sm:flex-row max-w-md mx-auto sm:max-w-none">
                    <Link
                        href="/register"
                        className="group relative inline-flex items-center justify-center px-6 py-4 md:px-10 md:py-5 text-base md:text-lg font-semibold overflow-hidden rounded-full bg-white text-[#0B1420] hover:scale-[1.03] transition-all duration-300 ease-[cubic-bezier(0.25,0.46,0.45,0.94)] shadow-glow-sm hover:shadow-glow w-full sm:w-auto"
                    >
                        <span className="relative z-10">Create Your League</span>
                    </Link>
                    <Link
                        href="/contact"
                        className="inline-flex items-center justify-center rounded-full border border-white/15 bg-white/5 px-6 py-4 md:px-10 md:py-5 text-base md:text-lg font-semibold text-white transition-all duration-300 hover:-translate-y-[1px] hover:bg-white/10 w-full sm:w-auto"
                    >
                        Talk to Sales
                    </Link>
                </div>
            </div>
        </section>
    );
}
