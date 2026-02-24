'use client';

import type { GoalieRequestItem } from '@/lib/actions/goalie-marketplace';

interface GoalieRequestStatusProps {
  request: GoalieRequestItem | null;
}

export function GoalieRequestStatus({ request }: GoalieRequestStatusProps) {
  if (!request) {
    return <p className="text-sm text-neutral-500">No goalie request for this game yet.</p>;
  }

  const statusColor =
    request.status === 'filled'
      ? 'text-green-400 border-green-500/30 bg-green-500/10'
      : request.status === 'open'
        ? 'text-blue-400 border-blue-500/30 bg-blue-500/10'
        : 'text-neutral-300 border-white/10 bg-white/5';

  return (
    <div className={`rounded-xl border p-3 ${statusColor}`}>
      <p className="text-sm font-semibold capitalize">Goalie Request: {request.status}</p>
      {request.compensation && <p className="text-xs mt-1">Compensation: {request.compensation}</p>}
      {request.notes && <p className="text-xs mt-1">Notes: {request.notes}</p>}
    </div>
  );
}
