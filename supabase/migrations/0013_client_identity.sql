-- ============================================================================
-- Two things a client needs before an admin can create one from the app.
--
-- TRACKER_TAB. Ingestion matches a spreadsheet tab to a client by NAME, case
-- insensitively (lib/ingestion/index.ts). That works only while "what the
-- agency calls this client" and "what the tab is called" are the same string,
-- and it fails silently the moment they diverge: the tab lands in
-- `unmatchedTabs`, the client compiles with no data, and Today reports the row
-- as absent. Renaming a client in Relay is enough to cause it.
--
-- So the link becomes explicit. Nullable, and ingestion falls back to the name
-- when it is null, because every client that exists today was matched by name
-- and none of them should change behaviour. New clients created through the
-- admin form always set it.
--
-- DOMAIN. The client's own website, which is what a logo is looked up by. Stored
-- now because the form is the only place anyone will ever know it; nothing
-- fetches it yet — see config.clientLogos for how a mark is resolved today.
-- ============================================================================

alter table clients add column if not exists tracker_tab text;
alter table clients add column if not exists domain text;

-- Every existing client was matched by name, so that IS its tab. Recording it
-- makes the fallback dead code for them rather than load-bearing.
update clients set tracker_tab = name where tracker_tab is null;

-- Two clients pointing at one tab means one of them silently gets the other's
-- numbers. Case-insensitive, because the match is.
create unique index if not exists clients_tracker_tab_key
  on clients (lower(tracker_tab));
