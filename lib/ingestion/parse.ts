import { format, isValid, parse } from "date-fns";
import { config } from "@/lib/config";
import { normalizeMetricValue } from "@/lib/metrics";
import { SourceOfTruthSchema, type MetricKey } from "@/lib/types";
import type { RawWorkbook, TrackerRow, TrackerTab } from "@/lib/ingestion/types";

/** Fixed reference so date parsing never depends on wall-clock "now". */
const REFERENCE_DATE = new Date(2000, 0, 1);

/* Parse raw tab rows into typed daily rows.

   Governance respected here (AGENCY.md §1):
   - values are read exactly as typed — no rounding, no recalculation
   - a zero row is DATA (zero-spend days are logged as zeroes, never blanks)
   - a blank/absent date is a GAP, handled downstream as a freshness warning
   - unmapped columns are surfaced, never silently dropped                    */

const ing = config.ingestion;

/** Sheets hands back whatever the buyer typed: "1,234.50", "$1,234.50",
 *  "76.15%", "", "-". Only a genuinely numeric cell becomes a number; anything
 *  else is absent, NOT zero. Percentages are stored as their face value
 *  (76.15%, not 0.7615) — that's how the tracker displays them and Relay
 *  echoes the source rather than rescaling it. */
export function parseCell(raw: string | undefined): number | undefined {
  if (raw === undefined) return undefined;
  const cleaned = raw
    .replace(/[$,%\s]/g, "")
    .replace(/[−–—]/g, "-");
  if (cleaned === "" || cleaned === "-") return undefined;
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : undefined;
}

/** Date formats seen in real tracker tabs. Parsed with date-fns against the
 *  LOCAL calendar — `new Date(...).toISOString()` shifts the day by the UTC
 *  offset, which in GST (+4) silently reports every row as the day before. */
const DATE_FORMATS = [
  "yyyy-MM-dd",
  "MMMM d, yyyy", // "June 30, 2026" — the agency's format
  "MMM d, yyyy",
  "d MMMM yyyy",
  "MM/dd/yyyy",
  "dd/MM/yyyy",
];

export function parseDateCell(raw: string | undefined): string | undefined {
  if (!raw) return undefined;
  const trimmed = String(raw).trim();
  if (trimmed === "") return undefined;
  for (const pattern of DATE_FORMATS) {
    const parsed = parse(trimmed, pattern, REFERENCE_DATE);
    if (isValid(parsed)) return format(parsed, "yyyy-MM-dd");
  }
  return undefined;
}

/** The client's source of truth is named in the tab header block. */
function findSourceOfTruth(rows: string[][]): string | undefined {
  for (const row of rows.slice(0, 6)) {
    for (const cell of row) {
      if (cell?.startsWith(ing.sourceOfTruthPrefix)) {
        return cell.slice(ing.sourceOfTruthPrefix.length).trim();
      }
    }
  }
  return undefined;
}

/** Locate the DAILY ENTRY header row by its Date column. */
function findHeaderIndex(rows: string[][]): number {
  return rows.findIndex((row) => row[0]?.trim() === ing.dateHeader);
}

export function parseTab(tabName: string, rows: string[][]): TrackerTab {
  const headerIndex = findHeaderIndex(rows);
  if (headerIndex === -1) {
    throw new Error(
      `Tab "${tabName}": no "${ing.dateHeader}" header found — is this a client tab?`,
    );
  }

  const headers = rows[headerIndex].map((h) => h?.trim() ?? "");
  const columnMap = new Map<number, MetricKey>();
  const unmappedColumns: string[] = [];

  headers.forEach((header, i) => {
    if (i === 0 || header === "") return; // column 0 is Date
    const metric = ing.columnToMetric[header];
    if (metric) columnMap.set(i, metric as MetricKey);
    else unmappedColumns.push(header);
  });

  const parsedRows: TrackerRow[] = [];
  for (const row of rows.slice(headerIndex + 1)) {
    const date = parseDateCell(row?.[0]);
    if (!date) continue; // blank row = end of table or a gap, not a zero

    const metrics: Partial<Record<MetricKey, number>> = {};
    columnMap.forEach((metric, index) => {
      const value = parseCell(row[index]);
      // Percentages arrive as 76.15 from a typed cell but 0.7615 from a
      // percent-FORMATTED one; normalise to the scale the tracker displays.
      if (value !== undefined) metrics[metric] = normalizeMetricValue(metric, value);
    });
    parsedRows.push({ date, metrics });
  }

  const sourceRaw = findSourceOfTruth(rows);
  const sourceParsed = SourceOfTruthSchema.safeParse(sourceRaw);

  return {
    tabName,
    sourceOfTruth: sourceParsed.success ? sourceParsed.data : undefined,
    rows: parsedRows.sort((a, b) => a.date.localeCompare(b.date)),
    unmappedColumns,
  };
}

/** Parse every client tab, skipping the workbook's non-client tabs. */
export function parseWorkbook(workbook: RawWorkbook): TrackerTab[] {
  return Object.entries(workbook)
    .filter(([name]) => !name.startsWith("_"))
    .filter(([name]) => !ing.ignoredTabs.includes(name))
    .map(([name, rows]) => parseTab(name, rows));
}
