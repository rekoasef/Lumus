# Lumus — Estado actual del proyecto

Última revisión: 2026-05-21

Este documento es el snapshot técnico y funcional del repo. No reemplaza los docs de producto; funciona como punto de entrada para retomar desarrollo, priorizar trabajo y tener una foto honesta de dónde estamos parados.

---

## Resumen ejecutivo

Lumus es una app Next.js (App Router) + Supabase con módulos personales y capa de IA contextual. El proyecto tiene una base sólida: auth, onboarding, dashboard, organización, finanzas, comidas y fit están operativos. El build pasa, TypeScript pasa y lint no bloquea.

El foco de desarrollo más reciente fue el módulo Finanzas, que quedó con una UI de nivel producción inspirada en apps de finanzas personales (MoneyManager-style): donut chart por categoría, toggle GASTOS/INGRESOS, filtros con navegación temporal completa.

Los módulos Journal, Relaciones y Estudio existen en el schema y en la navegación, pero no tienen páginas todavía.

---

## Stack real instalado

| Elemento | Versión / Estado |
|---|---|
| Next.js | 16.2.6 — App Router, `src/app` |
| React | 19.2.4 |
| TypeScript | strict, sin errores |
| Tailwind CSS | v4 via `@tailwindcss/postcss` — sin `tailwind.config.ts` |
| Supabase | `@supabase/ssr` + `@supabase/supabase-js` |
| Framer Motion | instalado, usado en animaciones de módulos |
| Zustand | instalado |
| React Hook Form + Zod | en uso en todos los formularios principales |
| Recharts | usado en reportes de finanzas y fit |
| lucide-react | íconos en toda la app |
| Anthropic SDK | `claude-sonnet-4-5` para chat y voz |
| OpenAI SDK | `gpt-4o-mini` para clasificación y TTS |
| shadcn/ui | base instalada — `components/ui/button.tsx` y otros |

> Los docs anteriores mencionan Next.js 14+, Vitest y `tailwind.config.ts`. Ninguno de esos corresponde al repo actual.

---

## Números del repo

- Archivos TypeScript/TSX en `src`: ~150
- Componentes en `src/components`: ~50
- Hooks en `src/hooks`: 18
- API route handlers: 38
- Migraciones Supabase: 7

---

## Rutas App Router

### Implementadas y funcionales

| Ruta | Estado |
|---|---|
| `/` | Redirecciona según sesión y onboarding |
| `/login` | Auth con email + password |
| `/register` | Registro con Supabase Auth |
| `/onboarding` | 3 pasos: bienvenida, perfil, resumen libre |
| `/dashboard` | Widgets de tareas, hábitos, mood, clima, divisas |
| `/organizacion` | Tareas CRUD, calendario semanal con bloques horarios |
| `/finanzas` | Dashboard financiero completo |
| `/finanzas/reportes` | Reportes con gráficos y resumen IA |
| `/comidas` | Recetas, meal logs, lista de supermercado |
| `/fit` | Salud, registros corporales, rutinas, sesiones |
| `/habitos` | Placeholder visual (sin CRUD real) |
| `/perfil` | Lectura del perfil y resumen de vida |

### Enlazadas pero sin página (→ 404 hoy)

- `/journal`
- `/relaciones`
- `/estudio`

---

## Estado por módulo

### Auth & Core

- Login, registro, middleware de rutas protegidas: funcional.
- Onboarding 3 pasos con guardado en `user_profiles` y `user_life_summary`: funcional.
- Perfil en modo lectura: funcional. Edición: pendiente.
- `user_context_cache` inicial no se genera en onboarding — el context builder lo crea on demand.

---

### Dashboard

- Server component que agrega tareas, hábitos activos, mood y registro de salud del día.
- Widgets cliente: reloj en vivo, clima, cotizaciones de moneda.
- Trayectoria diaria basada en `tasks.start_time` y `tasks.duration_minutes`.
- Estado: funcional.

---

### Organización

- CRUD de tareas con validación Zod, soft delete, filtros por estado y prioridad.
- Calendario semanal con bloques horarios, creación desde slots.
- Estado: funcional.
- Pendiente: UI para etiquetas, rutinas y objetivos (schema existe, API no).

---

### Finanzas ★ (módulo más desarrollado recientemente)

#### Qué está implementado

- **Billeteras**: CRUD, ajuste de balance, balance recalculado por trigger SQL desde transacciones.
- **Categorías**: seed de defaults por RPC, CRUD custom, color e ícono por categoría.
- **Transacciones**: CRUD, validación Zod, soft delete, clasificación automática por IA (`gpt-4o-mini`) con cache.
- **Presupuestos**: límite mensual por categoría, copia automática del mes anterior, navegación por mes.
- **Vencimientos/Suscripciones**: CRUD, toggle activo/inactivo, pago que genera transacción y avanza fecha.
- **Metas de ahorro**: CRUD, aportes, barra de progreso, marcar como alcanzada.
- **Reportes**: gráficos mensuales de gastos vs ingresos, resumen IA persistido en `finance_reports`.
- **Cotizaciones**: endpoint `/api/finance/exchange-rates` con conversión a ARS.
- **Import MoneyManager**: script `scripts/import-mmbackup-summary.mjs` que agrupa por mes/categoría.

#### UI de movimientos (rediseñada 2026-05-21)

La sección de movimientos fue completamente rediseñada al estilo MoneyManager:

- **Carga inicial**: todas las transacciones del usuario (hasta 500), sin filtro de mes. Ya no está limitada al mes actual.
- **Filtros con navegación temporal completa**:
  - `Día` → ← Hoy → con ícono de calendario para saltar a cualquier fecha exacta
  - `Semana` → ← Esta semana → (navega semana a semana)
  - `Mes` → ← Mayo 2026 → (navega mes a mes)
  - `Año` → ← 2026 → (navega año a año)
  - `Período` → inputs DESDE / HASTA + botón "Todos" para ver todo sin filtro
- **Toggle GASTOS | INGRESOS** con subrayado de color (rojo / verde), independiente de los filtros.
- **Donut chart SVG** nativo con segmentos por categoría (color de la categoría), círculo punteado interior y total en el centro.
- **Lista de categorías**: icono circular relleno con el color de la categoría, nombre, porcentaje del total y monto.
- **Drill-down por categoría**: click en una categoría muestra sus transacciones individuales con botón volver.
- **Stats del header del dashboard** (Ingresos/Gastos del mes): siguen mostrando el mes actual correctamente, calculados desde el total cargado.

#### Ajustes de balance

Los ajustes de balance (`type = 'ajuste'`) no se computan como ingreso ni gasto: no impactan KPIs ni resumen mensual. Quedan en el historial pero fuera de los totales. Implementado con `00007_balance_adjustments_not_income_expense.sql`.

#### Saldos actuales (actualizados 2026-05-21)

| Billetera | Saldo |
|---|---|
| Mercado Pago | $160.274 |
| Emergencias | $773.128 |
| Vacaciones | $283.424 |
| Gustos | $30.562 |
| BNA | $16.300 |
| USD | USD 254,25 |

---

### Comidas

- Recetas CRUD, generación con Claude y cache en `ai_cache`.
- Meal logs por momento del día.
- Lista de supermercado con items y check de comprado.
- Estado: funcional.
- Deuda: borrados físicos, cache key de recetas por slice de prompt (riesgo de colisiones).

---

### Fit

- Health log diario (upsert), registros corporales, ejercicios, rutinas, sesiones de entrenamiento.
- Gráfico de progreso de peso con Recharts.
- Estado: funcional.
- Deuda: sin validación Zod en `fit/sessions/[id]`, update completo de rutinas pendiente.

---

### Hábitos

- Schema completo en DB.
- Página placeholder visual.
- Dashboard lee hábitos activos si existen.
- CRUD, registro diario y streaks: pendiente.

---

### Journal / Relaciones / Estudio

- Schema y docs de producto existen.
- Links en navegación (→ 404 hoy).
- Todo lo demás pendiente.

---

## IA y voz

| Endpoint | Modelo | Estado |
|---|---|---|
| `/api/ai/chat` | claude-sonnet-4-5 | Funcional |
| `/api/ai/voice-stream` | claude-sonnet-4-5 | Funcional, pendiente revisión |
| `/api/ai/tts` | OpenAI tts-1 | Funcional |
| `/api/ai/classify-transaction` | gpt-4o-mini | Funcional, con cache 7 días |
| `/api/ai/classify` | hardcoded | Legacy — a deprecar |
| `/api/food/recipes/generate` | claude-sonnet-4-5 | Funcional |
| `/api/finance/ai-report` | claude-sonnet-4-5 | Funcional, sin manejo robusto de errores |

`buildUserSnapshot` en `src/lib/ai/context-builder.ts` agrega perfil, organización, finanzas, comidas, fit, hábitos, salud y mood. Usa `.single()` en datos opcionales — debería ser `.maybeSingle()`.

---

## Migraciones Supabase

| Archivo | Qué hace |
|---|---|
| `00001_initial_schema.sql` | Schema completo de todos los módulos |
| `00002_finance_module.sql` | Índices, RPC seed categorías, trigger de balance |
| `00003_update_default_categories.sql` | Actualiza categorías default |
| `00004_subscriptions_variable_and_paid.sql` | Agrega `subscriptions.variable` |
| `00005_finance_reports.sql` | Tabla `finance_reports` con RLS |
| `00006_task_time_blocks.sql` | Agrega `tasks.start_time` y `tasks.duration_minutes` |
| `00007_balance_adjustments_not_income_expense.sql` | Soporte lógico para `type = 'ajuste'` en transacciones |

---

## Chequeos locales al 2026-05-21

```
npx tsc --noEmit   → PASA (0 errores)
npm run build      → PASA (todas las rutas compiladas correctamente)
npm run lint       → PASA (0 errores, ~25 warnings no bloqueantes)
```

Warnings que quedan (no bloquean):
- `watch()` de React Hook Form marcado por React Compiler en varios forms.
- Variables sin usar en algunos componentes.
- Dependency faltante en `useVoiceLumus`.

---

## Issues abiertos

Ver `docs/ISSUES_PENDIENTES.md` para detalle y acciones sugeridas.

| ID | Issue | Prioridad |
|---|---|---|
| `#3` | Rutas `/journal`, `/relaciones`, `/estudio` sin página | Media |
| `F1` | RPC de seed con `any` en `wallets/route.ts` | Baja |
| `F2` | Endpoint legacy `/api/ai/classify` a deprecar | Media |
| `F3` | Borrados físicos en categorías/presupuestos/suscripciones/metas | Media |
| `F4` | Reportes IA sin manejo robusto de errores | Media |
| `F5` | Presupuestos autocopiados — UX a revisar | Media |
| `AI1` | Manejo de errores en todas las llamadas a proveedores IA | Alta |
| `AI2` | Cache de IA con parseos frágiles en `classify-transaction` | Media |
| `AI3` | Cache key de recetas por slice de prompt (colisiones) | Media |
| `AI4` | Context builder con `.single()` en datos opcionales | Media |
| `AI5` | Semana del snapshot mal calculada | Baja |
| `AI6` | Voz: dependency faltante, prompts duplicados, fallback TTS | Media |
| `S1` | RLS policies faltantes en tablas puente | Alta |
| `S2` | Endpoints con body libre sin Zod (`shopping-list`, `fit/sessions`) | Media |

### Issues cerrados

| ID | Resolución |
|---|---|
| `#1` Drift schema tareas | `00006_task_time_blocks.sql` |
| `#2` Lint bloqueante | Resuelto, 0 errores |
| `F6` Balance y ajustes | `00007_balance_adjustments_not_income_expense.sql` |
| `AI7` Estado del orb/chat | Estado derivado desde `isLoading` y último mensaje |

---

## Qué falta para MVP completo

Ordenado por impacto:

1. **Hábitos CRUD + streaks** — es el único módulo principal sin funcionalidad real.
2. **Manejo de errores de IA** (AI1) — cualquier fallo de proveedor hoy tira 500 sin mensaje claro.
3. **Páginas para Journal, Relaciones, Estudio** — al menos placeholder que no rompa la navegación.
4. **Edición de perfil** — hoy es solo lectura.
5. **RLS en tablas puente** (S1) — necesario antes de tener un segundo usuario real.
6. **Validación Zod en endpoints con body libre** (S2).

---

## Próximo foco recomendado

**Opción A — Completar módulos**: atacar Hábitos CRUD, luego Journal placeholder.

**Opción B — Calidad técnica**: AI1 (errores IA) + S1 (RLS) + S2 (Zod faltante) antes de más features.

**Opción C — UX de finanzas**: clasificación automática mejorada (F2), presupuestos (F5), manejo de errores en reportes IA (F4).
