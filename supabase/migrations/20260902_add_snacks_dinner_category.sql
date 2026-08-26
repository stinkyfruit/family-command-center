-- Add Snacks without rewriting the original Family Dinners migration.
alter table public.family_dinner_dishes
  drop constraint if exists family_dinner_dishes_category_check;

alter table public.family_dinner_dishes
  add constraint family_dinner_dishes_category_check
  check (category in ('main', 'side', 'bread', 'snacks', 'dessert'));
