-- ============================================================================
-- Migration 0004 — a second Switchup waiting question, one the mock engine CAN
-- answer. Today's "Waiting on you" now demos both paths: this one resolves to a
-- grounded card; the existing Q3-plan question resolves to the honest miss.
-- ============================================================================

insert into answer_threads (id, client_id, question, created_at, answer) values
  ('11111111-0000-4000-8000-0000000000d4',
   '11111111-0000-4000-8000-000000000003',
   'How did blended ROAS land against the benchmark last week?',
   '2026-07-13T07:05:00+04:00',
   null)
on conflict (id) do nothing;
