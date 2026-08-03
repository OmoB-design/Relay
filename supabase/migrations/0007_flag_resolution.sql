-- ============================================================================
-- Migration 0007 — flags can be RESOLVED, not just dismissed.
--
-- The detection engine only ever inserted. When the underlying number moved
-- back inside its threshold, the flag stayed open forever, quoting a figure
-- that was no longer true.
--
-- Three states now, and the distinction matters:
--   open      — the condition currently holds
--   resolved  — the condition no longer holds; the ENGINE retracted it
--   dismissed — a human judged it unimportant, and said why
--
-- Resolving is not dismissing. A dismissal is a decision that needs a reason
-- (the Mitzi rule); a resolution is just the data changing its mind. Keeping
-- them apart preserves the audit trail: "we looked and decided to ignore it"
-- reads very differently from "it stopped being true".
-- ============================================================================

alter type flag_status add value if not exists 'resolved';

alter table flags add column if not exists resolved_at timestamptz;

comment on column flags.resolved_at is
  'Set when the detection engine retracted this flag because its condition no longer held. Distinct from dismissal_reason, which records a human judgement.';
