'use client';

import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { Users, Calendar, Banknote, ShieldCheck, Activity, ArrowRight, Grid3x3 } from 'lucide-react';

gsap.registerPlugin(ScrollTrigger);

export function Features() {
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const ctx = gsap.context(() => {
            // Staggered reveal for cards on scroll
            gsap.from('.feature-card', {
                scrollTrigger: {
                    trigger: containerRef.current,
                    start: 'top 80%',
                },
                y: 60,
                opacity: 0,
                duration: 1.2,
                stagger: 0.15,
                ease: 'power3.out',
            });
        }, containerRef);

        return () => ctx.revert();
    }, []);

    return (
        <section
            id="platform"
            ref={containerRef}
            className="relative w-full py-32 bg-background-elevated border-t border-white/5"
        >
            <div className="max-w-6xl mx-auto px-6">
                <div className="mb-20 text-center max-w-3xl mx-auto space-y-4">
                    <h2 className="font-heading text-4xl md:text-5xl font-bold tracking-tight text-white uppercase">
                        One platform for the work <br />
                        <span className="text-accent">that actually runs a league.</span>
                    </h2>
                    <p className="text-lg text-neutral-400">
                        BLH connects the commissioner workflow, the player experience, and the public league website in one system built for beer league hockey.
                    </p>
                </div>

                <div className="grid md:grid-cols-3 gap-8">
                    <FeatureCard1 />
                    <FeatureCard2 />
                    <FeatureCard3 />
                </div>
            </div>
        </section>
    );
}

// Card 1: Commissioner Control Stack (Shuffler Mechanic)
function FeatureCard1() {
    const cardRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const ctx = gsap.context(() => {
            // Subtle float animation for the stack
            gsap.to('.stack-item', {
                y: -5,
                duration: 2,
                ease: 'sine.inOut',
                yoyo: true,
                repeat: -1,
                stagger: 0.2,
            });
        }, cardRef);
        return () => ctx.revert();
    }, []);

    return (
        <div ref={cardRef} className="feature-card group surface-premium p-8 flex flex-col h-full card-hover cursor-default">
            <div className="mb-6 flex items-center justify-center h-48 bg-background-sunken rounded-2xl border border-white/5 overflow-hidden relative">
                <div className="absolute inset-x-4 inset-y-8 flex flex-col gap-2 perspective-[1000px]">
                    <div className="stack-item bg-neutral-900 border border-white/10 rounded-lg p-3 flex items-center gap-3 transform rotate-x-12 shrink-0">
                        <Users size={16} className="text-accent" />
                        <span className="flex-1 text-xs font-mono text-white/80">Registrations</span>
                        <div className="w-8 h-2 bg-accent/20 rounded-full" />
                    </div>
                    <div className="stack-item bg-neutral-900 border border-white/10 rounded-lg p-3 flex items-center gap-3 transform rotate-x-12 -mt-4 opacity-80 shrink-0">
                        <Calendar size={16} className="text-ice" />
                        <span className="flex-1 text-xs font-mono text-white/70">Schedules</span>
                        <div className="w-12 h-2 bg-white/20 rounded-full" />
                    </div>
                    <div className="stack-item bg-neutral-900 border border-white/10 rounded-lg p-3 flex items-center gap-3 transform rotate-x-12 -mt-4 opacity-60 shrink-0">
                        <Banknote size={16} className="text-rink-red" />
                        <span className="flex-1 text-xs font-mono text-white/60">Payments</span>
                        <div className="w-10 h-2 bg-rink-red/20 rounded-full" />
                    </div>
                </div>
                <div className="absolute inset-0 bg-gradient-to-t from-background-sunken via-transparent to-transparent z-10" />
            </div>
            <div className="space-y-3 mt-auto">
                <h3 className="text-xl font-bold text-white tracking-tight">Commissioner Operations</h3>
                <p className="text-sm text-neutral-400 leading-relaxed font-medium">
                    Run registrations, teams, schedules, and payment tracking from one commissioner command center instead of scattered spreadsheets and inbox follow-up.
                </p>
            </div>
        </div>
    );
}

// Card 2: Live League Feed (Typewriter Mechanic)
function FeatureCard2() {
    const feedItems = [
        { text: "Sunday division schedule updated", time: "2m ago" },
        { text: "Payment received: Lakeside HC", time: "1hr ago" },
        { text: "Result posted: Wolves 4, Bears 2", time: "Sat, 10:30pm" },
        { text: "Standings refreshed after Friday games", time: "Sat, 8:15pm" }
    ];

    return (
        <div className="feature-card group surface-premium p-8 flex flex-col h-full card-hover cursor-default">
            <div className="mb-6 h-48 bg-background-sunken rounded-2xl border border-white/5 overflow-hidden flex flex-col p-4 relative">
                <div className="flex items-center gap-2 mb-4">
                    <Activity size={14} className="text-accent animate-pulse" />
                    <span className="text-xs font-mono text-neutral-500 uppercase tracking-wider">League Activity</span>
                </div>
                <div className="space-y-3 relative z-10 flex-1 overflow-hidden">
                    {feedItems.map((item, i) => (
                        <div key={i} className="flex items-start gap-3 opacity-80 group-hover:opacity-100 transition-opacity" style={{ transitionDelay: `${i * 100}ms` }}>
                            <div className="w-1 h-1 rounded-full bg-accent mt-2 shrink-0" />
                            <div>
                                <p className="text-xs font-mono text-neutral-300">{item.text}</p>
                                <p className="text-[10px] text-neutral-600 font-mono mt-0.5">{item.time}</p>
                            </div>
                        </div>
                    ))}
                </div>
                <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-background-sunken to-transparent z-20" />
            </div>
            <div className="space-y-3 mt-auto">
                <h3 className="text-xl font-bold text-white tracking-tight">Player Experience</h3>
                <p className="text-sm text-neutral-400 leading-relaxed font-medium">
                    Give players one place for schedules, standings, stats, reminders, and payment status so league information stops living in side chats.
                </p>
            </div>
        </div>
    );
}

// Card 3: Season Launch Scheduler (Grid Mechanic)
function FeatureCard3() {
    return (
        <div className="feature-card group surface-premium p-8 flex flex-col h-full card-hover cursor-default">
            <div className="mb-6 h-48 bg-background-sunken rounded-2xl border border-white/5 overflow-hidden relative flex items-center justify-center">
                <div className="absolute inset-0 opacity-10"
                    style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)', backgroundSize: '20px 20px' }}
                />

                <div className="relative z-10 w-full px-6 flex flex-col gap-3">
                    <div className="flex items-center justify-between p-3 rounded-lg border border-accent/20 bg-accent/5 backdrop-blur-sm group-hover:bg-accent/10 transition-colors">
                        <div className="flex items-center gap-3">
                            <ShieldCheck size={16} className="text-accent" />
                            <span className="text-xs font-mono text-white">Brand the Site</span>
                        </div>
                        <ArrowRight size={14} className="text-neutral-500" />
                    </div>

                    <div className="flex items-center justify-between p-3 rounded-lg border border-white/10 bg-white/5 backdrop-blur-sm ml-4 group-hover:border-white/20 transition-colors">
                        <div className="flex items-center gap-3">
                            <Banknote size={16} className="text-white/70" />
                            <span className="text-xs font-mono text-white/70">Open Registration</span>
                        </div>
                        <ArrowRight size={14} className="text-neutral-600" />
                    </div>

                    <div className="flex items-center justify-between p-3 rounded-lg border border-white/5 bg-white/[0.02] backdrop-blur-sm ml-8">
                        <div className="flex items-center gap-3">
                            <Grid3x3 size={16} className="text-white/40" />
                            <span className="text-xs font-mono text-white/40">Publish Schedules + Stats</span>
                        </div>
                    </div>
                </div>
            </div>
            <div className="space-y-3 mt-auto">
                <h3 className="text-xl font-bold text-white tracking-tight">Public League Website</h3>
                <p className="text-sm text-neutral-400 leading-relaxed font-medium">
                    Publish a branded public league website with schedules, standings, stats, sponsors, and registration entry points without a custom build.
                </p>
            </div>
        </div>
    );
}
