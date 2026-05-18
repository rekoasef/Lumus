# LUMUS — Arquitectura Técnica

## Stack Completo

```
Next.js 14+ (App Router) + TypeScript
Tailwind CSS + shadcn/ui + Framer Motion
Supabase (PostgreSQL + Auth + Storage + Realtime)
Zustand (estado global)
React Hook Form + Zod (formularios y validación)
Anthropic SDK (Claude) + OpenAI SDK (GPT-4o mini)
Vitest (unit testing)
Vercel (deploy)
```

---

## Estructura de Carpetas

```
lumus/
├── src/
│   ├── app/
│   │   ├── (auth)/
│   │   │   ├── login/
│   │   │   │   └── page.tsx
│   │   │   ├── register/
│   │   │   │   └── page.tsx
│   │   │   └── layout.tsx
│   │   │
│   │   ├── (onboarding)/
│   │   │   ├── onboarding/
│   │   │   │   └── page.tsx
│   │   │   └── layout.tsx
│   │   │
│   │   ├── (dashboard)/
│   │   │   ├── layout.tsx            → Layout con sidebar/bottom nav
│   │   │   ├── dashboard/
│   │   │   │   └── page.tsx
│   │   │   ├── organizacion/
│   │   │   │   ├── page.tsx
│   │   │   │   └── [taskId]/
│   │   │   │       └── page.tsx
│   │   │   ├── finanzas/
│   │   │   │   ├── page.tsx
│   │   │   │   └── reportes/
│   │   │   │       └── page.tsx
│   │   │   ├── comidas/
│   │   │   │   └── page.tsx
│   │   │   ├── fit/
│   │   │   │   └── page.tsx
│   │   │   ├── habitos/
│   │   │   │   └── page.tsx
│   │   │   ├── journal/
│   │   │   │   └── page.tsx
│   │   │   ├── relaciones/
│   │   │   │   └── page.tsx
│   │   │   ├── estudio/
│   │   │   │   └── page.tsx
│   │   │   └── perfil/
│   │   │       └── page.tsx
│   │   │
│   │   ├── api/
│   │   │   ├── ai/
│   │   │   │   ├── chat/
│   │   │   │   │   └── route.ts      → POST: chat por módulo
│   │   │   │   ├── classify/
│   │   │   │   │   └── route.ts      → POST: clasificar gasto
│   │   │   │   ├── summary/
│   │   │   │   │   └── route.ts      → POST: resumen semanal
│   │   │   │   └── context/
│   │   │   │       └── route.ts      → GET: user snapshot
│   │   │   ├── organizacion/
│   │   │   │   ├── tasks/
│   │   │   │   │   └── route.ts
│   │   │   │   └── ...
│   │   │   └── finanzas/
│   │   │       ├── transactions/
│   │   │       │   └── route.ts
│   │   │       └── ...
│   │   │
│   │   ├── layout.tsx                → Root layout (fonts, providers)
│   │   ├── globals.css               → Variables CSS, tokens del design system
│   │   └── not-found.tsx
│   │
│   ├── components/
│   │   ├── ui/                       → Componentes shadcn/ui (no tocar)
│   │   ├── shared/                   → Componentes globales reutilizables
│   │   │   ├── sidebar.tsx
│   │   │   ├── bottom-nav.tsx
│   │   │   ├── notifications-bell.tsx
│   │   │   ├── theme-toggle.tsx
│   │   │   ├── user-avatar.tsx
│   │   │   ├── page-header.tsx
│   │   │   ├── empty-state.tsx
│   │   │   └── loading-skeleton.tsx
│   │   ├── modules/                  → Componentes específicos por módulo
│   │   │   ├── organizacion/
│   │   │   │   ├── task-card.tsx
│   │   │   │   ├── task-form.tsx
│   │   │   │   ├── task-list.tsx
│   │   │   │   ├── calendar-view.tsx
│   │   │   │   └── objective-card.tsx
│   │   │   ├── finanzas/
│   │   │   │   ├── transaction-form.tsx
│   │   │   │   ├── transaction-list.tsx
│   │   │   │   ├── wallet-card.tsx
│   │   │   │   ├── budget-meter.tsx
│   │   │   │   └── charts/
│   │   │   │       ├── expenses-pie.tsx
│   │   │   │       └── balance-line.tsx
│   │   │   └── ...
│   │   ├── lumus/                    → Componentes del chat IA
│   │   │   ├── lumus-chat.tsx        → Contenedor principal del chat
│   │   │   ├── lumus-message.tsx     → Burbuja de mensaje
│   │   │   ├── lumus-input.tsx       → Input del chat
│   │   │   └── lumus-suggestions.tsx → Sugerencias rápidas
│   │   └── dashboard/
│   │       ├── welcome-widget.tsx
│   │       ├── tasks-widget.tsx
│   │       ├── finance-widget.tsx
│   │       └── habits-widget.tsx
│   │
│   ├── lib/
│   │   ├── supabase/
│   │   │   ├── client.ts             → Cliente browser
│   │   │   ├── server.ts             → Cliente server (RSC y API routes)
│   │   │   └── middleware.ts         → Helper para middleware.ts
│   │   ├── ai/
│   │   │   ├── context-builder.ts    → Construye User Snapshot
│   │   │   ├── cache.ts              → Lógica de caché de respuestas
│   │   │   ├── model-selector.ts     → Selecciona Claude vs GPT
│   │   │   └── prompts/
│   │   │       ├── base.ts
│   │   │       ├── organizacion.ts
│   │   │       ├── finanzas.ts
│   │   │       ├── comidas.ts
│   │   │       ├── fit.ts
│   │   │       ├── habitos.ts
│   │   │       ├── journal.ts
│   │   │       ├── relaciones.ts
│   │   │       └── estudio.ts
│   │   └── utils/
│   │       ├── format-currency.ts
│   │       ├── format-date.ts
│   │       ├── cn.ts                 → classnames helper
│   │       └── calculate-streak.ts
│   │
│   ├── hooks/
│   │   ├── use-user.ts               → Hook para obtener usuario actual
│   │   ├── use-notifications.ts
│   │   ├── use-tasks.ts
│   │   ├── use-transactions.ts
│   │   └── use-habits.ts
│   │
│   ├── stores/
│   │   ├── ui-store.ts               → Estado UI (sidebar open, tema, etc.)
│   │   ├── notifications-store.ts
│   │   └── ai-store.ts               → Estado del chat de Lumus
│   │
│   ├── types/
│   │   ├── database.types.ts         → Generado por Supabase CLI
│   │   ├── ai.types.ts               → UserSnapshot, AIMessage, etc.
│   │   ├── modules.types.ts          → Tipos por módulo
│   │   └── index.ts                  → Re-exports
│   │
│   ├── styles/
│   │   └── globals.css
│   │
│   └── middleware.ts                 → Auth middleware
│
├── supabase/
│   ├── migrations/
│   │   ├── 00001_initial_schema.sql
│   │   ├── 00002_organizacion.sql
│   │   └── ...
│   ├── functions/
│   │   └── weekly-summary/
│   │       └── index.ts
│   └── seed.sql                      → Datos iniciales (categorías default, etc.)
│
├── tests/
│   ├── unit/
│   │   ├── lib/
│   │   │   ├── ai/
│   │   │   │   ├── context-builder.test.ts
│   │   │   │   └── cache.test.ts
│   │   │   └── utils/
│   │   │       ├── format-currency.test.ts
│   │   │       └── calculate-streak.test.ts
│   │   └── hooks/
│   │       └── use-tasks.test.ts
│   └── mocks/
│       ├── supabase.ts
│       └── ai.ts
│
├── docs/
│   ├── LUMUS_OVERVIEW.md
│   ├── ARQUITECTURA.md               → Este archivo
│   ├── SCHEMA.md
│   ├── AI_ARCHITECTURE.md
│   ├── FASES.md
│   ├── DESIGN_SYSTEM.md
│   └── modulos/
│       ├── ORGANIZACION.md
│       ├── FINANZAS.md
│       ├── COMIDAS.md
│       ├── FIT.md
│       ├── HABITOS.md
│       ├── JOURNAL.md
│       ├── RELACIONES.md
│       └── ESTUDIO.md
│
├── public/
│   └── icons/
│
├── .env.local                        → Variables de entorno (no commitear)
├── .env.example                      → Template de variables
├── middleware.ts                     → Next.js middleware
├── next.config.ts
├── tailwind.config.ts
├── tsconfig.json
├── vitest.config.ts
└── package.json
```

---

## Convenciones de Código

### Naming
- Archivos de componentes: `kebab-case.tsx`
- Funciones y variables: `camelCase`
- Tipos e interfaces: `PascalCase`
- Constantes globales: `UPPER_SNAKE_CASE`
- Tablas de DB: `snake_case`

### Componentes
```typescript
// Server Component por default en App Router
// Agregar 'use client' solo cuando necesario (interactividad, hooks, estado)

// Ejemplo de componente de servidor
async function TaskList({ userId }: { userId: string }) {
  const tasks = await getTasks(userId)  // fetch directo, sin useEffect
  return <ul>...</ul>
}

// Ejemplo de componente de cliente
'use client'
function TaskCard({ task }: { task: Task }) {
  const [checked, setChecked] = useState(false)
  return <div onClick={() => setChecked(true)}>...</div>
}
```

### API Routes
```typescript
// Siempre verificar auth al inicio
export async function POST(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  // Validar body con Zod
  const body = await req.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error }, { status: 400 })

  // Lógica...
}
```

### Zustand Stores
```typescript
// src/stores/ui-store.ts
interface UIStore {
  sidebarOpen: boolean
  theme: 'dark' | 'light'
  setSidebarOpen: (open: boolean) => void
  setTheme: (theme: 'dark' | 'light') => void
}

export const useUIStore = create<UIStore>((set) => ({
  sidebarOpen: true,
  theme: 'dark',
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  setTheme: (theme) => set({ theme }),
}))
```

---

## Variables de Entorno

```bash
# .env.example

# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=        # Solo en server, nunca en cliente

# IA
ANTHROPIC_API_KEY=
OPENAI_API_KEY=

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

---

## Flujo de Datos

```
Usuario hace acción en UI
        ↓
Componente cliente llama hook o server action
        ↓
Validación con Zod
        ↓
Supabase client (con auth automático via SSR)
        ↓
PostgreSQL con RLS (solo ve sus propios datos)
        ↓
Respuesta → actualizar estado (Zustand o revalidación de caché Next.js)
        ↓
UI se actualiza
```

Para llamadas a IA:
```
Componente cliente → fetch /api/ai/chat
        ↓
API Route verifica auth
        ↓
Context Builder → buildUserSnapshot (Supabase queries)
        ↓
Verificar ai_cache → hit? devolver cached
        ↓
Llamar Claude API con system prompt + snapshot + mensajes
        ↓
Guardar en ai_cache y ai_conversations
        ↓
Streaming response al cliente
```

---

## Supabase Clients

```typescript
// src/lib/supabase/client.ts — para componentes cliente ('use client')
import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

// src/lib/supabase/server.ts — para Server Components y API Routes
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export function createClient() {
  const cookieStore = cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: ... } }
  )
}
```
