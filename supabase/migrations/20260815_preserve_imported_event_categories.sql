-- A manual category selection always wins over automatic Google title rules.
alter table public.events add column if not exists category_override boolean not null default false;
