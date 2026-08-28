-- ============================================================
-- MIGRATION 00028 — BILLETERAS DE INVERSIÓN
--
-- Una billetera de inversión con saldo (Inversiones MP, un plazo fijo, un FCI)
-- no es una tenencia con unidades como las de `holdings` (00026): no le falta
-- un precio, le falta **saber por qué cambió el saldo**. Cuando ese número se
-- mueve puede ser por cuatro razones —invertiste más, retiraste, ganó o
-- perdió— y hasta hoy las cuatro se guardaban como el mismo `ajuste`, que
-- significa "me equivoqué al contar". Mezcladas, el rendimiento no se puede
-- calcular: `Inversiones MP` tiene 15 ajustes y 0 ingresos.
--
-- Las cuatro razones colapsan en dos:
--   * mover plata (aporte / retiro) → viene o va a otra billetera. NO es
--     rendimiento; es la misma plata cambiando de lugar.
--   * rendimiento (ganó / perdió)   → la plata no se movió, cambió de tamaño.
--
-- Con eso: rendimiento acumulado = saldo − (base + aportes − retiros).
--
--
-- Y de paso arregla un bug que estaba tapado a mano hace dos meses: el `case`
-- de `recompute_wallet_balance` cubría 'ingreso', 'gasto' y 'ajuste', y
-- **'transferencia' caía en el `else 0`**. Una transferencia insertaba sus dos
-- filas y no movía ningún saldo. El 2026-06-19 a las 14:56:41 se registró la
-- única transferencia de la base (714.000 entre BNA y Mercado Pago) y 45
-- segundos después aparecieron dos ajustes a mano compensándola. Los aportes y
-- retiros de este feature son transferencias, así que la cañería tenía que
-- funcionar antes de apoyarse en ella.
-- ============================================================


-- ── 1. La línea de base de una billetera de inversión ─────────────────────
-- Los ajustes viejos no se pueden clasificar hacia atrás: solo el dueño sabe
-- cuál de los 15 fue aporte y cuál fue rendimiento. Así que el contador
-- arranca el día que la billetera pasa a ser de inversión: el saldo de ese
-- momento se toma como capital ya aportado y el rendimiento empieza en cero.
-- El histórico queda intacto.

alter table wallets
  add column if not exists investment_baseline      numeric(12,2),
  add column if not exists investment_baseline_date date;

comment on column wallets.investment_baseline is
  'Capital considerado ya aportado cuando la billetera pasó a ser de inversión. El rendimiento se cuenta desde acá, no desde el origen de los tiempos.';
comment on column wallets.investment_baseline_date is
  'Desde cuándo se cuenta el rendimiento. Se usa para valuar la base en dólares con la cotización de ese día.';

-- Sin base no hay rendimiento posible: se lo tomaría entero como ganancia, que
-- es exactamente la mentira que este ticket vino a arreglar.
alter table wallets
  drop constraint if exists wallets_investment_baseline_required;
alter table wallets
  add constraint wallets_investment_baseline_required
  check (type <> 'inversion' or investment_baseline is not null);


-- ── 2. Las transferencias históricas ──────────────────────────────────────
-- Nunca movieron un saldo, y quien las cargó lo corrigió a mano con ajustes.
-- Si el trigger de abajo empezara a contarlas, esos ajustes pasarían a estar
-- duplicados y los saldos de hoy —que están bien— se romperían. Se dan de baja
-- lógica: el registro queda, el efecto sigue siendo cero.
update transactions
set deleted_at = now(),
    updated_at = now()
where type = 'transferencia'
  and deleted_at is null;


-- ── 3. El balance, con los dos tipos que faltaban ─────────────────────────
-- Mantiene la validación contra `auth.uid()` que sumó 00017.
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
      when type = 'ingreso'       then  amount
      when type = 'gasto'         then -amount
      when type = 'ajuste'        then  amount   -- amount puede ser negativo
      -- Las dos nuevas van firmadas, igual que 'ajuste': el signo dice la
      -- dirección. En una transferencia la pata que sale es negativa y la que
      -- entra es positiva; un rendimiento negativo es una pérdida.
      when type = 'transferencia' then  amount
      when type = 'rendimiento'   then  amount
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


-- ── 4. Recalcular todo ────────────────────────────────────────────────────
-- No debería mover ningún saldo: las transferencias viejas quedaron dadas de
-- baja arriba y todavía no existe ningún 'rendimiento'. Corre igual, porque la
-- alternativa es enterarse del desfasaje en producción.
do $$
declare
  r record;
begin
  for r in select id from wallets where deleted_at is null loop
    perform recompute_wallet_balance(r.id);
  end loop;
end;
$$;
