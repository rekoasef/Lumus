import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { generateCacheKey, getCachedResponse, setCachedResponse } from '@/lib/ai/cache'

const bodySchema = z.object({
  description: z.string().min(1).max(200),
  amount: z.number().positive(),
  type: z.enum(['gasto', 'ingreso']),
})

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const body = await req.json()
  const parsed = bodySchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  const { description, amount, type } = parsed.data

  // Traer las categorías del usuario del tipo correcto
  const { data: categories } = await supabase
    .from('finance_categories')
    .select('id, name')
    .eq('user_id', user.id)
    .eq('type', type)

  if (!categories || categories.length === 0) {
    return NextResponse.json({ category_id: null, confidence: 0 })
  }

  // Verificar caché — la clave incluye descripción + tipo + IDs de categorías disponibles
  const categoryIds = categories.map(c => c.id).sort().join(',')
  const cacheInput = `classify:${type}:${description.toLowerCase().trim()}:${categoryIds}`
  const cacheKey = generateCacheKey(user.id, 'finanzas', cacheInput)

  const cached = await getCachedResponse(supabase, user.id, cacheKey)
  if (cached) {
    const parsed = JSON.parse(cached) as { category_id: string | null; confidence: number }
    return NextResponse.json({ ...parsed, from_cache: true })
  }

  // Armar el prompt con las categorías reales del usuario
  const categoryList = categories.map(c => `"${c.name}" (id: ${c.id})`).join(', ')

  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

  const completion = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    max_tokens: 60,
    temperature: 0,
    messages: [
      {
        role: 'system',
        content: `Sos un clasificador de transacciones financieras. Devolvé SOLO un objeto JSON con "category_id" y "confidence" (0.0 a 1.0). Sin texto extra.`,
      },
      {
        role: 'user',
        content: `Clasificá este ${type} en una de estas categorías: ${categoryList}\n\nDescripción: "${description}"\nMonto: $${amount}\n\nDevolvé: {"category_id": "<id>", "confidence": <0.0-1.0>}\nSi ninguna aplica, devolvé: {"category_id": null, "confidence": 0}`,
      },
    ],
  })

  let result: { category_id: string | null; confidence: number } = { category_id: null, confidence: 0 }

  try {
    const raw = completion.choices[0].message.content?.trim() ?? '{}'
    const parsed = JSON.parse(raw) as typeof result

    // Validar que el category_id devuelto es uno de los permitidos
    const validId = categories.find(c => c.id === parsed.category_id)?.id ?? null
    result = {
      category_id: validId,
      confidence: typeof parsed.confidence === 'number' ? Math.min(1, Math.max(0, parsed.confidence)) : 0,
    }
  } catch {
    // Si GPT no devuelve JSON válido, retornamos sin categoría
  }

  // Cachear por 7 días — las clasificaciones son estables
  await setCachedResponse(
    supabase,
    user.id,
    cacheKey,
    'finanzas',
    JSON.stringify(result),
    'gpt-4o-mini',
    24 * 7
  )

  return NextResponse.json(result)
}
