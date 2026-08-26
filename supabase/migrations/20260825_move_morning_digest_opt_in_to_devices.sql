-- Move the morning digest opt-in to each push subscription. Keep the
-- household preference columns for compatibility, but delivery is now
-- controlled by the device-level flag below.
alter table public.notification_devices
  add column if not exists morning_digest_enabled boolean not null default false;

-- Preserve the previous household-wide choice for devices that already
-- existed when the preference was household-wide.
update public.notification_devices as device
set morning_digest_enabled = true
from public.households as household
where household.id = device.household_id
  and household.morning_digest_enabled = true;

create index if not exists notification_devices_morning_digest_idx
  on public.notification_devices (household_id, morning_digest_enabled, enabled);
