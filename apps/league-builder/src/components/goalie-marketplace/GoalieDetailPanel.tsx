'use client';

import { useEffect, useState } from 'react';
import { Star } from 'lucide-react';
import { getGoalieRatings, type GoaliePoolItem } from '@/lib/actions/goalie-marketplace';

interface GoalieDetailPanelProps {
  goalie: GoaliePoolItem | null;
}

export function GoalieDetailPanel({ goalie }: GoalieDetailPanelProps) {
  const [ratings, setRatings] = useState<Array<{ id: string; stars: number; tags: string[]; private_note: string | null; created_at: string }>>([]);

  useEffect(() => {
    const load = async () => {
      if (!goalie) return;
      const result = await getGoalieRatings(goalie.id);
      if (result.success) {
        setRatings(result.data as Array<{ id: string; stars: number; tags: string[]; private_note: string | null; created_at: string }>);
      }
    };
    load();
  }, [goalie]);

  if (!goalie) {
    return (
      <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-6 text-neutral-500">
        Select a goalie to view profile and ratings.
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-6 space-y-4">
      <div>
        <h3 className="text-xl font-bold text-white">{goalie.name}</h3>
        <p className="text-neutral-400 text-sm">{goalie.email} {goalie.phone ? `• ${goalie.phone}` : ''}</p>
      </div>
      <div className="text-sm text-neutral-300">
        Skill: <span className="capitalize">{goalie.skill_level || 'intermediate'}</span> • Rate: ${Number(goalie.rate_per_game || 0).toFixed(2)}
      </div>

      <div className="pt-2 border-t border-white/10">
        <h4 className="text-sm font-semibold text-neutral-300 mb-2">Rating History</h4>
        <div className="space-y-3 max-h-80 overflow-auto">
          {ratings.map((rating) => (
            <div key={rating.id} className="rounded-lg bg-neutral-900/50 border border-white/10 p-3">
              <div className="flex items-center gap-1 text-amber-400 mb-1">
                {Array.from({ length: rating.stars }).map((_, idx) => <Star key={idx} className="w-3.5 h-3.5 fill-current" />)}
              </div>
              {rating.tags?.length > 0 && <p className="text-xs text-neutral-400">{rating.tags.join(', ')}</p>}
              {rating.private_note && <p className="text-sm text-neutral-200 mt-1">{rating.private_note}</p>}
            </div>
          ))}
          {ratings.length === 0 && <p className="text-xs text-neutral-500">No ratings yet.</p>}
        </div>
      </div>
    </div>
  );
}
