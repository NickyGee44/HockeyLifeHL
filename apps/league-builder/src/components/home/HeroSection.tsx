'use client';

import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import Image from 'next/image';
import { ArrowRight, Play } from 'lucide-react';

export function HeroSection() {
  const t = useTranslations('homepage');

  return (
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
            {t('nav.login')}
          </Link>
          <Link
            href="/signup"
            className="px-4 py-2 text-sm font-medium bg-gradient-to-r from-rink-500 to-arena-500 text-neutral-950 rounded-lg hover:opacity-90 transition-all"
          >
            {t('nav.signup')}
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
            {t('hero.headline')}
            <span className="block text-gradient-rink mt-2">
              {t('hero.headlineAccent')}
            </span>
          </h1>
          <p className="text-lg lg:text-2xl text-neutral-200 mb-10 max-w-2xl mx-auto drop-shadow-md">
            {t('hero.subheadline')}
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/signup"
              className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-gradient-to-r from-rink-500 to-arena-500 text-neutral-950 font-bold rounded-xl hover:opacity-90 transition-all hover:scale-105 shadow-lg shadow-rink-500/25"
            >
              {t('hero.ctaPrimary')}
              <ArrowRight className="w-5 h-5" />
            </Link>
            <a
              href="https://demo.beerleaguehockey.ca"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 px-8 py-4 border-2 border-white/30 text-white font-bold rounded-xl hover:bg-white/10 backdrop-blur-sm transition-all"
            >
              <Play className="w-5 h-5" />
              {t('hero.ctaSecondary')}
            </a>
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
  );
}
