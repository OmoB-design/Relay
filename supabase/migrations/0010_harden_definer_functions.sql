-- ============================================================================
-- Close the SECURITY DEFINER endpoints Supabase's linter found.
--
-- PostgREST exposes every function in `public` as a REST endpoint, so the three
-- RLS predicates were callable at /rest/v1/rpc/can_access_client and friends.
-- Moving them to a schema PostgREST does not expose removes the endpoint while
-- leaving them callable from policies — the only place they are needed.
--
-- usage/execute is granted explicitly, because an RLS policy expression is
-- evaluated as the QUERYING role, not the table owner. Skip the grant and every
-- policy silently denies.
--
-- ORDER MATTERS: repoint every policy before dropping the public copies, or the
-- drop fails on the dependency.
-- ============================================================================

create schema if not exists private;
grant usage on schema private to anon, authenticated, service_role;

create or replace function private.is_active_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from profiles
    where id = auth.uid() and role = 'admin' and status = 'active'
  );
$$;

create or replace function private.is_active_user()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from profiles where id = auth.uid() and status = 'active'
  );
$$;

create or replace function private.can_access_client(cid uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select private.is_active_admin()
      or (
        private.is_active_user()
        and exists (
          select 1 from client_assignments
          where client_id = cid and buyer_id = auth.uid()
        )
      );
$$;

grant execute on function private.is_active_admin() to anon, authenticated, service_role;
grant execute on function private.is_active_user() to anon, authenticated, service_role;
grant execute on function private.can_access_client(uuid) to anon, authenticated, service_role;

-- Every policy from 0009_rls.sql, repointed at private.*
drop policy if exists profiles_select on profiles;
create policy profiles_select on profiles for select
  using (id = auth.uid() or private.is_active_admin());

drop policy if exists profiles_update_admin on profiles;
create policy profiles_update_admin on profiles for update
  using (private.is_active_admin()) with check (private.is_active_admin());

drop policy if exists assignments_select on client_assignments;
create policy assignments_select on client_assignments for select
  using (buyer_id = auth.uid() or private.is_active_admin());

drop policy if exists assignments_write on client_assignments;
create policy assignments_write on client_assignments for all
  using (private.is_active_admin()) with check (private.is_active_admin());

drop policy if exists clients_select on clients;
create policy clients_select on clients for select
  using (private.can_access_client(id));

drop policy if exists clients_update on clients;
create policy clients_update on clients for update
  using (private.can_access_client(id)) with check (private.can_access_client(id));

drop policy if exists clients_admin_write on clients;
create policy clients_admin_write on clients for all
  using (private.is_active_admin()) with check (private.is_active_admin());

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
         using (private.can_access_client(client_id))
         with check (private.can_access_client(client_id))', t, t);
  end loop;
end $$;

drop policy if exists evidence_items_by_snapshot on evidence_items;
create policy evidence_items_by_snapshot on evidence_items for all
  using (exists (select 1 from evidence_snapshots s
    where s.id = evidence_items.snapshot_id and private.can_access_client(s.client_id)))
  with check (exists (select 1 from evidence_snapshots s
    where s.id = evidence_items.snapshot_id and private.can_access_client(s.client_id)));

drop policy if exists claims_by_narrative on claims;
create policy claims_by_narrative on claims for all
  using (exists (select 1 from narratives n
    where n.id = claims.narrative_id and private.can_access_client(n.client_id)))
  with check (exists (select 1 from narratives n
    where n.id = claims.narrative_id and private.can_access_client(n.client_id)));

drop policy if exists loom_headlines_by_brief on loom_headlines;
create policy loom_headlines_by_brief on loom_headlines for all
  using (exists (select 1 from loom_briefs b
    where b.id = loom_headlines.brief_id and private.can_access_client(b.client_id)))
  with check (exists (select 1 from loom_briefs b
    where b.id = loom_headlines.brief_id and private.can_access_client(b.client_id)));

drop policy if exists voice_profiles_active on voice_profiles;
create policy voice_profiles_active on voice_profiles for all
  using (private.is_active_user()) with check (private.is_active_user());

drop policy if exists edit_diffs_active on edit_diffs;
create policy edit_diffs_active on edit_diffs for all
  using (private.is_active_user() and (client_id is null or private.can_access_client(client_id)))
  with check (private.is_active_user() and (client_id is null or private.can_access_client(client_id)));

drop function if exists public.is_active_admin();
drop function if exists public.is_active_user();
drop function if exists public.can_access_client(uuid);

revoke execute on function public.handle_new_user() from anon, authenticated;
