-- Agrega soporte versionado para bloques horarios en tareas.
-- El codigo ya usa estas columnas para la vista semanal y el dashboard.

alter table tasks
  add column if not exists start_time time,
  add column if not exists duration_minutes integer;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'tasks_duration_minutes_check'
  ) then
    alter table tasks
      add constraint tasks_duration_minutes_check
      check (
        duration_minutes is null
        or (duration_minutes >= 5 and duration_minutes <= 480)
      );
  end if;
end $$;

create index if not exists idx_tasks_user_due_start
  on tasks(user_id, due_date, start_time)
  where deleted_at is null;
