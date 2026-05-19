import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import Anthropic from '@anthropic-ai/sdk'

const SYSTEM_PROMPT = `Eres un nutricionista y chef experto. El usuario te pide que generes una receta.
Responde ÚNICAMENTE con un JSON válido con esta estructura exacta, sin texto adicional ni bloques de código:
{"title":"nombre de la receta","description":"descripción breve (1-2 oraciones)","ingredients":[{"name":"ingrediente","quantity":"cantidad","unit":"unidad"}],"instructions":"pasos detallados de preparación","calories":0,"protein_g":0,"carbs_g":0,"fat_g":0,"prep_time_min":0}
Las unidades en español. Usá null para valores nutricionales que no puedas estimar. No envuelvas el JSON en markdown.`

function extractJson(text: string): string {
  const fenceMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/)
  if (fenceMatch) return fenceMatch[1].trim()
  const objMatch = text.match(/\{[\s\S]*\}/)
  if (objMatch) return objMatch[0]
  return text.trim()
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const body = await req.json()
  const { prompt } = body
  if (!prompt || typeof prompt !== 'string') {
    return NextResponse.json({ error: 'Se requiere un prompt' }, { status: 400 })
  }

  const cacheKey = `recipe_gen_${prompt.slice(0, 100)}`

  const { data: cached } = await supabase
    .from('ai_cache')
    .select('response')
    .eq('user_id', user.id)
    .eq('cache_key', cacheKey)
    .gt('expires_at', new Date().toISOString())
    .maybeSingle()

  if (cached) {
    try {
      return NextResponse.json(JSON.parse(cached.response as string))
    } catch {
      // cache corrupted — regenerate
    }
  }

  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-5',
    max_tokens: 1024,
    system: SYSTEM_PROMPT,
    messages: [{ role: 'user', content: prompt }],
  })

  const content = message.content[0]
  if (content.type !== 'text') {
    return NextResponse.json({ error: 'Error al generar la receta' }, { status: 500 })
  }

  let recipe
  try {
    recipe = JSON.parse(extractJson(content.text))
  } catch {
    return NextResponse.json(
      { error: 'La IA no devolvió un JSON válido', raw: content.text.slice(0, 200) },
      { status: 500 }
    )
  }

  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
  await supabase.from('ai_cache').upsert({
    user_id: user.id,
    cache_key: cacheKey,
    module: 'comidas',
    model_used: 'claude-sonnet-4-5',
    response: JSON.stringify(recipe),
    expires_at: expiresAt,
  })

  return NextResponse.json(recipe)
}
