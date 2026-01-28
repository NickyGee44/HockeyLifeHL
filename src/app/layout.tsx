import type { Metadata, Viewport } from "next";
import { Inter, Oswald, JetBrains_Mono } from "next/font/google";
import { ThemeProvider } from "next-themes";
import { Toaster } from "@/components/ui/sonner";
import { ThemeColorManager } from "@/components/layout/ThemeColorManager";
import { QuickActionMenu } from "@/components/ui/quick-action-menu";
import { ServiceWorkerRegister } from "@/components/service-worker-register";
import { currentLeague, platformConfig } from "@/lib/league-config";
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
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'https://beerleaguehockey.ca'),
  title: `${platformConfig.name} | ${platformConfig.slogan}`,
  description: "Authentic infrastructure for adult hockey. Modern drafts, stats, and payments built for the leagues we actually play in.",
  keywords: ["hockey", "beer league", "pond hockey", "league management", "stats", "draft", "Canada"],
  authors: [{ name: platformConfig.name }],
  manifest: "/manifest.json",
  icons: {
    icon: [
      { url: platformConfig.icon, sizes: "any" },
      { url: "/icons/favicon-96x96.png", sizes: "96x96", type: "image/png" },
      { url: "/icons/favicon.svg", type: "image/svg+xml" },
    ],
    apple: [
      { url: "/icons/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
    shortcut: platformConfig.icon,
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: platformConfig.name,
  },
  formatDetection: {
    telephone: false,
  },
  openGraph: {
    title: `${platformConfig.name} | ${platformConfig.slogan}`,
    description: "Authentic infrastructure for adult hockey. Modern drafts, stats, and payments.",
    type: "website",
    locale: "en_CA",
    siteName: platformConfig.name,
    images: [platformConfig.banner],
  },
  twitter: {
    card: "summary_large_image",
    title: `${platformConfig.name} | ${platformConfig.slogan}`,
    description: "Authentic infrastructure for adult hockey.",
    images: [platformConfig.banner],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: platformConfig.colors.rinkBlue },
    { media: "(prefers-color-scheme: dark)", color: "#0B1220" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
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
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          storageKey="hockeylife-theme"
          disableTransitionOnChange
        >
          <ServiceWorkerRegister />
          <ThemeColorManager />
          {children}
          <QuickActionMenu />
          <Toaster richColors position="top-right" />
        </ThemeProvider>
      </body>
    </html>
  );
}
