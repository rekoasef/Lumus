-- ============================================================
-- MIGRATION 00040 — "SALDO", NO "BALANCE"
-- ============================================================
-- Los textos de la app dejaron de usar "balance" y "ajuste", que son palabras
-- del esquema (`H4`, 2026-09-17): ahora es "saldo" y "corrección de saldo".
-- Las descripciones que el sistema generó antes quedaron con las palabras
-- viejas y se ven en la lista de movimientos. Solo se cambia el prefijo que
-- escribió el sistema: la nota que agregó cada persona queda igual.
-- ============================================================

update transactions
set description = 'Saldo inicial'
where type = 'ajuste'
  and description = 'Balance inicial';

update transactions
set description = 'Corrección de saldo' || substr(description, length('Ajuste de balance') + 1)
where type = 'ajuste'
  and (description = 'Ajuste de balance' or description like 'Ajuste de balance: %');
