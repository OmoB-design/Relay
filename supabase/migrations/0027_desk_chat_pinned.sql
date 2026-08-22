-- The rail learns to hold a pin (736:11148's Pinned variant).
--
-- A timestamp, not a boolean: pinned rows keep an order of their own, and
-- "when was this pinned" is the natural tiebreak. Null means unpinned —
-- the flat rail every chat lived in until now.

alter table public.desk_chats
  add column if not exists pinned_at timestamptz;

-- And to carry an unread mark (the row's dot turns blue-500): set from the
-- options menu, cleared the moment the chat is opened.
alter table public.desk_chats
  add column if not exists unread boolean not null default false;
