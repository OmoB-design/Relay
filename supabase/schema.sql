-- ============================================================================
-- Relay schema (Postgres / Supabase). Mirrors lib/types.ts 1:1.
-- The claim and flag invariants from CLAUDE.md are enforced here as CHECK
-- constraints too, so "no unsourced sentence" and "no reasonless dismissal" hold
-- at the storage layer, not just in application code.
-- Idempotent: safe to run repeatedly (IF NOT EXISTS / drop-and-recreate types).
-- ============================================================================

-- Enums --------------------------------------------------------------------
do $$ begin
  create type data_source as enum ('Google Ads', 'Tracker');
exception when duplicate_object then null; end $$;

do $$ begin
  create type source_of_truth as enum ('Google Ads', 'Triple Whale');
exception when duplicate_object then null; end $$;

do $$ begin
  create type account_health as enum ('green', 'amber', 'red');
exception when duplicate_object then null; end $$;

do $$ begin
  create type channel as enum ('whatsapp', 'email');
exception when duplicate_object then null; end $$;

do $$ begin
  create type kpi_polarity as enum ('higher_is_better', 'lower_is_better', 'on_target');
exception when duplicate_object then null; end $$;

do $$ begin
  create type sensitivity_type as enum ('framing', 'cadence', 'metric-avoidance', 'tone');
exception when duplicate_object then null; end $$;

do $$ begin
  create type narrative_status as enum ('drafted', 'reviewed', 'sent');
exception when duplicate_object then null; end $$;

do $$ begin
  create type claim_kind as enum ('fact', 'plan');
exception when duplicate_object then null; end $$;

do $$ begin
  create type timeline_type as enum ('commentary', 'answer', 'flag');
exception when duplicate_object then null; end $$;

do $$ begin
  create type flag_kind as enum ('anomaly', 'freshness');
exception when duplicate_object then null; end $$;

do $$ begin
  create type flag_status as enum ('open', 'dismissed');
exception when duplicate_object then null; end $$;

-- Tables -------------------------------------------------------------------
create table if not exists clients (
  id             uuid primary key,
  name           text not null,
  currency       text not null default 'USD',
  source_of_truth source_of_truth not null,
  cadence        jsonb not null,        -- { primary, secondary?, anchorDay?, note? }
  channel        channel not null,
  descriptor     text
);

create table if not exists accounts (
  id           uuid primary key,
  client_id    uuid not null references clients(id) on delete cascade,
  platform     text not null default 'Google Ads' check (platform = 'Google Ads'),
  external_id  text not null,
  health       account_health not null,
  last_sync_at timestamptz not null
);

create table if not exists kpis (
  id            uuid primary key,
  client_id     uuid not null references clients(id) on delete cascade,
  label         text not null,           -- client's own language
  maps_to       text not null,           -- internal MetricKey
  target        numeric not null,
  polarity      kpi_polarity not null,
  format        text not null,           -- currency | count | ratio | percent
  tolerance_pct numeric,
  note          text
);

-- Sensitivities are STRUCTURED objects (typed), never a free-text notes blob.
create table if not exists sensitivities (
  id        uuid primary key,
  client_id uuid not null references clients(id) on delete cascade,
  type      sensitivity_type not null,
  text      text not null
);

create table if not exists stakeholders (
  id        uuid primary key,
  client_id uuid not null references clients(id) on delete cascade,
  name      text not null,
  role      text not null,
  gets      text not null                -- short | full | deck
);

create table if not exists evidence_snapshots (
  id        uuid primary key,
  client_id uuid not null references clients(id) on delete cascade,
  period    jsonb not null,              -- { start, end, label? }
  as_of     timestamptz not null
);

-- Evidence item key ("E1") is unique within its snapshot, not globally.
create table if not exists evidence_items (
  snapshot_id     uuid not null references evidence_snapshots(id) on delete cascade,
  item_key        text not null,         -- "E1" ... referenced by claims
  source          data_source not null,
  source_of_truth source_of_truth,       -- appended on Tracker chips
  metric_key      text,
  metric_label    text not null,
  value           numeric not null,
  value_display   text not null,
  delta_pct       numeric,
  delta_label     text not null,
  polarity        text,                  -- higher_is_better | lower_is_better | neutral
  note            text,
  series          jsonb,                 -- daily points for the sparkline
  primary key (snapshot_id, item_key)
);

create table if not exists narratives (
  id             uuid primary key,
  client_id      uuid not null references clients(id) on delete cascade,
  snapshot_id    uuid not null references evidence_snapshots(id),
  week           jsonb not null,
  status         narrative_status not null,
  channel        channel not null,
  email_greeting text,
  reviewed_at    timestamptz,
  sent_at        timestamptz
);

-- CHECK enforces the core invariant: a fact claim has >=1 evidence ref;
-- a plan claim has exactly 0. Storage-level "no unsourced sentence ships".
create table if not exists claims (
  id            uuid primary key,
  narrative_id  uuid not null references narratives(id) on delete cascade,
  ord           int not null,
  kind          claim_kind not null,
  text          text not null,
  evidence_refs jsonb not null default '[]'::jsonb,
  constraint claim_evidence_invariant check (
    (kind = 'fact' and jsonb_array_length(evidence_refs) >= 1) or
    (kind = 'plan' and jsonb_array_length(evidence_refs) = 0)
  )
);

create table if not exists timeline_entries (
  id          uuid primary key,
  client_id   uuid not null references clients(id) on delete cascade,
  type        timeline_type not null,
  date        date not null,
  summary     text not null,
  body        text,
  snapshot_id uuid references evidence_snapshots(id),
  ref_id      uuid
);

-- CHECK enforces reason-capture: a dismissed flag must carry a non-empty reason.
create table if not exists flags (
  id               uuid primary key,
  client_id        uuid not null references clients(id) on delete cascade,
  kind             flag_kind not null,
  metric_label     text not null,
  delta_label      text not null,
  headline         text not null,
  diagnostic       text not null,
  draft_note       text,
  status           flag_status not null default 'open',
  dismissal_reason text,
  created_at       timestamptz not null,
  constraint flag_dismissal_reason check (
    status <> 'dismissed' or (dismissal_reason is not null and length(trim(dismissal_reason)) > 0)
  )
);

create table if not exists answer_threads (
  id         uuid primary key,
  client_id  uuid not null references clients(id) on delete cascade,
  question   text not null,
  created_at timestamptz not null,
  answer     jsonb                       -- { text, grounded, evidenceRefs, confidenceLabel } | null = waiting
);
