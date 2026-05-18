# LUMUS — README para Agentes de IA

> Este archivo es el punto de entrada para Claude, Codex u otro agente de IA que trabaje en este proyecto.
> Leé este archivo primero. Luego navegá a los docs específicos según la tarea.

---

## ¿Qué es Lumus?

Lumus es un Sistema Operativo Personal impulsado por IA. Es una plataforma web fullstack donde el usuario centraliza organización, finanzas, comidas, salud, hábitos, journal, relaciones y estudio — con una IA contextual integrada en cada módulo.

---

## Mapa de Documentación

| Archivo | Contenido |
|---|---|
| `docs/LUMUS_OVERVIEW.md` | Visión, stack, filosofía, módulos, reglas de desarrollo |
| `docs/ARQUITECTURA.md` | Estructura de carpetas, convenciones de código, flujo de datos |
| `docs/SCHEMA.md` | Schema completo de PostgreSQL + RLS (Supabase) |
| `docs/AI_ARCHITECTURE.md` | Context Builder, caché, prompts, endpoints de IA |
| `docs/FASES.md` | Fases y subfases de desarrollo con checklist |
| `docs/DESIGN_SYSTEM.md` | Colores, tipografía, componentes, animaciones |
| `docs/modulos/ORGANIZACION.md` | Módulo de tareas, calendario y objetivos |
| `docs/modulos/FINANZAS.md` | Módulo de gastos, presupuestos y metas |
| `docs/modulos/COMIDAS.md` | Módulo de comidas y recetas |
| `docs/modulos/FIT.md` | Módulo de fitness y salud |
| `docs/modulos/HABITOS.md` | Módulo de hábitos y streaks |
| `docs/modulos/JOURNAL.md` | Módulo de diario y estados de ánimo |
| `docs/modulos/RELACIONES.md` | Módulo de contactos y fechas importantes |
| `docs/modulos/ESTUDIO.md` | Módulo de aprendizaje y notas |

---

## Stack de un vistazo

```
Next.js 14+ App Router + TypeScript (strict)
Tailwind CSS + shadcn/ui + Framer Motion
Supabase (PostgreSQL + Auth + Storage)
Zustand + React Hook Form + Zod
Claude API (claude-sonnet-4-5) + OpenAI API (gpt-4o-mini)
Vitest (unit tests)
Vercel (deploy)
```

---

## Reglas que SIEMPRE se aplican

1. **TypeScript estricto** — sin `any`, sin casting innecesario
2. **Zod** para validar todo input (forms y API routes)
3. **RLS activo** en todas las tablas de Supabase
4. **Verificar auth** al inicio de toda API route
5. **Nunca hardcodear** API keys — siempre de env vars
6. **Server Components** por default — `'use client'` solo si es necesario
7. **Soft delete** en tablas con `deleted_at` — nunca borrar físicamente
8. **Filtrar `deleted_at is null`** en todas las queries de tablas con soft delete
9. **Caché de IA** — siempre verificar `ai_cache` antes de llamar la API
10. **Comentarios en español**, código en inglés

---

## Cómo trabajar en una tarea

### Si es una feature nueva:
1. Ver en `docs/FASES.md` en qué fase está
2. Leer el doc del módulo correspondiente en `docs/modulos/`
3. Revisar el schema en `docs/SCHEMA.md` para las tablas involucradas
4. Revisar `docs/ARQUITECTURA.md` para la estructura de carpetas y convenciones
5. Seguir el design system de `docs/DESIGN_SYSTEM.md`

### Si es una feature de IA:
1. Leer `docs/AI_ARCHITECTURE.md` completo
2. Verificar si hay caché disponible antes de llamar la API
3. Usar el Context Builder (`src/lib/ai/context-builder.ts`)
4. Seleccionar el modelo correcto según la tarea
5. Guardar resultado en `ai_cache` y `ai_conversations`

### Si es un test:
1. Unit tests en `tests/unit/`
2. Usar mocks de Supabase en `tests/mocks/supabase.ts`
3. Testear funciones puras de `src/lib/` y hooks

---

## Estructura de Rutas

```
/                    → redirect a /dashboard (si auth) o /login
/login               → página de login
/register            → página de registro
/onboarding          → onboarding (solo si !onboarding_done)
/dashboard           → dashboard principal
/organizacion        → módulo organización
/finanzas            → módulo finanzas
/finanzas/reportes   → reportes financieros
/comidas             → módulo comidas
/fit                 → módulo fit
/habitos             → módulo hábitos
/journal             → módulo journal
/relaciones          → módulo relaciones
/estudio             → módulo estudio
/perfil              → perfil del usuario
```

---

## Variables de Entorno necesarias

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
ANTHROPIC_API_KEY=
OPENAI_API_KEY=
NEXT_PUBLIC_APP_URL=
```

---

## Contexto importante para la IA

- El idioma de la app es **español**
- La IA Lumus habla en **español**, de forma natural y cercana (no robótica)
- El usuario principal es un desarrollador joven que usa la app para uso personal
- El design system usa **dark mode por default** con opción a light
- La paleta de colores tiene un **accent violeta** (`#7c6dfa`) como color principal de Lumus
- Cada módulo tiene su **color propio** (ver `docs/DESIGN_SYSTEM.md`)
- La app es **responsive**: 40% desktop / 60% mobile — diseñar siempre con mobile en mente
# Lumus
