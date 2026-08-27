-- ============================================================
-- MIGRATION 00024 — TOPE DE REGENERACIONES DEL REPORTE
-- ============================================================
-- El reporte mensual es la única llamada a la API de Claude que hay en Lumus,
-- y hasta ahora el botón "Regenerar" no tenía tope: cada click era una llamada
-- paga. Con 150-300 reportes por mes, un usuario aburrido apretando el botón
-- es la única forma que tiene la app de gastar plata sin control.
--
-- Se cuenta en la fila del reporte y no en una tabla aparte porque el límite es
-- por mes y por usuario, que es exactamente la clave de `finance_reports`.
-- ============================================================

alter table finance_reports
  add column regenerations integer not null default 0
  check (regenerations >= 0);

comment on column finance_reports.regenerations is
  'Cuántas veces se rehizo este reporte. El tope vive en el código (MAX_REPORT_REGENERATIONS).';
