"use client";

import Link from "next/link";
import Image from "next/image";
import { useLeagueBranding } from "@/components/providers/LeagueThemeProvider";
import { Button } from "@/components/ui/button";
import { Menu, X } from "lucide-react";
import { useState } from "react";

/**
 * League Header Component
 *
 * Displays league branding and navigation for league-specific pages.
 * Uses dynamic branding from LeagueThemeProvider context.
 *
 * Features:
 * - League logo and name from branding
 * - Navigation links (Schedule, Standings, Stats, Teams)
 * - Colors from CSS variables set by LeagueThemeProvider
 * - Responsive mobile menu
 */

export function LeagueHeader() {
  const league = useLeagueBranding();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header
      className="sticky top-0 z-50 w-full border-b bg-white/95 backdrop-blur-md shadow-sm"
      style={{
        borderColor: `${league.primaryColor}20`,
      }}
    >
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          {/* Logo and League Name */}
          <Link href="/" className="flex items-center gap-3 group">
            {league.logoUrl && (
              <Image
                src={league.logoUrl}
                alt={league.name}
                width={48}
                height={48}
                className="h-12 w-auto rounded-lg transition-transform group-hover:scale-105"
              />
            )}
            <span
              className="text-2xl font-bold transition-opacity group-hover:opacity-80 hidden sm:block"
              style={{ color: league.primaryColor }}
            >
              {league.name}
            </span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-8">
            <Link
              href="/schedule"
              className="text-sm font-semibold text-slate-600 hover:text-[var(--league-primary-color)] transition-colors uppercase tracking-wide"
            >
              Schedule
            </Link>
            <Link
              href="/standings"
              className="text-sm font-semibold text-slate-600 hover:text-[var(--league-primary-color)] transition-colors uppercase tracking-wide"
            >
              Standings
            </Link>
            <Link
              href="/stats"
              className="text-sm font-semibold text-slate-600 hover:text-[var(--league-primary-color)] transition-colors uppercase tracking-wide"
            >
              Stats
            </Link>
            <Link
              href="/teams"
              className="text-sm font-semibold text-slate-600 hover:text-[var(--league-primary-color)] transition-colors uppercase tracking-wide"
            >
              Teams
            </Link>
          </nav>

          {/* Action Buttons */}
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              className="hidden sm:flex"
              asChild
            >
              <Link href="/login">Sign In</Link>
            </Button>
            <Button
              className="bg-[var(--league-primary-color)] hover:bg-[var(--league-primary-color)]/90 text-white"
              asChild
            >
              <Link href="/register">Join League</Link>
            </Button>

            {/* Mobile Menu Toggle */}
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {mobileMenuOpen && (
          <nav className="md:hidden py-4 border-t" style={{ borderColor: `${league.primaryColor}20` }}>
            <div className="flex flex-col gap-3">
              <Link
                href="/schedule"
                className="text-base font-semibold text-slate-600 hover:text-[var(--league-primary-color)] transition-colors py-2"
                onClick={() => setMobileMenuOpen(false)}
              >
                Schedule
              </Link>
              <Link
                href="/standings"
                className="text-base font-semibold text-slate-600 hover:text-[var(--league-primary-color)] transition-colors py-2"
                onClick={() => setMobileMenuOpen(false)}
              >
                Standings
              </Link>
              <Link
                href="/stats"
                className="text-base font-semibold text-slate-600 hover:text-[var(--league-primary-color)] transition-colors py-2"
                onClick={() => setMobileMenuOpen(false)}
              >
                Stats
              </Link>
              <Link
                href="/teams"
                className="text-base font-semibold text-slate-600 hover:text-[var(--league-primary-color)] transition-colors py-2"
                onClick={() => setMobileMenuOpen(false)}
              >
                Teams
              </Link>
              <Link
                href="/login"
                className="text-base font-semibold text-slate-600 hover:text-[var(--league-primary-color)] transition-colors py-2 sm:hidden"
                onClick={() => setMobileMenuOpen(false)}
              >
                Sign In
              </Link>
            </div>
          </nav>
        )}
      </div>
    </header>
  );
}
