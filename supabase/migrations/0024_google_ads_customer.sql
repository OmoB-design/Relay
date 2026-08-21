-- Phase 7.5b: the nightly compile can pull a client's daily row straight from
-- the Google Ads API instead of the agency tracker. The mapping is explicit
-- and per-client: no customer id, no API pull — the tracker path stands, so
-- rollout is one client at a time and reversible by clearing the column.

alter table clients add column google_ads_customer_id text;
