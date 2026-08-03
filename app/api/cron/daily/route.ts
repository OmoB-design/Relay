import { NextResponse } from "next/server";
import { compileDaily } from "@/lib/daily/compile";

/* Nightly compile endpoint. Scheduled for config.daily.pullHour so the digest
   is waiting before the buyer's start time.

   Protected by CRON_SECRET — Vercel Cron sends it as a bearer token. Without
   the secret set, the route refuses rather than running open to the world. */

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json(
      { error: "CRON_SECRET is not set; refusing to run." },
      { status: 503 },
    );
  }
  if (request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  try {
    const result = await compileDaily();
    return NextResponse.json({
      ok: true,
      source: result.source,
      compiled: result.clients.filter((c) => c.ok).length,
      unreachable: result.clients
        .filter((c) => !c.ok)
        .map((c) => ({ client: c.clientName, reason: c.problem })),
      flagsRaised: result.clients.reduce((t, c) => t + c.flagsRaised, 0),
    });
  } catch (e) {
    // A failed compile must be loud — a silent failure would leave the morning
    // band showing stale numbers as if they were fresh.
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : "Compile failed." },
      { status: 500 },
    );
  }
}
