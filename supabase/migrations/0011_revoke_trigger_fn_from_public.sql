-- ============================================================================
-- Revoking from anon/authenticated was not enough.
--
-- PostgreSQL grants EXECUTE on every new function to the PUBLIC pseudo-role by
-- default, and PostgREST honours it — so /rest/v1/rpc/handle_new_user was still
-- reachable after 0010. This removes that default grant.
--
-- The trigger is unaffected: a trigger function fires with the table owner's
-- context and does not consult these grants. Verified by creating a throwaway
-- auth user and confirming its profile row still appeared.
-- ============================================================================

revoke execute on function public.handle_new_user() from public;
revoke execute on function public.handle_new_user() from anon, authenticated;
