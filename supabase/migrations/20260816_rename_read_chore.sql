-- Make the final fixed after-school routine clearer for both children.
update public.chores
set title = 'Read a book'
where is_fixed = true
  and routine = 'After school'
  and title = 'Read';
