-- Run this once in the Supabase SQL Editor to store event locations.
alter table public.events add column if not exists location text;
