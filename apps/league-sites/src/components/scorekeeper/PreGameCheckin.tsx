'use client';

import { useState, useCallback } from 'react';
import Image from 'next/image';
import type { GameData, CheckinPlayer } from '@/lib/actions/scorekeeper';
import { updateScorekeeperCheckin, updateGameStatus } from '@/lib/actions/scorekeeper';

interface PreGameCheckinProps {
  game: GameData;
  checkins: { homeTeam: CheckinPlayer[]; awayTeam: CheckinPlayer[] };
  onGameStarted: () => void;
}

export function PreGameCheckin({ game, checkins: initialCheckins, onGameStarted }: PreGameCheckinProps) {
  const [activeTab, setActiveTab] = useState<'home' | 'away'>('home');
  const [checkins, setCheckins] = useState(initialCheckins);
  const [loading, setLoading] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);

  const homeTeam = game.homeTeam;
  const awayTeam = game.awayTeam;

  const homeColor = homeTeam.primaryColor || 'var(--league-primary, #d4af37)';
  const awayColor = awayTeam.primaryColor || 'var(--league-primary, #d4af37)';

  const currentRoster = activeTab === 'home' ? checkins.homeTeam : checkins.awayTeam;
  const currentTeam = activeTab === 'home' ? homeTeam : awayTeam;
  const currentColor = activeTab === 'home' ? homeColor : awayColor;
  const confirmedCount = currentRoster.filter(p => p.checkinStatus === 'confirmed').length;

  const handleToggle = useCallback(async (player: CheckinPlayer) => {
    const teamId = activeTab === 'home' ? homeTeam.id : awayTeam.id;
    const newStatus: 'confirmed' | 'out' = player.checkinStatus === 'confirmed' ? 'out' : 'confirmed';

    setLoading(player.id);

    // Optimistic update
    setCheckins(prev => {
      const key = activeTab === 'home' ? 'homeTeam' : 'awayTeam';
      return {
        ...prev,
        [key]: prev[key].map(p =>
          p.id === player.id ? { ...p, checkinStatus: newStatus } : p
        ),
      };
    });

    const result = await updateScorekeeperCheckin(game.id, player.id, teamId, newStatus);

    if (!result.success) {
      // Revert on failure
      setCheckins(prev => {
        const key = activeTab === 'home' ? 'homeTeam' : 'awayTeam';
        return {
          ...prev,
          [key]: prev[key].map(p =>
            p.id === player.id ? { ...p, checkinStatus: player.checkinStatus } : p
          ),
        };
      });
    }

    setLoading(null);
  }, [activeTab, homeTeam.id, awayTeam.id, game.id]);

  const handleStartGame = useCallback(async () => {
    setStarting(true);
    const result = await updateGameStatus(game.id, 'in_progress');
    if (result.success) {
      onGameStarted();
    }
    setStarting(false);
  }, [game.id, onGameStarted]);

  const positionAbbrev = (pos: string) => {
    switch (pos) {
      case 'Forward': return 'F';
      case 'Defense': return 'D';
      case 'Goalie': return 'G';
      default: return pos.charAt(0);
    }
  };

  return (
    <div className="flex flex-col min-h-screen">
      {/* Header */}
      <div className="px-4 py-3 border-b border-[var(--color-border)]">
        <div className="text-center">
          <div className="text-xs font-medium text-[var(--color-text-secondary)] uppercase tracking-wide mb-1">
            Pre-Game Check-In
          </div>
          <div className="text-sm font-bold text-[var(--color-text-primary)]">
            {homeTeam.shortName || homeTeam.name} vs {awayTeam.shortName || awayTeam.name}
          </div>
        </div>
      </div>

      {/* Team Tabs */}
      <div className="flex border-b border-[var(--color-border)]">
        <button
          onClick={() => setActiveTab('home')}
          className={`flex-1 py-3 text-center text-sm font-medium transition-colors ${
            activeTab === 'home'
              ? 'border-b-2'
              : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'
          }`}
          style={
            activeTab === 'home'
              ? { borderBottomColor: homeColor, color: homeColor }
              : undefined
          }
        >
          <span className="flex items-center justify-center gap-2">
            {homeTeam.logoUrl && (
              <Image
                src={homeTeam.logoUrl}
                alt=""
                width={20}
                height={20}
                className="w-5 h-5 rounded object-contain"
              />
            )}
            {homeTeam.shortName || homeTeam.name}
            <span className="text-xs opacity-70">
              {checkins.homeTeam.filter(p => p.checkinStatus === 'confirmed').length}/{checkins.homeTeam.length}
            </span>
          </span>
        </button>
        <button
          onClick={() => setActiveTab('away')}
          className={`flex-1 py-3 text-center text-sm font-medium transition-colors ${
            activeTab === 'away'
              ? 'border-b-2'
              : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'
          }`}
          style={
            activeTab === 'away'
              ? { borderBottomColor: awayColor, color: awayColor }
              : undefined
          }
        >
          <span className="flex items-center justify-center gap-2">
            {awayTeam.logoUrl && (
              <Image
                src={awayTeam.logoUrl}
                alt=""
                width={20}
                height={20}
                className="w-5 h-5 rounded object-contain"
              />
            )}
            {awayTeam.shortName || awayTeam.name}
            <span className="text-xs opacity-70">
              {checkins.awayTeam.filter(p => p.checkinStatus === 'confirmed').length}/{checkins.awayTeam.length}
            </span>
          </span>
        </button>
      </div>

      {/* Section Header */}
      <div className="px-4 py-2 bg-[var(--color-surface)]">
        <div className="text-xs font-medium text-[var(--color-text-secondary)]">
          {currentTeam.shortName || currentTeam.name} — {confirmedCount}/{currentRoster.length} checked in
        </div>
      </div>

      {/* Player List */}
      <div className="flex-1 overflow-y-auto">
        {currentRoster.length === 0 ? (
          <div className="py-12 text-center text-sm text-[var(--color-text-secondary)]">
            No active players on roster
          </div>
        ) : (
          <div className="divide-y divide-[var(--color-border)]">
            {currentRoster.map(player => {
              const isConfirmed = player.checkinStatus === 'confirmed';
              const isOut = player.checkinStatus === 'out';
              const isLoading = loading === player.id;

              return (
                <button
                  key={player.id}
                  onClick={() => handleToggle(player)}
                  disabled={isLoading}
                  className="flex items-center w-full px-4 py-3 min-h-[48px] text-left transition-colors hover:bg-[var(--color-surface)] active:bg-[var(--color-surface)] disabled:opacity-50"
                >
                  {/* Avatar + Jersey */}
                  <div className="relative flex-shrink-0">
                    {player.avatarUrl ? (
                      <>
                        <Image
                          src={player.avatarUrl}
                          alt={player.fullName}
                          width={40}
                          height={40}
                          className="w-10 h-10 rounded-full object-cover border-2"
                          style={{ borderColor: currentTeam.primaryColor || 'var(--color-border)' }}
                        />
                        <div
                          className="absolute -bottom-0.5 -right-0.5 flex items-center justify-center w-5 h-5 rounded-full text-[9px] font-bold border border-[var(--color-background)]"
                          style={{
                            backgroundColor: currentColor,
                            color: '#fff',
                          }}
                        >
                          {player.jerseyNumber}
                        </div>
                      </>
                    ) : (
                      <div
                        className="flex items-center justify-center w-10 h-10 rounded-lg text-sm font-bold"
                        style={{
                          backgroundColor: currentTeam.primaryColor
                            ? `${currentTeam.primaryColor}20`
                            : 'var(--color-surface)',
                          color: currentTeam.primaryColor || 'var(--color-text-primary)',
                        }}
                      >
                        {player.jerseyNumber}
                      </div>
                    )}
                  </div>

                  {/* Name + Position */}
                  <div className="flex-1 min-w-0 ml-3">
                    <div className="text-sm font-medium text-[var(--color-text-primary)] truncate">
                      {player.fullName}
                    </div>
                    <span className={`inline-block mt-0.5 px-1.5 py-0.5 text-[10px] font-bold rounded ${
                      player.position === 'Goalie'
                        ? 'bg-purple-500/10 text-purple-400'
                        : player.position === 'Defense'
                        ? 'bg-blue-500/10 text-blue-400'
                        : 'bg-green-500/10 text-green-400'
                    }`}>
                      {positionAbbrev(player.position)}
                    </span>
                  </div>

                  {/* Status Toggle */}
                  <div
                    className={`flex items-center justify-center w-14 h-9 rounded-lg text-xs font-bold flex-shrink-0 transition-colors ${
                      isConfirmed
                        ? 'bg-green-500/20 text-green-400'
                        : isOut
                        ? 'bg-red-500/20 text-red-400'
                        : 'bg-[var(--color-surface)] text-[var(--color-text-secondary)]'
                    }`}
                  >
                    {isLoading ? (
                      <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                    ) : isConfirmed ? (
                      'IN'
                    ) : isOut ? (
                      'OUT'
                    ) : (
                      '?'
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Start Game Button */}
      <div className="p-4 border-t border-[var(--color-border)] bg-[var(--color-background)]">
        <button
          onClick={handleStartGame}
          disabled={starting}
          className="w-full py-4 rounded-xl bg-[var(--league-primary,#d4af37)] text-[var(--color-accent-text,#000)] font-bold text-base transition-all hover:opacity-90 active:scale-[0.98] disabled:opacity-50"
        >
          {starting ? 'Starting...' : 'Start Game'}
        </button>
      </div>
    </div>
  );
}
