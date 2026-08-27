# Lumus — Estado actual del proyecto

Última revisión: 2026-08-27

Este documento es el snapshot técnico y funcional del repo. No reemplaza los docs de producto; funciona como punto de entrada para retomar desarrollo, priorizar trabajo y tener una foto honesta de dónde estamos parados.

---

## Resumen ejecutivo

**El alcance del producto cambió radicalmente respecto a la visión original de "Sistema Operativo Personal".** El 2026-06-29 (commit `cf7bddd "Lumus Finanzas"`) el proyecto se redujo a propósito a una sola cosa: **una app de finanzas personales con IA**, sacando organización, comidas, fit y hábitos del código.

Desde entonces, esta sesión (2026-08-14 a 2026-08-18) sumó tres piezas:

1. **Auth completo**: verificación de email por código de 6 dígitos y recuperación de contraseña (antes solo había login/registro sin confirmación).
2. **Paywall con Mercado Pago Suscripciones**: sin suscripción activa (`status='authorized'`), el usuario no entra al dashboard.
3. **Limpieza del schema muerto**: las tablas de los módulos removidos en junio (organización, comidas, fit, hábitos, journal, relaciones, estudio) y del chat/voz de IA (borrado del código el mismo día) se eliminaron de la base con backup previo — ver `00013_drop_unused_modules.sql` y la sección "Limpieza de schema" más abajo.

También se borró el módulo de chat/voz de la IA (Lumus como asistente conversacional) — no estaba en el foco de "Finanzas" y arrastraba deuda técnica considerable (ver issues cerrados en `ISSUES_PENDIENTES.md`).

El proyecto hoy es: **auth → onboarding → paywall → dashboard de finanzas**. Build, TypeScript y lint pasan limpios.

### Sesión del 2026-08-20 — backlog `B1`–`B7` cerrado

Se trabajó el backlog completo de `docs/BACKLOG.md`, siete tareas, todas cerradas y **deployadas a producción**. El cambio de fondo: **Lumus dejó de ser una app de un solo usuario.**

| | Qué |
|---|---|
| `B1` | Backups cifrados manuales (`npm run backup`) — el plan free de Supabase no tiene backups de ningún tipo |
| `B2` | Hardening previo al segundo usuario (`00017`) |
| `B3` | Accesos de cortesía al paywall (`00018`) |
| `B4` | Runbooks de admin en `docs/ADMIN.md`, sin panel |
| `B5` | Feedback in-app con aviso por mail (`00019`) |
| `B6` | Unificar categorías (`00020`) |
| `B7` | 141 íconos y picker rediseñado |

Después del backlog se sumaron dos cosas más: el **aviso por mail** de cada feedback (Resend) y el **rediseño de las pantallas de auth** con panel de marca.

**Usuarios reales: 2.** El dueño (`renzoasef02@gmail.com`, 2.306 transacciones) y un beta tester (`tiagotossi10@gmail.com`), ambos con acceso de cortesía. `billing_subscriptions` quedó en **0 filas**: ya no hay datos falsos de facturación en la base. Las dos cuentas de prueba que quedaban se borraron tras verificar que no tenían ningún dato.

### Sesión del 2026-08-27 — `C2` a `C6` cerrados

**`C3` cerrado y verificado**: las reglas financieras que estaban escritas dos veces (progreso de una meta, uso de un presupuesto, equivalente mensual de un recurrente) viven ahora en `src/lib/finance/rules.ts`, los nueve `Intl.NumberFormat` sueltos se unificaron en `format-currency.ts`, y el proyecto tiene **Vitest** con 21 tests sobre esas funciones puras. Es la deuda que dejó el bug de las metas del 2026-08-26 (62% en una pantalla, 0% en otra).

**`C2` cerrado y deployado**: hay **Sentry** en los tres runtimes. Un error de servidor deja de morirse en silencio — antes, el único canal de detección era que a alguien se le ocurriera apretar el botón de feedback. El grueso del ticket fue el scrubbing: los defaults del SDK mandan bodies, cookies, headers, query strings y las variables locales del stack, que en un handler de transacciones son el monto y la descripción. Verificado dos veces, en local contra un sink falso y desde producción con una ruta temporal ya borrada.

**`C4` cerrado y deployado**: **Lumus ahora avisa.** Hasta hoy no le avisaba nada a nadie, nunca: `recurring_transactions` guardaba `next_date` y ahí moría. Ahora hay un cron diario (8 AM hora argentina) que busca vencimientos a ≤3 días o ya vencidos y manda **un** mail por usuario por día con todo junto.

Lo que se construyó es la cañería, no un aviso suelto: `C5` y `C8` mandan por acá. La pieza que sostiene todo es `unique (user_id, dedupe_key)` — un cron se reintenta, y dos mails iguales es todo lo que hace falta para que alguien apague los avisos para siempre.

**`C5` cerrado y deployado**: el motor de `C4` ahora tiene **seis tipos de aviso** (vencimientos, presupuesto al 80%, presupuesto excedido, meta alcanzada, reporte mensual y resumen semanal) y un lugar donde verlos: campanita con badge en el nav, panel con marcar leído, y preferencias por tipo y por canal en `/perfil` (sección `04 Avisos`). Los avisos de más de 90 días se borran solos en la corrida del cron.

Ningún aviso nuevo recalcula una regla: el uso de un presupuesto y el progreso de una meta salen de `lib/finance/rules.ts` (`C3`). Era exactamente el bug de las metas esperando repetirse, ahora con un mail de por medio.

**`C6` cerrado y deployado**: Lumus es **instalable**. Manifest, íconos, meta tags de iOS y un atajo "Cargar gasto" que abre el formulario ya precargado con la categoría y la billetera que más usás (calculadas sobre los últimos 60 días). Apareció un bug de camino: el gate de auth contestaba `307` a `/manifest.webmanifest`, así que el manifest existía y el navegador no lo podía leer — la app no era instalable. Falta lo que solo se puede hacer con un teléfono en la mano: instalarla en Android y iOS y cronometrar la carga de un gasto.

**Pendiente chico de `C2`**: los stack traces de producción apuntan al chunk compilado. Para verlos contra el código fuente falta cargar un `SENTRY_AUTH_TOKEN` (permiso `project:releases`) en Vercel — `next.config.ts` ya lo lee si está. Y la alerta por mail se configura en el dashboard de Sentry: conviene dejarla en **errores nuevos**, no en cada ocurrencia repetida.

---

## Stack real instalado

| Elemento | Versión / Estado |
|---|---|
| Next.js | 16.2.6 — App Router, `src/app` |
| React | 19.2.4 |
| TypeScript | strict, sin errores |
| Tailwind CSS | v4 via `@tailwindcss/postcss` — sin `tailwind.config.ts` |
| Supabase | `@supabase/ssr` + `@supabase/supabase-js`, más un client `service_role` (`src/lib/supabase/service.ts`) solo para el webhook de billing |
| Framer Motion | instalado, usado en animaciones |
| Zustand | instalado (sin store activo desde que se borró `ai-store.ts`) |
| React Hook Form + Zod | en uso en todos los formularios |
| Recharts | usado en reportes de finanzas |
| lucide-react | íconos en toda la app |
| Anthropic SDK | `claude-sonnet-5`, único proveedor de IA que queda (resumen de reportes financieros). El reporte se puede rehacer **una sola vez por mes** — ver `lib/finance/report-limits.ts` |
| Mercado Pago | sin SDK — llamadas directas a la API REST de `/preapproval` desde `src/lib/billing/` |
| Resend | SMTP de Supabase Auth para los mails de verificación/recuperación (`supabase/templates/`) |
| shadcn/ui | base instalada — `components/ui/` |
| Vitest | desde el 2026-08-27 (`C3`) — 83 tests sobre funciones puras, `npm test` |

> El SDK de OpenAI (`gpt-4o-mini`, usado antes para clasificación y TTS) se desinstaló al borrar el módulo de chat/voz. Ya no hay clasificación automática de gastos por IA — consistente con la preferencia del usuario de cargar todo manualmente.

---

## Números del repo

Al 2026-08-20:

- Archivos TypeScript/TSX en `src`: **116**
- Componentes en `src/components`: **41**
- Hooks en `src/hooks`: **10**
- API route handlers: **23**
- Migraciones Supabase: **20**
- Tablas en `public`: **16** (14 + `free_access_grants` + `feedback`)
- Usuarios reales: **2** — el dueño y un beta tester
- Transacciones: **2.306** (723 activas, 1.583 con `deleted_at` de la limpieza del import de MyFinance)
- Tamaño de la base: **14 MB** de los 500 MB del plan free (2,7%)

---

## Rutas App Router

### Implementadas y funcionales

| Ruta | Estado |
|---|---|
| `/` | Redirecciona según sesión, verificación, onboarding y suscripción |
| `/login` | Auth con email + password, detecta cuenta no confirmada y ofrece reenviar código |
| `/register` | Registro → redirige a `/verify` |
| `/verify` | Confirmación por código de 6 dígitos (Resend) |
| `/forgot-password`, `/reset-password` | Recuperación de contraseña por código |
| `/onboarding` | 3 pasos: bienvenida, perfil, resumen libre |
| `/suscripcion` | Paywall — botón de pago Mercado Pago, polling hasta que el webhook confirma |
| `/dashboard` | Resumen de billeteras, presupuestos, vencimientos y metas de ahorro |
| `/finanzas` | Dashboard financiero completo |
| `/finanzas/reportes` | Reportes con gráficos y resumen IA |
| `/perfil` | Perfil editable, tarjeta de suscripción o acceso de cortesía, y cambio de contraseña colapsable |

### Ya no existen (removidas en el pivot a "Lumus Finanzas")

`/organizacion`, `/comidas`, `/fit`, `/habitos` — tenían UI funcional en la revisión anterior de este doc (2026-05-21), pero el código se borró por completo. `/journal`, `/relaciones`, `/estudio` nunca tuvieron página y ahora tampoco están linkeadas en la navegación (antes sí, apuntaban a 404).

---

## Estado por módulo

### Auth & Core

- Login, registro, middleware de rutas protegidas: funcional.
- **Verificación de email por código de 6 dígitos** (`/verify`, template custom vía Resend) en vez del link default de Supabase (limitado a ~2 mails/hora, no apto para producción).
- **Recuperación de contraseña** por código (`/forgot-password` → `/reset-password`).
- Onboarding 3 pasos con guardado en `user_profiles` y `user_life_summary`: funcional.
- Perfil editable, con el cambio de contraseña colapsado detrás de un toggle.
- **Pantallas de auth rediseñadas (2026-08-20)**: panel de marca partido en el layout de `(auth)`, con el orbe como protagonista, gradientes y grilla; en mobile colapsa a un header compacto. El bloque de logo estaba copiado en las cinco páginas y ahora vive en un solo lugar (`components/shared/auth-brand.tsx`). El login decía **"Sistema operativo personal"** —el alcance previo a junio— y ahora dice "Tus finanzas, claras.".

### Billing / Paywall

- Ver `docs/BILLING.md` para el detalle completo (deployado y probado con plata real en producción).
- **El gate ya no mira solo la suscripción.** Desde `00018`, un usuario entra si tiene `billing_subscriptions.status = 'authorized'` **o** un acceso de cortesía vigente en `free_access_grants`. La regla vive en un solo lugar, `src/lib/billing/access.ts` (`getAccessStatus` / `hasAccess`), y la consultan tres: `lib/supabase/middleware.ts`, `(dashboard)/layout.tsx` y `suscripcion/page.tsx` — esta última para que alguien con acceso gratis no pueda pagar de más.
- `free_access_grants` tiene RLS con **una sola policy, de SELECT**: el usuario lee su grant pero no puede crearlo. Solo `service_role` escribe. Un campo en `user_profiles` no servía porque su policy deja al usuario hacer `UPDATE` sobre su propia fila.
- Pendiente antes de un lanzamiento real: subir el precio de prueba ($1000 ARS) al precio final, y probar el caso de suscripción `paused`.

### Dashboard

- Server component que agrega billeteras, presupuestos, vencimientos y metas de ahorro.
- Ya no muestra tareas/hábitos/mood (esos módulos no existen más) ni el orbe clickeable de Lumus (era el entry point al chat, que se borró — el orbe queda como elemento decorativo).
- Estado: funcional.

### Finanzas ★ (único módulo de producto)

#### Qué está implementado

- **Billeteras**: CRUD, ajuste de balance (como transacción `ajuste`, no afecta KPIs), balance recalculado por trigger SQL.
- **Categorías**: seed de defaults por RPC, CRUD custom.
- **Transacciones**: CRUD, validación Zod, soft delete. Sin clasificación automática por IA (se borró junto con el módulo de chat) — carga 100% manual.
- **Presupuestos**: límite mensual por categoría, auto-copia del mes más reciente si el mes pedido (actual o futuro) no tiene presupuestos propios.
- **Vencimientos recurrentes** (`recurring_transactions`, antes `subscriptions`): CRUD, toggle activo/inactivo, pago que genera transacción y avanza la próxima fecha.
- **Metas de ahorro**: ahora pueden sumar el progreso de **varias billeteras a la vez** (tabla puente `saving_goal_wallets`, migración `00012`) — antes era una sola billetera por meta. El progreso es la suma de los balances convertidos a ARS.
- **Reportes**: gráficos mensuales de gastos vs ingresos, resumen por IA (Claude) persistido en `finance_reports`, exportable a PDF.
- **Cotizaciones**: `/api/finance/exchange-rates`, conversión a ARS para sumar billeteras en distinta moneda.
- **Unificar categorías** (nuevo, `00020`): mueve transacciones, vencimientos y presupuestos de una categoría a otra de forma atómica, sumando los presupuestos que chocan en el mismo mes, y oculta el origen. Es `SECURITY INVOKER`, así que RLS sigue aplicando. Reasigna también las transacciones borradas, pero le informa al usuario solo las visibles.
- **Íconos** (ampliado 2026-08-20): de 24 a **141**, en 12 grupos temáticos y con sinónimos en español para el buscador (`auto` → `car`, `nafta` → `fuel`). El picker es compartido por categorías, billeteras y metas — estas dos últimas tenían la columna `icon` sin usar desde siempre.

#### Deuda conocida

Ver `docs/ISSUES_PENDIENTES.md` — resumen: `as any` en el seed de categorías, y el campo `transactions.auto_classified` quedó vestigial (nada lo pone en `true` desde que se borró el clasificador). Las categorías ahora tienen soft delete (`deleted_at`, igual que `transactions` y `wallets`); presupuestos, vencimientos y metas de ahorro se borran físicamente a propósito, documentado en `CLAUDE.md`.

---

### Feedback (nuevo, 2026-08-20)

- Botón flotante en todas las pantallas del dashboard (`components/shared/feedback-button.tsx`). Tres tipos: bug, mejora, otro.
- Guarda **la ruta desde la que se reportó** — sin eso, "no me anda el botón" es imposible de ubicar — más el user agent, tomado del header en el servidor y no del body.
- `POST /api/feedback` valida con Zod y dispara un **mail formateado** al dueño vía Resend (`lib/feedback/notify-email.ts`). El envío está aislado en un `try/catch`: si falla, el reporte igual se guardó y el usuario no ve error ni reintenta duplicando.
- El mail se diseña **en claro, no en oscuro**: Gmail fuerza los mails oscuros a tema claro y los grises pensados para fondo negro quedan ilegibles.
- Depende de dos env vars **en Vercel**: `RESEND_API_KEY` (no estaba, porque los mails de auth salen por el SMTP de Supabase) y `FEEDBACK_NOTIFICATION_EMAIL`.
- Se lee desde el SQL editor — ver `docs/ADMIN.md`. No hay panel de admin, es una decisión explícita.

### Backups (nuevo, 2026-08-20)

- `npm run backup` → `scripts/backup.mjs`. Ver `docs/BACKUP.md`.
- El plan free de Supabase **no tiene backups de ningún tipo**; este script es la única red de contención.
- Verifica el dump fila por fila contra producción antes de cifrarlo, y aborta borrando el archivo si algo no cuadra.
- **La restauración se probó de verdad** en un PostgreSQL 17.9 local: exit code 0, conteos idénticos, balances y joins coincidiendo. La prueba destapó dos bugs silenciosos (`CREATE SCHEMA public;` y el orden de `auth` vs `public` por las FK).

## Limpieza de schema (2026-08-18)

`organizacion` (tareas, calendario, rutinas, objetivos), `comidas` (recetas, meal logs, lista de supermercado), `fit` (registros corporales, rutinas, sesiones de entrenamiento) y `habitos` tenían UI y API funcionando en la revisión de mayo. El pivot a "Lumus Finanzas" borró todo el código de la aplicación en junio, pero las tablas siguieron existiendo en la base hasta hoy.

`00013_drop_unused_modules.sql` borró 28 tablas sin código que las use: las de organización/comidas/fit/hábitos/journal/relaciones/estudio (`tasks`, `task_labels`, `task_label_assignments`, `task_completions`, `routines`, `objectives`, `calendar_events`, `recipes`, `meal_logs`, `shopping_list_items`, `body_records`, `workout_*`, `health_logs`, `habits`, `habit_logs`, `journal_entries`, `mood_logs`, `contacts`, `contact_events`, `study_topics`, `study_notes`) y las del chat/voz de IA (`ai_cache`, `ai_conversations`, `user_context_cache`). No era un bug de seguridad — la mayoría tenía RLS habilitado sin policies (deny-all por default en Postgres, sin exposición real) — pero era ruido de schema que no correspondía al producto real.

**Antes de borrar se verificó fila por fila**: 15 de esas 28 tablas estaban en 0, pero 13 tenían datos reales de cuando esos módulos estaban activos (`tasks`: 16, `shopping_list_items`: 37, `ai_conversations`: 34, `ai_cache`: 31, `meal_logs`: 12, `task_completions`: 2, `health_logs`: 2, `workout_routine_exercises`: 5, `workout_exercises`: 5, `recipes`: 1, `workout_routines`: 1, `user_context_cache`: 1). Se hizo un backup completo (JSON por tabla) fuera del repo en `~/lumus-dropped-modules-backup-2026-08-18/` antes de correr el `DROP`.

### Dos hallazgos durante la limpieza, sin resolver todavía

- **`subscriptions` quedó huérfana**: `00010_recurring_transactions.sql` no migró ni renombró esta tabla — creó `recurring_transactions` como tabla nueva y separada. `subscriptions` sigue en el schema, sin ningún endpoint que la use, con **3 filas de datos reales** (vencimientos de antes de la reescritura). No se tocó en esta limpieza porque no estaba contemplada — es una decisión aparte (ver `docs/ISSUES_PENDIENTES.md`).
- **Aparecieron 6 tablas `marketing_*`** (`marketing_brand`, `marketing_business_ideas`, `marketing_content_ideas`, `marketing_content_messages`, `marketing_scheduled_posts`, `marketing_slides`) en el mismo proyecto de Supabase (`ccixixskklovvvikiwbq`) que no están en ninguna migración de este repo. No pertenecen a Lumus — parecen ser de otra app compartiendo el mismo proyecto de Supabase. `supabase gen types typescript --linked` las trae igual, así que van a aparecer en `database.types.ts` mientras compartan proyecto. Confirmar con el dueño de esa otra app si el proyecto se debería separar.

---

## IA

Con el chat/voz borrado, el único uso de IA que queda en la app es:

| Endpoint | Modelo | Estado |
|---|---|---|
| `/api/finance/ai-report` | claude-sonnet-4-5 | Funcional, con manejo de errores de proveedor (`F4`, cerrado) |

Todo lo demás (`context-builder.ts`, `model-selector.ts`, `web-search.ts`, cache de IA en `lib/ai/cache.ts`, clasificación de transacciones, TTS, voice-stream) se eliminó el 2026-08-18, junto con las tablas `ai_cache`, `ai_conversations` y `user_context_cache` (`00013_drop_unused_modules.sql`). `ai-report` guarda directo en `finance_reports`, sin cache propia.

---

## Migraciones Supabase

| Archivo | Qué hace |
|---|---|
| `00001_initial_schema.sql` | Schema completo de todos los módulos (incluye los ya removidos del código) |
| `00002_finance_module.sql` | Índices, RPC seed categorías, trigger de balance |
| `00003_update_default_categories.sql` | Actualiza categorías default |
| `00004_subscriptions_variable_and_paid.sql` | Agrega `subscriptions.variable` |
| `00005_finance_reports.sql` | Tabla `finance_reports` con RLS |
| `00006_task_time_blocks.sql` | Agrega `tasks.start_time` y `tasks.duration_minutes` (tabla borrada en `00013`) |
| `00007_balance_adjustments_not_income_expense.sql` | Soporte lógico para `type = 'ajuste'` en transacciones |
| `00008_fix_balance_trigger.sql` | Corrección al trigger de recálculo de balance |
| `00009_recurring_tasks.sql` | Recurrencia para `tasks` (tabla borrada en `00013`) |
| `00010_recurring_transactions.sql` | Crea `recurring_transactions` (tabla nueva, no renombra `subscriptions` — esa quedó huérfana, ver "Limpieza de schema") |
| `00011_billing_subscriptions.sql` | Tabla `billing_subscriptions` para el paywall de Mercado Pago |
| `00012_saving_goal_wallets.sql` | Tabla puente `saving_goal_wallets`, reemplaza `saving_goals.wallet_id` |
| `00013_drop_unused_modules.sql` | Borra las 28 tablas de módulos removidos (organización/comidas/fit/hábitos/journal/relaciones/estudio) y del chat/voz de IA (`ai_cache`, `ai_conversations`, `user_context_cache`) — con backup previo, ver "Limpieza de schema" |
| `00014_finance_categories_soft_delete.sql` | Agrega `deleted_at` a `finance_categories` |
| `00015_drop_auto_classified.sql` | Borra `transactions.auto_classified`, vestigial desde que se borró el clasificador por IA |
| `00016_drop_marketing_module.sql` | Borra las 6 tablas `marketing_*` — un módulo de Lumus que nunca llegó a tener migración en este repo — con backup previo de la única fila con datos |
| `00017_harden_security_definer_functions.sql` | Saca el `EXECUTE` de `PUBLIC`/`anon` sobre `seed_default_finance_categories` y `recompute_wallet_balance`, les agrega validación de dueño contra `auth.uid()` y fija `search_path` en las tres funciones — hardening previo al segundo usuario, ver `docs/BACKLOG.md` (`B2`) |
| `00018_free_access_grants.sql` | Tabla `free_access_grants` — accesos de cortesía al paywall (beta testers), solo escribible por `service_role`. Ver `docs/ADMIN.md` |
| `00019_feedback.sql` | Tabla `feedback` — reportes de bugs y mejoras desde la app. `user_id` nullable con `on delete set null` para que los reportes sobrevivan al borrado de una cuenta |
| `00020_merge_finance_categories.sql` | Función `merge_finance_categories` — unifica una categoría dentro de otra de forma atómica: reasigna transacciones (incluidas las borradas), vencimientos y presupuestos (sumando los que chocan) y oculta el origen |
| `00021_finance_summary.sql` | Función `get_finance_summary(p_from, p_to)` — totales por tipo, categoría y moneda agregados en SQL, para que los totales dejen de depender de un tope de filas. `SECURITY INVOKER`, `EXECUTE` revocado a `public`/`anon`. Ver `C1` |
| `00022_notifications.sql` | Motor de avisos: tablas `notifications` y `notification_preferences`. El `unique (user_id, dedupe_key)` es lo que hace idempotente al cron. Dropea de paso la `notifications` de `00001` (era de la era "Sistema Operativo Personal": vacía, sin referencias y sin uso en el código), con un guard que aborta si tuviera filas. Ver `C4` |
| `00023_notification_types.sql` | Suma `notification_preferences.in_app_enabled` y los seis tipos de aviso a los `check` de las dos tablas. Los defaults por tipo viven en el código (`NOTIFICATION_TYPE_INFO`), no en la base. Ver `C5` |
| `00024_report_regenerations.sql` | Agrega `finance_reports.regenerations` — el botón "Regenerar" del reporte no tenía tope y cada click era una llamada paga a la API. El límite (1) vive en `lib/finance/report-limits.ts` |

---

## Chequeos locales al 2026-08-27

| Comando | Resultado |
|---|---|
| `npm test` | 83 tests en 9 archivos, verde |
| `npx tsc --noEmit` | Sin errores |
| `npm run lint` | 0 errores, **12 warnings** (bajaron de 14) |
| `npm run build` | Compila |
| `npm run backup` | Genera el backup cifrado y verifica contra producción |

Producción (`www.gestorlumus.site`) está sincronizada con `main`. El deploy es manual (`vercel --prod --yes`); ver la advertencia de abajo.

> **La base y el código deployado tienen que moverse juntos.** El 2026-08-20 quedaron desfasados unos minutos —se borró la fila de facturación falsa mientras producción todavía corría el código viejo— y eso dejó al dueño fuera de su propia app hasta el deploy siguiente. Si una tarea toca el gate de acceso, deployar en el mismo tramo.

## Issues abiertos

Ver `docs/ISSUES_PENDIENTES.md` para detalle. Todo el backlog técnico de esta revisión (`F1`, `F3`, `F4`, `F5`, `F7`, `S1`, `S3`, `S4`, `D1`) quedó cerrado. No queda nada pendiente en el backlog técnico — solo los dos pendientes propios de `docs/BILLING.md` (precio real, probar `paused`).

`S3` y `S4` se cerraron por decisión del usuario, no con cambios de código en el primer caso: `subscriptions` (tabla huérfana con 3 filas reales — Seguro moto, Definitiva, Credito Computadora) queda intacta, sin tocar; las 6 tablas `marketing_*` eran un módulo de Lumus que nunca llegó a tener migración en este repo y ya no corresponde, así que se borraron (`00016_drop_marketing_module.sql`, con backup previo de la única fila con datos).

### Issues cerrados desde la última revisión

| ID | Resolución |
|---|---|
| `#3` Rutas sin página | Los links a `/journal`, `/relaciones`, `/estudio` (y ahora también `/comidas`, `/fit`, `/habitos`, `/organizacion`) se sacaron de la navegación en vez de crear placeholders |
| `F2` Endpoint legacy `/api/ai/classify` | Moot — todo el módulo de clasificación por IA se borró |
| `S1` RLS sin policies en tablas de módulos removidos | Cerrado — las 28 tablas se borraron en `00013_drop_unused_modules.sql` (con backup previo) |
| `F4` Reportes IA sin manejo robusto de errores | Cerrado — `try/catch` alrededor de Anthropic, validación de `ANTHROPIC_API_KEY`, y no se guardan informes vacíos |
| `F3` Deletes físicos en entidades financieras | Cerrado — soft delete agregado solo a `finance_categories` (`00014_finance_categories_soft_delete.sql`, única con riesgo real de cascada/orfandad); presupuestos, vencimientos y metas quedan con delete físico a propósito, documentado en `CLAUDE.md` |
| `S2` Endpoints sin Zod (`shopping-list`, `fit/sessions`) | Moot — esos endpoints ya no existen |
| `AI1`–`AI7` | Moot — todo el módulo de chat/voz/clasificación por IA se borró (2026-08-18) |
| Auth sin verificación de email | Cerrado — flujo de código de 6 dígitos + Resend |
| Sin recuperación de contraseña | Cerrado — `/forgot-password` + `/reset-password` |
| Sin paywall | Cerrado — Mercado Pago Suscripciones, ver `docs/BILLING.md` |
| `F1` RPC de seed con `any` | Cerrado — tipos regenerados, sacados todos los `as any` del proyecto (no solo el de `wallets/route.ts`) |
| `F5` Presupuestos autocopiados | Cerrado — investigado, ya estaba bien: banner de aviso existente y constraint única evita duplicados por requests concurrentes |
| `F7` `transactions.auto_classified` vestigial | Cerrado — columna borrada (`00015_drop_auto_classified.sql`) y limpiada del código |
| `S4` Tablas `marketing_*` inesperadas | Cerrado — confirmado por el usuario que era un módulo de Lumus sin migración en el repo; borradas en `00016_drop_marketing_module.sql` con backup previo de la única fila con datos |
| `S3` Tabla `subscriptions` huérfana | Cerrado — el usuario decidió no eliminar las 3 filas; tabla intacta, sin tocar |
| `D1` Docs de producto vs. alcance real | Cerrado — `README.md`, `CLAUDE.md`, `LUMUS_OVERVIEW.md`, `ARQUITECTURA.md`, `FASES.md` y `FINANZAS.md` reescritos para reflejar solo Finanzas (decisión del usuario, no "pausa" de la visión original) |

---

## Qué falta para MVP lanzable

Ordenado por impacto, asumiendo que el producto es "app de finanzas con paywall":

1. **Precio real del plan** — hoy `SUBSCRIPTION_PRICE_ARS = 1000` es precio de prueba (`src/lib/billing/plan.ts`).
2. **Probar el caso `paused`** de una suscripción — solo se validó `authorized → cancelled`. Ojo que `billing_subscriptions` está en 0 filas, así que hoy no hay ninguna suscripción real contra la que probar.
3. **Feedback del beta tester** — la razón de ser de `B5`. Es la primera vez que alguien que no escribió el código va a usar la app.

Edición de perfil, que figuraba acá, se cerró.

---

## Acciones pendientes fuera del repo

No son código, pero sin ellas parte del trabajo no sirve:

| Pendiente | Por qué importa |
|---|---|
| Subir los backups a Google Drive | Hoy viven solo en `C:\Users\rasef\Lumus-Backups`. Si se muere ese disco se pierden la base y los backups juntos — el punto de tener backup |
| Guardar `LUMUS_BACKUP_PASSPHRASE` en el gestor de contraseñas | Está en `.env.local`. Si se muere la máquina, los backups cifrados quedan **irrecuperables**: es AES-256, no hay puerta de atrás |
| Que el beta tester cambie su contraseña provisoria | Se creó a mano; mientras siga siendo la provisoria la conocen dos personas |
| Probar la unificación de categorías con una de poco uso | La lógica está probada a nivel base, pero la UI no la usó nadie todavía y la acción es irreversible |

---

## Reevaluar el día que se pase a Supabase Pro

- **Backups automáticos diarios** con 7 días de retención — el script manual pasaría a ser una segunda red, no la única.
- **Protección de contraseñas filtradas** (HaveIBeenPwned): está bloqueada en el plan free, la API responde `available on Pro Plans and up`.
- El proyecto free **se pausa tras 7 días de inactividad**.

---

## Próximo foco recomendado

**Hay una ronda de backlog abierta**: `C1`–`C8` en `docs/BACKLOG.md` (ronda 2, 2026-08-26).

- `C1` cerrado: los totales se agregan en SQL (`get_finance_summary`, `00021`) y dejaron de depender de un tope fijo de filas — filtrar por 2025 mostraba 53 gastos de menos.
- `C3` cerrado (2026-08-27): las reglas financieras viven en `src/lib/finance/rules.ts`, los nueve formateadores sueltos se unificaron en `format-currency.ts`, y el proyecto tiene Vitest.
- `C2` cerrado (2026-08-27): Sentry en los tres runtimes, con scrubbing de montos, descripciones y mails. Verificado desde producción.
- `C4` cerrado (2026-08-27): motor de avisos + vencimientos por mail, con cron diario, digest, dedupe y baja sin login.
- `C5` cerrado (2026-08-27): centro de notificaciones in-app, seis tipos de aviso y preferencias por canal.
- `C6` cerrado (2026-08-27): PWA instalable, íconos, atajo "Cargar gasto" y formulario precargado. **Falta probarlo en un teléfono.**

- `C7` **postergado** (2026-08-27), por decisión del usuario: poca gente sube el resumen del banco, el uso real es una línea por gasto. La fricción que importaba era la de `C6`, que ya está cerrada. Sigue siendo válido para el día que haya que migrar usuarios desde otra app.

Queda **`C8`** (cerrar el paywall), que no depende de ningún otro ticket: depende de que definas el precio.

Dicho eso, el orden de esa lista cede ante lo de abajo:

**Esperar el feedback del beta tester.** Es la primera vez que alguien que no escribió el código va a usar Lumus, y eso vale más que cualquier tarea que se pueda planificar desde adentro. El canal ya está: reporta desde la app y llega un mail.

En paralelo, si hay que elegir algo de código, lo que queda es cerrar el paywall (precio real y el caso `paused`).
