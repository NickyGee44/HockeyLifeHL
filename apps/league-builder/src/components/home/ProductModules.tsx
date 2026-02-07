'use client';

import { useTranslations } from 'next-intl';
import {
  Globe,
  Calendar,
  BarChart3,
  CreditCard,
  LayoutDashboard,
  Smartphone,
} from 'lucide-react';

const modules = [
  {
    id: 'websites',
    icon: Globe,
    gradient: 'from-rink-500 to-arena-500',
    comingSoon: false,
  },
  {
    id: 'schedule',
    icon: Calendar,
    gradient: 'from-arena-500 to-violet-500',
    comingSoon: false,
  },
  {
    id: 'stats',
    icon: BarChart3,
    gradient: 'from-violet-500 to-pink-500',
    comingSoon: false,
  },
  {
    id: 'payments',
    icon: CreditCard,
    gradient: 'from-emerald-500 to-teal-500',
    comingSoon: false,
  },
  {
    id: 'dashboard',
    icon: LayoutDashboard,
    gradient: 'from-amber-500 to-orange-500',
    comingSoon: false,
  },
  {
    id: 'playerApp',
    icon: Smartphone,
    gradient: 'from-neutral-500 to-neutral-600',
    comingSoon: true,
  },
];

export function ProductModules() {
  const t = useTranslations('homepage');

  return (
    <div className="px-6 py-24 lg:px-12 bg-gradient-to-b from-neutral-950 to-neutral-900">
      <div className="max-w-6xl mx-auto">
        {/* Section Header */}
        <div className="text-center mb-16">
          <h2 className="text-3xl lg:text-5xl font-bold text-white mb-4">
            {t('modules.headline')}
          </h2>
          <p className="text-lg text-neutral-400 max-w-2xl mx-auto">
            {t('modules.subheadline')}
          </p>
        </div>

        {/* Modules Grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {modules.map((module) => (
            <div
              key={module.id}
              className={`group relative p-6 rounded-2xl bg-white/[0.03] border border-white/10 hover:border-white/20 transition-all hover:-translate-y-1 ${
                module.comingSoon ? 'opacity-70' : ''
              }`}
            >
              {/* Coming Soon Badge */}
              {module.comingSoon && (
                <div className="absolute top-4 right-4 px-2 py-1 rounded-full bg-rink-500/20 text-rink-400 text-xs font-medium">
                  {t('modules.comingSoon')}
                </div>
              )}

              {/* Icon */}
              <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${module.gradient} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                <module.icon className="w-6 h-6 text-white" />
              </div>

              {/* Content */}
              <h3 className="text-lg font-bold text-white mb-2">
                {t(`modules.${module.id}.title`)}
              </h3>
              <p className="text-sm text-neutral-400 leading-relaxed">
                {t(`modules.${module.id}.description`)}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
