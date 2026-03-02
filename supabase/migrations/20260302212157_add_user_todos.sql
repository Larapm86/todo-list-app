-- Add user_id column linking todos to auth users
alter table public.todos
  add column if not exists user_id uuid references auth.users(id) default auth.uid();

-- Drop the old permissive policies from 20250302120000 so only user-scoped policies apply
drop policy if exists "Allow all for anon" on public.todos;
drop policy if exists "Allow all for authenticated" on public.todos;
drop policy if exists "Allow all access for now" on public.todos;

-- Users can only read their own todos
drop policy if exists "Users can read own todos" on public.todos;
create policy "Users can read own todos"
  on public.todos for select
  using (auth.uid() = user_id);

-- Users can create their own todos
drop policy if exists "Users can create own todos" on public.todos;
create policy "Users can create own todos"
  on public.todos for insert
  with check (auth.uid() = user_id);

-- Users can update their own todos
drop policy if exists "Users can update own todos" on public.todos;
create policy "Users can update own todos"
  on public.todos for update
  using (auth.uid() = user_id);

-- Users can delete their own todos
drop policy if exists "Users can delete own todos" on public.todos;
create policy "Users can delete own todos"
  on public.todos for delete
  using (auth.uid() = user_id);
