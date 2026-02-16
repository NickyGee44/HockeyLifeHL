'use client';

import { useRef, useState, useCallback } from 'react';
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
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);
  const [selectedId, setSelectedId] = useState<string>(champions[0]?.id || '');

  const updateScrollButtons = useCallback(() => {
    if (!scrollRef.current) return;
    const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
    setCanScrollLeft(scrollLeft > 5);
    setCanScrollRight(scrollLeft + clientWidth < scrollWidth - 5);
  }, []);

  const scroll = useCallback((direction: 'left' | 'right') => {
    if (!scrollRef.current) return;
    scrollRef.current.scrollBy({
      left: direction === 'left' ? -320 : 320,
      behavior: 'smooth',
    });
    setTimeout(updateScrollButtons, 350);
  }, [updateScrollButtons]);

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
      <div className="relative">
        {/* Left Arrow */}
        {canScrollLeft && (
          <button
            onClick={() => scroll('left')}
            className="absolute left-0 top-0 bottom-0 z-20 flex items-center justify-center w-10 bg-gradient-to-r from-[var(--color-background)] via-[var(--color-background)]/80 to-transparent"
            aria-label="Scroll left"
          >
            <ChevronLeft className="w-5 h-5 text-[var(--color-text-secondary)]" />
          </button>
        )}

        {/* Scrollable container */}
        <div
          ref={scrollRef}
          onScroll={updateScrollButtons}
          className="flex gap-3 px-2 py-2 overflow-x-auto"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          <style jsx>{`div::-webkit-scrollbar { display: none; }`}</style>
          {champions.map((champ) => (
            <button
              key={champ.id}
              onClick={() => setSelectedId(champ.id)}
              className={`group relative flex-shrink-0 w-[200px] rounded-xl border overflow-hidden transition-all duration-200 text-left ${
                selected.id === champ.id
                  ? 'border-amber-500/60 ring-2 ring-amber-500/20 bg-amber-500/5'
                  : 'border-[var(--color-border)] bg-[var(--color-surface)] hover:border-amber-500/30 hover:bg-amber-500/5'
              }`}
            >
              {/* Photo / Fallback */}
              <div className="relative h-28 w-full bg-[var(--color-surface-hover)] overflow-hidden">
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
                      className="w-16 h-16 object-contain"
                    />
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <Trophy className="w-10 h-10 text-amber-400/40" />
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

        {/* Right Arrow */}
        {canScrollRight && (
          <button
            onClick={() => scroll('right')}
            className="absolute right-0 top-0 bottom-0 z-20 flex items-center justify-center w-10 bg-gradient-to-l from-[var(--color-background)] via-[var(--color-background)]/80 to-transparent"
            aria-label="Scroll right"
          >
            <ChevronRight className="w-5 h-5 text-[var(--color-text-secondary)]" />
          </button>
        )}
      </div>

      {/* Expanded detail panel for selected champion */}
      <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl overflow-hidden">
        {/* Header with photo */}
        <div className="relative">
          {selected.photo && (
            <div className="h-48 md:h-64 w-full overflow-hidden">
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
