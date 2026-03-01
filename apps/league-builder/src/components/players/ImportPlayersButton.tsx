'use client';

import { useState } from 'react';
import { Upload } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { ImportPlayersModal } from './ImportPlayersModal';

interface ImportPlayersButtonProps {
  leagueId: string;
  seasonId: string;
}

export function ImportPlayersButton({ leagueId, seasonId }: ImportPlayersButtonProps) {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg font-semibold text-sm text-neutral-300 bg-neutral-800 hover:bg-neutral-700 transition-colors"
      >
        <Upload className="w-4 h-4" />
        Import Players
      </button>
      <ImportPlayersModal
        leagueId={leagueId}
        seasonId={seasonId}
        open={open}
        onOpenChange={setOpen}
        onSuccess={() => router.refresh()}
      />
    </>
  );
}
