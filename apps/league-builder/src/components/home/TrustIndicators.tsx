'use client';

import { useTranslations } from 'next-intl';
import { Users, Calendar, Trophy } from 'lucide-react';

// Placeholder league examples - replace with real customers when available
const placeholderLeagues = [
  { name: 'Downtown Adult Hockey League', location: 'Toronto, ON' },
  { name: 'Westside Beer League', location: 'Vancouver, BC' },
  { name: 'Capital City Hockey', location: 'Ottawa, ON' },
  { name: 'Prairie Puck League', location: 'Calgary, AB' },
  { name: 'Maritime Masters Hockey', location: 'Halifax, NS' },
];

export function TrustIndicators() {
  const t = useTranslations('homepage');

  return (
    <div className="bg-neutral-900 py-12 border-y border-white/10">
      <div className="max-w-6xl mx-auto px-6 lg:px-12">
        {/* Header */}
        <div className="flex items-center justify-center gap-4 mb-8">
          <div className="h-px flex-1 max-w-[100px] bg-gradient-to-r from-transparent to-rink-500/30" />
          <p className="text-sm font-medium text-neutral-400 uppercase tracking-wider text-center">
            {t('trust.headline')}
          </p>
          <div className="h-px flex-1 max-w-[100px] bg-gradient-to-l from-transparent to-rink-500/30" />
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-3 gap-8 mb-10">
          <div className="text-center">
            <div className="flex items-center justify-center gap-2 mb-2">
              <Users className="w-5 h-5 text-rink-500" />
              <span className="text-3xl lg:text-4xl font-bold text-white">500+</span>
            </div>
            <p className="text-sm text-neutral-400">{t('trust.stats.players')}</p>
          </div>
          <div className="text-center">
            <div className="flex items-center justify-center gap-2 mb-2">
              <Calendar className="w-5 h-5 text-rink-500" />
              <span className="text-3xl lg:text-4xl font-bold text-white">1,200+</span>
            </div>
            <p className="text-sm text-neutral-400">{t('trust.stats.games')}</p>
          </div>
          <div className="text-center">
            <div className="flex items-center justify-center gap-2 mb-2">
              <Trophy className="w-5 h-5 text-rink-500" />
              <span className="text-3xl lg:text-4xl font-bold text-white">25+</span>
            </div>
            <p className="text-sm text-neutral-400">{t('trust.stats.leagues')}</p>
          </div>
        </div>

        {/* League Names Marquee */}
        <div className="relative overflow-hidden">
          <div className="flex animate-marquee">
            {[...placeholderLeagues, ...placeholderLeagues, ...placeholderLeagues].map((league, index) => (
              <div
                key={index}
                className="flex-shrink-0 mx-6 px-4 py-2 rounded-full bg-white/5 border border-white/10"
              >
                <span className="text-sm text-neutral-300 whitespace-nowrap">
                  {league.name}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Testimonial */}
        <div className="mt-10 max-w-2xl mx-auto text-center">
          <blockquote className="text-lg text-neutral-300 italic mb-4">
            "{t('trust.testimonial.quote')}"
          </blockquote>
          <cite className="text-sm text-neutral-500 not-italic">
            — {t('trust.testimonial.author')}, {t('trust.testimonial.role')}
          </cite>
        </div>
      </div>
    </div>
  );
}
