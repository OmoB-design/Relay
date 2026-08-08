-- ============================================================================
-- Client logos: stored once, never fetched at render.
--
-- WHY NOT HOTLINK. Today draws a mark for every client on every load. Pointing
-- those <img> tags at the clients' own servers would mean N requests to N third
-- parties per page view, put the agency's browsing in the clients' access logs,
-- and break the moment one of their sites is down. So the bytes are fetched
-- ONCE — at creation, or when someone asks for a refresh — and served from
-- Supabase Storage thereafter.
--
-- WHY A PUBLIC BUCKET. These are brand logos: the same files the world already
-- downloads from the clients' own homepages. Signed URLs would add expiry
-- handling to every avatar in the app to protect something that is not secret.
-- Nothing else goes in this bucket.
--
-- logo_source records WHERE it came from, because the admin needs to know
-- whether to trust it: an apple-touch-icon scraped off a website is a guess in
-- a way an uploaded file is not. logo_error records why an automatic lookup
-- failed, so "no logo" can say something better than nothing.
-- ============================================================================

alter table clients add column if not exists logo_url text;
-- 'upload' | 'google-ads' | 'website'. Null means nothing has been resolved.
alter table clients add column if not exists logo_source text;
alter table clients add column if not exists logo_fetched_at timestamptz;
alter table clients add column if not exists logo_error text;

alter table clients drop constraint if exists clients_logo_source;
alter table clients add constraint clients_logo_source check (
  logo_source is null or logo_source in ('upload', 'google-ads', 'website')
);

-- The bucket. Public read; writes are admin-only, below.
insert into storage.buckets (id, name, public)
values ('client-logos', 'client-logos', true)
on conflict (id) do update set public = true;

drop policy if exists client_logos_read on storage.objects;
create policy client_logos_read on storage.objects for select
  using (bucket_id = 'client-logos');

-- Only an admin puts anything in here, and only through the app. A buyer has
-- no reason to change what a client's mark looks like.
drop policy if exists client_logos_admin_write on storage.objects;
create policy client_logos_admin_write on storage.objects for all
  using (bucket_id = 'client-logos' and private.is_active_admin())
  with check (bucket_id = 'client-logos' and private.is_active_admin());
