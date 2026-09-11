-- Add silly, antsy, and nervous mood options.
alter table public.mood_checkins drop constraint if exists mood_checkins_mood_check;

alter table public.mood_checkins
  add constraint mood_checkins_mood_check
  check (mood in ('amazing', 'good', 'okay', 'tired', 'sad', 'excited', 'calm', 'frustrated', 'worried', 'scared', 'annoyed', 'mad', 'hurting', 'hungry', 'embarrassed', 'confused', 'bean-butt', 'fine', 'silly', 'antsy', 'nervous'));
