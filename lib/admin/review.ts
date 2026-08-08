import { addDays, format, parseISO } from "date-fns";
import { now } from "@/lib/clock";
import { getSupabase } from "@/lib/supabase";
import { getClients } from "@/lib/data";
import { ProfileSchema, type ClientProfile, type Profile } from "@/lib/types";

/* The weekly review: what the buyers logged, against what the platform says.
 *
 * WHAT IS BEING RECONCILED. The tracker workbook is the buyers' record and
 * Relay compiles it into daily rows; Google Ads — or Triple Whale, per client —
 * is the source of truth. The review is where an admin compares the two and
 * says which they believe. Until the connector lands the actuals are typed in;
 * the shape does not change when they stop being.
 *
 * THREE METRICS, NOT EIGHT. spend, sales and revenue are the ones the platform
 * reports directly and the ones a discrepancy actually shows up in; the rest
 * are ratios derived from them, so reconciling those separately would be
 * reconciling the same disagreement three more times. It also has to be typed
 * by a person every week, and a form demanding twenty-four numbers per client
 * is a form nobody fills in.
 *
 * NO FIXED DAY. Nothing here runs on a schedule. A review is an action taken
 * over a chosen week, whenever the admin has time. */

export const RECONCILED = ["spend", "sales", "revenue"] as const;
export type ReconciledMetric = (typeof RECONCILED)[number];

/** Anything further apart than this is worth a human looking. Platform and
 *  sheet disagree slightly as a matter of course — rounding, timezone edges,
 *  late-attributed conversions — so a zero-tolerance comparison would flag
 *  every client every week and mean nothing. */
export const DISCREPANCY_TOLERANCE = 0.005; // 0.5%

export type ReviewStatus = "pending" | "verified" | "discrepancy";

export type MetricPair = {
  metric: ReconciledMetric;
  /** Summed from the daily rows across the week. Undefined = nothing logged. */
  logged?: number;
  /** What the platform says. Undefined until somebody enters it. */
  actual?: number;
  /** actual − logged, as a fraction of logged. Undefined unless both exist. */
  deltaPct?: number;
  /** Outside tolerance, so worth a person's attention. */
  off: boolean;
};

export type ReviewRow = {
  client: ClientProfile;
  buyers: Profile[];
  metrics: MetricPair[];
  status: ReviewStatus;
  note?: string;
  reviewedAt?: string;
  reviewerName?: string;
  /** Days in the week with a confirmed row — the review reads differently when
   *  the buyer only confirmed two of seven. */
  confirmedDays: number;
  loggedDays: number;
};

export type WeekReview = {
  weekStart: string;
  weekEnd: string;
  rows: ReviewRow[];
};

/** Monday-to-Sunday week containing a date. The agency's week starts Monday —
 *  it is the day the client updates go out. */
export function weekRange(date: string): { start: string; end: string } {
  const d = parseISO(date);
  const monday = addDays(d, -((d.getDay() + 6) % 7));
  return {
    start: format(monday, "yyyy-MM-dd"),
    end: format(addDays(monday, 6), "yyyy-MM-dd"),
  };
}

/** The most recent week that has finished. The default to review, because the
 *  current week is still accumulating and reconciling it would be reconciling
 *  a number that is going to change. */
export function lastCompleteWeek(at: Date = now()): {
  start: string;
  end: string;
} {
  const thisWeek = weekRange(format(at, "yyyy-MM-dd"));
  return weekRange(format(addDays(parseISO(thisWeek.start), -7), "yyyy-MM-dd"));
}

function deltaOf(logged?: number, actual?: number) {
  if (logged === undefined || actual === undefined) return undefined;
  if (logged === 0) return actual === 0 ? 0 : undefined; // undefined ÷ 0
  return (actual - logged) / logged;
}

export async function getWeekReview(weekStart: string): Promise<WeekReview> {
  const { start, end } = weekRange(weekStart);
  const sb = await getSupabase();
  const clients = await getClients();

  const [rows, reviews, profileRows, assignmentRows] = await Promise.all([
    sb
      .from("daily_rows")
      .select("client_id, date, status, spend, sales, revenue")
      .eq("segment", "overall")
      .gte("date", start)
      .lte("date", end),
    sb.from("weekly_reviews").select("*").eq("week_start", start),
    sb.from("profiles").select("*").eq("status", "active"),
    sb.from("client_assignments").select("client_id, buyer_id"),
  ]);

  const profileById = new Map(
    (profileRows.data ?? []).flatMap((r) => {
      const parsed = ProfileSchema.safeParse({
        id: r.id,
        email: r.email,
        name: r.name,
        role: r.role,
        status: r.status,
      });
      return parsed.success ? [[r.id, parsed.data] as const] : [];
    }),
  );

  const buyersOf = new Map<string, Profile[]>();
  for (const a of assignmentRows.data ?? []) {
    const p = profileById.get(a.buyer_id);
    if (!p || p.role !== "buyer") continue;
    const list = buyersOf.get(a.client_id);
    if (list) list.push(p);
    else buyersOf.set(a.client_id, [p]);
  }

  const reviewByClient = new Map(
    (reviews.data ?? []).map((r) => [r.client_id, r] as const),
  );

  const reviewRows: ReviewRow[] = clients.map((client) => {
    const mine = (rows.data ?? []).filter((r) => r.client_id === client.id);
    const confirmedDays = mine.filter((r) => r.status === "confirmed").length;

    const stored = reviewByClient.get(client.id);
    const storedActual = (stored?.actual ?? {}) as Record<string, number>;
    /* Logged comes from the stored review once one exists, so a buyer editing a
       daily row afterwards cannot rewrite the numbers the admin signed off. */
    const storedLogged = stored
      ? ((stored.logged ?? {}) as Record<string, number>)
      : undefined;

    const metrics = RECONCILED.map<MetricPair>((metric) => {
      const live = mine.reduce<number | undefined>((sum, r) => {
        const v = r[metric];
        return v === null || v === undefined ? sum : (sum ?? 0) + Number(v);
      }, undefined);
      const logged = storedLogged?.[metric] ?? live;
      const actual = storedActual[metric];
      const deltaPct = deltaOf(logged, actual);
      return {
        metric,
        logged,
        actual,
        deltaPct,
        off: deltaPct !== undefined && Math.abs(deltaPct) > DISCREPANCY_TOLERANCE,
      };
    });

    const reviewer = stored?.reviewer_id
      ? profileById.get(stored.reviewer_id)
      : undefined;

    return {
      client,
      buyers: buyersOf.get(client.id) ?? [],
      metrics,
      status: (stored?.status as ReviewStatus) ?? "pending",
      note: stored?.note ?? undefined,
      reviewedAt: stored?.reviewed_at ?? undefined,
      reviewerName: reviewer ? reviewer.name || reviewer.email : undefined,
      confirmedDays,
      loggedDays: mine.length,
    };
  });

  // Anything needing attention first; reviewed-and-fine last.
  const ORDER: Record<ReviewStatus, number> = {
    discrepancy: 0,
    pending: 1,
    verified: 2,
  };
  reviewRows.sort(
    (a, b) =>
      ORDER[a.status] - ORDER[b.status] ||
      a.client.name.localeCompare(b.client.name),
  );

  return { weekStart: start, weekEnd: end, rows: reviewRows };
}
