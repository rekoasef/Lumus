-- ============================================================
-- MIGRATION 00030 — MÉTRICAS DEL PANEL DE ADMIN (G1, etapa 1)
-- ============================================================
-- `B4` decidió no hacer panel de admin con dos usuarios. Con tres cuentas y la
-- beta por delante, el dueño necesita saber si Lumus se usa sin escribir SQL.
-- Ver `G1` en docs/BACKLOG.md.
--
--
-- ── Estas dos funciones son la frontera de privacidad del panel ────────────
--
-- Decisión del dueño (2026-09-15): el panel muestra **cuánto se usa Lumus, no
-- qué hace cada uno con su plata**. Por eso las funciones devuelven solo
-- conteos y fechas: la página no puede mostrar un monto porque nunca le llega.
--
-- Si se le suma una columna a cualquiera de las dos, la pregunta es: ¿esto es
-- plata de un usuario, o texto que cargó él? Si la respuesta es sí, se está
-- rompiendo la decisión de G1, y tiene que ser a propósito y hablado.
--
-- La única cifra en pesos es `monthly_revenue`: lo que Lumus cobra, no lo que
-- los usuarios tienen.
--
--
-- ── Por qué SQL y no service_role + PostgREST ─────────────────────────────
--
-- PostgREST corta en 1000 filas **en silencio** (gotcha del 2026-08-27). Contar
-- transacciones trayéndolas daría números falsos apenas alguien pase las mil.
--
--
-- ── Quién puede ejecutarlas ───────────────────────────────────────────────
--
-- Solo `service_role`, en dos capas: sin EXECUTE para PUBLIC/anon/authenticated,
-- y además rechazan cualquier llamada con un usuario detrás (`auth.uid()` no
-- nulo) — mismo criterio que 00017. Leen `auth.users` y datos de todos, así que
-- un usuario logueado llamándolas por REST sería exactamente la filtración
-- cruzada que advertía B4.
--
-- "Hoy" y "este mes" son de Argentina, no del servidor.
-- ============================================================


-- ── 1. Una fila por usuario ───────────────────────────────────────────────

create or replace function admin_user_stats()
returns table (
  user_id               uuid,
  email                 text,
  name                  text,
  created_at            timestamptz,
  email_confirmed_at    timestamptz,
  last_sign_in_at       timestamptz,
  onboarding_done       boolean,
  subscription_status   text,
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


-- ── 2. Una sola fila con lo de toda la plataforma ─────────────────────────

create or replace function admin_platform_stats()
returns table (
  db_bytes            bigint,
  monthly_revenue     numeric,
  -- Llamadas a Claude este mes. Regenerar pisa `created_at`, así que cada fila
  -- tocada este mes vale 1 + sus regeneraciones. Es una aproximación: una fila
  -- creada el mes pasado y rehecha este cuenta de más. Alcanza para ver el
  -- orden de magnitud del gasto, que es para lo que está.
  ai_calls_month      integer,
  -- Mails que salieron hoy por Resend desde la app: un digest por usuario más
  -- un aviso por cada feedback. **No incluye los de Supabase Auth** (código de
  -- verificación, recuperar contraseña), que también salen por Resend y
  -- también cuentan para el tope de 100 diarios.
  emails_today        integer,
  feedback_open       integer
)
language plpgsql
stable
security definer
set search_path = ''
as $$
#variable_conflict use_column
declare
  v_today       date := (now() at time zone 'America/Argentina/Buenos_Aires')::date;
  v_month_start date := date_trunc('month', v_today)::date;
begin
  if auth.uid() is not null then
    raise exception 'No autorizado' using errcode = '42501';
  end if;

  return query
  select
    pg_database_size(current_database()),
    (select coalesce(sum(b.amount), 0) from public.billing_subscriptions b
      where b.status = 'authorized'),
    (select coalesce(sum(1 + r.regenerations), 0)::int from (
        select x.regenerations, x.created_at from public.finance_reports x
        union all
        select x.regenerations, x.created_at from public.wealth_analyses x
      ) r
      where (r.created_at at time zone 'America/Argentina/Buenos_Aires')::date >= v_month_start),
    (select count(distinct n.user_id)::int from public.notifications n
      where (n.emailed_at at time zone 'America/Argentina/Buenos_Aires')::date = v_today)
    + (select count(*)::int from public.feedback f
      where (f.created_at at time zone 'America/Argentina/Buenos_Aires')::date = v_today),
    (select count(*)::int from public.feedback f where f.status <> 'resuelto');
end;
$$;


-- ── 3. Permisos ───────────────────────────────────────────────────────────
-- Supabase le da EXECUTE a anon y authenticated por default privileges en
-- `public`, así que revocar solo de PUBLIC no alcanza.

revoke execute on function admin_user_stats()     from public, anon, authenticated;
revoke execute on function admin_platform_stats() from public, anon, authenticated;
grant  execute on function admin_user_stats()     to service_role;
grant  execute on function admin_platform_stats() to service_role;
