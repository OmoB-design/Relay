import { z } from "zod";
import type { TrackerRow } from "@/lib/ingestion/types";

/* ============================================================================
   Google Ads connector (Phase 7.5b).

   A thin REST client — OAuth2 refresh grant + GAQL search — that turns an ad
   account's daily performance into the SAME TrackerRow shape the workbook
   pipeline produces, so everything downstream of the compile (staging, flags,
   digests, the Numbers tab) never learns where a row came from.

   Credentials come from the environment and never leave this module:
   GOOGLE_ADS_CLIENT_ID / _CLIENT_SECRET / _DEVELOPER_TOKEN /
   _LOGIN_CUSTOMER_ID / _REFRESH_TOKEN.

   Metrics: Google Ads reports cost, conversions, and conversion value —
   spend, sales, revenue, and the derived roas / cpa_cpo. New-customer
   metrics (nc_roas, ncac, nvp) are structurally absent here; the compile
   already words that honestly per client.
   ========================================================================== */

const ADS_API = "https://googleads.googleapis.com/v18";

export function hasGoogleAdsCredentials(): boolean {
  return Boolean(
    process.env.GOOGLE_ADS_CLIENT_ID &&
      process.env.GOOGLE_ADS_CLIENT_SECRET &&
      process.env.GOOGLE_ADS_DEVELOPER_TOKEN &&
      process.env.GOOGLE_ADS_REFRESH_TOKEN,
  );
}

let cachedToken: { token: string; expiresAt: number } | null = null;

/** OAuth2 refresh grant, cached until a minute before expiry. */
async function accessToken(): Promise<string> {
  if (cachedToken && Date.now() < cachedToken.expiresAt - 60_000) {
    return cachedToken.token;
  }
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_ADS_CLIENT_ID!,
      client_secret: process.env.GOOGLE_ADS_CLIENT_SECRET!,
      refresh_token: process.env.GOOGLE_ADS_REFRESH_TOKEN!,
      grant_type: "refresh_token",
    }),
  });
  if (!res.ok) {
    throw new Error(`Google OAuth refresh failed: ${res.status}`);
  }
  const json = (await res.json()) as { access_token: string; expires_in: number };
  cachedToken = {
    token: json.access_token,
    expiresAt: Date.now() + json.expires_in * 1000,
  };
  return cachedToken.token;
}

async function adsFetch(path: string, body?: unknown): Promise<unknown> {
  const token = await accessToken();
  const headers: Record<string, string> = {
    Authorization: `Bearer ${token}`,
    "developer-token": process.env.GOOGLE_ADS_DEVELOPER_TOKEN!,
    "Content-Type": "application/json",
  };
  const loginCustomer = process.env.GOOGLE_ADS_LOGIN_CUSTOMER_ID;
  if (loginCustomer) headers["login-customer-id"] = loginCustomer.replace(/-/g, "");
  const res = await fetch(`${ADS_API}/${path}`, {
    method: body === undefined ? "GET" : "POST",
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (!res.ok) {
    const text = (await res.text()).slice(0, 300);
    throw new Error(`Google Ads API ${res.status}: ${text}`);
  }
  return res.json();
}

/** The accounts this refresh token can see — the admin's mapping menu. */
export async function listAccessibleCustomers(): Promise<string[]> {
  const json = (await adsFetch("customers:listAccessibleCustomers")) as {
    resourceNames?: string[];
  };
  return (json.resourceNames ?? []).map((r) => r.replace("customers/", ""));
}

const SearchRowSchema = z.object({
  segments: z.object({ date: z.string() }),
  metrics: z.object({
    costMicros: z.string().optional(),
    conversions: z.number().optional(),
    conversionsValue: z.number().optional(),
  }),
});

/** One client's daily performance, date-ascending, in the pipeline's own
 *  TrackerRow shape. Derived ratios guard their zero-denominators — a day
 *  with spend and no orders has a cost but no cost-per-order. */
export async function fetchDailyRows(
  customerId: string,
  startDate: string,
  endDate: string,
): Promise<TrackerRow[]> {
  const query = `
    SELECT segments.date, metrics.cost_micros, metrics.conversions,
           metrics.conversions_value
    FROM customer
    WHERE segments.date BETWEEN '${startDate}' AND '${endDate}'
    ORDER BY segments.date`;
  const json = (await adsFetch(
    `customers/${customerId.replace(/-/g, "")}/googleAds:search`,
    { query },
  )) as { results?: unknown[] };

  return (json.results ?? []).map((raw) => {
    const row = SearchRowSchema.parse(raw);
    const spend = row.metrics.costMicros
      ? Number(row.metrics.costMicros) / 1_000_000
      : undefined;
    const conversions = row.metrics.conversions;
    const revenue = row.metrics.conversionsValue;
    const metrics: TrackerRow["metrics"] = {};
    if (spend !== undefined) metrics.spend = spend;
    if (conversions !== undefined) metrics.conversions = conversions;
    if (revenue !== undefined) metrics.revenue = revenue;
    if (spend !== undefined && spend > 0 && revenue !== undefined) {
      metrics.roas = revenue / spend;
    }
    if (spend !== undefined && conversions !== undefined && conversions > 0) {
      metrics.cpa_cpo = spend / conversions;
    }
    return { date: row.segments.date, metrics };
  });
}
