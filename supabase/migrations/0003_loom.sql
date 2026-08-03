-- ============================================================================
-- Migration 0003 — Phase 4: Loom Brief tables + Northbrook's seeded brief.
-- Additive and idempotent. Headlines mirror the claims pattern: evidence refs
-- are required at the storage layer (a headline is a fact — it cites or it
-- doesn't ship).
-- ============================================================================

create table if not exists loom_briefs (
  id           uuid primary key,
  client_id    uuid not null references clients(id) on delete cascade,
  narrative_id uuid not null unique references narratives(id) on delete cascade,
  snapshot_id  uuid not null references evidence_snapshots(id),
  week         jsonb not null,
  risk         text not null,
  win          text not null,
  created_at   timestamptz not null default now()
);

create table if not exists loom_headlines (
  id            uuid primary key,
  brief_id      uuid not null references loom_briefs(id) on delete cascade,
  ord           int not null,
  text          text not null,
  evidence_refs jsonb not null,
  constraint loom_headline_evidence check (jsonb_array_length(evidence_refs) >= 1)
);

-- Seed: Northbrook's brief (SEED.md …00F1), from the stitched narrative -------
insert into loom_briefs (id, client_id, narrative_id, snapshot_id, week, risk, win, created_at) values
  ('11111111-0000-4000-8000-0000000000f1',
   '11111111-0000-4000-8000-000000000001',
   '11111111-0000-4000-8000-0000000000b1',
   '11111111-0000-4000-8000-0000000000a1',
   '{"start":"2026-07-06","end":"2026-07-12","label":"Jul 6–12"}'::jsonb,
   'CPCs ran hot midweek — settled by Friday, nothing to flag to Dana.',
   'New-customer acquisition cost is improving while we scale — growth quality is holding.',
   '2026-07-13T07:00:00+04:00')
on conflict (id) do nothing;

insert into loom_headlines (id, brief_id, ord, text, evidence_refs) values
  ('aaaaaaaa-0000-4000-8000-000000000001', '11111111-0000-4000-8000-0000000000f1', 1,
   'Cost per order $26.40 — 9% under target, even scaled up',
   '[{"snapshotId":"11111111-0000-4000-8000-0000000000a1","itemId":"E3"}]'::jsonb),
  ('aaaaaaaa-0000-4000-8000-000000000002', '11111111-0000-4000-8000-0000000000f1', 2,
   'Objection ads: 31% of orders, cheapest CPO in the account',
   '[{"snapshotId":"11111111-0000-4000-8000-0000000000a1","itemId":"E4"}]'::jsonb),
  ('aaaaaaaa-0000-4000-8000-000000000003', '11111111-0000-4000-8000-0000000000f1', 3,
   '2,067 orders — past target, NCAC down 4%',
   '[{"snapshotId":"11111111-0000-4000-8000-0000000000a1","itemId":"E6"},{"snapshotId":"11111111-0000-4000-8000-0000000000a1","itemId":"E7"}]'::jsonb)
on conflict (id) do nothing;
