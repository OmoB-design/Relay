import { z } from "zod";
import type { TrackerRow } from "@/lib/ingestion/types";

/* ============================================================================
   Triple Whale connector (Layer C).

   Same contract as the Google Ads connector: turn a shop's daily metrics into
   the pipeline's TrackerRow shape so nothing downstream learns the source.
   Triple Whale is the one source that carries NEW-CUSTOMER truth — nc_roas,
   ncac, nvp — which the tracker only relays and Google Ads cannot see.

   Auth: TRIPLE_WHALE_API_KEY (x-api-key header), shop scoped per client via
   clients.triple_whale_shop. The metric-id map below is the ONE place to
   adjust when the live key lands and verify-triple-whale can interrogate the
   real account — ids are per Triple Whale's summary metrics vocabulary.
   ========================================================================== */

const TW_API = "https://api.triplewhale.com/api/v2";

export function hasTripleWhaleCredentials(): boolean {
  return Boolean(process.env.TRIPLE_WHALE_API_KEY);
}

/** Triple Whale metric id → Relay metric key. One table, adjusted against
 *  the live account's vocabulary when the key arrives. */
const METRIC_MAP: Record<string, keyof TrackerRow["metrics"]> = {
  blendedSpend: "spend",
  orders: "conversions",
  totalSales: "revenue",
  blendedRoas: "roas",
  cpa: "cpa_cpo",
  newCustomerRoas: "nc_roas",
  newCustomerCpa: "ncac",
  newVisitorPercentage: "nvp",
};

const MetricsDataSchema = z.object({
  data: z
    .array(
      z.object({
        id: z.string(),
        values: z.array(z.object({ date: z.string(), value: z.number().nullable() })),
      }),
    )
    .optional(),
});

async function twFetch(path: string, body: unknown): Promise<unknown> {
  const res = await fetch(`${TW_API}/${path}`, {
    method: "POST",
    headers: {
      "x-api-key": process.env.TRIPLE_WHALE_API_KEY!,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = (await res.text()).slice(0, 300);
    throw new Error(`Triple Whale API ${res.status}: ${text}`);
  }
  return res.json();
}

/** One shop's daily metrics, date-ascending, in the pipeline's shape. */
export async function fetchDailyRows(
  shop: string,
  startDate: string,
  endDate: string,
): Promise<TrackerRow[]> {
  const json = await twFetch("tw-metrics/metrics-data", {
    shopDomain: shop,
    metrics: Object.keys(METRIC_MAP),
    startDate,
    endDate,
    granularity: "day",
  });
  const parsed = MetricsDataSchema.parse(json);

  const byDate = new Map<string, TrackerRow["metrics"]>();
  for (const series of parsed.data ?? []) {
    const key = METRIC_MAP[series.id];
    if (!key) continue;
    for (const point of series.values) {
      const date = point.date.slice(0, 10);
      if (point.value === null) continue;
      const row = byDate.get(date) ?? {};
      row[key] = point.value;
      byDate.set(date, row);
    }
  }

  return Array.from(byDate.entries())
    .map(([date, metrics]) => ({ date, metrics }))
    .sort((a, b) => (a.date < b.date ? -1 : 1));
}
