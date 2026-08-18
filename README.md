# LUMUS — README para Agentes de IA

> Este archivo es el punto de entrada para Claude, Codex u otro agente de IA que trabaje en este proyecto.
> Leé este archivo primero. Luego navegá a los docs específicos según la tarea.

---

## ¿Qué es Lumus?

Lumus es una app de finanzas personales con IA y paywall: el usuario se registra (con verificación de email por código), completa un onboarding breve, se suscribe vía Mercado Pago, y gestiona billeteras, transacciones, presupuestos, vencimientos recurrentes y metas de ahorro, con un reporte mensual generado por Claude.

**No es** un "Sistema Operativo Personal" con organización, comidas, fit, hábitos, journal, relaciones y estudio — esa era la visión original del proyecto, pero el 2026-06-29 el alcance se redujo a propósito solo a Finanzas, y el chat/voz de IA que integraba todos esos módulos se borró del código el 2026-08-18. `docs/ESTADO_ACTUAL.md` es la fuente de verdad sobre qué existe hoy.

---

## Mapa de Documentación

| Archivo | Contenido | Vigencia |
|---|---|---|
| `docs/ESTADO_ACTUAL.md` | Snapshot técnico y funcional real — empezar por acá | ✅ Vigente |
| `docs/ISSUES_PENDIENTES.md` | Backlog técnico e historial de qué se cerró y por qué | ✅ Vigente |
| `docs/FINANZAS.md` | El único módulo de producto | ✅ Vigente |
| `docs/BILLING.md` | Paywall de Mercado Pago — config, gotchas, checklist | ✅ Vigente |
| `docs/ARQUITECTURA.md` | Estructura de carpetas real, convenciones de código | ✅ Vigente |
| `docs/DESIGN_SYSTEM.md` | Colores, tipografía, componentes, animaciones | ✅ Vigente |
| `docs/LUMUS_OVERVIEW.md` | Visión de producto y stack | ✅ Vigente |
| `docs/FASES.md` | Qué se construyó y qué falta, en fases | ✅ Vigente |
| `docs/TOOLS_AND_SKILLS.md` | Setup de herramientas y skills de Claude Code | ✅ Vigente |
| `docs/SCHEMA.md` | Schema de la visión original de 8 módulos | ⚠️ Desactualizado — no usar, ver banner en el archivo |
| `docs/AI_ARCHITECTURE.md`, `docs/ORGANIZACION.md`, `docs/COMIDAS.md`, `docs/COMIDAS_V2.md`, `docs/FIT.md`, `docs/HABITOS.md`, `docs/JOURNAL.md`, `docs/RELACIONES.md`, `docs/ESTUDIO.md` | Docs de los módulos removidos y del chat de IA borrado | ⚠️ Históricos — el código que describen ya no existe |

---

## Stack de un vistazo

```
Next.js 16 App Router + TypeScript (strict)
Tailwind CSS v4 + shadcn/ui + Framer Motion
Supabase (PostgreSQL + Auth)
Zustand + React Hook Form + Zod
Claude API (claude-sonnet-4-5) — único proveedor de IA, solo para el reporte mensual
Mercado Pago (Suscripciones) — paywall
Resend — SMTP de Supabase Auth
Vercel (deploy)
```

Sin OpenAI, sin Vitest/tests, sin `tailwind.config.ts` (Tailwind v4 se configura en `globals.css`).

---

## Reglas que SIEMPRE se aplican

1. **TypeScript estricto** — sin `any`, sin casting innecesario
2. **Zod** para validar todo input (forms y API routes)
3. **RLS activo** en todas las tablas de Supabase
4. **Verificar auth** al inicio de toda API route
5. **Nunca hardcodear** API keys — siempre de env vars
6. **Server Components** por default — `'use client'` solo si es necesario
7. **Soft delete** en `transactions`, `wallets`, `finance_categories` — nunca borrar físicamente esas tres. El resto de las tablas financieras (`budgets`, `recurring_transactions`, `saving_goals`) se borran físicamente a propósito, ver `CLAUDE.md`
8. **Filtrar `deleted_at is null`** en las queries de esas tres tablas
9. **No clasificación automática de gastos por IA** — el usuario prefiere carga manual
10. **Comentarios en español**, código en inglés

---

## Cómo trabajar en una tarea

### Si es una feature nueva:
1. Ver `docs/ESTADO_ACTUAL.md` e `docs/ISSUES_PENDIENTES.md` para no repetir análisis ya hecho
2. Leer `docs/FINANZAS.md` o `docs/BILLING.md` según corresponda
3. Revisar el schema real en `supabase/migrations/` o `src/types/database.types.ts` (no en `docs/SCHEMA.md`, desactualizado)
4. Revisar `docs/ARQUITECTURA.md` para la estructura de carpetas y convenciones
5. Seguir el design system de `docs/DESIGN_SYSTEM.md`

### Si es una feature de IA:
1. El único endpoint de IA que existe es `/api/finance/ai-report` (`claude-sonnet-4-5`) — usarlo de referencia para el patrón de manejo de errores
2. No hay context builder, no hay `ai_cache` genérica — antes de llamar al proveedor, chequear si ya hay un resultado guardado para ese pedido específico (como hace `ai-report` con `finance_reports`)
3. Envolver la llamada en `try/catch`, validar la env var de la API key antes de llamar

### Si hay que tocar la base de datos:
1. Migration nueva en `supabase/migrations/`
2. Aplicarla al proyecto linkeado: `supabase db query --linked -f supabase/migrations/<archivo>.sql`
3. Regenerar tipos: `supabase gen types typescript --linked > src/types/database.types.ts`

---

## Estructura de Rutas

```
/                    → redirect según sesión, verificación, onboarding y suscripción
/login               → login (detecta cuenta no confirmada, ofrece reenviar código)
/register            → registro → redirige a /verify
/verify              → confirmación por código de 6 dígitos
/forgot-password     → pedir código de recuperación
/reset-password      → cambiar contraseña con el código
/onboarding          → onboarding de 3 pasos (solo si !onboarding_done)
/suscripcion         → paywall — botón de pago Mercado Pago (solo si no está autorizado)
/dashboard           → dashboard principal
/finanzas            → módulo finanzas
/finanzas/reportes   → reportes financieros
/perfil              → perfil del usuario (solo lectura por ahora)
```

No existen `/organizacion`, `/comidas`, `/fit`, `/habitos`, `/journal`, `/relaciones`, `/estudio` — se removieron del código en junio de 2026 y no están linkeados en la navegación.

---

## Variables de Entorno necesarias

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
ANTHROPIC_API_KEY=
NEXT_PUBLIC_APP_URL=
SUPABASE_PROJECT_REF=
RESEND_API_KEY=
MERCADOPAGO_ACCESS_TOKEN=
MERCADOPAGO_WEBHOOK_SECRET=
```

Ver `.env.example` para el detalle de cada una.

---

## Contexto importante para la IA

- El idioma de la app es **español**
- El usuario principal es un desarrollador joven que usa la app para uso personal
- El design system usa **dark mode por default**
- La paleta de colores tiene un **accent violeta** (`#7c6dfa`) como color principal de Lumus
- La app es **responsive**: diseñar siempre con mobile en mente
