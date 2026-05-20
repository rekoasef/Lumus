-- Agrega soporte para vencimientos de monto variable
-- y columna para rastrear si fue marcado como pagado en el ciclo actual

alter table subscriptions
  add column if not exists variable boolean not null default false;
