# CLAUDE.md — Instrucciones para Claude Code

Este archivo es leído automáticamente por Claude Code al trabajar en este proyecto.
Seguí todas las instrucciones de este archivo en cada tarea.

---

## ¿Qué es este proyecto?

**Lumus** es una app de finanzas personales con IA y paywall.
El usuario se registra (con verificación de email por código), completa un onboarding breve, se suscribe vía Mercado Pago, y a partir de ahí gestiona billeteras, transacciones, presupuestos, vencimientos recurrentes y metas de ahorro, con reportes mensuales generados por Claude.

Lumus arrancó como un proyecto más ambicioso ("Sistema Operativo Personal" con módulos de organización, comidas, fit, hábitos, journal, relaciones y estudio, más un chat de IA transversal). El 2026-06-29 el alcance se redujo a propósito solo a Finanzas, y el chat/voz de IA se eliminó del código el 2026-08-18. Si en algún doc viejo o comentario aparece esa visión más amplia, no representa el estado actual — este archivo y `docs/ESTADO_ACTUAL.md` son la fuente de verdad.

Documentación completa en `/docs/`. Empezá siempre por `docs/ESTADO_ACTUAL.md` para el estado real, y `docs/LUMUS_OVERVIEW.md` para la visión de producto.

---

## Stack

```
Next.js 16 App Router + TypeScript strict
Tailwind CSS v4 + shadcn/ui + Framer Motion
Supabase (PostgreSQL + Auth) — sin Storage ni Realtime en uso
Zustand + React Hook Form + Zod
Claude API (claude-sonnet-5) — único proveedor de IA, solo para el reporte mensual
Mercado Pago (Suscripciones) — paywall
Resend (SMTP de Supabase Auth) — mails de verificación y recuperación de contraseña
Vercel (deploy)
```

---

## Tools y Skills activos en este proyecto

| Herramienta | Qué hace |
|---|---|
| `claude-mem` | Memoria persistente entre sesiones — el contexto del proyecto se inyecta automáticamente |
| `frontend-design` skill | Guía de diseño en `skills/frontend-design/SKILL.md` — leerla antes de crear cualquier componente UI |
| `WebSearch-MCP` | Búsqueda web en tiempo real — usar para buscar doc actualizada de librerías o resolver errores |

Ver setup completo en `docs/TOOLS_AND_SKILLS.md`.

---

## Antes de escribir cualquier código

1. Leer `docs/FINANZAS.md` si la tarea involucra el módulo de finanzas
2. Leer `docs/BILLING.md` si la tarea involucra el paywall de Mercado Pago
3. Para el schema real, no uses `docs/SCHEMA.md` (quedó desactualizado, describe módulos que ya no existen) — mirá directamente `supabase/migrations/` o `src/types/database.types.ts` (se regenera con `supabase gen types typescript --linked`)
4. Consultar `docs/ARQUITECTURA.md` para saber dónde va cada archivo
5. Respetar el design system de `docs/DESIGN_SYSTEM.md`

---

## Reglas de código — SIEMPRE

### TypeScript
- `strict: true` en tsconfig — sin `any`, sin casting innecesario
- Todos los tipos en `src/types/`
- Los tipos de Supabase se generan con la CLI en `src/types/database.types.ts`

### Validación
- **Zod** para validar todo input: formularios y API routes
- Schemas de Zod en `src/lib/validations/`

### Autenticación
- Verificar auth al inicio de TODA API route, sin excepción:
```typescript
const { data: { user } } = await supabase.auth.getUser()
if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
```

### Supabase
- RLS activo en todas las tablas — nunca usar `service_role` en el cliente
- Cliente browser en componentes con `'use client'`
- Cliente server en Server Components y API routes
- Filtrar siempre `deleted_at is null` en tablas con soft delete
- Selects específicos — nunca `select('*')` en producción

### Componentes Next.js
- **Server Components por default** — `'use client'` solo cuando hay interactividad, hooks o estado
- Layouts en `layout.tsx`, pages en `page.tsx`
- Loading states en `loading.tsx`
- Errores en `error.tsx`

### Variables de entorno
- Nunca hardcodear keys o secrets
- `NEXT_PUBLIC_` solo para variables que van al cliente
- `SUPABASE_SERVICE_ROLE_KEY` nunca en el cliente

### Soft delete
- Tablas con `deleted_at`: `transactions`, `wallets`, `finance_categories`
- Nunca borrar físicamente — siempre `update({ deleted_at: new Date() })`
- Siempre filtrar: `.is('deleted_at', null)`
- Excepción explícita: `budgets`, `recurring_transactions` y `saving_goals` (y su tabla puente `saving_goal_wallets`) sí se borran físicamente a propósito — ninguna otra tabla las referencia para mostrar historial, así que no hay riesgo de perder datos ajenos al borrar. Si en algún momento algo empieza a depender de ellas para historial, sumarles `deleted_at` como se hizo con `finance_categories`.

---

## Reglas de IA

Hay dos usos de IA, los dos con `claude-sonnet-5`: el reporte financiero mensual (`/api/finance/ai-report`) y el análisis de patrimonio (`/api/finance/wealth-analysis`). No hay chat, no hay clasificación automática de gastos (el usuario prefiere cargar todo a mano — no proponerla salvo que la pida explícitamente), no hay `ai_cache`/`ai_conversations`/context builder — todo eso se borró el 2026-08-18.

Si se agrega una nueva feature de IA:
- Nunca llamar al proveedor sin chequear antes si ya existe un resultado guardado para ese pedido — `ai-report` lo hace consultando `finance_reports` por mes antes de generar de nuevo (patrón a repetir, no una tabla de caché genérica).
- Envolver la llamada en `try/catch` y devolver un error claro a la UI si falla (ver `ai-report` como referencia — valida la env var, atrapa errores del SDK, y rechaza respuestas sin contenido de texto en vez de guardarlas vacías).
- Validar la env var de la API key antes de llamar.
- **Ponerle tope a lo que el usuario puede disparar a mano.** El reporte se puede rehacer una sola vez por mes (`MAX_REPORT_REGENERATIONS` en `lib/finance/report-limits.ts`): sin eso, un botón de "regenerar" es un botón de gastar plata, y el techo lo pone las ganas que tenga alguien de apretarlo.
- **La IA no calcula: explica.** El análisis de patrimonio recibe cifras ya resueltas por funciones puras testeadas. Un modelo haciendo cuentas sobre la plata de alguien es la peor versión posible de la feature.
- **Nunca recomendar inversiones.** La prohibición vive en `lib/finance/wealth-prompt.ts` y está verificada contra siete intentos de sacarle una recomendación (ver `D4` en `docs/BACKLOG.md`). Es actividad regulada por la CNV, los modelos son malos prediciendo mercados de una forma que suena segura, y rompe la neutralidad que hace valioso a un consejo financiero. Si se toca ese prompt, **volver a probarlo**.
- **Ojo con el thinking**: en Sonnet 5 y Opus 5, omitir el parámetro `thinking` lo deja **prendido**, y los tokens de razonamiento salen del mismo `max_tokens` — un informe con `max_tokens: 1500` llegaría cortado. Para resumir datos ya calculados va `thinking: { type: 'disabled' }`.

---

## Convenciones de naming

| Elemento | Convención | Ejemplo |
|---|---|---|
| Archivos de componentes | kebab-case | `wallet-card.tsx` |
| Funciones y variables | camelCase | `getUserProfile` |
| Tipos e interfaces | PascalCase | `UserProfile` |
| Constantes globales | UPPER_SNAKE_CASE | `SUBSCRIPTION_PRICE_ARS` |
| Tablas de DB | snake_case plural | `finance_categories` |
| Rutas API | kebab-case | `/api/finance/recurring-transactions` |

---

## Estructura de carpetas clave

```
src/app/(dashboard)/     → páginas protegidas por auth + onboarding + suscripción (dashboard, finanzas, perfil)
src/app/(auth)/          → login, register, verify, forgot/reset password
src/app/(onboarding)/    → onboarding de 3 pasos
src/app/suscripcion/     → paywall (fuera de (dashboard), no requiere suscripción activa)
src/app/api/finance/     → API routes del módulo de finanzas
src/app/api/billing/     → API routes del paywall de Mercado Pago
src/components/ui/       → shadcn/ui (no modificar)
src/components/shared/   → nav, sidebar, diálogos globales
src/components/modules/  → componentes por módulo (finanzas/, billing/, dashboard/)
src/components/lumus/    → solo el orbe decorativo (lumus-orb.tsx) — ya no hay chat de IA
src/lib/supabase/        → clientes de Supabase (client/server/service) + helper del proxy de auth
src/lib/billing/         → constantes del plan de Mercado Pago
src/lib/finance/         → reglas de negocio (rules.ts), cotizaciones, agregados, parseo/PDF de reportes
src/lib/notifications/   → motor de avisos (dedupe, preferencias, digest por mail, token de baja)
src/lib/utils/           → funciones utilitarias puras
src/hooks/               → custom hooks (todos de finanzas, más use-user)
src/stores/              → Zustand — solo ui-store.ts (sidebar, tema)
src/types/               → tipos TypeScript globales
src/proxy.ts             → el "middleware" de Next 16 (gate de auth/onboarding/billing)
```

No hay `src/lib/ai/` — se borró junto con el chat de IA. Tampoco hay carpeta `tests/`: los tests van al lado del archivo que prueban.

---

## Idioma

- **Comentarios en el código:** español
- **Variables, funciones, tipos:** inglés
- **UI de la app:** español
- **Lumus (la IA) habla:** español, tono natural y cercano, nunca robótico
- **Commits:** inglés, conventional commits (`feat:`, `fix:`, `chore:`, `refactor:`)

---

## Componentes de UI — regla importante

Antes de crear cualquier componente de UI, leer `skills/frontend-design/SKILL.md`.
Esta skill define cómo generar interfaces premium y no genéricas.
Referenciala explícitamente en el prompt: *"Usando la skill de frontend-design, creá el componente X"*.

---

## Design System — resumen rápido

- **Accent color:** `#7c6dfa` (violeta Lumus)
- **Dark mode:** default — fondo `#0a0a0f`, surface `#111118`
- **Fuente:** Geist Sans
- **Border radius:** sm=4px, md=8px, lg=12px, xl=16px
- **Animaciones:** Framer Motion para transiciones de página y micro-interacciones
- Ver colores completos y tokens en `docs/DESIGN_SYSTEM.md`

---

## Testing

Hay **Vitest**, y cubre solo funciones puras: las reglas financieras de `src/lib/finance/` y los formateadores de `src/lib/utils/`. No hay tests de componentes ni de API routes, y no es un olvido — la idea es red donde es barata, no cobertura.

- Se corren con `npm test` (una pasada) o `npm run test:watch`.
- Los tests viven al lado del archivo que prueban: `rules.ts` → `rules.test.ts`.
- Si agregás una regla de negocio a `src/lib/finance/`, va con su test. Si tocás UI, no hace falta.

Los cuatro chequeos antes de dar algo por terminado: `npm test`, `npx tsc --noEmit`, `npm run lint` y `npm run build`.

---

## Lo que NO hacer

- ❌ No usar `any` en TypeScript
- ❌ No hacer `select('*')` en Supabase en producción
- ❌ No llamar a la IA sin chequear antes si ya hay un resultado guardado (ver `ai-report`)
- ❌ No proponer ni implementar clasificación automática de gastos por IA — el usuario prefiere carga manual
- ❌ No hardcodear strings de texto de la UI — usar variables
- ❌ No poner lógica de negocio en los componentes — va en hooks o lib
- ❌ No calcular a mano el progreso de una meta, el uso de un presupuesto ni el equivalente mensual de un recurrente — están en `src/lib/finance/rules.ts` (por eso existe ese archivo: la misma meta llegó a mostrar 62% en una pantalla y 0% en otra)
- ❌ No calcular a mano el rendimiento de una billetera de inversión ni el reparto entre aporte y rendimiento — están en `src/lib/finance/investment.ts`. Y no guardar un aporte como `ajuste`: `ajuste` significa "me equivoqué al contar", y mezclarlo con "esto rindió" es lo que hacía incalculable el rendimiento
- ❌ No crear un `Intl.NumberFormat` suelto — usar `formatCurrency` de `src/lib/utils/format-currency.ts`
- ❌ No mandar un aviso sin `dedupe_key` — el `unique (user_id, dedupe_key)` de `notifications` es lo único que evita que un cron reintentado mande el mismo mail dos veces
- ❌ No mandar un mail por evento — todo aviso sale por el digest diario (`/api/cron/avisos`), un mail por usuario por día
- ❌ No borrar registros físicamente en tablas con soft delete (`transactions`, `wallets`, `finance_categories`)
- ❌ No usar `service_role` en código del cliente
- ❌ No agregar `'use client'` si el componente no lo necesita
- ❌ No crear componentes en `components/ui/` — esos son de shadcn

---

## Flujo de trabajo sugerido para una feature

1. Ver `docs/ESTADO_ACTUAL.md` e `docs/ISSUES_PENDIENTES.md` para no repetir análisis ya hecho
2. Leer `docs/FINANZAS.md` o `docs/BILLING.md` según corresponda
3. Crear o modificar schema si hace falta (nueva migration en `supabase/migrations/`, aplicarla con `supabase db query --linked -f <archivo>` y regenerar tipos con `supabase gen types typescript --linked`)
4. Actualizar los tipos TypeScript en `src/types/`
5. Crear el componente de UI
6. Crear el hook o la API route
7. Conectar con Supabase
8. Verificar con `npm test`, `npx tsc --noEmit`, `npm run lint` y `npm run build`
9. Verificar que se ve bien en mobile y desktop
