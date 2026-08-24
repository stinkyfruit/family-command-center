-- Set the household daily reward target to $2.30 (230 cents).
alter table public.households
  alter column chore_reward_target_cents set default 230;

update public.households
set chore_reward_target_cents = 230;
