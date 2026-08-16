-- A shared note displayed at the top of the family calendar.
alter table public.households
  add column if not exists family_note text not null default 'Don''t forget: wear your team jersey for soccer tomorrow!',
  add column if not exists family_note_author text;
