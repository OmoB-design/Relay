import { addDays, format, parseISO } from "date-fns";
import { now } from "@/lib/clock";
import { getSupabase } from "@/lib/supabase";
import { getClients } from "@/lib/data";
import { yesterdayFor } from "@/lib/daily/compile";
import { latestYesterdayAcross } from "@/lib/demo/calendar";
import { ProfileSchema, type ClientProfile, type Profile } from "@/lib/types";

/* The accountability view: who logged, on which day, and did anyone check it.
 *
 * The buyers' record lives in the tracker workbook — that is deliberate and it
 * is not changing. Relay compiles a row from it each morning and the buyer
 * CONFIRMS: one judgement, one action, their name against it. This grid is the
 * admin's read of that, a fortnight at a time.
 *
 * A DAY IS NOT THE SAME MOMENT FOR EVERY CLIENT. A Dubai account's yesterday
 * ends four hours before a London one's, so the newest column is "due" for some
 * clients and not yet for others. Marking the not-yet-due as missing would
 * accuse a buyer of being late for a day that has not finished, which is the
 * fastest way to make a dashboard nobody believes. `notDue` exists for that. */

export type LogState =
  /** Compiled and attested by a named person. */
  | "confirmed"
  /** Relay compiled a row; nobody has confirmed it. */
  | "staged"
  /** The day is over for this client and there is no usable row. */
  | "missing"
  /** The day has not ended in this client's timezone yet. */
  | "notDue";

export type LogCell = {
  date: string;
  state: LogState;
  /** Who attested. Absent on rows confirmed before migration 0015 named them. */
  by?: string;
  /** The buyer changed a pulled number — always with a written reason. */
  edited?: boolean;
};

export type LogRow = {
  client: ClientProfile;
  cells: LogCell[];
  confirmed: number;
  /** Days that are over and have nothing to show for them. */
  missing: number;
  /** Every day that has ENDED for this client — the denominator.
   *
   *  Not `confirmed + missing`: a compiled-but-unconfirmed day is neither, and
   *  leaving it out made a client with a fortnight of unconfirmed rows read
   *  "0/0", which looks like nothing was ever due rather than like nobody has
   *  confirmed anything. */
  due: number;
};

export type LogGroup = {
  /** Null is the unassigned bucket — clients nobody is accountable for. */
  buyer: Profile | null;
  rows: LogRow[];
};

export type LogOversight = {
  /** Oldest first, so the grid reads left to right like a calendar. */
  days: string[];
  groups: LogGroup[];
};

export const LOG_WINDOW_DAYS = 14;

export async function getLogOversight(
  days = LOG_WINDOW_DAYS,
  at: Date = now(),
): Promise<LogOversight> {
  const sb = await getSupabase();
  const clients = await getClients();

  /* The axis runs to the furthest-ahead client's yesterday, the same bound the
     compile uses. Anything past a given client's own yesterday is notDue. */
  const last = latestYesterdayAcross(
    clients.map((c) => c.accountTimezone),
    at,
  );
  const axis = Array.from({ length: days }, (_, i) =>
    format(addDays(parseISO(last), -(days - 1 - i)), "yyyy-MM-dd"),
  );

  const [rows, profileRows, assignmentRows] = await Promise.all([
    sb
      .from("daily_rows")
      .select("client_id, date, status, confirmed_by, edited")
      .eq("segment", "overall")
      .gte("date", axis[0]!)
      .lte("date", last),
    sb.from("profiles").select("*").eq("status", "active").order("name"),
    sb.from("client_assignments").select("client_id, buyer_id"),
  ]);

  type Raw = { status: string; confirmed_by: string | null; edited: boolean };
  const byClientDate = new Map<string, Raw>();
  for (const r of rows.data ?? []) {
    byClientDate.set(`${r.client_id}|${r.date}`, r);
  }

  const buildRow = (client: ClientProfile): LogRow => {
    const clientYesterday = yesterdayFor(client, at);
    let confirmed = 0;
    let missing = 0;
    let due = 0;
    const cells = axis.map<LogCell>((date) => {
      if (date > clientYesterday) return { date, state: "notDue" };
      due++;
      const r = byClientDate.get(`${client.id}|${date}`);
      if (!r) {
        missing++;
        return { date, state: "missing" };
      }
      if (r.status === "confirmed") {
        confirmed++;
        return {
          date,
          state: "confirmed",
          by: r.confirmed_by ?? undefined,
          edited: r.edited ?? false,
        };
      }
      return { date, state: "staged", edited: r.edited ?? false };
    });
    return { client, cells, confirmed, missing, due };
  };

  const buyers: Profile[] = (profileRows.data ?? []).flatMap((r) => {
    const parsed = ProfileSchema.safeParse({
      id: r.id,
      email: r.email,
      name: r.name,
      role: r.role,
      status: r.status,
    });
    // The admin only oversees — they are not on the accountability grid.
    return parsed.success && parsed.data.role === "buyer" ? [parsed.data] : [];
  });

  const clientById = new Map(clients.map((c) => [c.id, c]));
  const forBuyer = new Map<string, ClientProfile[]>();
  const covered = new Set<string>();
  for (const a of assignmentRows.data ?? []) {
    const client = clientById.get(a.client_id);
    if (!client || !buyers.some((b) => b.id === a.buyer_id)) continue;
    const list = forBuyer.get(a.buyer_id);
    if (list) list.push(client);
    else forBuyer.set(a.buyer_id, [client]);
    covered.add(client.id);
  }

  const groups: LogGroup[] = buyers.map((buyer) => ({
    buyer,
    rows: (forBuyer.get(buyer.id) ?? []).map(buildRow),
  }));

  const orphans = clients.filter((c) => !covered.has(c.id));
  if (orphans.length > 0) {
    // Last, and explicitly labelled. These are the rows where "who isn't
    // logging" has no answer because nobody was ever asked to.
    groups.push({ buyer: null, rows: orphans.map(buildRow) });
  }

  return { days: axis, groups };
}
