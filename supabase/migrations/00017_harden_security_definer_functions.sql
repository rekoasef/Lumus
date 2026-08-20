-- ============================================================
-- MIGRATION 00017 — HARDENING DE FUNCIONES SECURITY DEFINER
-- ============================================================
-- El linter de seguridad de Supabase marcaba tres cosas:
--
--   1. `seed_default_finance_categories` y `recompute_wallet_balance` son
--      SECURITY DEFINER (corren con permisos del owner, saltando RLS) y
--      tenian EXECUTE para PUBLIC y para `anon`. Es decir: cualquiera, sin
--      estar logueado, podia llamarlas por REST pasando el uuid que quisiera.
--   2. Ninguna de las dos validaba que el uuid recibido fuera del que llama.
--   3. `trg_transactions_recompute_balance` y `seed_default_finance_categories`
--      no fijaban `search_path`.
--
-- Con un solo usuario esto era teorico. Con una segunda persona real usando
-- la app, es higiene minima.
--
-- Criterio de la validacion: se compara contra `auth.uid()` solo cuando hay
-- un JWT detras (o sea, cuando la llamada entra por PostgREST). Si `auth.uid()`
-- es null —`service_role`, o mantenimiento corriendo como `postgres`— no se
-- bloquea, porque ese acceso ya es privilegiado por definicion y romperia
-- los scripts de mantenimiento.
-- ============================================================


-- ── 1. Semilla de categorias por defecto ──────────────────────────────────
-- Se mantiene el parametro (lo usa `src/app/api/finance/wallets/route.ts`),
-- pero ahora tiene que coincidir con quien llama.

create or replace function seed_default_finance_categories(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_caller uuid := auth.uid();
begin
  if v_caller is not null and p_user_id <> v_caller then
    raise exception 'No autorizado: solo podes sembrar categorias para tu propio usuario'
      using errcode = '42501';
  end if;

  -- Si el usuario ya tiene categorias, no hacemos nada
  if exists (select 1 from finance_categories where user_id = p_user_id) then
    return;
  end if;

  insert into finance_categories (user_id, name, type, icon, color, is_default) values
    -- Gastos
    (p_user_id, 'Comida',         'gasto',   'utensils',    '#f97316', true),
    (p_user_id, 'Transporte',     'gasto',   'car',         '#3b82f6', true),
    (p_user_id, 'Ocio',           'gasto',   'gamepad-2',   '#a855f7', true),
    (p_user_id, 'Salud',          'gasto',   'heart-pulse', '#ef4444', true),
    (p_user_id, 'Educación',      'gasto',   'graduation-cap', '#06b6d4', true),
    (p_user_id, 'Ropa',           'gasto',   'shirt',       '#ec4899', true),
    (p_user_id, 'Hogar',          'gasto',   'home',        '#84cc16', true),
    (p_user_id, 'Tecnología',     'gasto',   'laptop',      '#6366f1', true),
    (p_user_id, 'Suscripciones',  'gasto',   'repeat',      '#8b5cf6', true),
    (p_user_id, 'Otros gastos',   'gasto',   'wallet',      '#64748b', true),
    -- Ingresos
    (p_user_id, 'Sueldo',         'ingreso', 'banknote',    '#22c55e', true),
    (p_user_id, 'Freelance',      'ingreso', 'briefcase',   '#10b981', true),
    (p_user_id, 'Inversiones',    'ingreso', 'trending-up', '#14b8a6', true),
    (p_user_id, 'Otros ingresos', 'ingreso', 'plus-circle', '#0ea5e9', true);
end;
$$;


-- ── 2. Recalculo de balance de billetera ──────────────────────────────────
-- La llaman las API routes de transacciones y el trigger de `transactions`.
-- El trigger es SECURITY INVOKER, asi que corre como `authenticated`: por eso
-- `authenticated` conserva el EXECUTE y solo se le saca a `anon`/PUBLIC.

create or replace function recompute_wallet_balance(p_wallet_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
  v_caller  uuid := auth.uid();
  v_balance numeric(12,2);
begin
  select user_id into v_user_id from wallets where id = p_wallet_id;
  if v_user_id is null then
    return;
  end if;

  if v_caller is not null and v_user_id <> v_caller then
    raise exception 'No autorizado: esa billetera no es tuya'
      using errcode = '42501';
  end if;

  select coalesce(sum(
    case
      when type = 'ingreso' then  amount
      when type = 'gasto'   then -amount
      when type = 'ajuste'  then  amount   -- amount puede ser negativo
      else 0
    end
  ), 0)
  into v_balance
  from transactions
  where wallet_id = p_wallet_id
    and deleted_at is null;

  update wallets
  set balance    = v_balance,
      updated_at = now()
  where id = p_wallet_id;
end;
$$;


-- ── 3. Trigger: fijar search_path ─────────────────────────────────────────
-- Sin `search_path` fijo, un schema malicioso antepuesto podria secuestrar
-- las referencias no calificadas de la funcion.

create or replace function trg_transactions_recompute_balance()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    perform recompute_wallet_balance(new.wallet_id);
    return new;
  elsif tg_op = 'UPDATE' then
    if new.wallet_id is distinct from old.wallet_id then
      perform recompute_wallet_balance(old.wallet_id);
    end if;
    perform recompute_wallet_balance(new.wallet_id);
    return new;
  elsif tg_op = 'DELETE' then
    perform recompute_wallet_balance(old.wallet_id);
    return old;
  end if;
  return null;
end;
$$;


-- ── 4. Permisos ───────────────────────────────────────────────────────────
-- `create or replace function` NO resetea los privilegios, asi que hay que
-- revocarlos explicitamente. Se le saca a PUBLIC (el `=X/postgres` del ACL)
-- y a `anon`; `authenticated` y `service_role` los conservan porque los
-- necesitan las API routes y el trigger.

revoke execute on function seed_default_finance_categories(uuid) from public, anon;
revoke execute on function recompute_wallet_balance(uuid)        from public, anon;

grant execute on function seed_default_finance_categories(uuid) to authenticated, service_role;
grant execute on function recompute_wallet_balance(uuid)        to authenticated, service_role;
