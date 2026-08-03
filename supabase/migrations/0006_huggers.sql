-- ============================================================================
-- Migration 0006 — Huggers, a fourth client.
--
-- Its tracker tab carries REAL-SHAPED data transcribed from the agency's own
-- workbook screenshot, including two copy-paste errors left deliberately in
-- place (Jul 4 NC ROAS duplicated from NCAC; Jul 10 NCAC duplicated from
-- CPA/CPO). They are the on-screen argument for the Verify rung: a sheet
-- reader carries them through untouched, because it has nothing to check
-- them against.
--
-- Targets are set near the account's own 15-day averages (CPO ~$36, NCAC ~$49,
-- ROAS ~2.6) rather than tuned to keep the flag engine quiet.
-- Additive and idempotent.
-- ============================================================================

insert into clients (id, name, currency, source_of_truth, cadence, channel, descriptor, daily_to_client, account_timezone) values
  ('11111111-0000-4000-8000-000000000004', 'Huggers', 'USD', 'Google Ads',
   '{"primary":"daily","secondary":"weekly","note":"Daily line on weekdays; fuller note on Mondays."}'::jsonb,
   'email', 'DTC comfort apparel brand', true, 'Asia/Dubai')
on conflict (id) do nothing;

insert into accounts (id, client_id, platform, external_id, health, last_sync_at) values
  ('22222222-0000-4000-8000-000000000004', '11111111-0000-4000-8000-000000000004',
   'Google Ads', '418-772-3065', 'green', '2026-07-14T23:59:00+04:00')
on conflict (id) do nothing;

insert into kpis (id, client_id, label, maps_to, target, polarity, format, tolerance_pct, note) values
  ('33333333-0000-4000-8000-000000000010', '11111111-0000-4000-8000-000000000004', 'cost per order', 'cpa_cpo', 35, 'lower_is_better', 'currency', null, null),
  ('33333333-0000-4000-8000-000000000011', '11111111-0000-4000-8000-000000000004', 'NCAC', 'ncac', 48, 'lower_is_better', 'currency', null, null),
  ('33333333-0000-4000-8000-000000000012', '11111111-0000-4000-8000-000000000004', 'blended ROAS', 'roas', 2.6, 'higher_is_better', 'ratio', null, null),
  ('33333333-0000-4000-8000-000000000013', '11111111-0000-4000-8000-000000000004', 'new visitor share', 'nvp', 75, 'higher_is_better', 'percent', null, 'Percentage, as the tracker reports it.')
on conflict (id) do nothing;

insert into sensitivities (id, client_id, type, text) values
  -- Straight from the lesson of their own Slack report: a 1.60 blended ROAS
  -- hid 3.58 branded against 0.79 prospecting.
  ('44444444-0000-4000-8000-000000000010', '11111111-0000-4000-8000-000000000004', 'framing', 'Split brand and non-brand — a blended number hides the story.'),
  ('44444444-0000-4000-8000-000000000011', '11111111-0000-4000-8000-000000000004', 'tone', 'Direct and numeric. No hedging, no filler.')
on conflict (id) do nothing;

insert into stakeholders (id, client_id, name, role, gets) values
  ('55555555-0000-4000-8000-000000000010', '11111111-0000-4000-8000-000000000004', 'Priya N.', 'founder', 'short'),
  ('55555555-0000-4000-8000-000000000011', '11111111-0000-4000-8000-000000000004', 'Tomas R.', 'growth lead', 'full')
on conflict (id) do nothing;
