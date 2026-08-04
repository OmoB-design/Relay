-- ============================================================================
-- Auth, part 2 of 2: row-level security. THIS IS THE SWITCH.
--
-- NEXT_PUBLIC_SUPABASE_ANON_KEY ships in the browser bundle, so until this runs
-- anyone who opens devtools can read every client's numbers. Auth without RLS is
-- a login screen in front of an open database.
--
-- BEFORE APPLYING:
--   1. SUPABASE_SERVICE_ROLE_KEY must be in .env.local. The nightly compile and
--      every CLI script run with no user; without it they are denied outright.
--   2. At least one admin must exist — see 0008_auth.sql's bootstrap note.
--
-- AFTER APPLYING: run `npx tsx scripts/verify-auth.ts`, which reports exactly
-- which of the two prerequisites is missing rather than failing opaquely.
-- ============================================================================

-- --- RLS --------------------------------------------------------------------

alter table profiles           enable row level security;
alter table client_assignments enable row level security;
alter table clients            enable row level security;
alter table accounts           enable row level security;
alter table kpis               enable row level security;
alter table sensitivities      enable row level security;
alter table stakeholders       enable row level security;
alter table evidence_snapshots enable row level security;
alter table evidence_items     enable row level security;
alter table narratives         enable row level security;
alter table claims             enable row level security;
alter table answer_threads     enable row level security;
alter table timeline_entries   enable row level security;
alter table flags              enable row level security;
alter table daily_rows         enable row level security;
alter table loom_briefs        enable row level security;
alter table loom_headlines     enable row level security;
alter table voice_profiles     enable row level security;
alter table edit_diffs         enable row level security;

-- profiles: read your own, admins read all. No insert (the trigger owns that),
-- no delete (revoke instead).
drop policy if exists profiles_select on profiles;
create policy profiles_select on profiles for select
  using (id = auth.uid() or is_active_admin());

drop policy if exists profiles_update_self on profiles;
create policy profiles_update_self on profiles for update
  using (id = auth.uid()) with check (id = auth.uid());

drop policy if exists profiles_update_admin on profiles;
create policy profiles_update_admin on profiles for update
  using (is_active_admin()) with check (is_active_admin());

-- assignments: buyers see their own; only admins change them.
drop policy if exists assignments_select on client_assignments;
create policy assignments_select on client_assignments for select
  using (buyer_id = auth.uid() or is_active_admin());

drop policy if exists assignments_write on client_assignments;
create policy assignments_write on client_assignments for all
  using (is_active_admin()) with check (is_active_admin());

-- clients: read and edit what you cover; only admins add or remove a client.
drop policy if exists clients_select on clients;
create policy clients_select on clients for select
  using (can_access_client(id));

drop policy if exists clients_update on clients;
create policy clients_update on clients for update
  using (can_access_client(id)) with check (can_access_client(id));

drop policy if exists clients_admin_write on clients;
create policy clients_admin_write on clients for all
  using (is_active_admin()) with check (is_active_admin());

-- Everything hanging directly off a client inherits the same predicate.
do $$
declare t text;
begin
  foreach t in array array[
    'accounts', 'kpis', 'sensitivities', 'stakeholders', 'evidence_snapshots',
    'narratives', 'answer_threads', 'timeline_entries', 'flags', 'daily_rows',
    'loom_briefs'
  ]
  loop
    execute format('drop policy if exists %I_by_client on %I', t, t);
    execute format(
      'create policy %I_by_client on %I for all
         using (can_access_client(client_id))
         with check (can_access_client(client_id))', t, t);
  end loop;
end $$;

-- Tables one hop away reach the client through their parent.
drop policy if exists evidence_items_by_snapshot on evidence_items;
create policy evidence_items_by_snapshot on evidence_items for all
  using (
    exists (
      select 1 from evidence_snapshots s
      where s.id = evidence_items.snapshot_id and can_access_client(s.client_id)
    )
  )
  with check (
    exists (
      select 1 from evidence_snapshots s
      where s.id = evidence_items.snapshot_id and can_access_client(s.client_id)
    )
  );

drop policy if exists claims_by_narrative on claims;
create policy claims_by_narrative on claims for all
  using (
    exists (
      select 1 from narratives n
      where n.id = claims.narrative_id and can_access_client(n.client_id)
    )
  )
  with check (
    exists (
      select 1 from narratives n
      where n.id = claims.narrative_id and can_access_client(n.client_id)
    )
  );

drop policy if exists loom_headlines_by_brief on loom_headlines;
create policy loom_headlines_by_brief on loom_headlines for all
  using (
    exists (
      select 1 from loom_briefs b
      where b.id = loom_headlines.brief_id and can_access_client(b.client_id)
    )
  )
  with check (
    exists (
      select 1 from loom_briefs b
      where b.id = loom_headlines.brief_id and can_access_client(b.client_id)
    )
  );

-- The voice corpus is per BUYER, not per client. `buyer_key` is still the demo
-- text key from Phase 3; once real buyers exist it should become profiles.id,
-- at which point this narrows to "your own profile only". Until then any active
-- user may read and write it.
drop policy if exists voice_profiles_active on voice_profiles;
create policy voice_profiles_active on voice_profiles for all
  using (is_active_user()) with check (is_active_user());

drop policy if exists edit_diffs_active on edit_diffs;
create policy edit_diffs_active on edit_diffs for all
  using (is_active_user() and (client_id is null or can_access_client(client_id)))
  with check (is_active_user() and (client_id is null or can_access_client(client_id)));

-- ============================================================================
-- WHAT THIS DOES NOT COVER
--
-- The nightly compile (/api/cron/daily) and the CLI scripts run with no user, so
-- auth.uid() is null and every policy above denies them. They must use the
-- SERVICE ROLE key, which bypasses RLS — see lib/supabase.ts, where the service
-- client is reachable only inside runWithServiceRole(). That scope is
-- AsyncLocalStorage-based rather than a module flag on purpose: a module flag set
-- by a cron request would leak service access into user requests sharing the same
-- server instance.
-- ============================================================================
