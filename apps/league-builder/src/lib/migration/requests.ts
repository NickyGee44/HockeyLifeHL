export const MIGRATION_SCOPE_OPTIONS = [
  'teams',
  'players',
  'schedule',
  'stats_records',
  'news_archive',
  'media_archive',
] as const;

export type LeagueMigrationScope = (typeof MIGRATION_SCOPE_OPTIONS)[number];

export const MIGRATION_REQUEST_STATUS_OPTIONS = [
  'draft',
  'submitted',
  'reviewing',
  'quoted',
  'scheduled',
  'in_progress',
  'completed',
  'cancelled',
] as const;

export type LeagueMigrationRequestStatus = (typeof MIGRATION_REQUEST_STATUS_OPTIONS)[number];

export const ACTIVE_MIGRATION_REQUEST_STATUSES: readonly LeagueMigrationRequestStatus[] = [
  'draft',
  'submitted',
  'reviewing',
  'quoted',
  'scheduled',
  'in_progress',
] as const;

export const EDITABLE_MIGRATION_REQUEST_STATUSES: readonly LeagueMigrationRequestStatus[] = [
  'draft',
  'submitted',
] as const;

export const MIGRATION_SCOPE_META: Record<
  LeagueMigrationScope,
  { label: string; description: string }
> = {
  teams: {
    label: 'Teams',
    description: 'Historical teams, divisions, and structure cleanup.',
  },
  players: {
    label: 'Players',
    description: 'Legacy roster, registration, and player directory imports.',
  },
  schedule: {
    label: 'Schedule',
    description: 'Past schedules, results, and season framework setup.',
  },
  stats_records: {
    label: 'Stats and records',
    description: 'Career totals, awards, champions, and record books.',
  },
  news_archive: {
    label: 'News archive',
    description: 'Historic articles, publish dates, slugs, and SEO-sensitive content.',
  },
  media_archive: {
    label: 'Media archive',
    description: 'Photo albums, captions, galleries, and legacy media libraries.',
  },
};

export const MIGRATION_STATUS_META: Record<
  LeagueMigrationRequestStatus,
  { label: string; description: string }
> = {
  draft: {
    label: 'Draft',
    description: 'Saved in the builder but not yet submitted for review.',
  },
  submitted: {
    label: 'Submitted',
    description: 'Submitted by the league and waiting for ops review.',
  },
  reviewing: {
    label: 'Reviewing',
    description: 'Ops is validating scope, source quality, and effort.',
  },
  quoted: {
    label: 'Quoted',
    description: 'Pricing or scope confirmation has been prepared.',
  },
  scheduled: {
    label: 'Scheduled',
    description: 'Migration work has been slotted for execution.',
  },
  in_progress: {
    label: 'In progress',
    description: 'Historical data is actively being imported.',
  },
  completed: {
    label: 'Completed',
    description: 'The migration request has been completed.',
  },
  cancelled: {
    label: 'Cancelled',
    description: 'The request was cancelled or closed without execution.',
  },
};

export interface LeagueMigrationRequest {
  id: string;
  league_id: string;
  requested_by: string | null;
  status: LeagueMigrationRequestStatus;
  scope: LeagueMigrationScope[];
  source_system: string | null;
  source_url: string | null;
  asset_links: string[];
  notes: string | null;
  desired_launch_date: string | null;
  estimated_item_count: number | null;
  admin_notes: string | null;
  quoted_price_cents: number | null;
  submitted_at: string | null;
  reviewed_at: string | null;
  scheduled_for: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export function isMigrationStatusActive(status: LeagueMigrationRequestStatus) {
  return ACTIVE_MIGRATION_REQUEST_STATUSES.includes(status);
}

export function isMigrationStatusEditable(status: LeagueMigrationRequestStatus) {
  return EDITABLE_MIGRATION_REQUEST_STATUSES.includes(status);
}
