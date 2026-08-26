-- Store one household-wide daily digest preference and a delivery ledger so
-- scheduled retries do not send the same morning notification twice.
alter table public.households
  add column if not exists morning_digest_enabled boolean not null default false,
  add column if not exists morning_digest_time time not null default '08:00:00';

create table if not exists public.notification_digest_deliveries (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  digest_date date not null,
  status text not null default 'pending' check (status in ('pending', 'sent', 'failed')),
  claimed_at timestamptz,
  sent_at timestamptz,
  error_message text,
  created_at timestamptz not null default now(),
  unique (household_id, digest_date)
);

create index if not exists notification_digest_deliveries_date_idx
  on public.notification_digest_deliveries (digest_date, status);

alter table public.notification_digest_deliveries enable row level security;

drop policy if exists "members access digest deliveries" on public.notification_digest_deliveries;
create policy "members access digest deliveries"
on public.notification_digest_deliveries for select
using (public.is_household_member(household_id));
