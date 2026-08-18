# LUMUS — Fases de Desarrollo

> Reescrito 2026-08-18. La versión anterior era un checklist de "por construir" para los 8 módulos de la visión original, todo marcado `[ ]` aunque buena parte ya se había construido y después se borró. Esta versión documenta en retrospectiva lo que existe hoy y lo que queda, para un producto de un solo módulo (Finanzas + paywall).

## Resumen

| Fase | Nombre | Estado |
|---|---|---|
| 0 | Setup & Fundación | ✅ Hecho |
| 1 | Core & Auth | ✅ Hecho |
| 2 | Módulo Finanzas | ✅ Hecho |
| 3 | Paywall (Mercado Pago) | ✅ Hecho, con pendientes menores |
| 4 | Limpieza de deuda técnica | ✅ Hecho (2026-08-18) |
| 5 | Pulido y lanzamiento real | 🔲 Pendiente |

Las fases de organización, comidas, fit, hábitos, journal, relaciones, estudio e IA proactiva/contexto cruzado de la versión original **no están en este roadmap** — se descartaron en el pivot a Finanzas del 2026-06-29. Si se retoman algún día, hay que reconstruirlas desde cero (código y tablas borrados).

---

## FASE 0 — Setup & Fundación ✅

- [x] Next.js 16 App Router + TypeScript strict
- [x] Tailwind CSS v4 + shadcn/ui + Framer Motion
- [x] Supabase (proyecto `ccixixskklovvvikiwbq`) con RLS en todas las tablas
- [x] Deploy en Vercel

---

## FASE 1 — Core & Auth ✅

- [x] Login y registro con Supabase Auth
- [x] Verificación de email por código de 6 dígitos (no el link default de Supabase)
- [x] Recuperación de contraseña por código
- [x] SMTP propio vía Resend con templates custom (`supabase/templates/`)
- [x] `src/proxy.ts` — gate de rutas protegidas (Next 16 renombró `middleware.ts` a `proxy.ts`)
- [x] Onboarding de 3 pasos (bienvenida, perfil, campo libre) → `user_profiles` + `user_life_summary`
- [x] Dashboard base con widgets (reloj, clima, cotización) y resumen de billeteras/presupuestos/vencimientos/metas
- [x] Perfil de usuario — **pendiente:** hoy es solo lectura, falta edición

---

## FASE 2 — Módulo Finanzas ✅

Ver `docs/FINANZAS.md` para el detalle funcional completo. Resumen de lo implementado:

- [x] Billeteras — CRUD, balance por trigger SQL, soft delete
- [x] Categorías — seed de defaults, CRUD custom, soft delete
- [x] Transacciones — CRUD, transferencias, ajustes de balance, soft delete, filtros
- [x] Presupuestos — límite mensual por categoría, autocopia del mes anterior con aviso visual
- [x] Vencimientos recurrentes — CRUD, aplicar y avanzar fecha
- [x] Metas de ahorro — múltiples billeteras por meta, aportes manuales, progreso
- [x] Reportes — gráficos + resumen mensual por IA (Claude), export a PDF
- [x] Cotizaciones para sumar billeteras en distinta moneda

**Descartado de la visión original:** clasificación automática de gastos por IA — el usuario prefiere carga manual, no reproponerla.

---

## FASE 3 — Paywall (Mercado Pago) ✅ con pendientes menores

Ver `docs/BILLING.md` para el detalle completo.

- [x] Tabla `billing_subscriptions` + RLS
- [x] Gate en `(dashboard)/layout.tsx` y `src/proxy.ts`
- [x] `create-subscription`, `webhook` (valida firma HMAC), `status`
- [x] `/suscripcion` con polling hasta confirmación del webhook
- [x] Probado con pagos y cancelación reales

Pendiente antes de un lanzamiento de verdad:
- [ ] Subir `SUBSCRIPTION_PRICE_ARS` (`src/lib/billing/plan.ts`) del precio de prueba al precio real
- [ ] Probar el caso de suscripción `paused` (solo se probó `authorized → cancelled`)

---

## FASE 4 — Limpieza de deuda técnica ✅

Completada el 2026-08-18 — ver `docs/ISSUES_PENDIENTES.md` para el detalle de cada issue:

- [x] Borrado del chat/voz de IA (módulo entero, con toda su deuda asociada)
- [x] RLS sin policies en tablas de módulos removidos → tablas borradas (`00013`)
- [x] Soft delete en `finance_categories` (evitaba cascada de borrado de presupuestos)
- [x] Manejo de errores en el reporte de IA
- [x] `as any` en llamadas a RPC de Supabase
- [x] Campo `transactions.auto_classified` vestigial → columna borrada
- [x] Tablas `marketing_*` de un módulo descartado → borradas
- [x] Esta reescritura de docs (`D1`)

Quedó sin resolver a propósito, por decisión del usuario: la tabla huérfana `subscriptions` (3 filas reales de vencimientos viejos) se deja intacta, sin migrar ni borrar.

---

## FASE 5 — Pulido y lanzamiento real 🔲

- [ ] Precio real del plan
- [ ] Probar suscripción `paused`
- [ ] Edición de perfil
- [ ] Consistencia de soft delete si en algún momento otra tabla financiera empieza a necesitarlo
- [ ] Revisar si el proyecto de Supabase debería separarse si vuelve a compartirse con otra app
