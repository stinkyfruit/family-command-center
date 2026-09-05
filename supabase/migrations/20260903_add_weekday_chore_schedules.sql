-- Store recurring weekday chores as ISO-independent JavaScript/Postgres day
-- numbers: Sunday = 0 through Saturday = 6.
alter table public.chores
  add column if not exists weekday_schedule smallint[];

alter table public.chores
  drop constraint if exists chores_weekday_schedule_check;

alter table public.chores
  add constraint chores_weekday_schedule_check check (
    weekday_schedule is null
    or (
      cardinality(weekday_schedule) between 1 and 7
      and weekday_schedule <@ array[0, 1, 2, 3, 4, 5, 6]::smallint[]
    )
  );

create index if not exists chores_household_weekday_schedule_idx
  on public.chores (household_id, weekday_schedule);

create or replace function public.snapshot_chore_reward()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  source_chore public.chores%rowtype;
begin
  select * into source_chore
  from public.chores
  where id = new.chore_id;

  if source_chore.id is null then
    raise exception 'Chore does not exist';
  end if;

  new.completed_on := (now() at time zone 'America/Chicago')::date;
  new.reward_cents := source_chore.reward_cents;
  new.reward_stars := source_chore.reward_stars;

  if source_chore.is_daily
    or extract(dow from (now() at time zone 'America/Chicago')::date)::smallint = any(coalesce(source_chore.weekday_schedule, array[]::smallint[])) then
    if exists (
      select 1 from public.chore_completions
      where chore_id = new.chore_id and completed_on = new.completed_on
    ) then
      raise exception 'This chore is already complete for today';
    end if;
  elsif exists (select 1 from public.chore_completions where chore_id = new.chore_id) then
    raise exception 'This one-time chore is already complete';
  end if;

  return new;
end;
$$;

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
    and (chores.is_daily or extract(dow from (now() at time zone 'America/Chicago')::date)::smallint = any(coalesce(chores.weekday_schedule, array[]::smallint[])))
    and completions.completed_on = (now() at time zone 'America/Chicago')::date;

  get diagnostics deleted_count = row_count;
  return deleted_count;
end;
$$;
