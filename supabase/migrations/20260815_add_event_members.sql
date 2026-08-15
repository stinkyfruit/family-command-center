-- People assigned to an event drive its calendar color. An event can belong
-- to more than one family member, allowing its block to show multiple colors.
alter table public.events
  add column if not exists member_ids uuid[] not null default '{}';
