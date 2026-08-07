-- ============================================================================
-- Gives every client a send moment.
--
-- The admin overview decides "late" by comparing the client's local clock
-- against cadence.anchorDay + anchorTime. A client with neither can only be
-- reported as unscheduled — which is honest, but it means the page says nothing
-- about most of the roster, and the roster is the whole point of the page.
--
-- Monday 09:00 is not a guess. It is the agency's standing arrangement: buyers
-- send weekly client updates on Mondays, and the Slack Google Ads bot is
-- already configured to post weekly on Monday. This records what is already
-- true rather than deciding anything new.
--
-- Read in the CLIENT's account_timezone, not the agency's. Only fills what is
-- missing, so a client whose day has been set deliberately keeps it.
-- ============================================================================

update clients
set cadence = cadence || jsonb_build_object('anchorDay', 'mon')
where cadence->>'anchorDay' is null;

update clients
set cadence = cadence || jsonb_build_object('anchorTime', '09:00')
where cadence->>'anchorTime' is null;
