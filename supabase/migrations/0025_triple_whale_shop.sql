-- Layer C: the nightly compile can pull a client's daily row from the Triple
-- Whale API. Mapping is explicit and per-client, same contract as 0024's
-- Google Ads column: no shop, no API pull — the tracker path stands.

alter table clients add column triple_whale_shop text;
