-- Rename existing mood values and add the scared mood option.
alter table public.mood_checkins drop constraint if exists mood_checkins_mood_check;

update public.mood_checkins
set mood = 'amazing'
where mood = 'great';

update public.mood_checkins
set mood = 'sad'
where mood = 'low';

alter table public.mood_checkins
  add constraint mood_checkins_mood_check
  check (mood in ('amazing', 'good', 'okay', 'tired', 'sad', 'excited', 'calm', 'frustrated', 'worried', 'scared', 'annoyed', 'mad', 'hurting', 'hungry', 'embarrassed', 'confused'));
