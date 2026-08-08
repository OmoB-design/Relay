-- ============================================================================
-- View vs edit, per buyer per client.
--
-- Until now an assignment was binary: assigned meant full access. The spec asks
-- for a permission on the link, so it becomes an enum — but deliberately a
-- SMALL one. Every permission dimension multiplies the RLS predicates and the
-- number of ways a page can be subtly wrong, and a subtly wrong RLS predicate
-- is the worst kind of bug there is: it fails invisibly, or it fails open. Two
-- values, and more only when a real case turns up.
--
-- DEFAULT 'edit', AND BACKFILLED 'edit'. Every existing assignment already
-- carries full access; anything else would silently demote the whole team the
-- moment this ran, and "the buyers can't confirm any more" is not a bug you
-- want to discover from a buyer.
--
-- THE POLICY SPLIT IS THE REAL WORK. Every child policy today is `for all`,
-- which covers select, insert, update and delete with ONE predicate. Adding a
-- read-only tier means reads and writes need different predicates, so each of
-- those policies becomes four. Postgres denies any command with no permissive
-- policy, so missing one does not fail open — it locks the table. That is the
-- right way round, but it means the set below has to be complete.
--
-- can_access_client keeps its meaning exactly: CAN SEE. Everything that reads
-- is untouched. can_edit_client is the new, narrower one.
-- ============================================================================

do $$ begin
  create type assignment_permission as enum ('view', 'edit');
exception when duplicate_object then null; end $$;

alter table client_assignments
  add column if not exists permission assignment_permission not null default 'edit';

-- Explicit, not just the column default: the default only applies to rows
-- inserted after it existed.
update client_assignments set permission = 'edit' where permission is null;

-- --- Predicates -------------------------------------------------------------

-- Unchanged semantics. An assignment of ANY permission can see the client.
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

-- The new, narrower one. An admin always can; a buyer only with 'edit'.
create or replace function private.can_edit_client(cid uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select private.is_active_admin()
      or (
        private.is_active_user()
        and exists (
          select 1 from client_assignments
          where client_id = cid
            and buyer_id = auth.uid()
            and permission = 'edit'
        )
      );
$$;

grant execute on function private.can_edit_client(uuid) to anon, authenticated, service_role;

-- --- Policies ---------------------------------------------------------------

-- The client row itself: everyone assigned can read it, only 'edit' can change
-- it. (clients_admin_write already covers insert/delete for admins.)
drop policy if exists clients_update on clients;
create policy clients_update on clients for update
  using (private.can_edit_client(id)) with check (private.can_edit_client(id));

-- Everything hanging directly off a client. One `for all` becomes four, so
-- that select can use the wider predicate and the rest the narrower one.
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
    execute format('drop policy if exists %I_select on %I', t, t);
    execute format('drop policy if exists %I_insert on %I', t, t);
    execute format('drop policy if exists %I_update on %I', t, t);
    execute format('drop policy if exists %I_delete on %I', t, t);

    execute format(
      'create policy %I_select on %I for select
         using (private.can_access_client(client_id))', t, t);
    execute format(
      'create policy %I_insert on %I for insert
         with check (private.can_edit_client(client_id))', t, t);
    execute format(
      'create policy %I_update on %I for update
         using (private.can_edit_client(client_id))
         with check (private.can_edit_client(client_id))', t, t);
    execute format(
      'create policy %I_delete on %I for delete
         using (private.can_edit_client(client_id))', t, t);
  end loop;
end $$;

-- The three that hang off a client indirectly, through their parent.
drop policy if exists evidence_items_by_snapshot on evidence_items;
drop policy if exists evidence_items_select on evidence_items;
create policy evidence_items_select on evidence_items for select
  using (exists (select 1 from evidence_snapshots s
    where s.id = evidence_items.snapshot_id and private.can_access_client(s.client_id)));
drop policy if exists evidence_items_write on evidence_items;
create policy evidence_items_write on evidence_items for all
  using (exists (select 1 from evidence_snapshots s
    where s.id = evidence_items.snapshot_id and private.can_edit_client(s.client_id)))
  with check (exists (select 1 from evidence_snapshots s
    where s.id = evidence_items.snapshot_id and private.can_edit_client(s.client_id)));

drop policy if exists claims_by_narrative on claims;
drop policy if exists claims_select on claims;
create policy claims_select on claims for select
  using (exists (select 1 from narratives n
    where n.id = claims.narrative_id and private.can_access_client(n.client_id)));
drop policy if exists claims_write on claims;
create policy claims_write on claims for all
  using (exists (select 1 from narratives n
    where n.id = claims.narrative_id and private.can_edit_client(n.client_id)))
  with check (exists (select 1 from narratives n
    where n.id = claims.narrative_id and private.can_edit_client(n.client_id)));

drop policy if exists loom_headlines_by_brief on loom_headlines;
drop policy if exists loom_headlines_select on loom_headlines;
create policy loom_headlines_select on loom_headlines for select
  using (exists (select 1 from loom_briefs b
    where b.id = loom_headlines.brief_id and private.can_access_client(b.client_id)));
drop policy if exists loom_headlines_write on loom_headlines;
create policy loom_headlines_write on loom_headlines for all
  using (exists (select 1 from loom_briefs b
    where b.id = loom_headlines.brief_id and private.can_edit_client(b.client_id)))
  with check (exists (select 1 from loom_briefs b
    where b.id = loom_headlines.brief_id and private.can_edit_client(b.client_id)));

-- Edit diffs are the record of a buyer's own edits, so writing one requires
-- being able to edit the client it belongs to.
drop policy if exists edit_diffs_active on edit_diffs;
drop policy if exists edit_diffs_select on edit_diffs;
create policy edit_diffs_select on edit_diffs for select
  using (private.is_active_user()
     and (client_id is null or private.can_access_client(client_id)));
drop policy if exists edit_diffs_write on edit_diffs;
create policy edit_diffs_write on edit_diffs for all
  using (private.is_active_user()
     and (client_id is null or private.can_edit_client(client_id)))
  with check (private.is_active_user()
     and (client_id is null or private.can_edit_client(client_id)));

-- weekly_reviews (0016) is already admin-write only; a buyer of either
-- permission reads their own clients' reviews and writes none.
