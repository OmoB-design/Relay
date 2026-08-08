# Daily Logs: how the confirm ritual works

Explainer doc, written 2026-08-08, covering `/overview/logs` (the admin
accountability grid) and the daily confirm flow it's built on. This is a
reference for *how the feature works and why*, not a spec — if the code
changes, trust the code over this doc.

## What the page is for

`/overview/logs` is not a performance dashboard — no spend, no ROAS. It's an
**accountability dashboard**: did the daily check-in ritual actually happen,
per client, per day, and who's responsible for it.

It exists specifically for the admin, who carries no clients of their own.
Everything on this page is about *other people's* work — coverage gaps and
missed confirms are invisible from the admin's own Today view, which is the
whole reason this page exists.

## The daily lifecycle

1. **The buyer enters numbers in the tracker.** The tracker workbook (Google
   Sheets) is the buyer's actual record — that's deliberate and isn't
   changing.
2. **Relay compiles a row each morning.** A cron job (`app/api/cron/daily`)
   reads the tracker and stages one row per client for the target day. This
   row lands with status `staged` — compiled, not yet vouched for.
3. **The buyer confirms.** They open Today, review the compiled number
   against what they know, and click Confirm. That's one judgment, one
   action, their name attached.

## What each cell state means

| State | Meaning |
|---|---|
| **Confirmed** | Relay compiled the row, and a named buyer attested to it. |
| **Not confirmed** (`staged`) | Relay compiled the row fine; nobody has reviewed and confirmed it yet. |
| **No row** (`missing`) | The day is fully over and there's nothing usable at all — worse than unconfirmed, since there isn't even a draft to review. |
| **Not due yet** (`notDue`) | That calendar day hasn't ended yet for this specific client. |

### Why "not due yet" exists

A day isn't the same moment for every client — a Dubai account's day ends
hours before a London account's. The rightmost column on the grid can
correctly be "not due" for one client and "missing" for another on the exact
same real-world date. Without this state, the grid would accuse a buyer of
being late for a day that, in that client's own timezone, hasn't finished.

### Why the confirmed/due fraction isn't confirmed/(confirmed + missing)

The fraction shown per client (e.g. `1/14`) is `confirmed ÷ due`, where `due`
counts every day that has already ended for that client in the window — not
just confirmed + missing. A compiled-but-unconfirmed day is neither, and
leaving it out of the denominator made a client with two straight weeks of
ignored rows read as `0/0` (looks like nothing was ever expected) instead of
the true `0/14` (looks like the real problem it is).

## Grouping by buyer, and "Nobody assigned"

Rows are grouped under the buyer assigned to that client
(`client_assignments`). Clients with no buyer assigned land in their own
**"Nobody assigned"** bucket at the bottom of the grid — the most important
row on the page, because it isn't "someone is slacking," it's "no one's job."

## What clicking Confirm actually asserts

Confirming a row is the buyer saying, in effect:

> "I've entered the tracker data. Relay compiled it. I've done a second check
> and these numbers are correct — I've done my job on this client today."

The implementation backs this up with a few deliberate guarantees:

- **Identity comes from the session, never the request.** The attester's name
  is pulled from who's logged in, not anything the client can pass — a
  confirm can't be forged with someone else's name.
- **A silent edit is not allowed.** If the buyer catches a wrong number and
  corrects it while confirming, the system requires a written reason — an
  edit with no reason is rejected outright. "I checked, it's correct" and "I
  checked, caught an error, here's why I changed it" are both valid confirms;
  a silent change is not.
- **Once confirmed, it's locked.** If the nightly compile re-runs for a day
  that's already been confirmed, it skips that row rather than overwriting
  it — a human's word stands over a later automated pull.

## Per-client granularity, not per-buyer

Confirming is scoped **per client, per day** — not "did this buyer do
something today." A buyer covering 4 clients owes 4 separate confirms daily,
because each client's numbers are independently true or false. That's why
the grid shows one row per client under a buyer's name instead of a single
aggregate checkbox: a buyer could confirm 3 of their 4 clients and quietly
skip the one having a bad week, and per-client rows are what catch that.

## Worked scenario

Client **Acme Co.** (timezone: New York) is assigned to buyer Sarah.

- **Monday, ~2am NY** — cron runs, pulls Acme's numbers from the tracker,
  stages the row. Monday's cell = *Not confirmed*.
- **Monday, 9am** — Sarah opens Today, reviews the digest, clicks Confirm.
  Monday's cell flips to *Confirmed*, with "Sarah" recorded against it.
- **Tuesday** — same compile happens, but Sarah is out sick and never opens
  it. By Wednesday, Tuesday's cell is still *Not confirmed* — the data
  exists, nobody's vouched for it.
- **Wednesday** — the tracker itself has a broken cell (a bad paste in the
  sheet), so the compile can't produce a usable row. Wednesday's cell =
  *No row* — worse than Tuesday's, since there's nothing to confirm at all.
- **Right now, if Acme's day in NY hasn't ended yet** — today's column for
  Acme reads *Not due yet*, even if a client in another timezone already
  shows *No row* or *Confirmed* for the same calendar date.

Two weeks later, Acme sits at `9/14`. That number is what tells the admin to
go ask Sarah what happened on the 5 missing days — without opening Acme's
client page individually to notice.

## Where this lives in the code

- [`app/(app)/overview/logs/page.tsx`](../app/(app)/overview/logs/page.tsx) —
  the page itself (admin-only, via `requireAdmin()`).
- [`lib/admin/logs.ts`](../lib/admin/logs.ts) — `getLogOversight()`, the
  per-cell state logic and the timezone-aware "due" axis.
- [`app/(app)/today/daily-actions.ts`](../app/(app)/today/daily-actions.ts) —
  `confirmDailyRowAction()`, the confirm entry point from Today.
- [`lib/data.ts`](../lib/data.ts) — `confirmDailyRow()` (the edit-requires-
  reason rule) and `stageRowsFor` (the never-overwrite-a-confirm rule).
