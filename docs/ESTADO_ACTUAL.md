# Lumus — Estado actual del proyecto

Última revisión: 2026-08-18

Este documento es el snapshot técnico y funcional del repo. No reemplaza los docs de producto; funciona como punto de entrada para retomar desarrollo, priorizar trabajo y tener una foto honesta de dónde estamos parados.

---

## Resumen ejecutivo

**El alcance del producto cambió radicalmente respecto a la visión original de "Sistema Operativo Personal".** El 2026-06-29 (commit `cf7bddd "Lumus Finanzas"`) el proyecto se redujo a propósito a una sola cosa: **una app de finanzas personales con IA**, sacando organización, comidas, fit y hábitos del código (el schema de esas tablas sigue en la base, pero no hay UI ni API que las use — ver "Módulos removidos" abajo).

Desde entonces, esta sesión (2026-08-14 a 2026-08-18) sumó dos piezas que faltaban para poder lanzar en serio:

1. **Auth completo**: verificación de email por código de 6 dígitos y recuperación de contraseña (antes solo había login/registro sin confirmación).
2. **Paywall con Mercado Pago Suscripciones**: sin suscripción activa (`status='authorized'`), el usuario no entra al dashboard.

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
- Migraciones Supabase: 12

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

Ver `docs/ISSUES_PENDIENTES.md` — resumen: deletes físicos en categorías/presupuestos/vencimientos/metas (contradice la regla de soft delete), `as any` en el seed de categorías, reportes IA sin manejo de errores de proveedor, y el campo `transactions.auto_classified` quedó vestigial (nada lo pone en `true` desde que se borró el clasificador).

---

## Módulos removidos (schema vivo, sin código)

`organizacion` (tareas, calendario, rutinas, objetivos), `comidas` (recetas, meal logs, lista de supermercado), `fit` (registros corporales, rutinas, sesiones de entrenamiento) y `habitos` tenían UI y API funcionando en la revisión de mayo. El pivot a "Lumus Finanzas" borró todo el código de la aplicación, pero **las tablas siguen existiendo en `00001_initial_schema.sql`** (`tasks`, `task_labels`, `task_label_assignments`, `routines`, `objectives`, `calendar_events`, `recipes`, `meal_logs`, `shopping_list_items`, `body_records`, `workout_*`, `health_logs`, `habits`, `habit_logs`, `journal_entries`, `mood_logs`, `contacts`, `contact_events`, `study_topics`, `study_notes`), igual que `ai_cache` y `ai_conversations` (pensadas para el chat de IA que ya no existe).

No es un bug — es schema muerto, sin superficie de ataque real porque RLS está habilitado sin policies en varias de esas tablas (deny-all por default en Postgres). Pero conviene decidir en algún momento: ¿se van a revivir esos módulos, o vale la pena una migración de limpieza que las borre? Mientras tanto, el schema real de "lo que la app usa" está mejor descrito por `docs/FINANZAS.md` que por `docs/SCHEMA.md` completo.

---

## IA

Con el chat/voz borrado, el único uso de IA que queda en la app es:

| Endpoint | Modelo | Estado |
|---|---|---|
| `/api/finance/ai-report` | claude-sonnet-4-5 | Funcional, sin manejo robusto de errores de proveedor (ver F4 en `ISSUES_PENDIENTES.md`) |

Todo lo demás (`context-builder.ts`, `model-selector.ts`, `web-search.ts`, cache de IA en `lib/ai/cache.ts`, clasificación de transacciones, TTS, voice-stream) se eliminó el 2026-08-18. La tabla `ai_cache` sigue en el schema pero ya no la usa ningún endpoint activo — `ai-report` guarda directo en `finance_reports`.

---

## Migraciones Supabase

| Archivo | Qué hace |
|---|---|
| `00001_initial_schema.sql` | Schema completo de todos los módulos (incluye los ya removidos del código) |
| `00002_finance_module.sql` | Índices, RPC seed categorías, trigger de balance |
| `00003_update_default_categories.sql` | Actualiza categorías default |
| `00004_subscriptions_variable_and_paid.sql` | Agrega `subscriptions.variable` |
| `00005_finance_reports.sql` | Tabla `finance_reports` con RLS |
| `00006_task_time_blocks.sql` | Agrega `tasks.start_time` y `tasks.duration_minutes` (tabla hoy sin UI) |
| `00007_balance_adjustments_not_income_expense.sql` | Soporte lógico para `type = 'ajuste'` en transacciones |
| `00008_fix_balance_trigger.sql` | Corrección al trigger de recálculo de balance |
| `00009_recurring_tasks.sql` | Recurrencia para `tasks` (tabla hoy sin UI) |
| `00010_recurring_transactions.sql` | Renombra/expande `subscriptions` a `recurring_transactions` |
| `00011_billing_subscriptions.sql` | Tabla `billing_subscriptions` para el paywall de Mercado Pago |
| `00012_saving_goal_wallets.sql` | Tabla puente `saving_goal_wallets`, reemplaza `saving_goals.wallet_id` |

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
| `F1` | RPC de seed con `any` en `wallets/route.ts` | Baja |
| `F3` | Deletes físicos en categorías/presupuestos/vencimientos/metas | Media |
| `F4` | Reportes IA sin manejo robusto de errores | Media |
| `F5` | Presupuestos autocopiados — UX a revisar | Media |
| `F7` | `transactions.auto_classified` quedó vestigial | Baja |
| `S1` | RLS sin policies en tablas puente de módulos removidos (deny-all, no exploit real hoy) | Baja — revisar si se limpia el schema |

### Issues cerrados desde la última revisión

| ID | Resolución |
|---|---|
| `#3` Rutas sin página | Los links a `/journal`, `/relaciones`, `/estudio` (y ahora también `/comidas`, `/fit`, `/habitos`, `/organizacion`) se sacaron de la navegación en vez de crear placeholders |
| `F2` Endpoint legacy `/api/ai/classify` | Moot — todo el módulo de clasificación por IA se borró |
| `S2` Endpoints sin Zod (`shopping-list`, `fit/sessions`) | Moot — esos endpoints ya no existen |
| `AI1`–`AI7` | Moot — todo el módulo de chat/voz/clasificación por IA se borró (2026-08-18) |
| Auth sin verificación de email | Cerrado — flujo de código de 6 dígitos + Resend |
| Sin recuperación de contraseña | Cerrado — `/forgot-password` + `/reset-password` |
| Sin paywall | Cerrado — Mercado Pago Suscripciones, ver `docs/BILLING.md` |

---

## Qué falta para MVP lanzable

Ordenado por impacto, asumiendo que el producto es "app de finanzas con paywall" (no el OS personal original):

1. **Precio real del plan** — hoy `SUBSCRIPTION_PRICE_ARS = 1000` es precio de prueba (`src/lib/billing/plan.ts`).
2. **Probar el caso `paused`** de una suscripción — solo se validó `authorized → cancelled`.
3. **F4 — manejo de errores en reportes IA** — hoy un fallo de Anthropic tira 500 sin mensaje claro al usuario que paga.
4. **F3 — decidir soft delete vs. físico** por entidad financiera y ser consistente.
5. **Edición de perfil** — hoy es solo lectura.
6. **Decisión de producto sobre el schema muerto** (organización/comidas/fit/hábitos/journal/relaciones/estudio): ¿se van a revivir, o se limpia la base?
7. Deuda menor: `F1` (`as any`), `F7` (campo vestigial), y actualizar `README.md` / `CLAUDE.md` / `LUMUS_OVERVIEW.md` / `ARQUITECTURA.md` / `FASES.md`, que todavía describen el alcance de "Sistema Operativo Personal" completo en vez del producto real de hoy (Finanzas + paywall).

---

## Próximo foco recomendado

**Opción A — Cerrar el paywall**: precio real + probar `paused` antes de considerar esto lanzable de verdad.

**Opción B — Calidad técnica de Finanzas**: `F4` (errores IA) + `F3` (soft delete) antes de sumar más features.

**Opción C — Decisión de producto**: resolver qué pasa con el schema de los módulos removidos, y alinear la documentación (`CLAUDE.md`, `LUMUS_OVERVIEW.md`) al alcance real.
