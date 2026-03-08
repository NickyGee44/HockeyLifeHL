'use client';

import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

export function Philosophy() {
    const containerRef = useRef<HTMLDivElement>(null);
    const textRef1 = useRef<HTMLHeadingElement>(null);
    const textRef2 = useRef<HTMLHeadingElement>(null);

    useEffect(() => {
        const ctx = gsap.context(() => {
            // Background parallax
            gsap.to('.philosophy-bg', {
                scrollTrigger: {
                    trigger: containerRef.current,
                    start: 'top bottom',
                    end: 'bottom top',
                    scrub: true,
                },
                y: 100,
                ease: 'none',
            });

            // Text reveal for paragraph 1
            const p1Words = textRef1.current?.querySelectorAll('.word');
            if (p1Words) {
                gsap.from(p1Words, {
                    scrollTrigger: {
                        trigger: textRef1.current,
                        start: 'top 80%',
                    },
                    y: 30,
                    opacity: 0,
                    duration: 1,
                    stagger: 0.05,
                    ease: 'power3.out',
                });
            }

            // Text reveal for paragraph 2
            const p2Words = textRef2.current?.querySelectorAll('.word');
            if (p2Words) {
                gsap.from(p2Words, {
                    scrollTrigger: {
                        trigger: textRef2.current,
                        start: 'top 80%',
                    },
                    y: 40,
                    opacity: 0,
                    duration: 1.2,
                    stagger: 0.08,
                    ease: 'power3.out',
                });
            }
        }, containerRef);

        return () => ctx.revert();
    }, []);

    // Helper to split text into word spans for animation without importing external SplitText plugin
    const splitText = (text: string) => {
        return text.split(' ').map((word, i) => (
            <span key={i} className="word inline-block mr-[0.25em] whitespace-nowrap">
                {word}
            </span>
        ));
    };

    return (
        <section
            id="replace"
            ref={containerRef}
            className="relative w-full py-24 md:py-56 bg-deep-black overflow-hidden flex items-center justify-center"
        >
            {/* Background Texture */}
            <div className="absolute inset-0 z-0 opacity-20 mix-blend-screen pointer-events-none">
                <div
                    className="philosophy-bg absolute inset-[-20%] w-[140%] h-[140%] bg-[url('https://images.unsplash.com/photo-1515781358327-14fa156bcda3?q=80&w=2000&auto=format&fit=crop')] bg-cover bg-center"
                />
                <div className="absolute inset-0 bg-gradient-to-b from-deep-black via-transparent to-deep-black" />
            </div>

            {/* Content */}
            <div className="relative z-10 w-full max-w-5xl mx-auto px-6">
                <div className="max-w-4xl mx-auto space-y-20 text-center md:text-left">
                    <p className="font-mono text-xs uppercase tracking-[0.24em] text-accent text-center md:text-left">
                        What BLH Replaces
                    </p>

                    <h2
                        ref={textRef1}
                        className="font-sans text-xl sm:text-2xl md:text-4xl text-neutral-400 font-medium leading-relaxed md:leading-tight tracking-tight"
                    >
                        {splitText("Most beer league hockey operators are still juggling spreadsheets, payment reminders, schedule edits, stale league websites, and scattered stats.")}
                    </h2>

                    <h3
                        ref={textRef2}
                        className="font-sans text-2xl sm:text-3xl md:text-6xl text-white font-medium leading-tight tracking-tight"
                    >
                        {splitText("BLH replaces the patchwork with")}
                        <br className="hidden md:block" />
                        <span className="inline-block mr-[0.25em] text-accent">one commissioner-first system</span>
                        {splitText("for registrations, payments, schedules, standings, stats, and public league websites.")}
                    </h3>

                </div>
            </div>
        </section>
    );
}
