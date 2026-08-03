-- ============================================================================
-- Migration 0005 — Phase 7.5a: the daily ritual.
--
-- A staged daily row per client per date per segment. The buyer confirms it
-- (one action = confirming the numbers AND reviewing them); an edit captures a
-- reason, mirroring the flag dismissal rule. Absent is never zero: a metric
-- Relay couldn't get is NULL with a stated reason, not 0.
-- Additive and idempotent.
-- ============================================================================

do $$ begin
  create type daily_row_status as enum ('staged', 'confirmed');
exception when duplicate_object then null; end $$;

-- Brand vs non-brand economics differ enormously (a real report showed 3.58 vs
-- 0.79 ROAS inside a 1.60 blended figure). Segment is first-class so a claim
-- can cite non-branded ROAS specifically. The tracker only yields 'overall';
-- Google Ads direct (7.5b) fills the other two.
do $$ begin
  create type metric_segment as enum ('overall', 'branded', 'non_branded');
exception when duplicate_object then null; end $$;

create table if not exists daily_rows (
  id              uuid primary key,
  client_id       uuid not null references clients(id) on delete cascade,
  date            date not null,
  segment         metric_segment not null default 'overall',
  source          data_source not null,
  source_of_truth source_of_truth,

  -- The eight tracker metrics. NULL = not available (see `unavailable`),
  -- never a stand-in zero. `sales` is numeric, not integer: Google Ads reports
  -- fractional conversions and rounding before deriving CPO drifts ~0.5%.
  spend    numeric,
  sales    numeric,
  revenue  numeric,
  roas     numeric,
  cpa_cpo  numeric,
  nc_roas  numeric,
  ncac     numeric,
  nvp      numeric,

  -- metric key -> human reason a value is absent, e.g.
  -- {"nc_roas": "This account does not report new vs. returning customers."}
  unavailable jsonb not null default '{}'::jsonb,

  status          daily_row_status not null default 'staged',
  edited          boolean not null default false,
  override_reason text,
  confirmed_at    timestamptz,
  confirmed_by    text,
  compiled_at     timestamptz not null default now(),

  unique (client_id, date, segment),

  -- Same reason-capture discipline as flag dismissal: changing a pulled number
  -- requires saying why (the rule the agency applies when flagging to Mitzi).
  constraint daily_row_override_reason check (
    not edited or (override_reason is not null and length(trim(override_reason)) > 0)
  )
);

create index if not exists daily_rows_client_date_idx
  on daily_rows (client_id, date desc);

-- Evidence gains the same two dimensions, so snapshots and daily rows speak
-- the same language.
alter table evidence_items add column if not exists segment metric_segment not null default 'overall';
alter table evidence_items add column if not exists unavailable_reason text;

-- Client Graph: daily cadence is a per-client permission, not a global setting.
-- Internal digests compile for every client; a client-FACING daily note only
-- goes out where the relationship allows it.
alter table clients add column if not exists daily_to_client boolean not null default false;
-- "Yesterday" is defined in the ad account's timezone, not the agency's.
alter table clients add column if not exists account_timezone text not null default 'Asia/Dubai';

-- Flags need de-duplication now that an engine raises them on a schedule —
-- the same drift must not re-raise every morning.
alter table flags add column if not exists dedupe_key text;
alter table flags add column if not exists metric_key text;
create unique index if not exists flags_dedupe_key_idx on flags (dedupe_key)
  where dedupe_key is not null;

-- Seed: Northbrook takes weekly framing only (its sensitivity forbids daily
-- client contact); Switchup accepts a daily line. Birkenstock stays weekly-lite.
update clients set daily_to_client = false
  where id = '11111111-0000-4000-8000-000000000001';
update clients set daily_to_client = true
  where id = '11111111-0000-4000-8000-000000000003';
