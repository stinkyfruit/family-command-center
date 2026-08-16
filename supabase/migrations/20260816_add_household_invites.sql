-- Private, email-specific invitations for adults joining an existing home.
create table public.household_invites (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  created_by uuid not null references auth.users(id) on delete cascade,
  email text not null,
  display_name text,
  token uuid not null unique default gen_random_uuid(),
  expires_at timestamptz not null default (now() + interval '14 days'),
  accepted_at timestamptz,
  accepted_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create index household_invites_household_idx on public.household_invites (household_id);

alter table public.household_invites enable row level security;

create policy "members manage household invites" on public.household_invites for all
using (public.is_household_member(household_id))
with check (public.is_household_member(household_id));

create or replace function public.accept_household_invite(p_token uuid)
returns uuid
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  invitation public.household_invites%rowtype;
  member_id uuid;
  signed_in_email text := lower(coalesce(auth.jwt() ->> 'email', ''));
  fallback_name text;
begin
  select * into invitation
  from public.household_invites
  where token = p_token
    and accepted_at is null
    and expires_at > now()
  for update;

  if not found then
    raise exception 'This invitation is invalid, already used, or has expired.';
  end if;

  if signed_in_email = '' or signed_in_email <> lower(invitation.email) then
    raise exception 'This invitation was sent to a different email address.';
  end if;

  select id into member_id
  from public.members
  where household_id = invitation.household_id
    and user_id is null
    and invitation.display_name is not null
    and lower(display_name) = lower(invitation.display_name)
  limit 1;

  fallback_name := coalesce(nullif(invitation.display_name, ''), initcap(replace(split_part(invitation.email, '@', 1), '.', ' ')));

  if member_id is not null then
    update public.members
    set user_id = auth.uid(), role = 'adult', display_name = fallback_name
    where id = member_id;
  elsif not exists (
    select 1 from public.members
    where household_id = invitation.household_id and user_id = auth.uid()
  ) then
    insert into public.members (household_id, user_id, display_name, role)
    values (invitation.household_id, auth.uid(), fallback_name, 'adult');
  end if;

  update public.household_invites
  set accepted_at = now(), accepted_by = auth.uid()
  where id = invitation.id;

  return invitation.household_id;
end;
$$;

revoke all on function public.accept_household_invite(uuid) from public, anon;
grant execute on function public.accept_household_invite(uuid) to authenticated;
