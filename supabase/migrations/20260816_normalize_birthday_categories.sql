-- Bring previously imported birthday events in line with the birthday card
-- treatment. Events manually categorized by the family are left untouched.
update public.events
set category = 'Birthday'
where coalesce(category_override, false) = false
  and category is distinct from 'Birthday'
  and lower(title) ~ '(^|[^a-z])(birthday|bday|birth[[:space:]]+day)([^a-z]|$)';
