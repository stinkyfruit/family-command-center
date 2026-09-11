-- Add additional feelings to the daily mood check-in choices.
alter table public.mood_checkins drop constraint if exists mood_checkins_mood_check;

alter table public.mood_checkins
  add constraint mood_checkins_mood_check
  check (mood in ('great', 'good', 'okay', 'tired', 'low', 'excited', 'calm', 'frustrated', 'worried', 'annoyed', 'mad', 'hurting'));
