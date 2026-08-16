-- The narrative workspace header prints "Drafted, Jul 26, 5:30" (node
-- 520:7956) and the side panel's cards carry the same stamp per status, so a
-- narrative needs to remember when it was drafted — until now only reviewed_at
-- and sent_at were kept.
alter table public.narratives
  add column if not exists drafted_at timestamptz not null default now();

-- Backfill from the best signal each row already carries: a narrative was
-- drafted no later than it was reviewed or sent; failing both, its week's end.
update public.narratives
set drafted_at = coalesce(
  reviewed_at,
  sent_at,
  ((week->>'end')::date + time '17:30') at time zone 'utc'
);
