-- Los ajustes de balance modifican el saldo de la billetera, pero no son
-- ingresos ni gastos. Se guardan como transactions.type = 'ajuste' con
-- amount firmado: positivo suma saldo, negativo resta saldo.

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
      when type = 'ajuste'  then amount
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

-- Migrar ajustes creados antes como ingresos/gastos para sacarlos de reportes.
-- El efecto sobre el balance se conserva porque amount pasa a ser firmado.
update transactions
set
  type = 'ajuste',
  amount = case
    when type = 'gasto' then -abs(amount)
    when type = 'ingreso' then abs(amount)
    else amount
  end,
  category_id = null,
  auto_classified = false,
  updated_at = now()
where type in ('gasto', 'ingreso')
  and category_id is null
  and (
    description = 'Balance inicial'
    or description like 'Ajuste de balance%'
  );
