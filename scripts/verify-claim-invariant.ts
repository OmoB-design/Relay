/* Proof for PHASE.md Phase 0: a `fact` Claim requires non-empty evidenceRefs;
   a `plan` Claim requires empty. Run: npx tsx scripts/verify-claim-invariant.ts */
import { ClaimSchema } from "../lib/types";

const NARRATIVE = "11111111-0000-4000-8000-0000000000b1";
const REF = {
  snapshotId: "11111111-0000-4000-8000-0000000000a1",
  itemId: "E3",
};
const base = {
  id: "66666666-0000-4000-8000-000000000099",
  narrativeId: NARRATIVE,
  order: 1,
};

const cases = [
  {
    label: "fact WITHOUT evidence (must FAIL)",
    input: { ...base, kind: "fact", text: "ROAS was 3.2.", evidenceRefs: [] },
    expectValid: false,
  },
  {
    label: "fact WITH evidence (must PASS)",
    input: {
      ...base,
      kind: "fact",
      text: "Cost per order held at $26.40.",
      evidenceRefs: [REF],
    },
    expectValid: true,
  },
  {
    label: "plan WITH evidence (must FAIL)",
    input: {
      ...base,
      kind: "plan",
      text: "→ Shift budget.",
      evidenceRefs: [REF],
    },
    expectValid: false,
  },
  {
    label: "plan WITHOUT evidence (must PASS)",
    input: { ...base, kind: "plan", text: "→ Shift budget.", evidenceRefs: [] },
    expectValid: true,
  },
];

let allOk = true;
for (const c of cases) {
  const result = ClaimSchema.safeParse(c.input);
  const ok = result.success === c.expectValid;
  allOk &&= ok;
  console.log(
    `${ok ? "✓" : "✗"} ${c.label} → ${result.success ? "valid" : "invalid"}` +
      (!result.success
        ? `  (${result.error.issues[0]?.message ?? "rejected"})`
        : ""),
  );
}

if (!allOk) {
  console.error("\nInvariant proof FAILED.");
  process.exit(1);
}
console.log("\nClaim invariant holds at the type/runtime level.");
