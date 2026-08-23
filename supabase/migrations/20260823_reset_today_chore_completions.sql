-- Allow an adult to reset today's daily chore test records without changing
-- historical earnings or the payout ledger.
create or replace function public.reset_today_chore_completions(target_household_id uuid)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  deleted_count integer;
begin
  if not public.is_household_adult(target_household_id) then
    raise exception 'Only a household adult can reset chore completions';
  end if;

  if exists (
    select 1
    from public.chore_payouts
    where household_id = target_household_id
      and (paid_at at time zone 'America/Chicago')::date =
        (now() at time zone 'America/Chicago')::date
  ) then
    raise exception 'Undo today''s payout before resetting today''s chores';
  end if;

  delete from public.chore_completions as completions
  using public.chores
  where completions.chore_id = chores.id
    and chores.household_id = target_household_id
    and chores.is_daily
    and completions.completed_on = (now() at time zone 'America/Chicago')::date;

  get diagnostics deleted_count = row_count;
  return deleted_count;
end;
$$;

revoke all on function public.reset_today_chore_completions(uuid) from public;
grant execute on function public.reset_today_chore_completions(uuid) to authenticated;
