-- The daily routine template now totals $2.00 (200 cents) per child.
alter table public.households
  alter column chore_reward_target_cents set default 200;

update public.households
set chore_reward_target_cents = 200;

-- Keep the existing weighting while bringing the template total to $2.00.
update public.chores
set reward_cents = case lower(title)
  when 'potty' then 5
  when 'eat breakfast' then 10
  when 'put on clothes' then 10
  when 'brush hair' then 10
  when 'put on shoes' then 10
  when 'pack backpack' then 10
  when 'pack snacks' then 5
  when 'pack water' then 5
  when 'pack lunch' then 5
  when 'give mama a hug and/or kiss' then 10
  when 'change clothes and put school clothes in laundry basket' then 10
  when 'do homework' then 40
  when 'move body' then 10
  when 'eat dinner' then 10
  when 'bring plate to the sink' then 10
  when 'help mama and dada clean up dinner' then 10
  when 'take a bath/shower' then 5
  when 'brush teeth' then 5
  when 'read a book' then 20
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

-- Preserve historical completion snapshots. New completions use the current
-- template values through snapshot_chore_reward().

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
    (new.household_id, new.id, 'Potty', '🚽', 'Before school', 1, true, true, 5, 1),
    (new.household_id, new.id, 'Eat breakfast', '🍳', 'Before school', 2, true, true, 10, 1),
    (new.household_id, new.id, 'Put on clothes', '👕', 'Before school', 3, true, true, 10, 1),
    (new.household_id, new.id, 'Brush hair', '🪮', 'Before school', 4, true, true, 10, 1),
    (new.household_id, new.id, 'Put on shoes', '👟', 'Before school', 5, true, true, 10, 1),
    (new.household_id, new.id, 'Pack backpack', '🎒', 'Before school', 6, true, true, 10, 1),
    (new.household_id, new.id, 'Pack snacks', '🥨', 'Before school', 7, true, true, 5, 1),
    (new.household_id, new.id, 'Pack water', '💧', 'Before school', 8, true, true, 5, 1),
    (new.household_id, new.id, 'Pack lunch', '🍱', 'Before school', 9, true, true, 5, 1),
    (new.household_id, new.id, 'Give Mama a hug and/or kiss', '💗', 'Before school', 10, true, true, 10, 1),
    (new.household_id, new.id, 'Change clothes and put school clothes in laundry basket', '🧺', 'After school', 1, true, true, 10, 1),
    (new.household_id, new.id, 'Do Homework', '📚', 'After school', 2, true, true, 40, 1),
    (new.household_id, new.id, 'Move Body', '🏃', 'After school', 3, true, true, 10, 1),
    (new.household_id, new.id, 'Eat Dinner', '🍽️', 'After school', 4, true, true, 10, 1),
    (new.household_id, new.id, 'Bring plate to the sink', '🍽️', 'After school', 5, true, true, 10, 1),
    (new.household_id, new.id, 'Help Mama and Dada clean up dinner', '🍽️', 'After school', 6, true, true, 10, 2),
    (new.household_id, new.id, 'Take a bath/shower', '🫧', 'After school', 7, true, true, 5, 1),
    (new.household_id, new.id, 'Brush teeth', '🪥', 'After school', 8, true, true, 5, 1),
    (new.household_id, new.id, 'Read a book', '📖', 'After school', 9, true, true, 20, 1);

  return new;
end;
$$;

-- Payouts are append-only so earned chore history remains auditable. Household
-- members may read balances, but only an adult may record a payout.
create or replace function public.is_household_adult(target_household_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.members
    where household_id = target_household_id
      and user_id = auth.uid()
      and role = 'adult'
  );
$$;

create table if not exists public.chore_payouts (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  child_member_id uuid not null references public.members(id) on delete cascade,
  amount_cents integer not null check (amount_cents > 0 and amount_cents % 5 = 0),
  note text,
  created_by uuid references auth.users(id) on delete set null default auth.uid(),
  paid_at timestamptz not null default now()
);

create index if not exists chore_payouts_household_child_idx
  on public.chore_payouts (household_id, child_member_id, paid_at desc);

alter table public.chore_payouts enable row level security;

drop policy if exists "members read chore payouts" on public.chore_payouts;
create policy "members read chore payouts" on public.chore_payouts
  for select using (public.is_household_member(household_id));

drop policy if exists "adults add chore payouts" on public.chore_payouts;
create policy "adults add chore payouts" on public.chore_payouts
  for insert with check (
    public.is_household_adult(household_id)
    and created_by = auth.uid()
    and exists (
      select 1
      from public.members
      where members.id = child_member_id
        and members.household_id = chore_payouts.household_id
        and members.role = 'child'
    )
  );
