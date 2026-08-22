/* Phase 7.5b proof: the Google Ads connector reaches the real API and speaks
   the pipeline's shape. With no credentials in the environment the script
   SKIPS (exit 0) — the suite stays green on machines without the keys.
   Read-only throughout: token refresh, account listing, a 7-day GAQL pull. */
import { format, subDays } from "date-fns";
import {
  fetchDailyRows,
  hasGoogleAdsCredentials,
  listAccessibleCustomers,
} from "../lib/google-ads";
import { getClients } from "../lib/data";
import { runWithServiceRole } from "../lib/supabase";

async function main() {
  if (!hasGoogleAdsCredentials()) {
    console.log("SKIP: Google Ads credentials not present.");
    return;
  }

  const customers = await listAccessibleCustomers();
  console.log(`accessible customers: ${customers.length}`);
  if (customers.length === 0) {
    throw new Error("Token refreshed but no accessible customers.");
  }

  const end = format(subDays(new Date(), 1), "yyyy-MM-dd");
  const start = format(subDays(new Date(), 7), "yyyy-MM-dd");
  /* A mapped client's account is the true target - the accessible list can
     lead with accounts this token may see but not read (managers, real
     accounts on a test-level developer token). */
  const clients = await runWithServiceRole(getClients);
  const mapped = clients.find((c) => c.googleAdsCustomerId);
  const target = mapped?.googleAdsCustomerId ?? customers[0]!;
  if (mapped) console.log(`target: ${mapped.name} -> ${target}`);
  const rows = await fetchDailyRows(target, start, end);
  console.log(`rows for ${target} (${start}..${end}): ${rows.length}`);
  for (const r of rows.slice(-3)) {
    const m = r.metrics;
    console.log(
      `  ${r.date} spend=${m.spend?.toFixed(2) ?? "—"} conv=${m.conversions ?? "—"} rev=${m.revenue?.toFixed(2) ?? "—"} roas=${m.roas?.toFixed(2) ?? "—"}`,
    );
  }
  // Shape assertions — dates ISO and ascending, ratios only when derivable.
  for (let i = 1; i < rows.length; i++) {
    if (rows[i]!.date <= rows[i - 1]!.date) throw new Error("Rows not date-ascending.");
  }
  for (const r of rows) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(r.date)) throw new Error(`Bad date: ${r.date}`);
    if (r.metrics.roas !== undefined && (r.metrics.spend ?? 0) <= 0) {
      throw new Error("ROAS derived without spend.");
    }
  }
  console.log("shape ok");
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
