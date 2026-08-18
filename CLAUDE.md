# CLAUDE.md — Instrucciones para Claude Code

Este archivo es leído automáticamente por Claude Code al trabajar en este proyecto.
Seguí todas las instrucciones de este archivo en cada tarea.

---

## ¿Qué es este proyecto?

**Lumus** es un Sistema Operativo Personal impulsado por IA.
Una plataforma web fullstack donde el usuario centraliza organización, finanzas, comidas, salud, hábitos, journal, relaciones y estudio — con una IA contextual integrada en cada módulo.

Documentación completa en `/docs/`. Empezá siempre por `docs/LUMUS_OVERVIEW.md`.

---

## Stack

```
Next.js 14+ App Router + TypeScript strict
Tailwind CSS + shadcn/ui + Framer Motion
Supabase (PostgreSQL + Auth + Storage)
Zustand + React Hook Form + Zod
Claude API (claude-sonnet-4-5) + OpenAI API (gpt-4o-mini)
Vitest (unit tests)
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

1. Leer el doc del módulo en `docs/modulos/` si la tarea involucra un módulo
2. Revisar el schema en `docs/SCHEMA.md` para las tablas involucradas
3. Consultar `docs/ARQUITECTURA.md` para saber dónde va cada archivo
4. Respetar el design system de `docs/DESIGN_SYSTEM.md`
5. Si la tarea involucra IA, leer `docs/AI_ARCHITECTURE.md` completo

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

### Modelo correcto para cada tarea
| Tarea | Modelo |
|---|---|
| Chat de Lumus | `claude-sonnet-4-5` |
| Análisis, resúmenes, journal | `claude-sonnet-4-5` |
| Clasificar gastos | `gpt-4o-mini` |
| Sentimiento simple | `gpt-4o-mini` |
| Generar listas cortas | `gpt-4o-mini` |

### Caché obligatorio
Antes de llamar cualquier API de IA, verificar `ai_cache` en Supabase:
```typescript
const cached = await getCachedResponse(supabase, userId, cacheKey)
if (cached) return cached
```

### Context Builder
Nunca mandar raw data a la IA. Siempre usar `buildUserSnapshot()` de `src/lib/ai/context-builder.ts`.

### Guardar siempre
Después de cada llamada exitosa a la IA:
1. Guardar en `ai_cache` con TTL apropiado
2. Guardar en `ai_conversations` para historial

---

## Convenciones de naming

| Elemento | Convención | Ejemplo |
|---|---|---|
| Archivos de componentes | kebab-case | `task-card.tsx` |
| Funciones y variables | camelCase | `getUserProfile` |
| Tipos e interfaces | PascalCase | `UserProfile` |
| Constantes globales | UPPER_SNAKE_CASE | `MAX_TOKENS` |
| Tablas de DB | snake_case plural | `task_labels` |
| Rutas API | kebab-case | `/api/ai/classify` |

---

## Estructura de carpetas clave

```
src/app/(dashboard)/     → páginas de la app (protegidas)
src/app/(auth)/          → login, register
src/app/api/             → API routes
src/components/ui/       → shadcn/ui (no modificar)
src/components/shared/   → componentes globales reutilizables
src/components/modules/  → componentes por módulo
src/components/lumus/    → componentes del chat IA
src/lib/supabase/        → clientes de Supabase
src/lib/ai/              → context builder, caché, prompts
src/lib/utils/           → funciones utilitarias puras
src/hooks/               → custom hooks
src/stores/              → Zustand stores
src/types/               → tipos TypeScript globales
tests/unit/              → unit tests con Vitest
```

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

- Unit tests en `tests/unit/` con Vitest
- Testear toda función en `src/lib/` y hooks
- Usar mocks en `tests/mocks/supabase.ts` y `tests/mocks/ai.ts`
- Nunca testear componentes de UI en esta etapa — solo lógica

---

## Lo que NO hacer

- ❌ No usar `any` en TypeScript
- ❌ No hacer `select('*')` en Supabase en producción
- ❌ No llamar la IA sin verificar caché primero
- ❌ No hardcodear strings de texto de la UI — usar variables
- ❌ No poner lógica de negocio en los componentes — va en hooks o lib
- ❌ No borrar registros físicamente en tablas con soft delete
- ❌ No usar `service_role` en código del cliente
- ❌ No agregar `'use client'` si el componente no lo necesita
- ❌ No crear componentes en `components/ui/` — esos son de shadcn

---

## Flujo de trabajo sugerido para una feature

1. Identificar en qué fase está (`docs/FASES.md`)
2. Leer el doc del módulo correspondiente
3. Crear o modificar schema si hace falta (nueva migration en `supabase/migrations/`)
4. Crear los tipos TypeScript en `src/types/`
5. Crear el componente de UI
6. Crear el hook o server action
7. Conectar con Supabase
8. Agregar unit test si hay lógica de negocio
9. Verificar que se ve bien en mobile y desktop
