-- Tareas recurrentes: campos en tasks
alter table tasks
  add column if not exists repeat_type text check (repeat_type in ('daily', 'weekly', 'weekdays', 'monthly')),
  add column if not exists repeat_days integer[] default null,
  add column if not exists repeat_end_date date default null;

-- Tabla para registrar completions diarias de tareas recurrentes
create table if not exists task_completions (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  task_id    uuid not null references tasks(id) on delete cascade,
  date       date not null,
  created_at timestamptz default now(),
  unique(task_id, date)
);

alter table task_completions enable row level security;

create policy "users can manage own completions"
  on task_completions for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create index if not exists idx_task_completions_task_date on task_completions(task_id, date);
create index if not exists idx_task_completions_user_date on task_completions(user_id, date);
