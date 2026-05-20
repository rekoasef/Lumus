create table if not exists finance_reports (
  id uuid default gen_random_uuid() primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  month text not null check (month ~ '^\d{4}-\d{2}$'),
  content text not null,
  created_at timestamptz default now() not null,
  unique(user_id, month)
);

alter table finance_reports enable row level security;

create policy "users can manage their own finance reports"
  on finance_reports for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
