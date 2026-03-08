import { Barlow_Condensed, Cormorant_Garamond, IBM_Plex_Mono } from 'next/font/google';
import '../globals.css';

const barlowCondensed = Barlow_Condensed({
    subsets: ['latin'],
    weight: ['400', '500', '600', '700'],
    variable: '--font-heading',
});

const cormorant = Cormorant_Garamond({
    subsets: ['latin'],
    weight: ['400', '500', '600', '700'],
    style: ['normal', 'italic'],
    variable: '--font-drama',
});

const mono = IBM_Plex_Mono({
    subsets: ['latin'],
    weight: ['400', '500', '600'],
    variable: '--font-mono',
});

export default function MarketingLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div
            className={`${barlowCondensed.variable} ${cormorant.variable} ${mono.variable} font-sans min-h-screen bg-background text-foreground`}
        >
            {/* Global CSS Noise Overlay */}
            <div className="noise-overlay" aria-hidden="true">
                <svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" preserveAspectRatio="none">
                    <filter id="noiseFilter">
                        <feTurbulence type="fractalNoise" baseFrequency="0.65" numOctaves="3" stitchTiles="stitch" />
                    </filter>
                    <rect width="100%" height="100%" filter="url(#noiseFilter)" opacity="0.4" />
                </svg>
            </div>

            {children}
        </div>
    );
}
