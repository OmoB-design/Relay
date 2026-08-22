-- ============================================================================
-- Relay seed data — generated from SEED.md. Idempotent: truncates seed tables
-- and re-inserts by stable UUID, so re-running resets to a known-good state
-- ("drop-and-recreate seed rows"). Run schema.sql first.
--
-- Client names are the target agency's real tracker tabs; all business details,
-- people, and numbers are invented-but-plausible. Metrics use the agency's own
-- vocabulary (Spend, Sales, Revenue, ROAS, CPA/CPO, NC ROAS, NCAC). USD, GST.
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

begin;

truncate table clients cascade;

-- Clients (Client Graph roots) ---------------------------------------------
insert into clients (id, name, currency, source_of_truth, cadence, channel, descriptor) values
  ('11111111-0000-4000-8000-000000000001', 'Northbrook', 'USD', 'Google Ads',
    '{"primary":"weekly","anchorDay":"mon"}'::jsonb, 'slack', 'DTC functional beverage brand'),
  ('11111111-0000-4000-8000-000000000002', 'Birkenstock', 'USD', 'Triple Whale',
    '{"primary":"weekly-lite","secondary":"monthly","note":"Monthly deep-dive; weekly is bullets only."}'::jsonb, 'email', 'DTC beauty brand'),
  ('11111111-0000-4000-8000-000000000003', 'Switchup', 'USD', 'Google Ads',
    '{"primary":"weekly"}'::jsonb, 'email', 'Premium apparel brand');

-- Accounts (Google Ads only — Meta out of scope) ----------------------------
insert into accounts (id, client_id, platform, external_id, health, last_sync_at) values
  ('22222222-0000-4000-8000-000000000001', '11111111-0000-4000-8000-000000000001', 'Google Ads', '731-556-2214', 'green', '2026-07-12T23:59:00+04:00'),
  ('22222222-0000-4000-8000-000000000002', '11111111-0000-4000-8000-000000000002', 'Google Ads', '604-118-9932', 'amber', '2026-07-09T23:59:00+04:00'),
  ('22222222-0000-4000-8000-000000000003', '11111111-0000-4000-8000-000000000003', 'Google Ads', '220-871-5540', 'green', '2026-07-12T23:59:00+04:00');

-- KPIs (in each client's own language) --------------------------------------
insert into kpis (id, client_id, label, maps_to, target, polarity, format, tolerance_pct, note) values
  -- Northbrook
  ('33333333-0000-4000-8000-000000000001', '11111111-0000-4000-8000-000000000001', 'cost per order', 'cpa_cpo', 29, 'lower_is_better', 'currency', null, null),
  ('33333333-0000-4000-8000-000000000002', '11111111-0000-4000-8000-000000000001', 'weekly orders', 'conversions', 1900, 'higher_is_better', 'count', null, null),
  ('33333333-0000-4000-8000-000000000003', '11111111-0000-4000-8000-000000000001', 'NCAC', 'ncac', 36, 'lower_is_better', 'currency', null, null),
  ('33333333-0000-4000-8000-000000000004', '11111111-0000-4000-8000-000000000001', 'spend pace', 'spend', 52000, 'on_target', 'currency', 10, 'Weekly spend vs plan, ±10% band.'),
  -- Birkenstock
  ('33333333-0000-4000-8000-000000000005', '11111111-0000-4000-8000-000000000002', 'NC ROAS', 'nc_roas', 2.2, 'higher_is_better', 'ratio', null, null),
  ('33333333-0000-4000-8000-000000000006', '11111111-0000-4000-8000-000000000002', 'NCAC', 'ncac', 41, 'lower_is_better', 'currency', null, null),
  ('33333333-0000-4000-8000-000000000007', '11111111-0000-4000-8000-000000000002', 'revenue', 'revenue', 88000, 'higher_is_better', 'currency', null, 'Weekly revenue.'),
  -- Switchup
  ('33333333-0000-4000-8000-000000000008', '11111111-0000-4000-8000-000000000003', 'blended ROAS', 'roas', 3.0, 'higher_is_better', 'ratio', null, null),
  ('33333333-0000-4000-8000-000000000009', '11111111-0000-4000-8000-000000000003', 'AOV', 'aov', 96, 'higher_is_better', 'currency', null, null);

-- Sensitivities (structured, typed — never free text) -----------------------
insert into sensitivities (id, client_id, type, text) values
  ('44444444-0000-4000-8000-000000000001', '11111111-0000-4000-8000-000000000001', 'framing', 'Frame cost per order weekly, never daily — Dana reacts to daily swings.'),
  ('44444444-0000-4000-8000-000000000002', '11111111-0000-4000-8000-000000000001', 'metric-avoidance', 'Never lead with ROAS; Dana doesn''t trust blended ROAS.'),
  ('44444444-0000-4000-8000-000000000003', '11111111-0000-4000-8000-000000000001', 'tone', 'Slack preferred; short paragraphs.'),
  ('44444444-0000-4000-8000-000000000004', '11111111-0000-4000-8000-000000000002', 'cadence', 'Monthly deep-dive; weekly is bullets only.'),
  ('44444444-0000-4000-8000-000000000005', '11111111-0000-4000-8000-000000000002', 'framing', 'Always split new vs returning customers; the founder only trusts new-customer numbers.'),
  ('44444444-0000-4000-8000-000000000006', '11111111-0000-4000-8000-000000000003', 'tone', 'Formal register; deck-ready phrasing.'),
  ('44444444-0000-4000-8000-000000000007', '11111111-0000-4000-8000-000000000003', 'framing', 'Quarterly narrative arc matters; always reference trajectory.');

-- Stakeholders (invented contacts) ------------------------------------------
insert into stakeholders (id, client_id, name, role, gets) values
  ('55555555-0000-4000-8000-000000000001', '11111111-0000-4000-8000-000000000001', 'Dana K.', 'founder', 'short'),
  ('55555555-0000-4000-8000-000000000002', '11111111-0000-4000-8000-000000000001', 'Omar S.', 'finance', 'full'),
  ('55555555-0000-4000-8000-000000000003', '11111111-0000-4000-8000-000000000002', 'Lina M.', 'founder', 'full'),
  ('55555555-0000-4000-8000-000000000004', '11111111-0000-4000-8000-000000000003', 'Rowan T.', 'founder', 'deck');

-- Evidence snapshots --------------------------------------------------------
-- a1–a3: the current narrative weeks. a4–ac: history mini-snapshots (3 items
-- each, SEED.md "Timeline history") pinned to the weekly commentary entries.
insert into evidence_snapshots (id, client_id, period, as_of) values
  ('11111111-0000-4000-8000-0000000000a1', '11111111-0000-4000-8000-000000000001',
    '{"start":"2026-07-06","end":"2026-07-12","label":"Jul 6–12"}'::jsonb, '2026-07-12T23:59:00+04:00'),
  ('11111111-0000-4000-8000-0000000000a2', '11111111-0000-4000-8000-000000000002',
    '{"start":"2026-07-06","end":"2026-07-09","label":"Jul 6–9 (Jul 10–11 missing)"}'::jsonb, '2026-07-09T23:59:00+04:00'),
  ('11111111-0000-4000-8000-0000000000a3', '11111111-0000-4000-8000-000000000003',
    '{"start":"2026-06-29","end":"2026-07-05","label":"Jun 29 – Jul 5"}'::jsonb, '2026-07-05T23:59:00+04:00'),
  -- Northbrook history
  ('11111111-0000-4000-8000-0000000000a4', '11111111-0000-4000-8000-000000000001',
    '{"start":"2026-06-08","end":"2026-06-14","label":"Jun 8–14"}'::jsonb, '2026-06-14T23:59:00+04:00'),
  ('11111111-0000-4000-8000-0000000000a5', '11111111-0000-4000-8000-000000000001',
    '{"start":"2026-06-15","end":"2026-06-21","label":"Jun 15–21"}'::jsonb, '2026-06-21T23:59:00+04:00'),
  ('11111111-0000-4000-8000-0000000000a6', '11111111-0000-4000-8000-000000000001',
    '{"start":"2026-06-22","end":"2026-06-28","label":"Jun 22–28"}'::jsonb, '2026-06-28T23:59:00+04:00'),
  -- Birkenstock history
  ('11111111-0000-4000-8000-0000000000a7', '11111111-0000-4000-8000-000000000002',
    '{"start":"2026-06-08","end":"2026-06-14","label":"Jun 8–14"}'::jsonb, '2026-06-14T23:59:00+04:00'),
  ('11111111-0000-4000-8000-0000000000a8', '11111111-0000-4000-8000-000000000002',
    '{"start":"2026-06-15","end":"2026-06-21","label":"Jun 15–21"}'::jsonb, '2026-06-21T23:59:00+04:00'),
  ('11111111-0000-4000-8000-0000000000a9', '11111111-0000-4000-8000-000000000002',
    '{"start":"2026-06-22","end":"2026-06-28","label":"Jun 22–28"}'::jsonb, '2026-06-28T23:59:00+04:00'),
  -- Switchup history
  ('11111111-0000-4000-8000-0000000000aa', '11111111-0000-4000-8000-000000000003',
    '{"start":"2026-06-08","end":"2026-06-14","label":"Jun 8–14"}'::jsonb, '2026-06-14T23:59:00+04:00'),
  ('11111111-0000-4000-8000-0000000000ab', '11111111-0000-4000-8000-000000000003',
    '{"start":"2026-06-15","end":"2026-06-21","label":"Jun 15–21"}'::jsonb, '2026-06-21T23:59:00+04:00'),
  ('11111111-0000-4000-8000-0000000000ac', '11111111-0000-4000-8000-000000000003',
    '{"start":"2026-06-22","end":"2026-06-28","label":"Jun 22–28"}'::jsonb, '2026-06-28T23:59:00+04:00');

-- Evidence items ------------------------------------------------------------
-- Northbrook, stitched week (E1–E7)
insert into evidence_items (snapshot_id, item_key, source, source_of_truth, metric_key, metric_label, value, value_display, delta_pct, delta_label, polarity, note, series) values
  ('11111111-0000-4000-8000-0000000000a1', 'E1', 'Google Ads', null, 'spend', 'Performance Max spend', 39800, '$39.8K', 21, '+21%', 'neutral', 'prospecting scale-up', '[5100,5300,5500,5700,5900,6100,6200]'::jsonb),
  ('11111111-0000-4000-8000-0000000000a1', 'E2', 'Google Ads', null, 'spend', 'Search spend (brand)', 14800, '$14.8K', 9, '+9%', 'neutral', 'steady', '[2000,2050,2100,2150,2150,2150,2200]'::jsonb),
  ('11111111-0000-4000-8000-0000000000a1', 'E3', 'Tracker', 'Google Ads', 'cpa_cpo', 'Cost per order', 26.40, '$26.40', -9, '−9% vs $29 target', 'lower_is_better', 'held under target during scale', '[27.1,26.8,26.6,25.5,26.0,26.4,26.6]'::jsonb),
  -- metric_key is null: this is a SHARE of conversions, not a conversion count.
  -- Typing it as `conversions` would collide with the real order count (E6).
  ('11111111-0000-4000-8000-0000000000a1', 'E4', 'Google Ads', null, null, '"Objections" asset group', 31, '31% of conversions', null, '$23.10 CPO — cheapest in account', 'higher_is_better', 'launched wk of Jun 22', null),
  ('11111111-0000-4000-8000-0000000000a1', 'E5', 'Google Ads', null, 'cpc', 'Avg CPC', 1.84, '$1.84', 12, '+12% midweek, settled Fri', 'lower_is_better', 'auction pressure, seasonal', '[1.70,1.78,1.92,1.98,1.95,1.82,1.79]'::jsonb),
  ('11111111-0000-4000-8000-0000000000a1', 'E6', 'Tracker', 'Google Ads', 'conversions', 'Weekly orders', 2067, '2,067', 14, '+14% · target 1,900', 'higher_is_better', 'comfortably past target', '[280,290,300,295,305,300,297]'::jsonb),
  ('11111111-0000-4000-8000-0000000000a1', 'E7', 'Tracker', 'Google Ads', 'ncac', 'NCAC', 34.20, '$34.20', -4, '−4% · target $36', 'lower_is_better', 'growth is new customers, not just repeats', '[35.1,34.8,34.5,33.9,33.7,34.2,34.6]'::jsonb);
-- Birkenstock, reviewed week (Triple-Whale-sourced via Tracker)
insert into evidence_items (snapshot_id, item_key, source, source_of_truth, metric_key, metric_label, value, value_display, delta_pct, delta_label, polarity, note, series) values
  ('11111111-0000-4000-8000-0000000000a2', 'G1', 'Tracker', 'Triple Whale', 'nc_roas', 'NC ROAS', 2.35, '2.35x', 7, '+7% · target 2.2', 'higher_is_better', 'ahead of target', '[2.2,2.3,2.4,2.35]'::jsonb),
  ('11111111-0000-4000-8000-0000000000a2', 'G2', 'Tracker', 'Triple Whale', 'ncac', 'NCAC', 43.50, '$43.50', 6, '+6% · target $41', 'lower_is_better', 'drifting above target', '[41.0,42.2,43.1,43.5]'::jsonb),
  ('11111111-0000-4000-8000-0000000000a2', 'G3', 'Tracker', 'Triple Whale', 'revenue', 'Weekly revenue', 84200, '$84.2K', -4, '−4% · target $88k', 'higher_is_better', 'slightly under target', '[20500,21000,21200,21500]'::jsonb),
  ('11111111-0000-4000-8000-0000000000a2', 'G4', 'Tracker', 'Triple Whale', null, 'New vs returning', 58, '58% new / 42% returning', null, 'new-customer mix steady', 'neutral', 'founder trusts new-customer numbers', null);
-- Switchup, sent week (ROAS-led, this client speaks ROAS)
insert into evidence_items (snapshot_id, item_key, source, source_of_truth, metric_key, metric_label, value, value_display, delta_pct, delta_label, polarity, note, series) values
  ('11111111-0000-4000-8000-0000000000a3', 'H1', 'Google Ads', null, 'roas', 'Blended ROAS', 3.15, '3.15x', 5, '+5% · target 3.0', 'higher_is_better', 'continuing upward trajectory', '[2.9,3.0,3.05,3.1,3.15,3.15,3.15]'::jsonb),
  ('11111111-0000-4000-8000-0000000000a3', 'H2', 'Google Ads', null, 'aov', 'AOV', 98.40, '$98.40', 2, '+2% · target $96', 'higher_is_better', 'modestly above target', '[95,96,97,98,98,99,98]'::jsonb),
  ('11111111-0000-4000-8000-0000000000a3', 'H3', 'Google Ads', null, 'spend', 'Media investment', 31500, '$31.5K', 3, '+3%', 'neutral', 'in line with seasonal plan', '[4300,4400,4500,4500,4600,4600,4600]'::jsonb);

-- History mini-snapshot items (3 per snapshot; no series — compact cards)
insert into evidence_items (snapshot_id, item_key, source, source_of_truth, metric_key, metric_label, value, value_display, delta_pct, delta_label, polarity, note, series) values
  -- Northbrook, Jun 8–14
  ('11111111-0000-4000-8000-0000000000a4', 'M1', 'Tracker', 'Google Ads', 'cpa_cpo', 'Cost per order', 28.10, '$28.10', -3, '−3% vs $29 target', 'lower_is_better', null, null),
  ('11111111-0000-4000-8000-0000000000a4', 'M2', 'Tracker', 'Google Ads', 'conversions', 'Weekly orders', 1955, '1,955', 3, '+3% · target 1,900', 'higher_is_better', null, null),
  ('11111111-0000-4000-8000-0000000000a4', 'M3', 'Google Ads', null, 'spend', 'Total spend', 48900, '$48.9K', 2, '+2%, inside plan band', 'neutral', null, null),
  -- Northbrook, Jun 15–21 (objections asset group launch)
  ('11111111-0000-4000-8000-0000000000a5', 'M1', 'Google Ads', null, 'cpa_cpo', '"Objections" asset group', 24.90, '$24.90 CPO', null, 'cheapest in account — early read', 'lower_is_better', 'launched this week', null),
  ('11111111-0000-4000-8000-0000000000a5', 'M2', 'Tracker', 'Google Ads', 'cpa_cpo', 'Cost per order', 27.60, '$27.60', -5, '−5% vs $29 target', 'lower_is_better', null, null),
  ('11111111-0000-4000-8000-0000000000a5', 'M3', 'Tracker', 'Google Ads', 'conversions', 'Weekly orders', 1988, '1,988', 2, '+2% · target 1,900', 'higher_is_better', null, null),
  -- Northbrook, Jun 22–28 (CPC climb begins — continuity thread)
  ('11111111-0000-4000-8000-0000000000a6', 'M1', 'Google Ads', null, 'cpc', 'Avg CPC', 1.71, '$1.71', 7, '+7% midweek climb', 'lower_is_better', 'auction pressure building', null),
  ('11111111-0000-4000-8000-0000000000a6', 'M2', 'Tracker', 'Google Ads', 'cpa_cpo', 'Cost per order', 27.90, '$27.90', -4, '−4% vs $29 target', 'lower_is_better', null, null),
  ('11111111-0000-4000-8000-0000000000a6', 'M3', 'Tracker', 'Google Ads', 'conversions', 'Weekly orders', 2010, '2,010', 1, '+1% · target 1,900', 'higher_is_better', null, null),
  -- Birkenstock, Jun 8–14
  ('11111111-0000-4000-8000-0000000000a7', 'M1', 'Tracker', 'Triple Whale', 'nc_roas', 'NC ROAS', 2.10, '2.10x', -5, '−5% vs 2.2 target', 'higher_is_better', null, null),
  ('11111111-0000-4000-8000-0000000000a7', 'M2', 'Tracker', 'Triple Whale', 'ncac', 'NCAC', 42.30, '$42.30', 3, '+3% · target $41', 'lower_is_better', null, null),
  ('11111111-0000-4000-8000-0000000000a7', 'M3', 'Tracker', 'Triple Whale', 'revenue', 'Weekly revenue', 81500, '$81.5K', -7, '−7% · target $88k', 'higher_is_better', null, null),
  -- Birkenstock, Jun 15–21
  ('11111111-0000-4000-8000-0000000000a8', 'M1', 'Tracker', 'Triple Whale', null, 'New vs returning', 55, '55% new / 45% returning', null, 'mix improving', 'neutral', null, null),
  ('11111111-0000-4000-8000-0000000000a8', 'M2', 'Tracker', 'Triple Whale', 'ncac', 'NCAC', 41.20, '$41.20', null, 'at target $41', 'lower_is_better', null, null),
  ('11111111-0000-4000-8000-0000000000a8', 'M3', 'Tracker', 'Triple Whale', 'nc_roas', 'NC ROAS', 2.18, '2.18x', 4, '+4% wk on wk', 'higher_is_better', null, null),
  -- Birkenstock, Jun 22–28
  ('11111111-0000-4000-8000-0000000000a9', 'M1', 'Tracker', 'Triple Whale', 'revenue', 'Weekly revenue', 79800, '$79.8K', -9, '−9% · target $88k', 'higher_is_better', null, null),
  ('11111111-0000-4000-8000-0000000000a9', 'M2', 'Tracker', 'Triple Whale', 'nc_roas', 'NC ROAS', 2.15, '2.15x', -1, '−1% wk on wk', 'higher_is_better', null, null),
  ('11111111-0000-4000-8000-0000000000a9', 'M3', 'Tracker', 'Triple Whale', 'ncac', 'NCAC', 42.80, '$42.80', 4, '+4% · target $41', 'lower_is_better', null, null),
  -- Switchup, Jun 8–14
  ('11111111-0000-4000-8000-0000000000aa', 'M1', 'Google Ads', null, 'roas', 'Blended ROAS', 3.00, '3.00x', null, 'on the 3.0 benchmark', 'higher_is_better', null, null),
  ('11111111-0000-4000-8000-0000000000aa', 'M2', 'Google Ads', null, 'aov', 'AOV', 94.80, '$94.80', -1, '−1% · target $96', 'higher_is_better', null, null),
  ('11111111-0000-4000-8000-0000000000aa', 'M3', 'Google Ads', null, 'spend', 'Media investment', 29600, '$29.6K', 1, '+1%', 'neutral', null, null),
  -- Switchup, Jun 15–21
  ('11111111-0000-4000-8000-0000000000ab', 'M1', 'Google Ads', null, 'aov', 'AOV', 96.90, '$96.90', 2, '+2% · target $96', 'higher_is_better', null, null),
  ('11111111-0000-4000-8000-0000000000ab', 'M2', 'Google Ads', null, 'roas', 'Blended ROAS', 3.05, '3.05x', 2, '+2% wk on wk', 'higher_is_better', null, null),
  ('11111111-0000-4000-8000-0000000000ab', 'M3', 'Google Ads', null, 'spend', 'Media investment', 30200, '$30.2K', 2, '+2%', 'neutral', null, null),
  -- Switchup, Jun 22–28
  ('11111111-0000-4000-8000-0000000000ac', 'M1', 'Google Ads', null, 'roas', 'Blended ROAS', 3.10, '3.10x', 2, '+2% wk on wk', 'higher_is_better', null, null),
  ('11111111-0000-4000-8000-0000000000ac', 'M2', 'Google Ads', null, 'aov', 'AOV', 97.50, '$97.50', 1, '+1% · target $96', 'higher_is_better', null, null),
  ('11111111-0000-4000-8000-0000000000ac', 'M3', 'Google Ads', null, 'spend', 'Media investment', 30800, '$30.8K', 2, '+2%', 'neutral', null, null);

-- Narratives ----------------------------------------------------------------
insert into narratives (id, client_id, snapshot_id, week, status, channel, email_greeting, reviewed_at, sent_at) values
  ('11111111-0000-4000-8000-0000000000b1', '11111111-0000-4000-8000-000000000001', '11111111-0000-4000-8000-0000000000a1',
    '{"start":"2026-07-06","end":"2026-07-12","label":"Jul 6–12"}'::jsonb, 'drafted', 'slack', 'Hi Dana,', null, null),
  ('11111111-0000-4000-8000-0000000000b2', '11111111-0000-4000-8000-000000000002', '11111111-0000-4000-8000-0000000000a2',
    '{"start":"2026-07-06","end":"2026-07-09","label":"Jul 6–9"}'::jsonb, 'reviewed', 'email', 'Hi Lina,', '2026-07-10T09:00:00+04:00', null),
  ('11111111-0000-4000-8000-0000000000b3', '11111111-0000-4000-8000-000000000003', '11111111-0000-4000-8000-0000000000a3',
    '{"start":"2026-06-29","end":"2026-07-05","label":"Jun 29 – Jul 5"}'::jsonb, 'sent', 'email', 'Hi Rowan,', '2026-07-06T08:30:00+04:00', '2026-07-06T09:00:00+04:00');

-- Claims (fact = >=1 evidence ref; plan = zero refs — enforced by CHECK) -----
insert into claims (id, narrative_id, ord, kind, text, evidence_refs) values
  -- Northbrook (the fully-stitched narrative)
  ('66666666-0000-4000-8000-000000000001', '11111111-0000-4000-8000-0000000000b1', 1, 'fact',
    'We deliberately scaled last week — total spend came to $54.6k, up 18% on the week before, with most of the increase going into Performance Max prospecting.',
    '[{"snapshotId":"11111111-0000-4000-8000-0000000000a1","itemId":"E1"},{"snapshotId":"11111111-0000-4000-8000-0000000000a1","itemId":"E2"}]'::jsonb),
  ('66666666-0000-4000-8000-000000000002', '11111111-0000-4000-8000-0000000000b1', 2, 'fact',
    'Cost per order held at $26.40 — about 9% under our $29 line — even with the extra budget, which is the signal we wanted before pushing further.',
    '[{"snapshotId":"11111111-0000-4000-8000-0000000000a1","itemId":"E3"}]'::jsonb),
  ('66666666-0000-4000-8000-000000000003', '11111111-0000-4000-8000-0000000000b1', 3, 'fact',
    'The objection-handling asset group is now the account''s engine: 31% of all conversions at the cheapest cost per order of any group.',
    '[{"snapshotId":"11111111-0000-4000-8000-0000000000a1","itemId":"E4"}]'::jsonb),
  ('66666666-0000-4000-8000-000000000004', '11111111-0000-4000-8000-0000000000b1', 4, 'fact',
    'CPCs climbed about 12% midweek from auction pressure, then settled by Friday — worth knowing about, not worth reacting to.',
    '[{"snapshotId":"11111111-0000-4000-8000-0000000000a1","itemId":"E5"}]'::jsonb),
  ('66666666-0000-4000-8000-000000000005', '11111111-0000-4000-8000-0000000000b1', 5, 'fact',
    'That put us at 2,067 orders for the week, comfortably past the 1,900 target.',
    '[{"snapshotId":"11111111-0000-4000-8000-0000000000a1","itemId":"E6"}]'::jsonb),
  ('66666666-0000-4000-8000-000000000006', '11111111-0000-4000-8000-0000000000b1', 6, 'fact',
    'New-customer acquisition cost came in at $34.20, 4% better than last week — the growth is coming from new buyers, not just repeat orders.',
    '[{"snapshotId":"11111111-0000-4000-8000-0000000000a1","itemId":"E7"}]'::jsonb),
  ('66666666-0000-4000-8000-000000000007', '11111111-0000-4000-8000-0000000000b1', 7, 'plan',
    '→ This week: shift roughly 15% of budget toward the objection asset group and hold everything else steady while CPCs normalise.',
    '[]'::jsonb),
  -- Birkenstock (bullets-only, new-customer-led)
  ('66666666-0000-4000-8000-000000000011', '11111111-0000-4000-8000-0000000000b2', 1, 'fact',
    'New-customer ROAS came in at 2.35 for the week, ahead of the 2.2 target.',
    '[{"snapshotId":"11111111-0000-4000-8000-0000000000a2","itemId":"G1"}]'::jsonb),
  ('66666666-0000-4000-8000-000000000012', '11111111-0000-4000-8000-0000000000b2', 2, 'fact',
    'New customers made up 58% of orders, with the mix holding steady week on week.',
    '[{"snapshotId":"11111111-0000-4000-8000-0000000000a2","itemId":"G4"}]'::jsonb),
  ('66666666-0000-4000-8000-000000000013', '11111111-0000-4000-8000-0000000000b2', 3, 'fact',
    'New-customer acquisition cost was $43.50, about 6% above the $41 target — worth watching.',
    '[{"snapshotId":"11111111-0000-4000-8000-0000000000a2","itemId":"G2"}]'::jsonb),
  ('66666666-0000-4000-8000-000000000014', '11111111-0000-4000-8000-0000000000b2', 4, 'fact',
    'Weekly revenue landed at $84.2k, roughly 4% under the $88k target.',
    '[{"snapshotId":"11111111-0000-4000-8000-0000000000a2","itemId":"G3"}]'::jsonb),
  ('66666666-0000-4000-8000-000000000015', '11111111-0000-4000-8000-0000000000b2', 5, 'plan',
    '→ This week: tighten the prospecting audience signals to bring NCAC back toward target.',
    '[]'::jsonb),
  -- Switchup (formal, ROAS-led, trajectory framing)
  ('66666666-0000-4000-8000-000000000021', '11111111-0000-4000-8000-0000000000b3', 1, 'fact',
    'Blended ROAS closed the week at 3.15, ahead of the 3.0 benchmark and continuing the upward trajectory from the prior fortnight.',
    '[{"snapshotId":"11111111-0000-4000-8000-0000000000a3","itemId":"H1"}]'::jsonb),
  ('66666666-0000-4000-8000-000000000022', '11111111-0000-4000-8000-0000000000b3', 2, 'fact',
    'Average order value held firm at $98.40, modestly above the $96 target.',
    '[{"snapshotId":"11111111-0000-4000-8000-0000000000a3","itemId":"H2"}]'::jsonb),
  ('66666666-0000-4000-8000-000000000023', '11111111-0000-4000-8000-0000000000b3', 3, 'fact',
    'Media investment was $31.5k, up 3% week on week in line with the seasonal plan.',
    '[{"snapshotId":"11111111-0000-4000-8000-0000000000a3","itemId":"H3"}]'::jsonb),
  ('66666666-0000-4000-8000-000000000024', '11111111-0000-4000-8000-0000000000b3', 4, 'plan',
    '→ Looking ahead: maintain the current allocation while we build toward the quarter-end narrative.',
    '[]'::jsonb);

-- Flags ---------------------------------------------------------------------
insert into flags (id, client_id, kind, metric_label, delta_label, headline, diagnostic, draft_note, status, dismissal_reason, created_at) values
  ('11111111-0000-4000-8000-0000000000c1', '11111111-0000-4000-8000-000000000002', 'anomaly', 'NCAC', '+16% over 3 days',
    'NCAC up 16% over 3 days ($47.60 vs $41 target).',
    'Likely cause: new prospecting asset group widened reach faster than conversion volume. Similar incident May 18 recovered in 5 days after audience-signal tightening.',
    'Heads-up on Birkenstock: new-customer acquisition cost has drifted to $47.60 over the last three days, about 16% above the $41 target. We think the new prospecting asset group widened reach faster than conversions caught up — same shape as the May 18 dip, which recovered in five days once we tightened the audience signals. Doing that now; will keep you posted.',
    'open', null, '2026-07-12T20:00:00+04:00'),
  ('11111111-0000-4000-8000-0000000000c2', '11111111-0000-4000-8000-000000000003', 'anomaly', 'Cost per order', 'AOV-test noise',
    'Cost-per-order noise during the approved AOV test.',
    'CPO variance flagged during the approved AOV test window; expected while basket size shifts.',
    null, 'dismissed', 'Known — client approved AOV test, expect CPO noise through Jul 20.', '2026-07-08T11:00:00+04:00'),
  ('11111111-0000-4000-8000-0000000000c3', '11111111-0000-4000-8000-000000000002', 'freshness', 'Tracker freshness', 'Jul 10–11 missing',
    'Tracker rows missing for Jul 10–11.',
    'Per agency rules, Relay never interpolates missing days — narratives will exclude those dates and say so.',
    null, 'open', null, '2026-07-12T08:00:00+04:00');

-- Answer Desk threads -------------------------------------------------------
insert into answer_threads (id, client_id, question, created_at, answer) values
  ('11111111-0000-4000-8000-0000000000d1', '11111111-0000-4000-8000-000000000001',
    'Saw spend was really high on Thursday, everything ok?', '2026-07-10T18:30:00+04:00',
    '{"text":"Thursday ran $10.4k, about 38% over the daily average, because the new Performance Max campaign exited learning and Google front-loaded delivery. Cost per order actually came in 12% under target that day — this is the algorithm scaling a winner, not waste.","grounded":true,"evidenceRefs":[{"snapshotId":"11111111-0000-4000-8000-0000000000a1","itemId":"E1"},{"snapshotId":"11111111-0000-4000-8000-0000000000a1","itemId":"E3"}],"confidenceLabel":"Based on Google Ads data through Thu Jul 9."}'::jsonb),
  ('11111111-0000-4000-8000-0000000000d2', '11111111-0000-4000-8000-000000000001',
    'How is the new creative angle doing?', '2026-07-11T15:00:00+04:00',
    '{"text":"The objection-handling asset group is now driving 31% of conversions at $23.10 cost per order — the cheapest of any group in the account since it launched the week of Jun 22.","grounded":true,"evidenceRefs":[{"snapshotId":"11111111-0000-4000-8000-0000000000a1","itemId":"E4"}],"confidenceLabel":"Based on Google Ads data through Jul 12."}'::jsonb),
  ('11111111-0000-4000-8000-0000000000d3', '11111111-0000-4000-8000-000000000003',
    'Can you confirm July is still tracking to the Q3 plan we set?', '2026-07-13T06:15:00+04:00', null);

-- Timeline (per-client memory; newest surfaced first in UI). Every commentary
-- entry pins its data snapshot; bodies are the full artifact text.
insert into timeline_entries (id, client_id, type, date, summary, body, snapshot_id, ref_id) values
  -- Northbrook
  ('77777777-0000-4000-8000-000000000001', '11111111-0000-4000-8000-000000000001', 'commentary', '2026-06-15', 'Steady week — cost per order at $28.10, orders just over target.',
    'Steady week across the account. Cost per order came in at $28.10, just under the $29 line, with 1,955 orders — a hair past the 1,900 target. Spend held at $48.9k, inside the plan band. No changes recommended.',
    '11111111-0000-4000-8000-0000000000a4', null),
  ('77777777-0000-4000-8000-000000000002', '11111111-0000-4000-8000-000000000001', 'commentary', '2026-06-22', 'Launched the objection-handling asset group; early cost per order looks strong.',
    'We launched the objection-handling asset group this week. Early read: $24.90 cost per order, the cheapest in the account, on a small but growing share of orders. Overall cost per order $27.60 with 1,988 orders. Watching it closely before shifting budget.',
    '11111111-0000-4000-8000-0000000000a5', null),
  ('77777777-0000-4000-8000-000000000003', '11111111-0000-4000-8000-000000000001', 'commentary', '2026-06-29', 'CPCs starting to climb midweek — watching auction pressure.',
    'CPCs started climbing midweek — average $1.71, up about 7% — which looks like auction pressure rather than anything we changed. Cost per order held at $27.90 and orders reached 2,010, so no client-facing concern yet. Flagging it so we''re not surprised next week.',
    '11111111-0000-4000-8000-0000000000a6', null),
  ('77777777-0000-4000-8000-000000000004', '11111111-0000-4000-8000-000000000001', 'commentary', '2026-07-06', 'Deliberate scale-up: spend $54.6k, cost per order held at $26.40, orders 2,067.',
    'Deliberate scale-up week: total spend $54.6k (+18%), cost per order held at $26.40 against the $29 line, 2,067 orders past the 1,900 target, and NCAC improved to $34.20. The midweek CPC climb we flagged last week settled by Friday. Full commentary drafted for Slack.',
    '11111111-0000-4000-8000-0000000000a1', '11111111-0000-4000-8000-0000000000b1'),
  ('77777777-0000-4000-8000-000000000005', '11111111-0000-4000-8000-000000000001', 'answer', '2026-07-10', 'Answered Dana on Thursday''s spend spike.',
    'Q: "Saw spend was really high on Thursday, everything ok?" — A: Thursday ran $10.4k, about 38% over the daily average, because the new Performance Max campaign exited learning and Google front-loaded delivery. Cost per order actually came in 12% under target that day — this is the algorithm scaling a winner, not waste.',
    '11111111-0000-4000-8000-0000000000a1', '11111111-0000-4000-8000-0000000000d1'),
  ('77777777-0000-4000-8000-000000000006', '11111111-0000-4000-8000-000000000001', 'answer', '2026-07-11', 'Answered Dana on the new creative angle.',
    'Q: "How is the new creative angle doing?" — A: The objection-handling asset group is now driving 31% of conversions at $23.10 cost per order — the cheapest of any group in the account since it launched the week of Jun 22.',
    '11111111-0000-4000-8000-0000000000a1', '11111111-0000-4000-8000-0000000000d2'),
  -- Birkenstock
  ('77777777-0000-4000-8000-000000000011', '11111111-0000-4000-8000-000000000002', 'commentary', '2026-06-15', 'NC ROAS 2.1, just under target.',
    'NC ROAS landed at 2.10 against the 2.2 target — close but under. NCAC $42.30, revenue $81.5k. Weekly bullets sent; the monthly deep-dive will carry the detail.',
    '11111111-0000-4000-8000-0000000000a7', null),
  ('77777777-0000-4000-8000-000000000012', '11111111-0000-4000-8000-000000000002', 'commentary', '2026-06-22', 'New-customer mix improving; NCAC steady.',
    'New-customer mix improved to 55% of orders. NCAC steady at $41.20, NC ROAS 2.18 — knocking on the 2.2 target. Bullets sent.',
    '11111111-0000-4000-8000-0000000000a8', null),
  ('77777777-0000-4000-8000-000000000013', '11111111-0000-4000-8000-000000000002', 'commentary', '2026-06-29', 'Revenue soft vs target; flagged prospecting efficiency.',
    'Revenue came in soft at $79.8k against the $88k target. NC ROAS 2.15, NCAC drifting to $42.80. Flagged prospecting efficiency as the thing to watch for the monthly deep-dive.',
    '11111111-0000-4000-8000-0000000000a9', null),
  ('77777777-0000-4000-8000-000000000014', '11111111-0000-4000-8000-000000000002', 'commentary', '2026-07-06', 'Weekly bullets: NC ROAS 2.35 over target, NCAC slightly high.',
    'Weekly bullets: NC ROAS 2.35 ahead of the 2.2 target, new customers 58% of orders, NCAC $43.50 slightly above the $41 target, revenue $84.2k. Jul 10–11 tracker rows are missing — those dates are excluded, not interpolated.',
    '11111111-0000-4000-8000-0000000000a2', '11111111-0000-4000-8000-0000000000b2'),
  ('77777777-0000-4000-8000-000000000015', '11111111-0000-4000-8000-000000000002', 'flag', '2026-07-12', 'Flagged NCAC drift to Sultan.',
    'NCAC up 16% over 3 days ($47.60 vs $41 target). Likely cause: new prospecting asset group widened reach faster than conversion volume. Similar incident May 18 recovered in 5 days after audience-signal tightening. Escalated; heads-up note drafted.',
    null, '11111111-0000-4000-8000-0000000000c1'),
  -- Switchup
  ('77777777-0000-4000-8000-000000000021', '11111111-0000-4000-8000-000000000003', 'commentary', '2026-06-15', 'Blended ROAS 3.0, on benchmark.',
    'Blended ROAS closed at 3.00, on benchmark. AOV $94.80 against the $96 target; media investment $29.6k. Formal update sent.',
    '11111111-0000-4000-8000-0000000000aa', null),
  ('77777777-0000-4000-8000-000000000022', '11111111-0000-4000-8000-000000000003', 'commentary', '2026-06-22', 'AOV climbing; trajectory positive.',
    'AOV climbed to $96.90, past the $96 target, with blended ROAS at 3.05. The quarter-to-date trajectory remains positive. Formal update sent.',
    '11111111-0000-4000-8000-0000000000ab', null),
  ('77777777-0000-4000-8000-000000000023', '11111111-0000-4000-8000-000000000003', 'commentary', '2026-06-29', 'ROAS 3.1; formal update sent.',
    'Blended ROAS reached 3.10 with AOV at $97.50. Media investment $30.8k, in line with the seasonal plan. Formal update sent.',
    '11111111-0000-4000-8000-0000000000ac', null),
  ('77777777-0000-4000-8000-000000000024', '11111111-0000-4000-8000-000000000003', 'commentary', '2026-07-06', 'Quarterly-arc update sent: ROAS 3.15, AOV $98.40.',
    'Quarterly-arc update sent: blended ROAS 3.15 ahead of the 3.0 benchmark, AOV $98.40, media investment $31.5k (+3%). Trajectory intact for the Q3 story.',
    '11111111-0000-4000-8000-0000000000a3', '11111111-0000-4000-8000-0000000000b3');

-- Who asked (0026): the demo's two answered exchanges came from Dana. Kept
-- as an update so the insert tuples above stay column-stable.
update timeline_entries set asked_by = 'Dana'
  where id in ('77777777-0000-4000-8000-000000000005',
               '77777777-0000-4000-8000-000000000006');

commit;
