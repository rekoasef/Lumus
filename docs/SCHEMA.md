# LUMUS — Schema de Base de Datos

> ⚠️ **Desactualizado desde 2026-08-18.** Este documento describe el schema original de los 8 módulos ("Sistema Operativo Personal"), incluyendo tablas que ya se borraron de la base (organización, comidas, fit, hábitos, journal, relaciones, estudio, y el módulo de IA con `ai_cache`/`ai_conversations`). El producto real hoy es solo Finanzas + auth + billing. Para el schema actual, usar `supabase/migrations/` (fuente de verdad) o `src/types/database.types.ts` (generado con `supabase gen types typescript --linked`). Se deja este archivo sin reescribir por ahora — es una referencia histórica de la visión original, no del estado actual.

## Convenciones

- Todos los IDs son `UUID` generados con `gen_random_uuid()`
- Todos los timestamps en `timestamptz` con default `now()`
- `user_id` siempre referencia `auth.users(id)` de Supabase
- RLS habilitado en TODAS las tablas
- Soft delete con `deleted_at` donde aplique
- Nombres de tablas en `snake_case` plural

---

## SQL Completo

```sql
-- ============================================================
-- EXTENSIONES
-- ============================================================
create extension if not exists "uuid-ossp";


-- ============================================================
-- CORE — USUARIOS Y PERFILES
-- ============================================================

-- Perfil extendido del usuario (complementa auth.users)
create table user_profiles (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users(id) on delete cascade,
  name            text not null,
  birth_date      date,
  weight_kg       numeric(5,2),
  height_cm       numeric(5,2),
  occupation      text,
  education       text,
  monthly_salary  numeric(12,2),
  timezone        text default 'America/Argentina/Buenos_Aires',
  avatar_url      text,
  onboarding_done boolean default false,
  created_at      timestamptz default now(),
  updated_at      timestamptz default now(),
  unique(user_id)
);

-- Texto libre del onboarding ("contale a Lumus sobre vos")
create table user_life_summary (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  content     text not null,           -- texto libre del usuario
  created_at  timestamptz default now(),
  updated_at  timestamptz default now(),
  unique(user_id)
);

-- Objetivos globales del usuario
create table user_goals (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  type        text not null,           -- 'economico' | 'salud' | 'productividad' | 'habito' | 'otro'
  title       text not null,
  description text,
  target_date date,
  achieved    boolean default false,
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);

-- Caché del contexto comprimido para IA
create table user_context_cache (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  snapshot     jsonb not null,         -- User Snapshot comprimido
  generated_at timestamptz default now(),
  expires_at   timestamptz not null,
  unique(user_id)
);

-- Notificaciones internas
create table notifications (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  title       text not null,
  body        text,
  type        text not null,           -- 'reminder' | 'alert' | 'suggestion' | 'summary'
  module      text,                    -- 'organizacion' | 'finanzas' | etc.
  read        boolean default false,
  created_at  timestamptz default now()
);


-- ============================================================
-- MÓDULO ORGANIZACIÓN
-- ============================================================

create table tasks (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  title         text not null,
  description   text,
  priority      text default 'media',  -- 'alta' | 'media' | 'baja'
  status        text default 'pendiente', -- 'pendiente' | 'en_progreso' | 'completada'
  due_date      timestamptz,
  parent_id     uuid references tasks(id) on delete cascade, -- subtareas
  routine_id    uuid,                  -- FK a routines (se agrega luego)
  created_at    timestamptz default now(),
  updated_at    timestamptz default now(),
  deleted_at    timestamptz
);

create table task_labels (
  id      uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name    text not null,
  color   text default '#6366f1'
);

create table task_label_assignments (
  task_id  uuid not null references tasks(id) on delete cascade,
  label_id uuid not null references task_labels(id) on delete cascade,
  primary key (task_id, label_id)
);

create table routines (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  name        text not null,
  type        text not null,     -- 'manana' | 'noche' | 'trabajo' | 'estudio' | 'custom'
  description text,
  active      boolean default true,
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);

-- Relación tasks.routine_id → routines.id
alter table tasks
  add constraint fk_task_routine
  foreign key (routine_id) references routines(id) on delete set null;

create table objectives (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  title       text not null,
  description text,
  type        text not null,     -- 'mensual' | 'anual'
  month       int,               -- 1-12, solo si type = 'mensual'
  year        int not null,
  progress    int default 0,     -- 0-100
  achieved    boolean default false,
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);

create table calendar_events (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  title       text not null,
  description text,
  start_time  timestamptz not null,
  end_time    timestamptz,
  all_day     boolean default false,
  task_id     uuid references tasks(id) on delete set null,
  color       text default '#6366f1',
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);


-- ============================================================
-- MÓDULO FINANZAS
-- ============================================================

create table wallets (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  name        text not null,
  type        text not null,     -- 'efectivo' | 'banco' | 'virtual'
  balance     numeric(12,2) default 0,
  currency    text default 'ARS',
  color       text default '#6366f1',
  icon        text,
  created_at  timestamptz default now(),
  updated_at  timestamptz default now(),
  deleted_at  timestamptz
);

create table finance_categories (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  name        text not null,
  type        text not null,     -- 'gasto' | 'ingreso'
  icon        text,
  color       text default '#6366f1',
  is_default  boolean default false
);

create table transactions (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  wallet_id     uuid not null references wallets(id) on delete cascade,
  category_id   uuid references finance_categories(id) on delete set null,
  type          text not null,   -- 'gasto' | 'ingreso' | 'transferencia'
  amount        numeric(12,2) not null,
  description   text,
  date          date not null default current_date,
  auto_classified boolean default false,  -- clasificado por IA
  created_at    timestamptz default now(),
  updated_at    timestamptz default now(),
  deleted_at    timestamptz
);

create table budgets (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  category_id uuid not null references finance_categories(id) on delete cascade,
  amount      numeric(12,2) not null,
  month       int not null,      -- 1-12
  year        int not null,
  created_at  timestamptz default now(),
  unique(user_id, category_id, month, year)
);

create table subscriptions (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  wallet_id    uuid references wallets(id) on delete set null,
  name         text not null,
  amount       numeric(12,2) not null,
  currency     text default 'ARS',
  billing_cycle text default 'mensual',  -- 'mensual' | 'anual' | 'semanal'
  next_billing date,
  active       boolean default true,
  icon         text,
  created_at   timestamptz default now(),
  updated_at   timestamptz default now()
);

create table saving_goals (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  wallet_id    uuid references wallets(id) on delete set null,
  name         text not null,
  target_amount numeric(12,2) not null,
  current_amount numeric(12,2) default 0,
  target_date  date,
  achieved     boolean default false,
  icon         text,
  created_at   timestamptz default now(),
  updated_at   timestamptz default now()
);


-- ============================================================
-- MÓDULO COMIDAS & NUTRICIÓN
-- ============================================================

create table recipes (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  title         text not null,
  description   text,
  ingredients   jsonb,           -- [{ name, quantity, unit }]
  instructions  text,
  calories      int,
  protein_g     numeric(6,2),
  carbs_g       numeric(6,2),
  fat_g         numeric(6,2),
  prep_time_min int,
  ai_generated  boolean default false,
  favorite      boolean default false,
  created_at    timestamptz default now(),
  updated_at    timestamptz default now()
);

create table meal_logs (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  recipe_id   uuid references recipes(id) on delete set null,
  date        date not null default current_date,
  meal_type   text not null,     -- 'desayuno' | 'almuerzo' | 'merienda' | 'cena'
  name        text,              -- si no tiene recipe_id
  calories    int,
  notes       text,
  created_at  timestamptz default now()
);

create table shopping_list_items (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  name        text not null,
  quantity    text,
  category    text,
  checked     boolean default false,
  auto_added  boolean default false,  -- agregado por IA desde menú
  created_at  timestamptz default now()
);


-- ============================================================
-- MÓDULO FIT & SALUD
-- ============================================================

create table body_records (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  date         date not null default current_date,
  weight_kg    numeric(5,2),
  body_fat_pct numeric(5,2),
  muscle_kg    numeric(5,2),
  notes        text,
  photo_url    text,              -- Supabase Storage
  created_at   timestamptz default now()
);

create table workout_exercises (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  name        text not null,
  muscle_group text,             -- 'pecho' | 'espalda' | 'piernas' | etc.
  description text,
  is_default  boolean default false
);

create table workout_routines (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  name        text not null,
  description text,
  goal        text,              -- 'hipertrofia' | 'fuerza' | 'definicion' | 'cardio'
  ai_generated boolean default false,
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);

create table workout_routine_exercises (
  id              uuid primary key default gen_random_uuid(),
  routine_id      uuid not null references workout_routines(id) on delete cascade,
  exercise_id     uuid not null references workout_exercises(id) on delete cascade,
  sets            int,
  reps            int,
  rest_seconds    int,
  order_index     int default 0
);

create table workout_sessions (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  routine_id  uuid references workout_routines(id) on delete set null,
  date        date not null default current_date,
  duration_min int,
  notes       text,
  completed   boolean default false,
  created_at  timestamptz default now()
);

create table workout_session_logs (
  id           uuid primary key default gen_random_uuid(),
  session_id   uuid not null references workout_sessions(id) on delete cascade,
  exercise_id  uuid not null references workout_exercises(id) on delete cascade,
  set_number   int not null,
  reps_done    int,
  weight_kg    numeric(6,2),
  notes        text
);

create table health_logs (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  date        date not null default current_date,
  water_ml    int default 0,
  sleep_hours numeric(4,2),
  steps       int,
  created_at  timestamptz default now(),
  unique(user_id, date)
);


-- ============================================================
-- MÓDULO HÁBITOS
-- ============================================================

create table habits (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  name        text not null,
  description text,
  type        text default 'positivo',   -- 'positivo' | 'negativo'
  frequency   text default 'diario',     -- 'diario' | 'semanal'
  icon        text,
  color       text default '#6366f1',
  active      boolean default true,
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);

create table habit_logs (
  id          uuid primary key default gen_random_uuid(),
  habit_id    uuid not null references habits(id) on delete cascade,
  user_id     uuid not null references auth.users(id) on delete cascade,
  date        date not null default current_date,
  completed   boolean default true,
  notes       text,
  created_at  timestamptz default now(),
  unique(habit_id, date)
);


-- ============================================================
-- MÓDULO JOURNAL
-- ============================================================

create table journal_entries (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  date        date not null default current_date,
  title       text,
  content     text not null,
  mood        int,               -- 1-5 (1 muy mal, 5 muy bien)
  tags        text[],
  ai_summary  text,              -- resumen generado por IA
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);

create table mood_logs (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  date        date not null default current_date,
  mood        int not null,      -- 1-5
  note        text,
  created_at  timestamptz default now(),
  unique(user_id, date)
);


-- ============================================================
-- MÓDULO RELACIONES
-- ============================================================

create table contacts (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  name        text not null,
  relation    text,              -- 'amigo' | 'familiar' | 'pareja' | 'colega' | 'otro'
  birth_date  date,
  notes       text,
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);

create table contact_events (
  id          uuid primary key default gen_random_uuid(),
  contact_id  uuid not null references contacts(id) on delete cascade,
  user_id     uuid not null references auth.users(id) on delete cascade,
  type        text not null,     -- 'cumpleaños' | 'aniversario' | 'reunion' | 'otro'
  title       text not null,
  date        date not null,
  recurring   boolean default false,
  notes       text,
  created_at  timestamptz default now()
);


-- ============================================================
-- MÓDULO ESTUDIO & APRENDIZAJE
-- ============================================================

create table study_topics (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  title       text not null,
  description text,
  category    text,              -- 'programacion' | 'idiomas' | 'finanzas' | etc.
  status      text default 'pendiente',  -- 'pendiente' | 'en_progreso' | 'completado'
  progress    int default 0,     -- 0-100
  source_url  text,
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);

create table study_notes (
  id          uuid primary key default gen_random_uuid(),
  topic_id    uuid not null references study_topics(id) on delete cascade,
  user_id     uuid not null references auth.users(id) on delete cascade,
  title       text,
  content     text not null,
  tags        text[],
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);


-- ============================================================
-- MÓDULO IA
-- ============================================================

-- Caché de respuestas de IA
create table ai_cache (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  cache_key   text not null,     -- hash del prompt + contexto
  module      text not null,     -- módulo al que pertenece
  model_used  text not null,     -- 'claude' | 'gpt-4o-mini'
  prompt      text,
  response    text not null,
  tokens_used int,
  created_at  timestamptz default now(),
  expires_at  timestamptz not null,
  unique(user_id, cache_key)
);

-- Historial de conversaciones con Lumus por módulo
create table ai_conversations (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  module      text not null,
  role        text not null,     -- 'user' | 'assistant'
  content     text not null,
  tokens_used int,
  model_used  text,
  created_at  timestamptz default now()
);


-- ============================================================
-- ÍNDICES DE PERFORMANCE
-- ============================================================

create index idx_tasks_user_id on tasks(user_id);
create index idx_tasks_due_date on tasks(due_date);
create index idx_tasks_status on tasks(status);
create index idx_transactions_user_id on transactions(user_id);
create index idx_transactions_date on transactions(date);
create index idx_habit_logs_habit_id on habit_logs(habit_id);
create index idx_habit_logs_date on habit_logs(date);
create index idx_journal_entries_date on journal_entries(date);
create index idx_ai_conversations_user_module on ai_conversations(user_id, module);
create index idx_ai_cache_user_key on ai_cache(user_id, cache_key);
create index idx_notifications_user_read on notifications(user_id, read);


-- ============================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================

-- Habilitar RLS en todas las tablas
alter table user_profiles           enable row level security;
alter table user_life_summary       enable row level security;
alter table user_goals              enable row level security;
alter table user_context_cache      enable row level security;
alter table notifications           enable row level security;
alter table tasks                   enable row level security;
alter table task_labels             enable row level security;
alter table task_label_assignments  enable row level security;
alter table routines                enable row level security;
alter table objectives              enable row level security;
alter table calendar_events         enable row level security;
alter table wallets                 enable row level security;
alter table finance_categories      enable row level security;
alter table transactions            enable row level security;
alter table budgets                 enable row level security;
alter table subscriptions           enable row level security;
alter table saving_goals            enable row level security;
alter table recipes                 enable row level security;
alter table meal_logs               enable row level security;
alter table shopping_list_items     enable row level security;
alter table body_records            enable row level security;
alter table workout_exercises       enable row level security;
alter table workout_routines        enable row level security;
alter table workout_routine_exercises enable row level security;
alter table workout_sessions        enable row level security;
alter table workout_session_logs    enable row level security;
alter table health_logs             enable row level security;
alter table habits                  enable row level security;
alter table habit_logs              enable row level security;
alter table journal_entries         enable row level security;
alter table mood_logs               enable row level security;
alter table contacts                enable row level security;
alter table contact_events          enable row level security;
alter table study_topics            enable row level security;
alter table study_notes             enable row level security;
alter table ai_cache                enable row level security;
alter table ai_conversations        enable row level security;

-- Políticas genéricas (el usuario solo ve sus datos)
-- Se aplica el mismo patrón en todas las tablas con user_id

create policy "users can manage own data" on user_profiles
  for all using (auth.uid() = user_id);

create policy "users can manage own data" on user_life_summary
  for all using (auth.uid() = user_id);

create policy "users can manage own data" on user_goals
  for all using (auth.uid() = user_id);

create policy "users can manage own data" on user_context_cache
  for all using (auth.uid() = user_id);

create policy "users can manage own data" on notifications
  for all using (auth.uid() = user_id);

create policy "users can manage own data" on tasks
  for all using (auth.uid() = user_id);

create policy "users can manage own data" on task_labels
  for all using (auth.uid() = user_id);

create policy "users can manage own data" on routines
  for all using (auth.uid() = user_id);

create policy "users can manage own data" on objectives
  for all using (auth.uid() = user_id);

create policy "users can manage own data" on calendar_events
  for all using (auth.uid() = user_id);

create policy "users can manage own data" on wallets
  for all using (auth.uid() = user_id);

create policy "users can manage own data" on finance_categories
  for all using (auth.uid() = user_id);

create policy "users can manage own data" on transactions
  for all using (auth.uid() = user_id);

create policy "users can manage own data" on budgets
  for all using (auth.uid() = user_id);

create policy "users can manage own data" on subscriptions
  for all using (auth.uid() = user_id);

create policy "users can manage own data" on saving_goals
  for all using (auth.uid() = user_id);

create policy "users can manage own data" on recipes
  for all using (auth.uid() = user_id);

create policy "users can manage own data" on meal_logs
  for all using (auth.uid() = user_id);

create policy "users can manage own data" on shopping_list_items
  for all using (auth.uid() = user_id);

create policy "users can manage own data" on body_records
  for all using (auth.uid() = user_id);

create policy "users can manage own data" on workout_exercises
  for all using (auth.uid() = user_id);

create policy "users can manage own data" on workout_routines
  for all using (auth.uid() = user_id);

create policy "users can manage own data" on workout_sessions
  for all using (auth.uid() = user_id);

create policy "users can manage own data" on health_logs
  for all using (auth.uid() = user_id);

create policy "users can manage own data" on habits
  for all using (auth.uid() = user_id);

create policy "users can manage own data" on habit_logs
  for all using (auth.uid() = user_id);

create policy "users can manage own data" on journal_entries
  for all using (auth.uid() = user_id);

create policy "users can manage own data" on mood_logs
  for all using (auth.uid() = user_id);

create policy "users can manage own data" on contacts
  for all using (auth.uid() = user_id);

create policy "users can manage own data" on contact_events
  for all using (auth.uid() = user_id);

create policy "users can manage own data" on study_topics
  for all using (auth.uid() = user_id);

create policy "users can manage own data" on study_notes
  for all using (auth.uid() = user_id);

create policy "users can manage own data" on ai_cache
  for all using (auth.uid() = user_id);

create policy "users can manage own data" on ai_conversations
  for all using (auth.uid() = user_id);
```

---

## Notas del Schema

### Escalabilidad futura — Modo Pareja / Multi-usuario
Para agregar el modo pareja en el futuro, el approach recomendado es agregar una tabla `households` y una tabla `household_members`, y actualizar las políticas RLS para permitir acceso cruzado a datos específicos. No requiere reescribir el schema actual — se agrega encima.

### user_context_cache
El `snapshot` es un JSONB comprimido que se regenera automáticamente. Ejemplo:
```json
{
  "perfil": { "nombre": "Juan", "edad": 25, "peso": 78 },
  "semana": "12-18 Mayo 2025",
  "organizacion": { "tareas_pendientes": 5, "completadas": 12 },
  "finanzas": { "gastado_mes": 45000, "presupuesto": 60000 },
  "habitos": { "gym": "4/7", "agua": "bajo" },
  "salud": { "sueno_promedio": 6.5, "pasos_promedio": 7200 }
}
```

### Soft Delete
Las tablas `tasks`, `transactions`, `wallets` usan `deleted_at` en lugar de borrado físico. Al hacer queries, siempre filtrar por `deleted_at is null`.
