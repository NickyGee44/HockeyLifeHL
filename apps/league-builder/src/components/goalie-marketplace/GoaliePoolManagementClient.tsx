'use client';

import { useState, useTransition } from 'react';
import { Plus, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AddGoalieModal } from './AddGoalieModal';
import { GoaliePoolTable } from './GoaliePoolTable';
import { GoalieDetailPanel } from './GoalieDetailPanel';
import { GoalieImportCSV } from './GoalieImportCSV';
import { getGoaliePool, type GoaliePoolItem } from '@/lib/actions/goalie-marketplace';

interface GoaliePoolManagementClientProps {
  leagueId: string;
  initialGoalies: GoaliePoolItem[];
}

export function GoaliePoolManagementClient({ leagueId, initialGoalies }: GoaliePoolManagementClientProps) {
  const [goalies, setGoalies] = useState(initialGoalies);
  const [selected, setSelected] = useState<GoaliePoolItem | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const refresh = () => {
    startTransition(async () => {
      const result = await getGoaliePool(leagueId);
      if (result.success) setGoalies(result.data);
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-bold text-white">Goalie Pool Management</h2>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={refresh} disabled={isPending}>
            <RefreshCw className="w-4 h-4 mr-2" /> Refresh
          </Button>
          <Button className="bg-gradient-to-r from-rink-500 to-arena-500 text-black" onClick={() => setAddOpen(true)}>
            <Plus className="w-4 h-4 mr-2" /> Add Goalie
          </Button>
        </div>
      </div>

      <GoalieImportCSV leagueId={leagueId} onImported={refresh} />

      <div className="grid grid-cols-1 xl:grid-cols-[1.4fr_1fr] gap-6">
        <GoaliePoolTable goalies={goalies} onRefresh={refresh} onSelect={setSelected} />
        <GoalieDetailPanel goalie={selected} />
      </div>

      <AddGoalieModal leagueId={leagueId} open={addOpen} onOpenChange={setAddOpen} onAdded={refresh} />
    </div>
  );
}
