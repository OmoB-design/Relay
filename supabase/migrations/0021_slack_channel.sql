-- Slack replaces WhatsApp as the second channel, product-wide (the Narrative
-- Nav set 552:4624 draws the pill as Email | Slack, and the decision followed).
-- The enum value is renamed in place — clients.channel and narratives.channel
-- both use the type, so every row follows — and the narrative's authored
-- condensed variant is renamed with it.
alter type public.channel rename value 'whatsapp' to 'slack';
alter table public.narratives rename column whatsapp_variant to slack_variant;
