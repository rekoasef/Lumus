-- Limpieza de schema muerto: tablas de los módulos que se sacaron del código
-- en el pivot a "Lumus Finanzas" (2026-06-29) — organización, comidas, fit,
-- hábitos, journal, relaciones, estudio — más las tablas del chat/voz de IA
-- que se borró después (2026-08-18). Ninguna tiene código que las use hoy
-- (verificado con grep sobre src/); quedaban con RLS habilitado y sin
-- policies, es decir deny-all, no una vulnerabilidad activa — pero es
-- schema muerto que solo agrega ruido.
--
-- Si alguno de estos módulos vuelve, recuperar la definición de
-- supabase/migrations/00001_initial_schema.sql (y 00009 para task_completions).

-- Organización
drop table if exists task_completions cascade;
drop table if exists task_label_assignments cascade;
drop table if exists calendar_events cascade;
drop table if exists tasks cascade;
drop table if exists task_labels cascade;
drop table if exists routines cascade;
drop table if exists objectives cascade;

-- Comidas & nutrición
drop table if exists meal_logs cascade;
drop table if exists shopping_list_items cascade;
drop table if exists recipes cascade;

-- Fit & salud
drop table if exists workout_routine_exercises cascade;
drop table if exists workout_session_logs cascade;
drop table if exists workout_sessions cascade;
drop table if exists workout_routines cascade;
drop table if exists workout_exercises cascade;
drop table if exists body_records cascade;
drop table if exists health_logs cascade;

-- Hábitos
drop table if exists habit_logs cascade;
drop table if exists habits cascade;

-- Journal
drop table if exists journal_entries cascade;
drop table if exists mood_logs cascade;

-- Relaciones
drop table if exists contact_events cascade;
drop table if exists contacts cascade;

-- Estudio & aprendizaje
drop table if exists study_notes cascade;
drop table if exists study_topics cascade;

-- Módulo IA (chat/voz, borrado del código el 2026-08-18)
drop table if exists ai_conversations cascade;
drop table if exists ai_cache cascade;
drop table if exists user_context_cache cascade;
