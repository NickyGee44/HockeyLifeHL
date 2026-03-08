'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';

export function Navbar() {
    const [scrolled, setScrolled] = useState(false);

    useEffect(() => {
        const handleScroll = () => {
            setScrolled(window.scrollY > 50);
        };

        window.addEventListener('scroll', handleScroll, { passive: true });
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    return (
        <header
            className={`fixed top-6 left-1/2 -translate-x-1/2 z-50 w-full max-w-5xl px-6 py-4 rounded-[2rem] transition-all duration-300 ease-[cubic-bezier(0.25,0.46,0.45,0.94)] flex items-center justify-between
        ${scrolled ? 'bg-background/80 backdrop-blur-xl border border-border shadow-surface' : 'bg-transparent border-transparent'}
      `}
        >
            <Link href="/" className="font-heading font-bold text-2xl tracking-tight text-text-primary hover:-translate-y-[1px] transition-transform flex-shrink-0">
                BLH
            </Link>

            <nav className="hidden md:flex items-center gap-8">
                {[
                    { label: 'Platform', href: '/platform' },
                    { label: 'For Players', href: '/for-players' },
                    { label: 'League Websites', href: '/league-websites' },
                    { label: 'Pricing', href: '/pricing' }
                ].map((link) => (
                    <Link
                        key={link.label}
                        href={link.href}
                        className="text-sm font-medium text-text-secondary hover:text-text-primary transition-colors hover:-translate-y-[1px] transform"
                    >
                        {link.label}
                    </Link>
                ))}
            </nav>

            <div className="flex-shrink-0">
                <Link
                    href="/book-demo"
                    className="group relative inline-flex items-center justify-center px-6 py-2.5 text-sm font-semibold overflow-hidden rounded-full bg-surface-solid border border-border text-text-primary hover:border-accent hover:text-accent-foreground hover:scale-[1.03] transition-all duration-300 ease-[cubic-bezier(0.25,0.46,0.45,0.94)] shadow-sm hover:shadow-glow-sm"
                >
                    <span className="relative z-10">Book a Demo</span>
                    <span className="absolute inset-0 z-0 scale-x-0 bg-accent transition-transform duration-300 ease-[cubic-bezier(0.25,0.46,0.45,0.94)] origin-left group-hover:scale-x-100" />
                </Link>
            </div>
        </header>
    );
}
