# LUMUS — Arquitectura Técnica

> Reescrito 2026-08-18 a partir de la estructura real del repo — la versión anterior describía una estructura planeada que nunca coincidió del todo con el código, y menos ahora tras el pivot a Finanzas.

## Stack Completo

```
Next.js 16 (App Router) + TypeScript strict
Tailwind CSS v4 + shadcn/ui + Framer Motion
Supabase (PostgreSQL + Auth) — sin Storage ni Realtime en uso
Zustand (estado global — solo UI)
React Hook Form + Zod
Anthropic SDK (Claude) — único proveedor de IA
Mercado Pago (API REST directa, sin SDK) — paywall
Vercel (deploy)
```

Vitest desde el 2026-08-27, solo sobre funciones puras (`src/lib/finance/rules.ts` y los formateadores). Sin carpeta `tests/` — los tests van al lado del archivo que prueban. Sin `tailwind.config.ts` (Tailwind v4 se configura vía `@theme` en `globals.css`).

---

## Estructura de Carpetas (real, 2026-08-27)

```
lumus/
├── src/
│   ├── app/
│   │   ├── (auth)/
│   │   │   ├── layout.tsx
│   │   │   ├── login/page.tsx
│   │   │   ├── register/page.tsx
│   │   │   ├── verify/page.tsx              → confirmación por código de 6 dígitos
│   │   │   ├── forgot-password/page.tsx
│   │   │   └── reset-password/page.tsx
│   │   │
│   │   ├── (onboarding)/
│   │   │   ├── layout.tsx
│   │   │   └── onboarding/page.tsx
│   │   │
│   │   ├── (dashboard)/
│   │   │   ├── layout.tsx                    → gate de onboarding + suscripción (server component, redirect)
│   │   │   ├── dashboard/page.tsx
│   │   │   ├── finanzas/
│   │   │   │   ├── page.tsx
│   │   │   │   └── reportes/page.tsx
│   │   │   └── perfil/page.tsx
│   │   │
│   │   ├── suscripcion/page.tsx               → paywall, fuera de (dashboard) a propósito
│   │   │
│   │   ├── api/
│   │   │   ├── billing/
│   │   │   │   ├── create-subscription/route.ts
│   │   │   │   ├── status/route.ts
│   │   │   │   └── webhook/route.ts           → pública, valida firma HMAC de Mercado Pago
│   │   │   └── finance/
│   │   │       ├── wallets/route.ts, [id]/route.ts, [id]/adjust/route.ts
│   │   │       ├── categories/route.ts, [id]/route.ts
│   │   │       ├── transactions/route.ts, [id]/route.ts
│   │   │       ├── budgets/route.ts, [id]/route.ts
│   │   │       ├── recurring-transactions/route.ts, [id]/route.ts
│   │   │       ├── saving-goals/route.ts, [id]/route.ts, [id]/contribute/route.ts
│   │   │       ├── exchange-rates/route.ts
│   │   │       └── ai-report/route.ts         → único endpoint de IA que queda
│   │   │
│   │   ├── layout.tsx                         → root layout (fonts, providers)
│   │   ├── page.tsx                           → redirect según sesión/onboarding/suscripción
│   │   └── globals.css                        → tokens del design system, Tailwind v4
│   │
│   ├── components/
│   │   ├── ui/                                → shadcn/ui (no tocar) — solo button.tsx por ahora
│   │   ├── shared/                            → top-nav, sidebar, bottom-nav, confirm-dialog
│   │   ├── modules/
│   │   │   ├── finanzas/                      → la gran mayoría de los componentes de la app
│   │   │   ├── billing/                       → subscribe-button.tsx
│   │   │   └── dashboard/                     → hero, widgets (clima, reloj, cotización)
│   │   └── lumus/
│   │       └── lumus-orb.tsx                  → solo el orbe decorativo, sin chat detrás
│   │
│   ├── lib/
│   │   ├── supabase/
│   │   │   ├── client.ts                      → cliente browser
│   │   │   ├── server.ts                      → cliente server (RSC y API routes)
│   │   │   ├── service.ts                     → cliente service_role — solo para el webhook de billing
│   │   │   └── middleware.ts                  → updateSession(), la usa src/proxy.ts
│   │   ├── billing/
│   │   │   └── plan.ts                        → precio, moneda, frecuencia del plan
│   │   ├── observability/
│   │   │   └── sentry.ts                      → config y scrubbing de Sentry, compartidos por los 3 runtimes
│   │   ├── notifications/
│   │   │   ├── notifications.ts               → motor: crear con dedupe, preferencias, sellar enviados
│   │   │   ├── due-recurring.ts               → qué vencimientos ameritan aviso (puro, con tests)
│   │   │   ├── due-notification.ts            → el texto del aviso + todayInArgentina()
│   │   │   ├── digest-email.ts                → el mail diario (en claro) y el envío por Resend
│   │   │   ├── finance-notices.ts             → presupuestos, metas, reporte y resumen (puros, con tests)
│   │   │   ├── collect.ts                     → las consultas que alimentan al cron
│   │   │   ├── preferences.ts                 → resolución de preferencias con defaults por tipo
│   │   │   └── unsubscribe-token.ts           → HMAC del link de baja
│   │   ├── finance/
│   │   │   ├── rules.ts                       → reglas de negocio puras (metas, presupuestos, recurrentes)
│   │   │   ├── rules.test.ts
│   │   │   ├── summary.ts                     → agregados del resumen financiero
│   │   │   ├── exchange-rates.ts
│   │   │   ├── report-parser.ts
│   │   │   └── report-pdf.ts
│   │   ├── validations/
│   │   │   └── finance.ts                     → todos los schemas Zod
│   │   ├── utils/
│   │   │   ├── format-currency.ts             → único lugar con `Intl.NumberFormat`
│   │   │   ├── format-currency.test.ts
│   │   │   ├── format-date.ts
│   │   │   ├── category-icons.tsx
│   │   │   └── animations.ts
│   │   └── utils.ts                           → helper `cn()` de shadcn
│   │
│   ├── hooks/                                 → todos de finanzas (use-wallets, use-transactions,
│   │                                             use-budgets, use-recurring-transactions,
│   │                                             use-saving-goals, use-finance-report,
│   │                                             use-finance-categories, use-exchange-rates)
│   │                                             + use-user.ts
│   │
│   ├── stores/
│   │   └── ui-store.ts                        → único store: sidebar, tema
│   │
│   ├── types/
│   │   ├── database.types.ts                  → generado por Supabase CLI, no editar a mano
│   │   ├── finance.types.ts
│   │   ├── billing.types.ts
│   │   └── index.ts                           → re-exports
│   │
│   ├── proxy.ts                                → el "middleware" de Next 16 — gate de auth/onboarding/billing
│   ├── instrumentation.ts                      → carga Sentry en node/edge + onRequestError
│   ├── instrumentation-client.ts               → init de Sentry en el browser
│   ├── sentry.server.config.ts
│   └── sentry.edge.config.ts
│
├── supabase/
│   ├── migrations/                             → 00001 a 00016, ver docs/ESTADO_ACTUAL.md para el detalle
│   └── templates/                              → templates de mail de Resend (confirmation.html, recovery.html)
│
├── docs/                                       → ver README.md para el mapa completo con vigencia de cada doc
│
├── skills/
│   └── frontend-design/SKILL.md
│
├── .env.example
├── next.config.ts
├── vercel.json                                 → el cron diario de avisos (Hobby: 1 corrida/día)
├── vitest.config.mts
├── tsconfig.json
└── package.json
```

No existen: `src/lib/ai/`, `src/components/lumus/lumus-chat.tsx` (ni fullscreen ni voice-modal), `src/stores/ai-store.ts`, `src/types/ai.types.ts`, `tailwind.config.ts`. Se borraron el 2026-08-18 junto con el chat/voz de IA.

---

## Convenciones de Código

### Naming
- Archivos de componentes: `kebab-case.tsx`
- Funciones y variables: `camelCase`
- Tipos e interfaces: `PascalCase`
- Constantes globales: `UPPER_SNAKE_CASE`
- Tablas de DB: `snake_case` plural

### Componentes
```typescript
// Server Component por default en App Router
// Agregar 'use client' solo cuando necesario (interactividad, hooks, estado)

// Ejemplo de componente de servidor — src/app/(dashboard)/finanzas/page.tsx
export default async function FinanzasPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  // ...fetch directo, sin useEffect
}

// Ejemplo de componente de cliente — src/components/modules/finanzas/wallet-card.tsx
'use client'
export function WalletCard({ wallet }: { wallet: Wallet }) {
  const [editing, setEditing] = useState(false)
  return <div onClick={() => setEditing(true)}>...</div>
}
```

### API Routes
```typescript
// Siempre verificar auth al inicio
export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  // Validar body con Zod
  const body = await req.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error }, { status: 400 })

  // Lógica...
}
```

### Zustand
Un solo store hoy, para estado de UI puro (no para datos de servidor — esos van por hooks que llaman a la API):
```typescript
// src/stores/ui-store.ts
export const useUIStore = create<UIStore>((set) => ({
  sidebarOpen: true,
  theme: 'dark',
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
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
SUPABASE_PROJECT_REF=

# IA
ANTHROPIC_API_KEY=

# Auth — SMTP de Resend
RESEND_API_KEY=

# Paywall — Mercado Pago
MERCADOPAGO_ACCESS_TOKEN=
MERCADOPAGO_WEBHOOK_SECRET=

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

---

## Flujo de Datos

```
Usuario hace acción en UI
        ↓
Componente cliente llama un hook (src/hooks/) que hace fetch a una API route
        ↓
API route verifica auth → valida con Zod → Supabase client (con auth automático via SSR)
        ↓
PostgreSQL con RLS (solo ve sus propios datos)
        ↓
Respuesta → el hook actualiza su estado local (no hay store global de datos)
        ↓
UI se actualiza
```

Gate de acceso (antes de llegar a cualquier página del dashboard):
```
Request → src/proxy.ts (updateSession)
        ↓
¿Sesión válida? no → redirect /login
        ↓
¿onboarding_done? no → redirect /onboarding
        ↓
¿billing_subscriptions.status === 'authorized'? no → redirect /suscripcion
        ↓
(dashboard)/layout.tsx repite el mismo chequeo de onboarding/suscripción (server component)
        ↓
Página del dashboard
```

Para la única llamada de IA que existe:
```
Componente cliente → POST /api/finance/ai-report
        ↓
API route verifica auth y valida ANTHROPIC_API_KEY
        ↓
¿Ya existe un informe para ese mes en finance_reports? sí (y no se pidió regenerate) → devolverlo
        ↓
Armar resumen del mes (queries a Supabase, no raw data completo)
        ↓
Llamar a Claude (try/catch — 502 con mensaje claro si falla)
        ↓
Guardar en finance_reports
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

export async function createClient() {
  const cookieStore = await cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
  )
}

// src/lib/supabase/service.ts — client con service_role, bypassea RLS.
// Server-only, uso exclusivo: el webhook de billing (ruta pública sin sesión de usuario).
import { createClient as createSupabaseClient } from '@supabase/supabase-js'

export function createServiceClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}
```
