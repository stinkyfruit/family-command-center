-- Use the family's shared daily routine template. The supplied values total
-- $2.50 (250 cents) per child per day; the star values continue to total 20.
alter table public.households
  alter column chore_reward_target_cents set default 250;

update public.households
set chore_reward_target_cents = 250;

-- Apply the template to existing daily routine chores. Values are kept on
-- five-cent boundaries so the rewards display as $0.05, $0.10, $0.15, etc.
update public.chores
set reward_cents = case lower(title)
  when 'potty' then 10
  when 'eat breakfast' then 10
  when 'put on clothes' then 10
  when 'brush hair' then 10
  when 'put on shoes' then 10
  when 'pack backpack' then 15
  when 'pack snacks' then 5
  when 'pack water' then 5
  when 'pack lunch' then 5
  when 'give mama a hug and/or kiss' then 15
  when 'change clothes and put school clothes in laundry basket' then 15
  when 'do homework' then 50
  when 'move body' then 15
  when 'eat dinner' then 10
  when 'bring plate to the sink' then 10
  when 'help mama and dada clean up dinner' then 15
  when 'take a bath/shower' then 5
  when 'brush teeth' then 5
  when 'read a book' then 30
  else reward_cents
end
where is_daily
  and routine in ('Before school', 'After school')
  and lower(title) in (
    'potty', 'eat breakfast', 'put on clothes', 'brush hair',
    'put on shoes', 'pack backpack', 'pack snacks', 'pack water',
    'pack lunch', 'give mama a hug and/or kiss',
    'change clothes and put school clothes in laundry basket',
    'do homework', 'move body', 'eat dinner', 'bring plate to the sink',
    'help mama and dada clean up dinner', 'take a bath/shower',
    'brush teeth', 'read a book'
  );

-- Completed chores retain the reward amount they earned under this template.
update public.chore_completions as completions
set reward_cents = chores.reward_cents
from public.chores
where chores.id = completions.chore_id;

-- New children receive the same daily template as existing children.
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

  return new;
end;
$$;
