'use client';

import { useRef, useState, useCallback, useEffect } from 'react';
import Link from 'next/link';
import { ChevronLeft, ChevronRight, Trophy, Calendar, Users } from 'lucide-react';

export interface TimelineChampion {
  id: string;
  type: 'database' | 'legacy';
  year: string;
  seasonName: string;
  teamName: string;
  teamLogo?: string | null;
  photo?: string | null;
  record?: { wins: number; losses: number; ties: number } | null;
  seasonId?: string;
  roster?: { playerId: string; fullName: string; jerseyNumber: number | null; position: string | null; leadershipRole: string | null }[];
  finalGame?: { homeTeam: string; awayTeam: string; homeScore: number; awayScore: number; date: string } | null;
  seasonSummary?: string | null;
}

interface ChampionsTimelineProps {
  champions: TimelineChampion[];
  leagueSlug: string;
}

export function ChampionsTimeline({ champions, leagueSlug }: ChampionsTimelineProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<Map<string, HTMLButtonElement>>(new Map());
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const [selectedId, setSelectedId] = useState<string>(champions[champions.length - 1]?.id || '');

  const updateScrollState = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const { scrollLeft, scrollWidth, clientWidth } = el;
    setCanScrollLeft(scrollLeft > 2);
    setCanScrollRight(scrollLeft + clientWidth < scrollWidth - 2);
  }, []);

  // On mount, scroll to the end (most recent champion) and update state
  useEffect(() => {
    const el = scrollRef.current;
    if (el) {
      el.scrollLeft = el.scrollWidth;
    }
    updateScrollState();
    const timer = setTimeout(updateScrollState, 100);
    return () => clearTimeout(timer);
  }, [updateScrollState, champions]);

  // Observe container resize to update scroll state
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const observer = new ResizeObserver(updateScrollState);
    observer.observe(el);
    return () => observer.disconnect();
  }, [updateScrollState]);

  const scrollToItem = useCallback((direction: 'left' | 'right') => {
    const container = scrollRef.current;
    if (!container) return;

    const items = Array.from(container.children) as HTMLElement[];
    const containerRect = container.getBoundingClientRect();

    if (direction === 'right') {
      // Find the first item that's partially or fully off-screen to the right
      const nextItem = items.find((item) => {
        const rect = item.getBoundingClientRect();
        return rect.right > containerRect.right + 2;
      });
      if (nextItem) {
        nextItem.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'start' });
      }
    } else {
      // Find the last item that's partially or fully off-screen to the left
      const prevItems = items.filter((item) => {
        const rect = item.getBoundingClientRect();
        return rect.left < containerRect.left - 2;
      });
      const prevItem = prevItems[prevItems.length - 1];
      if (prevItem) {
        prevItem.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'end' });
      }
    }

    setTimeout(updateScrollState, 400);
  }, [updateScrollState]);

  const handleSelect = useCallback((id: string) => {
    setSelectedId(id);
    // Scroll the selected card into view
    const el = itemRefs.current.get(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });
      setTimeout(updateScrollState, 400);
    }
  }, [updateScrollState]);

  if (champions.length === 0) {
    return (
      <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-8 text-center">
        <Trophy className="w-12 h-12 text-[var(--color-text-muted)] mx-auto mb-4" />
        <p className="text-[var(--color-text-secondary)]">No champions crowned yet. Check back after the current season ends!</p>
      </div>
    );
  }

  const selected = champions.find(c => c.id === selectedId) || champions[0];

  return (
    <div className="space-y-4">
      {/* Horizontal scrolling timeline strip */}
      <div className="relative group/scroller">
        {/* Scroll buttons — overlaid on edges */}
        {canScrollLeft && (
          <button
            onClick={() => scrollToItem('left')}
            className="absolute left-2 top-1/2 -translate-y-1/2 z-20 flex items-center justify-center w-10 h-10 rounded-full border border-[var(--color-border)] bg-[var(--color-surface)]/90 backdrop-blur-sm shadow-lg transition-all duration-150 hover:bg-[var(--color-surface-hover)] hover:border-[var(--color-text-muted)] active:scale-95"
            aria-label="Scroll left"
          >
            <ChevronLeft className="w-5 h-5 text-[var(--color-text-secondary)]" />
          </button>
        )}
        {canScrollRight && (
          <button
            onClick={() => scrollToItem('right')}
            className="absolute right-2 top-1/2 -translate-y-1/2 z-20 flex items-center justify-center w-10 h-10 rounded-full border border-[var(--color-border)] bg-[var(--color-surface)]/90 backdrop-blur-sm shadow-lg transition-all duration-150 hover:bg-[var(--color-surface-hover)] hover:border-[var(--color-text-muted)] active:scale-95"
            aria-label="Scroll right"
          >
            <ChevronRight className="w-5 h-5 text-[var(--color-text-secondary)]" />
          </button>
        )}

        {/* Scrollable container */}
        <div
          ref={scrollRef}
          onScroll={updateScrollState}
          className="flex gap-4 px-1 py-2 overflow-x-auto scroll-smooth snap-x snap-mandatory [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
        >
          {champions.map((champ) => (
            <button
              key={champ.id}
              ref={(el) => {
                if (el) itemRefs.current.set(champ.id, el);
                else itemRefs.current.delete(champ.id);
              }}
              onClick={() => handleSelect(champ.id)}
              className={`group relative flex-shrink-0 w-[260px] snap-start rounded-xl border overflow-hidden transition-all duration-200 text-left ${
                selected.id === champ.id
                  ? 'border-amber-500/60 ring-2 ring-amber-500/20 bg-amber-500/5 scale-[1.02]'
                  : 'border-[var(--color-border)] bg-[var(--color-surface)] hover:border-amber-500/30 hover:bg-amber-500/5'
              }`}
            >
              {/* Photo / Fallback */}
              <div className="relative h-44 w-full bg-[var(--color-surface-hover)] overflow-hidden">
                {champ.photo ? (
                  <img
                    src={champ.photo}
                    alt={`${champ.teamName || champ.year} Champions`}
                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                ) : champ.teamLogo ? (
                  <div className="flex items-center justify-center h-full">
                    <img
                      src={champ.teamLogo}
                      alt={champ.teamName}
                      className="w-20 h-20 object-contain"
                    />
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <Trophy className="w-12 h-12 text-amber-400/40" />
                  </div>
                )}
                {/* Year badge */}
                <div className="absolute top-2 left-2 bg-black/60 backdrop-blur-sm text-white text-xs font-bold px-2 py-0.5 rounded-md">
                  {champ.year}
                </div>
                {/* Selection indicator */}
                {selected.id === champ.id && (
                  <div className="absolute bottom-0 left-0 right-0 h-1 bg-amber-500" />
                )}
              </div>

              {/* Card info */}
              <div className="p-3">
                <p className="font-bold text-sm text-[var(--color-text-primary)] truncate">
                  {champ.teamName || `${champ.year} Champions`}
                </p>
                {champ.record && (
                  <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
                    {champ.record.wins}W-{champ.record.losses}L-{champ.record.ties}T
                  </p>
                )}
                {!champ.record && champ.type === 'legacy' && (
                  <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
                    League Champions
                  </p>
                )}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Expanded detail panel for selected champion */}
      <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl overflow-hidden">
        {/* Header with photo */}
        <div className="relative">
          {selected.photo && (
            <div className="h-64 md:h-80 lg:h-96 w-full overflow-hidden">
              <img
                src={selected.photo}
                alt={`${selected.teamName || selected.year} Champions`}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[var(--color-surface)] via-transparent to-transparent" />
            </div>
          )}
          <div className={`${selected.photo ? 'absolute bottom-0 left-0 right-0' : ''} p-6`}>
            <div className="flex items-center gap-2 text-amber-400 text-xs font-semibold uppercase tracking-wider mb-1">
              <Trophy className="w-4 h-4" />
              {selected.year} Champions
            </div>
            <h3 className="text-2xl md:text-3xl font-black text-[var(--color-text-primary)]">
              {selected.teamName || `${selected.year} Champions`}
            </h3>
            {selected.record && (
              <p className="text-sm text-[var(--color-text-secondary)] mt-1">
                Season Record: {selected.record.wins}W-{selected.record.losses}L-{selected.record.ties}T
              </p>
            )}
          </div>
        </div>

        {/* Details */}
        <div className="p-6 pt-0 space-y-4">
          {/* Season summary */}
          {selected.seasonSummary && (
            <p className="text-sm text-[var(--color-text-secondary)] italic">
              {selected.seasonSummary}
            </p>
          )}

          {/* Final Game Score */}
          {selected.finalGame && (
            <div className="bg-[var(--color-surface-hover)] rounded-lg p-4">
              <p className="text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wider mb-3">
                Championship Game
              </p>
              <div className="flex items-center justify-center gap-4 text-sm">
                <span className="font-semibold text-[var(--color-text-primary)]">{selected.finalGame.homeTeam}</span>
                <span className="text-xl font-black text-[var(--league-primary)]">
                  {selected.finalGame.homeScore} - {selected.finalGame.awayScore}
                </span>
                <span className="font-semibold text-[var(--color-text-primary)]">{selected.finalGame.awayTeam}</span>
              </div>
              <p className="text-xs text-[var(--color-text-muted)] text-center mt-2">
                {new Date(selected.finalGame.date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
              </p>
            </div>
          )}

          {/* Championship Roster */}
          {selected.roster && selected.roster.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Users className="w-4 h-4 text-[var(--color-text-muted)]" />
                <p className="text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wider">
                  Championship Roster ({selected.roster.length} players)
                </p>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                {selected.roster.map((player) => (
                  <Link
                    key={player.playerId}
                    href={`/${leagueSlug}/players/${player.playerId}`}
                    className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-[var(--color-surface-hover)] transition-colors text-sm"
                  >
                    {player.jerseyNumber !== null && (
                      <span className="text-xs font-mono text-[var(--color-text-muted)] w-5 text-right">
                        #{player.jerseyNumber}
                      </span>
                    )}
                    <span className="text-[var(--color-text-primary)] truncate">
                      {player.fullName}
                    </span>
                    {player.leadershipRole === 'captain' && (
                      <span className="text-xs text-amber-400 font-bold">C</span>
                    )}
                    {player.leadershipRole === 'alternate_captain' && (
                      <span className="text-xs text-[var(--color-text-muted)] font-bold">A</span>
                    )}
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Link to full standings */}
          {selected.seasonId && (
            <div className="pt-2">
              <Link
                href={`/${leagueSlug}/standings?season=${selected.seasonId}`}
                className="inline-flex items-center gap-2 text-sm text-[var(--league-primary)] hover:underline"
              >
                <Calendar className="w-4 h-4" />
                View Full {selected.seasonName} Standings
                <ChevronRight className="w-4 h-4" />
              </Link>
            </div>
          )}

          {/* Legacy placeholder for WOHA */}
          {selected.type === 'legacy' && !selected.finalGame && !selected.roster?.length && (
            <p className="text-sm text-[var(--color-text-muted)] text-center py-4">
              Historical champion data from league archives
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
