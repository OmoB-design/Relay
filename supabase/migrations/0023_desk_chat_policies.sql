-- 0022 enabled RLS on the desk chat tables with no policies — the app's
-- server client rides the signed-in user's session (anon key + JWT), so every
-- insert bounced. Same shape as the rest of 0009: a buyer owns their chats;
-- admins oversee.

create policy desk_chats_select on desk_chats for select
  using (buyer_id = auth.uid() or private.is_active_admin());

create policy desk_chats_write on desk_chats for all
  using (buyer_id = auth.uid()) with check (buyer_id = auth.uid());

create policy desk_chat_messages_select on desk_chat_messages for select
  using (
    exists (
      select 1 from desk_chats c
      where c.id = chat_id
        and (c.buyer_id = auth.uid() or private.is_active_admin())
    )
  );

create policy desk_chat_messages_write on desk_chat_messages for all
  using (
    exists (
      select 1 from desk_chats c
      where c.id = chat_id and c.buyer_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from desk_chats c
      where c.id = chat_id and c.buyer_id = auth.uid()
    )
  );
