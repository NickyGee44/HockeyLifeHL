'use client';

import Link from 'next/link';

export function Footer() {
    const currentYear = new Date().getFullYear();

    return (
        <footer className="w-full bg-deep-black pt-20 pb-10 rounded-t-[4rem] border-t border-white/5 relative z-20">
            <div className="max-w-6xl mx-auto px-6">

                <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-16">
                    <div className="md:col-span-2 space-y-6">
                        <Link href="/" className="font-heading font-bold text-3xl tracking-tight text-white hover:text-accent transition-colors block">
                            BLH
                        </Link>
                        <p className="text-neutral-400 font-medium max-w-xs leading-relaxed">
                            Modern hockey league management for registrations, payments, schedules, stats, and branded league websites.
                        </p>
                        <div className="flex items-center gap-3 px-4 py-2 bg-white/5 rounded-full border border-white/10 w-fit">
                            <span className="relative flex h-2.5 w-2.5">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500"></span>
                            </span>
                            <span className="text-xs font-mono text-neutral-400 uppercase tracking-widest">System Operational</span>
                        </div>
                    </div>

                    <div>
                        <h4 className="font-mono text-xs uppercase text-neutral-500 mb-6 tracking-widest">Platform</h4>
                        <ul className="space-y-4 text-sm font-medium text-neutral-400">
                            <li><Link href="/platform" className="hover:text-white transition-colors">For Operators</Link></li>
                            <li><Link href="/for-players" className="hover:text-white transition-colors">For Players</Link></li>
                            <li><Link href="/league-websites" className="hover:text-white transition-colors">League Websites</Link></li>
                            <li><Link href="/pricing" className="hover:text-white transition-colors">Pricing</Link></li>
                            <li><Link href="/book-demo" className="hover:text-accent transition-colors">Book a Demo</Link></li>
                        </ul>
                    </div>

                    <div>
                        <h4 className="font-mono text-xs uppercase text-neutral-500 mb-6 tracking-widest">Legal</h4>
                        <ul className="space-y-4 text-sm font-medium text-neutral-400">
                            <li><Link href="/privacy" className="hover:text-white transition-colors">Privacy Policy</Link></li>
                            <li><Link href="/terms" className="hover:text-white transition-colors">Terms of Service</Link></li>
                            <li><Link href="/contact" className="hover:text-white transition-colors">Contact</Link></li>
                        </ul>
                    </div>
                </div>

                <div className="pt-8 border-t border-white/10 flex flex-col md:flex-row items-center justify-between text-xs font-mono text-neutral-500">
                    <p>© {currentYear} BeerLeagueHockey.ca. All rights reserved.</p>
                    <div className="flex gap-4 mt-4 md:mt-0">
                        <span>Built for the game.</span>
                    </div>
                </div>

            </div>
        </footer>
    );
}
