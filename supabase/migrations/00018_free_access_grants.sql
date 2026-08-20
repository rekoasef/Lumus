-- ============================================================
-- MIGRATION 00018 — ACCESO GRATIS (BETA TESTERS / CORTESIA)
-- ============================================================
-- El paywall exige `billing_subscriptions.status = 'authorized'`, asi que
-- hasta ahora la unica forma de que alguien entrara sin pagar era insertarle
-- a mano una fila de facturacion falsa. Esto le da un lugar propio y honesto.
--
-- Por que una tabla aparte y no una columna en `user_profiles`:
-- la policy de `user_profiles` es "users can manage own data", o sea que el
-- propio usuario puede hacer UPDATE sobre su fila. Una columna ahi seria
-- auto-otorgable desde la consola del navegador — regalar el paywall.
--
-- Esta tabla tiene RLS con UNA sola policy, de SELECT. No hay policy de
-- insert, update ni delete: con RLS activo, la ausencia de policy significa
-- denegado. Solo `service_role` (que bypassea RLS) o el owner de la base
-- pueden otorgar un acceso. Ver docs/ADMIN.md para el SQL.
-- ============================================================

create table free_access_grants (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  reason     text not null,
  -- null = sin vencimiento. Con fecha, el acceso cae solo y el usuario vuelve
  -- a /suscripcion sin tocar una linea de codigo.
  expires_at timestamptz,
  granted_at timestamptz not null default now()
);

comment on table free_access_grants is
  'Accesos de cortesia al paywall (beta testers, amigos). Solo escribible por service_role.';

alter table free_access_grants enable row level security;

-- Unica policy: el usuario ve su propio grant (lo necesita /perfil para
-- mostrar "Acceso de cortesia"). No puede crearlo ni modificarlo.
create policy "users can read own grant" on free_access_grants
  for select using (auth.uid() = user_id);
