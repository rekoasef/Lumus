-- ============================================================
-- MIGRATION 00029 — PRÉSTAMOS: EL PRIMER PASIVO DE LUMUS
-- ============================================================
-- Hasta hoy Lumus no tiene ningún concepto de **plata que se debe**. El
-- patrimonio es billeteras + tenencias, todo positivo: nunca resta nada.
--
-- Por eso un préstamo no puede ser una billetera, que es como se pidió. Si lo
-- fuera, sacar 500.000 haría entrar la plata a Mercado Pago y **Lumus te
-- felicitaría porque tu patrimonio subió medio millón**. Te endeudaste y la app
-- dice que estás mejor. Es el molde del bug de las metas del 2026-08-26 (62% en
-- una pantalla, 0% en otra) con la mentira más cara posible.
--
--
-- ── La trampa gemela de `E1` ──────────────────────────────────────────────
--
-- La otra decisión que define si el modelo miente es **de qué tipo es el
-- movimiento de plata**. Si el desembolso entrara como `ingreso`, el reporte
-- mensual informaría que ganaste 500.000 y el análisis de patrimonio razonaría
-- sobre un ingreso que no existió. Es exactamente el error de guardar un aporte
-- como `ajuste`: mezclar "la plata se movió" con "la plata cambió de tamaño".
-- Ya se pagó una vez.
--
-- Y al revés es peor: si prestarle 200.000 a alguien entrara como `gasto`,
-- reventaría el presupuesto del mes y el reporte diría que se gastaron 200.000
-- en nada.
--
-- Por eso hay un tipo nuevo, **`prestamo`**, firmado como `ajuste`,
-- `transferencia` y `rendimiento`: mueve el saldo de la billetera y **no cuenta
-- como ingreso ni como gasto**.
--
--
-- ── La asimetría, que es a propósito ──────────────────────────────────────
--
-- La **cuota** de un préstamo tomado sí se registra como `gasto` (decisión del
-- dueño, 2026-09-10): es un egreso, y tiene que aparecer en el presupuesto y en
-- el reporte del mes. El patrimonio no se cuenta dos veces porque la deuda baja
-- en paralelo por el mismo monto. La cuenta cierra sola, que es como se sabe
-- que el modelo está bien.
--
-- El **cobro** de un préstamo otorgado, en cambio, no es `ingreso`: es plata
-- tuya volviendo. Va como `prestamo` positivo.
--
-- Con la decisión de que la deuda incluye el interés futuro (cuotas restantes ×
-- valor de cuota), el interés **se reconoce entero al sacar el préstamo** y cada
-- cuota queda neutra. Verificado en producción el 2026-09-10 con 1.000.000 en 6
-- cuotas de 200.000:
--
--   sacás 1M en 6x200k → efectivo +1M, deuda 1,2M     → patrimonio −200k (el interés)
--   pagás cuota        → efectivo −200k, deuda −200k  → patrimonio igual
--   prestás 200k       → efectivo −200k, a cobrar +200k → patrimonio igual
--   te devuelven       → efectivo +50k,  a cobrar −50k  → patrimonio igual
--
-- Que el golpe caiga al principio es a propósito: te muestra lo que te va a
-- costar el préstamo en el momento en que te comprometés, que es cuando sirve.
-- ============================================================


-- ── 1. La tabla ───────────────────────────────────────────────────────────

create table loans (
  id       uuid primary key default gen_random_uuid(),
  user_id  uuid not null references auth.users(id) on delete cascade,

  -- 'tomado'   = sacaste plata y la devolvés en cuotas.
  -- 'otorgado' = prestaste plata y te la devuelven de a pedazos.
  direction text not null check (direction in ('tomado', 'otorgado')),

  -- Quién: "Banco Nación", "Mercado Pago", "Juan".
  counterparty text not null check (char_length(btrim(counterparty)) between 1 and 60),

  -- Dónde entró (tomado) o de dónde salió (otorgado) la plata.
  wallet_id uuid not null references wallets(id) on delete restrict,

  -- Con qué categoría se imputan las cuotas. Solo aplica a 'tomado', que es el
  -- único caso donde el movimiento de vuelta es un gasto. Se elige una vez y
  -- vale para las doce cuotas: así el préstamo se lee igual en el reporte todos
  -- los meses.
  category_id uuid references finance_categories(id) on delete set null,

  -- Lo que recibiste (tomado) o entregaste (otorgado). No es lo que vas a
  -- devolver: esa cuenta sale de las cuotas.
  principal numeric(12,2) not null check (principal > 0),

  -- Un préstamo entre personas no tiene cuotas de verdad: "en cuántas cuotas te
  -- lo devuelven" es una ficción que nadie completa con la verdad. Por eso van
  -- nullables, y sin ellas el pendiente se sigue por lo que falta cobrar.
  installments       integer        check (installments between 1 and 240),
  installment_amount numeric(12,2)  check (installment_amount > 0),

  -- Cuándo vence la próxima cuota impaga. La mueve la app al registrar un pago;
  -- es de donde sale el aviso.
  next_due_date date,

  started_on date not null default current_date,
  notes      text check (char_length(notes) <= 500),

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  -- Soft delete, al revés que `budgets`, `saving_goals` y `holdings`. La regla
  -- de `CLAUDE.md` es explícita: se borran físicamente las tablas que ninguna
  -- otra referencia para mostrar historial. `transactions.loan_id` apunta acá,
  -- así que borrar un préstamo físicamente dejaría huérfanos movimientos reales
  -- de plata que el usuario todavía quiere ver.
  deleted_at timestamptz,

  -- Un préstamo con cuotas necesita las dos cosas: con una sola no se puede
  -- calcular ni el total a devolver ni cuánto falta.
  constraint loans_installments_complete check (
    (installments is null) = (installment_amount is null)
  ),

  -- Un préstamo tomado sin cuotas no se puede seguir: no habría ni vencimiento
  -- que avisar ni pendiente que mostrar.
  constraint loans_tomado_needs_installments check (
    direction <> 'tomado' or installments is not null
  )
);

comment on table loans is
  'Préstamos tomados y otorgados. Es el único pasivo de la app: el resto del patrimonio suma, esto resta.';
comment on column loans.principal is
  'Lo recibido o entregado. Lo que se devuelve sale de installments * installment_amount — la diferencia es el sobrecosto.';
comment on column loans.category_id is
  'Categoría con la que se imputan las cuotas de un préstamo tomado. La cuota es un gasto real y tiene que caer en un presupuesto.';

create index idx_loans_user on loans (user_id, created_at desc)
  where deleted_at is null;

-- Para el cron de avisos: busca vencimientos próximos entre los préstamos vivos.
create index idx_loans_next_due on loans (user_id, next_due_date)
  where deleted_at is null and next_due_date is not null;

alter table loans enable row level security;

create policy "users manage own loans" on loans
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);


-- ── 2. Atar los movimientos al préstamo ───────────────────────────────────
-- Sin esto no hay forma de saber cuántas cuotas se pagaron, y por lo tanto
-- cuánto se debe. `on delete set null` y no `cascade`: si algún día se borra un
-- préstamo de verdad, la plata que se movió pasó igual y la transacción se
-- queda.

alter table transactions
  add column if not exists loan_id uuid references loans(id) on delete set null;

comment on column transactions.loan_id is
  'Movimiento que pertenece a un préstamo: el desembolso, una cuota o un cobro.';

create index if not exists idx_transactions_loan
  on transactions (loan_id) where loan_id is not null and deleted_at is null;


-- ── 3. El balance, con el tipo nuevo ──────────────────────────────────────
-- Mantiene la validación contra `auth.uid()` que sumó 00017 y los tipos que
-- sumó 00028. `prestamo` va firmado: el signo dice la dirección, igual que
-- `transferencia` y `rendimiento`.
--
-- El `else 0` sigue estando, y sigue siendo el lugar donde un tipo nuevo se
-- pierde en silencio: es exactamente lo que le pasó a `transferencia` durante
-- dos meses hasta que `00028` lo encontró.

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
      when type = 'transferencia' then  amount
      when type = 'rendimiento'   then  amount
      -- Entra plata prestada o vuelve plata que prestaste: positivo.
      -- Sale plata que estás prestando: negativo.
      when type = 'prestamo'      then  amount
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
-- No debería mover ningún saldo: todavía no existe ninguna transacción de tipo
-- `prestamo`. Corre igual, porque la alternativa es enterarse del desfasaje en
-- producción — misma razón que en `00028`.
do $$
declare
  r record;
begin
  for r in select id from wallets where deleted_at is null loop
    perform recompute_wallet_balance(r.id);
  end loop;
end;
$$;
