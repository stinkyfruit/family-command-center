-- Add Sore and Depressed mood options while preserving existing check-ins.
alter table public.mood_checkins drop constraint if exists mood_checkins_mood_check;

alter table public.mood_checkins
  add constraint mood_checkins_mood_check
  check (mood in ('amazing', 'good', 'okay', 'tired', 'sad', 'depressed', 'excited', 'calm', 'frustrated', 'worried', 'scared', 'annoyed', 'mad', 'hurting', 'sore', 'hungry', 'embarrassed', 'confused', 'bean-butt', 'fine', 'silly', 'antsy', 'nervous', 'wanderlust'));
