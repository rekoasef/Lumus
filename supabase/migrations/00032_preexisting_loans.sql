-- ============================================================
-- MIGRATION 00032 — PRÉSTAMOS QUE YA VENÍAS PAGANDO (F3)
-- ============================================================
-- Crear un préstamo mete la plata en la billetera (el desembolso, ver 00029).
-- Es correcto si lo sacaste hoy. Pero la plata de un préstamo de hace un año
-- ya entró y ya se gastó, y el saldo de la billetera ya lo refleja: cargarlo
-- como nuevo la suma **por segunda vez**. Y las cuotas viejas cargadas como
-- pagos caerían como gastos de este mes.
--
-- Un préstamo preexistente es **una deuda sin movimiento de plata**:
--
--   preexisting             → no tiene desembolso. La app no lo crea, y si se
--                             prende al editar, lo saca.
--   repaid_before_tracking  → lo devuelto antes de empezar a usar Lumus. Es un
--                             número en el préstamo, no movimientos: así no
--                             ensucia reportes de meses que ya cerraron.
--
-- Va en plata también en los tomados, aunque la pantalla pregunte en cuotas:
-- lo pendiente es `total − (lo devuelto antes + lo registrado)`, y "lo que
-- falta se mide en plata" es la regla del arreglo del 2026-09-14.
-- ============================================================

alter table loans
  add column preexisting            boolean       not null default false,
  add column repaid_before_tracking numeric(12,2) not null default 0;

-- Lo devuelto antes solo existe en un préstamo preexistente: en uno nuevo, todo
-- lo devuelto está en `transactions`, y un número suelto acá se contaría dos
-- veces.
alter table loans add constraint loans_repaid_before_only_preexisting check (
  repaid_before_tracking = 0 or preexisting
);

-- No se puede haber devuelto más de lo que había que devolver. El tope es el
-- mismo que usa `loanProgress` para medir lo pendiente: el total de las cuotas
-- en un tomado, lo prestado en un otorgado.
alter table loans add constraint loans_repaid_before_within_total check (
  repaid_before_tracking >= 0
  and repaid_before_tracking <= case
    when direction = 'tomado' and installments is not null then installments * installment_amount
    else principal
  end
);

comment on column loans.preexisting is
  'Préstamo que ya venía corriendo antes de cargarlo: no tiene desembolso en ninguna billetera.';
comment on column loans.repaid_before_tracking is
  'Lo devuelto antes de cargarlo en Lumus, en plata. Solo en préstamos preexistentes.';
