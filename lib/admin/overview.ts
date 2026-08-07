import { addDays, format, parseISO } from "date-fns";
import { now } from "@/lib/clock";
import { getSupabase } from "@/lib/supabase";
import { getClients, getLatestDailyRows, getOpenFlags } from "@/lib/data";
import { buildDigest } from "@/lib/daily/digest";
import {
  DEFAULT_ANCHOR_TIME,
  ProfileSchema,
  type ClientProfile,
  type Profile,
} from "@/lib/types";
import type { DigestProblem } from "@/components/relay/DailyDigestBand";

/* What the admin oversees.
 *
 * The admin carries no clients of their own, so every question here is about
 * OTHER people's work: is anybody covering this client, did the update go out,
 * and is anything rotting quietly. All three are invisible from the admin's own
 * Today, which is the reason this page exists.
 *
 * TIMEZONES, WITHOUT AN OFFSET LIBRARY. "Late" is a claim about the client's
 * local clock: a Dubai client's Monday 09:00 passes five hours before a London
 * one's. Rather than convert instants, both sides are rendered as sortable
 * local strings — "2026-08-07 14:32" — and compared as text. The format is
 * lexicographically ordered, so string comparison IS chronological comparison
 * within a zone. Same trick as lib/demo/calendar.ts, and it needs no
 * date-fns-tz. */

export type DeliveryState =
  /** Went out. */
  | "sent"
  /** Scheduled, deadline still ahead. */
  | "due"
  /** Deadline passed with nothing sent. */
  | "late"
  /** No anchor day on the cadence — nothing to be late against. */
  | "unscheduled";

export type DeliveryRow = {
  client: ClientProfile;
  buyers: Profile[];
  state: DeliveryState;
  /** "Monday 09:00" — the agreed moment, in the client's own timezone. */
  dueLabel: string;
  /** The deadline as a local wall-clock string, for sorting the late ones. */
  dueLocal?: string;
  sentAt?: string;
};

export type Overview = {
  delivery: DeliveryRow[];
  /** Nobody assigned. Invisible to every buyer, so nobody is working on it. */
  uncovered: ClientProfile[];
  coverage: { buyer: Profile; clients: ClientProfile[] }[];
  risk: {
    /** Yesterday's row exists but nobody has confirmed it. */
    unconfirmed: { client: ClientProfile; date: string }[];
    /** No usable row at all, and why. */
    trackerProblems: { client: ClientProfile; problem: DigestProblem }[];
    openFlags: number;
  };
};

const DAY_INDEX = { mon: 0, tue: 1, wed: 2, thu: 3, fri: 4, sat: 5, sun: 6 };
const DAY_NAME = {
  mon: "Monday",
  tue: "Tuesday",
  wed: "Wednesday",
  thu: "Thursday",
  fri: "Friday",
  sat: "Saturday",
  sun: "Sunday",
};

/** "YYYY-MM-DD HH:mm" right now, on the given zone's wall clock. `sv-SE` is
 *  chosen for its format, not its language: it is the one common locale that
 *  formats as ISO, which is what makes the strings sortable. */
export function localNowIn(timeZone: string, at: Date = now()): string {
  const parts = new Intl.DateTimeFormat("sv-SE", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(at);
  const get = (type: string) => parts.find((p) => p.type === type)!.value;
  return `${get("year")}-${get("month")}-${get("day")} ${get("hour")}:${get("minute")}`;
}

/** The deadline for the CURRENT week, as a local wall-clock string in the
 *  client's zone. Weeks start Monday, matching the agency's Monday cadence. */
export function deadlineFor(
  client: ClientProfile,
  at: Date = now(),
): { local: string; label: string } | null {
  const day = client.cadence.anchorDay;
  if (!day) return null;

  const time = client.cadence.anchorTime ?? DEFAULT_ANCHOR_TIME;
  const today = localNowIn(client.accountTimezone, at).slice(0, 10);
  const parsed = parseISO(today);
  const mondayOffset = (parsed.getDay() + 6) % 7; // Monday = 0
  const monday = addDays(parsed, -mondayOffset);
  const date = format(addDays(monday, DAY_INDEX[day]), "yyyy-MM-dd");

  return { local: `${date} ${time}`, label: `${DAY_NAME[day]} ${time}` };
}

export async function getOverview(at: Date = now()): Promise<Overview> {
  const sb = await getSupabase();

  const [clients, dailyRows, flags, profileRows, assignmentRows, narratives] =
    await Promise.all([
      getClients(),
      getLatestDailyRows(),
      getOpenFlags(),
      sb.from("profiles").select("*").eq("status", "active").order("name"),
      sb.from("client_assignments").select("client_id, buyer_id"),
      sb.from("narratives").select("client_id, week, status, sent_at"),
    ]);

  const buyers: Profile[] = (profileRows.data ?? []).flatMap((r) => {
    const parsed = ProfileSchema.safeParse({
      id: r.id,
      email: r.email,
      name: r.name,
      role: r.role,
      status: r.status,
    });
    // The admin only oversees, so they are not coverage.
    return parsed.success && parsed.data.role === "buyer" ? [parsed.data] : [];
  });
  const buyerById = new Map(buyers.map((b) => [b.id, b]));

  const buyersOf = new Map<string, Profile[]>();
  const clientsOf = new Map<string, ClientProfile[]>();
  const clientById = new Map(clients.map((c) => [c.id, c]));
  const push = <T,>(map: Map<string, T[]>, key: string, value: T) => {
    const list = map.get(key);
    if (list) list.push(value);
    else map.set(key, [value]);
  };
  for (const a of assignmentRows.data ?? []) {
    const buyer = buyerById.get(a.buyer_id);
    const client = clientById.get(a.client_id);
    // A revoked buyer's assignment rows survive them, and must not read as
    // coverage — the profile is kept for the audit trail, not for the roster.
    if (!buyer || !client) continue;
    push(buyersOf, a.client_id, buyer);
    push(clientsOf, a.buyer_id, client);
  }

  /* --- Delivery ---------------------------------------------------------- */

  const delivery: DeliveryRow[] = clients.map((client) => {
    const assigned = buyersOf.get(client.id) ?? [];
    const deadline = deadlineFor(client, at);
    if (!deadline) {
      return {
        client,
        buyers: assigned,
        state: "unscheduled",
        dueLabel: "No send day set",
      };
    }

    /* Sent for THIS week, judged by the week the narrative covers rather than
       when it was sent — an update posted late on Tuesday for Monday's week is
       still that week's update. */
    const weekStart = deadline.local.slice(0, 10);
    const mondayOfWeek = format(
      addDays(parseISO(weekStart), -((parseISO(weekStart).getDay() + 6) % 7)),
      "yyyy-MM-dd",
    );
    const sent = (narratives.data ?? []).find((n) => {
      if (n.client_id !== client.id || n.status !== "sent") return false;
      const week = n.week as { start?: string } | null;
      return week?.start === mondayOfWeek;
    });

    if (sent) {
      return {
        client,
        buyers: assigned,
        state: "sent",
        dueLabel: deadline.label,
        dueLocal: deadline.local,
        sentAt: (sent.sent_at as string | null) ?? undefined,
      };
    }

    const passed = localNowIn(client.accountTimezone, at) >= deadline.local;
    return {
      client,
      buyers: assigned,
      state: passed ? "late" : "due",
      dueLabel: deadline.label,
      dueLocal: deadline.local,
    };
  });

  // Worst first — late is the only state that needs someone to act today.
  const ORDER: Record<DeliveryState, number> = {
    late: 0,
    due: 1,
    unscheduled: 2,
    sent: 3,
  };
  delivery.sort(
    (a, b) =>
      ORDER[a.state] - ORDER[b.state] ||
      (a.dueLocal ?? "").localeCompare(b.dueLocal ?? "") ||
      a.client.name.localeCompare(b.client.name),
  );

  /* --- Risk -------------------------------------------------------------- */

  const digest = buildDigest(clients, dailyRows);
  const trackerProblems = digest.flatMap((e) =>
    e.problem
      ? [{ client: clientById.get(e.client.id)!, problem: e.problem }]
      : [],
  );
  const unconfirmed = digest.flatMap((e) =>
    e.row && e.row.status !== "confirmed"
      ? [{ client: clientById.get(e.client.id)!, date: e.row.date }]
      : [],
  );

  return {
    delivery,
    uncovered: clients.filter((c) => (buyersOf.get(c.id) ?? []).length === 0),
    coverage: buyers.map((b) => ({
      buyer: b,
      clients: clientsOf.get(b.id) ?? [],
    })),
    risk: { unconfirmed, trackerProblems, openFlags: flags.length },
  };
}
