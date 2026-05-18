# LUMUS — Fases de Desarrollo

## Resumen

| Fase | Nombre | Prioridad |
|---|---|---|
| 0 | Setup & Fundación | Crítica |
| 1 | Core & Auth | Crítica |
| 2 | Módulo Organización | Alta |
| 3 | Módulo Finanzas | Alta |
| 4 | Módulo Comidas & Nutrición | Media |
| 5 | Módulo Fit & Salud | Media |
| 6 | Módulos Restantes | Media-Baja |
| 7 | IA Proactiva & Contexto Cruzado | Alta |
| 8 | Polish & Producción | Crítica al final |

---

## FASE 0 — Setup & Fundación

> Objetivo: proyecto listo para desarrollar, sin funcionalidad aún

### 0.1 Inicialización del proyecto
- [ ] `npx create-next-app@latest lumus --typescript --tailwind --app --src-dir`
- [ ] Configurar `tsconfig.json` con `strict: true` y path aliases (`@/*`)
- [ ] Instalar y configurar shadcn/ui (`npx shadcn@latest init`)
- [ ] Instalar Framer Motion, Zustand, React Hook Form, Zod
- [ ] Instalar Supabase client (`@supabase/supabase-js`, `@supabase/ssr`)
- [ ] Instalar Anthropic SDK y OpenAI SDK
- [ ] Instalar Vitest + Testing Library

### 0.2 Supabase
- [ ] Crear proyecto en Supabase
- [ ] Correr migrations del schema completo (ver `docs/SCHEMA.md`)
- [ ] Configurar variables de entorno
- [ ] Verificar que RLS esté activo en todas las tablas

### 0.3 Vercel
- [ ] Conectar repositorio a Vercel
- [ ] Configurar variables de entorno en Vercel
- [ ] Configurar preview deployments para PRs

### 0.4 Design System
- [ ] Definir paleta de colores (dark/light) en `globals.css` y `tailwind.config.ts`
- [ ] Definir tipografía (Geist Sans como fuente principal)
- [ ] Definir border-radius, shadows, spacing tokens
- [ ] Crear componentes base: Button, Input, Card, Badge, Avatar

### 0.5 Estructura de carpetas
- [ ] Crear toda la estructura de carpetas según `docs/ARQUITECTURA.md`
- [ ] Crear archivos de tipos base en `src/types/`
- [ ] Crear clientes de Supabase en `src/lib/supabase/`

### 0.6 Configurar Vitest
- [ ] `vitest.config.ts` con setup para Next.js
- [ ] Crear `tests/mocks/supabase.ts`
- [ ] Primer test de sanidad para verificar que funciona

---

## FASE 1 — Core & Auth

> Objetivo: usuario puede registrarse, loguearse y completar el onboarding

### 1.1 Autenticación
- [ ] Configurar Supabase Auth en el proyecto
- [ ] Página de Login (`/login`) con email + password
- [ ] Página de Registro (`/register`)
- [ ] Logout desde el sidebar
- [ ] Middleware de rutas protegidas (`src/middleware.ts`)
- [ ] Redirección: si no está logueado → `/login`, si no completó onboarding → `/onboarding`
- [ ] Manejo de errores de auth (email ya registrado, contraseña incorrecta, etc.)
- [ ] Tests unitarios para funciones de auth

### 1.2 Onboarding
- [ ] Layout de onboarding con stepper visual (3 pasos)
- [ ] **Paso 1 — Bienvenida:** Pantalla de presentación de Lumus con animación
- [ ] **Paso 2 — Tu perfil:**
  - Nombre completo
  - Fecha de nacimiento
  - Peso actual (kg) y altura (cm)
  - Ocupación y estudios
  - Salario mensual aproximado
  - Objetivos económicos (dropdown + custom)
  - Objetivos de salud (dropdown + custom)
  - Planes de vida (campo de texto)
- [ ] **Paso 3 — Contale a Lumus:**
  - Campo libre de texto grande
  - Placeholder: "Contame todo lo que quieras sobre vos — tus metas, tu día a día, lo que querés mejorar, tu estilo de vida..."
  - Botón "Comenzar con Lumus"
- [ ] Guardar datos en `user_profiles` y `user_life_summary`
- [ ] Marcar `onboarding_done = true` al finalizar
- [ ] Generar `user_context_cache` inicial
- [ ] Tests unitarios del flujo de onboarding

### 1.3 Layout Principal
- [ ] Layout con sidebar para desktop
- [ ] Layout con bottom navigation bar para mobile
- [ ] Sidebar: logo Lumus, links de navegación por módulo, avatar + nombre de usuario, toggle dark/light
- [ ] Bottom nav mobile: iconos de módulos principales + dashboard
- [ ] Componente de campanita de notificaciones (UI base)
- [ ] Página de error 404 personalizada

### 1.4 Dashboard Base
- [ ] Página dashboard (`/dashboard`)
- [ ] Saludo personalizado: "Buenos días, [nombre]" según hora del día
- [ ] Grid de widgets (vacíos inicialmente, se llenan con cada fase)
- [ ] Widgets: tareas del día, balance financiero, hábitos del día, mood de hoy
- [ ] Responsive: 1 columna mobile, 2-3 columnas desktop

### 1.5 Perfil de Usuario
- [ ] Página de perfil (`/perfil`)
- [ ] Ver y editar datos del perfil
- [ ] Editar resumen de vida (campo libre)
- [ ] Al guardar cambios → invalidar `user_context_cache`

---

## FASE 2 — Módulo Organización

> Objetivo: gestión completa de tareas, calendario, rutinas y objetivos

### 2.1 Tareas
- [ ] Página principal del módulo (`/organizacion`)
- [ ] Lista de tareas con filtros (estado, prioridad, etiqueta)
- [ ] Crear tarea: título, descripción, prioridad, fecha de vencimiento, etiquetas
- [ ] Editar tarea inline o en modal
- [ ] Marcar tarea como completada (checkbox con animación)
- [ ] Subtareas: agregar y completar desde la tarea padre
- [ ] Archivar/eliminar tarea (soft delete)
- [ ] Tests unitarios para CRUD de tareas

### 2.2 Etiquetas
- [ ] CRUD de etiquetas con color personalizable
- [ ] Asignar múltiples etiquetas a una tarea
- [ ] Filtrar tareas por etiqueta

### 2.3 Calendario
- [ ] Vista mensual con tareas del día marcadas
- [ ] Vista semanal con time blocks
- [ ] Vista diaria con agenda del día
- [ ] Click en día → ver tareas de ese día
- [ ] Crear evento de calendario desde el calendario

### 2.4 Rutinas
- [ ] CRUD de rutinas (mañana, noche, trabajo, estudio, custom)
- [ ] Asociar tareas existentes a una rutina
- [ ] Activar/desactivar rutina

### 2.5 Objetivos
- [ ] CRUD de objetivos mensuales y anuales
- [ ] Seguimiento de progreso (slider 0-100%)
- [ ] Marcar objetivo como alcanzado

### 2.6 Chat Lumus — Organización
- [ ] Panel de chat lateral o modal por módulo
- [ ] Historial de conversación (últimos 10 mensajes)
- [ ] Enviar mensaje → llamar `/api/ai/chat` con `module: 'organizacion'`
- [ ] Mostrar estado "Lumus está escribiendo..."
- [ ] Sugerencias rápidas: "Organizame la semana", "¿Qué priorizo hoy?", "Tengo demasiado trabajo"

### 2.7 Estadísticas Organización
- [ ] Widget en dashboard: tareas completadas esta semana
- [ ] Gráfico de productividad semanal
- [ ] % de cumplimiento de objetivos del mes

---

## FASE 3 — Módulo Finanzas

> Objetivo: control financiero personal completo

### 3.1 Billeteras
- [ ] CRUD de billeteras (efectivo, banco, virtual)
- [ ] Balance de cada billetera
- [ ] Color e ícono por billetera

### 3.2 Categorías
- [ ] Categorías default pre-cargadas (comida, transporte, ocio, etc.)
- [ ] CRUD de categorías custom
- [ ] Color e ícono por categoría

### 3.3 Transacciones
- [ ] Registrar gasto con: monto, billetera, categoría, descripción, fecha
- [ ] Registrar ingreso
- [ ] Clasificación automática por IA (GPT-4o mini) al ingresar descripción
- [ ] Listado con filtros: tipo, categoría, billetera, rango de fechas
- [ ] Editar y eliminar transacción (soft delete)
- [ ] Tests unitarios para transacciones

### 3.4 Presupuestos
- [ ] Definir límite mensual por categoría
- [ ] Indicador visual de % usado del presupuesto
- [ ] Alerta cuando supera el 80% del límite

### 3.5 Suscripciones
- [ ] CRUD de suscripciones recurrentes
- [ ] Próxima fecha de cobro
- [ ] Resumen del gasto mensual en suscripciones

### 3.6 Metas de Ahorro
- [ ] Crear meta con nombre, monto objetivo, fecha objetivo
- [ ] Registrar aportes a la meta
- [ ] Barra de progreso visual
- [ ] Marcar meta como alcanzada

### 3.7 Reportes
- [ ] Vista de reportes (`/finanzas/reportes`)
- [ ] Gráfico de gastos por categoría (pie chart)
- [ ] Evolución de gastos vs ingresos por mes (line chart)
- [ ] Top 5 categorías del mes

### 3.8 Chat Lumus — Finanzas
- [ ] Chat contextual con datos financieros en el snapshot
- [ ] Sugerencias rápidas: "¿En qué gasto de más?", "¿Puedo ahorrar más?", "Analizá mis gastos"

---

## FASE 4 — Módulo Comidas & Nutrición

### 4.1 Registro de Comidas
- [ ] Registrar comida por momento del día
- [ ] Asociar receta o ingresar nombre manual
- [ ] Historial semanal de comidas

### 4.2 Recetas
- [ ] CRUD de recetas con ingredientes e instrucciones
- [ ] Info nutricional (calorías, proteínas, grasas, carbos)
- [ ] Marcar como favorita
- [ ] Recetas generadas por IA (se guardan con `ai_generated: true`)

### 4.3 Lista del Supermercado
- [ ] Lista manual con items y categorías
- [ ] Generación automática desde menú semanal (IA)
- [ ] Marcar items como comprados
- [ ] Limpiar lista

### 4.4 Chat Lumus — Comidas
- [ ] Sugerencias rápidas: "¿Qué cocino hoy?", "Armame un meal prep", "Algo alto en proteínas"

---

## FASE 5 — Módulo Fit & Salud

### 5.1 Seguimiento Corporal
- [ ] Registrar peso, medidas, % grasa
- [ ] Subir foto de progreso (Supabase Storage)
- [ ] Gráfico de evolución de peso

### 5.2 Entrenamientos
- [ ] CRUD de ejercicios con grupo muscular
- [ ] Crear rutinas de entrenamiento
- [ ] Registrar sesión: qué hiciste, cuántos sets, reps, peso
- [ ] Historial de sesiones

### 5.3 Hábitos de Salud
- [ ] Registro diario: agua (ml), sueño (horas), pasos
- [ ] Integración con módulo de hábitos

### 5.4 Chat Lumus — Fit
- [ ] Sugerencias: "Rutina para hipertrofia", "Analizá mi progreso", "¿Estoy mejorando?"

---

## FASE 6 — Módulos Restantes

### 6.1 Hábitos
- [ ] CRUD de hábitos (positivos y negativos)
- [ ] Check diario de cada hábito
- [ ] Streaks con visualización
- [ ] Heatmap de consistencia (estilo GitHub)
- [ ] Chat Lumus: detectar patrones, recomendar mejoras

### 6.2 Journal
- [ ] Editor de texto enriquecido para entradas diarias
- [ ] Registro de estado de ánimo (mood 1-5 con emojis)
- [ ] Tags por entrada
- [ ] Resumen semanal generado por IA
- [ ] Chat Lumus: análisis emocional, patrones

### 6.3 Relaciones
- [ ] CRUD de contactos con tipo de relación
- [ ] Registrar fechas importantes (cumpleaños, aniversarios)
- [ ] Recordatorios automáticos (notificaciones)
- [ ] Chat Lumus: sugerencias de actividades, ideas de regalos

### 6.4 Estudio & Aprendizaje
- [ ] CRUD de temas/cursos con estado y progreso
- [ ] Notas asociadas a cada tema con editor
- [ ] Tags y búsqueda
- [ ] Chat Lumus: tutor personalizado, explicar conceptos, generar ejercicios

---

## FASE 7 — IA Proactiva & Contexto Cruzado

> Esta fase es el diferencial real de Lumus

- [ ] User Snapshot global conectando todos los módulos
- [ ] Resumen semanal automático (Supabase Edge Function o Vercel Cron)
- [ ] Notificaciones inteligentes basadas en contexto cruzado
  - Ejemplo: "Dormiste poco y tu productividad bajó — ¿querés ajustar el plan de hoy?"
- [ ] Recomendaciones cruzadas entre módulos
- [ ] Widget "Lumus sugiere" en el dashboard
- [ ] Invalidación inteligente del caché al registrar nuevos datos

---

## FASE 8 — Polish & Producción

- [ ] Unit tests al 80%+ de cobertura en funciones críticas
- [ ] Optimización de queries de Supabase (índices, selects específicos)
- [ ] Error boundary global
- [ ] Toast notifications para acciones (crear, editar, eliminar)
- [ ] Loading skeletons en todos los componentes async
- [ ] Animaciones de entrada/salida con Framer Motion
- [ ] Rate limiting en API routes de IA
- [ ] Review completa de RLS policies
- [ ] Agregar segundo usuario
- [ ] Optimización mobile: touch targets, scroll, gestos
- [ ] Performance: Lighthouse score > 90
