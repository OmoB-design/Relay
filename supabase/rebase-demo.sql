-- ============================================================================
-- Rebase the demo calendar.
--
-- seed.sql is authored against one specific week — Mon 6 – Sun 12 Jul 2026 —
-- and every narrative, snapshot, flag and timeline entry hangs off it. Weeks
-- later that data is history: yesterday has no row, the week's draft is stale,
-- and Today reports absences that are true but useless. This script moves the
-- whole demo forward so the seed week lands on the most recently COMPLETED
-- Monday–Sunday week.
--
-- Run it after seed.sql, and again whenever the demo has gone stale.
--
-- WHOLE WEEKS ONLY. A weekly cadence anchored to Monday must stay anchored to
-- Monday, and a Thursday spend spike must stay on a Thursday. Shifting by a raw
-- day count would silently move every weekday in the dataset.
--
-- IDEMPOTENT. The shift is computed from the data's own current position, so
-- running it twice is a no-op, not a double shift.
--
-- MIRRORS lib/demo/calendar.ts. If the anchor changes, change both.
-- ============================================================================

do $$
declare
  seed_week_end  date := date '2026-07-12';   -- the authored anchor (a Sunday)
  target_week_end date;
  shift_days     int;
  -- Anything that would land in the future gets pinned just behind now(). A demo
  -- may sit for weeks; a timeline entry dated next Tuesday is a visible bug.
  ceiling_ts     timestamptz := now() - interval '2 hours';
  ceiling_day    date := current_date;
begin
  -- The most recent Sunday strictly before today. isodow: Mon=1 … Sun=7, so the
  -- current (incomplete) week is never selected.
  target_week_end := current_date - extract(isodow from current_date)::int;

  -- Measure from where the data actually sits, not from the authored constant,
  -- so a second run shifts by zero.
  select coalesce(max((week->>'end')::date), seed_week_end) into seed_week_end
  from narratives;

  shift_days := target_week_end - seed_week_end;

  if shift_days = 0 then
    raise notice 'Demo calendar already current (week ends %). Nothing to do.', target_week_end;
    return;
  end if;

  raise notice 'Shifting demo by % days: week end % -> %', shift_days, seed_week_end, target_week_end;

  -- --- Weekly artifacts -----------------------------------------------------
  -- Labels are regenerated rather than shifted as text: "Jul 6–12" has to become
  -- "Jul 27 – Aug 2", and the month is only repeated when the period crosses one.
  update evidence_snapshots set
    period = jsonb_build_object(
      'start', to_char((period->>'start')::date + shift_days, 'YYYY-MM-DD'),
      'end',   to_char((period->>'end')::date   + shift_days, 'YYYY-MM-DD'),
      'label',
        case
          when to_char((period->>'start')::date + shift_days, 'Mon')
             = to_char((period->>'end')::date   + shift_days, 'Mon')
          then to_char((period->>'start')::date + shift_days, 'Mon FMDD') || '–'
             || to_char((period->>'end')::date  + shift_days, 'FMDD')
          else to_char((period->>'start')::date + shift_days, 'Mon FMDD') || ' – '
             || to_char((period->>'end')::date  + shift_days, 'Mon FMDD')
        end
    ),
    as_of = least(as_of + make_interval(days => shift_days), ceiling_ts);

  update narratives set
    week = jsonb_build_object(
      'start', to_char((week->>'start')::date + shift_days, 'YYYY-MM-DD'),
      'end',   to_char((week->>'end')::date   + shift_days, 'YYYY-MM-DD'),
      'label',
        case
          when to_char((week->>'start')::date + shift_days, 'Mon')
             = to_char((week->>'end')::date   + shift_days, 'Mon')
          then to_char((week->>'start')::date + shift_days, 'Mon FMDD') || '–'
             || to_char((week->>'end')::date  + shift_days, 'FMDD')
          else to_char((week->>'start')::date + shift_days, 'Mon FMDD') || ' – '
             || to_char((week->>'end')::date  + shift_days, 'Mon FMDD')
        end
    ),
    reviewed_at = least(reviewed_at + make_interval(days => shift_days), ceiling_ts),
    sent_at     = least(sent_at     + make_interval(days => shift_days), ceiling_ts);

  update loom_briefs set
    week = jsonb_build_object(
      'start', to_char((week->>'start')::date + shift_days, 'YYYY-MM-DD'),
      'end',   to_char((week->>'end')::date   + shift_days, 'YYYY-MM-DD'),
      'label',
        case
          when to_char((week->>'start')::date + shift_days, 'Mon')
             = to_char((week->>'end')::date   + shift_days, 'Mon')
          then to_char((week->>'start')::date + shift_days, 'Mon FMDD') || '–'
             || to_char((week->>'end')::date  + shift_days, 'FMDD')
          else to_char((week->>'start')::date + shift_days, 'Mon FMDD') || ' – '
             || to_char((week->>'end')::date  + shift_days, 'Mon FMDD')
        end
    ),
    created_at = least(created_at + make_interval(days => shift_days), ceiling_ts);

  -- --- Dated events ---------------------------------------------------------
  update timeline_entries set date = least(date + shift_days, ceiling_day);
  update flags set
    created_at  = least(created_at  + make_interval(days => shift_days), ceiling_ts),
    resolved_at = least(resolved_at + make_interval(days => shift_days), ceiling_ts);
  update answer_threads set
    created_at = least(created_at + make_interval(days => shift_days), ceiling_ts);
  update accounts set
    last_sync_at = least(last_sync_at + make_interval(days => shift_days), ceiling_ts);

  -- The captured voice corpus is real authored history, but leaving it months
  -- behind the rest makes "learned from your last 4 edits" read as a lie.
  update voice_profiles set
    created_at = least(created_at + make_interval(days => shift_days), ceiling_ts);
  update edit_diffs set
    created_at = least(created_at + make_interval(days => shift_days), ceiling_ts);

  -- --- Daily rows -----------------------------------------------------------
  -- Deliberately NOT shifted. These are compile output, not authored content:
  -- the next compile stages yesterday from the tracker, and a shifted row would
  -- claim a date the source was never read for. Clearing them lets the absence
  -- states show honestly until a compile runs.
  delete from daily_rows;

  raise notice 'Rebase complete. Run the daily compile to stage yesterday (%).', current_date - 1;
end $$;
