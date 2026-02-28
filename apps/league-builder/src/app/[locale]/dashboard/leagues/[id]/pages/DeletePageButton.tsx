'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Trash2 } from 'lucide-react';
import { deleteCustomPage } from './actions';

type Props = {
  pageId: string;
  leagueId: string;
};

export function DeletePageButton({ pageId, leagueId }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  async function handleDelete() {
    if (!confirm('Delete this custom page? This cannot be undone.')) {
      return;
    }

    setError(null);
    startTransition(async () => {
      const result = await deleteCustomPage(pageId, leagueId);
      if (!result.success) {
        setError(result.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="space-y-1">
      <Button
        type="button"
        variant="destructive"
        size="sm"
        onClick={handleDelete}
        disabled={isPending}
      >
        <Trash2 className="mr-1.5 h-4 w-4" />
        {isPending ? 'Deleting...' : 'Delete'}
      </Button>
      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  );
}
