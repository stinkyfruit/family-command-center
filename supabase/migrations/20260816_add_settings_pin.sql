-- A small shared-device lock for the Settings screen. The PIN is stored only
-- as a bcrypt hash and is verified through these server-side functions.
create table if not exists private.household_settings_pins (
  household_id uuid primary key references public.households(id) on delete cascade,
  pin_hash text not null,
  updated_at timestamptz not null default now()
);

revoke all on private.household_settings_pins from public, anon, authenticated;

create or replace function public.household_settings_pin_configured()
returns boolean
language sql
security definer
set search_path = extensions, public, private
as $$
  select exists (
    select 1
    from private.household_settings_pins pins
    join public.members members on members.household_id = pins.household_id
    where members.user_id = auth.uid()
  );
$$;

create or replace function public.set_household_settings_pin(p_pin text)
returns void
language plpgsql
security definer
set search_path = extensions, public, private
as $$
declare
  target_household_id uuid;
begin
  if p_pin !~ '^\d{4,8}$' then
    raise exception 'Choose a PIN with 4 to 8 digits.';
  end if;

  select household_id into target_household_id
  from public.members
  where user_id = auth.uid()
  limit 1;

  if target_household_id is null then
    raise exception 'You are not part of a household.';
  end if;

  insert into private.household_settings_pins (household_id, pin_hash, updated_at)
  values (target_household_id, crypt(p_pin, gen_salt('bf')), now())
  on conflict (household_id) do update set
    pin_hash = excluded.pin_hash,
    updated_at = now();
end;
$$;

create or replace function public.verify_household_settings_pin(p_pin text)
returns boolean
language plpgsql
security definer
set search_path = extensions, public, private
as $$
declare
  stored_hash text;
begin
  select pins.pin_hash into stored_hash
  from private.household_settings_pins pins
  join public.members members on members.household_id = pins.household_id
  where members.user_id = auth.uid()
  limit 1;

  return stored_hash is not null and stored_hash = crypt(p_pin, stored_hash);
end;
$$;

revoke all on function public.household_settings_pin_configured() from public, anon;
revoke all on function public.set_household_settings_pin(text) from public, anon;
revoke all on function public.verify_household_settings_pin(text) from public, anon;
grant execute on function public.household_settings_pin_configured() to authenticated;
grant execute on function public.set_household_settings_pin(text) to authenticated;
grant execute on function public.verify_household_settings_pin(text) to authenticated;
