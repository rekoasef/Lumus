-- ============================================================
-- MIGRATION 00034 — PRUEBA GRATIS AL REGISTRARSE + AVISO DE FIN DE ACCESO
-- ============================================================
-- Decisión del 2026-09-16 (docs/LANZAMIENTO.md): el primer mes es gratis y
-- **sin tarjeta**. Hasta hoy el acceso gratis solo llegaba por invitación
-- (`beta_invites`, 00031); quien se registraba por su cuenta caía directo en
-- /suscripcion. Para que la landing pueda mandar gente, la prueba tiene que
-- darse sola.
--
-- ── Por qué en el mismo trigger y no en uno nuevo ─────────────────────────
--
-- Los triggers de una tabla corren en orden alfabético. Con dos triggers, el de
-- la prueba podría insertar su grant de 30 días antes que el de la invitación,
-- y el `on conflict do nothing` de la invitación dejaría al invitado con la
-- prueba en vez de con lo que se le prometió. Una sola función decide: si hay
-- invitación, manda la invitación; si no, prueba.
--
-- ── Sigue sin poder fallar ────────────────────────────────────────────────
--
-- Corre dentro del INSERT de Supabase Auth: si tirara, nadie más se podría
-- registrar. Cualquier error se degrada a un warning. Lo peor que pasa es que
-- alguien queda sin prueba y frenado en /suscripcion, que es como funcionaba
-- antes de esta migración.
--
-- ── La duración ───────────────────────────────────────────────────────────
--
-- 30 días, igual que `TRIAL_DAYS` en `src/lib/billing/plan.ts`, que solo se usa
-- para los textos. Si cambia uno, cambiar el otro.
--
-- Límite conocido: borrar la cuenta y registrarse de nuevo con el mismo mail da
-- otra prueba (el grant se borra en cascada con el usuario). Con un producto de
-- 7.800 por mes no justifica una tabla de pruebas usadas.
-- ============================================================


-- ── 1. El trigger: invitación si la hay, prueba si no ─────────────────────

create or replace function grant_access_from_invite()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_invite public.beta_invites%rowtype;
begin
  begin
    select * into v_invite
    from public.beta_invites
    where email = lower(new.email)
      and accepted_user_id is null
    for update;

    if found then
      insert into public.free_access_grants (user_id, reason, expires_at)
      values (
        new.id,
        v_invite.reason,
        case when v_invite.access_days is null then null
             else now() + make_interval(days => v_invite.access_days) end
      )
      on conflict (user_id) do nothing;

      update public.beta_invites
      set accepted_user_id = new.id,
          accepted_at      = now()
      where id = v_invite.id;
    else
      insert into public.free_access_grants (user_id, reason, expires_at)
      values (new.id, 'prueba gratis', now() + make_interval(days => 30))
      on conflict (user_id) do nothing;
    end if;
  exception when others then
    raise warning 'grant_access_from_invite: % (%)', sqlerrm, sqlstate;
  end;

  return new;
end;
$$;


-- ── 2. El aviso de que el acceso gratis se termina ────────────────────────
--
-- Mismo criterio que 00023: la lista entera, para que el conjunto válido se lea
-- de un vistazo.

alter table notifications
  drop constraint notifications_type_check;

alter table notifications
  add constraint notifications_type_check check (type in (
    'vencimiento',
    'presupuesto_alerta',
    'presupuesto_excedido',
    'meta_alcanzada',
    'reporte_mensual',
    'resumen_semanal',
    'acceso_por_vencer'
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
    'resumen_semanal',
    'acceso_por_vencer'
  ));
