-- ============================================================
-- MIGRATION 00039 — FUERA LOS DATOS DE PERFIL QUE NO USA NADIE
-- ============================================================
-- El onboarding pedía fecha de nacimiento, ocupación y un texto libre sobre
-- la persona. Ninguna pantalla ni informe los leía: el texto alimentaba al
-- chat de IA, que se borró el 2026-08-18. Guardar datos personales que no se
-- usan es riesgo sin beneficio (Ley 25.326: solo los datos necesarios).
--
-- Decisión del dueño del 2026-09-17. El código que los usaba se sacó antes
-- (`2b74a1d`, ya deployado): esta migración va después, para que la versión
-- publicada nunca pida una columna que ya no existe.
--
-- `monthly_salary` se queda: el perfil lo sigue mostrando.
-- ============================================================

alter table user_profiles
  drop column if exists birth_date,
  drop column if exists occupation;

drop table if exists user_life_summary;
