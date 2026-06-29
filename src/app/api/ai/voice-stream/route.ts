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

const WEB_SEARCH_TOOL: Anthropic.Tool = {
  name: 'buscar_web',
  description: 'Busca información actualizada en internet. Usalo para: clima, temperatura, pronóstico del tiempo, partidos de fútbol y sus horarios, noticias recientes, precios actuales, resultados deportivos, o cualquier dato que cambia con el tiempo y no podés saber de memoria.',
  input_schema: {
    type: 'object' as const,
    properties: {
      query: {
        type: 'string',
        description: 'Búsqueda concisa en español. Ejemplos: "clima Rosario mañana", "horario partido River domingo", "dólar blue hoy Argentina"',
      },
    },
    required: ['query'],
  },
}

const REGISTRAR_GASTO_TOOL: Anthropic.Tool = {
  name: 'registrar_gasto',
  description: 'Registra un gasto o ingreso en las finanzas del usuario.',
  input_schema: {
    type: 'object' as const,
    properties: {
      descripcion: { type: 'string' },
      monto: { type: 'number' },
      tipo: { type: 'string', enum: ['gasto', 'ingreso'] },
      fecha: { type: 'string', description: 'Formato YYYY-MM-DD, opcional' },
    },
    required: ['descripcion', 'monto', 'tipo'],
  },
}

async function tavilySearch(query: string): Promise<string> {
  const apiKey = process.env.TAVILY_API_KEY
  if (!apiKey) return 'No tengo acceso a búsqueda web en este momento.'

  try {
    const res = await fetch('https://api.tavily.com/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        api_key: apiKey,
        query,
        search_depth: 'basic',
        max_results: 3,
        include_answer: true,
      }),
    })
    if (!res.ok) return 'No pude obtener resultados de búsqueda.'
    const data = await res.json() as {
      answer?: string
      results?: Array<{ title: string; content: string; url: string }>
    }

    if (data.answer) return data.answer

    const snippets = (data.results ?? [])
      .slice(0, 3)
      .map(r => `${r.title}: ${r.content.slice(0, 200)}`)
      .join('\n')
    return snippets || 'Sin resultados relevantes.'
  } catch {
    return 'Error al buscar en internet.'
  }
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const body = await req.json()
  const parsed = bodySchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Inválido' }, { status: 400 })

  const { message, currentVoice } = parsed.data
  const today = new Date().toISOString().slice(0, 10)

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
  Nombres válidos: alloy, echo, fable, nova, onyx, shimmer
- CRÍTICO: respondé SIEMPRE en español rioplatense. Jamás en inglés ni otro idioma.
- CRÍTICO: si no sabés algo con certeza (clima, partidos, noticias, precios), usá la herramienta buscar_web. NUNCA inventes datos reales — es preferible buscar que dar información falsa.
- FECHA DE HOY: ${today}
- SOS UN AGENTE FINANCIERO ACTIVO: si el usuario pide registrar un gasto o ingreso, usá la herramienta registrar_gasto. Actuá directamente y confirmá en una oración corta. No crees tareas ni acciones fuera de finanzas.`

  const encoder = new TextEncoder()

  const readable = new ReadableStream({
    async start(controller) {
      let fullText = ''

      const send = (text: string) =>
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text })}\n\n`))

      try {
        const messages: Anthropic.MessageParam[] = [
          { role: 'user', content: message },
        ]

        // Primera llamada: detectar si necesita herramientas
        const firstResponse = await anthropic.messages.create({
          model: 'claude-sonnet-4-5',
          max_tokens: 300,
          tools: [WEB_SEARCH_TOOL, REGISTRAR_GASTO_TOOL],
          tool_choice: { type: 'auto' },
          system: systemPrompt,
          messages,
        })

        if (firstResponse.stop_reason === 'tool_use') {
          const toolUseBlocks = firstResponse.content.filter(
            (b): b is Anthropic.ToolUseBlock => b.type === 'tool_use'
          )

          const toolResults = await Promise.all(
            toolUseBlocks.map(async (b) => {
              let content: string

              if (b.name === 'buscar_web') {
                const input = b.input as { query: string }
                content = await tavilySearch(input.query)
              } else if (b.name === 'registrar_gasto') {
                const input = b.input as { descripcion: string; monto: number; tipo: 'gasto' | 'ingreso'; fecha?: string }
                const { data: wallet } = await supabase.from('wallets').select('id, name').eq('user_id', user.id).is('deleted_at', null).order('created_at', { ascending: true }).limit(1).single()
                if (!wallet) { content = 'No hay billeteras configuradas.'; }
                else {
                  const { data: cat } = await supabase.from('finance_categories').select('id').eq('user_id', user.id).eq('type', input.tipo).limit(1).single()
                  const { error } = await supabase.from('transactions').insert({ user_id: user.id, wallet_id: wallet.id, category_id: cat?.id ?? null, type: input.tipo, amount: Math.abs(input.monto), description: input.descripcion, date: input.fecha ?? today })
                  content = error ? `Error: ${error.message}` : `${input.tipo === 'gasto' ? 'Gasto' : 'Ingreso'} de $${input.monto} registrado en ${wallet.name}.`
                  if (!error) await (supabase.rpc as unknown as (fn: string, args: Record<string, string>) => Promise<unknown>)('recompute_wallet_balance', { p_wallet_id: wallet.id })
                }
              } else {
                content = 'Herramienta no disponible'
              }

              return { type: 'tool_result' as const, tool_use_id: b.id, content }
            })
          )

          messages.push({ role: 'assistant', content: firstResponse.content })
          messages.push({ role: 'user', content: toolResults })

          // Segunda llamada: respuesta final con resultados de búsqueda (streaming)
          const stream = anthropic.messages.stream({
            model: 'claude-sonnet-4-5',
            max_tokens: 300,
            system: systemPrompt,
            messages,
          })

          for await (const event of stream) {
            if (
              event.type === 'content_block_delta' &&
              event.delta.type === 'text_delta'
            ) {
              fullText += event.delta.text
              send(event.delta.text)
            }
          }
        } else {
          // Sin herramientas — enviar el texto de la primera respuesta
          for (const block of firstResponse.content) {
            if (block.type === 'text') {
              fullText = block.text
              // Enviar en chunks para que el hook lo procese igual que antes
              for (const chunk of block.text.match(/.{1,20}/g) ?? []) {
                send(chunk)
              }
            }
          }
        }

        controller.enqueue(encoder.encode('data: [DONE]\n\n'))
        controller.close()

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
