/**
 * Shared CSV parsing utilities.
 * Used by ImportScheduleModal, ImportPlayersModal, and ImportTeamsModal.
 */

/**
 * Parses CSV or TSV text into a 2D array of string cells.
 * Handles: comma/tab delimiters, quoted fields, Windows line endings.
 */
export function parseCsvText(text: string): string[][] {
  const lines = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');
  const rows: string[][] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    // Detect delimiter: prefer tab if present
    const delimiter = trimmed.includes('\t') ? '\t' : ',';
    const cells = splitCsvLine(trimmed, delimiter);
    rows.push(cells);
  }

  return rows;
}

/**
 * Splits a single CSV line respecting quoted fields.
 */
function splitCsvLine(line: string, delimiter: string): string[] {
  const cells: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        // Escaped quote
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === delimiter && !inQuotes) {
      cells.push(current.trim());
      current = '';
    } else {
      current += ch;
    }
  }
  cells.push(current.trim());
  return cells;
}

/**
 * Triggers a CSV file download in the browser.
 */
export function downloadCsv(filename: string, content: string): void {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
