-- ============================================================
-- MIGRATION 00038 — BUSCAR UNA CUENTA POR MAIL
-- ============================================================
-- Los botones de arrepentimiento y de baja (00037) se usan sin login: la
-- persona escribe su mail y hay que saber si corresponde a una cuenta, para
-- mandarle ahí el link de confirmación. La API de administración de Auth no
-- busca por mail (solo lista de a páginas), y `auth.users` no está expuesta
-- por PostgREST.
--
-- Devuelve solo el id. La ejecuta únicamente `service_role`: expuesta a
-- `anon`, serviría para averiguar qué mails tienen cuenta en Lumus.
-- ============================================================

create or replace function find_user_id_by_email(p_email text)
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select id
  from auth.users
  where lower(email) = lower(trim(p_email))
  limit 1;
$$;

revoke execute on function find_user_id_by_email(text) from public, anon, authenticated;
grant  execute on function find_user_id_by_email(text) to service_role;
