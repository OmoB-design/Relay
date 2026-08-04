-- ============================================================================
-- Reset the pilot demo state (safe to run before any demo, idempotent).
-- Restores the narrative lifecycle to its seed shape — Northbrook DRAFTED,
-- Birkenstock REVIEWED, Switchup SENT — plus Northbrook's original claim texts,
-- authored WhatsApp variant, and timeline dates.
-- Deliberately does NOT touch: voice_profiles / edit_diffs (captured voice
-- corpus is real data), flags, profile edits (KPIs, sensitivities, etc.).
-- ============================================================================

-- ----------------------------------------------------------------------------
-- CALENDAR. Everything below is authored against ONE week: Mon 6 - Sun 12 Jul
-- 2026. That stays fixed on purpose, so this file remains a readable, diffable
-- record of the demo and lines up with lib/seed.ts.
--
-- It is NOT what the app should show. Run supabase/rebase-demo.sql afterwards to
-- move the whole dataset onto the most recently completed Mon-Sun week, then
-- `npx tsx scripts/backfill-daily.ts` to stage the trailing daily window. The
-- rebase is idempotent and shifts by whole weeks, so weekday alignment holds.
-- ----------------------------------------------------------------------------

-- Narrative lifecycle back to seed shape
update narratives set status = 'drafted', reviewed_at = null, sent_at = null,
  whatsapp_variant =
'Northbrook — week of Jul 6 👇
Scaled on purpose: $54.6k total (+18%), extra went to Performance Max prospecting.
Cost per order $26.40 — still ~9% under our $29 line even at higher spend. That''s the green light.
The objections asset group now drives 31% of conversions at the cheapest CPO.
CPCs bumped +12% midweek (auction pressure), settled by Friday. No action needed.
2,067 orders — past the 1,900 target. NCAC $34.20, 4% better — growth is new customers.
This week: ~15% of budget shifts to the objections group, everything else holds.'
where id = '11111111-0000-4000-8000-0000000000b1';

update narratives set status = 'reviewed', reviewed_at = '2026-07-10T09:00:00+04:00', sent_at = null
where id = '11111111-0000-4000-8000-0000000000b2';

update narratives set status = 'sent', reviewed_at = '2026-07-06T08:30:00+04:00', sent_at = '2026-07-06T09:00:00+04:00'
where id = '11111111-0000-4000-8000-0000000000b3';

-- Northbrook claim texts back to seed originals (edits stay banked in edit_diffs)
update claims set text = 'We deliberately scaled last week — total spend came to $54.6k, up 18% on the week before, with most of the increase going into Performance Max prospecting.' where id = '66666666-0000-4000-8000-000000000001';
update claims set text = 'Cost per order held at $26.40 — about 9% under our $29 line — even with the extra budget, which is the signal we wanted before pushing further.' where id = '66666666-0000-4000-8000-000000000002';
update claims set text = 'The objection-handling asset group is now the account''s engine: 31% of all conversions at the cheapest cost per order of any group.' where id = '66666666-0000-4000-8000-000000000003';
update claims set text = 'CPCs climbed about 12% midweek from auction pressure, then settled by Friday — worth knowing about, not worth reacting to.' where id = '66666666-0000-4000-8000-000000000004';
update claims set text = 'That put us at 2,067 orders for the week, comfortably past the 1,900 target.' where id = '66666666-0000-4000-8000-000000000005';
update claims set text = 'New-customer acquisition cost came in at $34.20, 4% better than last week — the growth is coming from new buyers, not just repeat orders.' where id = '66666666-0000-4000-8000-000000000006';
update claims set text = '→ This week: shift roughly 15% of budget toward the objection asset group and hold everything else steady while CPCs normalise.' where id = '66666666-0000-4000-8000-000000000007';

-- Timeline dates back to the seed week
update timeline_entries set date = '2026-07-06'
where ref_id in ('11111111-0000-4000-8000-0000000000b1', '11111111-0000-4000-8000-0000000000b2', '11111111-0000-4000-8000-0000000000b3');

-- Engine-raised flags and staged daily rows are DERIVED data — clear them and
-- let the next compile re-derive from whatever the tracker currently says.
-- Seeded flags (Birkenstock's NCAC drift and freshness warning, Switchup's
-- dismissed example) have no dedupe_key and are deliberately left alone.
delete from flags where dedupe_key is not null;
delete from daily_rows;

-- Answer Desk back to seed shape. Threads asked during a demo/walkthrough are
-- removed (and their Timeline entries with them); the two seeded Switchup
-- questions return to "waiting" so both flows demo again — d3 resolves to an
-- honest miss, d4 to a grounded card.
delete from timeline_entries where type = 'answer' and ref_id not in (
  '11111111-0000-4000-8000-0000000000d1', '11111111-0000-4000-8000-0000000000d2');
delete from answer_threads where id not in (
  '11111111-0000-4000-8000-0000000000d1', '11111111-0000-4000-8000-0000000000d2',
  '11111111-0000-4000-8000-0000000000d3', '11111111-0000-4000-8000-0000000000d4');
update answer_threads set answer = null
where id in ('11111111-0000-4000-8000-0000000000d3', '11111111-0000-4000-8000-0000000000d4');
