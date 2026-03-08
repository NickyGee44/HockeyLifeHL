'use client';

import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

const protocolSteps = [
    {
        step: '01',
        title: 'Launch Registration',
        description: 'Set up your league, collect fees, and give players a clean signup flow.',
        color: 'border-accent/30 bg-accent/5',
        icon: (
            <svg className="w-16 h-16 text-accent animate-spin-slow" viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="50" cy="50" r="40" strokeDasharray="4 4" />
                <circle cx="50" cy="50" r="20" />
                <path d="M50 30 V70 M30 50 H70" opacity="0.5" />
            </svg>
        )
    },
    {
        step: '02',
        title: 'Run the Season',
        description: 'Manage schedules, rosters, standings, stats, and weekly operations from one system.',
        color: 'border-ice/30 bg-ice/5',
        icon: (
            <div className="relative w-16 h-16 border-2 border-ice rounded-lg overflow-hidden flex items-center justify-center">
                <div className="absolute inset-0 bg-gradient-to-t from-ice/20 to-transparent" />
                <div className="w-full h-[2px] bg-ice absolute top-0 animate-scan" style={{ top: '50%' }} />
                <div className="grid grid-cols-3 gap-1 p-2 w-full h-full opacity-50">
                    {[...Array(9)].map((_, i) => <div key={i} className="bg-ice rounded-sm" />)}
                </div>
            </div>
        )
    },
    {
        step: '03',
        title: 'Give the League a Home',
        description: 'Publish branded public league websites with schedules, standings, stats, news, and sponsor space.',
        color: 'border-white/30 bg-white/5',
        icon: (
            <svg className="w-16 h-16 text-white" viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M10 50 L30 50 L40 20 L60 80 L70 50 L90 50" className="animate-pulse" />
            </svg>
        )
    }
];

export function Protocol() {
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const ctx = gsap.context(() => {
            const cards = gsap.utils.toArray('.protocol-card') as HTMLElement[];

            cards.forEach((card, i) => {
                if (i === cards.length - 1) return; // Skip last card for stacking out

                // When the next card comes up, scale and blur the current one
                ScrollTrigger.create({
                    trigger: card,
                    start: 'top top',
                    pin: true,
                    pinSpacing: false,
                    endTrigger: cards[i + 1],
                    end: 'top top',
                    animation: gsap.to(card, {
                        scale: 0.9,
                        opacity: 0.5,
                        filter: 'blur(20px)',
                        ease: 'none',
                    }),
                    scrub: true,
                });
            });
        }, containerRef);

        return () => ctx.revert();
    }, []);

    return (
        <section
            id="league-websites"
            ref={containerRef}
            className="relative w-full bg-background pt-32 pb-64"
        >
            <div className="text-center mb-24 sticky top-12 z-10 px-6">
                <h2 className="font-heading text-4xl md:text-6xl font-bold tracking-tight text-white uppercase">
                    From Signup <span className="text-neutral-500">to</span> Opening Night
                </h2>
            </div>

            <div className="relative w-full max-w-4xl mx-auto px-6">
                {protocolSteps.map((step, idx) => (
                    <div
                        key={step.step}
                        className="protocol-card w-full h-[60vh] min-h-[400px] mb-20 last:mb-0 flex items-center justify-center"
                    >
                        <div className={`w-full h-full surface-premium rounded-[3rem] p-10 md:p-16 flex flex-col md:flex-row items-center gap-12 border ${step.color} shadow-2xl`}>

                            <div className="flex-1 space-y-6 text-center md:text-left">
                                <div className="inline-block px-4 py-1 rounded-full border border-white/10 bg-white/5 text-sm font-mono text-white/60 mb-4">
                                    Phase {step.step}
                                </div>
                                <h3 className="text-3xl md:text-5xl font-bold text-white tracking-tight">{step.title}</h3>
                                <p className="text-lg text-neutral-400 font-medium leading-relaxed max-w-lg">
                                    {step.description}
                                </p>
                            </div>

                            <div className="w-48 h-48 rounded-[2rem] bg-neutral-900 border border-white/10 flex items-center justify-center shrink-0 shadow-inner">
                                {step.icon}
                            </div>

                        </div>
                    </div>
                ))}
            </div>
        </section>
    );
}
