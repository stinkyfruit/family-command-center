-- Reward amounts are configured as a single daily routine template for now.
-- Keep money rewards on five-cent boundaries so the UI can show values such as
-- $0.10 and $0.15. A future migration can add per-day templates if needed.

alter table public.chores
  drop constraint if exists chores_reward_cents_check;

-- Normalize values created by the original incentive-pool migration before
-- enforcing the new five-cent boundary.
update public.chores
set reward_cents = round(reward_cents / 5.0)::smallint * 5;

-- Preserve the $10 daily pool for each child after rounding. Since every base
-- value is a multiple of five, the balancing adjustment is too.
with rounded as (
  select
    chores.id,
    chores.assignee_member_id,
    round(chores.reward_cents / 5.0)::integer * 5 as base_cents,
    row_number() over (
      partition by chores.assignee_member_id
      order by chores.sort_order desc, chores.id desc
    ) as adjustment_rank
  from public.chores
  where chores.is_daily
    and chores.routine in ('Before school', 'After school')
    and chores.assignee_member_id is not null
), adjusted as (
  select
    rounded.id,
    rounded.base_cents + case
      when rounded.adjustment_rank = 1 then
        1000 - sum(rounded.base_cents) over (partition by rounded.assignee_member_id)
      else 0
    end as reward_cents
  from rounded
)
update public.chores
set reward_cents = adjusted.reward_cents
from adjusted
where public.chores.id = adjusted.id;

-- Historical completion rows keep their snapshots, but normalize those
-- snapshots to match the corrected chore values as well.
update public.chore_completions
set reward_cents = public.chores.reward_cents
from public.chores
where public.chores.id = public.chore_completions.chore_id;

alter table public.chores
  add constraint chores_reward_cents_check
  check (reward_cents between 0 and 1000 and reward_cents % 5 = 0);

-- New children use the same daily template as existing children. The ordinary
-- chores are $0.55, potty is $0.10, dinner cleanup help is $0.20, and the
-- final ordinary chore receives the balancing remainder so the pool is $10.
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
    (new.household_id, new.id, 'Eat breakfast', '🍳', 'Before school', 2, true, true, 55, 1),
    (new.household_id, new.id, 'Put on clothes', '👕', 'Before school', 3, true, true, 55, 1),
    (new.household_id, new.id, 'Brush hair', '🪮', 'Before school', 4, true, true, 55, 1),
    (new.household_id, new.id, 'Put on shoes', '👟', 'Before school', 5, true, true, 55, 1),
    (new.household_id, new.id, 'Pack backpack', '🎒', 'Before school', 6, true, true, 55, 1),
    (new.household_id, new.id, 'Pack snacks', '🥨', 'Before school', 7, true, true, 55, 1),
    (new.household_id, new.id, 'Pack water', '💧', 'Before school', 8, true, true, 55, 1),
    (new.household_id, new.id, 'Pack lunch', '🍱', 'Before school', 9, true, true, 55, 1),
    (new.household_id, new.id, 'Give Mama a hug and/or kiss', '💗', 'Before school', 10, true, true, 55, 1),
    (new.household_id, new.id, 'Change clothes and put school clothes in laundry basket', '🧺', 'After school', 1, true, true, 55, 1),
    (new.household_id, new.id, 'Do Homework', '📚', 'After school', 2, true, true, 55, 1),
    (new.household_id, new.id, 'Move Body', '🏃', 'After school', 3, true, true, 55, 1),
    (new.household_id, new.id, 'Eat Dinner', '🍽️', 'After school', 4, true, true, 55, 1),
    (new.household_id, new.id, 'Bring plate to the sink', '🍽️', 'After school', 5, true, true, 55, 1),
    (new.household_id, new.id, 'Help Mama and Dada clean up dinner', '🍽️', 'After school', 6, true, true, 20, 2),
    (new.household_id, new.id, 'Take a bath/shower', '🫧', 'After school', 7, true, true, 55, 1),
    (new.household_id, new.id, 'Brush teeth', '🪥', 'After school', 8, true, true, 55, 1),
    (new.household_id, new.id, 'Read a book', '📖', 'After school', 9, true, true, 55, 1);

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
      and reward_cents = 55
    order by sort_order desc
    limit 1
  );

  return new;
end;
$$;
