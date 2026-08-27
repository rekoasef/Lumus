-- ============================================================
-- MIGRATION 00027 — ANÁLISIS DE PATRIMONIO
-- ============================================================
-- Con `D1` (historia de cotizaciones) y `D2` (tenencias) la IA puede contestar
-- algo que **nadie más puede contestar, porque nadie más tiene estos datos**:
-- qué le pasó a tu patrimonio, no al mercado.
--
-- Misma forma que `finance_reports`, y por la misma razón: una fila por usuario
-- y por mes, con contador de regeneraciones. Es otra llamada paga, y el tope
-- vive en `lib/finance/report-limits.ts`.
--
-- Tabla aparte y no una columna en `finance_reports` porque son dos cosas
-- distintas: el reporte mira un mes de movimientos, esto mira una foto del
-- patrimonio. Meterlas en la misma fila obligaría a generarlas juntas.
-- ============================================================

create table wealth_analyses (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  month         text not null check (month ~ '^\d{4}-\d{2}$'),
  content       text not null,
  regenerations integer not null default 0 check (regenerations >= 0),
  created_at    timestamptz not null default now(),

  unique (user_id, month)
);

comment on table wealth_analyses is
  'Análisis de patrimonio generado por IA. Uno por usuario y por mes; el tope de regeneraciones está en el código.';

alter table wealth_analyses enable row level security;

create policy "users read own wealth analyses" on wealth_analyses
  for select using (auth.uid() = user_id);

-- Lo crea y actualiza la API route, que corre con la sesión del usuario.
create policy "users create own wealth analyses" on wealth_analyses
  for insert with check (auth.uid() = user_id);

create policy "users update own wealth analyses" on wealth_analyses
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
