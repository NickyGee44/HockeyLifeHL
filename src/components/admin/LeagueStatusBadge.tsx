import { Badge } from "@/components/ui/badge";

type LeagueStatus = 'active' | 'suspended' | 'archived';

interface LeagueStatusBadgeProps {
  status: LeagueStatus;
}

/**
 * Visual status indicator for leagues
 * Shows different colors based on league status
 */
export function LeagueStatusBadge({ status }: LeagueStatusBadgeProps) {
  const config = {
    active: {
      label: 'Active',
      className: 'bg-green-600 hover:bg-green-700',
    },
    suspended: {
      label: 'Suspended',
      className: 'bg-yellow-600 hover:bg-yellow-700',
    },
    archived: {
      label: 'Archived',
      className: 'bg-gray-600 hover:bg-gray-700',
    },
  };

  const { label, className } = config[status] || config.active;

  return (
    <Badge className={className}>
      {label}
    </Badge>
  );
}
