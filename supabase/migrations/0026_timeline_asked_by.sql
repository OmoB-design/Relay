-- The timeline learns WHO asked (node 718:9677's question strip).
--
-- An answer entry renders the client-side voice above Relay's: avatar,
-- name, the question as asked. Attribution is the Slack layer's job — the
-- emoji-triggered ingestion will stamp the Slack display name here — but
-- the column lands now so the card renders truthfully today and Slack
-- only has to fill it in. Null means "asker unknown": the card shows the
-- question without a name line, never a guessed one.

alter table public.timeline_entries
  add column if not exists asked_by text;

-- The seeded demo exchanges name Dana in their summaries; the column says
-- so structurally now.
update public.timeline_entries
  set asked_by = 'Dana'
  where id in (
    '77777777-0000-4000-8000-000000000005',
    '77777777-0000-4000-8000-000000000006'
  )
  and asked_by is null;
