import { readFile } from "node:fs/promises";
import path from "node:path";
import { config } from "@/lib/config";
import type { RawWorkbook } from "@/lib/ingestion/types";

/* Workbook readers. Both return the SAME shape, so everything downstream is
   source-agnostic: the fixture proves the mapper, the live sheet runs the pilot.

   SERVER-SIDE ONLY. `googleapis` is imported dynamically so it never reaches a
   client bundle, and read-only scopes are the only ones requested.            */

/** A structurally identical local copy of the tracker (no credentials needed). */
export async function readFixtureWorkbook(
  fixturePath = config.ingestion.fixturePath,
): Promise<RawWorkbook> {
  const absolute = path.isAbsolute(fixturePath)
    ? fixturePath
    : path.join(process.cwd(), fixturePath);
  const raw = await readFile(absolute, "utf8");
  return JSON.parse(raw) as RawWorkbook;
}

/** Service-account credentials, preferring a key FILE over env vars.
 *
 *  Key material in an env var leaks easily — into shell history, process
 *  listings, editor diffs, screenshots. Pointing at a git-ignored JSON file
 *  keeps the secret in exactly one place that is easy to rotate and hard to
 *  paste by accident. The env-var path stays supported for deploy targets
 *  that only offer env vars (Vercel), but the file wins when both exist. */
async function serviceAccountCredentials(): Promise<{
  clientEmail: string;
  privateKey: string;
} | null> {
  const keyFile = process.env.GOOGLE_SERVICE_ACCOUNT_KEY_FILE;
  if (keyFile) {
    const absolute = path.isAbsolute(keyFile)
      ? keyFile
      : path.join(process.cwd(), keyFile);
    const parsed = JSON.parse(await readFile(absolute, "utf8")) as {
      client_email?: string;
      private_key?: string;
    };
    if (!parsed.client_email || !parsed.private_key) {
      throw new Error(
        `${keyFile} is missing client_email or private_key — is it the key JSON Google downloaded?`,
      );
    }
    return { clientEmail: parsed.client_email, privateKey: parsed.private_key };
  }

  const clientEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const raw = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY;
  if (!clientEmail || !raw) return null;

  // Env vars carry the key with literal \n escapes and often stray quotes.
  const privateKey = raw.replace(/^["']|["']$/g, "").replace(/\\n/g, "\n");
  if (!privateKey.includes("BEGIN PRIVATE KEY")) {
    throw new Error(
      "GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY looks truncated — it must include " +
        "the -----BEGIN PRIVATE KEY----- header. Prefer " +
        "GOOGLE_SERVICE_ACCOUNT_KEY_FILE pointing at the downloaded JSON.",
    );
  }
  return { clientEmail, privateKey };
}

/** The agency's live workbook, read-only.
 *  Env: GOOGLE_SHEETS_SPREADSHEET_ID + either
 *       GOOGLE_SERVICE_ACCOUNT_KEY_FILE (preferred) or
 *       GOOGLE_SERVICE_ACCOUNT_EMAIL + _PRIVATE_KEY. */
export async function readLiveWorkbook(): Promise<RawWorkbook> {
  const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID;
  const credentials = await serviceAccountCredentials();

  if (!spreadsheetId || !credentials) {
    throw new Error(
      "Live tracker not configured. Set GOOGLE_SHEETS_SPREADSHEET_ID and " +
        "GOOGLE_SERVICE_ACCOUNT_KEY_FILE in .env.local, and share the workbook " +
        "with the service account (Viewer is enough — Relay only reads).",
    );
  }

  const { google } = await import("googleapis");
  const auth = new google.auth.JWT({
    email: credentials.clientEmail,
    key: credentials.privateKey,
    scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
  });
  const sheets = google.sheets({ version: "v4", auth });

  // Discover the tabs, then batch-read them all in one call.
  const meta = await sheets.spreadsheets.get({ spreadsheetId });
  const tabNames = (meta.data.sheets ?? [])
    .map((s) => s.properties?.title)
    .filter((t): t is string => Boolean(t));

  const batch = await sheets.spreadsheets.values.batchGet({
    spreadsheetId,
    ranges: tabNames,
    // Values exactly as the source shows them — no locale reformatting.
    valueRenderOption: "UNFORMATTED_VALUE",
    dateTimeRenderOption: "FORMATTED_STRING",
  });

  const workbook: RawWorkbook = {};
  (batch.data.valueRanges ?? []).forEach((range, i) => {
    const name = tabNames[i];
    workbook[name] = (range.values ?? []).map((row) =>
      row.map((cell) => (cell === null || cell === undefined ? "" : String(cell))),
    );
  });
  return workbook;
}

/** Just the tab names, for the admin's add-client form.
 *
 *  A separate call from readWorkbook because it answers a different question at
 *  a different cost: `spreadsheets.get` returns the tab list alone, while
 *  readWorkbook batch-reads every cell of every tab. The form checks a name
 *  against this on each keystroke, so pulling the whole workbook to answer
 *  "does this tab exist" would be several megabytes per character typed. */
export async function listTrackerTabs(): Promise<{
  tabs: string[];
  source: "live" | "fixture";
}> {
  if (!hasLiveTrackerConfig()) {
    return { tabs: Object.keys(await readFixtureWorkbook()), source: "fixture" };
  }

  const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID!;
  const credentials = await serviceAccountCredentials();
  const { google } = await import("googleapis");
  const auth = new google.auth.JWT({
    email: credentials!.clientEmail,
    key: credentials!.privateKey,
    scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
  });
  const sheets = google.sheets({ version: "v4", auth });
  const meta = await sheets.spreadsheets.get({
    spreadsheetId,
    // Titles only. Without this the response carries every tab's grid data.
    fields: "sheets.properties.title",
  });
  return {
    tabs: (meta.data.sheets ?? [])
      .map((s) => s.properties?.title)
      .filter((t): t is string => Boolean(t)),
    source: "live",
  };
}

export function hasLiveTrackerConfig(): boolean {
  const hasCredentials =
    Boolean(process.env.GOOGLE_SERVICE_ACCOUNT_KEY_FILE) ||
    Boolean(
      process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL &&
        process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY,
    );
  return Boolean(process.env.GOOGLE_SHEETS_SPREADSHEET_ID) && hasCredentials;
}

/** Live workbook when configured, else the fixture. */
export async function readWorkbook(): Promise<{
  workbook: RawWorkbook;
  source: "live" | "fixture";
}> {
  if (hasLiveTrackerConfig()) {
    return { workbook: await readLiveWorkbook(), source: "live" };
  }
  return { workbook: await readFixtureWorkbook(), source: "fixture" };
}
