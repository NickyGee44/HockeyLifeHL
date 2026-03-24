/**
 * Pure parsing functions for migration source files.
 * No database access — these transform raw file content into structured rows.
 */

/**
 * Parse INSERT statements from a SQL dump, optionally filtering by table name.
 * Handles both single-row and multi-row INSERT syntax.
 */
export function parseSqlDumpInserts(
  content: string,
  tableName: string
): Record<string, string>[] {
  const rows: Record<string, string>[] = [];
  const escapedTable = escapeRegExp(tableName);

  // Match: INSERT INTO [schema.]tableName (col1, col2, ...) VALUES (...), (...);
  const insertPattern = new RegExp(
    `INSERT\\s+INTO\\s+(?:[\\w".\`\\[\\]]+\\.)?[\\s"'\`\\[\\]]*${escapedTable}[\\s"'\`\\]]*\\s*\\(([^)]+)\\)\\s*VALUES\\s*([\\s\\S]*?)\\s*;`,
    'gi'
  );

  let match: RegExpExecArray | null;
  while ((match = insertPattern.exec(content)) !== null) {
    const columnsPart = match[1];
    const valuesPart = match[2];
    if (!columnsPart || !valuesPart) continue;

    const columns = columnsPart
      .split(',')
      .map((col) => col.replace(/[`"[\]\s]/g, '').trim())
      .filter(Boolean);

    const valueTuples = extractValueTuples(valuesPart);

    for (const tuple of valueTuples) {
      const values = parseValueTuple(tuple);
      if (values.length !== columns.length) continue;

      const row: Record<string, string> = {};
      for (let i = 0; i < columns.length; i++) {
        row[columns[i]] = values[i];
      }
      rows.push(row);
    }
  }

  return rows;
}

/**
 * Parse CSV content into rows. Assumes the first line is a header.
 * Handles quoted fields and common delimiters (comma, tab, semicolon).
 */
export function parseCsvContent(content: string): Record<string, string>[] {
  const lines = content.split(/\r?\n/).filter((line) => line.trim());
  if (lines.length < 2) return [];

  const headerLine = lines[0];
  const delimiter = detectDelimiter(headerLine);
  const headers = parseCsvLine(headerLine, delimiter).map((h) =>
    h.replace(/^\uFEFF/, '').trim()
  );

  const rows: Record<string, string>[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = parseCsvLine(lines[i], delimiter);
    if (values.length === 0) continue;

    const row: Record<string, string> = {};
    for (let j = 0; j < headers.length; j++) {
      if (headers[j]) {
        row[headers[j]] = (values[j] ?? '').trim();
      }
    }
    rows.push(row);
  }

  return rows;
}

/**
 * Parse JSON content into rows. Handles both top-level arrays and
 * objects with array values.
 */
export function parseJsonContent(content: string): Record<string, unknown>[] {
  const parsed: unknown = JSON.parse(content);

  if (Array.isArray(parsed)) {
    return parsed.filter(
      (item): item is Record<string, unknown> =>
        item !== null && typeof item === 'object' && !Array.isArray(item)
    );
  }

  if (parsed && typeof parsed === 'object') {
    // If it's an object, look for the first array-valued key
    for (const value of Object.values(parsed as Record<string, unknown>)) {
      if (Array.isArray(value) && value.length > 0) {
        return value.filter(
          (item): item is Record<string, unknown> =>
            item !== null && typeof item === 'object' && !Array.isArray(item)
        );
      }
    }
  }

  return [];
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function escapeRegExp(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function detectDelimiter(headerLine: string): string {
  if (headerLine.includes('\t')) return '\t';
  if (headerLine.includes(';')) return ';';
  return ',';
}

/**
 * Parse a single CSV line respecting quoted fields.
 */
function parseCsvLine(line: string, delimiter: string): string[] {
  const values: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (inQuotes) {
      if (char === '"') {
        if (i + 1 < line.length && line[i + 1] === '"') {
          current += '"';
          i++; // skip escaped quote
        } else {
          inQuotes = false;
        }
      } else {
        current += char;
      }
    } else if (char === '"') {
      inQuotes = true;
    } else if (char === delimiter) {
      values.push(current);
      current = '';
    } else {
      current += char;
    }
  }

  values.push(current);
  return values;
}

/**
 * Extract individual value tuples from a VALUES clause.
 * e.g. "(1, 'a'), (2, 'b')" → ["1, 'a'", "2, 'b'"]
 */
function extractValueTuples(valuesPart: string): string[] {
  const tuples: string[] = [];
  let depth = 0;
  let current = '';
  let inString = false;
  let stringChar = '';

  for (let i = 0; i < valuesPart.length; i++) {
    const char = valuesPart[i];

    if (inString) {
      current += char;
      if (char === stringChar) {
        // Check for escaped quote
        if (i + 1 < valuesPart.length && valuesPart[i + 1] === stringChar) {
          current += valuesPart[i + 1];
          i++;
        } else {
          inString = false;
        }
      } else if (char === '\\') {
        // Handle backslash escapes
        if (i + 1 < valuesPart.length) {
          current += valuesPart[i + 1];
          i++;
        }
      }
      continue;
    }

    if (char === "'" || char === '"') {
      inString = true;
      stringChar = char;
      current += char;
      continue;
    }

    if (char === '(') {
      depth++;
      if (depth === 1) {
        current = '';
        continue;
      }
    }

    if (char === ')') {
      depth--;
      if (depth === 0) {
        tuples.push(current);
        current = '';
        continue;
      }
    }

    if (depth > 0) {
      current += char;
    }
  }

  return tuples;
}

/**
 * Parse a comma-separated value tuple into individual string values.
 * Strips SQL quoting (single quotes) and handles NULL.
 */
function parseValueTuple(tuple: string): string[] {
  const values: string[] = [];
  let current = '';
  let inString = false;

  for (let i = 0; i < tuple.length; i++) {
    const char = tuple[i];

    if (inString) {
      if (char === "'") {
        if (i + 1 < tuple.length && tuple[i + 1] === "'") {
          current += "'";
          i++;
        } else {
          inString = false;
        }
      } else if (char === '\\') {
        if (i + 1 < tuple.length) {
          current += tuple[i + 1];
          i++;
        }
      } else {
        current += char;
      }
      continue;
    }

    if (char === "'") {
      inString = true;
      continue;
    }

    if (char === ',') {
      values.push(normalizeValue(current));
      current = '';
      continue;
    }

    current += char;
  }

  values.push(normalizeValue(current));
  return values;
}

function normalizeValue(raw: string): string {
  const trimmed = raw.trim();
  if (trimmed.toUpperCase() === 'NULL') return '';
  return trimmed;
}
