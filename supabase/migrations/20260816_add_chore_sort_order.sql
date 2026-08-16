-- Keep each child's unfinished chores in a shared, intentional order.
alter table public.chores
  add column if not exists sort_order integer not null default 0;

with numbered_chores as (
  select id, row_number() over (
    partition by household_id, assignee_member_id
    order by created_at, id
  ) as row_number
  from public.chores
  where sort_order = 0
)
update public.chores
set sort_order = numbered_chores.row_number
from numbered_chores
where chores.id = numbered_chores.id;

create index if not exists chores_household_assignee_sort_idx
  on public.chores (household_id, assignee_member_id, sort_order);
