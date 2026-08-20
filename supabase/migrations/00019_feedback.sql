-- ============================================================
-- MIGRATION 00019 — FEEDBACK IN-APP
-- ============================================================
-- Canal para que los testers reporten bugs y mejoras desde adentro de la
-- app, en vez de que todo llegue por WhatsApp y se pierda.
--
-- `user_id` es nullable y la FK es ON DELETE SET NULL, no CASCADE, a
-- proposito: si mas adelante se borra la cuenta de un tester, los bugs que
-- reporto siguen siendo utiles. Perder los reportes junto con la cuenta
-- seria tirar justamente lo que esta tabla vino a juntar.
--
-- RLS: el usuario crea y lee lo suyo. No hay policy de update ni de delete,
-- asi que no puede editar ni borrar lo que mando, ni cambiar el `status`
-- (eso lo maneja el dueño desde el SQL editor — ver docs/ADMIN.md).
-- ============================================================

create table feedback (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid references auth.users(id) on delete set null,
  kind       text not null check (kind in ('bug', 'mejora', 'otro')),
  message    text not null check (char_length(btrim(message)) between 1 and 2000),
  -- Ruta desde la que se reporto: sin esto, "no me anda el boton" es
  -- imposible de ubicar.
  path       text,
  user_agent text,
  status     text not null default 'nuevo' check (status in ('nuevo', 'visto', 'resuelto')),
  created_at timestamptz not null default now()
);

comment on table feedback is
  'Reportes de bugs y mejoras enviados desde la app. Solo el dueño cambia el status.';

create index idx_feedback_status on feedback (status, created_at desc);

alter table feedback enable row level security;

create policy "users can create own feedback" on feedback
  for insert with check (auth.uid() = user_id and status = 'nuevo');

create policy "users can read own feedback" on feedback
  for select using (auth.uid() = user_id);
