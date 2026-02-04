'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import { ThemeToggle } from '@/components/ThemeToggle';

/* ============================================
   ICON COMPONENTS
   ============================================ */

function IconShield({ className = 'w-6 h-6' }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
    </svg>
  );
}

function IconUsers({ className = 'w-6 h-6' }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
    </svg>
  );
}

function IconChart({ className = 'w-6 h-6' }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
    </svg>
  );
}

function IconCreditCard({ className = 'w-6 h-6' }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z" />
    </svg>
  );
}

function IconCalendar({ className = 'w-6 h-6' }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
    </svg>
  );
}

function IconGlobe({ className = 'w-6 h-6' }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0112 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 013 12c0-1.605.42-3.113 1.157-4.418" />
    </svg>
  );
}

function IconCheckCircle({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

function IconArrowRight({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
    </svg>
  );
}

function IconQuote({ className = 'w-12 h-12' }: { className?: string }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 24 24">
      <path d="M14.017 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151c-2.432.917-3.995 3.638-3.995 5.849h4v10h-9.983zm-14.017 0v-7.391c0-5.704 3.748-9.57 9-10.609l.996 2.151c-2.433.917-3.996 3.638-3.996 5.849h3.983v10h-9.983z" />
    </svg>
  );
}

/* ============================================
   MAIN PAGE COMPONENT
   ============================================ */

export default function HomePage() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div className="min-h-screen bg-[var(--color-background)]">
      {/* ============================================
         SECTION 1: FIXED NAVIGATION
         ============================================ */}
      <nav
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          scrolled
            ? 'glass border-b border-[var(--color-border)]'
            : 'bg-transparent'
        }`}
      >
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 lg:h-20">
            {/* Logo */}
            <Link href="/" className="flex items-center gap-3">
              <Image
                src="/BLH-icon.png"
                alt="BLH"
                width={40}
                height={40}
                className="w-10 h-10"
              />
              <span className="font-bold text-xl text-[var(--color-text-primary)] hidden sm:block">
                Beer<span className="text-[var(--gold-500)]">League</span>Hockey
              </span>
            </Link>

            {/* Center Menu */}
            <div className="hidden md:flex items-center gap-8">
              <a
                href="#features"
                className="text-sm font-medium text-[var(--color-text-secondary)] hover:text-[var(--gold-500)] transition-colors"
              >
                Features
              </a>
              <a
                href="#how-it-works"
                className="text-sm font-medium text-[var(--color-text-secondary)] hover:text-[var(--gold-500)] transition-colors"
              >
                How It Works
              </a>
              <a
                href="#pricing"
                className="text-sm font-medium text-[var(--color-text-secondary)] hover:text-[var(--gold-500)] transition-colors"
              >
                Pricing
              </a>
            </div>

            {/* Right Actions */}
            <div className="flex items-center gap-3">
              <ThemeToggle />
              <Link
                href="/login"
                className="text-sm font-medium text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors hidden sm:block"
              >
                Sign In
              </Link>
              <Link
                href="/signup"
                className="btn-glow px-4 py-2 bg-gradient-to-r from-[var(--gold-500)] to-[var(--gold-600)] text-black font-semibold text-sm rounded-lg"
              >
                Get Started
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* ============================================
         SECTION 2: HERO
         ============================================ */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
        {/* Video Background */}
        <video
          autoPlay
          loop
          muted
          playsInline
          className="absolute inset-0 w-full h-full object-cover"
          poster="/BLH-banner.png"
        >
          <source src="/hero-video.mp4" type="video/mp4" />
        </video>

        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-[var(--color-background)]/90 via-[var(--color-background)]/70 to-[var(--color-background)]" />

        {/* Hero Content */}
        <div className="relative z-10 max-w-5xl mx-auto px-6 text-center pt-24 pb-16">
          {/* Beta Badge */}
          <div
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-[var(--color-border)] bg-[var(--color-background-elevated)]/80 backdrop-blur-sm mb-8 animate-fade-up opacity-0"
            style={{ animationDelay: '0.1s', animationFillMode: 'forwards' }}
          >
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[var(--gold-500)] opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-[var(--gold-500)]"></span>
            </span>
            <span className="text-sm font-medium text-[var(--color-text-secondary)]">
              Now in Private Beta
            </span>
          </div>

          {/* Logo */}
          <div
            className="mb-8 animate-fade-up opacity-0"
            style={{ animationDelay: '0.2s', animationFillMode: 'forwards' }}
          >
            <Image
              src="/BLH-logo.png"
              alt="BeerLeagueHockey"
              width={180}
              height={180}
              className="mx-auto animate-float"
              priority
            />
          </div>

          {/* Headline */}
          <h1
            className="text-4xl sm:text-5xl lg:text-6xl xl:text-7xl font-black tracking-tight mb-6 animate-fade-up opacity-0"
            style={{ animationDelay: '0.3s', animationFillMode: 'forwards' }}
          >
            The Operating System for{' '}
            <span className="text-gradient-gold">Recreational Hockey</span>
          </h1>

          {/* Subheadline */}
          <p
            className="text-lg sm:text-xl text-[var(--color-text-secondary)] max-w-2xl mx-auto mb-10 animate-fade-up opacity-0"
            style={{ animationDelay: '0.4s', animationFillMode: 'forwards' }}
          >
            Premium league management platform that handles teams, schedules, standings, payments, and
            more. Built for leagues that mean business.
          </p>

          {/* CTAs */}
          <div
            className="flex flex-col sm:flex-row gap-4 justify-center mb-16 animate-fade-up opacity-0"
            style={{ animationDelay: '0.5s', animationFillMode: 'forwards' }}
          >
            <Link
              href="/demo"
              className="btn-glow inline-flex items-center justify-center gap-2 px-8 py-4 bg-gradient-to-r from-[var(--gold-500)] to-[var(--gold-600)] text-black font-bold text-lg rounded-xl"
            >
              Schedule a Demo
              <IconArrowRight className="w-5 h-5" />
            </Link>
            <a
              href="#features"
              className="inline-flex items-center justify-center gap-2 px-8 py-4 border border-[var(--color-border)] text-[var(--color-text-primary)] font-semibold text-lg rounded-xl hover:bg-[var(--color-surface)] transition-colors"
            >
              Learn More
            </a>
          </div>

          {/* Stats Row */}
          <div
            className="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-3xl mx-auto animate-fade-up opacity-0"
            style={{ animationDelay: '0.6s', animationFillMode: 'forwards' }}
          >
            {[
              { value: '$2.4M+', label: 'Revenue Processed' },
              { value: '990+', label: 'Players' },
              { value: '66+', label: 'Teams' },
              { value: '99.9%', label: 'Uptime' },
            ].map((stat) => (
              <div key={stat.label} className="text-center">
                <div className="text-2xl sm:text-3xl font-bold text-gradient-gold">
                  {stat.value}
                </div>
                <div className="text-sm text-[var(--color-text-muted)]">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Scroll Indicator */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce-slow">
          <svg
            className="w-6 h-6 text-[var(--gold-500)]"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 14l-7 7m0 0l-7-7m7 7V3" />
          </svg>
        </div>
      </section>

      {/* ============================================
         SECTION 3: SOCIAL PROOF BAR
         ============================================ */}
      <section className="py-12 border-y border-[var(--color-border)]">
        <div className="max-w-7xl mx-auto px-6">
          <p className="text-center text-sm text-[var(--color-text-muted)] mb-8 uppercase tracking-wider">
            Trusted by leading recreational leagues
          </p>
          <div className="flex flex-wrap items-center justify-center gap-8 md:gap-16">
            {[
              'Metro Hockey League',
              'Capital City Rec',
              'Lakeside Ice Association',
              'Northern Puck Club',
              'Sunset Arena League',
            ].map((name) => (
              <span
                key={name}
                className="text-lg font-semibold text-[var(--color-text-muted)] opacity-50 hover:opacity-100 hover:text-[var(--gold-500)] transition-all cursor-default"
              >
                {name}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ============================================
         SECTION 4: FEATURES
         ============================================ */}
      <section id="features" className="py-24 lg:py-32">
        <div className="max-w-7xl mx-auto px-6">
          {/* Section Header */}
          <div className="text-center max-w-3xl mx-auto mb-16">
            <p className="text-sm font-semibold text-[var(--gold-500)] uppercase tracking-wider mb-4">
              Features
            </p>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-6">
              Everything Your League Needs
            </h2>
            <p className="text-lg text-[var(--color-text-secondary)]">
              A complete platform designed to streamline every aspect of league management, from
              registration to championship.
            </p>
          </div>

          {/* Feature Grid */}
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              {
                icon: IconShield,
                title: 'Multi-Tenant Architecture',
                description:
                  'Securely manage multiple leagues from a single platform with isolated data and custom branding for each.',
              },
              {
                icon: IconUsers,
                title: 'Universal Player Profiles',
                description:
                  'Players maintain one profile across all leagues. Track stats, history, and achievements in one place.',
              },
              {
                icon: IconChart,
                title: 'Real-Time Scorekeeping',
                description:
                  'Live game scoring with automatic standings updates. Officials and fans stay connected in real-time.',
              },
              {
                icon: IconCreditCard,
                title: 'Integrated Payments',
                description:
                  'Collect registration fees, process refunds, and manage payouts with Stripe-powered payment processing.',
              },
              {
                icon: IconCalendar,
                title: 'Smart Scheduling',
                description:
                  'AI-assisted scheduling that considers venue availability, team conflicts, and fair distribution of ice times.',
              },
              {
                icon: IconGlobe,
                title: 'Custom Branded Sites',
                description:
                  'Each league gets a beautiful, mobile-first website with your branding, colors, and custom domain.',
              },
            ].map((feature) => (
              <div
                key={feature.title}
                className="card-hover p-6 rounded-2xl bg-[var(--color-background-card)] border border-[var(--color-border)]"
              >
                <div className="w-12 h-12 rounded-xl bg-[var(--color-accent-muted)] flex items-center justify-center mb-4">
                  <feature.icon className="w-6 h-6 text-[var(--gold-500)]" />
                </div>
                <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
                <p className="text-[var(--color-text-secondary)]">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============================================
         SECTION 5: HOW IT WORKS
         ============================================ */}
      <section
        id="how-it-works"
        className="py-24 lg:py-32 bg-[var(--color-background-elevated)]"
      >
        <div className="max-w-7xl mx-auto px-6">
          {/* Section Header */}
          <div className="text-center max-w-3xl mx-auto mb-16">
            <p className="text-sm font-semibold text-[var(--gold-500)] uppercase tracking-wider mb-4">
              How It Works
            </p>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-6">
              Get Started in Three Steps
            </h2>
            <p className="text-lg text-[var(--color-text-secondary)]">
              From signup to launch in days, not months. Our team guides you every step of the way.
            </p>
          </div>

          {/* Steps */}
          <div className="grid md:grid-cols-3 gap-8 relative">
            {/* Connector Lines (Desktop) */}
            <div className="hidden md:block absolute top-16 left-1/4 right-1/4 h-0.5 bg-gradient-to-r from-transparent via-[var(--gold-500)]/30 to-transparent" />

            {[
              {
                step: '01',
                title: 'Connect Your League',
                description:
                  'Sign up and import your existing data. We migrate players, teams, and historical stats automatically.',
              },
              {
                step: '02',
                title: 'Customize Your Platform',
                description:
                  'Add your branding, set up divisions, configure registration, and customize your league website.',
              },
              {
                step: '03',
                title: 'Launch & Grow',
                description:
                  'Go live with confidence. Our support team helps you onboard players and maximize engagement.',
              },
            ].map((item, index) => (
              <div key={item.step} className="text-center relative">
                {/* Step Badge */}
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-[var(--gold-500)] to-[var(--gold-600)] text-black text-2xl font-bold mb-6 shadow-gold">
                  {item.step}
                </div>
                <h3 className="text-xl font-semibold mb-3">{item.title}</h3>
                <p className="text-[var(--color-text-secondary)]">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============================================
         SECTION 6: TESTIMONIAL
         ============================================ */}
      <section className="py-24 lg:py-32 relative overflow-hidden">
        {/* Background Image */}
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: 'url(/bg.jpg)' }}
        />
        <div className="absolute inset-0 bg-[var(--color-background)]/90" />

        <div className="relative z-10 max-w-4xl mx-auto px-6 text-center">
          <IconQuote className="w-16 h-16 text-[var(--gold-500)]/30 mx-auto mb-8" />

          <blockquote className="text-2xl sm:text-3xl lg:text-4xl font-medium leading-relaxed mb-8">
            "BeerLeagueHockey transformed how we run our 12-league organization. Registration that
            used to take weeks now takes hours. Our players love the modern experience."
          </blockquote>

          <div className="flex items-center justify-center gap-4">
            <div className="w-14 h-14 rounded-full bg-gradient-to-br from-[var(--gold-500)] to-[var(--gold-600)] flex items-center justify-center text-black font-bold text-lg">
              MJ
            </div>
            <div className="text-left">
              <div className="font-semibold">Mike Johnson</div>
              <div className="text-sm text-[var(--color-text-muted)]">
                Executive Director, Metro Hockey League
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ============================================
         SECTION 7: PRICING TEASER
         ============================================ */}
      <section id="pricing" className="py-24 lg:py-32 bg-[var(--color-background-elevated)]">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <p className="text-sm font-semibold text-[var(--gold-500)] uppercase tracking-wider mb-4">
            Pricing
          </p>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-4">
            Enterprise-Grade Platform
          </h2>
          <p className="text-5xl sm:text-6xl font-black text-gradient-gold mb-6">
            Starting at $30,000/year
          </p>
          <p className="text-lg text-[var(--color-text-secondary)] mb-10 max-w-2xl mx-auto">
            Full platform access for organizations serious about professional league management.
          </p>

          {/* Feature Checklist */}
          <div className="grid sm:grid-cols-2 gap-4 max-w-xl mx-auto mb-10">
            {[
              'Unlimited leagues & divisions',
              'Custom branded websites',
              'Advanced analytics & reporting',
              'Priority support & onboarding',
              'API access & integrations',
              'White-label options available',
            ].map((feature) => (
              <div key={feature} className="flex items-center gap-3 text-left">
                <IconCheckCircle className="w-5 h-5 text-[var(--gold-500)] flex-shrink-0" />
                <span className="text-[var(--color-text-secondary)]">{feature}</span>
              </div>
            ))}
          </div>

          <Link
            href="/demo"
            className="btn-glow inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-[var(--gold-500)] to-[var(--gold-600)] text-black font-bold text-lg rounded-xl"
          >
            Schedule a Demo
            <IconArrowRight className="w-5 h-5" />
          </Link>
        </div>
      </section>

      {/* ============================================
         SECTION 8: FINAL CTA
         ============================================ */}
      <section className="py-24 lg:py-32">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-6">
            Ready to Transform Your League?
          </h2>
          <p className="text-lg text-[var(--color-text-secondary)] mb-10 max-w-2xl mx-auto">
            Join the growing number of leagues that trust BeerLeagueHockey to power their
            operations.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/demo"
              className="btn-glow inline-flex items-center justify-center gap-2 px-8 py-4 bg-gradient-to-r from-[var(--gold-500)] to-[var(--gold-600)] text-black font-bold text-lg rounded-xl"
            >
              Schedule a Demo
              <IconArrowRight className="w-5 h-5" />
            </Link>
            <Link
              href="/contact"
              className="inline-flex items-center justify-center gap-2 px-8 py-4 border border-[var(--color-border)] text-[var(--color-text-primary)] font-semibold text-lg rounded-xl hover:bg-[var(--color-surface)] transition-colors"
            >
              Contact Sales
            </Link>
          </div>
        </div>
      </section>

      {/* ============================================
         SECTION 9: FOOTER
         ============================================ */}
      <footer className="py-16 border-t border-[var(--color-border)]">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid md:grid-cols-5 gap-12 mb-12">
            {/* Brand Column */}
            <div className="md:col-span-2">
              <Link href="/" className="flex items-center gap-3 mb-4">
                <Image src="/BLH-icon.png" alt="BLH" width={40} height={40} />
                <span className="font-bold text-xl">
                  Beer<span className="text-[var(--gold-500)]">League</span>Hockey
                </span>
              </Link>
              <p className="text-[var(--color-text-secondary)] mb-6 max-w-sm">
                The premium league management platform for recreational hockey organizations.
              </p>
              {/* Trust Badges */}
              <div className="flex items-center gap-4">
                <div className="px-3 py-1.5 rounded border border-[var(--color-border)] text-xs text-[var(--color-text-muted)]">
                  SOC 2 Compliant
                </div>
                <div className="px-3 py-1.5 rounded border border-[var(--color-border)] text-xs text-[var(--color-text-muted)]">
                  SSL Secured
                </div>
              </div>
            </div>

            {/* Product */}
            <div>
              <h4 className="font-semibold mb-4">Product</h4>
              <ul className="space-y-3 text-[var(--color-text-secondary)]">
                <li>
                  <a href="#features" className="hover:text-[var(--gold-500)] transition-colors">
                    Features
                  </a>
                </li>
                <li>
                  <a href="#pricing" className="hover:text-[var(--gold-500)] transition-colors">
                    Pricing
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-[var(--gold-500)] transition-colors">
                    Integrations
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-[var(--gold-500)] transition-colors">
                    API Docs
                  </a>
                </li>
              </ul>
            </div>

            {/* Company */}
            <div>
              <h4 className="font-semibold mb-4">Company</h4>
              <ul className="space-y-3 text-[var(--color-text-secondary)]">
                <li>
                  <a href="#" className="hover:text-[var(--gold-500)] transition-colors">
                    About Us
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-[var(--gold-500)] transition-colors">
                    Blog
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-[var(--gold-500)] transition-colors">
                    Careers
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-[var(--gold-500)] transition-colors">
                    Contact
                  </a>
                </li>
              </ul>
            </div>

            {/* Legal */}
            <div>
              <h4 className="font-semibold mb-4">Legal</h4>
              <ul className="space-y-3 text-[var(--color-text-secondary)]">
                <li>
                  <a href="#" className="hover:text-[var(--gold-500)] transition-colors">
                    Privacy Policy
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-[var(--gold-500)] transition-colors">
                    Terms of Service
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-[var(--gold-500)] transition-colors">
                    Cookie Policy
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-[var(--gold-500)] transition-colors">
                    Security
                  </a>
                </li>
              </ul>
            </div>
          </div>

          {/* Copyright */}
          <div className="pt-8 border-t border-[var(--color-border)] flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-sm text-[var(--color-text-muted)]">
              &copy; {new Date().getFullYear()} BeerLeagueHockey. All rights reserved.
            </p>
            <div className="flex items-center gap-6">
              <a
                href="#"
                className="text-[var(--color-text-muted)] hover:text-[var(--gold-500)] transition-colors"
                aria-label="Twitter"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8.29 20.251c7.547 0 11.675-6.253 11.675-11.675 0-.178 0-.355-.012-.53A8.348 8.348 0 0022 5.92a8.19 8.19 0 01-2.357.646 4.118 4.118 0 001.804-2.27 8.224 8.224 0 01-2.605.996 4.107 4.107 0 00-6.993 3.743 11.65 11.65 0 01-8.457-4.287 4.106 4.106 0 001.27 5.477A4.072 4.072 0 012.8 9.713v.052a4.105 4.105 0 003.292 4.022 4.095 4.095 0 01-1.853.07 4.108 4.108 0 003.834 2.85A8.233 8.233 0 012 18.407a11.616 11.616 0 006.29 1.84" />
                </svg>
              </a>
              <a
                href="#"
                className="text-[var(--color-text-muted)] hover:text-[var(--gold-500)] transition-colors"
                aria-label="LinkedIn"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
                </svg>
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
