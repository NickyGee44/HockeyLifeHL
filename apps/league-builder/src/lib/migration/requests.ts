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

export const MIGRATION_SOURCE_FORMAT_OPTIONS = [
  'sql_dump',
  'csv_export',
  'spreadsheet',
  'json_export',
  'xml_export',
  'zip_archive',
  'pdf_reference',
  'text_notes',
  'unknown',
] as const;

export type MigrationSourceFormat = (typeof MIGRATION_SOURCE_FORMAT_OPTIONS)[number];

export type MigrationSqlEngine =
  | 'postgresql'
  | 'mysql'
  | 'sqlite'
  | 'mssql'
  | 'unknown';

export const MIGRATION_IMPORT_MODE_OPTIONS = [
  'merge_upsert',
  'append_only',
  'replace_history',
  'reference_only',
] as const;

export type MigrationImportMode = (typeof MIGRATION_IMPORT_MODE_OPTIONS)[number];

export const MIGRATION_TARGET_ENTITY_OPTIONS = [
  'teams',
  'players',
  'schedule_games',
  'stats',
  'news_articles',
  'media_assets',
] as const;

export type MigrationTargetEntity = (typeof MIGRATION_TARGET_ENTITY_OPTIONS)[number];

export interface MigrationUploadedAssetAnalysis {
  source_format: MigrationSourceFormat;
  sql_engine?: MigrationSqlEngine | null;
  detected_scopes: LeagueMigrationScope[];
  detected_tables: string[];
  sample_columns: string[];
  estimated_rows: number | null;
  notes: string[];
}

export interface MigrationUploadedAsset {
  id: string;
  name: string;
  path: string;
  size_bytes: number;
  mime_type: string | null;
  uploaded_at: string;
  uploaded_by: string | null;
  analysis: MigrationUploadedAssetAnalysis;
}

export interface MigrationImportFieldMapping {
  source_field: string;
  target_field: string | null;
  required: boolean;
  confidence: 'suggested' | 'confirmed';
}

export interface MigrationImportMappingEntry {
  asset_id: string;
  scope: LeagueMigrationScope | null;
  target_entity: MigrationTargetEntity | null;
  source_object: string | null;
  import_mode: MigrationImportMode;
  field_mappings: MigrationImportFieldMapping[];
  notes: string[];
  blockers: string[];
  ready_for_import: boolean;
  updated_at: string;
}

export interface LeagueMigrationNormalizationProfile {
  source_formats: MigrationSourceFormat[];
  suggested_scope: LeagueMigrationScope[];
  detected_tables: string[];
  notes: string[];
  ready_for_review: boolean;
  import_mappings: MigrationImportMappingEntry[];
  import_ready_scopes: LeagueMigrationScope[];
  import_blockers: string[];
}

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
    description: 'Teams, divisions, and league structure from the old system.',
  },
  players: {
    label: 'Players',
    description: 'Player lists, rosters, and registration history.',
  },
  schedule: {
    label: 'Schedule',
    description: 'Past schedules, results, and season setup.',
  },
  stats_records: {
    label: 'Stats and records',
    description: 'Stats, champions, award winners, and record books.',
  },
  news_archive: {
    label: 'News archive',
    description: 'Past articles, publish dates, and story URLs.',
  },
  media_archive: {
    label: 'Media archive',
    description: 'Photo albums, captions, galleries, and stored media.',
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
  uploaded_assets: MigrationUploadedAsset[];
  normalization_profile: LeagueMigrationNormalizationProfile | null;
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

export interface MigrationImportRunReport {
  request_id: string;
  league_id: string;
  executed_by: string | null;
  started_at: string;
  completed_at: string | null;
  status: 'running' | 'completed' | 'failed' | 'partial';
  entity_reports: MigrationEntityImportReport[];
  errors: string[];
}

export interface MigrationEntityImportReport {
  target_entity: MigrationTargetEntity;
  asset_id: string;
  created: number;
  updated: number;
  skipped: number;
  errored: number;
  errors: string[];
}

function normalizeScopeArray(values: unknown): LeagueMigrationScope[] {
  if (!Array.isArray(values)) return [];
  return values.filter(
    (value): value is LeagueMigrationScope =>
      typeof value === 'string' && (MIGRATION_SCOPE_OPTIONS as readonly string[]).includes(value)
  );
}

function normalizeSourceFormats(values: unknown): MigrationSourceFormat[] {
  if (!Array.isArray(values)) return [];
  return values.filter(
    (value): value is MigrationSourceFormat =>
      typeof value === 'string' && (MIGRATION_SOURCE_FORMAT_OPTIONS as readonly string[]).includes(value)
  );
}

function normalizeImportMode(value: unknown): MigrationImportMode {
  return typeof value === 'string' &&
    (MIGRATION_IMPORT_MODE_OPTIONS as readonly string[]).includes(value)
    ? (value as MigrationImportMode)
    : 'merge_upsert';
}

function normalizeTargetEntity(value: unknown): MigrationTargetEntity | null {
  return typeof value === 'string' &&
    (MIGRATION_TARGET_ENTITY_OPTIONS as readonly string[]).includes(value)
    ? (value as MigrationTargetEntity)
    : null;
}

function normalizeUploadedAssetAnalysis(value: unknown): MigrationUploadedAssetAnalysis {
  const raw = value && typeof value === 'object' ? (value as Record<string, unknown>) : {};
  return {
    source_format:
      typeof raw.source_format === 'string' &&
      (MIGRATION_SOURCE_FORMAT_OPTIONS as readonly string[]).includes(raw.source_format)
        ? (raw.source_format as MigrationSourceFormat)
        : 'unknown',
    sql_engine:
      typeof raw.sql_engine === 'string'
        ? (raw.sql_engine as MigrationSqlEngine)
        : null,
    detected_scopes: normalizeScopeArray(raw.detected_scopes),
    detected_tables: Array.isArray(raw.detected_tables)
      ? raw.detected_tables.filter((item): item is string => typeof item === 'string')
      : [],
    sample_columns: Array.isArray(raw.sample_columns)
      ? raw.sample_columns.filter((item): item is string => typeof item === 'string')
      : [],
    estimated_rows: typeof raw.estimated_rows === 'number' ? raw.estimated_rows : null,
    notes: Array.isArray(raw.notes)
      ? raw.notes.filter((item): item is string => typeof item === 'string')
      : [],
  };
}

function normalizeUploadedAssets(value: unknown): MigrationUploadedAsset[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === 'object')
    .map((item) => ({
      id: typeof item.id === 'string' ? item.id : crypto.randomUUID(),
      name: typeof item.name === 'string' ? item.name : 'Uploaded file',
      path: typeof item.path === 'string' ? item.path : '',
      size_bytes: typeof item.size_bytes === 'number' ? item.size_bytes : 0,
      mime_type: typeof item.mime_type === 'string' ? item.mime_type : null,
      uploaded_at: typeof item.uploaded_at === 'string' ? item.uploaded_at : new Date(0).toISOString(),
      uploaded_by: typeof item.uploaded_by === 'string' ? item.uploaded_by : null,
      analysis: normalizeUploadedAssetAnalysis(item.analysis),
    }))
    .filter((item) => item.path);
}

function normalizeImportFieldMappings(value: unknown): MigrationImportFieldMapping[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === 'object')
    .map(
      (item): MigrationImportFieldMapping => ({
        source_field: typeof item.source_field === 'string' ? item.source_field : '',
        target_field: typeof item.target_field === 'string' ? item.target_field : null,
        required: Boolean(item.required),
        confidence: item.confidence === 'suggested' ? 'suggested' : 'confirmed',
      })
    )
    .filter((item) => item.source_field);
}

function normalizeImportMappings(value: unknown): MigrationImportMappingEntry[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === 'object')
    .map((item) => ({
      asset_id: typeof item.asset_id === 'string' ? item.asset_id : crypto.randomUUID(),
      scope:
        typeof item.scope === 'string' &&
        (MIGRATION_SCOPE_OPTIONS as readonly string[]).includes(item.scope)
          ? (item.scope as LeagueMigrationScope)
          : null,
      target_entity: normalizeTargetEntity(item.target_entity),
      source_object: typeof item.source_object === 'string' ? item.source_object : null,
      import_mode: normalizeImportMode(item.import_mode),
      field_mappings: normalizeImportFieldMappings(item.field_mappings),
      notes: Array.isArray(item.notes)
        ? item.notes.filter((note): note is string => typeof note === 'string')
        : [],
      blockers: Array.isArray(item.blockers)
        ? item.blockers.filter((blocker): blocker is string => typeof blocker === 'string')
        : [],
      ready_for_import: Boolean(item.ready_for_import),
      updated_at:
        typeof item.updated_at === 'string' ? item.updated_at : new Date(0).toISOString(),
    }))
    .filter((item) => item.asset_id);
}

function normalizeNormalizationProfile(value: unknown): LeagueMigrationNormalizationProfile | null {
  if (!value || typeof value !== 'object') return null;
  const raw = value as Record<string, unknown>;
  return {
    source_formats: normalizeSourceFormats(raw.source_formats),
    suggested_scope: normalizeScopeArray(raw.suggested_scope),
    detected_tables: Array.isArray(raw.detected_tables)
      ? raw.detected_tables.filter((item): item is string => typeof item === 'string')
      : [],
    notes: Array.isArray(raw.notes)
      ? raw.notes.filter((item): item is string => typeof item === 'string')
      : [],
    ready_for_review: Boolean(raw.ready_for_review),
    import_mappings: normalizeImportMappings(raw.import_mappings),
    import_ready_scopes: normalizeScopeArray(raw.import_ready_scopes),
    import_blockers: Array.isArray(raw.import_blockers)
      ? raw.import_blockers.filter((item): item is string => typeof item === 'string')
      : [],
  };
}

export function normalizeLeagueMigrationRequest(record: Record<string, unknown>): LeagueMigrationRequest {
  return {
    id: String(record.id ?? ''),
    league_id: String(record.league_id ?? ''),
    requested_by: typeof record.requested_by === 'string' ? record.requested_by : null,
    status:
      typeof record.status === 'string' &&
      (MIGRATION_REQUEST_STATUS_OPTIONS as readonly string[]).includes(record.status)
        ? (record.status as LeagueMigrationRequestStatus)
        : 'draft',
    scope: normalizeScopeArray(record.scope),
    source_system: typeof record.source_system === 'string' ? record.source_system : null,
    source_url: typeof record.source_url === 'string' ? record.source_url : null,
    asset_links: Array.isArray(record.asset_links)
      ? record.asset_links.filter((item): item is string => typeof item === 'string')
      : [],
    notes: typeof record.notes === 'string' ? record.notes : null,
    desired_launch_date:
      typeof record.desired_launch_date === 'string' ? record.desired_launch_date : null,
    estimated_item_count:
      typeof record.estimated_item_count === 'number' ? record.estimated_item_count : null,
    uploaded_assets: normalizeUploadedAssets(record.uploaded_assets),
    normalization_profile: normalizeNormalizationProfile(record.normalization_profile),
    admin_notes: typeof record.admin_notes === 'string' ? record.admin_notes : null,
    quoted_price_cents:
      typeof record.quoted_price_cents === 'number' ? record.quoted_price_cents : null,
    submitted_at: typeof record.submitted_at === 'string' ? record.submitted_at : null,
    reviewed_at: typeof record.reviewed_at === 'string' ? record.reviewed_at : null,
    scheduled_for: typeof record.scheduled_for === 'string' ? record.scheduled_for : null,
    completed_at: typeof record.completed_at === 'string' ? record.completed_at : null,
    created_at:
      typeof record.created_at === 'string' ? record.created_at : new Date(0).toISOString(),
    updated_at:
      typeof record.updated_at === 'string' ? record.updated_at : new Date(0).toISOString(),
  };
}
