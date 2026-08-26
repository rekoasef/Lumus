-- ============================================================
-- MIGRATION 00021 — AGREGADOS DE FINANZAS EN SQL
-- ============================================================
-- Hasta ahora los totales se calculaban en JavaScript sobre un array de
-- transacciones que el server component traia con un tope fijo (500 en
-- /finanzas, 400 en /dashboard). Con mas transacciones que ese tope, filtrar
-- por un año mostraba un total INCOMPLETO sin avisarlo — un numero mal que
-- parece bien, que es el peor modo de falla para una app de finanzas.
--
-- Esta funcion devuelve los totales agregados por (tipo, categoria, moneda).
-- El resultado tiene decenas de filas como mucho, sin importar cuantas
-- transacciones haya detras, asi que ya no hay tope que ajustar.
--
-- Se agrupa por MONEDA y no se convierte a ARS acá a proposito: la
-- cotizacion la resuelve el cliente con `toARS` contra la API de
-- cotizaciones, que la base no conoce.
--
-- SECURITY INVOKER (el default), igual que `merge_finance_categories`
-- (00020): corre con los permisos del usuario, asi que RLS sigue aplicando
-- sobre `transactions` y `wallets`. El `user_id = auth.uid()` explicito es
-- redundante con RLS pero deja la intencion escrita.
-- ============================================================

create or replace function get_finance_summary(
  p_from date default null,
  p_to   date default null
)
returns table (
  type        text,
  category_id uuid,
  currency    text,
  total       numeric,
  tx_count    bigint
)
language sql
stable
set search_path = public
as $$
  select
    t.type,
    t.category_id,
    coalesce(w.currency, 'ARS') as currency,
    sum(t.amount)               as total,
    count(*)                    as tx_count
  from transactions t
  left join wallets w on w.id = t.wallet_id
  where t.user_id = auth.uid()
    and t.deleted_at is null
    and (p_from is null or t.date >= p_from)
    and (p_to   is null or t.date <= p_to)
  group by t.type, t.category_id, coalesce(w.currency, 'ARS');
$$;

-- Mismo criterio que 00017: nadie sin login ejecuta funciones de la app.
revoke execute on function get_finance_summary(date, date) from public, anon;
grant  execute on function get_finance_summary(date, date) to authenticated, service_role;

-- El agregado siempre filtra por usuario + rango de fechas y descarta los
-- borrados. Los indices que habia (`user_id` y `date` por separado, 00001)
-- obligaban a la base a elegir uno de los dos.
create index if not exists idx_transactions_user_date_active
  on transactions(user_id, date)
  where deleted_at is null;
