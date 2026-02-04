'use client';

import { Phone, MessageCircle } from 'lucide-react';
import { cn } from '@hockey-life/ui';
import type { Teammate } from '@/lib/offline/db';

interface PlayerRowProps {
  player: Teammate;
}

export function PlayerRow({ player }: PlayerRowProps) {
  const initials = player.full_name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const handleCall = () => {
    if (player.phone) {
      window.location.href = `tel:${player.phone}`;
    }
  };

  const handleMessage = () => {
    if (player.phone) {
      window.location.href = `sms:${player.phone}`;
    }
  };

  return (
    <div
      className={cn(
        'flex items-center gap-3 p-3 rounded-xl',
        'bg-neutral-850 border border-gold-500/20'
      )}
    >
      {/* Avatar */}
      <div className="relative">
        <div className="w-12 h-12 rounded-full bg-neutral-800 flex items-center justify-center overflow-hidden">
          {player.avatar_url ? (
            <img
              src={player.avatar_url}
              alt=""
              className="w-full h-full object-cover"
            />
          ) : (
            <span className="text-lg font-bold text-neutral-500">{initials}</span>
          )}
        </div>
        {player.is_captain && (
          <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-gold-500 flex items-center justify-center">
            <span className="text-[10px] font-bold text-black">C</span>
          </div>
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-base font-semibold text-white truncate">
            {player.full_name}
          </p>
          {player.jersey_number && (
            <span className="text-sm font-bold text-gold-500">
              #{player.jersey_number}
            </span>
          )}
        </div>
        <p className="text-sm text-neutral-400">{player.position || 'Player'}</p>
      </div>

      {/* Contact Actions */}
      <div className="flex items-center gap-2">
        {player.phone && (
          <>
            <button
              onClick={handleCall}
              className={cn(
                'w-10 h-10 rounded-full bg-neutral-800 flex items-center justify-center',
                'active:bg-neutral-700 transition-colors touch-action-manipulation'
              )}
              aria-label={`Call ${player.full_name}`}
            >
              <Phone className="w-4 h-4 text-neutral-400" />
            </button>
            <button
              onClick={handleMessage}
              className={cn(
                'w-10 h-10 rounded-full bg-neutral-800 flex items-center justify-center',
                'active:bg-neutral-700 transition-colors touch-action-manipulation'
              )}
              aria-label={`Message ${player.full_name}`}
            >
              <MessageCircle className="w-4 h-4 text-neutral-400" />
            </button>
          </>
        )}
      </div>
    </div>
  );
}

export function PositionHeader({
  position,
  count,
}: {
  position: string;
  count: number;
}) {
  return (
    <div className="flex items-center gap-3 py-3 mt-4 first:mt-0">
      <span className="text-sm font-semibold text-neutral-300">
        {position} ({count})
      </span>
      <div className="flex-1 h-px bg-gold-500/20" />
    </div>
  );
}
