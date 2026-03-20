import type {
  MigrationImportFieldMapping,
  MigrationImportMappingEntry,
  MigrationUploadedAsset,
} from '@/lib/migration/requests';

export interface ParsedMigrationRow {
  /** 1-based row number from the source file */
  rowNumber: number;
  /** Raw values keyed by source column name */
  raw: Record<string, string>;
  /** Mapped values keyed by BLH target field name */
  mapped: Record<string, string>;
}

export interface ParsedMigrationFile {
  assetId: string;
  assetName: string;
  sourceColumns: string[];
  rows: ParsedMigrationRow[];
  totalRowCount: number;
  errors: string[];
}

const MAX_PREVIEW_ROWS = 25;
const MAX_IMPORT_ROWS = 5_000;

/**
 * Parse a CSV/TSV text blob into structured rows using confirmed field mappings.
 */
export function parseDelimitedText(
  text: string,
  asset: MigrationUploadedAsset,
  mapping: MigrationImportMappingEntry,
  options: { maxRows?: number } = {}
): ParsedMigrationFile {
  const maxRows = options.maxRows ?? MAX_IMPORT_ROWS;
  const errors: string[] = [];
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length < 2) {
    return {
      assetId: asset.id,
      assetName: asset.name,
      sourceColumns: [],
      rows: [],
      totalRowCount: 0,
      errors: ['File has no data rows (only a header or is empty).'],
    };
  }

  const headerLine = lines[0];
  const delimiter = detectDelimiter(headerLine);
  const sourceColumns = splitRow(headerLine, delimiter);

  const confirmedMappings = mapping.field_mappings.filter(
    (fm) => fm.target_field && fm.confidence === 'confirmed'
  );

  const rows: ParsedMigrationRow[] = [];
  const dataLines = lines.slice(1);
  const totalRowCount = dataLines.length;

  for (let i = 0; i < Math.min(dataLines.length, maxRows); i++) {
    const cells = splitRow(dataLines[i], delimiter);
    const raw: Record<string, string> = {};
    const mapped: Record<string, string> = {};

    for (let c = 0; c < sourceColumns.length; c++) {
      raw[sourceColumns[c]] = cells[c] ?? '';
    }

    for (const fm of confirmedMappings) {
      const value = raw[fm.source_field];
      if (value !== undefined && fm.target_field) {
        mapped[fm.target_field] = value;
      }
    }

    rows.push({ rowNumber: i + 2, raw, mapped });
  }

  if (totalRowCount > maxRows) {
    errors.push(
      `File contains ${totalRowCount} rows but only the first ${maxRows} will be processed.`
    );
  }

  return {
    assetId: asset.id,
    assetName: asset.name,
    sourceColumns,
    rows,
    totalRowCount,
    errors,
  };
}

/**
 * Parse a JSON array or object-of-arrays into structured rows.
 */
export function parseJsonText(
  text: string,
  asset: MigrationUploadedAsset,
  mapping: MigrationImportMappingEntry,
  options: { maxRows?: number } = {}
): ParsedMigrationFile {
  const maxRows = options.maxRows ?? MAX_IMPORT_ROWS;
  const errors: string[] = [];

  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return {
      assetId: asset.id,
      assetName: asset.name,
      sourceColumns: [],
      rows: [],
      totalRowCount: 0,
      errors: ['Failed to parse JSON file.'],
    };
  }

  let records: Record<string, unknown>[];
  if (Array.isArray(parsed)) {
    records = parsed.filter(
      (item): item is Record<string, unknown> =>
        Boolean(item) && typeof item === 'object' && !Array.isArray(item)
    );
  } else if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
    // Object-of-arrays: use sourceObject key if available
    const obj = parsed as Record<string, unknown>;
    const key = mapping.source_object;
    const target = key && key in obj ? obj[key] : Object.values(obj).find(Array.isArray);
    records = Array.isArray(target)
      ? target.filter(
          (item): item is Record<string, unknown> =>
            Boolean(item) && typeof item === 'object' && !Array.isArray(item)
        )
      : [];
  } else {
    records = [];
  }

  if (records.length === 0) {
    return {
      assetId: asset.id,
      assetName: asset.name,
      sourceColumns: [],
      rows: [],
      totalRowCount: 0,
      errors: ['No importable records found in JSON file.'],
    };
  }

  const sourceColumns = Object.keys(records[0]);
  const confirmedMappings = mapping.field_mappings.filter(
    (fm) => fm.target_field && fm.confidence === 'confirmed'
  );

  const totalRowCount = records.length;
  const rows: ParsedMigrationRow[] = [];

  for (let i = 0; i < Math.min(records.length, maxRows); i++) {
    const record = records[i];
    const raw: Record<string, string> = {};
    const mapped: Record<string, string> = {};

    for (const col of sourceColumns) {
      const val = record[col];
      raw[col] = val === null || val === undefined ? '' : String(val);
    }

    for (const fm of confirmedMappings) {
      const value = raw[fm.source_field];
      if (value !== undefined && fm.target_field) {
        mapped[fm.target_field] = value;
      }
    }

    rows.push({ rowNumber: i + 1, raw, mapped });
  }

  if (totalRowCount > maxRows) {
    errors.push(
      `File contains ${totalRowCount} records but only the first ${maxRows} will be processed.`
    );
  }

  return {
    assetId: asset.id,
    assetName: asset.name,
    sourceColumns,
    rows,
    totalRowCount,
    errors,
  };
}

/**
 * Parse an uploaded migration asset based on its detected format.
 */
export function parseMigrationAsset(
  text: string,
  asset: MigrationUploadedAsset,
  mapping: MigrationImportMappingEntry,
  options: { preview?: boolean } = {}
): ParsedMigrationFile {
  const maxRows = options.preview ? MAX_PREVIEW_ROWS : MAX_IMPORT_ROWS;
  const format = asset.analysis.source_format;

  if (format === 'csv_export' || format === 'spreadsheet') {
    return parseDelimitedText(text, asset, mapping, { maxRows });
  }

  if (format === 'json_export') {
    return parseJsonText(text, asset, mapping, { maxRows });
  }

  return {
    assetId: asset.id,
    assetName: asset.name,
    sourceColumns: [],
    rows: [],
    totalRowCount: 0,
    errors: [
      `Automatic parsing is not supported for ${format.replace(/_/g, ' ')} files. ` +
        'Convert to CSV or JSON first, or import manually.',
    ],
  };
}

// ── Helpers ─────────────────────────────────────────────────────────────────

function detectDelimiter(headerLine: string): string {
  if (headerLine.includes('\t')) return '\t';
  if (headerLine.includes(';')) return ';';
  return ',';
}

function splitRow(line: string, delimiter: string): string[] {
  // Simple CSV split that handles quoted fields
  const fields: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];

    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === delimiter && !inQuotes) {
      fields.push(current.trim());
      current = '';
    } else {
      current += ch;
    }
  }

  fields.push(current.trim());
  return fields;
}
