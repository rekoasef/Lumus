-- El modulo de marketing (branding, ideas de contenido, mensajes, posts
-- agendados, slides) no forma parte del codigo de Lumus — ninguna migracion
-- de este repo las creo y ningun endpoint las usa. Detectadas el 2026-08-18
-- al regenerar tipos de Supabase. Backup de la unica fila con datos
-- (marketing_brand, 1 fila) guardado fuera del repo en
-- ~/lumus-dropped-modules-backup-2026-08-18/marketing_brand.json antes de
-- este DROP.
drop table if exists marketing_content_messages cascade;
drop table if exists marketing_scheduled_posts cascade;
drop table if exists marketing_slides cascade;
drop table if exists marketing_content_ideas cascade;
drop table if exists marketing_business_ideas cascade;
drop table if exists marketing_brand cascade;
