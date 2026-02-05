'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Calendar, Trophy, Users, TrendingUp } from 'lucide-react';
import type { League, LeagueStats } from '@/lib/types';

// =============================================================================
// Types
// =============================================================================

interface HeroSectionProps {
  league: League;
  stats: LeagueStats;
  leagueSlug: string;
}

// =============================================================================
// Stat Card Component
// =============================================================================

interface StatCardProps {
  value: number;
  label: string;
  icon: React.ReactNode;
}

function StatCard({ value, label, icon }: StatCardProps) {
  return (
    <div
      className="relative overflow-hidden rounded-xl p-5 transition-all duration-300 hover:scale-[1.02]"
      style={{
        background: 'rgba(255, 255, 255, 0.06)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
      }}
    >
      <div className="flex items-center gap-3 mb-2 text-white/60">
        <span
          className="p-2 rounded-lg"
          style={{ background: 'rgba(255, 255, 255, 0.08)' }}
        >
          {icon}
        </span>
        <span className="text-xs font-medium tracking-wide uppercase">{label}</span>
      </div>
      <div
        className="text-3xl md:text-4xl font-bold text-white tabular-nums"
        style={{ color: 'var(--league-primary)' }}
      >
        {value.toLocaleString()}
      </div>
    </div>
  );
}

// =============================================================================
// Main Hero Section Component
// =============================================================================

export function HeroSection({ league, stats, leagueSlug }: HeroSectionProps) {
  const [isLoaded, setIsLoaded] = useState(false);

  // Simple fade-in on mount
  useEffect(() => {
    const timer = setTimeout(() => setIsLoaded(true), 50);
    return () => clearTimeout(timer);
  }, []);

  return (
    <section className="relative min-h-[70vh] md:min-h-[80vh] overflow-hidden flex items-center">
      {/* Background Gradient */}
      <div
        className="absolute inset-0"
        style={{
          background: `
            linear-gradient(180deg,
              color-mix(in srgb, var(--league-primary) 20%, black) 0%,
              #0a0a0a 100%)
          `,
        }}
      />

      {/* Banner Image */}
      {league.banner_url && (
        <div className="absolute inset-0">
          <Image
            src={league.banner_url}
            alt={`${league.name} banner`}
            fill
            className="object-cover opacity-15"
            priority
            quality={85}
          />
          <div
            className="absolute inset-0"
            style={{
              background: `linear-gradient(180deg,
                rgba(0, 0, 0, 0.5) 0%,
                rgba(10, 10, 10, 1) 100%)`,
            }}
          />
        </div>
      )}

      {/* Content Container */}
      <div className="relative container mx-auto px-4 py-16 md:py-24">
        <div className="flex flex-col items-center text-center">
          {/* League Logo */}
          {league.logo_url && (
            <div
              className={`relative mb-6 transition-all duration-700 ease-out ${
                isLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
              }`}
            >
              <Image
                src={league.logo_url}
                alt={`${league.name} logo`}
                width={120}
                height={120}
                className="rounded-2xl shadow-xl"
                style={{
                  boxShadow: '0 20px 40px rgba(0, 0, 0, 0.4)',
                }}
                priority
              />
            </div>
          )}

          {/* League Name */}
          <h1
            className={`text-3xl md:text-5xl lg:text-6xl font-bold mb-4 text-white transition-all duration-700 ease-out ${
              isLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
            }`}
            style={{ transitionDelay: '100ms' }}
          >
            {league.name}
          </h1>

          {/* League Description */}
          {league.description && (
            <p
              className={`text-base md:text-lg text-white/70 max-w-2xl mb-8 leading-relaxed transition-all duration-700 ease-out ${
                isLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
              }`}
              style={{ transitionDelay: '200ms' }}
            >
              {league.description}
            </p>
          )}

          {/* CTA Buttons */}
          <div
            className={`flex flex-col sm:flex-row gap-3 mb-12 transition-all duration-700 ease-out ${
              isLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
            }`}
            style={{ transitionDelay: '300ms' }}
          >
            <Link
              href={`/${leagueSlug}/schedule`}
              className="px-6 py-3 rounded-lg font-semibold text-white transition-all duration-200 hover:brightness-110"
              style={{
                background: 'var(--league-primary)',
              }}
            >
              <span className="flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                View Schedule
              </span>
            </Link>

            <Link
              href={`/${leagueSlug}/standings`}
              className="px-6 py-3 rounded-lg font-semibold text-white transition-all duration-200 hover:bg-white/15"
              style={{
                background: 'rgba(255, 255, 255, 0.08)',
                border: '1px solid rgba(255, 255, 255, 0.15)',
              }}
            >
              <span className="flex items-center gap-2">
                <Trophy className="w-4 h-4" />
                See Standings
              </span>
            </Link>
          </div>

          {/* Stats Grid */}
          <div
            className={`grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 w-full max-w-3xl transition-all duration-700 ease-out ${
              isLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
            }`}
            style={{ transitionDelay: '400ms' }}
          >
            <StatCard
              value={stats.totalTeams}
              label="Teams"
              icon={<Users className="w-4 h-4" />}
            />
            <StatCard
              value={stats.totalPlayers}
              label="Players"
              icon={<Users className="w-4 h-4" />}
            />
            <StatCard
              value={stats.gamesPlayed}
              label="Games Played"
              icon={<Calendar className="w-4 h-4" />}
            />
            <StatCard
              value={stats.upcomingGames}
              label="Upcoming"
              icon={<TrendingUp className="w-4 h-4" />}
            />
          </div>
        </div>
      </div>

      {/* Bottom Gradient Fade */}
      <div
        className="absolute bottom-0 left-0 right-0 h-24 pointer-events-none"
        style={{
          background: 'linear-gradient(to top, #0a0a0a, transparent)',
        }}
      />
    </section>
  );
}

export default HeroSection;
