# Relay

A client-comms intelligence layer for media buying agencies. Relay sits between
**Google Ads + the agency's daily KPI tracker** and the client relationship,
turning performance data into communication-ready material: weekly commentary
drafts, Loom recording briefs, grounded answers to client questions, and an
interpreted per-client timeline.

**Product principle:** AI handles 90% of the data prep so the buyer owns 100% of
the client relationship. No auto-send, ever. No unsourced sentence ships — every
factual claim links to the evidence behind it.

## Stack

- **Next.js 14** (App Router) + **TypeScript** (strict)
- **Tailwind v4** — theme via `@theme` in `app/globals.css` (no `tailwind.config.ts`)
- **shadcn/ui** primitives, themed to Relay tokens · **lucide-react** icons · **motion/react** animation
- **Supabase** (Postgres) — typed client, seeded from `supabase/`
- **zod** domain model · **date-fns** · hand-drawn SVG sparklines (no charting lib)

## Getting started

```bash
npm install
```

Create `.env.local` (git-ignored) with your Supabase project credentials:

```
NEXT_PUBLIC_SUPABASE_URL=https://<project>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon key>
```

Load the schema + seed into the project (Supabase SQL Editor, in order):

1. `supabase/schema.sql` — tables, enums, and the integrity CHECK constraints
2. `supabase/seed.sql` — three seed clients and their data
3. Then every file in `supabase/migrations/` **in numeric order**, `0002` through
   `0013`. They are cumulative and each one is idempotent (`if not exists`), so
   re-running one is safe; skipping one is not.

The migration list is not optional reading — `0008_auth.sql` documents the
bootstrap (the first account created becomes the agency admin, and there is no
signup form), and `0013_client_identity.sql` is what lets an admin create a
client from the app at all.

Then:

```bash
npm run dev     # http://localhost:3000 (opens on /today)
npm run build   # production build
npm run lint    # eslint
```

## The app

| Route | What |
|---|---|
| `/today` | Daily queue: waiting questions, flags (dismiss-with-reason), narratives due |
| `/clients` · `/clients/[id]` | Client index → workspace: **Profile** (Client Graph, editable), **Timeline** (pinned-snapshot history), **Narratives** |
| `/clients/[id]/narratives/[nid]` | **NarrativeSplitView** — the flagship claim↔evidence stitch; drafted → reviewed → sent |
| `/clients/[id]/narratives/[nid]/loom` | **Loom brief** — recording-prep artifact |
| `/answer-desk` | Client-scoped grounded Q&A |
| `/library` | Cross-client searchable archive |
| `/styleguide` | Component/token reference (dev only) |

## Architecture notes

- **`lib/data.ts`** is the single data-access seam — every screen reads/writes
  through it; nothing touches Supabase directly. Reads zod-parse at the boundary.
- **`lib/config.ts`** holds every tunable (durations, polarity, page sizes,
  locale, all repeated copy), zod-validated. No magic numbers elsewhere.
- **`app/globals.css`** is the only place raw values (hex, fonts, radii) live —
  a Figma token swap is a single-block edit.
- **Integrity is enforced in the database**, not just the app: a `fact` claim /
  Loom headline without evidence, or a dismissed flag without a reason, is
  rejected by a Postgres `CHECK`.

### Demo reset

Re-running `supabase/seed.sql` resets everything (idempotent). To reset only the
narrative demo lifecycle (Northbrook *drafted*, Birkenstock *reviewed*, Switchup
*sent*) while preserving captured voice diffs, run `supabase/reset-demo.sql`.

## Data sources

Google Ads + the agency tracker (Google Sheets) **only** — Meta is out of scope.
Phases 0–6 run entirely on seed data. Tracker ingestion (Phase 7, `googleapis`)
and AI generation (Phase 8, `@anthropic-ai/sdk`, needs `ANTHROPIC_API_KEY`) are
the remaining live-integration phases.

## Before the pilot goes live (security)

Row-level security is **off** during seed-data development. **Turn RLS on — with
auth policies — before either:** (a) a real user/auth model replaces the single
demo buyer, or (b) the pilot is deployed with real agency data on a public URL.
The anon key ships to the browser and currently permits writes; that's fine for
a local single-operator demo, not for real client data in production.

See `docs/demo-script.md` for the 5-minute agency walkthrough.
