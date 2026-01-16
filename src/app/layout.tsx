import type { Metadata, Viewport } from "next";
import { Inter, Oswald, JetBrains_Mono } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const oswald = Oswald({
  variable: "--font-oswald",
  subsets: ["latin"],
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "HockeyLifeHL | For Fun, For Beers, For Glory",
  description: "The ultimate men's recreational hockey league management platform. Stats, drafts, standings, and glory.",
  keywords: ["hockey", "league", "stats", "draft", "recreational", "Canada"],
  authors: [{ name: "HockeyLifeHL" }],
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "HockeyLifeHL",
  },
  formatDetection: {
    telephone: false,
  },
  openGraph: {
    title: "HockeyLifeHL | For Fun, For Beers, For Glory",
    description: "The ultimate men's recreational hockey league management platform.",
    type: "website",
    locale: "en_CA",
    siteName: "HockeyLifeHL",
  },
  twitter: {
    card: "summary_large_image",
    title: "HockeyLifeHL | For Fun, For Beers, For Glory",
    description: "The ultimate men's recreational hockey league management platform.",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#E31837" },
    { media: "(prefers-color-scheme: dark)", color: "#0F0F14" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <head>
        {/* Favicon */}
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="icon" type="image/svg+xml" href="/icons/favicon.svg" />
        <link rel="icon" type="image/png" sizes="96x96" href="/icons/favicon-96x96.png" />
        
        {/* PWA Meta Tags */}
        <link rel="apple-touch-icon" sizes="180x180" href="/icons/apple-touch-icon.png" />
        <link rel="manifest" href="/manifest.json" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="mobile-web-app-capable" content="yes" />
      </head>
      <body
        className={`${inter.variable} ${oswald.variable} ${jetbrainsMono.variable} antialiased bg-background text-foreground`}
      >
        {children}
        <Toaster richColors position="top-right" />
      </body>
    </html>
  );
}
