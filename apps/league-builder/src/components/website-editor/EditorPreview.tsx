'use client';

import type { CSSProperties, ElementType, ReactNode } from 'react';
import { cn } from '@hockey-life/ui';
import {
  BarChart3,
  Calendar,
  ExternalLink,
  Globe,
  LayoutGrid,
  PanelLeft,
  PanelLeftClose,
  ShieldCheck,
  Trophy,
  Users,
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import { LeagueLogo } from '@/components/ui/league-logo';
import { useEditor } from './EditorContext';
import { VIEWPORT_WIDTHS } from './constants';
import { buildEditorThemePalette } from '@/lib/website-editor/theme-palette';
import type { EditorState, LeagueEditorData } from './types';

export function EditorPreview() {
  const { state, toggleSidebar, previewUrl } = useEditor();
  const t = useTranslations('websiteEditor');
  const selectedLeague = state.leagues.find((league) => league.id === state.selectedLeagueId);
  const palette = buildEditorThemePalette({
    primaryColor: state.primaryColor,
    secondaryColor: state.secondaryColor,
    accentColor: state.accentColor,
    themePreset: state.themePreset,
  });

  const isMobile = state.viewportSize === 'mobile';
  const isTablet = state.viewportSize === 'tablet';
  const isConstrained = isMobile || isTablet;

  const fallbackPages = Object.entries(state.visiblePages)
    .filter(([, visible]) => visible)
    .map(([key]) => ({
      label: key.charAt(0).toUpperCase() + key.slice(1),
      href: `/${key}`,
    }));

  const navigationItems =
    state.navItems.length > 0
      ? state.navItems.slice(0, 5).map((item) => ({
          label: item.label,
          href: item.href,
        }))
      : fallbackPages.slice(0, 5);

  const frameStyles = {
    '--wire-canvas': palette.canvasColor,
    '--wire-surface': palette.surfaceColor,
    '--wire-surface-muted': palette.surfaceMutedColor,
    '--wire-surface-strong': palette.surfaceStrongColor,
    '--wire-border': palette.borderColor,
    '--wire-text': palette.textColor,
    '--wire-muted': palette.mutedTextColor,
    '--wire-primary': palette.primaryColor,
    '--wire-primary-text': palette.primaryTextColor,
    '--wire-accent': palette.accentColor,
    '--wire-accent-text': palette.accentTextColor,
    '--wire-hero-start': palette.heroStartColor,
    '--wire-hero-end': palette.heroEndColor,
    '--wire-chip-bg': palette.chipBackgroundColor,
    '--wire-chip-text': palette.chipTextColor,
  } as CSSProperties;

  const headerLinks = navigationItems.length > 0 ? navigationItems : [
    { label: 'Schedule', href: '/schedule' },
    { label: 'Standings', href: '/standings' },
    { label: 'Teams', href: '/teams' },
    { label: 'Stats', href: '/stats' },
  ];

  return (
    <main className="flex-1 bg-neutral-800 flex flex-col relative min-w-0">
      <button
        onClick={toggleSidebar}
        className={cn(
          'absolute top-3 left-3 z-20 p-2 rounded-lg transition-all duration-200',
          'bg-neutral-700/80 hover:bg-neutral-700 text-neutral-300 hover:text-white',
          'border border-white/10 hover:border-white/20 shadow-lg backdrop-blur-sm',
        )}
        title={state.isSidebarCollapsed ? t('showPanel') : t('hidePanel')}
      >
        {state.isSidebarCollapsed ? (
          <PanelLeft className="w-5 h-5" />
        ) : (
          <PanelLeftClose className="w-5 h-5" />
        )}
      </button>

      <div className="absolute right-4 top-4 z-10 flex items-center gap-2 rounded-full border border-white/10 bg-neutral-900/80 px-3 py-1.5 text-xs text-neutral-300 backdrop-blur-sm">
        <ShieldCheck className="h-3.5 w-3.5 text-rink-400" />
        {t('wireframeStatus')}
      </div>

      <div className="flex-1 overflow-auto p-4 md:p-6">
        {isConstrained ? (
          <div className="flex min-h-full items-center justify-center">
            <div
              className={cn(
                'overflow-hidden shadow-2xl shrink-0',
                isMobile && 'rounded-[2rem] border-[10px] border-neutral-700',
                isTablet && 'rounded-[1.5rem] border-4 border-neutral-700',
              )}
              style={{
                width: VIEWPORT_WIDTHS[state.viewportSize],
                minHeight: isMobile ? 760 : 880,
                maxWidth: '100%',
              }}
            >
              <WireframeContent
                paletteStyles={frameStyles}
                selectedLeague={selectedLeague}
                state={state}
                headerLinks={headerLinks}
                previewUrl={previewUrl}
              />
            </div>
          </div>
        ) : (
          <div className="mx-auto max-w-[1280px]">
            <div className="rounded-[2rem] border border-white/10 shadow-2xl overflow-hidden">
              <WireframeContent
                paletteStyles={frameStyles}
                selectedLeague={selectedLeague}
                state={state}
                headerLinks={headerLinks}
                previewUrl={previewUrl}
              />
            </div>
          </div>
        )}
      </div>
    </main>
  );
}

function WireframeContent({
  paletteStyles,
  selectedLeague,
  state,
  headerLinks,
  previewUrl,
}: {
  paletteStyles: CSSProperties;
  selectedLeague: LeagueEditorData | undefined;
  state: EditorState;
  headerLinks: Array<{ label: string; href: string }>;
  previewUrl: string;
}) {
  const t = useTranslations('websiteEditor');
  const leagueName = selectedLeague?.name || 'Your League';
  const tagline =
    state.tagline.trim() || 'Commissioner-first hockey websites with schedules, stats, and registration.';
  const description =
    state.description.trim() ||
    'Saved changes publish to your live league site. This wireframe shows the hierarchy, color balance, and surface treatment before you refresh the public site.';
  const publicUrl = previewUrl.replace('?preview=true', '');

  return (
    <section
      style={paletteStyles}
      className="min-h-full bg-[var(--wire-canvas)] text-[var(--wire-text)]"
    >
      <div
        className="border-b border-[var(--wire-border)] px-5 py-4 md:px-8"
        style={{ backgroundColor: 'var(--wire-surface)' }}
      >
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <LeagueLogo
              logoUrl={state.logoUrl}
              leagueName={leagueName}
              primaryColor={state.primaryColor}
              size="sm"
              shape="square"
              bordered
            />
            <div>
              <p className="text-sm font-semibold">{leagueName}</p>
              <p className="text-xs text-[var(--wire-muted)]">
                {state.themePreset === 'light'
                  ? t('wireframeModeLight')
                  : state.themePreset === 'custom'
                    ? t('wireframeModeCustom')
                    : t('wireframeModeDark')}
              </p>
            </div>
          </div>

          <div className="hidden items-center gap-4 text-sm md:flex">
            {headerLinks.map((item) => (
              <span key={`${item.label}-${item.href}`} className="text-[var(--wire-muted)]">
                {item.label}
              </span>
            ))}
          </div>

          <a
            href={publicUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-full border border-[var(--wire-border)] bg-[var(--wire-surface-muted)] px-3 py-1.5 text-xs font-medium text-[var(--wire-text)] transition-colors hover:bg-[var(--wire-surface-strong)]"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            {t('openNewTab')}
          </a>
        </div>
      </div>

      <div className="space-y-6 p-5 md:space-y-8 md:p-8">
        <div
          className="overflow-hidden rounded-[1.75rem] border border-[var(--wire-border)]"
          style={{
            backgroundImage: state.bannerUrl
              ? `linear-gradient(135deg, var(--wire-hero-start), var(--wire-hero-end)), url(${state.bannerUrl})`
              : 'linear-gradient(135deg, var(--wire-hero-start), var(--wire-hero-end))',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
        >
          <div className="bg-black/20 px-5 py-8 md:px-8 md:py-12">
            <div className="mb-4 flex flex-wrap gap-2">
              <PreviewChip icon={Globe} label="Live website" />
              <PreviewChip icon={Calendar} label="Schedules" />
              <PreviewChip icon={BarChart3} label="Standings + stats" />
              <PreviewChip icon={Users} label="Player experience" />
            </div>
            <h2 className="max-w-3xl text-3xl font-black tracking-tight md:text-5xl">
              {tagline}
            </h2>
            <p className="mt-4 max-w-3xl text-sm text-white/85 md:text-base">
              {description}
            </p>

            <div className="mt-6 flex flex-wrap gap-3">
              <button
                type="button"
                className="rounded-full px-4 py-2 text-sm font-semibold"
                style={{
                  backgroundColor: 'var(--wire-primary)',
                  color: 'var(--wire-primary-text)',
                }}
              >
                Save Changes
              </button>
              <div className="rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm text-white/90">
                {t('wireframeSaveHint')}
              </div>
            </div>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-[1.25fr_0.85fr]">
          <div className="space-y-4">
            <PreviewSectionCard title="Homepage structure" icon={LayoutGrid}>
              <div className="grid gap-3 md:grid-cols-3">
                <MetricCard label="Games This Week" value="12" />
                <MetricCard label="Active Teams" value="14" />
                <MetricCard label="Players Registered" value="246" />
              </div>
            </PreviewSectionCard>

            <PreviewSectionCard title="Upcoming games module" icon={Calendar}>
              <div className="space-y-3">
                {[
                  ['Tue 8:30 PM', 'Ice 1', 'Wolves vs Bears'],
                  ['Wed 9:45 PM', 'Ice 2', 'Knights vs Titans'],
                  ['Thu 7:15 PM', 'Pad A', 'Falcons vs Rangers'],
                ].map(([time, rink, matchup]) => (
                  <div
                    key={`${time}-${rink}-${matchup}`}
                    className="flex items-center justify-between rounded-2xl border border-[var(--wire-border)] bg-[var(--wire-surface-muted)] px-4 py-3"
                  >
                    <div>
                      <p className="text-sm font-semibold">{matchup}</p>
                      <p className="text-xs text-[var(--wire-muted)]">{rink}</p>
                    </div>
                    <span className="rounded-full bg-[var(--wire-chip-bg)] px-3 py-1 text-xs font-medium text-[var(--wire-chip-text)]">
                      {time}
                    </span>
                  </div>
                ))}
              </div>
            </PreviewSectionCard>
          </div>

          <div className="space-y-4">
            <PreviewSectionCard title="Standings card" icon={Trophy}>
              <div className="space-y-2">
                {[
                  ['1', 'Wolves', '18 pts'],
                  ['2', 'Titans', '16 pts'],
                  ['3', 'Falcons', '14 pts'],
                  ['4', 'Rangers', '11 pts'],
                ].map(([rank, team, points], index) => (
                  <div
                    key={`${rank}-${team}`}
                    className={cn(
                      'flex items-center justify-between rounded-xl px-3 py-2 text-sm',
                      index === 0
                        ? 'bg-[var(--wire-surface-strong)]'
                        : 'bg-[var(--wire-surface-muted)]'
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <span
                        className="inline-flex h-7 w-7 items-center justify-center rounded-full font-semibold"
                        style={{
                          backgroundColor: index === 0 ? 'var(--wire-accent)' : 'var(--wire-surface)',
                          color: index === 0 ? 'var(--wire-accent-text)' : 'var(--wire-text)',
                        }}
                      >
                        {rank}
                      </span>
                      <span>{team}</span>
                    </div>
                    <span className="text-[var(--wire-muted)]">{points}</span>
                  </div>
                ))}
              </div>
            </PreviewSectionCard>

            <PreviewSectionCard title="Theme balance" icon={ShieldCheck}>
              <div className="space-y-3 text-sm">
                <ModeBalanceRow
                  label={t('wireframeModeDark')}
                  surfaceLabel="Dark surface"
                  surfaceColor={buildTonePreview(state, 'dark')}
                />
                <ModeBalanceRow
                  label={t('wireframeModeLight')}
                  surfaceLabel="Light surface"
                  surfaceColor={buildTonePreview(state, 'light')}
                />
                <p className="text-xs text-[var(--wire-muted)]">
                  {t('wireframeContrastHint')}
                </p>
              </div>
            </PreviewSectionCard>
          </div>
        </div>

        <div className="rounded-[1.5rem] border border-[var(--wire-border)] bg-[var(--wire-surface)] px-5 py-4 md:px-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold">{leagueName}</p>
              <p className="text-xs text-[var(--wire-muted)]">
                {state.contactEmail || 'contact@beerleaguehockey.ca'}
                {state.contactPhone ? ` • ${state.contactPhone}` : ''}
              </p>
            </div>
            <div className="flex flex-wrap gap-2 text-xs">
              {headerLinks.slice(0, 4).map((item) => (
                <span
                  key={`footer-${item.label}`}
                  className="rounded-full border border-[var(--wire-border)] px-3 py-1 text-[var(--wire-muted)]"
                >
                  {item.label}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function PreviewSectionCard({
  title,
  icon: Icon,
  children,
}: {
  title: string;
  icon: ElementType;
  children: ReactNode;
}) {
  return (
    <div className="rounded-[1.5rem] border border-[var(--wire-border)] bg-[var(--wire-surface)] p-4 md:p-5">
      <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-[var(--wire-text)]">
        <Icon className="h-4 w-4 text-[var(--wire-primary)]" />
        {title}
      </div>
      {children}
    </div>
  );
}

function PreviewChip({
  icon: Icon,
  label,
}: {
  icon: ElementType;
  label: string;
}) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--wire-chip-bg)] px-3 py-1 text-xs font-medium text-[var(--wire-chip-text)]">
      <Icon className="h-3.5 w-3.5" />
      {label}
    </span>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-[var(--wire-border)] bg-[var(--wire-surface-muted)] px-4 py-3">
      <p className="text-xs uppercase tracking-wide text-[var(--wire-muted)]">{label}</p>
      <p className="mt-2 text-2xl font-black">{value}</p>
    </div>
  );
}

function ModeBalanceRow({
  label,
  surfaceLabel,
  surfaceColor,
}: {
  label: string;
  surfaceLabel: string;
  surfaceColor: string;
}) {
  return (
    <div className="rounded-2xl border border-[var(--wire-border)] bg-[var(--wire-surface-muted)] p-3">
      <div className="mb-2 flex items-center justify-between">
        <span className="font-medium text-[var(--wire-text)]">{label}</span>
        <span className="text-xs text-[var(--wire-muted)]">{surfaceLabel}</span>
      </div>
      <div
        className="flex items-center justify-between rounded-xl px-3 py-2"
        style={{ backgroundColor: surfaceColor }}
      >
        <span
          className="text-sm font-semibold"
          style={{ color: readableTextForSurface(surfaceColor) }}
        >
          Readable heading
        </span>
        <span
          className="text-xs"
          style={{ color: readableTextForSurface(surfaceColor, true) }}
        >
          Supporting copy
        </span>
      </div>
    </div>
  );
}

function buildTonePreview(
  state: EditorState,
  mode: 'dark' | 'light'
) {
  return buildEditorThemePalette({
    primaryColor: state.primaryColor,
    secondaryColor: state.secondaryColor,
    accentColor: state.accentColor,
    themePreset: mode,
  }).surfaceColor;
}

function readableTextForSurface(surfaceColor: string, muted = false) {
  const hex = surfaceColor.replace('#', '');
  const numeric = parseInt(hex, 16);
  const r = (numeric >> 16) & 255;
  const g = (numeric >> 8) & 255;
  const b = numeric & 255;
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;

  if (muted) {
    return luminance > 0.55 ? '#475569' : '#CBD5E1';
  }

  return luminance > 0.55 ? '#0F172A' : '#F8FAFC';
}
