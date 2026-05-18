# LUMUS — Documentación General del Proyecto

## Visión

Lumus es una plataforma personal impulsada por IA diseñada para centralizar y optimizar distintos aspectos de la vida cotidiana en una sola aplicación.

**Lumus NO es:**
- Una app de tareas
- Una app de finanzas
- Una app fitness

**Lumus ES:**
> Un Sistema Operativo Personal con IA — una plataforma inteligente que organiza la vida del usuario, entiende contexto global, ayuda en la toma de decisiones, analiza hábitos, automatiza planificación y funciona como un asistente personal integral.

---

## Contexto del Proyecto

| Item | Detalle |
|---|---|
| Nombre | Lumus |
| Estado actual | En desarrollo — uso personal (1 usuario inicial) |
| Usuarios objetivo | 1-2 usuarios (escalable a futuro) |
| Plataforma | Web app responsive (40% desktop / 60% mobile) |
| Idioma | Español |
| Deploy | Vercel |

---

## Stack Tecnológico

| Capa | Tecnología | Motivo |
|---|---|---|
| Framework | Next.js 14+ App Router + TypeScript | Fullstack, SSR, API routes, escalable |
| UI Base | Tailwind CSS + shadcn/ui | Rápido, customizable, premium |
| Animaciones | Framer Motion | UX fluida y moderna |
| Estado global | Zustand | Simple, sin boilerplate |
| Forms | React Hook Form + Zod | Validación tipada |
| Base de datos | Supabase (PostgreSQL) | BaaS completo, RLS, Realtime |
| Auth | Supabase Auth | Integrado con la DB |
| Storage | Supabase Storage | Fotos de progreso, assets |
| IA Principal | Claude API (Anthropic) | Contexto largo, razonamiento, personalidad |
| IA Secundaria | GPT-4o mini | Clasificaciones simples, tareas baratas |
| Testing | Vitest (unit tests) | Rápido, integrado con Next.js |
| Deploy | Vercel | CI/CD automático desde GitHub |

---

## Filosofía de Producto

### 1. Modularidad
Cada sección funciona como un módulo independiente. Esto permite escalar progresivamente, mantener arquitectura limpia, activar/desactivar módulos, crear versiones premium y facilitar mantenimiento.

### 2. Contexto Global de IA
La IA entiende múltiples aspectos de la vida del usuario — estado financiero, hábitos, descanso, productividad, alimentación, objetivos — y puede tomar decisiones cruzadas.

### 3. IA como Complemento (NO como motor)
```
Si se puede resolver con lógica      → lógica
Si se puede resolver con una query   → query SQL
Si necesita comprensión / lenguaje   → IA
```
Ejemplo: "¿Cuánto gasté este mes?" → SQL query. "¿En qué estoy gastando de más?" → IA.

### 4. Ahorro de Tokens
- Nunca se manda raw data a la IA — siempre un User Snapshot comprimido
- Caché de respuestas con TTL en Supabase
- IA activada por triggers específicos, no en tiempo real
- Modelo correcto para cada tarea (Claude para análisis, GPT-4o mini para clasificaciones)

### 5. UX Premium
El enfoque visual es minimalista, premium, moderno, fluido y elegante.
Inspiraciones: Linear, Notion, Apple, Arc Browser, Raycast.

---

## Módulos

| # | Módulo | Rol de Lumus IA |
|---|---|---|
| 1 | Organización | Asistente de productividad |
| 2 | Finanzas | Asesor financiero |
| 3 | Comidas & Nutrición | Chef + nutricionista |
| 4 | Fit & Salud | Entrenador personal |
| 5 | Hábitos | Coach de hábitos |
| 6 | Journal | Acompañamiento emocional |
| 7 | Relaciones | Gestor de vínculos |
| 8 | Estudio & Aprendizaje | Tutor personalizado |

---

## Onboarding

El onboarding tiene dos partes:

**Parte 1 — Formulario guiado estructurado:**
- Nombre, fecha de nacimiento
- Peso, altura
- Ocupación, estudios
- Salario aproximado
- Objetivos económicos
- Objetivos de salud
- Planes de vida

**Parte 2 — Campo libre:**
> "Contale a Lumus lo que quieras sobre vos — tus metas, tu estilo de vida, lo que quieras mejorar."

Este input se procesa y se guarda como `user_context` inicial en la base de datos. Es el punto de partida del contexto de IA para ese usuario.

---

## UX / UI

- **Temas:** Dark mode y Light mode con toggle
- **Responsive:** Mobile-first, con layout adaptado para desktop
- **Mobile:** Bottom navigation bar
- **Desktop:** Sidebar navigation
- **Fuentes:** Sans-serif moderna (Inter o Geist)
- **Estilo:** Minimalista, oscuro, premium — sin elementos genéricos

---

## Reglas de Desarrollo

1. TypeScript estricto en todo el proyecto (`strict: true`)
2. Zod para validación de schemas en forms y API routes
3. RLS habilitado en todas las tablas de Supabase
4. Unit tests para toda función de utilidad y lógica de negocio
5. Variables de entorno en `.env.local`, nunca hardcodeadas
6. Comentarios en español en el código
7. Nombres de variables y funciones en inglés (convención estándar)
8. Commits en inglés con conventional commits (`feat:`, `fix:`, `chore:`)

---

## Roadmap de Fases

| Fase | Nombre | Estado |
|---|---|---|
| 0 | Setup & Fundación | Pendiente |
| 1 | Core & Auth | Pendiente |
| 2 | Módulo Organización | Pendiente |
| 3 | Módulo Finanzas | Pendiente |
| 4 | Módulo Comidas & Nutrición | Pendiente |
| 5 | Módulo Fit & Salud | Pendiente |
| 6 | Módulos Restantes | Pendiente |
| 7 | IA Proactiva & Contexto Cruzado | Pendiente |
| 8 | Polish & Producción | Pendiente |

Ver detalle completo en `docs/FASES.md`.

---

## Futuro del Producto

- Modo pareja / familia con espacios compartidos
- IA proactiva (Lumus te habla antes de que le preguntes)
- Integraciones bancarias
- Integración con smartwatch / salud
- OCR de tickets para gastos automáticos
- Gamificación
- Marketplace de módulos
- Modelo freemium / suscripción mensual
