-- PIN-gated lists are stored separately, never included in the ordinary lists query.
create table private.household_private_lists (
  id uuid primary key default gen_random_uuid(), household_id uuid not null references public.households(id) on delete cascade,
  title text not null, icon text not null default 'gift', created_at timestamptz not null default now()
);
create table private.household_private_list_items (
  id uuid primary key default gen_random_uuid(), list_id uuid not null references private.household_private_lists(id) on delete cascade,
  title text not null, completed boolean not null default false, created_at timestamptz not null default now()
);
revoke all on private.household_private_lists, private.household_private_list_items from public, anon, authenticated;

create or replace function public.get_private_lists(p_pin text) returns jsonb language plpgsql security definer set search_path = extensions, public, private as $$
declare target_household uuid; stored_hash text;
begin
 select household_id into target_household from public.members where user_id = auth.uid() limit 1;
 select pin_hash into stored_hash from private.household_settings_pins where household_id = target_household;
 if stored_hash is null or stored_hash <> crypt(p_pin, stored_hash) then raise exception 'That PIN is not right.'; end if;
 return coalesce((select jsonb_agg(jsonb_build_object('id', l.id, 'title', l.title, 'icon', l.icon, 'items', coalesce((select jsonb_agg(jsonb_build_object('id', i.id, 'title', i.title, 'done', i.completed) order by i.created_at) from private.household_private_list_items i where i.list_id=l.id), '[]'::jsonb)) order by l.created_at) from private.household_private_lists l where l.household_id=target_household), '[]'::jsonb);
end; $$;
revoke all on function public.get_private_lists(text) from public, anon;
grant execute on function public.get_private_lists(text) to authenticated;

create or replace function public.add_private_list(p_pin text, p_title text)
returns void language plpgsql security definer set search_path = extensions, public, private as $$
declare target_household uuid;
begin
 perform public.get_private_lists(p_pin);
 select household_id into target_household from public.members where user_id = auth.uid() limit 1;
 insert into private.household_private_lists (household_id, title) values (target_household, p_title);
end; $$;
create or replace function public.add_private_list_item(p_pin text, p_list_id uuid, p_title text)
returns void language plpgsql security definer set search_path = extensions, public, private as $$
begin
 perform public.get_private_lists(p_pin);
 insert into private.household_private_list_items (list_id, title)
 select p_list_id, p_title from private.household_private_lists l join public.members m on m.household_id=l.household_id where l.id=p_list_id and m.user_id=auth.uid();
end; $$;
revoke all on function public.add_private_list(text, text), public.add_private_list_item(text, uuid, text) from public, anon;
grant execute on function public.add_private_list(text, text), public.add_private_list_item(text, uuid, text) to authenticated;

create or replace function public.delete_private_list(p_pin text, p_list_id uuid)
returns void language plpgsql security definer set search_path = extensions, public, private as $$
begin
 perform public.get_private_lists(p_pin);
 delete from private.household_private_lists l using public.members m
 where l.id = p_list_id and l.household_id = m.household_id and m.user_id = auth.uid();
end; $$;
revoke all on function public.delete_private_list(text, uuid) from public, anon;
grant execute on function public.delete_private_list(text, uuid) to authenticated;
