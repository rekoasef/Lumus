import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import Anthropic from '@anthropic-ai/sdk'
import { analyzeFoodSchema } from '@/lib/validations/food'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const SYSTEM_PROMPT = `Sos un nutricionista experto. El usuario te describe o muestra una comida.
Respondé ÚNICAMENTE con un JSON válido con esta estructura exacta, sin texto adicional ni bloques de código:
{"name":"nombre de la comida","calories":0,"protein_g":0,"carbs_g":0,"fat_g":0,"confidence":"alta","notes":null}

- calories: calorías totales estimadas (kcal) de la porción mostrada
- protein_g: proteínas en gramos
- carbs_g: carbohidratos en gramos
- fat_g: grasas en gramos
- confidence: "alta" si la comida es identificable con claridad, "media" si hay duda, "baja" si es muy difícil de estimar
- notes: aclaración breve si hay incertidumbre (null si no es necesario)

Estimá para una porción individual razonable. Si ves una foto, estimá lo que se ve en el plato.
Si no podés identificar la comida, usá valores 0 y confidence "baja".
No uses markdown, no uses bloques de código, devolvé solo el JSON.`

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const body = await req.json()
  const parsed = analyzeFoodSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 })
  }

  const { description, image_base64, image_media_type } = parsed.data

  const cacheKey = `analyze_food_${(description ?? image_base64?.slice(0, 50) ?? '').slice(0, 80)}`

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
    } catch { /* cache corrupted */ }
  }

  const userContent: Anthropic.MessageParam['content'] = []

  if (image_base64 && image_media_type) {
    userContent.push({
      type: 'image',
      source: {
        type: 'base64',
        media_type: image_media_type,
        data: image_base64,
      },
    })
    userContent.push({
      type: 'text',
      text: description
        ? `Esta es la foto de la comida. Descripción adicional: ${description}`
        : 'Esta es la foto de la comida. Estimá su información nutricional.',
    })
  } else {
    userContent.push({
      type: 'text',
      text: `Comida: ${description}`,
    })
  }

  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-5',
    max_tokens: 512,
    system: SYSTEM_PROMPT,
    messages: [{ role: 'user', content: userContent }],
  })

  const content = message.content[0]
  if (content.type !== 'text') {
    return NextResponse.json({ error: 'Error al analizar la comida' }, { status: 500 })
  }

  let analysis
  try {
    const raw = content.text.match(/\{[\s\S]*\}/)?.[0] ?? content.text.trim()
    analysis = JSON.parse(raw)
  } catch {
    return NextResponse.json(
      { error: 'No se pudo parsear la respuesta de la IA', raw: content.text.slice(0, 200) },
      { status: 500 }
    )
  }

  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
  await supabase.from('ai_cache').upsert({
    user_id: user.id,
    cache_key: cacheKey,
    module: 'comidas',
    model_used: 'claude-sonnet-4-5',
    response: JSON.stringify(analysis),
    expires_at: expiresAt,
  })

  return NextResponse.json(analysis)
}
