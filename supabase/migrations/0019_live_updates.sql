-- ============================================================================
-- Two small things that both come down to "the screen is out of date".
--
-- 1. REALTIME ON ASSIGNMENTS. An admin assigns a client; the buyer's Today does
--    not change until they reload, and nothing on screen suggests they should.
--    Publishing this one table lets a buyer's session hear about its own
--    assignments and re-render.
--
--    REPLICA IDENTITY FULL is the part that is easy to miss. With the default
--    identity a DELETE carries only the primary key, so a filter on buyer_id
--    cannot match one — meaning "client assigned" would arrive live but "client
--    taken away" would not, which is the direction that actually matters for
--    access. FULL puts the old row in the WAL record so the filter works.
--
--    The client ignores the payload entirely and just re-renders, so nothing
--    here widens what a buyer can read: RLS still governs every subsequent
--    query, and Supabase does not evaluate RLS on delete events anyway.
--
-- 2. team_seen_at. When a buyer accepts an invite the admin has no idea unless
--    they happen to be looking at Team. A toast is the wrong shape for this —
--    the event lands hours later, when nobody is watching — so instead the nav
--    carries a marker until the admin has actually looked. This column is the
--    "actually looked" half.
-- ============================================================================

alter table client_assignments replica identity full;

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'client_assignments'
  ) then
    alter publication supabase_realtime add table client_assignments;
  end if;
end $$;

-- Null means never opened Team, which is why the marker shows on a fresh admin
-- account: on first run every colleague is news.
alter table profiles add column if not exists team_seen_at timestamptz;
