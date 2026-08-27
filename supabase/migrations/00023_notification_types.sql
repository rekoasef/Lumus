-- ============================================================
-- MIGRATION 00023 — RESTO DE LOS AVISOS + PREFERENCIAS DE DOS EJES
-- ============================================================
-- `00022` dejó el motor andando con un solo tipo de aviso. Esto enchufa los
-- otros cinco y le da al usuario un control más fino que "mail sí / mail no".
--
-- Dos ejes y no uno: el mail es para lo que necesita sacarte de la app (algo
-- vence), y el centro in-app para lo que querés ver cuando entrás. Son cosas
-- distintas y se apagan por separado.
--
-- El default de cada tipo vive en el código (`NOTIFICATION_DEFAULTS`), no en
-- la base: el resumen semanal arranca apagado y el resto prendido, y eso es
-- una decisión de producto que cambia más seguido que un schema. La ausencia
-- de fila sigue significando "lo que diga el default de ese tipo".
-- ============================================================

alter table notification_preferences
  add column in_app_enabled boolean not null default true;

comment on column notification_preferences.in_app_enabled is
  'Si el aviso aparece en el centro de notificaciones. Apagado = ni se crea la fila.';

-- Los `check` de tipo se reemplazan en las dos tablas. Se listan enteros y no
-- se agregan valores sueltos para que el conjunto válido se lea de un vistazo.
alter table notifications
  drop constraint notifications_type_check;

alter table notifications
  add constraint notifications_type_check check (type in (
    'vencimiento',
    'presupuesto_alerta',
    'presupuesto_excedido',
    'meta_alcanzada',
    'reporte_mensual',
    'resumen_semanal'
  ));

alter table notification_preferences
  drop constraint notification_preferences_type_check;

alter table notification_preferences
  add constraint notification_preferences_type_check check (type in (
    'vencimiento',
    'presupuesto_alerta',
    'presupuesto_excedido',
    'meta_alcanzada',
    'reporte_mensual',
    'resumen_semanal'
  ));

-- El cron borra lo viejo, y sin este índice ese delete escanea la tabla entera
-- todos los días.
create index idx_notifications_created_at on notifications (created_at);

-- El trigger de 00022 tiene que dejar pasar la columna nueva igual que el
-- resto: el usuario solo puede tocar `read_at`.
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
