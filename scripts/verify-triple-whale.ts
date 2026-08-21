/* Layer C proof: the Triple Whale connector reaches the real API and speaks
   the pipeline's shape. SKIPS (exit 0) without a key so the suite stays
   green; with one, it pulls 7 days for the first mapped client's shop and
   asserts shape. Read-only. */
import { format, subDays } from "date-fns";
import { fetchDailyRows, hasTripleWhaleCredentials } from "../lib/triple-whale";
import { getClients } from "../lib/data";
import { runWithServiceRole } from "../lib/supabase";

async function main() {
  if (!hasTripleWhaleCredentials()) {
    console.log("SKIP: Triple Whale credentials not present.");
    return;
  }
  const clients = await runWithServiceRole(getClients);
  const mapped = clients.find((c) => c.tripleWhaleShop);
  if (!mapped) {
    console.log("SKIP: no client mapped to a Triple Whale shop yet.");
    return;
  }
  const end = format(subDays(new Date(), 1), "yyyy-MM-dd");
  const start = format(subDays(new Date(), 7), "yyyy-MM-dd");
  const rows = await fetchDailyRows(mapped.tripleWhaleShop!, start, end);
  console.log(`rows for ${mapped.name} (${start}..${end}): ${rows.length}`);
  for (const r of rows.slice(-3)) {
    const m = r.metrics;
    console.log(
      `  ${r.date} spend=${m.spend?.toFixed(2) ?? "—"} orders=${m.conversions ?? "—"} ncroas=${m.nc_roas?.toFixed(2) ?? "—"} nvp=${m.nvp ?? "—"}`,
    );
  }
  for (let i = 1; i < rows.length; i++) {
    if (rows[i]!.date <= rows[i - 1]!.date) throw new Error("Rows not date-ascending.");
  }
  for (const r of rows) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(r.date)) throw new Error(`Bad date: ${r.date}`);
  }
  console.log("shape ok");
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
