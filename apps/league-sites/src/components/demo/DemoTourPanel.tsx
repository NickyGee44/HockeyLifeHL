'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Sparkles, X, ChevronUp, CheckCircle2, Circle,
  Calendar, BarChart3, Trophy, Users, Newspaper,
  User, ClipboardList, Gamepad2, MapPin, ExternalLink,
} from 'lucide-react';

interface Feature {
  id: string;
  icon: React.ElementType;
  title: string;
  description: string;
  href?: string;
  badge?: string;
}

interface DemoTourPanelProps {
  leagueSlug: string;
  hasSchedule?: boolean;
  hasNews?: boolean;
  hasRegistration?: boolean;
}

const STORAGE_KEY = 'blh-demo-tour-visited';
const DISMISSED_KEY = 'blh-demo-tour-dismissed';

function getFeatures(slug: string): Feature[] {
  return [
    {
      id: 'ticker',
      icon: Gamepad2,
      title: 'Live Score Ticker',
      description: 'The scrolling bar at the top updates with game results as they happen — no refresh needed.',
      badge: 'Top of page',
    },
    {
      id: 'schedule',
      icon: Calendar,
      title: 'Schedule',
      description: 'Browse upcoming and past games week by week. Filter by division or team.',
      href: `/${slug}/schedule`,
    },
    {
      id: 'standings',
      icon: Trophy,
      title: 'Standings',
      description: 'Live standings updated after every game is submitted by the scorekeeper.',
      href: `/${slug}/standings`,
    },
    {
      id: 'teams',
      icon: Users,
      title: 'Teams & Rosters',
      description: 'View every team, their full roster, and individual player profiles with season stats.',
      href: `/${slug}/teams`,
    },
    {
      id: 'stats',
      icon: BarChart3,
      title: 'Stats & Leaders',
      description: 'Scoring leaders, goalie save percentages, and full player stat breakdowns.',
      href: `/${slug}/stats`,
    },
    {
      id: 'news',
      icon: Newspaper,
      title: 'News & Recaps',
      description: 'League announcements and AI-generated game recaps published automatically after final scores.',
      href: `/${slug}/news`,
    },
    {
      id: 'register',
      icon: ClipboardList,
      title: 'Player Registration',
      description: 'Players can register online, pay their season fee via Stripe, and sign the waiver — all in one flow.',
      href: `/${slug}/register`,
      badge: 'Try it',
    },
    {
      id: 'me',
      icon: User,
      title: 'Player Dashboard',
      description: 'Sign in to see your upcoming games, your team, career stats, and payment history.',
      href: `/${slug}/me`,
      badge: 'Sign in',
    },
    {
      id: 'scorekeeper',
      icon: MapPin,
      title: 'Scorekeeper App',
      description: 'Staff track goals, penalties, and shots live from any phone. Works offline and syncs when reconnected.',
      href: `/${slug}/scorekeeper`,
      badge: 'Staff only',
    },
  ];
}

export function DemoTourPanel({ leagueSlug, hasSchedule, hasNews, hasRegistration }: DemoTourPanelProps) {
  const [open, setOpen] = useState(false);
  const [visited, setVisited] = useState<Set<string>>(new Set());
  const [dismissed, setDismissed] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional: SSR-safe mount flag
    setMounted(true);
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional: hydrating from localStorage on mount
      if (raw) setVisited(new Set(JSON.parse(raw)));
      // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional: hydrating from localStorage on mount
      if (localStorage.getItem(DISMISSED_KEY)) setDismissed(true);
    } catch {}
  }, []);

  const markVisited = (id: string) => {
    setVisited((prev) => {
      const next = new Set(prev);
      next.add(id);
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify([...next])); } catch {}
      return next;
    });
  };

  const dismiss = () => {
    setDismissed(true);
    setOpen(false);
    try { localStorage.setItem(DISMISSED_KEY, '1'); } catch {}
  };

  const resetTour = () => {
    setVisited(new Set());
    setDismissed(false);
    try {
      localStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem(DISMISSED_KEY);
    } catch {}
  };

  if (!mounted || dismissed) return null;

  const features = getFeatures(leagueSlug);
  const visitedCount = features.filter(f => visited.has(f.id)).length;
  const allDone = visitedCount === features.length;

  return (
    <div className="fixed bottom-6 left-4 z-50 flex flex-col items-start gap-2">
      {/* Panel */}
      {open && (
        <div className="w-80 max-h-[75vh] flex flex-col rounded-2xl border border-white/10 bg-neutral-900/95 backdrop-blur-xl shadow-2xl shadow-black/40 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.07] bg-gradient-to-r from-rink-500/10 to-arena-500/10 flex-shrink-0">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-rink-400" />
              <span className="text-sm font-bold text-white">Demo Tour</span>
              <span className="text-xs text-neutral-500 font-medium">
                {visitedCount}/{features.length} explored
              </span>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setOpen(false)}
                className="p-1 rounded-lg text-neutral-500 hover:text-white hover:bg-white/10 transition-colors"
                aria-label="Collapse"
              >
                <ChevronUp className="w-4 h-4" />
              </button>
              <button
                onClick={dismiss}
                className="p-1 rounded-lg text-neutral-500 hover:text-white hover:bg-white/10 transition-colors"
                aria-label="Dismiss tour"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Intro */}
          <div className="px-4 py-3 border-b border-white/[0.05] flex-shrink-0">
            <p className="text-xs text-neutral-400 leading-relaxed">
              This is a live demo league. Explore what your players and fans will see when you launch.
            </p>
          </div>

          {/* Feature list */}
          <div className="overflow-y-auto flex-1 divide-y divide-white/[0.04]">
            {features.map((feature) => {
              const Icon = feature.icon;
              const done = visited.has(feature.id);

              const inner = (
                <div
                  className={`flex items-start gap-3 px-4 py-3 transition-colors ${
                    feature.href ? 'hover:bg-white/[0.04] cursor-pointer' : ''
                  }`}
                >
                  <div className={`mt-0.5 flex-shrink-0 p-1.5 rounded-lg ${
                    done
                      ? 'bg-emerald-500/10 text-emerald-400'
                      : 'bg-white/[0.06] text-neutral-400'
                  }`}>
                    <Icon className="w-3.5 h-3.5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className={`text-xs font-semibold ${done ? 'text-neutral-300' : 'text-white'}`}>
                        {feature.title}
                      </span>
                      {feature.badge && (
                        <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-rink-500/15 text-rink-400">
                          {feature.badge}
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-neutral-500 leading-relaxed">
                      {feature.description}
                    </p>
                  </div>
                  <div className="flex-shrink-0 mt-0.5">
                    {done
                      ? <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                      : feature.href
                        ? <ExternalLink className="w-3.5 h-3.5 text-neutral-600" />
                        : <Circle className="w-4 h-4 text-neutral-700" />
                    }
                  </div>
                </div>
              );

              if (feature.href) {
                return (
                  <Link
                    key={feature.id}
                    href={feature.href}
                    onClick={() => markVisited(feature.id)}
                  >
                    {inner}
                  </Link>
                );
              }

              return (
                <div key={feature.id} onClick={() => markVisited(feature.id)}>
                  {inner}
                </div>
              );
            })}
          </div>

          {/* Footer */}
          <div className="px-4 py-3 border-t border-white/[0.06] bg-white/[0.02] flex-shrink-0">
            {allDone ? (
              <div className="flex items-center justify-between">
                <span className="text-xs text-emerald-400 font-semibold">✓ All features explored!</span>
                <button onClick={dismiss} className="text-xs text-neutral-500 hover:text-white transition-colors">
                  Dismiss
                </button>
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <div className="flex-1 h-1 bg-white/[0.06] rounded-full mr-3 overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-rink-500 to-arena-500 rounded-full transition-all duration-500"
                    style={{ width: `${(visitedCount / features.length) * 100}%` }}
                  />
                </div>
                <span className="text-xs text-neutral-500 whitespace-nowrap">
                  {features.length - visitedCount} left
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Toggle button */}
      <button
        onClick={() => setOpen((v) => !v)}
        className={`flex items-center gap-2 px-4 py-2.5 rounded-full shadow-lg transition-all duration-200 ${
          open
            ? 'bg-neutral-800 border border-white/10 text-neutral-300'
            : 'bg-gradient-to-r from-rink-500 to-arena-500 text-black font-bold shadow-rink-500/30 hover:shadow-rink-500/50 hover:scale-105'
        }`}
      >
        <Sparkles className={`w-4 h-4 ${open ? '' : 'animate-pulse'}`} />
        <span className="text-sm font-semibold">
          {open ? 'Hide Guide' : 'Explore Features'}
        </span>
        {!open && visitedCount > 0 && (
          <span className="text-xs font-bold bg-black/20 px-1.5 py-0.5 rounded-full">
            {visitedCount}/{features.length}
          </span>
        )}
      </button>
    </div>
  );
}
