-- Keep the Vulpetti morning chart in the family’s preferred order.
update public.chores
set sort_order = case lower(title)
  when 'eat breakfast' then 1
  when 'pack snacks' then 2
  when 'pack water' then 3
  when 'put on clothes' then 4
  when 'put on shoes' then 5
  when 'pack backpack' then 6
  -- Lucas-only item: retained here so it stays part of his routine.
  when 'pack lunch' then 7
  when 'brush hair' then 8
  when 'give mama a hug and/or kiss' then 9
  else sort_order
end
where household_id = 'a0595e01-f363-460d-8efc-975ba666b9ba'
  and routine = 'Before school'
  and is_fixed = true;
