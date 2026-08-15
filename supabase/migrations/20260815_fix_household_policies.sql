-- Fix initial household creation under RLS.
-- Run this once in the Supabase SQL Editor after the first migration.

drop policy if exists "members access household" on public.households;

create policy "authenticated users create households"
on public.households for insert to authenticated
with check (created_by = auth.uid());

create policy "members read households"
on public.households for select to authenticated
using (public.is_household_member(id));

create policy "members update households"
on public.households for update to authenticated
using (public.is_household_member(id))
with check (public.is_household_member(id));

create policy "members delete households"
on public.households for delete to authenticated
using (public.is_household_member(id));
