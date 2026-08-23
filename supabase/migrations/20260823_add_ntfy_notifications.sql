-- Per-member ntfy destinations for opt-in push notifications.
create table if not exists public.notification_subscriptions (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  member_id uuid not null references public.members(id) on delete cascade,
  provider text not null default 'ntfy' check (provider = 'ntfy'),
  topic text not null check (topic ~ '^[A-Za-z0-9_-]{1,64}$'),
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (member_id, provider)
);

create index if not exists notification_subscriptions_household_idx
  on public.notification_subscriptions (household_id, member_id, provider);

alter table public.notification_subscriptions enable row level security;

drop policy if exists "members manage their notification subscription" on public.notification_subscriptions;
create policy "members manage their notification subscription"
on public.notification_subscriptions for all
using (
  exists (
    select 1
    from public.members
    where members.id = notification_subscriptions.member_id
      and members.household_id = notification_subscriptions.household_id
      and members.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.members
    where members.id = notification_subscriptions.member_id
      and members.household_id = notification_subscriptions.household_id
      and members.user_id = auth.uid()
  )
);
