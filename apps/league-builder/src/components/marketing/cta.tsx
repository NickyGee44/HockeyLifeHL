'use client';

import { Link } from '@/i18n/navigation';

export function CallToAction() {
    return (
        <section id="pricing" className="relative w-full py-32 bg-background border-t border-white/5 overflow-hidden">
            {/* Background Lights */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-accent/10 blur-[120px] rounded-full pointer-events-none" />

            <div className="relative z-10 max-w-4xl mx-auto px-6 text-center">
                <h2 className="font-heading text-5xl md:text-7xl font-bold tracking-tight text-white uppercase mb-6">
                    Ready to run your <br className="hidden md:block" />
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-ice to-steel">league properly?</span>
                </h2>

                <p className="text-lg md:text-xl text-neutral-400 font-medium mb-12 max-w-2xl mx-auto">
                    See the platform in action. We'll show you exactly how BLH can streamline your next season.
                </p>

                <Link
                    href="/signup"
                    className="group relative inline-flex items-center justify-center px-10 py-5 text-lg font-semibold overflow-hidden rounded-full bg-white text-[#0B1420] hover:scale-[1.03] transition-all duration-300 ease-[cubic-bezier(0.25,0.46,0.45,0.94)] shadow-glow-sm hover:shadow-glow"
                >
                    <span className="relative z-10">Book a Demo</span>
                </Link>
            </div>
        </section>
    );
}
