-- ============================================================================
-- Migration 0002 — Phase 3: voice-profile capture + authored WhatsApp variants.
-- Additive and idempotent (the DB is live and carrying state; schema.sql is
-- no longer re-run wholesale).
-- ============================================================================

-- Authored condensed WhatsApp variant per narrative. Cleared when the draft is
-- edited (the UI falls back to deterministic condensation); Phase 8 regenerates.
alter table narratives add column if not exists whatsapp_variant text;

-- Per-buyer accumulated edit history (CLAUDE.md "VoiceProfile"). Single demo
-- buyer during the pilot; real auth is post-MVP.
create table if not exists voice_profiles (
  id         uuid primary key,
  buyer_key  text not null unique,
  created_at timestamptz not null default now()
);

-- One captured edit between `drafted` and `reviewed` (design.md §4.3).
-- Segments are word-level (diffWords), stored verbatim for Phase 8 to summarize.
create table if not exists edit_diffs (
  id           uuid primary key,
  profile_id   uuid not null references voice_profiles(id) on delete cascade,
  narrative_id uuid references narratives(id) on delete set null,
  client_id    uuid references clients(id) on delete set null,
  before_text  text not null,
  after_text   text not null,
  segments     jsonb not null,
  created_at   timestamptz not null default now()
);

-- Seed: demo buyer profile ----------------------------------------------------
insert into voice_profiles (id, buyer_key, created_at) values
  ('88888888-0000-4000-8000-000000000001', 'demo-buyer', '2026-06-01T09:00:00+04:00')
on conflict (id) do nothing;

-- Seed: three EditDiffs (SEED.md "VoiceProfile seed") — real, demoable style
-- signals for Phase 8: exact numbers over vague magnitude, short sign-offs,
-- precise account-level language.
insert into edit_diffs (id, profile_id, narrative_id, client_id, before_text, after_text, segments, created_at) values
  ('99999999-0000-4000-8000-000000000001', '88888888-0000-4000-8000-000000000001', null, '11111111-0000-4000-8000-000000000001',
    'We scaled last week — total spend came to $54.6k, a significant increase on the week before.',
    'We scaled last week — total spend came to $54.6k, an 18% increase on the week before.',
    '[{"type":"unchanged","text":"We scaled last week — total spend came to $54.6k, "},{"type":"removed","text":"a significant"},{"type":"added","text":"an 18%"},{"type":"unchanged","text":" increase on the week before."}]'::jsonb,
    '2026-06-22T08:40:00+04:00'),
  ('99999999-0000-4000-8000-000000000002', '88888888-0000-4000-8000-000000000001', null, '11111111-0000-4000-8000-000000000002',
    'NC ROAS is back above target and the new-customer mix is holding. Let me know if you have any questions!',
    'NC ROAS is back above target and the new-customer mix is holding.',
    '[{"type":"unchanged","text":"NC ROAS is back above target and the new-customer mix is holding."},{"type":"removed","text":" Let me know if you have any questions!"}]'::jsonb,
    '2026-06-29T09:05:00+04:00'),
  ('99999999-0000-4000-8000-000000000003', '88888888-0000-4000-8000-000000000001', null, '11111111-0000-4000-8000-000000000003',
    'We''re seeing strong performance across the account this quarter.',
    'The account is performing above plan this quarter.',
    '[{"type":"removed","text":"We''re seeing strong performance across"},{"type":"added","text":"The account is performing above plan"},{"type":"unchanged","text":" this quarter."}]'::jsonb,
    '2026-07-06T08:20:00+04:00')
on conflict (id) do nothing;

-- Seed: authored WhatsApp variants (LT copy from the flagship mockup) ---------
update narratives set whatsapp_variant =
'Northbrook — week of Jul 6 👇
Scaled on purpose: $54.6k total (+18%), extra went to Performance Max prospecting.
Cost per order $26.40 — still ~9% under our $29 line even at higher spend. That''s the green light.
The objections asset group now drives 31% of conversions at the cheapest CPO.
CPCs bumped +12% midweek (auction pressure), settled by Friday. No action needed.
2,067 orders — past the 1,900 target. NCAC $34.20, 4% better — growth is new customers.
This week: ~15% of budget shifts to the objections group, everything else holds.'
where id = '11111111-0000-4000-8000-0000000000b1';

update narratives set whatsapp_variant =
'Birkenstock — week of Jul 6 (data through Jul 9)
• NC ROAS 2.35 — ahead of the 2.2 target
• New customers 58% of orders, mix steady
• NCAC $43.50 — ~6% over the $41 target, tightening signals
• Revenue $84.2k vs $88k target
• Jul 10–11 tracker rows missing — excluded, not estimated
This week: tighten the prospecting audience signals.'
where id = '11111111-0000-4000-8000-0000000000b2';

update narratives set whatsapp_variant =
'Switchup — week of Jun 29
Blended ROAS 3.15 against the 3.0 benchmark — trajectory intact.
AOV $98.40, above the $96 target.
Media investment $31.5k, +3% in line with the seasonal plan.
Next: hold the current allocation into the quarter-end narrative.'
where id = '11111111-0000-4000-8000-0000000000b3';
