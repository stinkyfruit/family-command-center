-- Store one Web Push subscription per browser/device. The endpoint is a
-- capability URL and must remain private to the signed-in member who owns it.
create table if not exists public.notification_devices (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  member_id uuid not null references public.members(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  user_agent text,
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists notification_devices_member_idx
  on public.notification_devices (household_id, member_id, enabled);

alter table public.notification_devices enable row level security;

drop policy if exists "users manage their notification devices" on public.notification_devices;
create policy "users manage their notification devices"
on public.notification_devices for all
using (
  exists (
    select 1
    from public.members
    where members.id = notification_devices.member_id
      and members.household_id = notification_devices.household_id
      and members.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.members
    where members.id = notification_devices.member_id
      and members.household_id = notification_devices.household_id
      and members.user_id = auth.uid()
  )
);
