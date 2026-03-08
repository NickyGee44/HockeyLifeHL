'use client';

import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { Link } from '@/i18n/navigation';

export function Hero() {
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const ctx = gsap.context(() => {
            // Staggered fade up for text elements
            gsap.from('.hero-element', {
                y: 40,
                opacity: 0,
                duration: 1.2,
                stagger: 0.1,
                ease: 'power3.out',
                delay: 0.2,
            });

            // Subtle scale in for the background video wrapper
            gsap.from('.hero-bg', {
                scale: 1.05,
                duration: 2.5,
                ease: 'power2.out',
            });
        }, containerRef);

        return () => ctx.revert();
    }, []);

    return (
        <section
            ref={containerRef}
            className="relative w-full h-[100dvh] min-h-[600px] flex items-end justify-start overflow-hidden bg-background"
        >
            {/* Background Image & Overlays */}
            <div className="absolute inset-0 z-0 overflow-hidden bg-[#05080d]">
                <div className="hero-bg absolute inset-0 w-full h-full opacity-50">
                    <video
                        autoPlay
                        muted
                        loop
                        playsInline
                        className="absolute inset-0 h-full w-full object-cover object-center"
                    >
                        <source src="/hero-video.mp4" type="video/mp4" />
                    </video>
                </div>

                {/* Gradients to push focus to bottom left */}
                <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-transparent" />
                <div className="absolute inset-0 bg-gradient-to-r from-[#0B1420]/90 via-[#0B1420]/40 to-transparent" />
            </div>

            {/* Content */}
            <div className="relative z-10 w-full max-w-6xl mx-auto px-6 pb-24 md:pb-32">
                <div className="max-w-3xl space-y-6">
                    <h1 className="hero-element font-heading text-5xl md:text-7xl lg:text-8xl font-bold tracking-tight text-white leading-[0.9]">
                        THE OPERATING SYSTEM <br className="hidden md:block" />
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-ice to-steel">FOR BEER LEAGUE HOCKEY.</span>
                    </h1>

                    <p className="hero-element text-lg md:text-xl text-neutral-300 max-w-xl font-medium leading-relaxed">
                        BLH gives commissioners one place to run registrations, payments, schedules, standings, stats, and public league websites without spreadsheets, payment chasing, or admin chaos.
                    </p>

                    <div className="hero-element flex flex-col sm:flex-row items-start sm:items-center gap-4 pt-4">
                        <Link
                            href="/book-demo"
                            className="group relative inline-flex items-center justify-center px-8 py-4 text-base font-semibold overflow-hidden rounded-full bg-white text-[#0B1420] hover:scale-[1.03] transition-all duration-300 ease-[cubic-bezier(0.25,0.46,0.45,0.94)] shadow-glow-sm hover:shadow-glow"
                        >
                            <span className="relative z-10">Book a Demo</span>
                        </Link>

                        <a
                            href="#platform"
                            className="inline-flex items-center justify-center px-8 py-4 text-base font-semibold text-white border border-white/20 rounded-full hover:bg-white/10 hover:-translate-y-[1px] transition-all duration-300"
                        >
                            See How It Works
                        </a>
                    </div>

                    <p className="hero-element text-sm font-medium text-neutral-400">
                        Running an existing league?{' '}
                        <a href="#migration" className="text-ice underline decoration-white/30 underline-offset-4 transition-colors hover:text-white">
                            Plan your migration.
                        </a>
                    </p>

                    <div className="hero-element flex flex-wrap gap-2 pt-8">
                        {['Registrations', 'Payments', 'Schedules', 'Standings', 'Public Websites'].map((chip) => (
                            <span
                                key={chip}
                                className="px-3 py-1 text-xs font-mono text-neutral-400 bg-white/5 border border-white/10 rounded-full backdrop-blur-sm"
                            >
                                {chip}
                            </span>
                        ))}
                    </div>
                </div>
            </div>
        </section>
    );
}
