import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import Anthropic from '@anthropic-ai/sdk'
import { parseShoppingListSchema } from '@/lib/validations/food'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const SYSTEM_PROMPT = `Sos un asistente de compras. El usuario te pasa un texto con una lista de compras (puede estar en cualquier formato: lista con guiones, separada por comas, párrafo corrido, etc.).

Extraé todos los items y devolvé ÚNICAMENTE un JSON válido con este formato, sin texto adicional:
{"items":[{"name":"nombre del producto","quantity":"cantidad o null","category":"categoría"}]}

Categorías posibles (elegí la más apropiada para cada item):
- "Frutas y verduras"
- "Carnes y pescados"
- "Lácteos y huevos"
- "Panadería y cereales"
- "Bebidas"
- "Condimentos y especias"
- "Snacks y dulces"
- "Congelados"
- "Limpieza"
- "Higiene personal"
- "Otros"

Reglas:
- Si hay cantidad en el texto, incluila (ej: "2 kg", "1 litro", "6 unidades")
- Si no hay cantidad, usá null
- Normalizá los nombres (primera letra mayúscula, sin artículos al inicio: "Tomates" no "Los tomates")
- Si el mismo producto aparece varias veces, unilos en un solo item
- No inventes items que no están en el texto
- Devolvé solo el JSON, sin markdown ni bloques de código`

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const body = await req.json()
  const parsed = parseShoppingListSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 })
  }

  const { text } = parsed.data

  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-5',
    max_tokens: 2048,
    system: SYSTEM_PROMPT,
    messages: [{ role: 'user', content: `Lista de compras:\n${text}` }],
  })

  const content = message.content[0]
  if (content.type !== 'text') {
    return NextResponse.json({ error: 'Error al parsear la lista' }, { status: 500 })
  }

  let result
  try {
    const raw = content.text.match(/\{[\s\S]*\}/)?.[0] ?? content.text.trim()
    result = JSON.parse(raw)
  } catch {
    return NextResponse.json(
      { error: 'No se pudo parsear la respuesta', raw: content.text.slice(0, 200) },
      { status: 500 }
    )
  }

  return NextResponse.json(result)
}
