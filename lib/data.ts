import { format, parseISO, subDays } from "date-fns";
import { getSupabase } from "@/lib/supabase";
import { now, nowIso } from "@/lib/clock";
import { config } from "@/lib/config";
import { yesterday } from "@/lib/demo/calendar";
import { captureEditDiff } from "@/lib/voice";
import {
  ROW_ABSENT_KEY,
  AccountSchema,
  AnswerSchema,
  type Answer,
  AnswerThreadSchema,
  CadenceSchema,
  ClientProfileSchema,
  DailyRowSchema,
  EvidenceItemSchema,
  EvidenceSnapshotSchema,
  FlagSchema,
  KpiSchema,
  LoomBriefSchema,
  NarrativeSchema,
  PeriodSchema,
  SensitivitySchema,
  StakeholderSchema,
  TimelineEntrySchema,
  type AnswerThread,
  type ClientProfile,
  type DailyMetrics,
  type DailyRow,
  type EvidenceSnapshot,
  type Flag,
  type Kpi,
  type LoomBrief,
  type MetricSegment,
  type Narrative,
  type NarrativeStatus,
  type Sensitivity,
  type Stakeholder,
  type TimelineEntry,
} from "@/lib/types";

/* ============================================================================
   Data-access seam — now Supabase-backed (project seeded from supabase/seed.sql).
   Every read maps snake_case rows into the domain types and zod-parses them, so
   a drifted row fails loudly here instead of rendering garbage. All screens go
   through this module; no component talks to Supabase directly.
   ========================================================================== */

/* eslint-disable @typescript-eslint/no-explicit-any -- row mappers take PostgREST rows */

const num = (v: unknown): number => Number(v);
const opt = <T>(v: T | null): T | undefined => (v === null ? undefined : v);

// --- Row mappers (snake_case → domain, zod-parsed) ---------------------------

function mapAccount(r: any) {
  return AccountSchema.parse({
    id: r.id,
    clientId: r.client_id,
    platform: r.platform,
    externalId: r.external_id,
    health: r.health,
    lastSyncAt: r.last_sync_at,
  });
}

function mapKpi(r: any): Kpi {
  return KpiSchema.parse({
    id: r.id,
    clientId: r.client_id,
    label: r.label,
    mapsTo: r.maps_to,
    target: num(r.target),
    polarity: r.polarity,
    format: r.format,
    tolerancePct:
      opt(r.tolerance_pct) === undefined ? undefined : num(r.tolerance_pct),
    note: opt(r.note),
  });
}

function mapSensitivity(r: any): Sensitivity {
  return SensitivitySchema.parse({
    id: r.id,
    clientId: r.client_id,
    type: r.type,
    text: r.text,
  });
}

function mapStakeholder(r: any): Stakeholder {
  return StakeholderSchema.parse({
    id: r.id,
    clientId: r.client_id,
    name: r.name,
    role: r.role,
    gets: r.gets,
  });
}

function mapProfile(
  client: any,
  accounts: any[],
  kpis: any[],
  sensitivities: any[],
  stakeholders: any[],
): ClientProfile {
  return ClientProfileSchema.parse({
    id: client.id,
    name: client.name,
    currency: client.currency,
    sourceOfTruth: client.source_of_truth,
    cadence: CadenceSchema.parse(client.cadence),
    channel: client.channel,
    descriptor: opt(client.descriptor),
    dailyToClient: client.daily_to_client ?? false,
    accountTimezone: client.account_timezone ?? "Asia/Dubai",
    accounts: accounts.map(mapAccount),
    kpis: kpis.map(mapKpi),
    sensitivities: sensitivities.map(mapSensitivity),
    stakeholders: stakeholders.map(mapStakeholder),
  });
}

function mapEvidenceItem(r: any) {
  return EvidenceItemSchema.parse({
    id: r.item_key,
    snapshotId: r.snapshot_id,
    source: r.source,
    sourceOfTruth: opt(r.source_of_truth),
    metricKey: opt(r.metric_key),
    metricLabel: r.metric_label,
    value: num(r.value),
    valueDisplay: r.value_display,
    deltaPct: opt(r.delta_pct) === undefined ? undefined : num(r.delta_pct),
    deltaLabel: r.delta_label,
    polarity: opt(r.polarity),
    segment: r.segment ?? "overall",
    unavailableReason: opt(r.unavailable_reason),
    note: opt(r.note),
    series: opt(r.series),
  });
}

function mapSnapshot(r: any, items: any[]): EvidenceSnapshot {
  return EvidenceSnapshotSchema.parse({
    id: r.id,
    clientId: r.client_id,
    period: PeriodSchema.parse(r.period),
    asOf: r.as_of,
    items: items.map(mapEvidenceItem),
  });
}

function mapFlag(r: any): Flag {
  return FlagSchema.parse({
    id: r.id,
    clientId: r.client_id,
    kind: r.kind,
    metricLabel: r.metric_label,
    deltaLabel: r.delta_label,
    headline: r.headline,
    diagnostic: r.diagnostic,
    draftNote: opt(r.draft_note),
    status: r.status,
    dismissalReason: opt(r.dismissal_reason),
    createdAt: r.created_at,
  });
}

function mapThread(r: any): AnswerThread {
  return AnswerThreadSchema.parse({
    id: r.id,
    clientId: r.client_id,
    question: r.question,
    createdAt: r.created_at,
    answer: r.answer === null ? undefined : AnswerSchema.parse(r.answer),
  });
}

function mapTimelineEntry(r: any): TimelineEntry {
  return TimelineEntrySchema.parse({
    id: r.id,
    clientId: r.client_id,
    type: r.type,
    date: r.date,
    summary: r.summary,
    body: opt(r.body),
    snapshotId: opt(r.snapshot_id),
    refId: opt(r.ref_id),
  });
}

function mapNarrative(r: any, claims: any[]): Narrative {
  return NarrativeSchema.parse({
    id: r.id,
    clientId: r.client_id,
    snapshotId: r.snapshot_id,
    week: PeriodSchema.parse(r.week),
    status: r.status,
    channel: r.channel,
    emailGreeting: opt(r.email_greeting),
    whatsappVariant: opt(r.whatsapp_variant),
    reviewedAt: opt(r.reviewed_at),
    sentAt: opt(r.sent_at),
    claims: claims
      .filter((c) => c.narrative_id === r.id)
      .sort((a, b) => a.ord - b.ord)
      .map((c) => ({
        id: c.id,
        narrativeId: c.narrative_id,
        order: c.ord,
        kind: c.kind,
        text: c.text,
        evidenceRefs: c.evidence_refs,
      })),
  });
}

function throwIf(error: { message: string } | null): void {
  if (error) throw new Error(`Supabase: ${error.message}`);
}

// --- Clients -----------------------------------------------------------------

export async function getClients(): Promise<ClientProfile[]> {
  const sb = await getSupabase();
  const [clients, accounts, kpis, sensitivities, stakeholders] =
    await Promise.all([
      sb.from("clients").select("*").order("name"),
      sb.from("accounts").select("*"),
      sb.from("kpis").select("*"),
      sb.from("sensitivities").select("*"),
      sb.from("stakeholders").select("*"),
    ]);
  [clients, accounts, kpis, sensitivities, stakeholders].forEach((r) =>
    throwIf(r.error),
  );
  const forClient = (rows: any[], id: string) =>
    rows.filter((r) => r.client_id === id);
  return (clients.data ?? []).map((c) =>
    mapProfile(
      c,
      forClient(accounts.data ?? [], c.id),
      forClient(kpis.data ?? [], c.id),
      forClient(sensitivities.data ?? [], c.id),
      forClient(stakeholders.data ?? [], c.id),
    ),
  );
}

export async function getClientProfile(
  id: string,
): Promise<ClientProfile | undefined> {
  const sb = await getSupabase();
  const [client, accounts, kpis, sensitivities, stakeholders] =
    await Promise.all([
      sb.from("clients").select("*").eq("id", id).maybeSingle(),
      sb.from("accounts").select("*").eq("client_id", id),
      sb.from("kpis").select("*").eq("client_id", id).order("label"),
      sb.from("sensitivities").select("*").eq("client_id", id).order("type"),
      sb.from("stakeholders").select("*").eq("client_id", id).order("name"),
    ]);
  [client, accounts, kpis, sensitivities, stakeholders].forEach((r) =>
    throwIf(r.error),
  );
  if (!client.data) return undefined;
  return mapProfile(
    client.data,
    accounts.data ?? [],
    kpis.data ?? [],
    sensitivities.data ?? [],
    stakeholders.data ?? [],
  );
}

// --- Timeline + snapshots ------------------------------------------------------

export async function getTimeline(clientId: string): Promise<TimelineEntry[]> {
  const sb = await getSupabase();
  const { data, error } = await sb
    .from("timeline_entries")
    .select("*")
    .eq("client_id", clientId)
    .order("date", { ascending: false });
  throwIf(error);
  return (data ?? []).map(mapTimelineEntry);
}

/** Fetch a set of snapshots (with items) keyed by id — the Timeline dialog's food. */
export async function getSnapshotsByIds(
  ids: string[],
): Promise<Record<string, EvidenceSnapshot>> {
  if (ids.length === 0) return {};
  const sb = await getSupabase();
  const [snaps, items] = await Promise.all([
    sb.from("evidence_snapshots").select("*").in("id", ids),
    sb.from("evidence_items").select("*").in("snapshot_id", ids),
  ]);
  throwIf(snaps.error);
  throwIf(items.error);
  const out: Record<string, EvidenceSnapshot> = {};
  for (const s of snaps.data ?? []) {
    out[s.id] = mapSnapshot(
      s,
      (items.data ?? []).filter((i) => i.snapshot_id === s.id),
    );
  }
  return out;
}

/** Every snapshot Relay holds for a client, newest first. */
export async function getSnapshotsForClient(
  clientId: string,
): Promise<EvidenceSnapshot[]> {
  const sb = await getSupabase();
  const { data, error } = await sb
    .from("evidence_snapshots")
    .select("id")
    .eq("client_id", clientId)
    .order("as_of", { ascending: false });
  throwIf(error);
  const ids = (data ?? []).map((s) => s.id);
  const byId = await getSnapshotsByIds(ids);
  return ids.map((id) => byId[id]).filter(Boolean);
}

/** Insert-or-replace a snapshot and its items (Phase 7 ingestion commit).
 *  Keyed by the snapshot's deterministic id, so re-ingesting the same period
 *  is idempotent. Never touches snapshots with other ids — artifacts stay
 *  pinned to exactly the evidence they were written from. */
export async function upsertSnapshot(
  snapshot: EvidenceSnapshot,
): Promise<void> {
  const sb = await getSupabase();
  const { error } = await sb.from("evidence_snapshots").upsert({
    id: snapshot.id,
    client_id: snapshot.clientId,
    period: snapshot.period,
    as_of: snapshot.asOf,
  });
  throwIf(error);

  const { error: clearError } = await sb
    .from("evidence_items")
    .delete()
    .eq("snapshot_id", snapshot.id);
  throwIf(clearError);

  const { error: itemsError } = await sb.from("evidence_items").insert(
    snapshot.items.map((item) => ({
      snapshot_id: snapshot.id,
      item_key: item.id,
      source: item.source,
      source_of_truth: item.sourceOfTruth ?? null,
      metric_key: item.metricKey ?? null,
      metric_label: item.metricLabel,
      value: item.value,
      value_display: item.valueDisplay,
      delta_pct: item.deltaPct ?? null,
      delta_label: item.deltaLabel,
      polarity: item.polarity ?? null,
      note: item.note ?? null,
      series: item.series ?? null,
    })),
  );
  throwIf(itemsError);
}

// --- Today: Waiting on you -----------------------------------------------------

export type WaitingThread = { thread: AnswerThread; clientName: string };

export async function getWaitingThreads(): Promise<WaitingThread[]> {
  const sb = await getSupabase();
  const [threads, clients] = await Promise.all([
    sb.from("answer_threads").select("*").is("answer", null),
    sb.from("clients").select("id, name"),
  ]);
  throwIf(threads.error);
  throwIf(clients.error);
  const names = new Map((clients.data ?? []).map((c) => [c.id, c.name]));
  return (threads.data ?? []).map((t) => ({
    thread: mapThread(t),
    clientName: names.get(t.client_id) ?? "Unknown client",
  }));
}

// --- Today: Flags ---------------------------------------------------------------

export type FlagWithClient = { flag: Flag; clientName: string };

/** Open flags only — Today is "what needs attention"; dismissed flags live in
 *  the client Timeline with their reason (confirmed pattern). */
/** Clients whose newest row carrying actual DATA has fallen more than
 *  config.flags.staleSourceDays behind yesterday.
 *
 *  Deliberately ignores rows staged with ROW_ABSENT_KEY: a run of "Relay looked
 *  and found nothing" rows would otherwise make the source look current right up
 *  to yesterday while carrying no numbers at all. */
async function clientsWithStaleSource(): Promise<Set<string>> {
  const sb = await getSupabase();
  const cutoff = format(
    subDays(parseISO(yesterday()), config.flags.staleSourceDays),
    "yyyy-MM-dd",
  );
  // Anything on or after the cutoff is enough to call the source live, so only
  // that window needs reading rather than the whole table.
  const { data, error } = await sb
    .from("daily_rows")
    .select("client_id, date, unavailable")
    .gte("date", cutoff);
  throwIf(error);

  const live = new Set<string>();
  for (const row of data ?? []) {
    const unavailable = (row.unavailable ?? {}) as Record<string, string>;
    if (unavailable[ROW_ABSENT_KEY]) continue;
    live.add(row.client_id);
  }

  const all = await sb.from("clients").select("id");
  throwIf(all.error);
  return new Set(
    (all.data ?? []).map((c) => c.id).filter((id) => !live.has(id)),
  );
}

/** Today's flag queue.
 *
 *  Suppresses — never resolves — engine anomaly flags for a client whose source
 *  has stopped. Those flags are not resolved, they are UNEVALUABLE: the
 *  condition that raised them may well still hold, and marking it resolved would
 *  claim the problem went away when the truth is that nobody can see. So the row
 *  is left exactly as it is and simply not shown; when data returns, the engine
 *  either re-confirms it (same condition key, still open) or retracts it.
 *
 *  Two kinds are always shown: hand-authored flags, which have no dedupe key and
 *  represent a human's judgement, and freshness flags, which are ABOUT the
 *  staleness and so are the one thing still worth acting on. The digest band
 *  carries the actionable message meanwhile — "the row needs filling in the
 *  tracker". */
export async function getOpenFlags(): Promise<FlagWithClient[]> {
  const sb = await getSupabase();
  const [flags, clients, stale] = await Promise.all([
    sb.from("flags").select("*").eq("status", "open").order("created_at"),
    sb.from("clients").select("id, name"),
    clientsWithStaleSource(),
  ]);
  throwIf(flags.error);
  throwIf(clients.error);
  const names = new Map((clients.data ?? []).map((c) => [c.id, c.name]));
  return (flags.data ?? [])
    .filter(
      (f) =>
        !stale.has(f.client_id) ||
        f.dedupe_key === null ||
        f.kind === "freshness",
    )
    .map((f) => ({
      flag: mapFlag(f),
      clientName: names.get(f.client_id) ?? "Unknown client",
    }));
}

/** Reason-capture enforced here AND by the DB CHECK (flag_dismissal_reason). */
export async function dismissFlag(id: string, reason: string): Promise<void> {
  const trimmed = reason.trim();
  if (!trimmed) throw new Error("A dismissal reason is required.");
  const { error } = await (
    await getSupabase()
  )
    .from("flags")
    .update({ status: "dismissed", dismissal_reason: trimmed })
    .eq("id", id);
  throwIf(error);
}

// --- Today: Due this week --------------------------------------------------------

export type DueItem = { narrative: Narrative; client: ClientProfile };

const STATUS_ORDER: Record<NarrativeStatus, number> = {
  drafted: 0,
  reviewed: 1,
  sent: 2,
};

/** "Due this week" means what a buyer would mean by it:
 *   · anything still OUTSTANDING (drafted or reviewed), however old — an unsent
 *     draft from three weeks ago is more due, not less; and
 *   · anything sent RECENTLY, so work doesn't vanish the instant it ships. The
 *     section reads as "this week's book of work", not a to-do remnant.
 *
 *  Recency is measured on when it was SENT, not which week it reports on: a
 *  Monday-morning buyer is delivering last week's commentary, so keying off the
 *  reporting week would hide exactly the row they just acted on.
 *
 *  Without any filter this returned every narrative ever written and grew
 *  without bound — fine against one week of seed, wrong within a month.
 *  Capped at config.pageSizes.library so one neglected client can't flood it. */
export async function getDueThisWeek(at?: Date): Promise<DueItem[]> {
  const sb = await getSupabase();
  const [narratives, claims] = await Promise.all([
    sb.from("narratives").select("*"),
    sb.from("claims").select("*"),
  ]);
  throwIf(narratives.error);
  throwIf(claims.error);
  const clients = await getClients();
  const byId = new Map(clients.map((c) => [c.id, c]));

  const instant = at ?? now();
  const recentCutoff = subDays(instant, config.pageSizes.dueRecentDays);

  return (narratives.data ?? [])
    .flatMap((n) => {
      const client = byId.get(n.client_id);
      if (!client) return [];
      const narrative = mapNarrative(n, claims.data ?? []);
      const outstanding = narrative.status !== "sent";
      const recentlySent = narrative.sentAt
        ? parseISO(narrative.sentAt) >= recentCutoff
        : false;
      return outstanding || recentlySent ? [{ narrative, client }] : [];
    })
    .sort((a, b) => {
      const byStatus =
        STATUS_ORDER[a.narrative.status] - STATUS_ORDER[b.narrative.status];
      // Within a status, oldest first — the longest-waiting draft is the most due.
      return byStatus !== 0
        ? byStatus
        : a.narrative.week.start.localeCompare(b.narrative.week.start);
    })
    .slice(0, config.pageSizes.library);
}

// --- Narratives (Phase 3) -----------------------------------------------------------

export async function getNarrativesForClient(
  clientId: string,
): Promise<Narrative[]> {
  const sb = await getSupabase();
  const narratives = await sb
    .from("narratives")
    .select("*")
    .eq("client_id", clientId);
  throwIf(narratives.error);
  const ids = (narratives.data ?? []).map((n) => n.id);
  if (ids.length === 0) return [];
  const claims = await sb.from("claims").select("*").in("narrative_id", ids);
  throwIf(claims.error);
  return (narratives.data ?? [])
    .map((n) => mapNarrative(n, claims.data ?? []))
    .sort((a, b) => b.week.start.localeCompare(a.week.start));
}

export type NarrativeContext = {
  narrative: Narrative;
  snapshot: EvidenceSnapshot;
  profile: ClientProfile;
  loomBriefId?: string; // present when this week has a recording-prep brief
};

export async function getNarrativeContext(
  narrativeId: string,
): Promise<NarrativeContext | undefined> {
  const sb = await getSupabase();
  const { data: n, error } = await sb
    .from("narratives")
    .select("*")
    .eq("id", narrativeId)
    .maybeSingle();
  throwIf(error);
  if (!n) return undefined;
  const [claims, profile, snapshots, brief] = await Promise.all([
    sb.from("claims").select("*").eq("narrative_id", n.id),
    getClientProfile(n.client_id),
    getSnapshotsByIds([n.snapshot_id]),
    sb.from("loom_briefs").select("id").eq("narrative_id", n.id).maybeSingle(),
  ]);
  throwIf(claims.error);
  throwIf(brief.error);
  const snapshot = snapshots[n.snapshot_id];
  if (!profile || !snapshot) return undefined;
  return {
    narrative: mapNarrative(n, claims.data ?? []),
    snapshot,
    profile,
    loomBriefId: brief.data?.id,
  };
}

/** Save edited draft text. Paragraphs map 1:1 onto claims by order — the naive
 *  marker-preserving approach PHASE.md sanctions for MVP: text is editable,
 *  structure (claim count, kinds, evidence refs) is not. Edits silently feed
 *  the voice profile (captureEditDiff) while the narrative is `drafted`. */
export async function saveDraftEdits(
  narrativeId: string,
  paragraphs: string[],
): Promise<void> {
  const sb = await getSupabase();
  const { data: n, error } = await sb
    .from("narratives")
    .select("*")
    .eq("id", narrativeId)
    .maybeSingle();
  throwIf(error);
  if (!n) throw new Error("Narrative not found.");
  if (n.status !== "drafted")
    throw new Error("Only drafted narratives can be edited.");

  const claims = await sb
    .from("claims")
    .select("*")
    .eq("narrative_id", narrativeId)
    .order("ord");
  throwIf(claims.error);
  const rows = claims.data ?? [];
  if (paragraphs.length !== rows.length)
    throw new Error(config.copy.splitView.paragraphCountError);

  const before = rows.map((c) => c.text).join("\n\n");
  const after = paragraphs.map((p) => p.trim()).join("\n\n");
  if (before === after) return;

  for (let i = 0; i < rows.length; i++) {
    const next = paragraphs[i].trim();
    if (next === rows[i].text) continue;
    const { error: updateError } = await sb
      .from("claims")
      .update({ text: next })
      .eq("id", rows[i].id);
    throwIf(updateError);
  }

  // The authored WhatsApp variant no longer matches the edited draft — drop it
  // so the tone toggle falls back to deterministic condensation (Phase 8
  // regenerates real variants).
  const { error: variantError } = await sb
    .from("narratives")
    .update({ whatsapp_variant: null })
    .eq("id", narrativeId);
  throwIf(variantError);

  await captureEditDiff({
    narrativeId,
    clientId: n.client_id,
    before,
    after,
  });
}

export async function markReviewed(narrativeId: string): Promise<void> {
  const { error } = await (
    await getSupabase()
  )
    .from("narratives")
    .update({ status: "reviewed", reviewed_at: nowIso() })
    .eq("id", narrativeId)
    .eq("status", "drafted");
  throwIf(error);
}

/** Unreview: reviewed → drafted, reopening the edit (and voice-capture)
 *  window. Sent narratives are immutable — the client received them. */
export async function unreviewNarrative(narrativeId: string): Promise<void> {
  const { error } = await (
    await getSupabase()
  )
    .from("narratives")
    .update({ status: "drafted", reviewed_at: null })
    .eq("id", narrativeId)
    .eq("status", "reviewed");
  throwIf(error);
}

/** Send: reviewed → sent, and pin to the client Timeline. If the narrative
 *  already has a timeline entry (all seeded ones do), only its date refreshes;
 *  otherwise a new pinned entry is inserted. */
export async function sendNarrative(narrativeId: string): Promise<void> {
  const sb = await getSupabase();
  const { data: n, error } = await sb
    .from("narratives")
    .select("*")
    .eq("id", narrativeId)
    .maybeSingle();
  throwIf(error);
  if (!n) throw new Error("Narrative not found.");
  if (n.status !== "reviewed")
    throw new Error("A narrative must be reviewed before it can be sent.");

  const sentAt = nowIso();
  const { error: sendError } = await sb
    .from("narratives")
    .update({ status: "sent", sent_at: sentAt })
    .eq("id", narrativeId);
  throwIf(sendError);

  const { data: existing, error: findError } = await sb
    .from("timeline_entries")
    .select("id")
    .eq("ref_id", narrativeId)
    .maybeSingle();
  throwIf(findError);

  if (existing) {
    const { error: touchError } = await sb
      .from("timeline_entries")
      .update({ date: sentAt.slice(0, 10) })
      .eq("id", existing.id);
    throwIf(touchError);
  } else {
    const week = PeriodSchema.parse(n.week);
    const { error: insertError } = await sb.from("timeline_entries").insert({
      id: crypto.randomUUID(),
      client_id: n.client_id,
      type: "commentary",
      date: sentAt.slice(0, 10),
      summary: `Sent weekly commentary — ${week.label ?? week.start}`,
      snapshot_id: n.snapshot_id,
      ref_id: narrativeId,
    });
    throwIf(insertError);
  }
}

// --- Answer Desk (Phase 5) ----------------------------------------------------------

export async function getThreadsForClient(
  clientId: string,
): Promise<AnswerThread[]> {
  const { data, error } = await (
    await getSupabase()
  )
    .from("answer_threads")
    .select("*")
    .eq("client_id", clientId)
    .order("created_at", { ascending: true });
  throwIf(error);
  return (data ?? []).map(mapThread);
}

/** The client's freshest snapshot — the "through" date for grounding. */
export async function getLatestSnapshot(
  clientId: string,
): Promise<EvidenceSnapshot | undefined> {
  const sb = await getSupabase();
  const { data, error } = await sb
    .from("evidence_snapshots")
    .select("id")
    .eq("client_id", clientId)
    .order("as_of", { ascending: false })
    .limit(1)
    .maybeSingle();
  throwIf(error);
  if (!data) return undefined;
  return (await getSnapshotsByIds([data.id]))[data.id];
}

/** Persist a grounded answer to the client Timeline (type: answer). Misses go
 *  to the thread only — an "I can't answer that" is not client history. */
async function pinAnswerToTimeline(
  clientId: string,
  threadId: string,
  question: string,
  answer: Answer,
): Promise<void> {
  if (!answer.grounded) return;
  const { error } = await (
    await getSupabase()
  )
    .from("timeline_entries")
    .insert({
      id: crypto.randomUUID(),
      client_id: clientId,
      type: "answer",
      date: nowIso().slice(0, 10),
      summary: `Answered: "${question.length > 80 ? `${question.slice(0, 77)}…` : question}"`,
      body: `Q: "${question}" — A: ${answer.text}`,
      snapshot_id: answer.evidenceRefs[0]?.snapshotId ?? null,
      ref_id: threadId,
    });
  throwIf(error);
}

/** Ask a new question: creates the thread with its (mock-engine) answer. */
export async function askQuestion(
  clientId: string,
  question: string,
  answer: Answer,
): Promise<void> {
  const id = crypto.randomUUID();
  const { error } = await (await getSupabase()).from("answer_threads").insert({
    id,
    client_id: clientId,
    question,
    created_at: nowIso(),
    answer,
  });
  throwIf(error);
  await pinAnswerToTimeline(clientId, id, question, answer);
}

/** Answer an existing (waiting) thread — the Today "Waiting on you" flow. */
export async function answerThread(
  threadId: string,
  answer: Answer,
): Promise<void> {
  const sb = await getSupabase();
  const { data: t, error } = await sb
    .from("answer_threads")
    .select("*")
    .eq("id", threadId)
    .maybeSingle();
  throwIf(error);
  if (!t) throw new Error("Thread not found.");
  const { error: updateError } = await sb
    .from("answer_threads")
    .update({ answer })
    .eq("id", threadId);
  throwIf(updateError);
  await pinAnswerToTimeline(t.client_id, threadId, t.question, answer);
}

// --- Daily rows + flag raising (Phase 7.5a) -------------------------------------------

const DAILY_METRIC_COLUMNS = [
  "spend",
  "sales",
  "revenue",
  "roas",
  "cpa_cpo",
  "nc_roas",
  "ncac",
  "nvp",
] as const;

function mapDailyRow(r: any): DailyRow {
  const metrics: Record<string, number | undefined> = {};
  for (const col of DAILY_METRIC_COLUMNS) {
    metrics[col] =
      r[col] === null || r[col] === undefined ? undefined : num(r[col]);
  }
  return DailyRowSchema.parse({
    id: r.id,
    clientId: r.client_id,
    date: r.date,
    segment: r.segment,
    source: r.source,
    sourceOfTruth: opt(r.source_of_truth),
    metrics,
    unavailable: r.unavailable ?? {},
    status: r.status,
    edited: r.edited,
    overrideReason: opt(r.override_reason),
    confirmedAt: opt(r.confirmed_at),
    compiledAt: r.compiled_at,
  });
}

/** Stage a compiled row. Re-compiling the same day replaces a still-staged row
 *  but NEVER overwrites one a human already confirmed. */
export async function upsertStagedRow(input: {
  clientId: string;
  date: string;
  segment: MetricSegment;
  source: "Google Ads" | "Tracker";
  sourceOfTruth?: string;
  metrics: DailyMetrics;
  unavailable: Record<string, string>;
}): Promise<void> {
  const sb = await getSupabase();
  const { data: found, error: findError } = await sb
    .from("daily_rows")
    .select("id, status")
    .eq("client_id", input.clientId)
    .eq("date", input.date)
    .eq("segment", input.segment)
    .maybeSingle();
  throwIf(findError);
  const existing = found as { id: string; status: string } | null;
  if (existing?.status === "confirmed") return; // a human's word stands

  const row = {
    id: existing?.id ?? crypto.randomUUID(),
    client_id: input.clientId,
    date: input.date,
    segment: input.segment,
    source: input.source,
    source_of_truth: input.sourceOfTruth ?? null,
    ...Object.fromEntries(
      DAILY_METRIC_COLUMNS.map((c) => [c, input.metrics[c] ?? null]),
    ),
    unavailable: input.unavailable,
    status: "staged" as const,
    compiled_at: nowIso(),
  };
  const { error } = await sb.from("daily_rows").upsert(row);
  throwIf(error);
}

export type DailyRowWithClient = { row: DailyRow; client: ClientProfile };

/** The morning queue: the most recent compiled day per client. */
export async function getLatestDailyRows(): Promise<DailyRowWithClient[]> {
  const sb = await getSupabase();
  const clients = await getClients();
  const { data, error } = await sb
    .from("daily_rows")
    .select("*")
    .eq("segment", "overall")
    .order("date", { ascending: false });
  throwIf(error);

  const seen = new Set<string>();
  const out: DailyRowWithClient[] = [];
  for (const raw of data ?? []) {
    if (seen.has(raw.client_id)) continue;
    const client = clients.find((c) => c.id === raw.client_id);
    if (!client) continue;
    seen.add(raw.client_id);
    out.push({ row: mapDailyRow(raw), client });
  }
  return out;
}

/** Recent daily rows for one client — powers the Numbers tab window. */
export async function getDailyRowsForClient(
  clientId: string,
  windowDays: number,
): Promise<DailyRow[]> {
  const { data, error } = await (
    await getSupabase()
  )
    .from("daily_rows")
    .select("*")
    .eq("client_id", clientId)
    .order("date", { ascending: false })
    .limit(windowDays * 3); // room for all segments
  throwIf(error);
  return (data ?? []).map(mapDailyRow).reverse();
}

/** Confirm = review: one action approves the numbers AND signs off the day.
 *  An edit must carry a reason (enforced here, in zod, and by a DB CHECK). */
export async function confirmDailyRow(input: {
  rowId: string;
  metrics?: DailyMetrics;
  overrideReason?: string;
}): Promise<void> {
  const edited = Boolean(input.metrics);
  const reason = input.overrideReason?.trim();
  if (edited && !reason) {
    throw new Error("Changing a pulled number requires a reason.");
  }
  const metricPatch = input.metrics
    ? Object.fromEntries(
        DAILY_METRIC_COLUMNS.map((c) => [c, input.metrics?.[c] ?? null]),
      )
    : {};
  const { error } = await (
    await getSupabase()
  )
    .from("daily_rows")
    .update({
      ...metricPatch,
      status: "confirmed",
      confirmed_at: nowIso(),
      confirmed_by: config.voice.demoBuyerKey,
      edited,
      override_reason: reason ?? null,
    })
    .eq("id", input.rowId);
  throwIf(error);
}

/** Retract engine-raised flags for this client+date whose condition no longer
 *  holds — the number moved back inside its threshold, so the flag is stale.
 *
 *  Scoped deliberately:
 *   · only flags carrying a `dedupe_key` (i.e. the engine raised them). Seeded
 *     and human-authored flags are never touched — the engine didn't create
 *     them and has no standing to judge them.
 *   · only the date being compiled. Yesterday's genuine flag stays yesterday's.
 *   · only `open` ones. A human dismissal already carries a reason and stands.
 *
 *  Resolving is NOT dismissing: no reason is required, because nobody made a
 *  judgement — the data simply changed. */
export async function resolveStaleFlags(input: {
  clientId: string;
  /** Every condition the engine still detects. Anything open and absent from
   *  this list no longer holds and is retracted. */
  activeKeys: string[];
}): Promise<number> {
  const sb = await getSupabase();
  const { data, error } = await sb
    .from("flags")
    .select("id, dedupe_key")
    .eq("client_id", input.clientId)
    .eq("status", "open")
    .not("dedupe_key", "is", null);
  throwIf(error);

  // Every open engine flag for this client, not just ones raised today. The old
  // version filtered on a date suffix in the key, so yesterday's flag could
  // never be retracted — it and the dated dedupe key defeated each other, and
  // nothing ever left the queue.
  //
  // Seeded flags carry no dedupe_key and are excluded by the query above, so a
  // hand-authored flag is never retracted by the engine. Neither is a dismissal:
  // `status = 'open'` skips both dismissed and already-resolved rows.
  const active = new Set(input.activeKeys);
  const stale = (data ?? [])
    .filter((f) => !active.has(f.dedupe_key!))
    .map((f) => f.id);
  if (stale.length === 0) return 0;

  const { error: updateError } = await sb
    .from("flags")
    .update({ status: "resolved", resolved_at: nowIso() })
    .in("id", stale);
  throwIf(updateError);
  return stale.length;
}

/** Insert detected flags, skipping any whose dedupe key already exists — the
 *  same drift must not re-raise every morning. */
export async function raiseFlags(
  detected: {
    clientId: string;
    metricKey: string;
    metricLabel: string;
    deltaLabel: string;
    headline: string;
    diagnostic: string;
    dedupeKey: string;
    createdAt: string;
  }[],
): Promise<number> {
  if (detected.length === 0) return 0;
  const sb = await getSupabase();
  const keys = detected.map((d) => d.dedupeKey);
  const { data: existing, error } = await sb
    .from("flags")
    .select("id, dedupe_key, status")
    .in("dedupe_key", keys);
  throwIf(error);

  const byKey = new Map(
    (existing ?? []).map((r) => [r.dedupe_key as string, r] as const),
  );

  const toInsert: typeof detected = [];
  const toReopen: { id: string; detected: (typeof detected)[number] }[] = [];

  for (const d of detected) {
    const row = byKey.get(d.dedupeKey);
    if (!row) {
      toInsert.push(d);
      continue;
    }
    // Already showing — leave it be rather than churning the row.
    if (row.status === "open") continue;
    // A human said "don't bother me about this" and gave a reason. Respect it.
    if (row.status === "dismissed") continue;
    // Previously RESOLVED but the condition is back: re-open it, and refresh
    // the wording, because the numbers behind it have moved since.
    toReopen.push({ id: row.id, detected: d });
  }

  if (toInsert.length > 0) {
    const { error: insertError } = await sb.from("flags").insert(
      toInsert.map((d) => ({
        id: crypto.randomUUID(),
        client_id: d.clientId,
        kind: "anomaly",
        metric_key: d.metricKey,
        metric_label: d.metricLabel,
        delta_label: d.deltaLabel,
        headline: d.headline,
        diagnostic: d.diagnostic,
        status: "open",
        created_at: d.createdAt,
        dedupe_key: d.dedupeKey,
      })),
    );
    throwIf(insertError);
  }

  for (const { id, detected: d } of toReopen) {
    const { error: reopenError } = await sb
      .from("flags")
      .update({
        status: "open",
        resolved_at: null,
        metric_label: d.metricLabel,
        delta_label: d.deltaLabel,
        headline: d.headline,
        diagnostic: d.diagnostic,
      })
      .eq("id", id);
    throwIf(reopenError);
  }

  return toInsert.length + toReopen.length;
}

// --- Library (Phase 6) --------------------------------------------------------------

export type LibraryArtifactType = "commentary" | "answer" | "loom_brief";

export type LibraryArtifact = {
  id: string;
  clientId: string;
  clientName: string;
  type: LibraryArtifactType;
  date: string; // ISO date (YYYY-MM-DD)
  title: string;
  firstLine: string;
  body: string; // full searchable text
  /** Lifecycle state for commentary — so "not sent yet" is never ambiguous
   *  in the archive. Answers and briefs have no send lifecycle. */
  status?: NarrativeStatus;
  snapshotId?: string;
  href: string; // canonical live view
};

const dateOnly = (iso: string) => iso.slice(0, 10);

/** Cross-client archive of communications: commentary (narratives), grounded
 *  answers, and Loom briefs. Misses are excluded — an "I can't answer that" is
 *  not a client artifact (consistent with Timeline pinning). Volume is small;
 *  filtering/search happen client-side over this list. */
export async function getLibraryArtifacts(): Promise<LibraryArtifact[]> {
  const sb = await getSupabase();
  const [clients, narratives, claims, threads, briefs, headlines] =
    await Promise.all([
      sb.from("clients").select("id, name"),
      sb.from("narratives").select("*"),
      sb.from("claims").select("*"),
      sb.from("answer_threads").select("*").not("answer", "is", null),
      sb.from("loom_briefs").select("*"),
      sb.from("loom_headlines").select("*"),
    ]);
  [clients, narratives, claims, threads, briefs, headlines].forEach((r) =>
    throwIf(r.error),
  );
  const nameOf = new Map(
    (clients.data ?? []).map((c) => [c.id, c.name] as const),
  );
  const out: LibraryArtifact[] = [];

  // Commentary — narratives (any status)
  for (const n of narratives.data ?? []) {
    const week = PeriodSchema.parse(n.week);
    const ownClaims = (claims.data ?? [])
      .filter((c) => c.narrative_id === n.id)
      .sort((a, b) => a.ord - b.ord);
    out.push({
      id: n.id,
      clientId: n.client_id,
      clientName: nameOf.get(n.client_id) ?? "Unknown client",
      type: "commentary",
      date: dateOnly(n.sent_at ?? n.reviewed_at ?? `${week.end}T00:00:00Z`),
      title: `Weekly commentary · ${week.label}`,
      firstLine: ownClaims[0]?.text ?? "",
      body: ownClaims.map((c) => c.text).join("\n"),
      status: n.status as NarrativeStatus,
      snapshotId: n.snapshot_id,
      href: `/clients/${n.client_id}/narratives/${n.id}`,
    });
  }

  // Answers — grounded only
  for (const t of threads.data ?? []) {
    const answer = AnswerSchema.parse(t.answer);
    if (!answer.grounded) continue;
    out.push({
      id: t.id,
      clientId: t.client_id,
      clientName: nameOf.get(t.client_id) ?? "Unknown client",
      type: "answer",
      date: dateOnly(t.created_at),
      title: t.question,
      firstLine: answer.text,
      body: `${t.question}\n${answer.text}`,
      snapshotId: answer.evidenceRefs[0]?.snapshotId,
      href: `/answer-desk?client=${t.client_id}`,
    });
  }

  // Loom briefs
  for (const b of briefs.data ?? []) {
    const week = PeriodSchema.parse(b.week);
    const ownHeadlines = (headlines.data ?? [])
      .filter((h) => h.brief_id === b.id)
      .sort((a, b2) => a.ord - b2.ord);
    out.push({
      id: b.id,
      clientId: b.client_id,
      clientName: nameOf.get(b.client_id) ?? "Unknown client",
      type: "loom_brief",
      date: dateOnly(b.created_at),
      title: `Loom brief · ${week.label}`,
      firstLine: ownHeadlines[0]?.text ?? "",
      body: [...ownHeadlines.map((h) => h.text), b.risk, b.win].join("\n"),
      snapshotId: b.snapshot_id,
      href: `/clients/${b.client_id}/narratives/${b.narrative_id}/loom`,
    });
  }

  return out.sort((a, b) => b.date.localeCompare(a.date));
}

// --- Loom Brief (Phase 4) -----------------------------------------------------------

function mapLoomBrief(r: any, headlines: any[]): LoomBrief {
  return LoomBriefSchema.parse({
    id: r.id,
    clientId: r.client_id,
    narrativeId: r.narrative_id,
    snapshotId: r.snapshot_id,
    week: PeriodSchema.parse(r.week),
    risk: r.risk,
    win: r.win,
    headlines: headlines
      .sort((a, b) => a.ord - b.ord)
      .map((h) => ({
        id: h.id,
        briefId: h.brief_id,
        order: h.ord,
        text: h.text,
        evidenceRefs: h.evidence_refs,
      })),
  });
}

export type LoomBriefContext = {
  brief: LoomBrief;
  narrative: Narrative;
  snapshot: EvidenceSnapshot;
  profile: ClientProfile;
};

export async function getLoomBriefContext(
  narrativeId: string,
): Promise<LoomBriefContext | undefined> {
  const sb = await getSupabase();
  const { data: b, error } = await sb
    .from("loom_briefs")
    .select("*")
    .eq("narrative_id", narrativeId)
    .maybeSingle();
  throwIf(error);
  if (!b) return undefined;
  const [headlines, narrativeContext] = await Promise.all([
    sb.from("loom_headlines").select("*").eq("brief_id", b.id),
    getNarrativeContext(narrativeId),
  ]);
  throwIf(headlines.error);
  if (!narrativeContext) return undefined;
  return {
    brief: mapLoomBrief(b, headlines.data ?? []),
    narrative: narrativeContext.narrative,
    snapshot: narrativeContext.snapshot,
    profile: narrativeContext.profile,
  };
}

/** Narrative ids that have a Loom brief, for this client — drives the
 *  secondary artifact link on the Narratives tab. */
export async function getLoomNarrativeIds(clientId: string): Promise<string[]> {
  const { data, error } = await (
    await getSupabase()
  )
    .from("loom_briefs")
    .select("narrative_id")
    .eq("client_id", clientId);
  throwIf(error);
  return (data ?? []).map((r) => r.narrative_id);
}

/** Edit one headline's text — independent of the narrative's claims by design
 *  (video may want different emphasis than text). Evidence refs are fixed. */
export async function updateLoomHeadline(
  id: string,
  text: string,
): Promise<void> {
  const trimmed = text.trim();
  if (!trimmed) throw new Error("Headline text is required.");
  const { error } = await (
    await getSupabase()
  )
    .from("loom_headlines")
    .update({ text: trimmed })
    .eq("id", id);
  throwIf(error);
}

/** Edit the brief's risk or win line. One sentence each — a brief with a risk
 *  paragraph is a narrative again. */
export async function updateLoomLine(
  briefId: string,
  field: "risk" | "win",
  text: string,
): Promise<void> {
  const trimmed = text.trim();
  if (!trimmed) throw new Error("The line is required.");
  const patch = field === "risk" ? { risk: trimmed } : { win: trimmed };
  const { error } = await (
    await getSupabase()
  )
    .from("loom_briefs")
    .update(patch)
    .eq("id", briefId);
  throwIf(error);
}

// --- Profile mutations (Phase 2) ---------------------------------------------------

export async function updateKpi(
  id: string,
  patch: { label: string; target: number; polarity: Kpi["polarity"] },
): Promise<void> {
  const { error } = await (
    await getSupabase()
  )
    .from("kpis")
    .update({
      label: patch.label,
      target: patch.target,
      polarity: patch.polarity,
    })
    .eq("id", id);
  throwIf(error);
}

export async function addKpi(kpi: {
  clientId: string;
  label: string;
  mapsTo: Kpi["mapsTo"];
  target: number;
  polarity: Kpi["polarity"];
  format: Kpi["format"];
}): Promise<void> {
  const { error } = await (await getSupabase()).from("kpis").insert({
    id: crypto.randomUUID(),
    client_id: kpi.clientId,
    label: kpi.label,
    maps_to: kpi.mapsTo,
    target: kpi.target,
    polarity: kpi.polarity,
    format: kpi.format,
  });
  throwIf(error);
}

export async function deleteKpi(id: string): Promise<void> {
  const { error } = await (
    await getSupabase()
  )
    .from("kpis")
    .delete()
    .eq("id", id);
  throwIf(error);
}

/** Insert or update a sensitivity — always a structured object (type + text). */
export async function saveSensitivity(s: {
  id?: string;
  clientId: string;
  type: Sensitivity["type"];
  text: string;
}): Promise<void> {
  const sb = await getSupabase();
  if (s.id) {
    const { error } = await sb
      .from("sensitivities")
      .update({ type: s.type, text: s.text })
      .eq("id", s.id);
    throwIf(error);
  } else {
    const { error } = await sb.from("sensitivities").insert({
      id: crypto.randomUUID(),
      client_id: s.clientId,
      type: s.type,
      text: s.text,
    });
    throwIf(error);
  }
}

export async function deleteSensitivity(id: string): Promise<void> {
  const { error } = await (
    await getSupabase()
  )
    .from("sensitivities")
    .delete()
    .eq("id", id);
  throwIf(error);
}

export async function updateComms(
  clientId: string,
  patch: {
    cadencePrimary: "weekly" | "weekly-lite" | "monthly";
    channel: "whatsapp" | "email";
  },
): Promise<void> {
  const sb = await getSupabase();
  // Merge into the cadence jsonb rather than replacing it (keeps secondary/note).
  const { data, error } = await sb
    .from("clients")
    .select("cadence")
    .eq("id", clientId)
    .single();
  throwIf(error);
  const cadence = {
    ...(data!.cadence as object),
    primary: patch.cadencePrimary,
  };
  const { error: updateError } = await sb
    .from("clients")
    .update({ cadence, channel: patch.channel })
    .eq("id", clientId);
  throwIf(updateError);
}

export async function saveStakeholder(s: {
  id?: string;
  clientId: string;
  name: string;
  role: string;
  gets: Stakeholder["gets"];
}): Promise<void> {
  const sb = await getSupabase();
  if (s.id) {
    const { error } = await sb
      .from("stakeholders")
      .update({ name: s.name, role: s.role, gets: s.gets })
      .eq("id", s.id);
    throwIf(error);
  } else {
    const { error } = await sb.from("stakeholders").insert({
      id: crypto.randomUUID(),
      client_id: s.clientId,
      name: s.name,
      role: s.role,
      gets: s.gets,
    });
    throwIf(error);
  }
}

export async function deleteStakeholder(id: string): Promise<void> {
  const { error } = await (
    await getSupabase()
  )
    .from("stakeholders")
    .delete()
    .eq("id", id);
  throwIf(error);
}
