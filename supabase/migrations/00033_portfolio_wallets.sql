-- ============================================================
-- MIGRATION 00033 — BILLETERAS DE INVERSIÓN CON TENENCIAS ADENTRO (E2, parte 1)
-- ============================================================
-- Hasta hoy Lumus tenía las dos mitades de una inversión sin conectar:
--
--   - billeteras de inversión (00028): un saldo que cambia por aportes,
--     retiros y rendimiento — Inversiones MP, un plazo fijo, un FCI.
--   - tenencias (00026): 0,05 BTC, 100 GGAL, **sueltas**, sin billetera.
--
-- Una cuenta de broker no es ninguna de las dos: es una billetera con varias
-- especies adentro. Ver `E2` en docs/BACKLOG.md.
--
--
-- ── Dos modos de billetera de inversión ───────────────────────────────────
--
--   saldo      → exactamente como 00028. Las tres que existen quedan así.
--   tenencias  → su valor es el efectivo más lo que valen sus especies. No
--                lleva línea de base: el rendimiento sale de cada especie
--                contra lo que se pagó, no de un saldo que se actualiza a mano.
--
--
-- ── Las especies guardan qué son; las operaciones, qué pasó ───────────────
--
-- `holdings` pasa a ser **la especie dentro de una billetera** (GGAL en la
-- cuenta del broker), y cada compra es una fila de `holding_trades`. Cantidad,
-- precio promedio y rendimiento **se calculan desde las operaciones**
-- (`lib/finance/holdings.ts`), igual que lo pendiente de un préstamo sale de
-- sus pagos y no de un contador: un contador se desincroniza el día que se
-- borra una operación, y lo que pasó está en las operaciones.
--
-- `side` ya admite 'venta' y `transaction_id` ya existe aunque la parte 1 no
-- los use: la parte 2 (efectivo, compras y ventas que mueven plata) es una
-- operación más, sin volver a migrar esta tabla.
--
-- La tabla vieja se reestructura en vez de migrar datos porque **no hay
-- ninguno**: al 2026-09-15 nadie cargó una tenencia. El bloque de abajo lo
-- verifica y frena la migración si eso cambió.
--
--
-- ── La historia de precios empieza hoy ────────────────────────────────────
--
-- data912 da el precio del momento, no la historia. `holding_price_history`
-- se llena una vez por día desde el cron que ya existe: la lección de 00025 es
-- que la historia que no se empieza a guardar hoy no se reconstruye después.
-- ============================================================


-- ── 0. Salvaguarda ────────────────────────────────────────────────────────

do $$
begin
  if exists (select 1 from holdings) then
    raise exception 'holdings tiene filas: esta migración asume la tabla vacía y dropea columnas. Migrar los datos antes.';
  end if;
end $$;


-- ── 1. Modo de las billeteras de inversión ────────────────────────────────

alter table wallets
  add column investment_mode text check (investment_mode in ('saldo', 'tenencias'));

update wallets set investment_mode = 'saldo' where type = 'inversion';

-- Una billetera de inversión siempre tiene modo, y ninguna otra lo tiene.
alter table wallets add constraint wallets_investment_mode_matches_type check (
  (type = 'inversion') = (investment_mode is not null)
);

-- La línea de base es del modo "saldo": una cartera de especies mide su
-- rendimiento contra lo que se pagó por cada una.
alter table wallets drop constraint wallets_investment_baseline_required;
alter table wallets add constraint wallets_investment_baseline_required check (
  type <> 'inversion' or investment_mode = 'tenencias' or investment_baseline is not null
);


-- ── 2. `holdings` pasa a ser la especie dentro de una billetera ───────────

alter table holdings
  drop column quantity,
  drop column purchase_price,
  drop column purchase_currency,
  drop column purchase_date;

alter table holdings
  add column wallet_id uuid not null references wallets(id) on delete restrict;

-- CEDEAR aparte de acción: tienen fuente de precio distinta (data912 separa
-- las dos listas) y el mismo ticker puede existir en las dos.
alter table holdings drop constraint holdings_kind_check;
alter table holdings add constraint holdings_kind_check
  check (kind in ('cripto', 'accion', 'cedear', 'otro'));

comment on column holdings.price_source is
  'Cripto: id de CoinGecko. Acción/CEDEAR: ticker de data912 (GGAL, AAPL). Null = precio manual.';

-- Una especie aparece una sola vez por billetera: dos compras de GGAL son dos
-- operaciones de la misma especie, no dos especies.
create unique index holdings_one_per_wallet
  on holdings (wallet_id, kind, coalesce(price_source, lower(btrim(name))));

create index idx_holdings_wallet on holdings (wallet_id);


-- ── 3. Operaciones ────────────────────────────────────────────────────────

create table holding_trades (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  holding_id  uuid not null references holdings(id) on delete cascade,

  side        text not null check (side in ('compra', 'venta')),

  -- 8 decimales porque 0,00042 BTC es una tenencia real.
  quantity    numeric(24, 8) not null check (quantity > 0),

  -- Precio **por unidad**, en la moneda en la que se operó.
  price       numeric(18, 4) not null check (price >= 0),
  currency    text not null check (currency in ('ARS', 'USD')),
  trade_date  date not null,

  -- El movimiento de efectivo de la billetera (parte 2). Null en la parte 1.
  transaction_id uuid references transactions(id) on delete set null,

  created_at  timestamptz not null default now()
);

comment on table holding_trades is
  'Compras y ventas de cada especie. La posición se calcula desde acá, no se guarda.';

create index idx_holding_trades_holding on holding_trades (holding_id, trade_date);

alter table holding_trades enable row level security;

-- La operación tiene que ser del usuario **y** de una especie suya: sin el
-- `exists`, alguien podría colgar operaciones de la especie de otro.
create policy "users manage own holding trades" on holding_trades
  for all
  using (auth.uid() = user_id)
  with check (
    auth.uid() = user_id
    and exists (select 1 from holdings h where h.id = holding_id and h.user_id = auth.uid())
  );


-- ── 4. Historia de precios ────────────────────────────────────────────────

create table holding_price_history (
  kind        text not null check (kind in ('cripto', 'accion', 'cedear')),
  symbol      text not null,
  date        date not null,
  -- En la moneda que da la fuente: USD para cripto, ARS para acciones y CEDEARs.
  price       numeric(18, 4) not null check (price > 0),
  currency    text not null check (currency in ('ARS', 'USD')),
  created_at  timestamptz not null default now(),
  primary key (kind, symbol, date)
);

comment on table holding_price_history is
  'Un precio por especie por día, guardado por el cron. Como exchange_rate_history: no es data de nadie.';

alter table holding_price_history enable row level security;

-- Igual que exchange_rate_history (00025): la lee cualquiera con sesión, y sin
-- policies de escritura solo la escribe service_role desde el cron.
create policy "authenticated users can read holding prices" on holding_price_history
  for select to authenticated using (true);


-- ── 5. El modo se completa solo ───────────────────────────────────────────
--
-- Sin esto, cualquier código que cree o edite una billetera sin conocer
-- `investment_mode` choca con el CHECK de arriba. Pasó de verdad: entre esta
-- migración y el deploy que la acompaña, la app en producción no manda el
-- campo, y crear una billetera de inversión habría fallado.
--
-- Una billetera que pasa a ser de inversión sin decir el modo es "saldo", que
-- es lo que significaba "inversión" hasta hoy. Una que deja de serlo pierde el
-- modo.

create or replace function normalize_wallet_investment_mode()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.type = 'inversion' then
    new.investment_mode := coalesce(new.investment_mode, 'saldo');
  else
    new.investment_mode := null;
  end if;
  return new;
end;
$$;

create trigger wallets_normalize_investment_mode
  before insert or update of type, investment_mode on wallets
  for each row execute function normalize_wallet_investment_mode();
