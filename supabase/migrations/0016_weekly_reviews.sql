-- ============================================================================
-- The weekly review: reconciling what the buyers logged against what the
-- platform actually reported.
--
-- The tracker workbook is the buyers' record and Relay compiles it; Google Ads
-- (or Triple Whale, per client) is the source of truth. Neither of those is a
-- review. The review is the moment an admin sits down, compares the two, and
-- says so — and until now there was nowhere to record that they had.
--
-- NOT A FIXED DAY. There is no Friday job and no Sunday cron. A review is an
-- action an admin takes when they have time, over whatever week they choose, so
-- the row is created on demand and identified by the week it covers rather than
-- by when it was made.
--
-- `logged` is frozen INTO the row at review time rather than recomputed on
-- read. A buyer editing a daily row afterwards must not silently rewrite what
-- the admin looked at and signed off — the whole point is that the review is a
-- record of a judgement made against particular numbers.
--
-- `actual` is manual for now. The Google Ads connector will fill it; the shape
-- does not change when it does.
-- ============================================================================

do $$ begin
  create type weekly_review_status as enum ('pending', 'verified', 'discrepancy');
exception when duplicate_object then null; end $$;

create table if not exists weekly_reviews (
  id           uuid primary key,
  client_id    uuid not null references clients(id) on delete cascade,
  -- Monday and Sunday of the week under review, in the client's own calendar.
  week_start   date not null,
  week_end     date not null,
  reviewer_id  uuid references profiles(id),
  status       weekly_review_status not null default 'pending',
  -- metric key -> number. Both are partial: an admin reconciling spend alone is
  -- a real and useful review, and demanding all eight would mean none happen.
  logged       jsonb not null default '{}'::jsonb,
  actual       jsonb not null default '{}'::jsonb,
  note         text,
  created_at   timestamptz not null default now(),
  reviewed_at  timestamptz,

  -- One review per client per week. Reviewing twice is editing the first.
  unique (client_id, week_start),

  -- Calling it a discrepancy without saying what you found helps nobody later.
  constraint weekly_review_discrepancy_note check (
    status <> 'discrepancy'
    or (note is not null and length(trim(note)) > 0)
  )
);

create index if not exists weekly_reviews_week_idx
  on weekly_reviews (week_start desc);

alter table weekly_reviews enable row level security;

-- Buyers READ the reviews of clients they carry: the review doubles as their
-- performance feedback, and feedback nobody can see is not feedback. Only an
-- admin writes one — reviewing your own work is not a review.
drop policy if exists weekly_reviews_select on weekly_reviews;
create policy weekly_reviews_select on weekly_reviews for select
  using (private.can_access_client(client_id));

drop policy if exists weekly_reviews_admin_write on weekly_reviews;
create policy weekly_reviews_admin_write on weekly_reviews for all
  using (private.is_active_admin()) with check (private.is_active_admin());
