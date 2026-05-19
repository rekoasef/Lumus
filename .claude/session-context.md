# Lumus — Contexto de sesión activo

## Estado del proyecto: Fase 2 en progreso

### Completado hasta ahora
- **Fase 0** ✅ Setup, Supabase schema (37 tablas), variables de entorno, design system
- **Fase 1** ✅ Auth (login/register), onboarding 3 pasos, dashboard, sidebar, bottom nav
- **Fase 2.1** ✅ Task management: CRUD completo, formulario modal, filtros, soft delete, optimistic updates

### Archivos clave creados esta sesión
```
src/lib/validations/tasks.ts         ← Zod schemas (createTaskSchema, updateTaskSchema)
src/types/tasks.types.ts             ← Task, TaskFilter, TaskPriority, TaskStatus
src/app/api/tasks/route.ts           ← GET lista + POST crear
src/app/api/tasks/[id]/route.ts      ← PATCH actualizar + DELETE soft-delete
src/hooks/use-tasks.ts               ← Hook cliente con optimistic updates
src/components/modules/organizacion/task-item.tsx
src/components/modules/organizacion/task-form.tsx
src/components/modules/organizacion/task-list.tsx
src/app/(dashboard)/organizacion/page.tsx  ← Server Component, fetches tasks SSR
```

### Bug corregido
`src/lib/supabase/middleware.ts` — `/api/*` ahora bypasea el redirect de auth (retorna 401)

---

## LO QUE HAY QUE IMPLEMENTAR AHORA: Vista Semanal (Calendar)

### Decisión del usuario
- Extender tareas con `start_time` (hora de inicio) y `duration_minutes` (duración)
- Vista semanal tipo time-blocking (no mensual)
- Una tarea puede tener fecha sin hora (aparece como "sin horario")

### Paso 1 — Migración de base de datos
```sql
alter table tasks add column start_time text;          -- "HH:MM", nullable
alter table tasks add column duration_minutes integer; -- nullable, e.g. 90
```
Usar: `mcp__claude_ai_Supabase__apply_migration` (get project_id primero con `list_projects`)

### Paso 2 — Actualizar tipos y validación
`src/types/tasks.types.ts`: agregar `start_time: string | null` y `duration_minutes: number | null`

`src/lib/validations/tasks.ts`: agregar a `createTaskSchema` y `updateTaskSchema`:
```typescript
start_time: z.string().regex(/^\d{2}:\d{2}$/).nullable().optional(),
duration_minutes: z.number().int().min(5).max(480).nullable().optional(),
```

### Paso 3 — Actualizar task form
`src/components/modules/organizacion/task-form.tsx`:
- Mostrar "Hora inicio" (input time) y "Duración" (select: 15min/30min/45min/1h/1h30/2h/3h)
- Solo visibles cuando `due_date` está llenado

### Paso 4 — Crear week-calendar.tsx
Archivo nuevo: `src/components/modules/organizacion/week-calendar.tsx`
- Client component
- Props: `tasks: Task[]`, `onEdit: (task: Task) => void`, `onToggle: (task: Task) => void`, `onCreateSlot: (date: string, time: string) => void`
- Estado: `currentWeek` (Date del lunes), navegar semana a semana
- Grid: 1px = 1 minuto, rango 06:00–22:00, 1hr = 60px → total 960px
- Columnas: Lun–Dom (7 días)
- Columna izquierda: etiquetas de hora cada 1hr
- Tareas con `due_date` + `start_time`: bloques posicionados absolutamente
- Tareas con `due_date` sin `start_time`: strip "sin horario" arriba de cada columna
- Click en slot vacío → llama `onCreateSlot(date, time)`
- Día actual: borde accent color

Fórmula de posicionamiento:
```
top (px)    = (hours - 6) * 60 + minutes
height (px) = Math.max(duration_minutes ?? 30, 30)
```

### Paso 5 — Actualizar task-list.tsx
- Agregar tabs `[ Lista ] [ Semana ]` arriba del toolbar
- En vista Semana: renderizar `<WeekCalendar>` en vez de la lista
- Botón "Nueva tarea" visible en ambas vistas
- Click en slot vacío del calendario → abrir form con date/time pre-llenado

---

## Stack
- Next.js 16.2.6 Turbopack, App Router, TypeScript strict
- Supabase (PostgreSQL + Auth + RLS), @supabase/ssr@0.10.3
- Zod 4.4.3, React Hook Form 7.76, @hookform/resolvers 5.2.2
- Framer Motion 12.38, Zustand 5, Lucide React 1.16
- CSS variables: `--accent-lumus`, `--bg-surface`, `--bg-elevated`, `--bg-hover`, `--border`, `--border-subtle`, `--text-primary`, `--text-secondary`, `--text-muted`, `--danger`, `--warning`, `--success`, `--accent-muted`
- Módulo organizacion color: `--mod-organizacion: #7c6dfa`

## Fases siguientes después del calendario
- Fase 2.2 — Labels (CRUD de etiquetas con color)
- Fase 2.3 — Objetivos mensuales/anuales
- Fase 3 — Módulo Finanzas
