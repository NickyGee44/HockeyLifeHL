'use client';

import { useState } from 'react';
import { Upload } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { ImportTeamsModal } from './ImportTeamsModal';

interface ImportTeamsButtonProps {
  leagueId: string;
  defaultOpen?: boolean;
}

export function ImportTeamsButton({ leagueId, defaultOpen = false }: ImportTeamsButtonProps) {
  const [open, setOpen] = useState(defaultOpen);
  const router = useRouter();

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-sm text-neutral-300 bg-neutral-800 hover:bg-neutral-700 transition-colors"
      >
        <Upload className="w-4 h-4" />
        Import CSV
      </button>
      <ImportTeamsModal
        leagueId={leagueId}
        open={open}
        onOpenChange={setOpen}
        onSuccess={() => router.refresh()}
      />
    </>
  );
}
