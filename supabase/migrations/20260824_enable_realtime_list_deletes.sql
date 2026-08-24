-- Supabase Realtime needs the deleted row's household_id to evaluate the
-- household filter on the lists subscription.
alter table public.lists replica identity full;
