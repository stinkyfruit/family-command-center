-- Track whether a family dinner was homemade or takeout.
alter table public.family_dinners
  add column if not exists meal_type text not null default 'homemade';

alter table public.family_dinners
  drop constraint if exists family_dinners_meal_type_check;

alter table public.family_dinners
  add constraint family_dinners_meal_type_check
  check (meal_type in ('homemade', 'takeout'));
