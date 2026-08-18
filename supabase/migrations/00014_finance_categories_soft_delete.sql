-- Borrar una categoria fisicamente arrastraba dos problemas: los presupuestos
-- de esa categoria se borraban en cascada (finance_categories -> budgets es
-- "on delete cascade"), y las transacciones/vencimientos historicos con esa
-- categoria quedaban sin nombre/color (finance_categories -> transactions y
-- recurring_transactions son "on delete set null"). Con soft delete, la fila
-- sigue existiendo para los joins historicos y los presupuestos ya no se
-- cascadean — solo se oculta de las listas activas.
alter table finance_categories
  add column if not exists deleted_at timestamptz;
