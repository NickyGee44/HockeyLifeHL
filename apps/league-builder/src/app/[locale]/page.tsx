'use client';

import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import Image from 'next/image';
import { Trophy, ArrowRight, Users, Calendar, BarChart3, Play } from 'lucide-react';

// Team logos for the marquee
const teamLogos = [
  { src: '/cal.png', alt: 'Calgary' },
  { src: '/edm.png', alt: 'Edmonton' },
  { src: '/mtl.png', alt: 'Montreal' },
  { src: '/ott.png', alt: 'Ottawa' },
  { src: '/tml.png', alt: 'Toronto' },
  { src: '/van.png', alt: 'Vancouver' },
  { src: '/wpg.png', alt: 'Winnipeg' },
];

export default function HomePage() {
  const t = useTranslations();

  return (
    <div className="min-h-screen bg-neutral-950">
      {/* Hero Section with Video Background */}
      <div className="relative overflow-hidden min-h-screen">
        {/* Video Background */}
        <div className="absolute inset-0 z-0">
          <video
            autoPlay
            muted
            loop
            playsInline
            className="absolute inset-0 w-full h-full object-cover"
          >
            <source src="/hero-video.mp4" type="video/mp4" />
          </video>
          {/* Dark overlay for readability */}
          <div className="absolute inset-0 bg-black/60" />
          {/* Aurora gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-br from-rink-500/15 via-arena-500/10 to-violet-400/5" />
        </div>

        {/* Navigation */}
        <nav className="relative z-10 flex items-center justify-between px-6 py-4 lg:px-12">
          <div className="flex items-center gap-3">
            <Image
              src="/logo.png"
              alt="Beer League Hockey"
              width={48}
              height={48}
              className="w-12 h-12 object-contain"
            />
            <span className="font-black text-xl text-white tracking-tight">
              Beer League <span className="text-gradient-rink">Hockey</span>
            </span>
          </div>

          <div className="flex items-center gap-4">
            <Link
              href="/login"
              className="px-4 py-2 text-sm font-medium text-neutral-300 hover:text-white transition-colors"
            >
              {t('auth.login')}
            </Link>
            <Link
              href="/signup"
              className="px-4 py-2 text-sm font-medium bg-gradient-to-r from-rink-500 to-arena-500 text-neutral-950 rounded-lg hover:opacity-90 transition-all"
            >
              {t('auth.signup')}
            </Link>
          </div>
        </nav>

        {/* Hero Content */}
        <div className="relative z-10 flex flex-col items-center justify-center min-h-[calc(100vh-80px)] px-6 lg:px-12">
          <div className="max-w-4xl mx-auto text-center">
            {/* Main Logo */}
            <div className="mb-8">
              <Image
                src="/logo.png"
                alt="Beer League Hockey"
                width={200}
                height={200}
                className="w-32 h-32 lg:w-48 lg:h-48 mx-auto object-contain drop-shadow-2xl"
                priority
              />
            </div>

            <h1 className="text-4xl lg:text-7xl font-black text-white mb-6 tracking-tight drop-shadow-lg">
              Less Admin.
              <span className="block text-gradient-rink mt-2">
                More Hockey.
              </span>
            </h1>
            <p className="text-lg lg:text-2xl text-neutral-200 mb-10 max-w-2xl mx-auto drop-shadow-md">
              Handle registrations, schedules, scores, standings, and payments&mdash;fast, clean, and drama-free.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/signup"
                className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-gradient-to-r from-rink-500 to-arena-500 text-neutral-950 font-bold rounded-xl hover:opacity-90 transition-all hover:scale-105 shadow-lg shadow-rink-500/25"
              >
                Start Free Trial
                <ArrowRight className="w-5 h-5" />
              </Link>
              <Link
                href="/login"
                className="inline-flex items-center justify-center gap-2 px-8 py-4 border-2 border-white/30 text-white font-bold rounded-xl hover:bg-white/10 backdrop-blur-sm transition-all"
              >
                <Play className="w-5 h-5" />
                Watch Demo
              </Link>
            </div>
          </div>

          {/* Scroll indicator */}
          <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce">
            <div className="w-6 h-10 border-2 border-white/30 rounded-full flex items-start justify-center p-2">
              <div className="w-1.5 h-3 bg-rink-500 rounded-full animate-pulse" />
            </div>
          </div>
        </div>
      </div>

      {/* Logo Marquee Section */}
      <div className="bg-neutral-900 py-8 border-y border-white/10 overflow-hidden">
        <div className="flex items-center justify-center gap-4 mb-4">
          <div className="h-px flex-1 max-w-[100px] bg-gradient-to-r from-transparent to-rink-500/30" />
          <p className="text-sm font-medium text-neutral-400 uppercase tracking-wider">
            Trusted by leagues across Canada
          </p>
          <div className="h-px flex-1 max-w-[100px] bg-gradient-to-l from-transparent to-rink-500/30" />
        </div>

        {/* Infinite scrolling logo marquee */}
        <div className="relative">
          <div className="flex animate-marquee">
            {[...teamLogos, ...teamLogos, ...teamLogos].map((logo, index) => (
              <div
                key={index}
                className="flex-shrink-0 mx-8 grayscale hover:grayscale-0 opacity-60 hover:opacity-100 transition-all duration-300"
              >
                <Image
                  src={logo.src}
                  alt={logo.alt}
                  width={60}
                  height={60}
                  className="w-12 h-12 lg:w-16 lg:h-16 object-contain"
                />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="px-6 py-24 lg:px-12 bg-neutral-950">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl lg:text-5xl font-bold text-white mb-4">
              Everything you need to{' '}
              <span className="text-rink-500">dominate</span>
            </h2>
            <p className="text-lg text-neutral-400 max-w-2xl mx-auto">
              Powerful tools designed for hockey league commissioners who want to spend less time on admin and more time on the ice.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {/* Feature 1 */}
            <div className="group p-8 rounded-2xl bg-neutral-900/50 border border-white/10 hover:border-white/20 transition-all hover:-translate-y-1">
              <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-rink-500/15 to-arena-500/5 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <Users className="w-7 h-7 text-rink-500" />
              </div>
              <h3 className="text-xl font-bold text-white mb-3">
                {t('navigation.teams')}
              </h3>
              <p className="text-neutral-400 leading-relaxed">
                Manage rosters, track player stats, handle registrations, and organize your teams with ease.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="group p-8 rounded-2xl bg-neutral-900/50 border border-white/10 hover:border-white/20 transition-all hover:-translate-y-1">
              <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-rink-500/15 to-arena-500/5 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <Calendar className="w-7 h-7 text-rink-500" />
              </div>
              <h3 className="text-xl font-bold text-white mb-3">
                {t('navigation.schedule')}
              </h3>
              <p className="text-neutral-400 leading-relaxed">
                Auto-generate balanced schedules with venue management and conflict detection built-in.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="group p-8 rounded-2xl bg-neutral-900/50 border border-white/10 hover:border-white/20 transition-all hover:-translate-y-1">
              <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-rink-500/15 to-arena-500/5 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <BarChart3 className="w-7 h-7 text-rink-500" />
              </div>
              <h3 className="text-xl font-bold text-white mb-3">
                {t('navigation.standings')}
              </h3>
              <p className="text-neutral-400 leading-relaxed">
                Real-time standings, statistics, and leaderboards that update automatically after each game.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="px-6 py-24 lg:px-12 bg-gradient-to-b from-neutral-950 to-neutral-900">
        <div className="max-w-4xl mx-auto text-center">
          <Image
            src="/logo.png"
            alt="Beer League Hockey"
            width={120}
            height={120}
            className="w-24 h-24 mx-auto mb-8 object-contain opacity-80"
          />
          <h2 className="text-3xl lg:text-4xl font-bold text-white mb-6">
            Ready to elevate your league?
          </h2>
          <p className="text-lg text-neutral-400 mb-8 max-w-xl mx-auto">
            Join hundreds of hockey leagues already using Beer League Hockey to streamline their operations.
          </p>
          <Link
            href="/signup"
            className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-gradient-to-r from-rink-500 to-arena-500 text-neutral-950 font-bold rounded-xl hover:opacity-90 transition-all hover:scale-105 shadow-lg shadow-rink-500/25"
          >
            Get Started Free
            <ArrowRight className="w-5 h-5" />
          </Link>
        </div>
      </div>

      {/* Footer */}
      <footer className="px-6 py-8 lg:px-12 bg-neutral-900 border-t border-white/10">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Image
              src="/logo.png"
              alt="Beer League Hockey"
              width={32}
              height={32}
              className="w-8 h-8 object-contain"
            />
            <span className="font-bold text-white">
              Beer League <span className="text-gradient-rink">Hockey</span>
            </span>
          </div>
          <p className="text-sm text-neutral-500">
            &copy; {new Date().getFullYear()} Beer League Hockey. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
