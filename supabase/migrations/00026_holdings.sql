-- ============================================================
-- MIGRATION 00026 — TENENCIAS
-- ============================================================
-- Las billeteras "Ahorro en dólares" e "Inversiones MP" son plata real
-- guardada como un número opaco que hay que actualizar a mano. Lumus sabe que
-- hay algo ahí, pero no si creció o se achicó.
--
-- Las apps de gastos terminan donde empiezan las inversiones. Esto es lo que
-- hace que Lumus deje de ser una app de gastos.
--
-- **Carga manual, como todo el resto.** Nada de conectarse a un exchange o a un
-- broker: eso son las credenciales de la plata de alguien, y es otro producto y
-- otro nivel de responsabilidad.
--
-- Se borran físicamente, como `budgets` y `saving_goals`: ninguna otra tabla
-- las referencia para mostrar historial, así que no hay datos ajenos que
-- perder.
-- ============================================================

create table holdings (
  id       uuid primary key default gen_random_uuid(),
  user_id  uuid not null references auth.users(id) on delete cascade,

  name     text not null check (char_length(btrim(name)) between 1 and 60),
  kind     text not null check (kind in ('cripto', 'accion', 'otro')),

  -- Id de CoinGecko ('bitcoin', 'ethereum'). Null = el precio lo pone el
  -- usuario a mano, que es el caso de todo lo que no sea cripto: no hay fuente
  -- gratuita decente de acciones argentinas.
  price_source text,

  -- 8 decimales porque 0,00042 BTC es una tenencia real.
  quantity numeric(24, 8) not null check (quantity > 0),

  -- Precio pagado **por unidad**, en la moneda con la que se pagó.
  purchase_price    numeric(18, 4) not null check (purchase_price >= 0),
  purchase_currency text not null default 'USD' check (purchase_currency in ('ARS', 'USD')),
  purchase_date     date not null,

  -- Precio actual por unidad, en USD, para lo que no tiene fuente automática.
  -- Es el equivalente al saldo de una billetera: lo actualiza el usuario.
  manual_price numeric(18, 4) check (manual_price >= 0),

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  -- Sin precio no se puede valuar, y una tenencia que no se puede valuar no
  -- suma nada al patrimonio: rompe justo lo que esta tabla vino a arreglar.
  constraint holdings_needs_a_price check (price_source is not null or manual_price is not null)
);

comment on table holdings is
  'Inversiones cargadas a mano. El precio de cripto se busca en CoinGecko; el resto lo actualiza el usuario.';
comment on column holdings.purchase_currency is
  'Si es ARS, el costo se convierte a USD con la cotización de purchase_date (exchange_rate_history) — comparar pesos de hace dos años con los de hoy no dice nada.';

create index idx_holdings_user on holdings (user_id, created_at desc);

alter table holdings enable row level security;

create policy "users manage own holdings" on holdings
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
