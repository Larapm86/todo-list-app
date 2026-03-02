-- Add category column for organizing todos (work, personal, errands, etc.)
alter table public.todos
  add column if not exists category text not null default 'general';
