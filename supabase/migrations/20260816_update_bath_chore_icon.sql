-- Use a bathtub icon for the after-school bath/shower step.
update public.chores
set emoji = '🛁'
where is_fixed = true
  and routine = 'After school'
  and title = 'Take a bath/shower';
