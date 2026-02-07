'use client';

import { useTranslations } from 'next-intl';
import { Globe, Settings, Heart, Check } from 'lucide-react';

const pillars = [
  {
    id: 'websites',
    icon: Globe,
    color: 'from-rink-500/20 to-arena-500/10',
    iconColor: 'text-rink-500',
  },
  {
    id: 'operations',
    icon: Settings,
    color: 'from-arena-500/20 to-violet-500/10',
    iconColor: 'text-arena-500',
  },
  {
    id: 'experience',
    icon: Heart,
    color: 'from-violet-500/20 to-rink-500/10',
    iconColor: 'text-violet-400',
  },
];

export function ThreePillars() {
  const t = useTranslations('homepage');

  return (
    <div className="px-6 py-24 lg:px-12 bg-neutral-950">
      <div className="max-w-6xl mx-auto">
        {/* Section Header */}
        <div className="text-center mb-16">
          <h2 className="text-3xl lg:text-5xl font-bold text-white mb-4">
            {t('pillars.headline')}{' '}
            <span className="text-gradient-rink">{t('pillars.headlineAccent')}</span>
          </h2>
          <p className="text-lg text-neutral-400 max-w-2xl mx-auto">
            {t('pillars.subheadline')}
          </p>
        </div>

        {/* Pillars Grid */}
        <div className="grid md:grid-cols-3 gap-8">
          {pillars.map((pillar) => (
            <div
              key={pillar.id}
              className="group p-8 rounded-2xl bg-neutral-900/50 border border-white/10 hover:border-white/20 transition-all hover:-translate-y-1"
            >
              {/* Icon */}
              <div className={`w-16 h-16 rounded-xl bg-gradient-to-br ${pillar.color} flex items-center justify-center mb-6 group-hover:scale-110 transition-transform`}>
                <pillar.icon className={`w-8 h-8 ${pillar.iconColor}`} />
              </div>

              {/* Title & Description */}
              <h3 className="text-xl font-bold text-white mb-3">
                {t(`pillars.${pillar.id}.title`)}
              </h3>
              <p className="text-neutral-400 leading-relaxed mb-6">
                {t(`pillars.${pillar.id}.description`)}
              </p>

              {/* Benefits List */}
              <ul className="space-y-3">
                {[1, 2, 3].map((num) => (
                  <li key={num} className="flex items-start gap-3">
                    <Check className="w-5 h-5 text-rink-500 flex-shrink-0 mt-0.5" />
                    <span className="text-sm text-neutral-300">
                      {t(`pillars.${pillar.id}.benefit${num}`)}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
