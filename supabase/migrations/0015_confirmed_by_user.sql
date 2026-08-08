-- ============================================================================
-- Who actually confirmed this row.
--
-- `confirmed_by` has been writing a hardcoded demo string since the daily rows
-- shipped (config.voice.demoBuyerKey). Every screen that says a row was
-- confirmed has therefore been unable to say BY WHOM, which is the one fact an
-- accountability product cannot be vague about: the buyer attests that
-- yesterday's numbers are right, and the admin reviews that attestation. An
-- attestation with no name on it is not an attestation.
--
-- A real foreign key, not another string. profiles rows are never deleted —
-- access is revoked instead, precisely so the audit trail keeps naming people
-- who have left — so the reference stays valid for the life of the row.
--
-- The old text column is kept rather than dropped. It holds the only record of
-- who confirmed the seeded demo rows, and throwing that away to tidy up would
-- lose history to gain nothing. New writes fill both: the id for truth, the
-- text for display when an id predates this migration.
-- ============================================================================

alter table daily_rows
  add column if not exists confirmed_by_id uuid references profiles(id);

create index if not exists daily_rows_confirmed_by_idx
  on daily_rows (confirmed_by_id);

-- A confirmed row must say who confirmed it. NOT VALID so the seeded rows,
-- which only have the text, are left alone; everything written from here is
-- checked.
alter table daily_rows drop constraint if exists daily_row_confirmed_by;
alter table daily_rows add constraint daily_row_confirmed_by check (
  status <> 'confirmed'
  or confirmed_by_id is not null
  or confirmed_by is not null
) not valid;
