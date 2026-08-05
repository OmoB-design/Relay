-- ============================================================================
-- Records the one thing the team list could not tell you: has this person
-- actually arrived, or have they only been invited?
--
-- inviteUserByEmail creates the auth user IMMEDIATELY, which fires
-- handle_new_user, which writes the profile row. So an invited buyer shows up in
-- the team list before they have even opened the email. That is the right
-- behaviour — it lets an admin assign their clients ahead of their first day —
-- but it makes someone who was invited an hour ago look identical to someone who
-- has worked here for a year.
--
-- auth.users cannot answer it. Clicking the invite link sets last_sign_in_at even
-- if the buyer then abandons the form without choosing a password, so "has signed
-- in" is not the same question as "is set up". Record the moment that actually
-- means set up: completing /auth/set-password.
-- ============================================================================

alter table profiles add column if not exists accepted_at timestamptz;

-- Everyone who exists right now predates this column, and they are all real,
-- set-up accounts. Backfill, rather than showing them as pending forever.
update profiles set accepted_at = created_at where accepted_at is null;
