/* Run the daily compile manually (the cron route calls the same function).
     export $(grep -v '^#' .env.local | xargs) && npx tsx scripts/compile-daily.ts [--date YYYY-MM-DD] */
import { compileDaily } from "../lib/daily/compile";

const args = process.argv.slice(2);
const dateArg = args.includes("--date") ? args[args.indexOf("--date") + 1] : undefined;

async function main() {
  const result = await compileDaily(dateArg ? { date: dateArg } : undefined);
  console.log(`\nDaily compile · source: ${result.source}\n`);
  for (const c of result.clients) {
    const mark = c.ok ? "✓" : "⚠";
    console.log(`${mark} ${c.clientName.padEnd(12)} ${c.date}  ${c.ok ? `staged · ${c.flagsRaised} flag(s)` : c.problem}`);
  }
  console.log("");
}
main().catch((e) => { console.error(e); process.exit(1); });
