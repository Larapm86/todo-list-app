-- Add position column for drag-and-drop reordering (per-user order)
alter table public.todos
  add column if not exists position integer not null default 0;

-- Optional: index for efficient ordering when loading todos by user
create index if not exists todos_user_position_idx
  on public.todos (user_id, position asc, created_at asc);
