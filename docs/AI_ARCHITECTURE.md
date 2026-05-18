# LUMUS — Arquitectura de IA

## Principio Fundamental

La IA en Lumus es un **complemento inteligente**, no el motor de la app.

```
Si se puede resolver con lógica      → lógica
Si se puede resolver con una query   → query SQL
Si necesita comprensión / lenguaje   → IA
```

---

## Modelos y sus Roles

| Modelo | Uso | Por qué |
|---|---|---|
| `claude-sonnet-4-5` | Chat de Lumus, análisis contextual, resúmenes semanales, journal | Contexto largo, razonamiento profundo, personalidad natural |
| `gpt-4o-mini` | Clasificación automática de gastos, análisis de sentimiento simple | Barato, rápido, suficiente para tareas simples |

### Regla de selección de modelo
```typescript
// src/lib/ai/model-selector.ts
type AITask =
  | 'chat'           // → Claude
  | 'summary'        // → Claude
  | 'analysis'       // → Claude
  | 'classify'       // → GPT-4o mini
  | 'sentiment'      // → GPT-4o mini
  | 'generate_list'  // → GPT-4o mini
```

---

## Context Builder

El Context Builder es el componente más importante del sistema de IA. Construye un snapshot comprimido del usuario antes de cada llamada a la API.

### Estructura del User Snapshot

```typescript
// src/types/ai.ts
interface UserSnapshot {
  perfil: {
    nombre: string
    edad: number
    peso_kg: number
    altura_cm: number
    ocupacion: string
    resumen_vida: string  // del campo libre del onboarding
  }
  semana: string          // "12-18 Mayo 2025"
  organizacion: {
    tareas_pendientes: number
    tareas_completadas_semana: number
    tareas_vencidas: number
    proximas_tareas: string[]  // máximo 3
  }
  finanzas: {
    gastado_mes: number
    presupuesto_mes: number
    categoria_top_gasto: string
    dias_para_fin_mes: number
  }
  habitos: {
    gym: string          // "4/7"
    agua: string         // "bajo" | "normal" | "alto"
    sueno_promedio: number
  }
  salud: {
    ultimo_peso: number
    tendencia_peso: string  // "bajando" | "subiendo" | "estable"
  }
  mood_semana: number    // promedio 1-5
  objetivos_activos: string[]  // máximo 3
}
```

### Lógica del Context Builder

```typescript
// src/lib/ai/context-builder.ts
export async function buildUserSnapshot(userId: string): Promise<UserSnapshot> {
  // 1. Verificar si hay caché válido
  const cached = await getCachedSnapshot(userId)
  if (cached) return cached

  // 2. Construir snapshot con queries paralelas
  const [perfil, organizacion, finanzas, habitos, salud, mood] = await Promise.all([
    getUserProfile(userId),
    getOrganizacionContext(userId),
    getFinanzasContext(userId),
    getHabitosContext(userId),
    getSaludContext(userId),
    getMoodContext(userId),
  ])

  const snapshot = buildSnapshot({ perfil, organizacion, finanzas, habitos, salud, mood })

  // 3. Guardar en caché con TTL de 1 hora
  await cacheSnapshot(userId, snapshot, { ttlHours: 1 })

  return snapshot
}
```

---

## Flujo de una Llamada a la IA

```
Usuario escribe en chat de módulo
          ↓
Verificar caché (ai_cache table)
          ↓
¿Hit de caché?
   ↙           ↘
  SÍ            NO
  ↓              ↓
Devolver       Construir User Snapshot
caché          (Context Builder)
                ↓
              Seleccionar modelo
              (Claude / GPT-4o mini)
                ↓
              Construir prompt
              (system + context + user message)
                ↓
              Llamar API
                ↓
              Guardar en ai_cache
                ↓
              Guardar en ai_conversations
                ↓
Respuesta ← Devolver al usuario
```

---

## Sistema de Prompts

### System Prompt Base (todos los módulos)

```typescript
// src/lib/ai/prompts/base.ts
export const BASE_SYSTEM_PROMPT = `
Eres Lumus, el asistente personal inteligente del usuario.

Tu personalidad:
- Eres directo, inteligente y cercano
- Hablas en español, de manera natural y sin ser robótico
- Eres conciso pero profundo cuando hace falta
- No eres un chatbot genérico — eres el asistente personal de este usuario específico

Reglas:
- Siempre responde en español
- Sé conciso. Si la respuesta es corta, no la infles
- Usa el contexto del usuario para personalizar tus respuestas
- No inventes datos — solo usa lo que está en el contexto
- Si no tenés suficiente información, decilo claramente
`
```

### Prompt por Módulo

Cada módulo tiene su propio system prompt que extiende el base:

```typescript
// src/lib/ai/prompts/finanzas.ts
export function getFinanzasPrompt(snapshot: UserSnapshot): string {
  return `
${BASE_SYSTEM_PROMPT}

Contexto financiero del usuario:
- Gastado este mes: $${snapshot.finanzas.gastado_mes}
- Presupuesto mensual: $${snapshot.finanzas.presupuesto_mes}
- Categoría donde más gasta: ${snapshot.finanzas.categoria_top_gasto}
- Días para fin de mes: ${snapshot.finanzas.dias_para_fin_mes}

Tu rol en este módulo: asesor financiero personal.
Ayudás al usuario a entender sus finanzas, detectar patrones de gasto y tomar mejores decisiones.
`
}
```

```typescript
// src/lib/ai/prompts/organizacion.ts
export function getOrganizacionPrompt(snapshot: UserSnapshot): string {
  return `
${BASE_SYSTEM_PROMPT}

Contexto de productividad del usuario:
- Tareas pendientes: ${snapshot.organizacion.tareas_pendientes}
- Completadas esta semana: ${snapshot.organizacion.tareas_completadas_semana}
- Tareas vencidas: ${snapshot.organizacion.tareas_vencidas}
- Próximas tareas: ${snapshot.organizacion.proximas_tareas.join(', ')}

Tu rol en este módulo: asistente de productividad.
Ayudás al usuario a organizar su tiempo, priorizar tareas y cumplir objetivos.
`
}
```

---

## Caché de Respuestas

### Cuándo cachear
- Respuestas de chat que no cambian en el tiempo (recetas, rutinas de ejercicio)
- Resúmenes semanales
- Análisis que dependen de datos que no cambian cada hora

### Cuándo NO cachear
- Respuestas a preguntas sobre datos en tiempo real ("¿cuánto gasté hoy?")
- Conversaciones de journal (contexto emocional cambia siempre)

### Implementación

```typescript
// src/lib/ai/cache.ts
import { createHash } from 'crypto'

export function generateCacheKey(userId: string, module: string, message: string): string {
  const raw = `${userId}:${module}:${message.toLowerCase().trim()}`
  return createHash('sha256').update(raw).digest('hex')
}

export async function getCachedResponse(
  supabase: SupabaseClient,
  userId: string,
  cacheKey: string
): Promise<string | null> {
  const { data } = await supabase
    .from('ai_cache')
    .select('response')
    .eq('user_id', userId)
    .eq('cache_key', cacheKey)
    .gt('expires_at', new Date().toISOString())
    .single()

  return data?.response ?? null
}

export async function setCachedResponse(
  supabase: SupabaseClient,
  userId: string,
  cacheKey: string,
  module: string,
  response: string,
  modelUsed: string,
  ttlHours: number = 24
): Promise<void> {
  const expiresAt = new Date()
  expiresAt.setHours(expiresAt.getHours() + ttlHours)

  await supabase.from('ai_cache').upsert({
    user_id: userId,
    cache_key: cacheKey,
    module,
    response,
    model_used: modelUsed,
    expires_at: expiresAt.toISOString(),
  })
}
```

---

## API Routes de IA

### Estructura

```
src/app/api/ai/
├── chat/
│   └── route.ts          → POST /api/ai/chat (chat por módulo)
├── classify/
│   └── route.ts          → POST /api/ai/classify (clasificar gasto)
├── summary/
│   └── route.ts          → POST /api/ai/summary (resumen semanal)
└── context/
    └── route.ts          → GET /api/ai/context (obtener snapshot)
```

### Endpoint Principal — Chat

```typescript
// src/app/api/ai/chat/route.ts
import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@/lib/supabase/server'
import { buildUserSnapshot } from '@/lib/ai/context-builder'
import { getModulePrompt } from '@/lib/ai/prompts'
import { generateCacheKey, getCachedResponse, setCachedResponse } from '@/lib/ai/cache'

export async function POST(req: NextRequest) {
  const { message, module, conversationHistory } = await req.json()

  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  // Verificar caché
  const cacheKey = generateCacheKey(user.id, module, message)
  const cached = await getCachedResponse(supabase, user.id, cacheKey)
  if (cached) return NextResponse.json({ response: cached, cached: true })

  // Construir contexto
  const snapshot = await buildUserSnapshot(user.id)
  const systemPrompt = getModulePrompt(module, snapshot)

  // Llamar Claude
  const anthropic = new Anthropic()
  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-5',
    max_tokens: 1024,
    system: systemPrompt,
    messages: [
      ...conversationHistory,
      { role: 'user', content: message }
    ],
  })

  const assistantMessage = response.content[0].type === 'text'
    ? response.content[0].text
    : ''

  // Guardar en caché y en historial
  await Promise.all([
    setCachedResponse(supabase, user.id, cacheKey, module, assistantMessage, 'claude-sonnet-4-5'),
    supabase.from('ai_conversations').insert([
      { user_id: user.id, module, role: 'user', content: message, model_used: 'claude-sonnet-4-5' },
      { user_id: user.id, module, role: 'assistant', content: assistantMessage, tokens_used: response.usage.output_tokens, model_used: 'claude-sonnet-4-5' },
    ])
  ])

  return NextResponse.json({ response: assistantMessage, cached: false })
}
```

### Endpoint Clasificación de Gastos (GPT-4o mini)

```typescript
// src/app/api/ai/classify/route.ts
import OpenAI from 'openai'

export async function POST(req: NextRequest) {
  const { description, amount } = await req.json()

  const openai = new OpenAI()
  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    max_tokens: 50,
    messages: [{
      role: 'user',
      content: `Clasificá este gasto en una sola categoría. Solo devolvé el nombre de la categoría, nada más.
Categorías: comida, transporte, ocio, salud, educacion, ropa, hogar, tecnologia, suscripciones, otro
Gasto: "${description}" por $${amount}`
    }]
  })

  const category = response.choices[0].message.content?.trim().toLowerCase()
  return NextResponse.json({ category })
}
```

---

## Resumen Semanal Automático

El resumen semanal se genera una vez por semana (por ejemplo, los domingos a las 20:00) usando una Supabase Edge Function o un cron job en Vercel.

```typescript
// supabase/functions/weekly-summary/index.ts
// Se ejecuta como cron: 0 20 * * 0 (domingos 20:00)

import Anthropic from 'npm:@anthropic-ai/sdk'

Deno.serve(async () => {
  // Obtener todos los usuarios activos
  // Para cada usuario: buildUserSnapshot → llamar Claude → guardar resumen
  // Crear notificación interna
})
```

---

## Estimación de Costos

| Uso | Frecuencia | Tokens input | Tokens output | Costo aprox |
|---|---|---|---|---|
| Chat módulo | 5/día | ~800 | ~400 | ~$0.008 |
| Resumen semanal | 1/semana | ~1500 | ~800 | ~$0.01 |
| Clasificar gasto | 5/día | ~100 | ~20 | ~$0.0001 |
| **Total mensual** | | | | **~$3-5** |

Con $10/mes por modelo tenés margen amplio para escalar a más usuarios.

---

## TTL de Caché por Tipo de Respuesta

| Tipo | TTL |
|---|---|
| Recetas generadas | 7 días |
| Rutinas de ejercicio | 7 días |
| Resumen semanal | 7 días |
| Análisis de gastos | 24 horas |
| User Snapshot | 1 hora |
| Chat conversacional | No se cachea |
| Journal | No se cachea |
