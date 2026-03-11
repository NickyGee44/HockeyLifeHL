'use client';

import { ArrowRight } from 'lucide-react';
import { Link } from '@/i18n/navigation';

export function BuyerPaths() {
    return (
        <section id="migration" className="relative w-full py-32 bg-background-elevated border-t border-white/5">
            <div className="max-w-6xl mx-auto px-6">
                <div className="max-w-3xl space-y-4">
                    <p className="font-mono text-xs uppercase tracking-[0.24em] text-accent">
                        New League Or Existing League
                    </p>
                    <h2 className="font-heading text-4xl md:text-5xl font-bold tracking-tight text-white uppercase">
                        Start clean or move an established league <span className="text-accent">without guessing the rollout.</span>
                    </h2>
                    <p className="text-lg text-neutral-400 font-medium">
                        BLH works for new launches and existing leagues. Use the right path for your season, then scope setup, migration, and rollout based on how your league actually operates.
                    </p>
                </div>

                <div className="mt-14 grid gap-8 md:grid-cols-2">
                    <div className="surface-premium rounded-[2.5rem] border border-white/10 p-10">
                        <p className="font-mono text-xs uppercase tracking-[0.2em] text-ice">Launching a new league</p>
                        <h3 className="mt-3 text-3xl font-bold text-white tracking-tight">
                            Set up registrations, payments, schedules, and your public site in one system.
                        </h3>
                        <ul className="mt-8 space-y-4 text-neutral-300 font-medium">
                            <li>Open registration and collect fees from the same workflow.</li>
                            <li>Configure teams, schedules, standings, and stats without a patchwork stack.</li>
                            <li>Launch a branded public league website alongside operations, not after.</li>
                        </ul>
                        <Link
                            href="/book-demo"
                            className="group mt-10 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-6 py-3 text-sm font-semibold text-white transition-all duration-300 hover:-translate-y-[1px] hover:bg-white/10"
                        >
                            Book a Demo
                            <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-0.5" />
                        </Link>
                    </div>

                    <div className="surface-premium rounded-[2.5rem] border border-accent/20 bg-gradient-to-br from-accent/10 to-transparent p-10">
                        <p className="font-mono text-xs uppercase tracking-[0.2em] text-accent">Running an existing league</p>
                        <h3 className="mt-3 text-3xl font-bold text-white tracking-tight">
                            Plan the migration before you move teams, schedules, stats, and public league history.
                        </h3>
                        <ul className="mt-8 space-y-4 text-neutral-300 font-medium">
                            <li>Scope the move from your current website, spreadsheets, or registration stack.</li>
                            <li>Decide what needs to come over now and what can be phased in later.</li>
                            <li>Align setup, migration, and rollout timing before the next season opens.</li>
                        </ul>
                        <Link
                            href="/book-demo"
                            className="group mt-10 inline-flex items-center gap-2 rounded-full bg-accent px-6 py-3 text-sm font-semibold text-accent-foreground transition-all duration-300 hover:scale-[1.03]"
                        >
                            Plan Your Migration
                            <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-0.5" />
                        </Link>
                    </div>
                </div>
            </div>
        </section>
    );
}
