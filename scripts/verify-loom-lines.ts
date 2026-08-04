/* Amendment proof: risk/win lines editable, persisted, restored. */
import { getLoomBriefContext, updateLoomLine } from "../lib/data";
import { runWithServiceRole } from "../lib/supabase";
const B1 = "11111111-0000-4000-8000-0000000000b1";
async function main() {
  const before = (await getLoomBriefContext(B1))!;
  const originalRisk = before.brief.risk;
  await updateLoomLine(
    before.brief.id,
    "risk",
    "CPCs ran warm midweek — settled Friday, no action needed.",
  );
  const after = (await getLoomBriefContext(B1))!;
  console.log(
    "risk updated:",
    after.brief.risk !== originalRisk,
    "| win untouched:",
    after.brief.win === before.brief.win,
  );
  await updateLoomLine(before.brief.id, "risk", originalRisk);
  console.log(
    "restored:",
    (await getLoomBriefContext(B1))!.brief.risk === originalRisk,
  );
}
runWithServiceRole(main).catch((e) => {
  console.error(e);
  process.exit(1);
});
