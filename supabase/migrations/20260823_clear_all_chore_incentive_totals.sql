-- Permanently remove chore completion and payout test data for one household.
create or replace function public.clear_all_chore_incentive_totals(target_household_id uuid)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  deleted_count integer;
  deleted_payouts integer;
begin
  if not public.is_household_adult(target_household_id) then
    raise exception 'Only a household adult can clear chore totals';
  end if;

  delete from public.chore_payouts
  where household_id = target_household_id;
  get diagnostics deleted_payouts = row_count;

  delete from public.chore_completions as completions
  using public.chores
  where completions.chore_id = chores.id
    and chores.household_id = target_household_id;
  get diagnostics deleted_count = row_count;

  return deleted_count + deleted_payouts;
end;
$$;

revoke all on function public.clear_all_chore_incentive_totals(uuid) from public;
grant execute on function public.clear_all_chore_incentive_totals(uuid) to authenticated;
