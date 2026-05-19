-- ============================================================
-- MIGRATION 00002 — FINANZAS
-- Las tablas ya están creadas en 00001_initial_schema.sql.
-- Acá agregamos: índices faltantes, función de seed de categorías
-- default por usuario, y trigger que mantiene wallets.balance
-- sincronizado con las transactions.
-- ============================================================

-- ============================================================
-- ÍNDICES ADICIONALES
-- ============================================================

create index if not exists idx_wallets_user_id
  on wallets(user_id) where deleted_at is null;

create index if not exists idx_finance_categories_user_type
  on finance_categories(user_id, type);

create index if not exists idx_transactions_wallet
  on transactions(wallet_id) where deleted_at is null;

create index if not exists idx_transactions_category
  on transactions(category_id);

create index if not exists idx_budgets_user_month
  on budgets(user_id, year, month);

create index if not exists idx_subscriptions_user_active
  on subscriptions(user_id, active);

create index if not exists idx_saving_goals_user
  on saving_goals(user_id) where achieved = false;


-- ============================================================
-- SEED DE CATEGORÍAS DEFAULT POR USUARIO
-- ============================================================
-- Función que crea las categorías iniciales para un usuario.
-- Se llama desde el backend al crear la primera billetera (o
-- desde el onboarding cuando se implemente).
-- ============================================================

create or replace function seed_default_finance_categories(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Si el usuario ya tiene categorías, no hacemos nada
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


-- ============================================================
-- TRIGGER PARA MANTENER wallets.balance SINCRONIZADO
-- ============================================================
-- Cualquier insert, update o "soft delete" en transactions
-- recalcula el balance afectado. Operamos sobre soft deletes
-- (deleted_at), no sobre DELETE físico.
-- ============================================================

create or replace function recompute_wallet_balance(p_wallet_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
  v_balance numeric(12,2);
begin
  select user_id into v_user_id from wallets where id = p_wallet_id;
  if v_user_id is null then
    return;
  end if;

  select coalesce(sum(
    case
      when type = 'ingreso' then amount
      when type = 'gasto'   then -amount
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

create or replace function trg_transactions_recompute_balance()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'INSERT' then
    perform recompute_wallet_balance(new.wallet_id);
    return new;
  elsif tg_op = 'UPDATE' then
    -- Si cambió de billetera, recalculamos ambas
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

drop trigger if exists transactions_recompute_balance on transactions;
create trigger transactions_recompute_balance
after insert or update or delete on transactions
for each row execute function trg_transactions_recompute_balance();
