-- One-time family cleanup: make every CPU10 event a Michael event.
-- This safely scopes the update to the Michael member in the same household.
update public.events as event
set member_ids = array[member.id]
from public.members as member
where member.household_id = event.household_id
  and lower(member.display_name) = 'michael'
  and event.title ilike '%cpu10%';
