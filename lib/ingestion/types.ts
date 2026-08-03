import type { EvidenceSnapshot, MetricKey, SourceOfTruth } from "@/lib/types";

/* Shapes for the tracker ingestion pipeline (AGENCY.md §1/§3). */

/** Raw workbook as the Sheets API returns it: tab name → rows of cell strings. */
export type RawWorkbook = Record<string, string[][]>;

/** One append-only daily row from a client tab. Values are exactly as the
 *  source showed them — never rounded, never recalculated on read. */
export type TrackerRow = {
  date: string; // ISO date
  metrics: Partial<Record<MetricKey, number>>;
};

/** A parsed client tab. */
export type TrackerTab = {
  tabName: string;
  sourceOfTruth?: SourceOfTruth;
  rows: TrackerRow[];
  /** Header text that couldn't be mapped to a metric — surfaced, not ignored,
   *  so a new tracker column can never be silently dropped. */
  unmappedColumns: string[];
};

/** Days absent from an otherwise-covered range. Never interpolated — the
 *  agency's own rule is that gaps are worse than odd-looking numbers. */
export type FreshnessWarning = {
  tabName: string;
  missingDates: string[];
  message: string;
};

export type MappedPeriod = {
  tabName: string;
  snapshot: EvidenceSnapshot;
  warnings: FreshnessWarning[];
};
