-- ============================================================
-- MIGRATION 00008 — CORREGIR TRIGGER DE BALANCE
-- Reinstala la función recompute_wallet_balance con soporte
-- para los tres tipos de transacción (ingreso, gasto, ajuste)
-- y recrea el trigger para garantizar que esté activo.
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

create or replace function trg_transactions_recompute_balance()
returns trigger
language plpgsql
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

drop trigger if exists transactions_recompute_balance on transactions;
create trigger transactions_recompute_balance
after insert or update or delete on transactions
for each row execute function trg_transactions_recompute_balance();

-- Recalcular balances de todas las billeteras existentes
-- para corregir cualquier inconsistencia acumulada
do $$
declare
  r record;
begin
  for r in select id from wallets where deleted_at is null loop
    perform recompute_wallet_balance(r.id);
  end loop;
end;
$$;
