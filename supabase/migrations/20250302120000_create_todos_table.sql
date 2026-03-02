-- Create todos table for the todo list app
create table public.todos (
  id uuid primary key default gen_random_uuid(),
  text text not null,
  completed boolean not null default false,
  created_at timestamptz not null default now()
);

-- Enable Row Level Security (RLS)
alter table public.todos enable row level security;

-- Allow all operations for anon and authenticated (restrict later with auth if needed)
create policy "Allow all for anon"
  on public.todos
  for all
  to anon
  using (true)
  with check (true);

create policy "Allow all for authenticated"
  on public.todos
  for all
  to authenticated
  using (true)
  with check (true);
