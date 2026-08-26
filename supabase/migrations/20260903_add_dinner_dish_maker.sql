-- Store which family member made a dish without rewriting the original migration.
alter table public.family_dinner_dishes
  add column if not exists made_by_member_id uuid references public.members(id) on delete set null;

alter table public.family_dinner_dishes
  add column if not exists made_by_member_name text;
