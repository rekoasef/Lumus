-- ============================================================
-- MIGRATION 00022 — MOTOR DE AVISOS
-- ============================================================
-- Hasta acá Lumus no le avisaba nada a nadie, nunca. `recurring_transactions`
-- guardaba `next_date` y ahí moría: si no entrabas a la app, el vencimiento
-- pasaba. Para una app de finanzas, avisar es la función que justifica que
-- exista en vez de una planilla.
--
-- Esto es la cañería, no el aviso: `notifications` es genérica a propósito
-- porque los avisos que vienen (presupuesto excedido, meta alcanzada, cobro
-- de la suscripción) van a entrar por acá sin schema nuevo.
--
-- La pieza que importa es `unique (user_id, dedupe_key)`. Un cron que se
-- reintenta —y los crons se reintentan— manda el mismo mail dos veces, y dos
-- mails iguales es todo lo que hace falta para que alguien desactive los
-- avisos para siempre. La unicidad convierte "avisar" en una operación
-- idempotente: insertar de nuevo falla, y fallar es exactamente lo correcto.
--
-- RLS igual que `free_access_grants` (00018): el usuario lee lo suyo, nadie
-- inserta desde el cliente. Solo `service_role` escribe, porque el cron corre
-- sin sesión.
-- ============================================================

-- ── Antes: sacar del medio la `notifications` de 00001 ──
-- Es de la era "Sistema Operativo Personal" (tiene una columna `module` con
-- 'organizacion' | 'finanzas' | etc.). La limpieza de 00013 no la agarró
-- porque no era de un módulo puntual, pero quedó igual de muerta: 0 filas,
-- 0 referencias entrantes, sin un solo uso en el código.
--
-- El guard mira la columna `module`, que solo existe en la tabla vieja, y no
-- si la tabla existe a secas. Primera versión de esto: dropeaba cualquier
-- `notifications` vacía, o sea que **volver a correr esta migración borraba la
-- tabla nueva**. Salió a la luz porque el re-run falló más adelante y Postgres
-- revirtió el lote entero — o sea que no lo salvó el guard, lo salvó la suerte.
--
-- Además chequea que esté vacía: si alguna vez tuviera datos, esta migración
-- tiene que fallar y no borrarlos.
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'notifications'
      and column_name = 'module'
  ) then
    if (select count(*) from public.notifications) > 0 then
      raise exception 'notifications (00001) tiene filas — no se dropea a ciegas';
    end if;
    drop table public.notifications;
  end if;
end $$;

create table notifications (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  -- Cada tipo nuevo suma su valor acá y su default en `notification_preferences`.
  type       text not null check (type in ('vencimiento')),
  title      text not null,
  body       text,
  -- A dónde lleva el aviso dentro de la app. Ruta relativa, nunca URL completa.
  link       text,
  -- Identidad del hecho avisado, no del aviso. Ver el unique de abajo.
  dedupe_key text not null,
  read_at    timestamptz,
  emailed_at timestamptz,
  created_at timestamptz not null default now(),

  unique (user_id, dedupe_key)
);

comment on table notifications is
  'Avisos generados por el motor. Solo escribible por service_role; el usuario solo marca read_at.';
comment on column notifications.dedupe_key is
  'Identifica el hecho avisado (ej: venc:<recurring_id>:<fecha>:<fase>). El unique con user_id es lo que hace idempotente al cron.';

-- El centro de notificaciones de C5 lista lo no leído, más nuevo primero.
create index idx_notifications_unread on notifications (user_id, created_at desc)
  where read_at is null;

-- El digest diario busca lo que todavía no salió por mail.
create index idx_notifications_pending_email on notifications (user_id)
  where emailed_at is null;

alter table notifications enable row level security;

create policy "users can read own notifications" on notifications
  for select using (auth.uid() = user_id);

-- Marcar como leído es lo único que el usuario puede escribir. No hay policy
-- de insert ni de delete: con RLS activo, la ausencia de policy es denegado.
create policy "users can mark own notifications read" on notifications
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- La policy de update no puede limitar columnas, así que sin esto un usuario
-- podría reescribir el cuerpo de su propio aviso o borrarse el `emailed_at`
-- para que el digest se lo mande de nuevo. Solo se controla a `authenticated`:
-- el cron entra como service_role y necesita sellar `emailed_at`.
create or replace function notifications_guard_update()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  if current_user <> 'authenticated' then
    return new;
  end if;

  if new.id         is distinct from old.id
  or new.user_id    is distinct from old.user_id
  or new.type       is distinct from old.type
  or new.title      is distinct from old.title
  or new.body       is distinct from old.body
  or new.link       is distinct from old.link
  or new.dedupe_key is distinct from old.dedupe_key
  or new.emailed_at is distinct from old.emailed_at
  or new.created_at is distinct from old.created_at then
    raise exception 'en notifications solo se puede modificar read_at';
  end if;

  return new;
end;
$$;

create trigger notifications_guard_update
  before update on notifications
  for each row execute function notifications_guard_update();

-- ============================================================
-- PREFERENCIAS
-- ============================================================
-- Esta tabla sí la escribe el usuario: es la que apaga los mails.
--
-- La ausencia de fila significa "activado". Así el motor no tiene que sembrar
-- una fila por usuario y por tipo cada vez que se agrega un tipo nuevo, y un
-- usuario que nunca tocó nada recibe los avisos igual.
-- ============================================================

create table notification_preferences (
  user_id       uuid not null references auth.users(id) on delete cascade,
  type          text not null check (type in ('vencimiento')),
  email_enabled boolean not null default true,
  updated_at    timestamptz not null default now(),

  primary key (user_id, type)
);

comment on table notification_preferences is
  'Preferencias de aviso por usuario y tipo. Sin fila = activado.';

alter table notification_preferences enable row level security;

create policy "users manage own notification preferences" on notification_preferences
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
