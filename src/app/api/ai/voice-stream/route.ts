import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@/lib/supabase/server'
import { buildUserSnapshot } from '@/lib/ai/context-builder'
import { getModulePrompt } from '@/lib/ai/prompts'
import { z } from 'zod'

const bodySchema = z.object({
  message: z.string().min(1).max(2000),
  currentVoice: z.enum(['alloy', 'echo', 'fable', 'nova', 'onyx', 'shimmer']).optional().default('shimmer'),
})

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const body = await req.json()
  const parsed = bodySchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Inválido' }, { status: 400 })

  const { message, currentVoice } = parsed.data

  const snapshot = await buildUserSnapshot(supabase, user.id)
  const basePrompt = getModulePrompt('general', snapshot)
  const systemPrompt = `${basePrompt}

MODO VOZ — reglas estrictas:
- Respondé en 1 a 3 oraciones. Nunca más.
- Escribí exactamente como hablarías en voz alta: natural, fluido, sin pausas raras.
- PROHIBIDO: markdown, asteriscos, guiones como lista, números como lista, paréntesis explicativos, corchetes (salvo [VOZ:x]).
- PROHIBIDO: abreviaturas ("ej.", "etc.", "aprox.") — escribilas completas o no las uses.
- Usá puntuación natural: comas para pausas suaves, punto para terminar. Sin puntos suspensivos.
- No empieces con "¡Claro!", "Por supuesto", "Entendido" — respondé directo al tema.
- Tono: cercano, cálido, conciso. Como un amigo que sabe mucho, no un asistente corporativo.
- Voz actual: ${currentVoice}
- Voces disponibles: alloy (neutral), echo (nítida), fable (expresiva), nova (cálida), onyx (grave), shimmer (suave)
- Si te piden cambiar de voz: confirmalo en una oración natural y agregá al final: [VOZ:nombre]
  Ejemplo: "Listo, ahora te hablo con voz Onyx. [VOZ:onyx]"
  Nombres válidos: alloy, echo, fable, nova, onyx, shimmer`

  const encoder = new TextEncoder()

  const readable = new ReadableStream({
    async start(controller) {
      let fullText = ''

      try {
        const stream = anthropic.messages.stream({
          model: 'claude-sonnet-4-5',
          max_tokens: 300,
          system: systemPrompt,
          messages: [{ role: 'user', content: message }],
        })

        for await (const event of stream) {
          if (
            event.type === 'content_block_delta' &&
            event.delta.type === 'text_delta'
          ) {
            const text = event.delta.text
            fullText += text
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text })}\n\n`))
          }
        }

        controller.enqueue(encoder.encode('data: [DONE]\n\n'))
        controller.close()

        // Guardar conversación en background
        const cleanText = fullText.replace(/\[VOZ:[a-z]+\]/g, '').trim()
        void supabase.from('ai_conversations').insert([
          { user_id: user.id, module: 'general', role: 'user', content: message, model_used: 'claude-sonnet-4-5' },
          { user_id: user.id, module: 'general', role: 'assistant', content: cleanText, model_used: 'claude-sonnet-4-5' },
        ])
      } catch {
        controller.enqueue(encoder.encode('data: [ERROR]\n\n'))
        controller.close()
      }
    },
  })

  return new NextResponse(readable, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  })
}
