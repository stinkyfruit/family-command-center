alter table public.households
  add column if not exists show_chores_tab boolean not null default true,
  add column if not exists show_wishlist_tab boolean not null default true;
