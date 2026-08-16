-- Use a clear laundry-basket icon for the after-school change-clothes step.
update public.chores
set emoji = '🧺'
where is_fixed = true
  and routine = 'After school'
  and lower(title) in (
    'change clothes and put school clothes in laundry basket',
    'change clothes & put school clothes in laundry basket'
  );
