-- Let each household use either money or stars, while keeping both values on
-- every chore so switching modes never loses the other reward configuration.
alter table public.households
  add column if not exists chore_reward_mode text not null default 'money'
    check (chore_reward_mode in ('money', 'stars')),
  add column if not exists chore_reward_target_cents integer not null default 1000
    check (chore_reward_target_cents > 0),
  add column if not exists chore_reward_target_stars integer not null default 20
    check (chore_reward_target_stars > 0);

alter table public.chores
  add column if not exists reward_cents smallint not null default 50
    check (reward_cents between 0 and 1000),
  add column if not exists reward_stars smallint not null default 1
    check (reward_stars between 0 and 100);

alter table public.chore_completions
  add column if not exists completed_on date not null default ((now() at time zone 'America/Chicago')::date),
  add column if not exists reward_cents smallint not null default 0
    check (reward_cents between 0 and 1000),
  add column if not exists reward_stars smallint not null default 0
    check (reward_stars between 0 and 100);

-- Keep the existing weekday routine pool at exactly $10 per child. Potty is a
-- small starter reward, helping with dinner is weighted higher, and the
-- remaining routine steps divide the rest of the pool.
with weighted as (
  select
    chores.id,
    chores.assignee_member_id,
    case
      when lower(chores.title) = 'potty' then 1
      when lower(chores.title) like '%set the table%'
        or lower(chores.title) like '%help mama%'
        or lower(chores.title) like '%help mom%'
        or lower(chores.title) like '%help dad%'
        or lower(chores.title) like '%clean up dinner%'
        or lower(chores.title) like '%bring plate%' then 2
      else 5
    end as weight,
    row_number() over (
      partition by chores.assignee_member_id
      order by chores.sort_order desc, chores.id desc
    ) as adjustment_rank
  from public.chores
  where chores.is_daily
    and chores.routine in ('Before school', 'After school')
    and chores.assignee_member_id is not null
), totals as (
  select assignee_member_id, sum(weight) as total_weight
  from weighted
  group by assignee_member_id
), allocated as (
  select
    weighted.id,
    weighted.adjustment_rank,
    floor(1000.0 * weighted.weight / totals.total_weight)::integer as base_cents
  from weighted
  join totals using (assignee_member_id)
), adjusted as (
  select
    allocated.id,
    allocated.base_cents + case
      when allocated.adjustment_rank = 1 then 1000 - sum(allocated.base_cents) over (partition by totals.assignee_member_id)
      else 0
    end as reward_cents
  from allocated
  join public.chores on chores.id = allocated.id
  join totals on totals.assignee_member_id = chores.assignee_member_id
)
update public.chores
set
  reward_cents = adjusted.reward_cents,
  reward_stars = case
    when lower(public.chores.title) = 'potty' then 1
    when lower(public.chores.title) like '%set the table%'
      or lower(public.chores.title) like '%help mama%' then 2
    when lower(public.chores.title) like '%help mom%'
      or lower(public.chores.title) like '%help dad%'
      or lower(public.chores.title) like '%clean up dinner%' then 2
    else 1
  end
from adjusted
where public.chores.id = adjusted.id;

-- Preserve the amount already earned by historical completions.
update public.chore_completions
set (reward_cents, reward_stars) = (
  select chores.reward_cents, chores.reward_stars
  from public.chores
  where chores.id = public.chore_completions.chore_id
);

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

  if source_chore.is_daily then
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

drop trigger if exists snapshot_chore_reward_before_insert on public.chore_completions;
create trigger snapshot_chore_reward_before_insert
before insert on public.chore_completions
for each row execute function public.snapshot_chore_reward();

-- Completion history is append-only. Chore deletion still removes its history
-- through the existing foreign-key cascade, but no family member can uncheck a
-- completed chore by deleting its completion row.
drop policy if exists "members access chore completions" on public.chore_completions;
drop policy if exists "members read chore completions" on public.chore_completions;
drop policy if exists "members add chore completions" on public.chore_completions;
create policy "members read chore completions" on public.chore_completions
  for select using (
    exists (
      select 1 from public.chores
      where chores.id = chore_id and public.is_household_member(chores.household_id)
    )
  );
create policy "members add chore completions" on public.chore_completions
  for insert with check (
    exists (
      select 1 from public.chores
      where chores.id = chore_id and public.is_household_member(chores.household_id)
    )
  );

-- New children receive the same daily and nightly routine structure as the
-- existing children. The app can still add one-off chores separately.
create or replace function public.seed_child_chore_routines()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.role <> 'child' then
    return new;
  end if;

  insert into public.chores (
    household_id, assignee_member_id, title, emoji, routine, sort_order,
    is_daily, is_fixed, reward_cents, reward_stars
  )
  values
    (new.household_id, new.id, 'Potty', '🚽', 'Before school', 1, true, true, 10, 1),
    (new.household_id, new.id, 'Eat breakfast', '🍳', 'Before school', 2, true, true, 10, 1),
    (new.household_id, new.id, 'Put on clothes', '👕', 'Before school', 3, true, true, 10, 1),
    (new.household_id, new.id, 'Brush hair', '🪮', 'Before school', 4, true, true, 10, 1),
    (new.household_id, new.id, 'Put on shoes', '👟', 'Before school', 5, true, true, 10, 1),
    (new.household_id, new.id, 'Pack backpack', '🎒', 'Before school', 6, true, true, 15, 1),
    (new.household_id, new.id, 'Pack snacks', '🥨', 'Before school', 7, true, true, 5, 1),
    (new.household_id, new.id, 'Pack water', '💧', 'Before school', 8, true, true, 5, 1),
    (new.household_id, new.id, 'Pack lunch', '🍱', 'Before school', 9, true, true, 5, 1),
    (new.household_id, new.id, 'Give Mama a hug and/or kiss', '💗', 'Before school', 10, true, true, 15, 1),
    (new.household_id, new.id, 'Change clothes and put school clothes in laundry basket', '🧺', 'After school', 1, true, true, 15, 1),
    (new.household_id, new.id, 'Do Homework', '📚', 'After school', 2, true, true, 50, 1),
    (new.household_id, new.id, 'Move Body', '🏃', 'After school', 3, true, true, 15, 1),
    (new.household_id, new.id, 'Eat Dinner', '🍽️', 'After school', 4, true, true, 10, 1),
    (new.household_id, new.id, 'Bring plate to the sink', '🍽️', 'After school', 5, true, true, 10, 1),
    (new.household_id, new.id, 'Help Mama and Dada clean up dinner', '🍽️', 'After school', 6, true, true, 15, 2),
    (new.household_id, new.id, 'Take a bath/shower', '🫧', 'After school', 7, true, true, 5, 1),
    (new.household_id, new.id, 'Brush teeth', '🪥', 'After school', 8, true, true, 5, 1),
    (new.household_id, new.id, 'Read a book', '📖', 'After school', 9, true, true, 30, 1);

  -- The weighted dinner helper is 20 cents; balance the final
  -- ordinary chore so the full daily/nightly pool is exactly $10.
  update public.chores
  set reward_cents = reward_cents + (1000 - (
    select sum(reward_cents)
    from public.chores
    where assignee_member_id = new.id
      and routine in ('Before school', 'After school')
  ))
  where id = (
    select id from public.chores
    where assignee_member_id = new.id
      and routine in ('Before school', 'After school')
      and reward_cents = 57
    order by sort_order desc
    limit 1
  );

  return new;
end;
$$;

drop trigger if exists seed_child_chore_routines_after_insert on public.members;
create trigger seed_child_chore_routines_after_insert
after insert on public.members
for each row execute function public.seed_child_chore_routines();
