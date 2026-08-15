-- Run this once in the Supabase SQL Editor to store calendar event categories.
alter table public.events add column if not exists category text not null default 'General';
