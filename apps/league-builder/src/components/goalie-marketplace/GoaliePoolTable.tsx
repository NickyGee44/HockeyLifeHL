'use client';

import { Trash2, Eye } from 'lucide-react';
import { removeGoalie, type GoaliePoolItem } from '@/lib/actions/goalie-marketplace';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

interface GoaliePoolTableProps {
  goalies: GoaliePoolItem[];
  onRefresh: () => void;
  onSelect: (goalie: GoaliePoolItem) => void;
}

function statusVariant(status: string) {
  if (status === 'active') return 'default';
  if (status === 'blacklisted') return 'destructive';
  return 'secondary';
}

export function GoaliePoolTable({ goalies, onRefresh, onSelect }: GoaliePoolTableProps) {
  const handleRemove = async (goalieId: string) => {
    const result = await removeGoalie(goalieId);
    if (!result.success) {
      toast.error(result.error);
      return;
    }
    toast.success('Goalie removed from active pool');
    onRefresh();
  };

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.04] overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-neutral-900/60 text-neutral-400">
          <tr>
            <th className="text-left p-3">Goalie</th>
            <th className="text-left p-3">Skill</th>
            <th className="text-left p-3">Status</th>
            <th className="text-left p-3">Rating</th>
            <th className="text-left p-3">Rate</th>
            <th className="text-right p-3">Actions</th>
          </tr>
        </thead>
        <tbody>
          {goalies.map((goalie) => (
            <tr key={goalie.id} className="border-t border-white/5">
              <td className="p-3">
                <div className="font-medium text-white">{goalie.name}</div>
                <div className="text-neutral-500 text-xs">
                  {goalie.email || 'No email on file'}
                </div>
                {goalie.source === 'roster' && (
                  <div className="text-[11px] text-cyan-300 mt-1">
                    Current league goalie{goalie.team_name ? ` • ${goalie.team_name}` : ''}
                  </div>
                )}
              </td>
              <td className="p-3 text-neutral-300 capitalize">{goalie.skill_level || 'intermediate'}</td>
              <td className="p-3">
                <Badge variant={statusVariant(goalie.status) as 'default' | 'secondary' | 'destructive'}>{goalie.status}</Badge>
              </td>
              <td className="p-3 text-neutral-300">
                {(goalie.average_rating || 0).toFixed(1)} ({goalie.rating_count || 0})
              </td>
              <td className="p-3 text-neutral-300">${Number(goalie.rate_per_game || 0).toFixed(2)}</td>
              <td className="p-3 text-right">
                <div className="inline-flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => onSelect(goalie)}>
                    <Eye className="w-4 h-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleRemove(goalie.id)}
                    disabled={goalie.read_only}
                    title={goalie.read_only ? 'Roster goalies are read-only here' : 'Remove goalie from pool'}
                  >
                    <Trash2 className="w-4 h-4 text-red-400" />
                  </Button>
                </div>
              </td>
            </tr>
          ))}
          {goalies.length === 0 && (
            <tr>
              <td className="p-10 text-center text-neutral-500" colSpan={6}>No goalies in pool yet.</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
