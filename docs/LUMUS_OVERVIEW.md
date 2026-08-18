# LUMUS — Documentación General del Proyecto

> Reescrito 2026-08-18 para reflejar el producto real. La versión anterior de este documento describía la visión original de "Sistema Operativo Personal" con 8 módulos — esa visión se abandonó el 2026-06-29 a favor de un producto enfocado solo en Finanzas. Si necesitás esa visión original por referencia histórica, está en el historial de git de este archivo.

## Visión

Lumus es una app de finanzas personales con IA y paywall.

**Lumus NO es:**
- Un sistema operativo personal con múltiples módulos de vida
- Una app con chat conversacional de IA

**Lumus ES:**
> Una app de finanzas personales donde el usuario registra billeteras, transacciones, presupuestos, vencimientos recurrentes y metas de ahorro, con un resumen mensual generado por IA, detrás de una suscripción paga.

---

## Contexto del Proyecto

| Item | Detalle |
|---|---|
| Nombre | Lumus |
| Estado actual | En producción, con paywall activo y probado con pagos reales (precio todavía de prueba) |
| Usuarios objetivo | 1-2 usuarios por ahora, pensado para escalar a más vía el paywall |
| Plataforma | Web app responsive |
| Idioma | Español |
| Deploy | Vercel |

---

## Stack Tecnológico

| Capa | Tecnología | Motivo |
|---|---|---|
| Framework | Next.js 16 App Router + TypeScript | Fullstack, SSR, API routes |
| UI Base | Tailwind CSS v4 + shadcn/ui | Rápido, customizable |
| Animaciones | Framer Motion | UX fluida |
| Estado global | Zustand | Solo para UI (sidebar, tema) |
| Forms | React Hook Form + Zod | Validación tipada |
| Base de datos | Supabase (PostgreSQL) | BaaS, RLS |
| Auth | Supabase Auth + Resend (SMTP) | Verificación por código, recuperación de contraseña |
| IA | Claude API (Anthropic) | Único proveedor — resumen financiero mensual |
| Paywall | Mercado Pago Suscripciones | Cobro recurrente en ARS |
| Deploy | Vercel | CI/CD desde GitHub |

No hay testing framework instalado, no hay Supabase Storage ni Realtime en uso, no hay OpenAI (se usaba para clasificación automática y TTS, ambos removidos).

---

## Filosofía de Producto

### 1. Un solo módulo, bien hecho
Ya no hay modularidad entre distintas áreas de vida — todo el esfuerzo de producto va a Finanzas.

### 2. IA como Complemento (NO como motor)
```
Si se puede resolver con lógica      → lógica
Si se puede resolver con una query   → query SQL
Si necesita comprensión / lenguaje   → IA
```
El único caso de uso real hoy: el resumen mensual de `/finanzas/reportes`, que sí necesita que un modelo lea los números y escriba un análisis en lenguaje natural.

### 3. Sin desperdicio de tokens
- No se manda raw data completo al modelo — `ai-report` arma un resumen del mes antes de llamar a Claude
- Antes de generar de nuevo, se chequea si ya existe un informe guardado para ese mes (`finance_reports`)
- Un solo modelo (`claude-sonnet-4-5`) para el único caso de uso — no hace falta selector de modelo

### 4. UX Premium
El enfoque visual es minimalista, premium, moderno, fluido y elegante.

---

## Onboarding

Tres pasos, sin cambios respecto al diseño original:

1. **Bienvenida** — presentación breve
2. **Perfil** — nombre, fecha de nacimiento, peso/altura, ocupación, estudios, salario aproximado
3. **Campo libre** — "Contale a Lumus lo que quieras sobre vos"

Se guarda en `user_profiles` y `user_life_summary`, y marca `onboarding_done = true`. Después del onboarding, si no hay una suscripción `authorized`, el usuario cae en `/suscripcion` antes de llegar al dashboard.

---

## UX / UI

- **Tema:** dark mode por default
- **Responsive:** mobile-first
- **Estilo:** minimalista, oscuro, premium
- Ver paleta y tokens completos en `docs/DESIGN_SYSTEM.md`

---

## Reglas de Desarrollo

1. TypeScript estricto en todo el proyecto (`strict: true`)
2. Zod para validación de schemas en forms y API routes
3. RLS habilitado en todas las tablas de Supabase
4. Variables de entorno en `.env.local`, nunca hardcodeadas
5. Comentarios en español en el código
6. Nombres de variables y funciones en inglés
7. Commits en inglés con conventional commits (`feat:`, `fix:`, `chore:`)
8. Sin test suite todavía — verificar con `tsc`, `lint` y `build`

---

## Roadmap

Ver `docs/FASES.md` para el detalle de qué se construyó y qué queda. En resumen: auth, onboarding, paywall y el módulo de Finanzas ya están en producción. Lo que queda es afinar detalles del paywall (precio real, probar el caso `paused`) y deuda técnica menor — no hay más módulos planeados en el corto plazo.

---

## Futuro del producto (sin comprometer nada, solo ideas)

- OCR de tickets para gastos automáticos
- Integraciones bancarias (lectura de movimientos)
- Modo pareja/familia con billeteras compartidas
- Precio real del plan (hoy es precio de prueba)

Todo lo demás de la visión original (organización, comidas, fit, hábitos, journal, relaciones, estudio, chat de IA transversal, gamificación, marketplace de módulos) está descartado del plan actual. Si en algún momento se retoma, hay que reconstruirlo — el código y las tablas se borraron.
