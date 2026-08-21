-- Universal desk chats: a chat is a CONVERSATION (one rail entry), not a
-- question. Chats belong to a buyer, may be seeded with a client scope from
-- the landing grid, and remember the last client a question resolved to so
-- follow-ups ("and last week?") stay on subject. Messages are the transcript.
-- The legacy answer_threads table stays: resolved desk answers dual-write
-- there so the client pages' Answers tab and Today keep working unchanged.

create table public.desk_chats (
  id uuid primary key,
  buyer_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  scope_client_id uuid references public.clients(id) on delete set null,
  last_client_id uuid references public.clients(id) on delete set null,
  created_at timestamptz not null default now(),
  last_message_at timestamptz not null default now()
);

create table public.desk_chat_messages (
  id uuid primary key,
  chat_id uuid not null references public.desk_chats(id) on delete cascade,
  role text not null check (role in ('user', 'agent')),
  body text not null,
  client_id uuid references public.clients(id) on delete set null,
  thought_secs integer,
  created_at timestamptz not null default now()
);

create index desk_chats_buyer_recency
  on public.desk_chats (buyer_id, last_message_at desc);
create index desk_chat_messages_chat_order
  on public.desk_chat_messages (chat_id, created_at);

-- Same posture as the rest of the schema: RLS on, no anon policies — all
-- access flows through the server's service role.
alter table public.desk_chats enable row level security;
alter table public.desk_chat_messages enable row level security;
