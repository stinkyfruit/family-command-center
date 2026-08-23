-- The incentive migration added completed_on with a current-date default.
-- Backfill existing rows from their actual completion timestamp so historical
-- test completions are not treated as completed again today.
update public.chore_completions
set completed_on = (completed_at at time zone 'America/Chicago')::date
where completed_at is not null;
