-- ============================================================================
-- Auth, part 1 of 2: the tables. ADDITIVE — safe to apply at any time.
--
-- This creates the people and the access map. It does NOT turn on row-level
-- security; that is 0009_rls.sql, and it is deliberately a separate switch.
--
-- WHY SPLIT. The moment RLS is on, anything running without a signed-in user is
-- denied — the nightly compile and every CLI script. They need
-- SUPABASE_SERVICE_ROLE_KEY, which is set by hand. Applying both at once would
-- leave a broken environment that only the key holder can repair, so the tables
-- land first, auth is proved end to end, and then the door closes.
-- ============================================================================

-- --- Roles ------------------------------------------------------------------

do $$ begin
  create type user_role as enum ('admin', 'buyer');
exception when duplicate_object then null; end $$;

do $$ begin
  create type user_status as enum ('active', 'revoked');
exception when duplicate_object then null; end $$;

-- One row per auth user. `name` is what the page header greets.
create table if not exists profiles (
  id         uuid primary key references auth.users(id) on delete cascade,
  email      text not null,
  name       text not null default '',
  role       user_role not null default 'buyer',
  status     user_status not null default 'active',
  created_at timestamptz not null default now()
);

-- Which buyers cover which clients. Many-to-many on purpose: a client can have
-- a lead plus a backup, and a buyer carries several clients.
create table if not exists client_assignments (
  client_id   uuid not null references clients(id) on delete cascade,
  buyer_id    uuid not null references profiles(id) on delete cascade,
  assigned_at timestamptz not null default now(),
  primary key (client_id, buyer_id)
);

create index if not exists client_assignments_buyer_idx
  on client_assignments (buyer_id);

-- --- Profile creation -------------------------------------------------------
--
-- THE BOOTSTRAP, in full. Relay is invite-only and a fresh database has no users,
-- so the first account cannot come from the app. Create it out of band:
--
--   Supabase Dashboard → Authentication → Users → Add user
--     · email:    the agency owner
--     · password: set one, and tick "Auto Confirm User"
--
-- The trigger below sees it is the first profile and makes it an ADMIN. Sign in
-- at /login, then invite everyone else from /admin. No signup form exists, and
-- adding one would quietly turn an internal agency tool into an open product.

-- THE BOOTSTRAP. Invite-only needs an admin to send the first invite, and a
-- fresh database has no users at all. So the FIRST account created becomes the
-- admin; everyone after is a buyer until an admin says otherwise.
create or replace function handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  is_first boolean;
begin
  select count(*) = 0 into is_first from profiles;

  insert into profiles (id, email, name, role)
  values (
    new.id,
    coalesce(new.email, ''),
    coalesce(new.raw_user_meta_data->>'name', ''),
    case when is_first then 'admin'::user_role else 'buyer'::user_role end
  )
  on conflict (id) do nothing;

  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- --- Access predicates ------------------------------------------------------

-- SECURITY DEFINER on purpose: these read `profiles`, and a policy ON profiles
-- that called a plain function reading profiles would recurse.

create or replace function is_active_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from profiles
    where id = auth.uid() and role = 'admin' and status = 'active'
  );
$$;

create or replace function is_active_user()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from profiles where id = auth.uid() and status = 'active'
  );
$$;

-- An admin sees every client; a buyer sees the ones assigned to them. A revoked
-- account sees nothing, whatever its assignments still say.
create or replace function can_access_client(cid uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select is_active_admin()
      or (
        is_active_user()
        and exists (
          select 1 from client_assignments
          where client_id = cid and buyer_id = auth.uid()
        )
      );
$$;

