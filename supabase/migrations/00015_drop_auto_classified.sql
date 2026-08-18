-- La clasificacion automatica de transacciones por IA se borro junto con el
-- resto del modulo de chat/voz (2026-08-18). Esta columna quedo vestigial:
-- ningun endpoint la pone en true desde entonces, y el usuario prefiere
-- cargar y categorizar transacciones manualmente.
alter table transactions
  drop column if exists auto_classified;
