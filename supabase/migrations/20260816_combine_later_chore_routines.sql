-- Combine the two later-day routines without losing any chores.
update public.chores
set routine = 'After school'
where routine = 'Nighttime';
