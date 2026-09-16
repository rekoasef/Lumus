-- ============================================================
-- MIGRATION 00035 — PAGADO HASTA: EL ACCESO DURA LO QUE SE PAGÓ
-- ============================================================
-- Dos problemas del paywall, arreglados antes de prender el cobro:
--
-- 1. **Cancelar te sacaba en el acto.** El gate miraba solo
--    `status = 'authorized'`: alguien que pagaba el 24 y cancelaba el 1°
--    perdía el acceso ese mismo día, con 23 días pagos por delante. Ahora se
--    guarda hasta cuándo está pago (`paid_until`) y el acceso dura eso, más
--    unos días de gracia (`PAYMENT_GRACE_DAYS` en `lib/billing/access.ts`)
--    para que un rechazo transitorio de la tarjeta no sea un portazo.
--
-- 2. **El usuario podía escribir su propia fila.** 00011 dejaba insertar y
--    editar la fila mientras estuviera `pending`, con el `with check` mirando
--    solo el estado. Con `paid_until` en la tabla, eso sería regalarse meses
--    desde la consola del navegador. Nada del código usa esas policies:
--    `create-subscription` ya escribe con `service_role`. Se borran, y la tabla
--    queda como `free_access_grants`: el usuario solo lee.
--
-- `paid_until` lo escribe únicamente el webhook, con el `next_payment_date`
-- que devuelve Mercado Pago mientras la suscripción está autorizada, y **no se
-- borra al cancelar**: es justamente lo que hay que recordar.
-- ============================================================


-- ── 1. La columna ─────────────────────────────────────────────────────────

alter table billing_subscriptions
  add column paid_until timestamptz;

comment on column billing_subscriptions.paid_until is
  'Hasta cuándo está pago. Lo escribe el webhook con el next_payment_date de MP mientras está autorizada; no se borra al cancelar.';

update billing_subscriptions
set paid_until = next_payment_date::timestamptz
where status = 'authorized' and next_payment_date is not null;


-- ── 2. Solo lectura para el usuario ───────────────────────────────────────

drop policy "users can insert own pending subscription" on billing_subscriptions;
drop policy "users can retry own pending subscription" on billing_subscriptions;


-- ── 3. El panel de admin ve lo mismo que el gate ──────────────────────────
--
-- Cambia el tipo de retorno, así que hay que borrarla y crearla de nuevo (y
-- volver a dar los permisos). Mismo cuerpo que 00030 más `paid_until`.

drop function admin_user_stats();

create function admin_user_stats()
returns table (
  user_id               uuid,
  email                 text,
  name                  text,
  created_at            timestamptz,
  email_confirmed_at    timestamptz,
  last_sign_in_at       timestamptz,
  onboarding_done       boolean,
  subscription_status   text,
  subscription_paid_until timestamptz,
  grant_reason          text,
  grant_expires_at      timestamptz,
  wallets               integer,
  transactions          integer,
  transactions_30d      integer,
  -- Días distintos en los que creó al menos un movimiento. Hasta la etapa 2 es
  -- lo más parecido a "días activos" que se puede saber: abrir la app sin
  -- cargar nada no deja rastro en ningún lado.
  active_days_30d       integer,
  last_transaction_at   timestamptz,
  budgets               integer,
  recurring             integer,
  goals                 integer,
  loans                 integer,
  holdings              integer,
  reports               integer,
  wealth_analyses       integer,
  feedback              integer
)
language plpgsql
stable
security definer
set search_path = ''
as $$
#variable_conflict use_column
begin
  if auth.uid() is not null then
    raise exception 'No autorizado' using errcode = '42501';
  end if;

  return query
  select
    u.id,
    u.email::text,
    p.name,
    u.created_at,
    u.email_confirmed_at,
    u.last_sign_in_at,
    coalesce(p.onboarding_done, false),
    b.status,
    b.paid_until,
    g.reason,
    g.expires_at,
    (select count(*)::int from public.wallets w
      where w.user_id = u.id and w.deleted_at is null),
    (select count(*)::int from public.transactions t
      where t.user_id = u.id and t.deleted_at is null),
    (select count(*)::int from public.transactions t
      where t.user_id = u.id and t.deleted_at is null
        and t.created_at > now() - interval '30 days'),
    (select count(distinct (t.created_at at time zone 'America/Argentina/Buenos_Aires')::date)::int
       from public.transactions t
      where t.user_id = u.id
        and t.created_at > now() - interval '30 days'),
    (select max(t.created_at) from public.transactions t
      where t.user_id = u.id),
    (select count(*)::int from public.budgets x where x.user_id = u.id),
    (select count(*)::int from public.recurring_transactions x where x.user_id = u.id),
    (select count(*)::int from public.saving_goals x where x.user_id = u.id),
    (select count(*)::int from public.loans x
      where x.user_id = u.id and x.deleted_at is null),
    (select count(*)::int from public.holdings x where x.user_id = u.id),
    (select count(*)::int from public.finance_reports x where x.user_id = u.id),
    (select count(*)::int from public.wealth_analyses x where x.user_id = u.id),
    (select count(*)::int from public.feedback x where x.user_id = u.id)
  from auth.users u
  left join public.user_profiles p         on p.user_id = u.id
  left join public.billing_subscriptions b on b.user_id = u.id
  left join public.free_access_grants g    on g.user_id = u.id
  order by u.created_at;
end;
$$;

revoke execute on function admin_user_stats() from public, anon, authenticated;
grant  execute on function admin_user_stats() to service_role;
