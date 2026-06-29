import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@/lib/supabase/server'
import { buildUserSnapshot } from '@/lib/ai/context-builder'
import { getModulePrompt } from '@/lib/ai/prompts'
import { generateCacheKey, getCachedResponse, setCachedResponse } from '@/lib/ai/cache'
import { getWebContext } from '@/lib/ai/web-search'
import { z } from 'zod'
import type { AIModule, AIAction } from '@/types'
import type { SupabaseClient } from '@supabase/supabase-js'

const bodySchema = z.object({
  message: z.string().min(1).max(2000),
  module: z.enum(['finanzas', 'general']),
  conversationHistory: z.array(z.object({
    role: z.enum(['user', 'assistant']),
    content: z.string(),
  })).max(20),
  isVoice: z.boolean().optional(),
  currentVoice: z.enum(['alloy', 'echo', 'fable', 'nova', 'onyx', 'shimmer']).optional(),
})

// ── Tools disponibles ─────────────────────────────────────────────────────────

const REGISTRAR_GASTO_TOOL: Anthropic.Tool = {
  name: 'registrar_gasto',
  description: 'Registra un gasto o ingreso en las finanzas del usuario. Úsalo cuando el usuario diga que gastó, pagó, compró algo, recibió dinero, o quiera anotar una transacción.',
  input_schema: {
    type: 'object' as const,
    properties: {
      descripcion: { type: 'string' },
      monto: { type: 'number', description: 'Monto en la moneda local del usuario' },
      tipo: { type: 'string', enum: ['gasto', 'ingreso'] },
      fecha: { type: 'string', description: 'Formato YYYY-MM-DD, opcional (usa hoy si no se especifica)' },
    },
    required: ['descripcion', 'monto', 'tipo'],
  },
}

const AGENT_TOOLS = [REGISTRAR_GASTO_TOOL]

// ── Ejecutores de tools ───────────────────────────────────────────────────────

async function ejecutarRegistrarGasto(
  input: { descripcion: string; monto: number; tipo: 'gasto' | 'ingreso'; fecha?: string },
  supabase: SupabaseClient,
  userId: string
): Promise<{ result: string; action?: AIAction }> {
  const today = new Date().toISOString().slice(0, 10)

  const { data: wallet } = await supabase
    .from('wallets')
    .select('id, name')
    .eq('user_id', userId)
    .is('deleted_at', null)
    .order('created_at', { ascending: true })
    .limit(1)
    .single()

  if (!wallet) return { result: 'No hay billeteras configuradas. El usuario debe crear una primero.' }

  const { data: category } = await supabase
    .from('finance_categories')
    .select('id')
    .eq('user_id', userId)
    .eq('type', input.tipo)
    .order('created_at', { ascending: true })
    .limit(1)
    .single()

  const { data: transaction, error } = await supabase
    .from('transactions')
    .insert({
      user_id: userId,
      wallet_id: wallet.id,
      category_id: category?.id ?? null,
      type: input.tipo,
      amount: Math.abs(input.monto),
      description: input.descripcion,
      date: input.fecha ?? today,
    })
    .select('id, description, amount, type')
    .single()

  if (error) return { result: `Error al registrar: ${error.message}` }

  await (supabase.rpc as unknown as (fn: string, args: Record<string, string>) => Promise<unknown>)(
    'recompute_wallet_balance', { p_wallet_id: wallet.id }
  )

  const sign = transaction.type === 'gasto' ? '-' : '+'
  const details = `${sign}$${transaction.amount} en ${wallet.name}`

  return {
    result: `${input.tipo === 'gasto' ? 'Gasto' : 'Ingreso'} de $${transaction.amount} registrado en ${wallet.name}.`,
    action: { type: 'transaction_created', title: transaction.description, details },
  }
}

// ── Handler principal ─────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const body = await req.json()
  const parsed = bodySchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Datos inválidos', details: parsed.error.flatten() }, { status: 400 })
  }

  const { message, module, conversationHistory, isVoice, currentVoice } = parsed.data
  const today = new Date().toISOString().slice(0, 10)

  // Búsqueda web (sin caché)
  const webContext = await getWebContext(message)

  const cacheKey = generateCacheKey(user.id, module, message)
  if (!webContext.searched) {
    const cached = await getCachedResponse(supabase, user.id, cacheKey)
    if (cached) {
      return NextResponse.json({ response: cached, cached: true, searchedWeb: false, actions: [] })
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

  if (webContext.searched && webContext.content) {
    systemPrompt += `\n\nINFORMACIÓN EN TIEMPO REAL (obtenida ahora mismo de internet):\n${webContext.content}\n\nUsá esta información para responder con datos precisos y actuales.`
  }

  systemPrompt += `\n\nFECHA DE HOY: ${today}\n\nSOS UN AGENTE FINANCIERO ACTIVO: podés registrar gastos e ingresos directamente. Si el usuario pide registrar un gasto o ingreso, usá la herramienta disponible sin pedir confirmación — solo actuá y confirmá con una frase natural. No crees tareas ni acciones fuera de finanzas.`

  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

  const allMessages: Anthropic.MessageParam[] = [
    ...conversationHistory.map(m => ({ role: m.role as 'user' | 'assistant', content: m.content })),
    { role: 'user', content: message },
  ]

  const firstResponse = await anthropic.messages.create({
    model: 'claude-sonnet-4-5',
    max_tokens: 1024,
    system: systemPrompt,
    tools: AGENT_TOOLS,
    tool_choice: { type: 'auto' },
    messages: allMessages,
  })

  const actions: AIAction[] = []
  let assistantMessage = ''

  if (firstResponse.stop_reason === 'tool_use') {
    const toolBlocks = firstResponse.content.filter(
      (b): b is Anthropic.ToolUseBlock => b.type === 'tool_use'
    )

    const toolResults: Anthropic.ToolResultBlockParam[] = await Promise.all(
      toolBlocks.map(async (block) => {
        let resultText: string

        if (block.name === 'registrar_gasto') {
          const { result, action } = await ejecutarRegistrarGasto(
            block.input as Parameters<typeof ejecutarRegistrarGasto>[0],
            supabase,
            user.id
          )
          resultText = result
          if (action) actions.push(action)
        } else {
          resultText = 'Herramienta no disponible'
        }

        return { type: 'tool_result' as const, tool_use_id: block.id, content: resultText }
      })
    )

    const finalResponse = await anthropic.messages.create({
      model: 'claude-sonnet-4-5',
      max_tokens: 1024,
      system: systemPrompt,
      messages: [
        ...allMessages,
        { role: 'assistant', content: firstResponse.content },
        { role: 'user', content: toolResults },
      ],
    })

    assistantMessage = finalResponse.content[0].type === 'text' ? finalResponse.content[0].text : ''
  } else {
    assistantMessage = firstResponse.content[0].type === 'text' ? firstResponse.content[0].text : ''
  }

  const saveOps = webContext.searched || actions.length > 0
    ? [
        supabase.from('ai_conversations').insert([
          { user_id: user.id, module, role: 'user', content: message, model_used: 'claude-sonnet-4-5' },
          { user_id: user.id, module, role: 'assistant', content: assistantMessage, model_used: 'claude-sonnet-4-5' },
        ]),
      ]
    : [
        setCachedResponse(supabase, user.id, cacheKey, module, assistantMessage, 'claude-sonnet-4-5', 1),
        supabase.from('ai_conversations').insert([
          { user_id: user.id, module, role: 'user', content: message, model_used: 'claude-sonnet-4-5' },
          { user_id: user.id, module, role: 'assistant', content: assistantMessage, model_used: 'claude-sonnet-4-5' },
        ]),
      ]

  await Promise.all(saveOps)

  return NextResponse.json({ response: assistantMessage, cached: false, searchedWeb: webContext.searched, actions })
}
