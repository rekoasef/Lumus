import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@/lib/supabase/server'
import { buildUserSnapshot } from '@/lib/ai/context-builder'
import { getModulePrompt } from '@/lib/ai/prompts'
import { generateCacheKey, getCachedResponse, setCachedResponse } from '@/lib/ai/cache'
import { getWebContext } from '@/lib/ai/web-search'
import { z } from 'zod'
import type { AIModule } from '@/types'

const bodySchema = z.object({
  message: z.string().min(1).max(2000),
  module: z.enum(['organizacion', 'finanzas', 'comidas', 'fit', 'habitos', 'journal', 'relaciones', 'estudio', 'general']),
  conversationHistory: z.array(z.object({
    role: z.enum(['user', 'assistant']),
    content: z.string(),
  })).max(20),
  isVoice: z.boolean().optional(),
  currentVoice: z.enum(['alloy', 'echo', 'fable', 'nova', 'onyx', 'shimmer']).optional(),
})

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const body = await req.json()
  const parsed = bodySchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json({ error: 'Datos inválidos', details: parsed.error.flatten() }, { status: 400 })
  }

  const { message, module, conversationHistory, isVoice, currentVoice } = parsed.data

  // Detectar y ejecutar búsqueda web antes de verificar caché
  const webContext = await getWebContext(message)

  // Solo usar caché para consultas sin búsqueda web (los datos en tiempo real no se cachean)
  const cacheKey = generateCacheKey(user.id, module, message)
  if (!webContext.searched) {
    const cached = await getCachedResponse(supabase, user.id, cacheKey)
    if (cached) {
      return NextResponse.json({ response: cached, cached: true, searchedWeb: false })
    }
  }

  const snapshot = await buildUserSnapshot(supabase, user.id)
  const basePrompt = getModulePrompt(module as AIModule, snapshot)

  let systemPrompt = isVoice
    ? `${basePrompt}

IMPORTANTE — modo voz:
- Respondé en máximo 2 oraciones cortas y naturales
- Sin markdown, sin listas, sin asteriscos
- Hablá como si estuvieras en una conversación cara a cara
- Tu voz actual es: ${currentVoice ?? 'nova'}
- Tus voces disponibles son: alloy (neutral y versátil), echo (nítida y clara), fable (expresiva), nova (cálida, tu voz por defecto), onyx (grave y autoritaria), shimmer (suave y gentil)
- Si el usuario pregunta qué voces tenés, listá todas con sus descripciones
- Si el usuario pide cambiar de voz, al FINAL de tu respuesta agregá exactamente el tag: [VOZ:nombre_en_minuscula]
  Ejemplo: "¡Listo! Ahora hablo con voz Onyx. [VOZ:onyx]"
  Nombres válidos: alloy, echo, fable, nova, onyx, shimmer`
    : basePrompt

  // Inyectar información web si está disponible
  if (webContext.searched && webContext.content) {
    systemPrompt += `\n\nINFORMACIÓN EN TIEMPO REAL (obtenida ahora mismo de internet):\n${webContext.content}\n\nUsá esta información para responder con datos precisos y actuales. Si es sobre clima, usá los datos exactos sin inventar nada adicional.`
  }

  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-5',
    max_tokens: 1024,
    system: systemPrompt,
    messages: [
      ...conversationHistory.map(m => ({ role: m.role as 'user' | 'assistant', content: m.content })),
      { role: 'user', content: message },
    ],
  })

  const assistantMessage = response.content[0].type === 'text'
    ? response.content[0].text
    : ''

  // Guardar en caché solo si no fue una búsqueda web (datos estáticos)
  const saveOps = webContext.searched
    ? [
        supabase.from('ai_conversations').insert([
          { user_id: user.id, module, role: 'user', content: message, model_used: 'claude-sonnet-4-5' },
          { user_id: user.id, module, role: 'assistant', content: assistantMessage, tokens_used: response.usage.output_tokens, model_used: 'claude-sonnet-4-5' },
        ]),
      ]
    : [
        setCachedResponse(supabase, user.id, cacheKey, module, assistantMessage, 'claude-sonnet-4-5', 1),
        supabase.from('ai_conversations').insert([
          { user_id: user.id, module, role: 'user', content: message, model_used: 'claude-sonnet-4-5' },
          { user_id: user.id, module, role: 'assistant', content: assistantMessage, tokens_used: response.usage.output_tokens, model_used: 'claude-sonnet-4-5' },
        ]),
      ]

  await Promise.all(saveOps)

  return NextResponse.json({ response: assistantMessage, cached: false, searchedWeb: webContext.searched })
}
