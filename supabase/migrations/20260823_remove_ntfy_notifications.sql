-- Remove the ntfy notification feature's database objects after the feature
-- was reverted. This permanently deletes any saved ntfy topics and settings.
drop table if exists public.notification_subscriptions;
