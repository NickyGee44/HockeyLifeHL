'use client';

import Link from 'next/link';
import { cn } from '@hockey-life/ui';
import { ArrowRight, CheckCircle2, CircleDashed, LoaderCircle } from 'lucide-react';
import type { SetupChecklistState } from '@/lib/onboarding/types';

interface SetupChecklistCardProps {
  checklist: SetupChecklistState;
  locale: string;
}

function localizeHref(locale: string, href: string) {
  if (!href.startsWith('/')) {
    return href;
  }

  return href.startsWith(`/${locale}/`) ? href : `/${locale}${href}`;
}

function getStatusIcon(status: SetupChecklistState['items'][number]['status']) {
  if (status === 'complete') {
    return <CheckCircle2 className="h-4 w-4 text-emerald-400" />;
  }

  if (status === 'in_progress') {
    return <LoaderCircle className="h-4 w-4 text-cyan-300" />;
  }

  return <CircleDashed className="h-4 w-4 text-neutral-500" />;
}

export function SetupChecklistCard({
  checklist,
  locale,
}: SetupChecklistCardProps) {
  const progress = checklist.totalCount === 0
    ? 0
    : Math.round((checklist.completedCount / checklist.totalCount) * 100);

  return (
    <div className="relative overflow-hidden rounded-[28px] border border-white/[0.08] bg-[radial-gradient(circle_at_top_left,rgba(34,211,238,0.14),transparent_30%),linear-gradient(145deg,rgba(255,255,255,0.05),rgba(255,255,255,0.02))] p-5 shadow-[0_20px_60px_rgba(0,0,0,0.38)]">
      <div className="absolute inset-x-10 top-0 h-px bg-gradient-to-r from-transparent via-rink-300/50 to-transparent" />
      <div className="flex flex-col gap-4 border-b border-white/[0.08] pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-neutral-500">
            {checklist.scope} checklist
          </p>
          <h2 className="mt-3 text-xl font-bold text-white">{checklist.title}</h2>
          <p className="mt-2 text-sm leading-7 text-neutral-400">
            {checklist.completedCount} of {checklist.totalCount} launch tasks complete.
          </p>
        </div>

        {checklist.nextActionHref && checklist.nextActionLabel ? (
          <Link
            href={localizeHref(locale, checklist.nextActionHref)}
            className="inline-flex items-center gap-2 rounded-2xl bg-rink-500 px-4 py-2 text-sm font-semibold text-black transition-colors hover:bg-rink-400"
          >
            {checklist.nextActionLabel}
            <ArrowRight className="h-4 w-4" />
          </Link>
        ) : null}
      </div>

      <div className="mt-4">
        <div className="flex items-center justify-between text-[11px] font-semibold uppercase tracking-[0.16em] text-neutral-500">
          <span>Progress</span>
          <span>{progress}%</span>
        </div>
        <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/[0.06]">
          <div
            className="h-full rounded-full bg-[linear-gradient(90deg,rgba(34,211,238,0.85),rgba(59,130,246,0.85))] transition-[width] duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      <div className="mt-5 space-y-3">
        {checklist.items.map((item) => (
          <Link
            key={item.id}
            href={localizeHref(locale, item.href)}
            className={cn(
              'group flex items-start justify-between gap-4 rounded-2xl border p-4 transition-[border-color,background-color,transform]',
              item.status === 'complete'
                ? 'border-emerald-400/20 bg-emerald-500/10'
                : item.status === 'in_progress'
                  ? 'border-cyan-400/20 bg-cyan-400/10'
                  : 'border-white/[0.08] bg-white/[0.02] hover:-translate-y-0.5 hover:border-white/[0.16] hover:bg-white/[0.04]'
            )}
          >
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                {getStatusIcon(item.status)}
                <p className="text-sm font-semibold text-white">{item.label}</p>
              </div>
              <p className="mt-2 text-sm leading-7 text-neutral-400">{item.description}</p>
            </div>
            <ArrowRight className="mt-0.5 h-4 w-4 shrink-0 text-neutral-500 transition-transform group-hover:translate-x-0.5" />
          </Link>
        ))}
      </div>
    </div>
  );
}
