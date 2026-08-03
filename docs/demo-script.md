# Relay — 5-minute agency demo script

The walkthrough for showing Relay to a media-buying agency. Seed clients are the
agency's real tracker tabs (Northbrook, Birkenstock, Switchup); all numbers are
plausible fiction. Before demoing, run `supabase/reset-demo.sql` so the lifecycle
is in its intended shape (Northbrook drafted, Birkenstock reviewed, Switchup sent).

**The one line to land:** *your daily data-entry ritual and your "is this ok?"
client questions both become a review step — you check, you don't compile.*

---

## 0. Open (15s) — `/today`

"This is Monday morning. Not a dashboard — a queue of what needs you before a
client notices." Point out the three bands: **Waiting on you** (a client
question), **Flags** (an anomaly + a data-freshness note), **Due this week**
(three clients, three states).

## 1. The flagship — the stitch (90s) — Northbrook → Review draft

This is the heart of the demo. Open Northbrook's drafted weekly.

- "Relay drafted this overnight from Google Ads + the tracker. But nothing here
  ships unproven — watch." **Tap the cost-per-order sentence** → the **$26.40**
  card lights up (−9% vs the $29 target, weekly sparkline). **Tap the CPC
  sentence** → the **+12% midweek** bump that settled Friday.
- "Every underlined sentence is stitched to its evidence. The arrow line at the
  bottom is the plan — no source, because it's forward-looking. The system won't
  let a *fact* go sourceless; that's structural, not a guideline."
- "The amber chips up top are the rules of this relationship — this founder
  never gets daily numbers and never hears 'ROAS.' The draft obeys them."
- Tweak one word (mention: *Relay quietly learns your phrasing from that edit*),
  **Mark reviewed**, toggle **WhatsApp**, **Copy**. "Send from your own phone,
  your number, your voice. Ninety seconds. Nothing auto-sent."

**Land it:** "The stitch is the verification step that makes an AI draft
trustworthy enough to actually send."

## 2. The Loom brief (45s) — overflow menu → Loom brief

"Before a Friday video, you glance at this — not read it aloud." Three headline
cards, one risk, one win. **Copy as text** for a teleprompter. Read the closing
line out loud: *"Record and send from wherever you usually do — Relay stops
here."* — "That's the product deliberately not touching the personal moment."

## 3. The Client Graph (45s) — back → Profile tab

"This is *why* the draft sounded like that." Show KPIs in the client's own
language (cost per order, NCAC), the typed sensitivities, stakeholders. Edit a
target to show it's live. "Change this and every future draft, answer, and flag
inherits it."

## 4. Answer Desk — the at-dinner surface (60s) — `/answer-desk` → Northbrook

- "A client texts at 9pm: *spend looked high Thursday, all ok?*" Paste it →
  **Answer** → the grounded reply ($10.4k, algorithm scaling a winner, 12% under
  target that day) with supporting data one tap away.
- Then ask something out of scope → the **honest miss**: "I can't answer that
  from connected data." "It refuses to invent numbers — which is exactly your
  own tracker rule. And every miss is a labelled target for what we ground next."

## 5. Memory + archive (30s) — Timeline + Library

- Northbrook → **Timeline**: "Everything you've said, pinned to the data it was
  said against — the CPC worry three weeks ago, resolved last week." Open **View
  data snapshot** on an old entry — "frozen, never re-computed."
- `/library`: search "objection" across all clients. "Every commentary, answer,
  and brief — one searchable archive. This is what makes quarterly synthesis a
  filter, not a project."

## Close (15s)

"Google Ads and your tracker in; reviewed, in-your-voice comms out. The daily
ritual becomes a 90-second review, the anomaly scan becomes a flag with an audit
trail, and every answer becomes memory. Relay prepares the human — it never
replaces them."

---

### The mapping (if they ask "how is this different from a dashboard")

Walk their own tracker rules → Relay's architecture:

| Their rule | Relay |
|---|---|
| Don't self-calculate metrics | No unsourced sentence ships (evidence-linked claims) |
| Never edit old rows; flag to Mitzi | Immutable Timeline pinned to snapshots |
| One source of truth per client | Source of truth on the Client Graph, on every evidence card |
| Log every day; gaps make false trends | Never interpolate missing days — freshness warning instead |
| Scan charts, flag to Sultan | Flags with dismiss-with-reason audit trail |
