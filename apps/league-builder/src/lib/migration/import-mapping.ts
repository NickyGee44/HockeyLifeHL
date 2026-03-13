import {
  type LeagueMigrationNormalizationProfile,
  type LeagueMigrationScope,
  type MigrationImportFieldMapping,
  type MigrationImportMappingEntry,
  type MigrationImportMode,
  type MigrationTargetEntity,
  type MigrationUploadedAsset,
} from '@/lib/migration/requests';

type TargetFieldDefinition = {
  key: string;
  label: string;
  required?: boolean;
  aliases: RegExp[];
};

type TargetEntityDefinition = {
  label: string;
  scope: LeagueMigrationScope;
  defaultImportMode: MigrationImportMode;
  fields: TargetFieldDefinition[];
};

export const MIGRATION_IMPORT_MODE_META: Record<
  MigrationImportMode,
  { label: string; description: string }
> = {
  merge_upsert: {
    label: 'Merge / upsert',
    description: 'Use identifiers to merge with existing BLH records where possible.',
  },
  append_only: {
    label: 'Append only',
    description: 'Import as new rows without trying to merge with historical BLH data.',
  },
  replace_history: {
    label: 'Replace history',
    description: 'Treat the source as the system of record for this track and overwrite prior history.',
  },
  reference_only: {
    label: 'Reference only',
    description: 'Keep this asset for ops reference but do not import it directly.',
  },
};

export const MIGRATION_TARGET_ENTITY_META: Record<MigrationTargetEntity, TargetEntityDefinition> = {
  teams: {
    label: 'Teams and divisions',
    scope: 'teams',
    defaultImportMode: 'merge_upsert',
    fields: [
      { key: 'team_name', label: 'Team name', required: true, aliases: [/^team$/i, /team.?name/i, /club/i, /franchise/i] },
      { key: 'division_name', label: 'Division', aliases: [/division/i, /conference/i, /tier/i] },
      { key: 'captain_name', label: 'Captain name', aliases: [/captain/i, /manager/i, /contact.?name/i] },
      { key: 'captain_email', label: 'Captain email', aliases: [/captain.*mail/i, /contact.*mail/i, /^email$/i] },
      { key: 'captain_phone', label: 'Captain phone', aliases: [/captain.*phone/i, /contact.*phone/i, /cell/i] },
      { key: 'season_name', label: 'Season name', aliases: [/season/i, /session/i] },
    ],
  },
  players: {
    label: 'Players and rosters',
    scope: 'players',
    defaultImportMode: 'merge_upsert',
    fields: [
      { key: 'first_name', label: 'First name', aliases: [/^first.?name$/i, /^fname$/i] },
      { key: 'last_name', label: 'Last name', aliases: [/^last.?name$/i, /^lname$/i, /surname/i] },
      { key: 'full_name', label: 'Full name', required: true, aliases: [/^name$/i, /^player$/i, /full.?name/i] },
      { key: 'email', label: 'Email', aliases: [/email/i, /e-mail/i] },
      { key: 'phone', label: 'Phone', aliases: [/phone/i, /mobile/i, /cell/i] },
      { key: 'team_name', label: 'Team name', aliases: [/team/i, /club/i] },
      { key: 'position', label: 'Position', aliases: [/position/i, /^pos$/i] },
      { key: 'jersey_number', label: 'Jersey number', aliases: [/jersey/i, /sweater/i, /number/i] },
      { key: 'date_of_birth', label: 'Date of birth', aliases: [/dob/i, /birth/i] },
    ],
  },
  schedule_games: {
    label: 'Schedule and results',
    scope: 'schedule',
    defaultImportMode: 'append_only',
    fields: [
      { key: 'season_name', label: 'Season name', aliases: [/season/i, /session/i] },
      { key: 'division_name', label: 'Division', aliases: [/division/i, /tier/i] },
      { key: 'game_date', label: 'Game date', required: true, aliases: [/date/i, /game.?date/i] },
      { key: 'start_time', label: 'Start time', required: true, aliases: [/time/i, /start/i, /puck.?drop/i] },
      { key: 'venue_name', label: 'Venue', aliases: [/venue/i, /rink/i, /arena/i, /location/i] },
      { key: 'home_team', label: 'Home team', required: true, aliases: [/home/i] },
      { key: 'away_team', label: 'Away team', required: true, aliases: [/away/i, /visitor/i] },
      { key: 'home_score', label: 'Home score', aliases: [/home.*score/i, /score.*home/i] },
      { key: 'away_score', label: 'Away score', aliases: [/away.*score/i, /score.*away/i] },
    ],
  },
  stats: {
    label: 'Stats and records',
    scope: 'stats_records',
    defaultImportMode: 'append_only',
    fields: [
      { key: 'player_name', label: 'Player name', required: true, aliases: [/player/i, /^name$/i] },
      { key: 'team_name', label: 'Team', aliases: [/team/i, /club/i] },
      { key: 'season_name', label: 'Season', aliases: [/season/i] },
      { key: 'games_played', label: 'Games played', aliases: [/games?/i, /^gp$/i] },
      { key: 'goals', label: 'Goals', aliases: [/goals?/i, /^g$/i] },
      { key: 'assists', label: 'Assists', aliases: [/assists?/i, /^a$/i] },
      { key: 'points', label: 'Points', aliases: [/points?/i, /^pts$/i] },
      { key: 'pim', label: 'PIM', aliases: [/pim/i, /penalty/i] },
      { key: 'wins', label: 'Wins', aliases: [/wins?/i, /^w$/i] },
      { key: 'gaa', label: 'GAA', aliases: [/gaa/i] },
      { key: 'save_pct', label: 'Save %', aliases: [/sv.?%/i, /save.?pct/i, /save.?percentage/i] },
    ],
  },
  news_articles: {
    label: 'News articles',
    scope: 'news_archive',
    defaultImportMode: 'append_only',
    fields: [
      { key: 'title', label: 'Title', required: true, aliases: [/title/i, /headline/i] },
      { key: 'slug', label: 'Slug', aliases: [/slug/i, /url/i] },
      { key: 'published_at', label: 'Published at', aliases: [/publish/i, /date/i] },
      { key: 'summary', label: 'Summary', aliases: [/summary/i, /excerpt/i, /dek/i] },
      { key: 'body', label: 'Body', required: true, aliases: [/body/i, /content/i, /article/i, /story/i] },
      { key: 'author_name', label: 'Author', aliases: [/author/i, /writer/i] },
    ],
  },
  media_assets: {
    label: 'Media archive',
    scope: 'media_archive',
    defaultImportMode: 'append_only',
    fields: [
      { key: 'album_name', label: 'Album name', aliases: [/album/i, /gallery/i] },
      { key: 'image_url', label: 'Image URL', required: true, aliases: [/image/i, /photo/i, /url/i, /file/i] },
      { key: 'caption', label: 'Caption', aliases: [/caption/i, /description/i] },
      { key: 'taken_at', label: 'Taken at', aliases: [/taken/i, /date/i, /created/i] },
      { key: 'credit', label: 'Credit', aliases: [/credit/i, /photographer/i] },
    ],
  },
};

function uniqueStrings(values: string[]) {
  return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)));
}

export function listTargetFields(targetEntity: MigrationTargetEntity | null) {
  if (!targetEntity) return [];
  return MIGRATION_TARGET_ENTITY_META[targetEntity].fields;
}

export function getRequiredTargetFields(targetEntity: MigrationTargetEntity | null) {
  return listTargetFields(targetEntity)
    .filter((field) => field.required)
    .map((field) => field.key);
}

export function inferTargetEntityFromAsset(asset: MigrationUploadedAsset): MigrationTargetEntity | null {
  const primaryScope = asset.analysis.detected_scopes[0];
  switch (primaryScope) {
    case 'teams':
      return 'teams';
    case 'players':
      return 'players';
    case 'schedule':
      return 'schedule_games';
    case 'stats_records':
      return 'stats';
    case 'news_archive':
      return 'news_articles';
    case 'media_archive':
      return 'media_assets';
    default:
      return null;
  }
}

function suggestTargetField(
  sourceField: string,
  targetEntity: MigrationTargetEntity | null
): string | null {
  if (!targetEntity) return null;
  const normalizedSource = sourceField.trim();
  if (!normalizedSource) return null;

  for (const field of MIGRATION_TARGET_ENTITY_META[targetEntity].fields) {
    if (field.aliases.some((pattern) => pattern.test(normalizedSource))) {
      return field.key;
    }
  }

  return null;
}

function normalizeOperatorNotes(notes?: string[]) {
  return uniqueStrings(notes ?? []).slice(0, 8);
}

function buildFieldMappings(
  asset: MigrationUploadedAsset,
  targetEntity: MigrationTargetEntity | null,
  fieldMappings?: MigrationImportFieldMapping[],
  existing?: MigrationImportMappingEntry | null
): MigrationImportFieldMapping[] {
  const explicitMap = new Map<string, MigrationImportFieldMapping>();

  for (const mapping of fieldMappings ?? []) {
    explicitMap.set(mapping.source_field, mapping);
  }

  for (const mapping of existing?.field_mappings ?? []) {
    if (!explicitMap.has(mapping.source_field)) {
      explicitMap.set(mapping.source_field, mapping);
    }
  }

  const sampleColumns = asset.analysis.sample_columns;
  const mappedColumns = sampleColumns.map((sourceField) => {
    const explicit = explicitMap.get(sourceField);
    if (explicit) {
      return {
        source_field: sourceField,
        target_field: explicit.target_field,
        required:
          explicit.target_field !== null &&
          getRequiredTargetFields(targetEntity).includes(explicit.target_field),
        confidence: explicit.confidence ?? 'confirmed',
      } satisfies MigrationImportFieldMapping;
    }

    const suggested = suggestTargetField(sourceField, targetEntity);
    return {
      source_field: sourceField,
      target_field: suggested,
      required: suggested !== null && getRequiredTargetFields(targetEntity).includes(suggested),
      confidence: suggested ? 'suggested' : 'confirmed',
    } satisfies MigrationImportFieldMapping;
  });

  const extraMappings = (fieldMappings ?? existing?.field_mappings ?? []).filter(
    (mapping) => !sampleColumns.includes(mapping.source_field)
  );

  return [...mappedColumns, ...extraMappings];
}

export function buildMigrationImportMappingEntry(
  asset: MigrationUploadedAsset,
  overrides?: Partial<
    Pick<
      MigrationImportMappingEntry,
      'scope' | 'target_entity' | 'source_object' | 'import_mode' | 'field_mappings' | 'notes'
    >
  >,
  existing?: MigrationImportMappingEntry | null
): MigrationImportMappingEntry {
  const targetEntity =
    overrides?.target_entity ??
    existing?.target_entity ??
    inferTargetEntityFromAsset(asset);
  const scope =
    overrides?.scope ??
    existing?.scope ??
    asset.analysis.detected_scopes[0] ??
    (targetEntity ? MIGRATION_TARGET_ENTITY_META[targetEntity].scope : null);
  const importMode =
    overrides?.import_mode ??
    existing?.import_mode ??
    (targetEntity ? MIGRATION_TARGET_ENTITY_META[targetEntity].defaultImportMode : 'merge_upsert');
  const sourceObject =
    overrides?.source_object?.trim() ??
    existing?.source_object ??
    asset.analysis.detected_tables[0] ??
    null;
  const fieldMappings = buildFieldMappings(
    asset,
    targetEntity,
    overrides?.field_mappings,
    existing
  );
  const mappedTargets = uniqueStrings(
    fieldMappings.map((mapping) => mapping.target_field ?? '').filter(Boolean)
  );
  const requiredTargets = getRequiredTargetFields(targetEntity);
  const blockers: string[] = [];

  if (!scope) {
    blockers.push('Choose the BLH migration track for this file.');
  }

  if (!targetEntity) {
    blockers.push('Choose the BLH destination entity for this file.');
  }

  if (
    asset.analysis.source_format === 'sql_dump' &&
    asset.analysis.detected_tables.length > 1 &&
    !sourceObject
  ) {
    blockers.push('Choose the source table or object to import first.');
  }

  if (asset.analysis.sample_columns.length > 0 && mappedTargets.length === 0 && importMode !== 'reference_only') {
    blockers.push('Map at least one source field before marking this file ready.');
  }

  if (requiredTargets.length > 0 && importMode !== 'reference_only') {
    const missingRequired = requiredTargets.filter((field) => !mappedTargets.includes(field));
    if (missingRequired.length > 0) {
      blockers.push(`Map required BLH fields: ${missingRequired.join(', ')}.`);
    }
  }

  return {
    asset_id: asset.id,
    scope,
    target_entity: targetEntity,
    source_object: sourceObject,
    import_mode: importMode,
    field_mappings: fieldMappings,
    notes: normalizeOperatorNotes(overrides?.notes ?? existing?.notes),
    blockers,
    ready_for_import: blockers.length === 0,
    updated_at: new Date().toISOString(),
  };
}

export function buildImportMappings(
  uploadedAssets: MigrationUploadedAsset[],
  existingMappings: MigrationImportMappingEntry[] = []
) {
  const existingMap = new Map(existingMappings.map((mapping) => [mapping.asset_id, mapping]));

  return uploadedAssets.map((asset) =>
    buildMigrationImportMappingEntry(asset, undefined, existingMap.get(asset.id) ?? null)
  );
}

export function summarizeImportReadiness(
  uploadedAssets: MigrationUploadedAsset[],
  mappings: MigrationImportMappingEntry[]
) {
  const assetNameMap = new Map(uploadedAssets.map((asset) => [asset.id, asset.name]));
  const importReadyScopes = Array.from(
    new Set(
      mappings
        .filter((mapping) => mapping.ready_for_import && mapping.scope)
        .map((mapping) => mapping.scope as LeagueMigrationScope)
    )
  );
  const importBlockers = mappings.flatMap((mapping) =>
    mapping.blockers.map((blocker) => `${assetNameMap.get(mapping.asset_id) ?? 'Uploaded file'}: ${blocker}`)
  );

  return {
    importReadyScopes,
    importBlockers,
  };
}

export function mergeNormalizationProfileMappings(
  existingProfile: LeagueMigrationNormalizationProfile | null,
  uploadedAssets: MigrationUploadedAsset[]
) {
  return buildImportMappings(uploadedAssets, existingProfile?.import_mappings ?? []);
}
