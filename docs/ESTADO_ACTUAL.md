# Lumus — Estado actual del proyecto

Última revisión: 2026-08-18

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
| Anthropic SDK | `claude-sonnet-4-5`, único proveedor de IA que queda (resumen de reportes financieros) |
| Mercado Pago | sin SDK — llamadas directas a la API REST de `/preapproval` desde `src/lib/billing/` |
| Resend | SMTP de Supabase Auth para los mails de verificación/recuperación (`supabase/templates/`) |
| shadcn/ui | base instalada — `components/ui/` |

> El SDK de OpenAI (`gpt-4o-mini`, usado antes para clasificación y TTS) se desinstaló al borrar el módulo de chat/voz. Ya no hay clasificación automática de gastos por IA — consistente con la preferencia del usuario de cargar todo manualmente.

---

## Números del repo

- Archivos TypeScript/TSX en `src`: ~96
- Componentes en `src/components`: ~32
- Hooks en `src/hooks`: 9
- API route handlers: 19
- Migraciones Supabase: 13
- Tablas en `public` (Supabase): 20 (bajaron de 48 tras la limpieza de schema muerto del 2026-08-18) — más 6 tablas `marketing_*` inesperadas, ver nota abajo

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
| `/perfil` | Lectura del perfil y resumen de vida |

### Ya no existen (removidas en el pivot a "Lumus Finanzas")

`/organizacion`, `/comidas`, `/fit`, `/habitos` — tenían UI funcional en la revisión anterior de este doc (2026-05-21), pero el código se borró por completo. `/journal`, `/relaciones`, `/estudio` nunca tuvieron página y ahora tampoco están linkeadas en la navegación (antes sí, apuntaban a 404).

---

## Estado por módulo

### Auth & Core

- Login, registro, middleware de rutas protegidas: funcional.
- **Verificación de email por código de 6 dígitos** (`/verify`, template custom vía Resend) en vez del link default de Supabase (limitado a ~2 mails/hora, no apto para producción).
- **Recuperación de contraseña** por código (`/forgot-password` → `/reset-password`).
- Onboarding 3 pasos con guardado en `user_profiles` y `user_life_summary`: funcional.
- Perfil en modo lectura: funcional. Edición: pendiente.

### Billing / Paywall

- Ver `docs/BILLING.md` para el detalle completo (deployado y probado con plata real en producción).
- Gate en `(dashboard)/layout.tsx` y en `middleware.ts`: sin `billing_subscriptions.status = 'authorized'`, redirige a `/suscripcion`.
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

#### Deuda conocida

Ver `docs/ISSUES_PENDIENTES.md` — resumen: `as any` en el seed de categorías, y el campo `transactions.auto_classified` quedó vestigial (nada lo pone en `true` desde que se borró el clasificador). Las categorías ahora tienen soft delete (`deleted_at`, igual que `transactions` y `wallets`); presupuestos, vencimientos y metas de ahorro se borran físicamente a propósito, documentado en `CLAUDE.md`.

---

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

---

## Chequeos locales al 2026-08-18

```
npx tsc --noEmit   → PASA (0 errores)
npm run build      → PASA (30 rutas compiladas correctamente)
npm run lint       → PASA (0 errores, 14 warnings no bloqueantes)
```

Warnings que quedan (no bloquean, bajaron de ~25 a 14 tras el borrado del chat/voz):
- `watch()` de React Hook Form marcado por React Compiler en varios forms (`recurring-transaction-form`, `saving-goal-form`, `transaction-form`, `wallet-form`).
- Una variable sin usar (`_b`) en un componente.

---

## Issues abiertos

Ver `docs/ISSUES_PENDIENTES.md` para detalle y acciones sugeridas.

| ID | Issue | Prioridad |
|---|---|---|
| `S3` | Tabla `subscriptions` huérfana con 3 filas reales (revisadas, valores concretos en `ISSUES_PENDIENTES.md`) — necesita que el usuario confirme si siguen vigentes | Media |
| `S4` | Tablas `marketing_*` inesperadas en el mismo proyecto de Supabase — no son de Lumus | Media — confirmar si el proyecto debe separarse |

Todo lo demás del backlog técnico (`F1`, `F3`, `F4`, `F5`, `F7`) se cerró en esta revisión. Solo quedan `S3` y `S4`, y ninguna de las dos es trabajo de código — ambas necesitan una respuesta del usuario sobre datos/infraestructura que no están documentados en ningún lado del repo.

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

---

## Qué falta para MVP lanzable

Ordenado por impacto, asumiendo que el producto es "app de finanzas con paywall" (no el OS personal original):

1. **Precio real del plan** — hoy `SUBSCRIPTION_PRICE_ARS = 1000` es precio de prueba (`src/lib/billing/plan.ts`).
2. **Probar el caso `paused`** de una suscripción — solo se validó `authorized → cancelled`.
3. **Edición de perfil** — hoy es solo lectura.
4. **`S3` — confirmar si las 3 filas de `subscriptions` siguen vigentes** (detalle en `ISSUES_PENDIENTES.md`), para migrarlas a `recurring_transactions` o dropear la tabla.
5. **`S4` — confirmar si el proyecto de Supabase se comparte a propósito con otra app** (las tablas `marketing_*`) o si conviene separar antes de que crezca más.
6. Actualizar `README.md` / `CLAUDE.md` / `LUMUS_OVERVIEW.md` / `ARQUITECTURA.md` / `FASES.md`, que todavía describen el alcance de "Sistema Operativo Personal" completo en vez del producto real de hoy (Finanzas + paywall).

---

## Próximo foco recomendado

**Opción A — Cerrar el paywall**: precio real + probar `paused` antes de considerar esto lanzable de verdad.

**Opción B — Resolver los dos pendientes de datos**: confirmar `S3` (vencimientos de `subscriptions`) y `S4` (origen de las tablas `marketing_*`) — son las únicas dos cosas que quedan en el backlog técnico, y ninguna es código.
