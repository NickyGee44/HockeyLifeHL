'use client';

import Link from 'next/link';
import { ArrowLeft, Printer } from 'lucide-react';

interface PrintBarProps {
  leagueId: string;
  gameId: string;
  locale: string;
}

export function PrintBar({ leagueId, gameId, locale }: PrintBarProps) {
  return (
    <div className="no-print flex items-center justify-between gap-4 px-4 py-3 bg-neutral-950 border-b border-neutral-800 print:hidden">
      <Link
        href={`/${locale}/dashboard/leagues/${leagueId}/games/${gameId}`}
        className="inline-flex items-center gap-2 text-sm text-neutral-400 hover:text-white transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Game
      </Link>
      <button
        onClick={() => window.print()}
        className="inline-flex items-center gap-2 px-4 py-2 bg-white text-neutral-950 text-sm font-semibold rounded-lg hover:bg-neutral-100 transition-colors"
      >
        <Printer className="w-4 h-4" />
        Print / Save PDF
      </button>
    </div>
  );
}
