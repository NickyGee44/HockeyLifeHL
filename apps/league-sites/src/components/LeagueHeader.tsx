'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useState, useEffect } from 'react';
import { Activity, Calendar, Trophy, Users, BarChart3, Info } from 'lucide-react';
import type { League } from '@/lib/types';
import { AuthButton } from './auth/AuthButton';

interface LeagueHeaderProps {
  league: League;
  leagueSlug: string;
}

const navItems = [
  { href: '/scores', label: 'Scores', icon: Activity },
  { href: '/schedule', label: 'Schedule', icon: Calendar },
  { href: '/standings', label: 'Standings', icon: Trophy },
  { href: '/teams', label: 'Teams', icon: Users },
  { href: '/stats', label: 'Stats', icon: BarChart3 },
  { href: '/about', label: 'About', icon: Info },
];

export function LeagueHeader({ league, leagueSlug }: LeagueHeaderProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);

  // Track scroll position for shadow effect
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <header
      className={`
        sticky top-0 z-50 w-full
        border-b border-[var(--color-border)]
        bg-[var(--color-background)]/80
        backdrop-blur-xl
        transition-all duration-300
        ${isScrolled ? 'shadow-lg shadow-black/20' : ''}
      `}
      style={{
        // Glass morphism effect with league color tint
        background: isScrolled
          ? 'rgba(10, 10, 10, 0.85)'
          : 'rgba(10, 10, 10, 0.6)',
      }}
    >
      {/* Gradient accent line at top */}
      <div
        className="absolute top-0 left-0 right-0 h-[2px] opacity-60"
        style={{
          background: `linear-gradient(90deg, transparent, var(--league-primary), transparent)`,
        }}
      />

      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          {/* Logo and League Name */}
          <Link
            href={`/${leagueSlug}`}
            className="group flex items-center gap-3 transition-all duration-300"
          >
            {league.logo_url ? (
              <div className="relative">
                <Image
                  src={league.logo_url}
                  alt={`${league.name} logo`}
                  width={40}
                  height={40}
                  className="rounded-lg transition-transform duration-300 group-hover:scale-110"
                />
                {/* Pulse glow on hover */}
                <div
                  className="absolute inset-0 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300 animate-pulse"
                  style={{
                    boxShadow: `0 0 20px var(--league-primary)`,
                  }}
                />
              </div>
            ) : (
              <div
                className="w-10 h-10 rounded-lg flex items-center justify-center text-lg font-bold transition-all duration-300 group-hover:scale-110 group-hover:shadow-lg"
                style={{
                  backgroundColor: league.primary_color || '#D4AF37',
                  color: '#0a0a0a',
                  boxShadow: 'none',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.boxShadow = `0 0 20px ${league.primary_color || '#D4AF37'}`;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                {league.name.charAt(0)}
              </div>
            )}
            <span className="font-bold text-lg hidden sm:inline-block group-hover:text-[var(--league-primary)] transition-colors duration-300">
              {league.name}
            </span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-1">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={`/${leagueSlug}${item.href}`}
                className="group relative flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-all duration-300"
              >
                <item.icon className="w-4 h-4 transition-transform duration-300 group-hover:scale-110" />
                <span>{item.label}</span>
                {/* Animated underline */}
                <span
                  className="absolute bottom-0 left-1/2 w-0 h-[2px] bg-[var(--league-primary)] transition-all duration-300 group-hover:w-3/4 group-hover:left-[12.5%]"
                />
              </Link>
            ))}

            {/* Auth Button */}
            <div className="ml-2 pl-2 border-l border-[var(--color-border)]">
              <AuthButton leagueSlug={leagueSlug} leagueId={league.id} />
            </div>
          </nav>

          {/* Animated Hamburger Menu Button */}
          <button
            className="md:hidden relative w-10 h-10 flex items-center justify-center rounded-lg hover:bg-[var(--color-surface-hover)] transition-colors duration-300"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            aria-label={isMobileMenuOpen ? 'Close menu' : 'Open menu'}
          >
            <div className="relative w-6 h-5 flex flex-col justify-center items-center">
              <span
                className={`
                  absolute h-0.5 w-6 bg-current rounded-full transform transition-all duration-300 ease-in-out
                  ${isMobileMenuOpen ? 'rotate-45 translate-y-0' : '-translate-y-2'}
                `}
              />
              <span
                className={`
                  absolute h-0.5 w-6 bg-current rounded-full transition-all duration-300 ease-in-out
                  ${isMobileMenuOpen ? 'opacity-0 scale-0' : 'opacity-100 scale-100'}
                `}
              />
              <span
                className={`
                  absolute h-0.5 w-6 bg-current rounded-full transform transition-all duration-300 ease-in-out
                  ${isMobileMenuOpen ? '-rotate-45 translate-y-0' : 'translate-y-2'}
                `}
              />
            </div>
          </button>
        </div>

        {/* Mobile Navigation */}
        <nav
          className={`
            md:hidden overflow-hidden transition-all duration-300 ease-in-out
            ${isMobileMenuOpen ? 'max-h-96 opacity-100 pb-4' : 'max-h-0 opacity-0'}
          `}
        >
          <div className="pt-4 border-t border-[var(--color-border)]">
            <div className="flex flex-col gap-1">
              {navItems.map((item, index) => (
                <Link
                  key={item.href}
                  href={`/${leagueSlug}${item.href}`}
                  className="group flex items-center gap-3 px-4 py-3 rounded-lg text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-surface-hover)] transition-all duration-300"
                  onClick={() => setIsMobileMenuOpen(false)}
                  style={{
                    transitionDelay: isMobileMenuOpen ? `${index * 50}ms` : '0ms',
                    transform: isMobileMenuOpen ? 'translateX(0)' : 'translateX(-10px)',
                    opacity: isMobileMenuOpen ? 1 : 0,
                  }}
                >
                  <item.icon className="w-5 h-5 text-[var(--league-primary)] transition-transform duration-300 group-hover:scale-110" />
                  <span className="flex-1">{item.label}</span>
                  <span
                    className="w-1.5 h-1.5 rounded-full bg-[var(--league-primary)] opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                  />
                </Link>
              ))}
            </div>
          </div>
        </nav>
      </div>
    </header>
  );
}
