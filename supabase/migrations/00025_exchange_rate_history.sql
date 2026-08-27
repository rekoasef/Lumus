-- ============================================================
-- MIGRATION 00025 — HISTORIA DE COTIZACIONES
-- ============================================================
-- Lumus sabía cuánto vale el dólar **ahora** y nada más: la cotización vivía en
-- un caché en memoria de una hora y se perdía. No tenía idea de cuánto valía en
-- marzo.
--
-- Sin esa historia la app no puede contestar la única pregunta que importa acá:
-- ¿tu plata creció, o solo creció el número? "Ahorraste 200.000 pesos este mes"
-- no dice nada si no sabés qué hizo el dólar en esos treinta días.
--
-- No lleva `user_id` a propósito: el dólar vale lo mismo para todos. Es el
-- primer dato compartido de la app, así que la RLS es al revés que en el resto
-- — cualquiera logueado lee, nadie escribe salvo `service_role` desde el cron.
--
-- El balance de cada billetera sale de la suma de sus transacciones (ver
-- `recompute_wallet_balance`, 00008), así que con esta tabla el patrimonio de
-- cualquier fecha pasada se puede reconstruir sin haber guardado fotos.
-- ============================================================

create table exchange_rate_history (
  date       date primary key,
  -- Pesos por dólar. Promedio entre compra y venta del blue, igual que el
  -- valor que la app venía usando en vivo.
  usd        numeric(12,2) not null check (usd > 0),
  -- Nullable a propósito: bluelytics publica el histórico del dólar desde 2011
  -- pero **no el del euro**. Las filas sembradas hacia atrás no lo tienen, y
  -- las nuevas sí. Una app que finge un dato que no tiene es peor que una que
  -- lo deja vacío.
  eur        numeric(12,2) check (eur > 0),
  source     text not null default 'bluelytics',
  created_at timestamptz not null default now()
);

comment on table exchange_rate_history is
  'Cotización por día, compartida por todos los usuarios. La escribe el cron diario; el histórico se sembró desde bluelytics.';
comment on column exchange_rate_history.eur is
  'Null en las filas históricas: bluelytics no publica euro hacia atrás.';

-- Las consultas son siempre por rango de fechas, de más nueva a más vieja.
create index idx_exchange_rate_history_date on exchange_rate_history (date desc);

alter table exchange_rate_history enable row level security;

-- No es data de nadie: cualquiera con sesión la lee. Sin policy de insert,
-- update ni delete — con RLS activo, la ausencia de policy es denegado.
create policy "authenticated users can read exchange rates" on exchange_rate_history
  for select to authenticated using (true);
