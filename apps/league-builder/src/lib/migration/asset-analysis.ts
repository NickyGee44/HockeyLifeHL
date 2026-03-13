import {
  MIGRATION_SCOPE_OPTIONS,
  type LeagueMigrationNormalizationProfile,
  type LeagueMigrationScope,
  type MigrationSourceFormat,
  type MigrationSqlEngine,
  type MigrationUploadedAsset,
  type MigrationUploadedAssetAnalysis,
} from '@/lib/migration/requests';

const MAX_ANALYSIS_BYTES = 512_000;

const SQL_SCOPE_HINTS: Array<{ scope: LeagueMigrationScope; patterns: RegExp[] }> = [
  { scope: 'teams', patterns: [/\bteams?\b/i, /\bdivisions?\b/i, /\bconferences?\b/i, /\bfranchises?\b/i] },
  { scope: 'players', patterns: [/\bplayers?\b/i, /\brosters?\b/i, /\bmembers?\b/i, /\bregistrations?\b/i, /\busers?\b/i] },
  { scope: 'schedule', patterns: [/\bgames?\b/i, /\bschedules?\b/i, /\bfixtures?\b/i, /\bmatches?\b/i, /\bvenues?\b/i] },
  { scope: 'stats_records', patterns: [/stat/i, /goal/i, /assist/i, /goalie/i, /award/i, /champ/i, /standing/i] },
  { scope: 'news_archive', patterns: [/\bnews\b/i, /\barticles?\b/i, /\bposts?\b/i, /\bstories?\b/i, /\bblogs?\b/i] },
  { scope: 'media_archive', patterns: [/\bgalleries?\b/i, /\bphotos?\b/i, /\bimages?\b/i, /\bmedia\b/i, /\bvideos?\b/i] },
];

function uniqueStrings(values: string[]) {
  return Array.from(new Set(values.filter(Boolean)));
}

function normalizeDetectedScopes(values: string[]): LeagueMigrationScope[] {
  return Array.from(
    new Set(
      values.filter(
        (value): value is LeagueMigrationScope =>
          (MIGRATION_SCOPE_OPTIONS as readonly string[]).includes(value)
      )
    )
  );
}

function inferScopesFromTokens(tokens: string[]) {
  const detected: LeagueMigrationScope[] = [];

  for (const { scope, patterns } of SQL_SCOPE_HINTS) {
    if (patterns.some((pattern) => tokens.some((token) => pattern.test(token)))) {
      detected.push(scope);
    }
  }

  return normalizeDetectedScopes(detected);
}

function stripSqlIdentifier(value: string) {
  return value
    .replace(/^[`"[\s]+|[`"\]\s]+$/g, '')
    .replace(/^public\./i, '')
    .trim();
}

function detectSqlEngine(preview: string): MigrationSqlEngine {
  if (/AUTO_INCREMENT|ENGINE=InnoDB|`[^`]+`/i.test(preview)) return 'mysql';
  if (/\bsqlite_sequence\b|PRAGMA /i.test(preview)) return 'sqlite';
  if (/\bGO\b|\bNVARCHAR\b|\bIDENTITY\s*\(/i.test(preview)) return 'mssql';
  if (/\bCOPY\b|\bALTER TABLE ONLY\b|\bSERIAL\b|::[a-z_]+/i.test(preview)) return 'postgresql';
  return 'unknown';
}

function analyzeSql(preview: string): MigrationUploadedAssetAnalysis {
  const tableMatches = uniqueStrings(
    Array.from(
      preview.matchAll(
        /\b(?:CREATE\s+TABLE(?:\s+IF\s+NOT\s+EXISTS)?|INSERT\s+INTO|COPY)\s+(?:ONLY\s+)?([`"\[]?[A-Za-z0-9_.-]+[`"\]]?)/gi
      ),
      (match) => stripSqlIdentifier(match[1] ?? '')
    )
  ).slice(0, 40);

  const createTableMatch = preview.match(
    /\bCREATE\s+TABLE(?:\s+IF\s+NOT\s+EXISTS)?\s+(?:[`"\[]?[A-Za-z0-9_.-]+[`"\]]?)\s*\(([\s\S]{0,4000})\)\s*;/i
  );

  const sampleColumns = createTableMatch
    ? uniqueStrings(
        Array.from(
          createTableMatch[1].matchAll(/^\s*[`"\[]?([A-Za-z0-9_]+)[`"\]]?\s+[A-Za-z]/gm),
          (match) => match[1]
        )
      ).slice(0, 12)
    : [];

  const estimatedRows = (() => {
    const insertMatches = preview.match(/\bINSERT\s+INTO\b/gi)?.length ?? 0;
    if (insertMatches > 0) return insertMatches;
    const copyMatches = preview.match(/\bCOPY\b/gi)?.length ?? 0;
    return copyMatches > 0 ? copyMatches : null;
  })();

  const detectedScopes = inferScopesFromTokens([...tableMatches, ...sampleColumns]);
  const sqlEngine = detectSqlEngine(preview);
  const notes = [
    sqlEngine !== 'unknown' ? `Detected ${sqlEngine} style SQL dump.` : 'SQL dump detected.',
    tableMatches.length > 0 ? `Found ${tableMatches.length} table references in the preview.` : 'No table names were detected in the preview.',
  ];

  return {
    source_format: 'sql_dump',
    sql_engine: sqlEngine,
    detected_scopes: detectedScopes,
    detected_tables: tableMatches,
    sample_columns: sampleColumns,
    estimated_rows: estimatedRows,
    notes,
  };
}

function analyzeDelimited(preview: string, sourceFormat: MigrationSourceFormat): MigrationUploadedAssetAnalysis {
  const lines = preview
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  const headerLine = lines[0] ?? '';
  const delimiter = headerLine.includes('\t')
    ? '\t'
    : headerLine.includes(';')
      ? ';'
      : ',';
  const sampleColumns = uniqueStrings(
    headerLine
      .split(delimiter)
      .map((value) => value.replace(/^"|"$/g, '').trim())
      .filter(Boolean)
  ).slice(0, 20);

  const detectedScopes = inferScopesFromTokens(sampleColumns);

  return {
    source_format: sourceFormat,
    sql_engine: null,
    detected_scopes: detectedScopes,
    detected_tables: [],
    sample_columns: sampleColumns,
    estimated_rows: lines.length > 1 ? lines.length - 1 : null,
    notes: [
      sourceFormat === 'spreadsheet' ? 'Spreadsheet upload detected.' : 'Delimited export detected.',
      sampleColumns.length > 0 ? `Detected ${sampleColumns.length} sample columns from the header.` : 'Could not detect a header row from the preview.',
    ],
  };
}

function analyzeJson(preview: string): MigrationUploadedAssetAnalysis {
  const detectedTables: string[] = [];
  const sampleColumns: string[] = [];
  const notes: string[] = ['JSON export detected.'];

  try {
    const parsed = JSON.parse(preview);
    if (Array.isArray(parsed)) {
      const first = parsed.find((item) => item && typeof item === 'object' && !Array.isArray(item)) as Record<string, unknown> | undefined;
      if (first) {
        sampleColumns.push(...Object.keys(first).slice(0, 20));
        notes.push(`Top-level array detected with object keys from the first row.`);
      }
    } else if (parsed && typeof parsed === 'object') {
      detectedTables.push(...Object.keys(parsed as Record<string, unknown>).slice(0, 20));
      const firstValue = Object.values(parsed as Record<string, unknown>).find(
        (value) => value && typeof value === 'object'
      ) as Record<string, unknown> | undefined;
      if (firstValue && !Array.isArray(firstValue)) {
        sampleColumns.push(...Object.keys(firstValue).slice(0, 20));
      }
      notes.push('Top-level object detected.');
    }
  } catch {
    notes.push('Preview was too partial to parse as JSON, but the file extension suggests JSON export data.');
  }

  return {
    source_format: 'json_export',
    sql_engine: null,
    detected_scopes: inferScopesFromTokens([...detectedTables, ...sampleColumns]),
    detected_tables: uniqueStrings(detectedTables),
    sample_columns: uniqueStrings(sampleColumns),
    estimated_rows: null,
    notes,
  };
}

function analyzeByExtension(name: string, preview: string): MigrationUploadedAssetAnalysis {
  const extension = name.split('.').pop()?.toLowerCase() ?? '';

  if (extension === 'sql') return analyzeSql(preview);
  if (extension === 'csv' || extension === 'tsv') return analyzeDelimited(preview, 'csv_export');
  if (extension === 'xlsx' || extension === 'xls') {
    return {
      source_format: 'spreadsheet',
      sql_engine: null,
      detected_scopes: inferScopesFromTokens([name]),
      detected_tables: [],
      sample_columns: [],
      estimated_rows: null,
      notes: ['Spreadsheet upload detected. Column-level analysis will happen after ops review.'],
    };
  }
  if (extension === 'json') return analyzeJson(preview);
  if (extension === 'xml') {
    return {
      source_format: 'xml_export',
      sql_engine: null,
      detected_scopes: inferScopesFromTokens([name, preview]),
      detected_tables: [],
      sample_columns: [],
      estimated_rows: null,
      notes: ['XML export detected.'],
    };
  }
  if (extension === 'pdf') {
    return {
      source_format: 'pdf_reference',
      sql_engine: null,
      detected_scopes: inferScopesFromTokens([name]),
      detected_tables: [],
      sample_columns: [],
      estimated_rows: null,
      notes: ['PDF reference detected. Useful for standings, awards, screenshots, or printed reports.'],
    };
  }
  if (extension === 'zip') {
    return {
      source_format: 'zip_archive',
      sql_engine: null,
      detected_scopes: inferScopesFromTokens([name]),
      detected_tables: [],
      sample_columns: [],
      estimated_rows: null,
      notes: ['Archive upload detected.'],
    };
  }
  if (extension === 'txt' || extension === 'md') {
    return {
      source_format: 'text_notes',
      sql_engine: null,
      detected_scopes: inferScopesFromTokens([name, preview]),
      detected_tables: [],
      sample_columns: [],
      estimated_rows: null,
      notes: ['Text notes detected.'],
    };
  }

  return {
    source_format: 'unknown',
    sql_engine: null,
    detected_scopes: inferScopesFromTokens([name]),
    detected_tables: [],
    sample_columns: [],
    estimated_rows: null,
    notes: ['File type accepted for assisted review, but no automatic analysis profile exists yet.'],
  };
}

export async function analyzeMigrationAssetBlob(
  blob: Blob,
  fileName: string
): Promise<MigrationUploadedAssetAnalysis> {
  const preview = await blob.slice(0, MAX_ANALYSIS_BYTES).text();
  return analyzeByExtension(fileName, preview);
}

export function buildNormalizationProfile(
  uploadedAssets: MigrationUploadedAsset[],
  assetLinks: string[],
  sourceUrl: string | null
): LeagueMigrationNormalizationProfile {
  const sourceFormats = uniqueStrings(uploadedAssets.map((asset) => asset.analysis.source_format)) as MigrationSourceFormat[];
  const suggestedScope = normalizeDetectedScopes(
    uploadedAssets.flatMap((asset) => asset.analysis.detected_scopes)
  );
  const detectedTables = uniqueStrings(
    uploadedAssets.flatMap((asset) => asset.analysis.detected_tables)
  ).slice(0, 50);

  const notes = uniqueStrings([
    uploadedAssets.some((asset) => asset.analysis.source_format === 'sql_dump')
      ? 'SQL source files were detected and classified for assisted normalization.'
      : '',
    assetLinks.length > 0 ? `${assetLinks.length} linked external sources were provided.` : '',
    sourceUrl ? 'A starting source URL was provided for reference.' : '',
  ]);

  return {
    source_formats: sourceFormats,
    suggested_scope: suggestedScope,
    detected_tables: detectedTables,
    notes,
    ready_for_review: uploadedAssets.length > 0 || assetLinks.length > 0 || Boolean(sourceUrl),
  };
}
